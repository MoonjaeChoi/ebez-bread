import { Twilio } from 'twilio'
import { notificationConfig, isSMSEnabled } from '../config'
import { QueueProcessResult } from '../types'

class SMSService {
  private client: Twilio | null = null
  private fromNumber: string

  constructor() {
    this.fromNumber = notificationConfig.sms.phoneNumber
    this.initializeClient()
  }

  private initializeClient() {
    if (!isSMSEnabled()) {
      console.warn('SMS service is not properly configured')
      return
    }

    try {
      this.client = new Twilio(
        notificationConfig.sms.accountSid,
        notificationConfig.sms.authToken
      )
      console.log('SMS client initialized successfully')
    } catch (error) {
      console.error('Failed to initialize SMS client:', error)
    }
  }

  async sendSMS(options: {
    to: string
    message: string
  }): Promise<QueueProcessResult> {
    if (!this.client) {
      return {
        success: false,
        error: 'SMS service is not configured',
      }
    }

    try {
      // Format phone number for international format
      const formattedNumber = this.formatPhoneNumber(options.to)
      
      if (!formattedNumber) {
        return {
          success: false,
          error: 'Invalid phone number format',
        }
      }

      const message = await this.client.messages.create({
        body: options.message,
        from: this.fromNumber,
        to: formattedNumber,
      })

      console.log('SMS sent successfully:', {
        sid: message.sid,
        to: formattedNumber,
        status: message.status,
      })

      return {
        success: true,
      }
    } catch (error: any) {
      console.error('Failed to send SMS:', error)

      // Check for temporary failures that should be retried
      const retryableErrors = [
        '20429', // Too Many Requests
        '30001', // Queue overflow
        '30007', // Message blocked by carrier
        '21610', // Attempt to send to unsubscribed recipient
      ]

      const shouldRetry = retryableErrors.includes(error.code) ||
        error.message?.includes('rate limit') ||
        error.message?.includes('temporarily unavailable')

      return {
        success: false,
        error: error.message || `SMS error (code: ${error.code})`,
        retryAfter: shouldRetry ? notificationConfig.queue.retryDelayMs : undefined,
      }
    }
  }

  private formatPhoneNumber(phone: string): string | null {
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '')
    
    // Handle Korean phone numbers
    if (cleaned.length === 10 && cleaned.startsWith('01')) {
      // 01x-xxxx-xxxx format
      return `+82${cleaned.substring(1)}`
    } else if (cleaned.length === 11 && cleaned.startsWith('010')) {
      // 010-xxxx-xxxx format  
      return `+82${cleaned.substring(1)}`
    } else if (cleaned.startsWith('82')) {
      // Already has country code
      return `+${cleaned}`
    } else if (cleaned.startsWith('+82')) {
      // Already formatted
      return cleaned
    }
    
    // For international numbers, assume they're already formatted
    if (cleaned.length > 11) {
      return `+${cleaned}`
    }
    
    return null
  }

  async verifyConnection(): Promise<boolean> {
    if (!this.client) {
      return false
    }

    try {
      // Try to fetch account info to verify connection
      await this.client.api.accounts(notificationConfig.sms.accountSid).fetch()
      return true
    } catch (error) {
      console.error('SMS connection verification failed:', error)
      return false
    }
  }

  isValidPhoneNumber(phone: string): boolean {
    return this.formatPhoneNumber(phone) !== null
  }
}

export const smsService = new SMSService()