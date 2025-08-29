// Expense approval reminder scheduler
import { CronJob } from 'cron'
import { notificationService } from '../service'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { subHours, addHours, format } from 'date-fns'
import { canApproveExpenses } from '@/lib/permissions'

class ExpenseReminderScheduler {
  private jobs: CronJob[] = []

  constructor() {
    this.initializeJobs()
  }

  private initializeJobs() {
    // Quick approval reminders - every 30 minutes during business hours (9 AM - 6 PM)
    const quickReminderJob = new CronJob(
      '0,30 9-18 * * 1-5', // Every 30 minutes, 9 AM - 6 PM, Monday to Friday
      async () => {
        logger.debug('Running quick expense approval reminder check')
        await this.processQuickExpenseReminders()
      },
      null,
      false,
      'Asia/Seoul'
    )

    // Daily summary reminders at 10 AM on weekdays
    const dailySummaryJob = new CronJob(
      '0 10 * * 1-5', // 10 AM, Monday to Friday
      async () => {
        logger.info('Running daily expense approval summary')
        await this.processDailyExpenseSummary()
      },
      null,
      false,
      'Asia/Seoul'
    )

    // Weekly overdue reminders on Monday at 9 AM
    const weeklyOverdueJob = new CronJob(
      '0 9 * * 1', // 9 AM every Monday
      async () => {
        logger.info('Running weekly overdue expense reminders')
        await this.processOverdueExpenseReminders()
      },
      null,
      false,
      'Asia/Seoul'
    )

    this.jobs = [quickReminderJob, dailySummaryJob, weeklyOverdueJob]
  }

  async start(): Promise<void> {
    this.jobs.forEach(job => job.start())
    logger.info('Expense reminder scheduler started')
  }

  async stop(): Promise<void> {
    this.jobs.forEach(job => job.stop())
    logger.info('Expense reminder scheduler stopped')
  }

  getStatus() {
    return this.jobs.map((job, index) => ({
      running: (job as any).running || false,
      nextDate: new Date(job.nextDate().toString()),
      lastDate: job.lastDate() ? new Date(job.lastDate()!.toString()) : null,
      pattern: job.cronTime.source,
      type: ['quick', 'daily', 'weekly'][index],
    }))
  }

  async processQuickExpenseReminders(): Promise<void> {
    try {
      const churches = await prisma.church.findMany({
        select: { id: true, name: true },
      })

      for (const church of churches) {
        await this.processQuickRemindersForChurch(church.id)
      }
    } catch (error) {
      logger.error('Failed to process quick expense reminders', error as Error)
    }
  }

