import nodemailer from 'nodemailer'
import { notificationConfig, isEmailEnabled } from '../config'
import { QueueProcessResult } from '../types'

class EmailService {
  private transporter: nodemailer.Transporter | null = null

  constructor() {
    this.initializeTransporter()
  }

  private initializeTransporter() {
    if (!isEmailEnabled()) {
      console.warn('Email service is not properly configured')
      return
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: notificationConfig.email.host,
        port: notificationConfig.email.port,
        secure: notificationConfig.email.port === 465, // true for 465, false for other ports
        auth: {
          user: notificationConfig.email.user,
          pass: notificationConfig.email.password,
        },
        tls: {
          rejectUnauthorized: false, // Allow self-signed certificates
        },
      })

      console.log('Email transporter initialized successfully')
    } catch (error) {
      console.error('Failed to initialize email transporter:', error)
    }
  }

  async sendEmail(options: {
    to: string
    subject: string
    text: string
    html?: string
  }): Promise<QueueProcessResult> {
    if (!this.transporter) {
      return {
        success: false,
        error: 'Email service is not configured',
      }
    }

    try {
      const mailOptions = {
        from: notificationConfig.email.from,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html || this.convertTextToHtml(options.text),
      }

      const result = await this.transporter.sendMail(mailOptions)
      
      console.log('Email sent successfully:', {
        messageId: result.messageId,
        to: options.to,
        subject: options.subject,
      })

      return {
        success: true,
      }
    } catch (error: any) {
      console.error('Failed to send email:', error)

      // Check for temporary failures that should be retried
      const retryableErrors = [
        'ECONNRESET',
        'ENOTFOUND', 
        'ETIMEDOUT',
        'ECONNREFUSED',
        'NETWORK_ERROR',
      ]

      const shouldRetry = retryableErrors.some(errCode => 
        error.code === errCode || 
        error.message?.includes(errCode)
      )

      return {
        success: false,
        error: error.message || 'Unknown email error',
        retryAfter: shouldRetry ? notificationConfig.queue.retryDelayMs : undefined,
      }
    }
  }

  private convertTextToHtml(text: string): string {
    return text
      .split('\n')
      .map(line => line.trim() === '' ? '<br>' : `<p>${line}</p>`)
      .join('')
  }

  async verifyConnection(): Promise<boolean> {
    if (!this.transporter) {
      return false
    }

    try {
      await this.transporter.verify()
      return true
    } catch (error) {
      console.error('Email connection verification failed:', error)
      return false
    }
  }
}

export const emailService = new EmailService()