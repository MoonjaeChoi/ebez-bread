// Birthday notification scheduler
import { CronJob } from 'cron'
import { notificationService } from '../service'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { addDays, format } from 'date-fns'

class BirthdayNotificationScheduler {
  private job: CronJob | null = null

  constructor() {
    this.initializeJob()
  }

  private initializeJob() {
    // Run daily at 9 AM to send birthday reminders
    this.job = new CronJob(
      '0 9 * * *', // 9 AM every day
      async () => {
        logger.info('Running birthday notification scheduler')
        await this.processBirthdayNotifications()
      },
      null,
      false, // Don't start immediately
      'Asia/Seoul'
    )
  }

  async start(): Promise<void> {
    if (this.job) {
      this.job.start()
      logger.info('Birthday notification scheduler started')
    }
  }

  async stop(): Promise<void> {
    if (this.job) {
      this.job.stop()
      logger.info('Birthday notification scheduler stopped')
    }
  }

  getStatus() {
    return {
      running: this.job?.running || false,
      nextDate: this.job?.nextDate().toJSDate(),
      lastDate: this.job?.lastDate()?.toJSDate(),
      pattern: '0 9 * * *',
      description: 'Daily birthday reminders at 9 AM',
    }
  }

  async processBirthdayNotifications(): Promise<void> {
    try {
      const churches = await prisma.church.findMany({
        select: { id: true, name: true },
      })

      const results = await Promise.allSettled(
        churches.map(async (church) => {
          try {
            await this.processBirthdaysForChurch(church.id)
            logger.info('Birthday notifications processed', {
              churchId: church.id,
              churchName: church.name,
            })
          } catch (error) {
            logger.error('Failed to process birthday notifications for church', error as Error, {
              churchId: church.id,
              churchName: church.name,
            })
            throw error
          }
        })
      )

      const failed = results.filter(result => result.status === 'rejected').length
      const succeeded = results.filter(result => result.status === 'fulfilled').length

      logger.info('Birthday notification batch completed', {
        totalChurches: churches.length,
        succeeded,
        failed,
      })
    } catch (error) {
      logger.error('Failed to process birthday notifications', error as Error)
      throw error
    }
  }

  private async processBirthdaysForChurch(churchId: string): Promise<void> {
    // Get all users with birthday notification settings enabled
    const usersWithBirthdayNotifications = await prisma.user.findMany({
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

    if (usersWithBirthdayNotifications.length === 0) {
      logger.debug('No users with birthday notifications enabled', { churchId })
      return
    }

    // Get upcoming birthdays for different reminder periods
    const reminderPeriods = [1, 3, 7, 14] // 1, 3, 7, 14 days ahead
    
    for (const days of reminderPeriods) {
      const targetDate = addDays(new Date(), days)
      const upcomingBirthdays = await this.getUpcomingBirthdays(churchId, targetDate)
      
      if (upcomingBirthdays.length === 0) {
        continue
      }

      // Send notifications to users who want reminders for this period
      const relevantUsers = usersWithBirthdayNotifications.filter(user => 
        (user.notificationSettings?.birthdayReminderDays || 7) === days
      )

      for (const user of relevantUsers) {
        for (const birthday of upcomingBirthdays) {
          try {
            await notificationService.sendBirthdayNotification(user, birthday, days)
            logger.debug('Birthday notification sent', {
              userId: user.id,
              memberId: birthday.memberId,
              memberName: birthday.memberName,
              daysAhead: days,
            })
          } catch (error) {
            logger.error('Failed to send birthday notification', error as Error, {
              userId: user.id,
              memberId: birthday.memberId,
              memberName: birthday.memberName,
              daysAhead: days,
            })
          }
        }
      }
    }
  }

  private async getUpcomingBirthdays(churchId: string, targetDate: Date) {
    const targetMonth = targetDate.getMonth() + 1
    const targetDay = targetDate.getDate()

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
        age: targetDate.getFullYear() - member.birthDate!.getFullYear(),
        phone: member.phone || undefined,
        email: member.email || undefined,
        formattedDate: format(member.birthDate!, 'MM월 dd일'),
      }))
  }

  // Manual trigger for testing
  async triggerBirthdayNotifications(churchId?: string): Promise<void> {
    logger.info('Manually triggering birthday notifications', { churchId })
    
    if (churchId) {
      await this.processBirthdaysForChurch(churchId)
    } else {
      await this.processBirthdayNotifications()
    }
  }
}

export const birthdayNotificationScheduler = new BirthdayNotificationScheduler()