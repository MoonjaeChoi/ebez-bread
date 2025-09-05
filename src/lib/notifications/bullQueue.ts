// BullMQ-based notification queue implementation
import { Queue, Worker, Job } from 'bullmq'
import Redis from 'ioredis'
import { notificationConfig, isQueueEnabled } from './config'
import { NotificationPayload, QueueProcessResult, NotificationTemplateData } from './types'
import { NotificationChannel, NotificationStatus, NotificationPriority } from '@prisma/client'
import { prisma } from '@/lib/db'
import { emailService } from './channels/email'
import { smsService } from './channels/sms'
import { defaultTemplates, renderTemplate } from './templates'
import { logger } from '@/lib/logger'

export class BullNotificationQueue {
  private redis: Redis
  private queues: Map<string, Queue> = new Map()
  private workers: Worker[] = []

  constructor() {
    this.redis = new Redis(notificationConfig.redis.url, {
      maxRetriesPerRequest: null, // BullMQ requires this to be null
      lazyConnect: true,
    })

    this.initializeQueues()
    this.initializeWorkers()
  }

  private initializeQueues() {
    const priorities = Object.values(NotificationPriority)
    
    priorities.forEach(priority => {
      const queue = new Queue(`notification-${priority.toLowerCase()}`, {
        connection: this.redis,
        defaultJobOptions: {
          removeOnComplete: 50, // Keep 50 completed jobs
          removeOnFail: 100, // Keep 100 failed jobs
          attempts: notificationConfig.queue.maxRetries,
          backoff: {
            type: 'exponential',
            delay: notificationConfig.queue.retryDelayMs,
          },
        },
      })

      this.queues.set(priority, queue)
    })

    logger.info('BullMQ notification queues initialized', {
      action: 'bullmq_init',
      metadata: {
        queueCount: this.queues.size,
        priorities,
      }
    })
  }

  private initializeWorkers() {
    // Skip initializing workers if notifications are disabled
    if (!isQueueEnabled()) {
      logger.info('Notification queue is disabled, skipping worker initialization')
      return
    }

    const priorities = Object.values(NotificationPriority)
    
    priorities.forEach(priority => {
      const concurrency = this.getConcurrency(priority)
      
      const worker = new Worker(
        `notification-${priority.toLowerCase()}`,
        async (job: Job<NotificationPayload>) => {
          return await this.processNotification(job.data, job.id!)
        },
        {
          connection: this.redis,
          concurrency,
          limiter: {
            max: this.getRateLimit(priority),
            duration: 60 * 1000, // Per minute
          },
        }
      )

      worker.on('completed', (job) => {
        logger.debug('Notification job completed', {
          action: 'notification_job_completed',
          metadata: {
            jobId: job.id,
            priority,
            type: job.data.type,
            channel: job.data.channel,
          }
        })
      })

      worker.on('failed', (job, err) => {
        logger.error('Notification job failed', err, {
          action: 'notification_job_failed',
          metadata: {
            jobId: job?.id,
            priority,
            type: job?.data?.type,
            channel: job?.data?.channel,
          }
        })
      })

      worker.on('error', (err) => {
        logger.error('Notification worker error', err, {
          action: 'notification_worker_error',
          metadata: { priority }
        })
      })

      this.workers.push(worker)
    })

    logger.info('BullMQ notification workers initialized', {
      action: 'workers_initialized',
      metadata: {
        workerCount: this.workers.length,
      }
    })
  }

  private getConcurrency(priority: NotificationPriority): number {
    switch (priority) {
      case NotificationPriority.URGENT:
        return 10
      case NotificationPriority.HIGH:
        return 8
      case NotificationPriority.NORMAL:
        return 5
      case NotificationPriority.LOW:
        return 3
      default:
        return 5
    }
  }

  private getRateLimit(priority: NotificationPriority): number {
    switch (priority) {
      case NotificationPriority.URGENT:
        return 100 // 100 per minute
      case NotificationPriority.HIGH:
        return 60 // 60 per minute
      case NotificationPriority.NORMAL:
        return 30 // 30 per minute
      case NotificationPriority.LOW:
        return 15 // 15 per minute
      default:
        return 30
    }
  }