  private async processQuickRemindersForChurch(churchId: string): Promise<void> {
    const now = new Date()
    const oneHourAgo = subHours(now, 1)

    // Find expense reports submitted in the last hour that need approval
    const recentExpenses = await prisma.expenseReport.findMany({
      where: {
        churchId,
        status: 'PENDING',
        requestDate: {
          gte: oneHourAgo,
        },
      },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    if (recentExpenses.length === 0) {
      return
    }

    // Get approvers for this church
    const approvers = await prisma.user.findMany({
      where: {
        churchId,
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

    // Send quick reminders for high-priority or high-amount expenses
    for (const expense of recentExpenses) {
      const isHighPriority = Number(expense.amount) > 100000 // > 100,000 KRW
      const isUrgent = expense.category.includes('긴급') || expense.title.includes('긴급')
      
      if (isHighPriority || isUrgent) {
        for (const approver of approvers) {
          try {
            await notificationService.sendExpenseApprovalRequest({
              expenseReportId: expense.id,
              title: expense.title,
              amount: Number(expense.amount),
              category: expense.category,
              requesterId: expense.requesterId,
              requesterName: expense.requester.name,
              requesterEmail: expense.requester.email || undefined,
            })
            
            logger.debug('Quick expense approval reminder sent', {
              action: 'expense_reminder_sent',
              metadata: {
                expenseId: expense.id,
                approverId: approver.id,
                amount: Number(expense.amount),
                isHighPriority,
                isUrgent,
              }
            })
          } catch (error) {
            logger.error('Failed to send quick expense approval reminder', error as Error, {
              action: 'expense_reminder_failed',
              metadata: {
                expenseId: expense.id,
                approverId: approver.id,
              }
            })
          }
        }
      }
    }
  }

  async processDailyExpenseSummary(): Promise<void> {
    try {
      const churches = await prisma.church.findMany({
        select: { id: true, name: true },
      })

      for (const church of churches) {
        await this.processDailySummaryForChurch(church.id)
      }
    } catch (error) {
      logger.error('Failed to process daily expense summary', error as Error)
    }
  }

  private async processDailySummaryForChurch(churchId: string): Promise<void> {
    // Get all pending expense reports
    const pendingExpenses = await prisma.expenseReport.findMany({
      where: {
        churchId,
        status: 'PENDING',
      },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        requestDate: 'asc', // Oldest first
      },
    })

    if (pendingExpenses.length === 0) {
      return
    }

    // Get approvers
    const approvers = await prisma.user.findMany({
      where: {
        churchId,
        isActive: true,
        role: {
          in: ['FINANCIAL_MANAGER', 'MINISTER', 'SUPER_ADMIN'],
        },
        notificationSettings: {
          expenseApprovalNotifications: true,
        },
      },
    })

    // Calculate summary statistics
    const totalAmount = pendingExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0)
    const oldestExpense = pendingExpenses[0]
    const now = new Date()
    const daysOldest = Math.floor(
      (now.getTime() - oldestExpense.requestDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    // Send daily summary to each approver
    for (const approver of approvers) {
      try {
        await notificationService.sendCustomNotification({
          type: 'SYSTEM_ANNOUNCEMENT',
          channel: 'EMAIL',
          priority: 'NORMAL',
          recipientId: approver.id,
          recipientType: 'USER',
          email: approver.email || undefined,
          title: '일일 지출결의서 승인 대기 현황',
          message: `현재 ${pendingExpenses.length}건의 지출결의서가 승인을 기다리고 있습니다.`,
          templateData: {
            recipientName: approver.name,
            churchName: (await prisma.church.findUnique({
              where: { id: churchId },
              select: { name: true },
            }))?.name || '교회',
            pendingCount: pendingExpenses.length,
            totalAmount: totalAmount.toLocaleString(),
            oldestDays: daysOldest,
            expenseList: pendingExpenses.slice(0, 5).map(expense => 
              `• ${expense.title} (${expense.requester.name}) - ${Number(expense.amount).toLocaleString()}원`
            ).join('\n'),
          },
          churchId,
        })

        logger.debug('Daily expense summary sent', {
          action: 'expense_summary_sent',
          metadata: {
            approverId: approver.id,
            pendingCount: pendingExpenses.length,
            totalAmount,
            oldestDays: daysOldest,
          }
        })
      } catch (error) {
        logger.error('Failed to send daily expense summary', error as Error, {
          churchId,
          action: 'expense_summary_failed',
          metadata: {
            approverId: approver.id,
          }
        })
      }
    }
  }

  async processOverdueExpenseReminders(): Promise<void> {
    try {
      const churches = await prisma.church.findMany({
        select: { id: true, name: true },
      })

      for (const church of churches) {
        await this.processOverdueRemindersForChurch(church.id)
      }
    } catch (error) {
      logger.error('Failed to process overdue expense reminders', error as Error)
    }
  }

  private async processOverdueRemindersForChurch(churchId: string): Promise<void> {
    const now = new Date()
    const sevenDaysAgo = subHours(now, 24 * 7) // 7 days ago

    // Find expense reports older than 7 days
    const overdueExpenses = await prisma.expenseReport.findMany({
      where: {
        churchId,
        status: 'PENDING',
        requestDate: {
          lt: sevenDaysAgo,
        },
      },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        requestDate: 'asc',
      },
    })

    if (overdueExpenses.length === 0) {
      return
    }

    // Get approvers and church admin
    const approvers = await prisma.user.findMany({
      where: {
        churchId,
        isActive: true,
        role: {
          in: ['FINANCIAL_MANAGER', 'MINISTER', 'SUPER_ADMIN'],
        },
      },
    })

    // Send overdue notification to each approver
    for (const approver of approvers) {
      try {
        const expenseList = overdueExpenses.map(expense => {
          const daysOverdue = Math.floor(
            (now.getTime() - expense.requestDate.getTime()) / (1000 * 60 * 60 * 24)
          )
          return `• ${expense.title} (${expense.requester.name}) - ${daysOverdue}일 지연`
        }).join('\n')

        await notificationService.sendCustomNotification({
          type: 'SYSTEM_ANNOUNCEMENT',
          channel: 'EMAIL',
          priority: 'HIGH',
          recipientId: approver.id,
          recipientType: 'USER',
          email: approver.email || undefined,
          title: '⚠️ 지출결의서 승인 지연 알림',
          message: `${overdueExpenses.length}건의 지출결의서가 7일 이상 승인을 기다리고 있습니다.`,
          templateData: {
            recipientName: approver.name,
            churchName: (await prisma.church.findUnique({
              where: { id: churchId },
              select: { name: true },
            }))?.name || '교회',
            overdueCount: overdueExpenses.length,
            expenseList,
          },
          churchId,
        })

        logger.debug('Overdue expense reminder sent', {
          action: 'overdue_expense_reminder_sent',
          metadata: {
            approverId: approver.id,
            overdueCount: overdueExpenses.length,
          }
        })
      } catch (error) {
        logger.error('Failed to send overdue expense reminder', error as Error, {
          churchId,
          action: 'overdue_expense_reminder_failed',
          metadata: {
            approverId: approver.id,
          }
        })
      }
    }
  }

  // Manual trigger for testing
  async triggerExpenseReminders(churchId?: string, type?: 'quick' | 'daily' | 'weekly'): Promise<void> {
    logger.info('Manually triggering expense reminders', { churchId, type })
    
    if (churchId) {
      switch (type) {
        case 'quick':
          await this.processQuickRemindersForChurch(churchId)
          break
        case 'daily':
          await this.processDailySummaryForChurch(churchId)
          break
        case 'weekly':
          await this.processOverdueRemindersForChurch(churchId)
          break
        default:
          await this.processQuickRemindersForChurch(churchId)
          await this.processDailySummaryForChurch(churchId)
          await this.processOverdueRemindersForChurch(churchId)
      }
    } else {
      switch (type) {
        case 'quick':
          await this.processQuickExpenseReminders()
          break
        case 'daily':
          await this.processDailyExpenseSummary()
          break
        case 'weekly':
          await this.processOverdueExpenseReminders()
          break
        default:
          await this.processQuickExpenseReminders()
          await this.processDailyExpenseSummary()
          await this.processOverdueExpenseReminders()
      }
    }
  }
}

export const expenseReminderScheduler = new ExpenseReminderScheduler()