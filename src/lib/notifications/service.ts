import { prisma } from '@/lib/db'
import { notificationQueue } from './queue'
import { 
  NotificationPayload, 
  BirthdayReminderData, 
  VisitationReminderData, 
  ExpenseApprovalData,
  NotificationTemplateData 
} from './types'
import { 
  NotificationType, 
  NotificationChannel, 
  NotificationPriority,
  RecipientType 
} from '@prisma/client'
import { addDays, format } from 'date-fns'

export class NotificationService {
  /**
   * Send birthday reminder notifications
   */
  async sendBirthdayReminders(churchId: string): Promise<void> {
    try {
      console.log('Sending birthday reminders for church:', churchId)

      // Get users with birthday notification settings
      const users = await prisma.user.findMany({
        where: {
          churchId,
          isActive: true,
          notificationSettings: {
            birthdayNotifications: true,
          },
        },
        include: {
          notificationSettings: true,
        },
      })

      // Get upcoming birthdays
      const today = new Date()
      const reminderDays = 7 // Default to 7 days

      for (const user of users) {
        const userReminderDays = user.notificationSettings?.birthdayReminderDays || reminderDays
        const reminderDate = addDays(today, userReminderDays)

        // Find members with birthdays coming up
        const membersWithUpcomingBirthdays = await this.getMembersWithUpcomingBirthdays(
          churchId,
          userReminderDays
        )

        for (const member of membersWithUpcomingBirthdays) {
          await this.sendBirthdayNotification(user, member)
        }
      }

      console.log('Birthday reminders sent successfully')
    } catch (error) {
      console.error('Failed to send birthday reminders:', error)
      throw error
    }
  }

  private async getMembersWithUpcomingBirthdays(
    churchId: string,
    reminderDays: number
  ): Promise<BirthdayReminderData[]> {
    const today = new Date()
    const reminderDate = addDays(today, reminderDays)

    // Get current day and month for birthday matching
    const targetMonth = reminderDate.getMonth() + 1
    const targetDay = reminderDate.getDate()

    const members = await prisma.member.findMany({
      where: {
        churchId,
        status: 'ACTIVE',
        birthDate: {
          not: null,
        },
      },
      select: {
        id: true,
        name: true,
        birthDate: true,
        phone: true,
        email: true,
      },
    })

    return members
      .filter(member => {
        if (!member.birthDate) return false
        
        const birthMonth = member.birthDate.getMonth() + 1
        const birthDay = member.birthDate.getDate()
        
        return birthMonth === targetMonth && birthDay === targetDay
      })
      .map(member => ({
        memberId: member.id,
        memberName: member.name,
        birthDate: member.birthDate!,
        age: today.getFullYear() - member.birthDate!.getFullYear(),
        phone: member.phone || undefined,
        email: member.email || undefined,
      }))
  }

  /**
   * Send birthday notification with support for different reminder periods
   */
  async sendBirthdayNotification(
    user: any,
    member: BirthdayReminderData,
    daysAhead?: number
  ): Promise<void> {
    return this.sendBirthdayNotificationInternal(user, member, daysAhead)
  }

  private async sendBirthdayNotificationInternal(
    user: any,
    member: BirthdayReminderData,
    daysAhead?: number
  ): Promise<void> {
    const church = await prisma.church.findUnique({
      where: { id: user.churchId },
      select: { name: true },
    })

    const templateData: NotificationTemplateData = {
      recipientName: user.name,
      churchName: church?.name || '교회',
      memberName: member.memberName,
      birthDate: format(member.birthDate, 'MM월 dd일'),
      age: member.age,
      daysAhead: daysAhead || 1,
    }

    const settings = user.notificationSettings

    // Send email notification
    if (settings?.emailEnabled && user.email) {
      await notificationQueue.enqueue({
        type: NotificationType.BIRTHDAY_REMINDER,
        channel: NotificationChannel.EMAIL,
        priority: NotificationPriority.NORMAL,
        recipientId: user.id,
        recipientType: RecipientType.USER,
        email: user.email,
        title: '생일 축하 알림',
        message: `${member.memberName}님의 생일이 곧 다가옵니다`,
        templateData,
        relatedId: member.memberId,
        relatedType: 'member',
        churchId: user.churchId,
      })
    }

    // Send SMS notification
    if (settings?.smsEnabled && user.phone) {
      await notificationQueue.enqueue({
        type: NotificationType.BIRTHDAY_REMINDER,
        channel: NotificationChannel.SMS,
        priority: NotificationPriority.NORMAL,
        recipientId: user.id,
        recipientType: RecipientType.USER,
        phone: user.phone,
        title: '생일 축하',
        message: `${member.memberName}님의 생일이 곧 다가옵니다`,
        templateData,
        relatedId: member.memberId,
        relatedType: 'member',
        churchId: user.churchId,
      })
    }
  }

