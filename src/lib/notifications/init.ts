// Initialize notification system
import { notificationQueue } from './queue'
import { notificationCronJobs } from './cron'

export function initializeNotificationSystem() {
  console.log('Initializing notification system...')
  
  // Start cron jobs in production
  if (process.env.NODE_ENV === 'production') {
    notificationCronJobs.start()
    console.log('Notification cron jobs started')
  } else {
    console.log('Notification cron jobs disabled in development mode')
  }

  // Process any pending notifications immediately
  setTimeout(() => {
    notificationQueue.processQueue().catch(error => {
      console.error('Failed to process initial notification queue:', error)
    })
  }, 2000)

  console.log('Notification system initialized')
}

// Initialize on import in production
if (process.env.NODE_ENV === 'production') {
  initializeNotificationSystem()
}