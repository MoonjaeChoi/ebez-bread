// Main notification system entry point - DISABLED for Redis issues
// export { notificationService } from './service'
// export { notificationQueue } from './queue'
// export { bullNotificationQueue } from './bullQueue'
// export { emailService } from './channels/email'
// export { smsService } from './channels/sms'
// export { defaultTemplates, renderTemplate } from './templates'
// export { notificationConfig } from './config'
// export { notificationCronJobs } from './cron'
// export { initializeNotificationSystem } from './init'
// export { notificationScheduler } from './scheduler'
// export { notificationSystem } from './system'
// export { memberEventHandler } from './events/memberEvents'

// Stub exports to prevent import errors
export const notificationService = null
export const notificationQueue = null
export const bullNotificationQueue = null
export const emailService = null
export const smsService = null
export const defaultTemplates = {}
export const renderTemplate = () => ({ title: '', content: '' })
export const notificationConfig = {}
export const notificationCronJobs = null
export const initializeNotificationSystem = () => {}
export const notificationScheduler = null
export const notificationSystem = null
export const memberEventHandler = null

export type {
  NotificationPayload,
  NotificationTemplate,
  NotificationTemplateData,
  BirthdayReminderData,
  VisitationReminderData,
  ExpenseApprovalData,
  QueueProcessResult,
} from './types'