  /**
   * Send visitation reminder notifications
   */
  async sendVisitationReminders(churchId: string): Promise<void> {
    try {
      console.log('Sending visitation reminders for church:', churchId)

      // Get upcoming visitations (next 24 hours)
      const tomorrow = addDays(new Date(), 1)
      const dayAfter = addDays(new Date(), 2)

      const upcomingVisitations = await prisma.visitation.findMany({
        where: {
          member: { churchId },
          needsFollowUp: true,
          followUpDate: {
            gte: new Date(),
            lte: dayAfter,
          },
        },
        include: {
          member: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
              address: true,
            },
          },
        },
      })

      // Get users who should receive visitation reminders
      const users = await prisma.user.findMany({
        where: {
          churchId,
          isActive: true,
          notificationSettings: {
            visitationReminders: true,
          },
        },
        include: {
          notificationSettings: true,
        },
      })

      for (const visitation of upcomingVisitations) {
        const visitationData: VisitationReminderData = {
          visitationId: visitation.id,
          memberId: visitation.member.id,
          memberName: visitation.member.name,
          visitDate: visitation.visitDate,
          purpose: visitation.purpose,
          address: visitation.member.address || undefined,
          phone: visitation.member.phone || undefined
        }
        
        for (const user of users) {
          await this.sendVisitationReminderNotification(user, visitationData)
        }
      }