  async enqueue(payload: NotificationPayload): Promise<string> {
    try {
      // Skip queueing if notifications are disabled
      if (!isQueueEnabled()) {
        logger.info('Notification queue is disabled, skipping:', { type: payload.type })
        return 'disabled'
      }

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

      // Add to appropriate BullMQ queue
      const priority = payload.priority || NotificationPriority.NORMAL
      const queue = this.queues.get(priority)
      
      if (!queue) {
        throw new Error(`Queue for priority ${priority} not found`)
      }

      const jobOptions: any = {}

      // Handle scheduled notifications
      if (payload.scheduledAt) {
        jobOptions.delay = Math.max(0, payload.scheduledAt.getTime() - Date.now())
      }

      // Set job priority (higher number = higher priority)
      jobOptions.priority = this.getJobPriority(priority)

      const job = await queue.add('process-notification', payload, {
        ...jobOptions,
        jobId: notification.id, // Use database ID as job ID
      })

      logger.info('Notification enqueued to BullMQ', {
        action: 'notification_enqueued',
        metadata: {
          notificationId: notification.id,
          jobId: job.id,
          priority,
          type: payload.type,
          channel: payload.channel,
          scheduledAt: payload.scheduledAt,
        }
      })

      return notification.id
    } catch (error) {
      logger.error('Failed to enqueue notification to BullMQ', error as Error, {
        action: 'notification_enqueue_failed',
        metadata: {
          type: payload.type,
          channel: payload.channel,
          recipientId: payload.recipientId,
        }
      })
      throw error
    }
  }

  private getJobPriority(priority: NotificationPriority): number {
    switch (priority) {
      case NotificationPriority.URGENT:
        return 100
      case NotificationPriority.HIGH:
        return 75
      case NotificationPriority.NORMAL:
        return 50
      case NotificationPriority.LOW:
        return 25
      default:
        return 50
    }
  }

