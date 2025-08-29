// Main notification scheduler
import { birthdayNotificationScheduler } from './birthdayNotifications'
import { visitationReminderScheduler } from './visitationReminders'
import { expenseReminderScheduler } from './expenseReminders'
import { logger } from '@/lib/logger'

export class NotificationScheduler {
  private schedulers = [
    birthdayNotificationScheduler,
    visitationReminderScheduler,
    expenseReminderScheduler,
  ]

  async start(): Promise<void> {
    logger.info('Starting notification schedulers')
    
    try {
      await Promise.all(
        this.schedulers.map(scheduler => scheduler.start())
      )
      logger.info('All notification schedulers started successfully')
    } catch (error) {
      logger.error('Failed to start notification schedulers', error as Error)
      throw error
    }
  }

  async stop(): Promise<void> {
    logger.info('Stopping notification schedulers')
    
    try {
      await Promise.all(
        this.schedulers.map(scheduler => scheduler.stop())
      )
      logger.info('All notification schedulers stopped successfully')
    } catch (error) {
      logger.error('Failed to stop notification schedulers', error as Error)
    }
  }

  getStatus() {
    return this.schedulers.map(scheduler => ({
      name: scheduler.constructor.name,
      status: scheduler.getStatus(),
    }))
  }
}

export const notificationScheduler = new NotificationScheduler()

// Auto-start in production
if (process.env.NODE_ENV === 'production') {
  notificationScheduler.start()
}