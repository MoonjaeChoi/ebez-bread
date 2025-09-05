import { NotificationConfig } from './types'
import { getEnvVar } from '@/lib/env'

export const notificationConfig: NotificationConfig = {
  email: {
    host: getEnvVar('SMTP_HOST', 'smtp.gmail.com'),
    port: parseInt(getEnvVar('SMTP_PORT', '587')),
    user: getEnvVar('SMTP_USER', ''),
    password: getEnvVar('SMTP_PASSWORD', ''),
    from: getEnvVar('SMTP_FROM', '과천 교회 <noreply@ebenezer.kr>'),
  },
  sms: {
    accountSid: getEnvVar('TWILIO_ACCOUNT_SID', ''),
    authToken: getEnvVar('TWILIO_AUTH_TOKEN', ''),
    phoneNumber: getEnvVar('TWILIO_PHONE_NUMBER', ''),
  },
  redis: {
    url: getEnvVar('NOTIFICATION_QUEUE_REDIS_URL', 'redis://localhost:6379/1'),
  },
  queue: {
    enabled: getEnvVar('NOTIFICATION_QUEUE_ENABLED', 'true') === 'true',
    retryDelayMs: parseInt(getEnvVar('NOTIFICATION_RETRY_DELAY_MS', '60000')),
    maxRetries: parseInt(getEnvVar('NOTIFICATION_MAX_RETRIES', '3')),
    batchSize: parseInt(getEnvVar('NOTIFICATION_BATCH_SIZE', '50')),
  },
}

export const isEmailEnabled = (): boolean => {
  return !!(notificationConfig.email.user && notificationConfig.email.password)
}

export const isSMSEnabled = (): boolean => {
  return !!(notificationConfig.sms.accountSid && notificationConfig.sms.authToken)
}

export const isQueueEnabled = (): boolean => {
  return notificationConfig.queue.enabled
}