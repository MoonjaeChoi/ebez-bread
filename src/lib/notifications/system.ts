// Main notification system controller - COMPLETELY DISABLED
import { logger } from '@/lib/logger'

export class NotificationSystem {
  private initialized = false

  async initialize(): Promise<void> {
    if (this.initialized) {
      return
    }
    
    logger.info('Notification system is DISABLED - skipping all initialization')
    this.initialized = true
  }

  async shutdown(): Promise<void> {
    logger.info('Notification system shutdown (DISABLED)')
  }

  isInitialized(): boolean {
    return this.initialized
  }

  async getStats() {
    return {
      initialized: this.initialized,
      status: 'DISABLED',
      queues: {},
      services: {
        email: false,
        sms: false,
      }
    }
  }
}

// Export singleton instance
export const notificationSystem = new NotificationSystem()