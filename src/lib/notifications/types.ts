import { 
  NotificationType, 
  NotificationChannel, 
  NotificationPriority, 
  RecipientType,
  NotificationStatus 
} from '@prisma/client'

export interface NotificationPayload {
  type: NotificationType
  channel: NotificationChannel
  priority?: NotificationPriority
  recipientId: string
  recipientType?: RecipientType
  email?: string
  phone?: string
  title: string
  message: string
  templateData?: Record<string, any>
  scheduledAt?: Date
  relatedId?: string
  relatedType?: string
  churchId: string
}

export interface NotificationTemplate {
  subject?: string
  title: string
  content: string
  variables?: string[]
}

export interface EmailConfig {
  host: string
  port: number
  user: string
  password: string
  from: string
}

export interface SMSConfig {
  accountSid: string
  authToken: string
  phoneNumber: string
}

export interface NotificationConfig {
  email: EmailConfig
  sms: SMSConfig
  redis: {
    url: string
  }
  queue: {
    retryDelayMs: number
    maxRetries: number
    batchSize: number
  }
}

export interface QueueProcessResult {
  success: boolean
  error?: string
  retryAfter?: number
}

export interface NotificationTemplateData {
  // 공통 변수
  recipientName: string
  churchName: string
  
  // 생일 알림 변수
  memberName?: string
  birthDate?: string
  age?: number
  daysAhead?: number
  
  // 심방 알림 변수
  visitDate?: string
  visitTime?: string
  visitPurpose?: string
  memberAddress?: string
  
  // 지출결의서 변수
  expenseTitle?: string
  expenseAmount?: string
  expenseCategory?: string
  approverName?: string
  rejectionReason?: string
  pendingCount?: number
  totalAmount?: string
  oldestDays?: number
  expenseList?: string
  overdueCount?: number
  requesterName?: string
  
  // 시스템 변수
  announcementTitle?: string
  announcementContent?: string
}

export interface BirthdayReminderData {
  memberId: string
  memberName: string
  birthDate: Date
  age: number
  phone?: string
  email?: string
}

export interface VisitationReminderData {
  visitationId: string
  memberId: string
  memberName: string
  visitDate: Date
  purpose?: string
  address?: string
  phone?: string
}

export interface ExpenseApprovalData {
  expenseReportId: string
  title: string
  amount: number
  category: string
  requesterId: string
  requesterName: string
  requesterEmail?: string
}