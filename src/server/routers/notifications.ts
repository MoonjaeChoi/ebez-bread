import { z } from 'zod'
import { router, protectedProcedure, managerProcedure, adminProcedure } from '@/lib/trpc/server'
import { 
  NotificationType, 
  NotificationChannel, 
  NotificationPriority,
  NotificationStatus 
} from '@prisma/client'
import { notificationService as _notificationService, notificationQueue as _notificationQueue } from '@/lib/notifications'
const notificationService = _notificationService as any
const notificationQueue = _notificationQueue as any
import { TRPCError } from '@trpc/server'

// Input schemas
const notificationSettingsUpdateSchema = z.object({
  emailEnabled: z.boolean().optional(),
  smsEnabled: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),
  inAppEnabled: z.boolean().optional(),
  birthdayNotifications: z.boolean().optional(),
  visitationReminders: z.boolean().optional(),
  expenseApprovalNotifications: z.boolean().optional(),
  systemNotifications: z.boolean().optional(),
  birthdayReminderDays: z.number().min(1).max(30).optional(),
  visitationReminderHours: z.number().min(1).max(168).optional(),
})

const notificationHistoryQuerySchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  type: z.nativeEnum(NotificationType).optional(),
  channel: z.nativeEnum(NotificationChannel).optional(),
})

const customNotificationSchema = z.object({
  type: z.nativeEnum(NotificationType),
  channel: z.nativeEnum(NotificationChannel),
  priority: z.nativeEnum(NotificationPriority).default(NotificationPriority.NORMAL),
  recipientIds: z.array(z.string()).min(1),
  title: z.string().min(1),
  message: z.string().min(1),
  scheduledAt: z.date().optional(),
  templateData: z.record(z.any()).optional(),
})

const notificationTemplateSchema = z.object({
  name: z.string().min(1),
  type: z.nativeEnum(NotificationType),
  channel: z.nativeEnum(NotificationChannel),
  subject: z.string().optional(),
  title: z.string().min(1),
  content: z.string().min(1),
  isDefault: z.boolean().default(false),
})

const notificationTemplateUpdateSchema = notificationTemplateSchema.extend({
  id: z.string(),
})

