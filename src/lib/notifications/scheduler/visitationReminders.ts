// Visitation reminder scheduler
import { CronJob } from 'cron'
import { notificationService } from '../service'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { addHours, addDays, format, isBefore, isAfter } from 'date-fns'

class VisitationReminderScheduler {
  private jobs: CronJob[] = []

  constructor() {
    this.initializeJobs()
  }

  private initializeJobs() {
    // Morning reminders (8 AM)
    const morningJob = new CronJob(
      '0 8 * * *', // 8 AM every day
      async () => {
        logger.info('Running morning visitation reminder scheduler')
        await this.processVisitationReminders('morning')
      },
      null,
      false,
      'Asia/Seoul'
    )

    // Evening reminders (6 PM)
    const eveningJob = new CronJob(
      '0 18 * * *', // 6 PM every day
      async () => {
        logger.info('Running evening visitation reminder scheduler')
        await this.processVisitationReminders('evening')
      },
      null,
      false,
      'Asia/Seoul'
    )

    // Hourly check for urgent reminders
    const hourlyJob = new CronJob(
      '0 * * * *', // Every hour
      async () => {
        logger.debug('Running hourly visitation reminder check')
        await this.processUrgentVisitationReminders()
      },
      null,
      false,
      'Asia/Seoul'
    )

    this.jobs = [morningJob, eveningJob, hourlyJob]
  }

  async start(): Promise<void> {
    this.jobs.forEach(job => job.start())
    logger.info('Visitation reminder scheduler started')
  }

  async stop(): Promise<void> {
    this.jobs.forEach(job => job.stop())
    logger.info('Visitation reminder scheduler stopped')
  }

  getStatus() {
    return this.jobs.map((job, index) => ({
      running: (job as any).running || false,
      nextDate: new Date(job.nextDate().toString()),
      lastDate: job.lastDate() ? new Date(job.lastDate()!.toString()) : null,
      pattern: job.cronTime.source,
      type: ['morning', 'evening', 'hourly'][index],
    }))
  }

  async processVisitationReminders(type: 'morning' | 'evening'): Promise<void> {
    try {
      const churches = await prisma.church.findMany({
        select: { id: true, name: true },
      })

      const results = await Promise.allSettled(
        churches.map(async (church) => {
          try {
            await this.processVisitationsForChurch(church.id, type)
            logger.debug('Visitation reminders processed', {
              churchId: church.id,
              action: 'visitation_reminders_processed',
              metadata: {
                churchName: church.name,
                type,
              }
            })
          } catch (error) {
            logger.error('Failed to process visitation reminders for church', error as Error, {
              churchId: church.id,
              action: 'visitation_reminders_failed',
              metadata: {
                churchName: church.name,
                type,
              }
            })
            throw error
          }
        })
      )

      const failed = results.filter(result => result.status === 'rejected').length
      const succeeded = results.filter(result => result.status === 'fulfilled').length

      logger.info('Visitation reminder batch completed', {
        action: 'visitation_batch_completed',
        metadata: {
          type,
          totalChurches: churches.length,
          succeeded,
          failed,
        }
      })
    } catch (error) {
      logger.error('Failed to process visitation reminders', error as Error, {
        action: 'visitation_batch_failed',
        metadata: { type }
      })
      throw error
    }
  }

