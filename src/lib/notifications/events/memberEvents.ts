// Member event handlers for notifications
import { notificationService } from '../service'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/db'
import { NotificationType, NotificationChannel, NotificationPriority } from '@prisma/client'

export class MemberEventHandler {
  /**
   * Handle new member registration
   */
  async handleMemberCreated(memberId: string, churchId: string): Promise<void> {
    try {
      logger.info('Handling new member created event', { 
        churchId,
        action: 'member_created',
        metadata: { memberId }
      })

      const member = await prisma.member.findUnique({
        where: { id: memberId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      })

      if (!member) {
        logger.warn('Member not found for welcome notification', {
          action: 'member_not_found',
          metadata: { memberId }
        })
        return
      }

      const church = await prisma.church.findUnique({
        where: { id: churchId },
        select: { name: true },
      })

      // Get users who should receive new member notifications
      const notificationUsers = await prisma.user.findMany({
        where: {
          churchId,
          isActive: true,
          role: {
            in: ['MINISTER', 'DEPARTMENT_HEAD', 'COMMITTEE_CHAIR', 'SUPER_ADMIN'],
          },
          notificationSettings: {
            systemNotifications: true,
          },
        },
        include: {
          notificationSettings: true,
        },
      })

      // Send welcome notification to leadership
      const templateData = {
        memberName: member.name,
        churchName: church?.name || '교회',
        memberEmail: member.email || '미등록',
        memberPhone: member.phone || '미등록',
      }

      for (const user of notificationUsers) {
        const settings = user.notificationSettings

        // Send email notification
        if (settings?.emailEnabled && user.email) {
          await notificationService.sendCustomNotification({
            type: NotificationType.WELCOME_NEW_MEMBER,
            channel: NotificationChannel.EMAIL,
            priority: NotificationPriority.NORMAL,
            recipientId: user.id,
            recipientType: 'USER',
            email: user.email,
            title: '새 교인 등록 알림',
            message: `${member.name}님이 새 교인으로 등록되었습니다.`,
            templateData: {
              ...templateData,
              recipientName: user.name,
            },
            relatedId: member.id,
            relatedType: 'member',
            churchId,
          })
        }

        // Send SMS notification for urgent roles
        if (settings?.smsEnabled && user.phone && 
            ['MINISTER', 'SUPER_ADMIN'].includes(user.role)) {
          await notificationService.sendCustomNotification({
            type: NotificationType.WELCOME_NEW_MEMBER,
            channel: NotificationChannel.SMS,
            priority: NotificationPriority.NORMAL,
            recipientId: user.id,
            recipientType: 'USER',
            phone: user.phone,
            title: '새 교인',
            message: `새 교인: ${member.name}님이 등록되었습니다.`,
            templateData: {
              ...templateData,
              recipientName: user.name,
            },
            relatedId: member.id,
            relatedType: 'member',
            churchId,
          })
        }
      }

      // Send welcome email directly to the new member if they have an email
      if (member.email) {
        await this.sendWelcomeEmailToMember(
          { ...member, email: member.email }, 
          church?.name || '교회'
        )
      }

      logger.info('New member notifications sent successfully', {
        action: 'member_notifications_sent',
        metadata: {
          memberId,
          memberName: member.name,
          notificationsSent: notificationUsers.length,
        }
      })
    } catch (error) {
      logger.error('Failed to handle member created event', error as Error, {
        churchId,
        action: 'member_created_failed',
        metadata: { memberId }
      })
    }
  }

  private async sendWelcomeEmailToMember(
    member: { id: string; name: string; email: string },
    churchName: string
  ): Promise<void> {
    try {
      await notificationService.sendCustomNotification({
        type: NotificationType.CUSTOM,
        channel: NotificationChannel.EMAIL,
        priority: NotificationPriority.NORMAL,
        recipientId: member.id,
        recipientType: 'MEMBER',
        email: member.email,
        title: `${churchName}에 오신 것을 환영합니다!`,
        message: `${member.name}님, ${churchName}의 새로운 가족이 되신 것을 진심으로 환영합니다.`,
        templateData: {
          recipientName: member.name,
          churchName,
          welcomeMessage: `안녕하세요, ${member.name}님!

${churchName}의 새로운 가족이 되신 것을 진심으로 환영합니다.

저희 교회는 하나님의 사랑 안에서 서로를 돌보며 함께 성장하는 공동체입니다. ${member.name}님과 함께할 수 있게 되어 정말 기쁩니다.

앞으로 교회 생활에 궁금한 점이나 도움이 필요한 일이 있으시면 언제든지 교회 사무실로 연락주시기 바랍니다.

다시 한번 환영합니다!

${churchName} 드림`,
        },
        relatedId: member.id,
        relatedType: 'member',
        churchId: member.id, // This should be properly set with actual churchId
      })

      logger.info('Welcome email sent to new member', {
        action: 'welcome_email_sent',
        metadata: {
          memberId: member.id,
          memberName: member.name,
          memberEmail: member.email,
        }
      })
    } catch (error) {
      logger.error('Failed to send welcome email to member', error as Error, {
        action: 'welcome_email_failed',
        metadata: {
          memberId: member.id,
          memberName: member.name,
        }
      })
    }
  }

  /**
   * Handle member profile updates
   */
  async handleMemberUpdated(
    memberId: string,
    churchId: string,
    changes: Record<string, any>
  ): Promise<void> {
    try {
      // Only send notifications for significant changes
      const significantChanges = ['status', 'positionId', 'departmentId']
      const hasSignificantChange = significantChanges.some(field => 
        changes.hasOwnProperty(field)
      )

      if (!hasSignificantChange) {
        return
      }

      logger.info('Handling member updated event', { 
        churchId,
        action: 'member_updated',
        metadata: { memberId, changes }
      })

      const member = await prisma.member.findUnique({
        where: { id: memberId },
        include: {
          position: true,
          department: true,
        },
      })

      if (!member) {
        return
      }

      // Get leadership who should be notified of member changes
      const notificationUsers = await prisma.user.findMany({
        where: {
          churchId,
          isActive: true,
          role: {
            in: ['MINISTER', 'DEPARTMENT_HEAD', 'SUPER_ADMIN'],
          },
          notificationSettings: {
            systemNotifications: true,
            emailEnabled: true,
          },
        },
      })

      // Create notification message based on changes
      let changeDescription = ''
      if (changes.status) {
        changeDescription += `상태: ${changes.status}`
      }
      if (changes.positionId) {
        changeDescription += changeDescription ? ', ' : ''
        changeDescription += `직분: ${member.position?.name || '없음'}`
      }
      if (changes.departmentId) {
        changeDescription += changeDescription ? ', ' : ''
        changeDescription += `부서: ${member.department?.name || '없음'}`
      }

      for (const user of notificationUsers) {
        await notificationService.sendCustomNotification({
          type: NotificationType.SYSTEM_ANNOUNCEMENT,
          channel: NotificationChannel.EMAIL,
          priority: NotificationPriority.LOW,
          recipientId: user.id,
          recipientType: 'USER',
          email: user.email!,
          title: '교인 정보 변경 알림',
          message: `${member.name}님의 정보가 변경되었습니다: ${changeDescription}`,
          templateData: {
            recipientName: user.name,
            churchName: (await prisma.church.findUnique({
              where: { id: churchId },
              select: { name: true },
            }))?.name || '교회',
            memberName: member.name,
            changeDescription,
          },
          relatedId: member.id,
          relatedType: 'member',
          churchId,
        })
      }

      logger.info('Member update notifications sent', {
        action: 'member_update_notifications_sent',
        metadata: {
          memberId,
          memberName: member.name,
          changes: changeDescription,
          notificationsSent: notificationUsers.length,
        }
      })
    } catch (error) {
      logger.error('Failed to handle member updated event', error as Error, {
        churchId,
        action: 'member_updated_failed',
        metadata: { memberId, changes }
      })
    }
  }

  /**
   * Handle member status changes (deactivation, transfer, etc.)
   */
  async handleMemberStatusChange(
    memberId: string,
    churchId: string,
    oldStatus: string,
    newStatus: string
  ): Promise<void> {
    try {
      // Only notify for significant status changes
      if (!['ACTIVE', 'INACTIVE', 'TRANSFERRED', 'DECEASED'].includes(newStatus)) {
        return
      }

      logger.info('Handling member status change event', { 
        churchId, 
        action: 'member_status_changed',
        metadata: {
          memberId, 
          oldStatus, 
          newStatus 
        }
      })

      const member = await prisma.member.findUnique({
        where: { id: memberId },
        select: {
          id: true,
          name: true,
        },
      })

      if (!member) {
        return
      }

      // Get ministry leadership for notifications
      const notificationUsers = await prisma.user.findMany({
        where: {
          churchId,
          isActive: true,
          role: {
            in: ['MINISTER', 'SUPER_ADMIN'],
          },
          notificationSettings: {
            systemNotifications: true,
          },
        },
        include: {
          notificationSettings: true,
        },
      })

      const statusMessages = {
        INACTIVE: '비활성화되었습니다',
        TRANSFERRED: '타 교회로 이적하였습니다',
        DECEASED: '하나님의 부르심을 받았습니다',
        ACTIVE: '다시 활성화되었습니다',
      }

      const message = statusMessages[newStatus as keyof typeof statusMessages] || 
                     `상태가 ${newStatus}로 변경되었습니다`

      const priority = newStatus === 'DECEASED' ? NotificationPriority.HIGH : NotificationPriority.NORMAL

      for (const user of notificationUsers) {
        const settings = user.notificationSettings

        // Send email notification
        if (settings?.emailEnabled && user.email) {
          await notificationService.sendCustomNotification({
            type: NotificationType.SYSTEM_ANNOUNCEMENT,
            channel: NotificationChannel.EMAIL,
            priority,
            recipientId: user.id,
            recipientType: 'USER',
            email: user.email,
            title: '교인 상태 변경 알림',
            message: `${member.name}님이 ${message}`,
            templateData: {
              recipientName: user.name,
              churchName: (await prisma.church.findUnique({
                where: { id: churchId },
                select: { name: true },
              }))?.name || '교회',
              memberName: member.name,
              oldStatus,
              newStatus,
              statusMessage: message,
            },
            relatedId: member.id,
            relatedType: 'member',
            churchId,
          })
        }

        // Send SMS for urgent status changes
        if (settings?.smsEnabled && user.phone && newStatus === 'DECEASED') {
          await notificationService.sendCustomNotification({
            type: NotificationType.SYSTEM_ANNOUNCEMENT,
            channel: NotificationChannel.SMS,
            priority: NotificationPriority.HIGH,
            recipientId: user.id,
            recipientType: 'USER',
            phone: user.phone,
            title: '부고 알림',
            message: `${member.name}님이 하나님의 부르심을 받았습니다.`,
            templateData: {
              recipientName: user.name,
              memberName: member.name,
            },
            relatedId: member.id,
            relatedType: 'member',
            churchId,
          })
        }
      }

      logger.info('Member status change notifications sent', {
        action: 'member_status_change_notifications_sent',
        metadata: {
          memberId,
          memberName: member.name,
          oldStatus,
          newStatus,
          notificationsSent: notificationUsers.length,
        }
      })
    } catch (error) {
      logger.error('Failed to handle member status change event', error as Error, {
        churchId,
        action: 'member_status_change_failed',
        metadata: {
          memberId,
          oldStatus,
          newStatus,
        }
      })
    }
  }
}

export const memberEventHandler = new MemberEventHandler()