export const notificationsRouter = router({
  // Get current user's notification settings
  getSettings: protectedProcedure
    .query(async ({ ctx }) => {
      let settings = await ctx.prisma.notificationSetting.findUnique({
        where: { userId: ctx.session.user.id },
      })

      // Create default settings if they don't exist
      if (!settings) {
        settings = await ctx.prisma.notificationSetting.create({
          data: {
            userId: ctx.session.user.id,
          },
        })
      }

      return settings
    }),

  // Update notification settings
  updateSettings: protectedProcedure
    .input(notificationSettingsUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const settings = await ctx.prisma.notificationSetting.upsert({
        where: { userId: ctx.session.user.id },
        update: input,
        create: {
          userId: ctx.session.user.id,
          ...input,
        },
      })

      return settings
    }),

  // Get notification history
  getHistory: protectedProcedure
    .input(notificationHistoryQuerySchema)
    .query(async ({ ctx, input }) => {
      if (!notificationService) {
        throw new TRPCError({
          code: 'NOT_IMPLEMENTED',
          message: '알림 서비스가 현재 비활성화되어 있습니다'
        })
      }
      return await notificationService.getNotificationHistory(
        ctx.session.user.id,
        ctx.session.user.churchId,
        input
      )
    }),

  // Get notification statistics
  getStats: protectedProcedure
    .query(async ({ ctx }) => {
      const churchId = ctx.session.user.churchId
      const userId = ctx.session.user.id

      const [
        totalSent,
        totalFailed,
        recentNotifications,
        queueStats,
      ] = await Promise.all([
        ctx.prisma.notificationHistory.count({
          where: {
            churchId,
            recipientId: userId,
            status: NotificationStatus.SENT,
          },
        }),
        ctx.prisma.notificationHistory.count({
          where: {
            churchId,
            recipientId: userId,
            status: NotificationStatus.FAILED,
          },
        }),
        ctx.prisma.notificationHistory.findMany({
          where: {
            churchId,
            recipientId: userId,
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
        notificationQueue.getQueueStats(),
      ])

      return {
        totalSent,
        totalFailed,
        recentNotifications,
        queueStats,
      }
    }),

  // Send custom notification (manager only)
  sendCustom: managerProcedure
    .input(customNotificationSchema)
    .mutation(async ({ ctx, input }) => {
      const { recipientIds, ...notificationData } = input

      // Validate recipients exist and belong to the same church
      const recipients = await ctx.prisma.user.findMany({
        where: {
          id: { in: recipientIds },
          churchId: ctx.session.user.churchId,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          notificationSettings: true,
        },
      })

      if (recipients.length !== recipientIds.length) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '일부 수신자를 찾을 수 없거나 권한이 없습니다.',
        })
      }

      const church = await ctx.prisma.church.findUnique({
        where: { id: ctx.session.user.churchId },
        select: { name: true },
      })

      // Send notification to each recipient
      const results = await Promise.allSettled(
        recipients.map(async (recipient) => {
          const settings = recipient.notificationSettings

          // Check if the notification type is enabled for this user
          const isEnabled = 
            (notificationData.channel === NotificationChannel.EMAIL && settings?.emailEnabled) ||
            (notificationData.channel === NotificationChannel.SMS && settings?.smsEnabled) ||
            (notificationData.channel === NotificationChannel.PUSH && settings?.pushEnabled) ||
            (notificationData.channel === NotificationChannel.IN_APP && settings?.inAppEnabled)

          if (!isEnabled) {
            throw new Error(`알림이 비활성화되어 있습니다: ${recipient.name}`)
          }

          const templateData = {
            recipientName: recipient.name,
            churchName: church?.name || '교회',
            ...notificationData.templateData,
          }

          return await notificationService.sendCustomNotification({
            ...notificationData,
            recipientId: recipient.id,
            email: recipient.email || undefined,
            phone: recipient.phone || undefined,
            templateData,
            churchId: ctx.session.user.churchId,
          })
        })
      )

      const successful = results.filter(r => r.status === 'fulfilled').length
      const failed = results.filter(r => r.status === 'rejected').length

      return {
        successful,
        failed,
        total: recipients.length,
        errors: results
          .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
          .map(r => r.reason.message),
      }
    }),

  // Get notification templates
  getTemplates: protectedProcedure
    .input(z.object({
      type: z.nativeEnum(NotificationType).optional(),
      channel: z.nativeEnum(NotificationChannel).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const where = {
        churchId: ctx.session.user.churchId,
        isActive: true,
        ...(input.type && { type: input.type }),
        ...(input.channel && { channel: input.channel }),
      }

      const templates = await ctx.prisma.notificationTemplate.findMany({
        where,
        orderBy: [
          { isDefault: 'desc' },
          { name: 'asc' },
        ],
      })

      return templates
    }),

  // Create notification template (manager only)
  createTemplate: managerProcedure
    .input(notificationTemplateSchema)
    .mutation(async ({ ctx, input }) => {
      // If setting as default, remove default flag from other templates
      if (input.isDefault) {
        await ctx.prisma.notificationTemplate.updateMany({
          where: {
            churchId: ctx.session.user.churchId,
            type: input.type,
            channel: input.channel,
            isDefault: true,
          },
          data: { isDefault: false },
        })
      }

      const template = await ctx.prisma.notificationTemplate.create({
        data: {
          ...input,
          churchId: ctx.session.user.churchId,
        },
      })

      return template
    }),

  // Update notification template (manager only)
  updateTemplate: managerProcedure
    .input(notificationTemplateUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input

      // If setting as default, remove default flag from other templates
      if (data.isDefault) {
        await ctx.prisma.notificationTemplate.updateMany({
          where: {
            churchId: ctx.session.user.churchId,
            type: data.type,
            channel: data.channel,
            isDefault: true,
            id: { not: id },
          },
          data: { isDefault: false },
        })
      }

      const template = await ctx.prisma.notificationTemplate.update({
        where: {
          id,
          churchId: ctx.session.user.churchId,
        },
        data,
      })

      return template
    }),

  // Delete notification template (manager only)
  deleteTemplate: managerProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const template = await ctx.prisma.notificationTemplate.delete({
        where: {
          id: input.id,
          churchId: ctx.session.user.churchId,
        },
      })

      return template
    }),

  // Test notification connection (manager only)
  testConnection: managerProcedure
    .input(z.object({
      channel: z.nativeEnum(NotificationChannel),
      recipient: z.string().optional(), // email or phone number
    }))
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user

      try {
        switch (input.channel) {
          case NotificationChannel.EMAIL:
            const testEmail = input.recipient || user.email
            if (!testEmail) {
              throw new TRPCError({
                code: 'BAD_REQUEST',
                message: '테스트할 이메일 주소를 제공해주세요',
              })
            }

            await notificationService.sendCustomNotification({
              type: NotificationType.CUSTOM,
              channel: NotificationChannel.EMAIL,
              priority: NotificationPriority.NORMAL,
              recipientId: user.id,
              email: testEmail,
              title: '이메일 연결 테스트',
              message: '이메일 알림 시스템이 정상적으로 작동하고 있습니다.',
              templateData: {
                recipientName: user.name,
                churchName: '테스트',
              },
              churchId: user.churchId,
            })
            break

          case NotificationChannel.SMS:
            const testPhone = input.recipient || (user as any).phone
            if (!testPhone) {
              throw new TRPCError({
                code: 'BAD_REQUEST',
                message: '테스트할 휴대폰 번호를 제공해주세요',
              })
            }

            await notificationService.sendCustomNotification({
              type: NotificationType.CUSTOM,
              channel: NotificationChannel.SMS,
              priority: NotificationPriority.NORMAL,
              recipientId: user.id,
              phone: testPhone,
              title: 'SMS 연결 테스트',
              message: 'SMS 알림 시스템이 정상적으로 작동하고 있습니다.',
              templateData: {
                recipientName: user.name,
                churchName: '테스트',
              },
              churchId: user.churchId,
            })
            break

          default:
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: '지원하지 않는 알림 채널입니다',
            })
        }

        return { success: true, message: '테스트 알림이 전송되었습니다' }
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `테스트 전송 실패: ${error.message}`,
        })
      }
    }),

  // Trigger birthday reminders manually (manager only)
  triggerBirthdayReminders: managerProcedure
    .mutation(async ({ ctx }) => {
      try {
        await notificationService.sendBirthdayReminders(ctx.session.user.churchId)
        return { success: true, message: '생일 알림이 전송되었습니다' }
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `생일 알림 전송 실패: ${error.message}`,
        })
      }
    }),

  // Trigger visitation reminders manually (manager only)
  triggerVisitationReminders: managerProcedure
    .mutation(async ({ ctx }) => {
      try {
        await notificationService.sendVisitationReminders(ctx.session.user.churchId)
        return { success: true, message: '심방 알림이 전송되었습니다' }
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `심방 알림 전송 실패: ${error.message}`,
        })
      }
    }),

  // Get queue status (manager only)
  getQueueStatus: managerProcedure
    .query(async ({ ctx }) => {
      const stats = await notificationQueue.getQueueStats()
      
      // Get recent failed notifications
      const recentFailures = await ctx.prisma.notificationQueue.findMany({
        where: {
          churchId: ctx.session.user.churchId,
          status: NotificationStatus.FAILED,
        },
        orderBy: { failedAt: 'desc' },
        take: 10,
        select: {
          id: true,
          type: true,
          channel: true,
          title: true,
          errorMessage: true,
          failedAt: true,
          retryCount: true,
        },
      })

      return {
        ...stats,
        recentFailures,
      }
    }),

  // Schedule notifications (manager only)
  scheduleNotification: managerProcedure
    .input(z.object({
      type: z.nativeEnum(NotificationType),
      channel: z.nativeEnum(NotificationChannel),
      priority: z.nativeEnum(NotificationPriority).default(NotificationPriority.NORMAL),
      recipientIds: z.array(z.string()).min(1),
      title: z.string().min(1),
      message: z.string().min(1),
      scheduledAt: z.date(),
      templateData: z.record(z.any()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { recipientIds, scheduledAt, ...notificationData } = input

      // Validate recipients exist and belong to the same church
      const recipients = await ctx.prisma.user.findMany({
        where: {
          id: { in: recipientIds },
          churchId: ctx.session.user.churchId,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          notificationSettings: true,
        },
      })

      if (recipients.length !== recipientIds.length) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '일부 수신자를 찾을 수 없거나 권한이 없습니다.',
        })
      }

      const church = await ctx.prisma.church.findUnique({
        where: { id: ctx.session.user.churchId },
        select: { name: true },
      })

      // Schedule notifications
      const results = await Promise.allSettled(
        recipients.map(async (recipient) => {
          const templateData = {
            recipientName: recipient.name,
            churchName: church?.name || '교회',
            ...notificationData.templateData,
          }

          return await notificationService.sendCustomNotification({
            ...notificationData,
            recipientId: recipient.id,
            email: recipient.email || undefined,
            phone: recipient.phone || undefined,
            templateData,
            scheduledAt,
            churchId: ctx.session.user.churchId,
          })
        })
      )

      const successful = results.filter(r => r.status === 'fulfilled').length
      const failed = results.filter(r => r.status === 'rejected').length

      return {
        successful,
        failed,
        total: recipients.length,
        scheduledAt,
        errors: results
          .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
          .map(r => r.reason.message),
      }
    }),

  // Get notification delivery reports (manager only)
  getDeliveryReports: managerProcedure
    .input(z.object({
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      type: z.nativeEnum(NotificationType).optional(),
      channel: z.nativeEnum(NotificationChannel).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const where = {
        churchId: ctx.session.user.churchId,
        ...(input.startDate && input.endDate && {
          createdAt: {
            gte: input.startDate,
            lte: input.endDate,
          },
        }),
        ...(input.type && { type: input.type }),
        ...(input.channel && { channel: input.channel }),
      }

      const [
        totalSent,
        totalFailed,
        deliveryRates,
        channelStats,
      ] = await Promise.all([
        ctx.prisma.notificationHistory.count({
          where: { ...where, status: NotificationStatus.SENT },
        }),
        ctx.prisma.notificationHistory.count({
          where: { ...where, status: NotificationStatus.FAILED },
        }),
        ctx.prisma.notificationHistory.groupBy({
          by: ['type', 'status'],
          where,
          _count: true,
        }),
        ctx.prisma.notificationHistory.groupBy({
          by: ['channel', 'status'],
          where,
          _count: true,
        }),
      ])

      // Process delivery rates by type
      const deliveryRatesByType: Record<string, { sent: number; failed: number; rate: number }> = {}
      
      Object.values(NotificationType).forEach(type => {
        const sent = deliveryRates.find(r => r.type === type && r.status === NotificationStatus.SENT)?._count || 0
        const failed = deliveryRates.find(r => r.type === type && r.status === NotificationStatus.FAILED)?._count || 0
        const total = sent + failed
        
        deliveryRatesByType[type] = {
          sent,
          failed,
          rate: total > 0 ? (sent / total) * 100 : 0,
        }
      })

      // Process delivery rates by channel
      const deliveryRatesByChannel: Record<string, { sent: number; failed: number; rate: number }> = {}
      
      Object.values(NotificationChannel).forEach(channel => {
        const sent = channelStats.find(r => r.channel === channel && r.status === NotificationStatus.SENT)?._count || 0
        const failed = channelStats.find(r => r.channel === channel && r.status === NotificationStatus.FAILED)?._count || 0
        const total = sent + failed
        
        deliveryRatesByChannel[channel] = {
          sent,
          failed,
          rate: total > 0 ? (sent / total) * 100 : 0,
        }
      })

      const overallDeliveryRate = totalSent + totalFailed > 0 
        ? (totalSent / (totalSent + totalFailed)) * 100 
        : 0

      return {
        totalSent,
        totalFailed,
        overallDeliveryRate,
        deliveryRatesByType,
        deliveryRatesByChannel,
      }
    }),

  // Retry failed notifications (manager only)  
  retryFailedNotifications: managerProcedure
    .input(z.object({
      notificationIds: z.array(z.string()).optional(),
      olderThan: z.date().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      let where: any = {
        churchId: ctx.session.user.churchId,
        status: NotificationStatus.FAILED,
        retryCount: {
          lt: 3, // Only retry notifications that haven't exceeded max retries
        },
      }

      if (input.notificationIds?.length) {
        where.id = { in: input.notificationIds }
      }

      if (input.olderThan) {
        where.failedAt = { lt: input.olderThan }
      }

      const failedNotifications = await ctx.prisma.notificationQueue.findMany({
        where,
        take: 50, // Limit retries to prevent overload
      })

      if (failedNotifications.length === 0) {
        return {
          message: '재시도할 실패한 알림이 없습니다.',
          retried: 0,
        }
      }

      // Reset failed notifications to pending status
      await ctx.prisma.notificationQueue.updateMany({
        where: {
          id: { in: failedNotifications.map(n => n.id) },
        },
        data: {
          status: NotificationStatus.PENDING,
          retryCount: {
            increment: 1,
          },
          errorMessage: null,
          failedAt: null,
        },
      })

      // Re-enqueue notifications
      let requeued = 0
      for (const notification of failedNotifications) {
        try {
          await notificationQueue.enqueue({
            type: notification.type,
            channel: notification.channel,
            priority: notification.priority,
            recipientId: notification.recipientId,
            recipientType: notification.recipientType,
            email: notification.email || undefined,
            phone: notification.phone || undefined,
            title: notification.title,
            message: notification.message,
            templateData: notification.templateData ? JSON.parse(notification.templateData) : undefined,
            relatedId: notification.relatedId || undefined,
            relatedType: notification.relatedType || undefined,
            churchId: notification.churchId,
          })
          requeued++
        } catch (error) {
          console.error('Failed to re-enqueue notification:', notification.id, error)
        }
      }

      return {
        message: `${requeued}개의 알림을 재시도하였습니다.`,
        retried: requeued,
      }
    }),

  // Manual trigger schedulers (manager only)
  triggerScheduler: managerProcedure
    .input(z.object({
      type: z.enum(['birthday', 'visitation', 'expense']),
      subtype: z.enum(['quick', 'daily', 'weekly']).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const { notificationSystem } = await import('@/lib/notifications/system') as any
        
        switch (input.type) {
          case 'birthday':
            await notificationSystem.triggerBirthdayNotifications(ctx.session.user.churchId)
            break
          case 'visitation':
            await notificationSystem.triggerVisitationReminders(ctx.session.user.churchId)
            break
          case 'expense':
            await notificationSystem.triggerExpenseReminders(ctx.session.user.churchId, input.subtype)
            break
        }

        return {
          success: true,
          message: `${input.type} 스케줄러가 실행되었습니다.`,
        }
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `스케줄러 실행 실패: ${error.message}`,
        })
      }
    }),

  // Get system status (manager only)
  getSystemStatus: managerProcedure
    .query(async ({ ctx }) => {
      try {
        const { notificationSystem } = await import('@/lib/notifications/system') as any
        return notificationSystem.getStatus()
      } catch (error) {
        console.error('Failed to get notification system status:', error)
        return {
          initialized: false,
          useBullMQ: false,
          emailEnabled: false,
          smsEnabled: false,
          schedulerStatus: null,
          cronStatus: null,
        }
      }
    }),

  // Pause/Resume queue (admin only)
  pauseQueue: adminProcedure
    .mutation(async ({ ctx }) => {
      try {
        const { notificationSystem } = await import('@/lib/notifications/system') as any
        await notificationSystem.pauseQueue()
        return { success: true, message: '알림 큐가 일시정지되었습니다.' }
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `큐 일시정지 실패: ${error.message}`,
        })
      }
    }),

  resumeQueue: adminProcedure
    .mutation(async ({ ctx }) => {
      try {
        const { notificationSystem } = await import('@/lib/notifications/system') as any
        await notificationSystem.resumeQueue()
        return { success: true, message: '알림 큐가 재개되었습니다.' }
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `큐 재개 실패: ${error.message}`,
        })
      }
    }),
})