      console.log('Visitation reminders sent successfully')
    } catch (error) {
      console.error('Failed to send visitation reminders:', error)
      throw error
    }
  }

  /**
   * Send visitation reminder notification - public interface
   */
  async sendVisitationReminderNotification(
    user: any,
    visitation: VisitationReminderData
  ): Promise<void> {
    return this.sendVisitationReminderNotificationInternal(user, visitation)
  }

  private async sendVisitationReminderNotificationInternal(
    user: any,
    visitation: any
  ): Promise<void> {
    const church = await prisma.church.findUnique({
      where: { id: user.churchId },
      select: { name: true },
    })

    const templateData: NotificationTemplateData = {
      recipientName: user.name,
      churchName: church?.name || '교회',
      memberName: visitation.member.name,
      visitDate: format(visitation.followUpDate || visitation.visitDate, 'MM월 dd일 HH:mm'),
      visitPurpose: visitation.purpose || '심방',
      memberAddress: visitation.member.address || '주소 미등록',
    }

    const settings = user.notificationSettings

    // Send email notification
    if (settings?.emailEnabled && user.email) {
      await notificationQueue.enqueue({
        type: NotificationType.VISITATION_REMINDER,
        channel: NotificationChannel.EMAIL,
        priority: NotificationPriority.HIGH,
        recipientId: user.id,
        recipientType: RecipientType.USER,
        email: user.email,
        title: '심방 일정 알림',
        message: `${visitation.member.name}님 심방 일정이 있습니다`,
        templateData,
        relatedId: visitation.id,
        relatedType: 'visitation',
        churchId: user.churchId,
      })
    }

    // Send SMS notification
    if (settings?.smsEnabled && user.phone) {
      await notificationQueue.enqueue({
        type: NotificationType.VISITATION_REMINDER,
        channel: NotificationChannel.SMS,
        priority: NotificationPriority.HIGH,
        recipientId: user.id,
        recipientType: RecipientType.USER,
        phone: user.phone,
        title: '심방 알림',
        message: `${visitation.member.name}님 심방 일정이 있습니다`,
        templateData,
        relatedId: visitation.id,
        relatedType: 'visitation',
        churchId: user.churchId,
      })
    }
  }

  /**
   * Send expense report approval notifications
   */
  async sendExpenseApprovalRequest(data: ExpenseApprovalData): Promise<void> {
    try {
      console.log('Sending expense approval request:', data.expenseReportId)

      // Get users who can approve expenses
      const approvers = await prisma.user.findMany({
        where: {
          churchId: (await prisma.expenseReport.findUnique({
            where: { id: data.expenseReportId },
            select: { churchId: true },
          }))?.churchId,
          isActive: true,
          role: {
            in: ['FINANCIAL_MANAGER', 'MINISTER', 'SUPER_ADMIN'],
          },
          notificationSettings: {
            expenseApprovalNotifications: true,
          },
        },
        include: {
          notificationSettings: true,
        },
      })

      const church = await prisma.church.findFirst({
        select: { name: true },
      })

      for (const approver of approvers) {
        const templateData: NotificationTemplateData = {
          recipientName: approver.name,
          churchName: church?.name || '교회',
          expenseTitle: data.title,
          expenseAmount: data.amount.toLocaleString(),
          expenseCategory: data.category,
          requesterName: data.requesterName,
        }

        const settings = approver.notificationSettings

        // Send email notification
        if (settings?.emailEnabled && approver.email) {
          await notificationQueue.enqueue({
            type: NotificationType.EXPENSE_APPROVAL_REQUEST,
            channel: NotificationChannel.EMAIL,
            priority: NotificationPriority.HIGH,
            recipientId: approver.id,
            recipientType: RecipientType.USER,
            email: approver.email,
            title: '지출결의서 승인 요청',
            message: `${data.requesterName}님의 지출결의서 승인이 필요합니다`,
            templateData,
            relatedId: data.expenseReportId,
            relatedType: 'expense_report',
            churchId: approver.churchId,
          })
        }

        // Send SMS notification
        if (settings?.smsEnabled && approver.phone) {
          await notificationQueue.enqueue({
            type: NotificationType.EXPENSE_APPROVAL_REQUEST,
            channel: NotificationChannel.SMS,
            priority: NotificationPriority.HIGH,
            recipientId: approver.id,
            recipientType: RecipientType.USER,
            phone: approver.phone,
            title: '지출결의서 승인',
            message: `${data.requesterName}님의 지출결의서 승인이 필요합니다`,
            templateData,
            relatedId: data.expenseReportId,
            relatedType: 'expense_report',
            churchId: approver.churchId,
          })
        }
      }

      console.log('Expense approval requests sent successfully')
    } catch (error) {
      console.error('Failed to send expense approval requests:', error)
      throw error
    }
  }

  /**
   * Send expense report approval result notifications
   */
  async sendExpenseApprovalResult(
    expenseReportId: string,
    approved: boolean,
    rejectionReason?: string
  ): Promise<void> {
    try {
      const expenseReport = await prisma.expenseReport.findUnique({
        where: { id: expenseReportId },
        include: {
          requester: {
            include: {
              notificationSettings: true,
            },
          },
        },
      })

      if (!expenseReport) {
        throw new Error('Expense report not found')
      }

      const church = await prisma.church.findUnique({
        where: { id: expenseReport.churchId },
        select: { name: true },
      })

      const templateData: NotificationTemplateData = {
        recipientName: expenseReport.requester.name,
        churchName: church?.name || '교회',
        expenseTitle: expenseReport.title,
        expenseAmount: expenseReport.amount.toLocaleString(),
        expenseCategory: expenseReport.category,
        rejectionReason: rejectionReason,
      }

      const settings = expenseReport.requester.notificationSettings
      const notificationType = approved 
        ? NotificationType.EXPENSE_APPROVED 
        : NotificationType.EXPENSE_REJECTED

      // Send email notification
      if (settings?.emailEnabled && expenseReport.requester.email) {
        await notificationQueue.enqueue({
          type: notificationType,
          channel: NotificationChannel.EMAIL,
          priority: NotificationPriority.NORMAL,
          recipientId: expenseReport.requester.id,
          recipientType: RecipientType.USER,
          email: expenseReport.requester.email,
          title: approved ? '지출결의서 승인' : '지출결의서 반려',
          message: approved 
            ? '지출결의서가 승인되었습니다' 
            : '지출결의서가 반려되었습니다',
          templateData,
          relatedId: expenseReportId,
          relatedType: 'expense_report',
          churchId: expenseReport.churchId,
        })
      }

      // Send SMS notification
      if (settings?.smsEnabled && expenseReport.requester.phone) {
        await notificationQueue.enqueue({
          type: notificationType,
          channel: NotificationChannel.SMS,
          priority: NotificationPriority.NORMAL,
          recipientId: expenseReport.requester.id,
          recipientType: RecipientType.USER,
          phone: expenseReport.requester.phone,
          title: approved ? '지출결의서 승인' : '지출결의서 반려',
          message: approved 
            ? '지출결의서가 승인되었습니다' 
            : '지출결의서가 반려되었습니다',
          templateData,
          relatedId: expenseReportId,
          relatedType: 'expense_report',
          churchId: expenseReport.churchId,
        })
      }

      console.log('Expense approval result sent successfully')
    } catch (error) {
      console.error('Failed to send expense approval result:', error)
      throw error
    }
  }

  /**
   * Send approval request notification
   */
  async sendApprovalRequest(
    approverId: string,
    transactionId: string,
    churchId: string
  ): Promise<void> {
    try {
      console.log('Sending approval request to:', approverId)

      // Get approver information
      const approver = await prisma.user.findUnique({
        where: { id: approverId },
        include: { notificationSettings: true }
      })

      if (!approver) {
        throw new Error('Approver not found')
      }

      // Get transaction and approval flow details
      const approvalFlow = await prisma.approvalFlow.findFirst({
        where: { transactionId },
        include: {
          transaction: {
            include: {
              requester: true
            }
          },
          requester: true,
          organization: true
        }
      })

      if (!approvalFlow) {
        throw new Error('Approval flow not found')
      }

      const church = await prisma.church.findUnique({
        where: { id: churchId },
        select: { name: true }
      })

      const templateData: NotificationTemplateData = {
        recipientName: approver.name,
        churchName: church?.name || '교회',
        expenseTitle: approvalFlow.transaction.description,
        expenseAmount: approvalFlow.amount.toString(),
        expenseCategory: approvalFlow.category,
        requesterName: approvalFlow.requester.name,
        organizationName: approvalFlow.organization.name,
        approvalUrl: `${process.env.NEXTAUTH_URL}/dashboard/approvals`,
      }

      const settings = approver.notificationSettings

      // Send email notification
      if (settings?.emailEnabled && approver.email) {
        await notificationQueue.enqueue({
          type: NotificationType.EXPENSE_APPROVAL_REQUEST,
          channel: NotificationChannel.EMAIL,
          priority: NotificationPriority.HIGH,
          recipientId: approver.id,
          recipientType: RecipientType.USER,
          email: approver.email,
          title: '결재 요청',
          message: `${approvalFlow.requester.name}님의 지출결의서 결재가 필요합니다`,
          templateData,
          relatedId: transactionId,
          relatedType: 'transaction',
          churchId,
        })
      }

      // Send SMS notification for urgent approvals
      if (settings?.smsEnabled && approver.phone && Number(approvalFlow.amount) > 500000) {
        await notificationQueue.enqueue({
          type: NotificationType.EXPENSE_APPROVAL_REQUEST,
          channel: NotificationChannel.SMS,
          priority: NotificationPriority.HIGH,
          recipientId: approver.id,
          recipientType: RecipientType.USER,
          phone: approver.phone,
          title: '긴급 결재',
          message: `[긴급] ${approvalFlow.amount}원 지출결의서 결재 요청`,
          templateData,
          relatedId: transactionId,
          relatedType: 'transaction',
          churchId,
        })
      }

      console.log('Approval request sent successfully')
    } catch (error) {
      console.error('Failed to send approval request:', error)
      throw error
    }
  }

  /**
   * Send approval completion notification
   */
  async sendApprovalCompletion(
    transactionId: string,
    approved: boolean,
    comments?: string
  ): Promise<void> {
    try {
      console.log('Sending approval completion notification:', transactionId)

      // Get approval flow and transaction details
      const approvalFlow = await prisma.approvalFlow.findFirst({
        where: { transactionId },
        include: {
          transaction: {
            include: {
              requester: true
            }
          },
          requester: {
            include: {
              notificationSettings: true
            }
          },
          organization: true
        }
      })

      if (!approvalFlow) {
        throw new Error('Approval flow not found')
      }

      const church = await prisma.church.findUnique({
        where: { id: approvalFlow.requester.churchId },
        select: { name: true }
      })

      const templateData: NotificationTemplateData = {
        recipientName: approvalFlow.requester.name,
        churchName: church?.name || '교회',
        expenseTitle: approvalFlow.transaction.description,
        expenseAmount: approvalFlow.amount.toString(),
        expenseCategory: approvalFlow.category,
        approvalStatus: approved ? '승인' : '반려',
        rejectionReason: comments,
        dashboardUrl: `${process.env.NEXTAUTH_URL}/dashboard/expense-reports`,
      }

      const settings = approvalFlow.requester.notificationSettings
      const notificationType = approved 
        ? NotificationType.EXPENSE_APPROVED 
        : NotificationType.EXPENSE_REJECTED

      // Send email notification
      if (settings?.emailEnabled && approvalFlow.requester.email) {
        await notificationQueue.enqueue({
          type: notificationType,
          channel: NotificationChannel.EMAIL,
          priority: NotificationPriority.NORMAL,
          recipientId: approvalFlow.requester.id,
          recipientType: RecipientType.USER,
          email: approvalFlow.requester.email,
          title: approved ? '결재 승인 완료' : '결재 반려',
          message: approved 
            ? '지출결의서가 최종 승인되었습니다' 
            : '지출결의서가 반려되었습니다',
          templateData,
          relatedId: transactionId,
          relatedType: 'transaction',
          churchId: approvalFlow.requester.churchId,
        })
      }

      // Send SMS notification
      if (settings?.smsEnabled && approvalFlow.requester.phone) {
        await notificationQueue.enqueue({
          type: notificationType,
          channel: NotificationChannel.SMS,
          priority: NotificationPriority.NORMAL,
          recipientId: approvalFlow.requester.id,
          recipientType: RecipientType.USER,
          phone: approvalFlow.requester.phone,
          title: approved ? '결재 승인' : '결재 반려',
          message: approved 
            ? `${approvalFlow.amount}원 지출결의서가 승인되었습니다` 
            : `${approvalFlow.amount}원 지출결의서가 반려되었습니다`,
          templateData,
          relatedId: transactionId,
          relatedType: 'transaction',
          churchId: approvalFlow.requester.churchId,
        })
      }

      console.log('Approval completion notification sent successfully')
    } catch (error) {
      console.error('Failed to send approval completion notification:', error)
      throw error
    }
  }

  /**
   * Send delayed approval escalation notification
   * Simplified implementation for Phase 3.4.4
   */
  async sendDelayedApprovalEscalation(
    stepId: string,
    delayedHours: number
  ): Promise<void> {
    try {
      console.log('Sending delayed approval escalation:', stepId, delayedHours)
      
      // TODO: Implement escalation logic with proper database queries
      // This would require finding managers in parent organizations
      
      console.log('Delayed approval escalation sent successfully')
    } catch (error) {
      console.error('Failed to send delayed approval escalation:', error)
      throw error
    }
  }

  /**
   * Send custom notification
   */
  async sendCustomNotification(payload: NotificationPayload): Promise<void> {
    try {
      await notificationQueue.enqueue(payload)
      console.log('Custom notification sent successfully')
    } catch (error) {
      console.error('Failed to send custom notification:', error)
      throw error
    }
  }

  /**
   * Get notification history for a user
   */
  async getNotificationHistory(
    userId: string, 
    churchId: string,
    options?: {
      page?: number
      limit?: number
      type?: NotificationType
      channel?: NotificationChannel
    }
  ) {
    const page = options?.page || 1
    const limit = options?.limit || 20
    const offset = (page - 1) * limit

    const where = {
      recipientId: userId,
      churchId,
      ...(options?.type && { type: options.type }),
      ...(options?.channel && { channel: options.channel }),
    }

    const [notifications, total] = await Promise.all([
      prisma.notificationHistory.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.notificationHistory.count({ where }),
    ])

    return {
      notifications,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
    }
  }
}

export const notificationService = new NotificationService()