  private async processVisitationsForChurch(
    churchId: string, 
    type: 'morning' | 'evening'
  ): Promise<void> {
    // Get users who want visitation reminders
    const usersWithVisitationReminders = await prisma.user.findMany({
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

    if (usersWithVisitationReminders.length === 0) {
      return
    }

    // Get upcoming visitations based on time of day
    const now = new Date()
    const startTime = type === 'morning' 
      ? addHours(now, 2) // 2 hours from now (10 AM onwards)
      : addHours(now, 12) // 12 hours from now (next morning)
    
    const endTime = type === 'morning'
      ? addHours(now, 14) // Until 10 PM today
      : addDays(now, 2) // Until tomorrow evening

    const upcomingVisitations = await prisma.visitation.findMany({
      where: {
        member: { churchId },
        needsFollowUp: true,
        followUpDate: {
          gte: startTime,
          lte: endTime,
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

    if (upcomingVisitations.length === 0) {
      return
    }

    // Group visitations by reminder time preference
    const visitationsByReminderTime = new Map<number, typeof upcomingVisitations>()
    
    for (const visitation of upcomingVisitations) {
      if (!visitation.followUpDate) continue
      
      const hoursUntilVisit = Math.round(
        (visitation.followUpDate.getTime() - now.getTime()) / (1000 * 60 * 60)
      )
      
      // Group by common reminder periods: 1h, 2h, 4h, 8h, 12h, 24h
      const reminderPeriods = [1, 2, 4, 8, 12, 24]
      const closestPeriod = reminderPeriods.reduce((prev, curr) => 
        Math.abs(curr - hoursUntilVisit) < Math.abs(prev - hoursUntilVisit) ? curr : prev
      )
      
      if (Math.abs(closestPeriod - hoursUntilVisit) <= 1) { // Within 1 hour tolerance
        if (!visitationsByReminderTime.has(closestPeriod)) {
          visitationsByReminderTime.set(closestPeriod, [])
        }
        visitationsByReminderTime.get(closestPeriod)!.push(visitation)
      }
    }

    // Send reminders to users based on their preferences
    for (const user of usersWithVisitationReminders) {
      const preferredReminderHours = user.notificationSettings?.visitationReminderHours || 24
      const visitations = visitationsByReminderTime.get(preferredReminderHours) || []
      
      for (const visitation of visitations) {
        try {
          await notificationService.sendVisitationReminderNotification(user, {
            visitationId: visitation.id,
            memberId: visitation.member.id,
            memberName: visitation.member.name,
            visitDate: visitation.followUpDate!,
            purpose: visitation.purpose || undefined,
            address: visitation.member.address || undefined,
            phone: visitation.member.phone || undefined,
          })
          
          logger.debug('Visitation reminder sent', {
            userId: user.id,
            action: 'visitation_reminder_sent',
            metadata: {
              visitationId: visitation.id,
              memberName: visitation.member.name,
              hoursAhead: preferredReminderHours,
            }
          })
        } catch (error) {
          logger.error('Failed to send visitation reminder', error as Error, {
            userId: user.id,
            action: 'visitation_reminder_failed',
            metadata: {
              visitationId: visitation.id,
              memberName: visitation.member.name,
            }
          })
        }
      }
    }
  }

  async processUrgentVisitationReminders(): Promise<void> {
    try {
      const churches = await prisma.church.findMany({
        select: { id: true, name: true },
      })

      for (const church of churches) {
        await this.processUrgentVisitationsForChurch(church.id)
      }
    } catch (error) {
      logger.error('Failed to process urgent visitation reminders', error as Error)
    }
  }

  private async processUrgentVisitationsForChurch(churchId: string): Promise<void> {
    const now = new Date()
    const oneHourFromNow = addHours(now, 1)
    const twoHoursFromNow = addHours(now, 2)

    // Find visitations happening within the next 2 hours
    const urgentVisitations = await prisma.visitation.findMany({
      where: {
        member: { churchId },
        needsFollowUp: true,
        followUpDate: {
          gte: now,
          lte: twoHoursFromNow,
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

    if (urgentVisitations.length === 0) {
      return
    }

    // Get users who want urgent reminders
    const users = await prisma.user.findMany({
      where: {
        churchId,
        isActive: true,
        notificationSettings: {
          visitationReminders: true,
          visitationReminderHours: {
            lte: 2, // Users who want reminders 2 hours or less in advance
          },
        },
      },
      include: {
        notificationSettings: true,
      },
    })

    for (const user of users) {
      for (const visitation of urgentVisitations) {
        if (!visitation.followUpDate) continue
        
        const hoursUntilVisit = (visitation.followUpDate.getTime() - now.getTime()) / (1000 * 60 * 60)
        const userPreference = user.notificationSettings?.visitationReminderHours || 24
        
        // Send if this matches the user's preference (within 30 minutes tolerance)
        if (Math.abs(hoursUntilVisit - userPreference) <= 0.5) {
          try {
            await notificationService.sendVisitationReminderNotification(user, {
              visitationId: visitation.id,
              memberId: visitation.member.id,
              memberName: visitation.member.name,
              visitDate: visitation.followUpDate,
              purpose: visitation.purpose || undefined,
              address: visitation.member.address || undefined,
              phone: visitation.member.phone || undefined,
            })
          } catch (error) {
            logger.error('Failed to send urgent visitation reminder', error as Error, {
              userId: user.id,
              action: 'urgent_visitation_reminder_failed',
              metadata: {
                visitationId: visitation.id,
              }
            })
          }
        }
      }
    }
  }

  // Manual trigger for testing
  async triggerVisitationReminders(churchId?: string): Promise<void> {
    logger.info('Manually triggering visitation reminders', { churchId })
    
    if (churchId) {
      await this.processVisitationsForChurch(churchId, 'morning')
      await this.processUrgentVisitationsForChurch(churchId)
    } else {
      await this.processVisitationReminders('morning')
      await this.processUrgentVisitationReminders()
    }
  }
}

export const visitationReminderScheduler = new VisitationReminderScheduler()