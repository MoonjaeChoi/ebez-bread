import Redis from 'ioredis'
import { notificationConfig } from './config'
import { NotificationPayload, QueueProcessResult } from './types'
import { NotificationChannel, NotificationStatus, NotificationPriority } from '@prisma/client'
import { prisma } from '@/lib/db'
import { emailService } from './channels/email'
import { smsService } from './channels/sms'
import { defaultTemplates, renderTemplate } from './templates'

class NotificationQueue {
  private redis: Redis | null = null
  private isProcessing = false
  private processingInterval: NodeJS.Timeout | null = null

  constructor() {
    this.initializeRedis()
    this.startProcessing()
  }

  private initializeRedis() {
    try {
      this.redis = new Redis(notificationConfig.redis.url, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      })

      this.redis.on('connect', () => {
        console.log('Notification queue Redis connected')
      })

      this.redis.on('error', (error) => {
        console.error('Notification queue Redis error:', error)
      })
    } catch (error) {
      console.error('Failed to initialize notification queue Redis:', error)
    }
  }

  async enqueue(payload: NotificationPayload): Promise<string> {
    try {
      // Create notification in database
      const notification = await prisma.notificationQueue.create({
        data: {
          type: payload.type,
          channel: payload.channel,
          priority: payload.priority || NotificationPriority.NORMAL,
          recipientId: payload.recipientId,
          recipientType: payload.recipientType || 'USER',
          email: payload.email,
          phone: payload.phone,
          title: payload.title,
          message: payload.message,
          templateData: payload.templateData ? JSON.stringify(payload.templateData) : null,
          scheduledAt: payload.scheduledAt,
          relatedId: payload.relatedId,
          relatedType: payload.relatedType,
          churchId: payload.churchId,
          status: NotificationStatus.PENDING,
        },
      })

      // Add to Redis queue for processing
      if (this.redis) {
        const queueKey = this.getQueueKey(payload.priority || NotificationPriority.NORMAL)
        await this.redis.lpush(queueKey, notification.id)
      }

      console.log('Notification enqueued:', {
        id: notification.id,
        type: payload.type,
        channel: payload.channel,
        recipientId: payload.recipientId,
      })

      return notification.id
    } catch (error) {
      console.error('Failed to enqueue notification:', error)
      throw error
    }
  }

  private getQueueKey(priority: NotificationPriority): string {
    return `notification_queue:${priority.toLowerCase()}`
  }

  private startProcessing() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval)
    }

    // Process queue every 30 seconds
    this.processingInterval = setInterval(() => {
      if (!this.isProcessing) {
        this.processQueue().catch(error => {
          console.error('Queue processing error:', error)
        })
      }
    }, 30000)

    // Process immediately on start
    setTimeout(() => {
      this.processQueue().catch(error => {
        console.error('Initial queue processing error:', error)
      })
    }, 5000)
  }

  async processQueue(): Promise<void> {
    if (this.isProcessing || !this.redis) {
      return
    }

    this.isProcessing = true

    try {
      // Process in priority order: URGENT -> HIGH -> NORMAL -> LOW
      const priorities = [
        NotificationPriority.URGENT,
        NotificationPriority.HIGH,
        NotificationPriority.NORMAL,
        NotificationPriority.LOW,
      ]

      for (const priority of priorities) {
        await this.processQueueByPriority(priority)
      }
    } finally {
      this.isProcessing = false
    }
  }

  private async processQueueByPriority(priority: NotificationPriority): Promise<void> {
    const queueKey = this.getQueueKey(priority)
    const batchSize = notificationConfig.queue.batchSize

    try {
      // Get batch of notifications to process
      const notificationIds = await this.redis!.rpop(queueKey, batchSize)
      
      if (!notificationIds || notificationIds.length === 0) {
        return
      }

      console.log(`Processing ${notificationIds.length} notifications with priority ${priority}`)

      // Process notifications concurrently
      const processingPromises = notificationIds.map(id => 
        this.processNotification(id)
      )

      await Promise.allSettled(processingPromises)
    } catch (error) {
      console.error(`Failed to process ${priority} priority queue:`, error)
    }
  }

  private async processNotification(id: string): Promise<void> {
    try {
      // Get notification from database
      const notification = await prisma.notificationQueue.findUnique({
        where: { id },
      })

      if (!notification) {
        console.error(`Notification ${id} not found`)
        return
      }

      // Skip if not pending or not yet scheduled
      if (notification.status !== NotificationStatus.PENDING) {
        return
      }

      if (notification.scheduledAt && notification.scheduledAt > new Date()) {
        // Re-queue for later processing
        await this.redis!.lpush(
          this.getQueueKey(notification.priority),
          notification.id
        )
        return
      }

      // Update status to sending
      await prisma.notificationQueue.update({
        where: { id },
        data: { status: NotificationStatus.SENDING },
      })

      // Process the notification
      const result = await this.sendNotification(notification)

      // Update notification status based on result
      if (result.success) {
        await this.markNotificationSent(notification.id)
      } else {
        await this.handleNotificationFailure(notification, result.error || 'Unknown error')
      }
    } catch (error) {
      console.error(`Failed to process notification ${id}:`, error)
      await this.handleNotificationFailure(
        { id } as any,
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
  }

  private async sendNotification(notification: any): Promise<QueueProcessResult> {
    try {
      // Get template data
      const templateData = notification.templateData 
        ? JSON.parse(notification.templateData) 
        : {}

      // Get or create template
      let template = (defaultTemplates as any)[notification.type]?.[notification.channel]
      
      if (!template) {
        // Try to get custom template from database
        const customTemplate = await prisma.notificationTemplate.findFirst({
          where: {
            churchId: notification.churchId,
            type: notification.type,
            channel: notification.channel,
            isActive: true,
          },
          orderBy: { isDefault: 'desc' },
        })

        if (customTemplate) {
          template = {
            subject: customTemplate.subject || undefined,
            title: customTemplate.title,
            content: customTemplate.content,
          }
        } else {
          return {
            success: false,
            error: 'No template found for notification type and channel',
          }
        }
      }

      // Render template
      const rendered = renderTemplate(template, {
        recipientName: templateData.recipientName || '사용자',
        churchName: templateData.churchName || '교회',
        ...templateData,
      })

      // Send notification based on channel
      switch (notification.channel) {
        case NotificationChannel.EMAIL:
          if (!notification.email) {
            return { success: false, error: 'No email address provided' }
          }
          return await emailService.sendEmail({
            to: notification.email,
            subject: rendered.subject || rendered.title,
            text: rendered.content,
          })

        case NotificationChannel.SMS:
          if (!notification.phone) {
            return { success: false, error: 'No phone number provided' }
          }
          return await smsService.sendSMS({
            to: notification.phone,
            message: rendered.content,
          })

        case NotificationChannel.PUSH:
        case NotificationChannel.IN_APP:
          // For now, these are handled separately
          // Could integrate with push notification services like Firebase
          console.log(`${notification.channel} notification:`, {
            title: rendered.title,
            content: rendered.content,
          })
          return { success: true }

        default:
          return {
            success: false,
            error: `Unsupported notification channel: ${notification.channel}`,
          }
      }
    } catch (error) {
      console.error('Failed to send notification:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  private async markNotificationSent(id: string): Promise<void> {
    try {
      const notification = await prisma.notificationQueue.update({
        where: { id },
        data: {
          status: NotificationStatus.SENT,
          sentAt: new Date(),
        },
      })

      // Create history record
      await prisma.notificationHistory.create({
        data: {
          queueId: notification.id,
          type: notification.type,
          channel: notification.channel,
          recipientId: notification.recipientId,
          recipientType: notification.recipientType,
          email: notification.email,
          phone: notification.phone,
          title: notification.title,
          message: notification.message,
          status: NotificationStatus.SENT,
          sentAt: new Date(),
          relatedId: notification.relatedId,
          relatedType: notification.relatedType,
          churchId: notification.churchId,
        },
      })

      console.log(`Notification ${id} sent successfully`)
    } catch (error) {
      console.error(`Failed to mark notification ${id} as sent:`, error)
    }
  }

  private async handleNotificationFailure(
    notification: { id: string; retryCount?: number },
    error: string
  ): Promise<void> {
    try {
      const maxRetries = notificationConfig.queue.maxRetries
      const currentRetries = notification.retryCount || 0

      if (currentRetries < maxRetries) {
        // Retry the notification
        await prisma.notificationQueue.update({
          where: { id: notification.id },
          data: {
            status: NotificationStatus.PENDING,
            retryCount: currentRetries + 1,
            errorMessage: error,
          },
        })

        // Re-queue with delay
        setTimeout(async () => {
          if (this.redis) {
            await this.redis.lpush('notification_queue:normal', notification.id)
          }
        }, notificationConfig.queue.retryDelayMs)

        console.log(`Notification ${notification.id} queued for retry (${currentRetries + 1}/${maxRetries})`)
      } else {
        // Max retries reached, mark as failed
        const failedNotification = await prisma.notificationQueue.update({
          where: { id: notification.id },
          data: {
            status: NotificationStatus.FAILED,
            failedAt: new Date(),
            errorMessage: error,
          },
        })

        // Create failure history record
        await prisma.notificationHistory.create({
          data: {
            queueId: failedNotification.id,
            type: failedNotification.type,
            channel: failedNotification.channel,
            recipientId: failedNotification.recipientId,
            recipientType: failedNotification.recipientType,
            email: failedNotification.email,
            phone: failedNotification.phone,
            title: failedNotification.title,
            message: failedNotification.message,
            status: NotificationStatus.FAILED,
            errorMessage: error,
            relatedId: failedNotification.relatedId,
            relatedType: failedNotification.relatedType,
            churchId: failedNotification.churchId,
          },
        })

        console.error(`Notification ${notification.id} failed permanently: ${error}`)
      }
    } catch (err) {
      console.error(`Failed to handle notification failure for ${notification.id}:`, err)
    }
  }

  async getQueueStats(): Promise<{
    pending: number
    sending: number
    failed: number
    queueSizes: Record<string, number>
  }> {
    try {
      const [pending, sending, failed] = await Promise.all([
        prisma.notificationQueue.count({ where: { status: NotificationStatus.PENDING } }),
        prisma.notificationQueue.count({ where: { status: NotificationStatus.SENDING } }),
        prisma.notificationQueue.count({ where: { status: NotificationStatus.FAILED } }),
      ])

      const queueSizes: Record<string, number> = {}
      if (this.redis) {
        for (const priority of Object.values(NotificationPriority)) {
          const queueKey = this.getQueueKey(priority)
          queueSizes[priority] = await this.redis.llen(queueKey)
        }
      }

      return { pending, sending, failed, queueSizes }
    } catch (error) {
      console.error('Failed to get queue stats:', error)
      return { pending: 0, sending: 0, failed: 0, queueSizes: {} }
    }
  }

  async cleanup(): Promise<void> {
    if (this.processingInterval) {
      clearInterval(this.processingInterval)
    }
    
    if (this.redis) {
      await this.redis.quit()
    }
  }
}

export const notificationQueue = new NotificationQueue()