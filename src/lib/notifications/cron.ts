import { CronJob } from 'cron'
import { notificationService } from './service'
import { prisma } from '@/lib/db'

class NotificationCronJobs {
  private jobs: CronJob[] = []

  constructor() {
    this.initializeJobs()
  }

  private initializeJobs() {
    // Birthday reminders - daily at 9 AM
    const birthdayJob = new CronJob(
      '0 9 * * *', // 9 AM every day
      async () => {
        console.log('Running birthday reminder cron job')
        try {
          const churches = await prisma.church.findMany({
            select: { id: true, name: true },
          })

          for (const church of churches) {
            try {
              await notificationService.sendBirthdayReminders(church.id)
              console.log(`Birthday reminders sent for church: ${church.name}`)
            } catch (error) {
              console.error(`Failed to send birthday reminders for church ${church.name}:`, error)
            }
          }
        } catch (error) {
          console.error('Failed to fetch churches for birthday reminders:', error)
        }
      },
      null,
      false, // Don't start immediately
      'Asia/Seoul' // Korean timezone
    )

    // Visitation reminders - daily at 8 AM and 6 PM
    const visitationJobMorning = new CronJob(
      '0 8 * * *', // 8 AM every day
      async () => {
        console.log('Running morning visitation reminder cron job')
        await this.sendVisitationRemindersForAllChurches()
      },
      null,
      false,
      'Asia/Seoul'
    )

    const visitationJobEvening = new CronJob(
      '0 18 * * *', // 6 PM every day
      async () => {
        console.log('Running evening visitation reminder cron job')
        await this.sendVisitationRemindersForAllChurches()
      },
      null,
      false,
      'Asia/Seoul'
    )

    // Queue cleanup - hourly
    const queueCleanupJob = new CronJob(
      '0 * * * *', // Every hour
      async () => {
        console.log('Running queue cleanup cron job')
        try {
          await this.cleanupOldNotifications()
        } catch (error) {
          console.error('Failed to cleanup old notifications:', error)
        }
      },
      null,
      false,
      'Asia/Seoul'
    )

    this.jobs = [
      birthdayJob,
      visitationJobMorning,
      visitationJobEvening,
      queueCleanupJob,
    ]
  }

  private async sendVisitationRemindersForAllChurches(): Promise<void> {
    try {
      const churches = await prisma.church.findMany({
        select: { id: true, name: true },
      })

      for (const church of churches) {
        try {
          await notificationService.sendVisitationReminders(church.id)
          console.log(`Visitation reminders sent for church: ${church.name}`)
        } catch (error) {
          console.error(`Failed to send visitation reminders for church ${church.name}:`, error)
        }
      }
    } catch (error) {
      console.error('Failed to fetch churches for visitation reminders:', error)
    }
  }

  private async cleanupOldNotifications(): Promise<void> {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    try {
      // Delete old sent notifications from queue
      const deletedQueue = await prisma.notificationQueue.deleteMany({
        where: {
          status: 'SENT',
          sentAt: {
            lt: thirtyDaysAgo,
          },
        },
      })

      // Delete old notification history (keep for 90 days)
      const ninetyDaysAgo = new Date()
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

      const deletedHistory = await prisma.notificationHistory.deleteMany({
        where: {
          createdAt: {
            lt: ninetyDaysAgo,
          },
        },
      })

      console.log(`Cleanup completed: ${deletedQueue.count} queue items, ${deletedHistory.count} history items deleted`)
    } catch (error) {
      console.error('Failed to cleanup old notifications:', error)
    }
  }

  start(): void {
    console.log('Starting notification cron jobs...')
    this.jobs.forEach(job => {
      job.start()
      console.log(`Started cron job: ${job.cronTime.source}`)
    })
  }

  stop(): void {
    console.log('Stopping notification cron jobs...')
    this.jobs.forEach(job => {
      job.stop()
    })
  }

  getStatus(): { pattern: string; running: boolean; lastDate?: Date | null; nextDate?: Date | null }[] {
    return this.jobs.map(job => ({
      pattern: String(job.cronTime.source || job.cronTime.toString()),
      running: (job as any).running || false,
      lastDate: job.lastDate(),
      nextDate: job.nextDate() ? new Date(job.nextDate().toString()) : null,
    }))
  }
}

export const notificationCronJobs = new NotificationCronJobs()

// Auto-start in production
if (process.env.NODE_ENV === 'production') {
  notificationCronJobs.start()
}