  private async processNotification(payload: NotificationPayload, jobId: string): Promise<QueueProcessResult> {
    try {
      logger.debug('Processing notification', {
        action: 'processing_notification',
        metadata: {
          jobId,
          type: payload.type,
          channel: payload.channel,
          recipientId: payload.recipientId,
        }
      })

      // Update status to sending
      await prisma.notificationQueue.update({
        where: { id: jobId },
        data: { status: NotificationStatus.SENDING },
      })

      // Get template data with required defaults
      const templateData: NotificationTemplateData = {
        recipientName: (payload.templateData?.recipientName as string) || 'Member',
        churchName: (payload.templateData?.churchName as string) || 'Church',
        ...(payload.templateData || {})
      }

      // Get or create template
      let template = defaultTemplates[payload.type]?.[payload.channel]
      
      if (!template) {
        // Try to get custom template from database
        const customTemplate = await prisma.notificationTemplate.findFirst({
          where: {
            churchId: payload.churchId,
            type: payload.type,
            channel: payload.channel,
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
          throw new Error('No template found for notification type and channel')
        }
      }

      // Render template
      const rendered = renderTemplate(template, templateData)

      // Send notification based on channel
      let result: QueueProcessResult
      
      switch (payload.channel) {
        case NotificationChannel.EMAIL:
          if (!payload.email) {
            throw new Error('No email address provided')
          }
          result = await emailService.sendEmail({
            to: payload.email,
            subject: rendered.subject || rendered.title,
            text: rendered.content,
          })
          break

        case NotificationChannel.SMS:
          if (!payload.phone) {
            throw new Error('No phone number provided')
          }
          result = await smsService.sendSMS({
            to: payload.phone,
            message: rendered.content,
          })
          break

        case NotificationChannel.PUSH:
        case NotificationChannel.IN_APP:
          // For now, these are handled separately
          // Could integrate with push notification services like Firebase
          logger.debug(`${payload.channel} notification processed`, {
            action: 'notification_processed',
            metadata: {
              title: rendered.title,
              content: rendered.content,
            }
          })
          result = { success: true }
          break

        default:
          throw new Error(`Unsupported notification channel: ${payload.channel}`)
      }

      if (result.success) {
        await this.markNotificationSent(jobId)
        logger.debug('Notification sent successfully', {
          action: 'notification_sent',
          metadata: {
            jobId,
            type: payload.type,
            channel: payload.channel,
          }
        })
      } else {
        throw new Error(result.error || 'Unknown error')
      }

      return result
    } catch (error) {
      logger.error('Failed to process notification', error as Error, {
        action: 'notification_process_failed',
        metadata: {
          jobId,
          type: payload.type,
          channel: payload.channel,
        }
      })
      
      await this.markNotificationFailed(jobId, error instanceof Error ? error.message : 'Unknown error')
      throw error
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
    } catch (error) {
      logger.error('Failed to mark notification as sent', error as Error, {
        action: 'mark_notification_sent_failed',
        metadata: { notificationId: id }
      })
    }
  }

  private async markNotificationFailed(id: string, error: string): Promise<void> {
    try {
      const notification = await prisma.notificationQueue.update({
        where: { id },
        data: {
          status: NotificationStatus.FAILED,
          failedAt: new Date(),
          errorMessage: error,
        },
      })

      // Create failure history record
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
          status: NotificationStatus.FAILED,
          errorMessage: error,
          relatedId: notification.relatedId,
          relatedType: notification.relatedType,
          churchId: notification.churchId,
        },
      })
    } catch (err) {
      logger.error('Failed to mark notification as failed', err as Error, {
        action: 'mark_notification_failed_failed',
        metadata: { notificationId: id }
      })
    }
  }

  async getQueueStats(): Promise<{
    pending: number
    sending: number
    failed: number
    queueSizes: Record<string, number>
    workers: Array<{
      name: string
      running: boolean
      processed: number
      failed: number
    }>
  }> {
    try {
      const [pending, sending, failed] = await Promise.all([
        prisma.notificationQueue.count({ where: { status: NotificationStatus.PENDING } }),
        prisma.notificationQueue.count({ where: { status: NotificationStatus.SENDING } }),
        prisma.notificationQueue.count({ where: { status: NotificationStatus.FAILED } }),
      ])

      const queueSizes: Record<string, number> = {}
      const workerStats: Array<{
        name: string
        running: boolean
        processed: number
        failed: number
      }> = []

      // Get queue sizes
      for (const [priority, queue] of this.queues.entries()) {
        const waiting = await queue.getWaiting()
        const active = await queue.getActive()
        queueSizes[priority] = waiting.length + active.length
      }

      // Get worker statistics
      for (const worker of this.workers) {
        workerStats.push({
          name: worker.name,
          running: !worker.closing,
          processed: 0, // Worker stats not easily accessible in BullMQ
          failed: 0,
        })
      }

      return { 
        pending, 
        sending, 
        failed, 
        queueSizes,
        workers: workerStats,
      }
    } catch (error) {
      logger.error('Failed to get BullMQ queue stats', error as Error, {
        action: 'get_queue_stats_failed'
      })
      return { 
        pending: 0, 
        sending: 0, 
        failed: 0, 
        queueSizes: {},
        workers: [],
      }
    }
  }

  async pause(): Promise<void> {
    logger.info('Pausing BullMQ notification queues')
    await Promise.all(Array.from(this.queues.values()).map(queue => queue.pause()))
  }

  async resume(): Promise<void> {
    logger.info('Resuming BullMQ notification queues')
    await Promise.all(Array.from(this.queues.values()).map(queue => queue.resume()))
  }

  async cleanup(): Promise<void> {
    logger.info('Cleaning up BullMQ notification system')
    
    // Close workers
    await Promise.all(this.workers.map(worker => worker.close()))
    
    // Close queues
    await Promise.all(Array.from(this.queues.values()).map(queue => queue.close()))
    
    // Close Redis connection
    await this.redis.quit()
    
    logger.info('BullMQ notification system cleanup complete')
  }

  // Get queue dashboard data for @bull-board integration
  getQueues() {
    return Array.from(this.queues.values())
  }
}

// DISABLED - export const bullNotificationQueue = new BullNotificationQueue()
export const bullNotificationQueue = null as any // Stub to prevent import errors