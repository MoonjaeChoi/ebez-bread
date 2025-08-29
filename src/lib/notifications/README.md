# Church Management Notification System

A comprehensive notification system for the Ebenezer Church Management System, supporting email, SMS, push, and in-app notifications with automatic scheduling and queue management.

## 📋 Overview

This notification system provides:
- **Multi-channel notifications**: Email, SMS, Push, In-App
- **Automatic scheduling**: Birthday reminders, visitation follow-ups, expense approvals
- **Queue management**: BullMQ or simple Redis-based processing
- **Template system**: Customizable message templates
- **Event-driven**: Integration with member events and system activities
- **Dashboard monitoring**: Real-time queue status and statistics

## 🏗️ Architecture

```
src/lib/notifications/
├── index.ts                    # Main entry point
├── system.ts                   # System controller
├── service.ts                  # Core notification service
├── queue.ts                    # Simple Redis queue
├── bullQueue.ts               # BullMQ advanced queue
├── config.ts                  # Configuration management
├── types.ts                   # TypeScript interfaces
├── templates.ts               # Default message templates
├── cron.ts                    # Legacy cron jobs
├── init.ts                    # System initialization
├── channels/
│   ├── email.ts               # Nodemailer email service
│   └── sms.ts                 # Twilio SMS service
├── scheduler/
│   ├── index.ts               # Main scheduler controller
│   ├── birthdayNotifications.ts   # Birthday reminder scheduler
│   ├── visitationReminders.ts     # Visitation follow-up scheduler
│   └── expenseReminders.ts        # Expense approval scheduler
└── events/
    └── memberEvents.ts        # Member lifecycle event handlers
```

## ⚙️ Configuration

### Environment Variables

```bash
# Email Configuration (Nodemailer)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM="Church Name <noreply@church.com>"

# SMS Configuration (Twilio)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=your-twilio-phone-number

# Queue Configuration
NOTIFICATION_QUEUE_REDIS_URL=redis://localhost:6379/1
NOTIFICATION_RETRY_DELAY_MS=60000
NOTIFICATION_MAX_RETRIES=3
NOTIFICATION_BATCH_SIZE=50

# System Configuration
USE_BULLMQ=true  # Use BullMQ instead of simple queue
```

### Database Schema

The system uses the following Prisma models:
- `NotificationQueue`: Pending notifications
- `NotificationHistory`: Sent/failed notification log
- `NotificationTemplate`: Customizable message templates
- `NotificationSetting`: User notification preferences

## 🚀 Usage

### Basic Usage

```typescript
import { notificationService } from '@/lib/notifications'

// Send a custom notification
await notificationService.sendCustomNotification({
  type: 'CUSTOM',
  channel: 'EMAIL',
  priority: 'NORMAL',
  recipientId: 'user-id',
  email: 'user@example.com',
  title: 'Welcome!',
  message: 'Welcome to our church!',
  templateData: {
    recipientName: 'John Doe',
    churchName: 'Ebenezer Church',
  },
  churchId: 'church-id',
})
```

### System Initialization

```typescript
import { notificationSystem } from '@/lib/notifications/system'

// Initialize the system
await notificationSystem.initialize()

// Get system status
const status = notificationSystem.getStatus()

// Manual triggers
await notificationSystem.triggerBirthdayNotifications('church-id')
await notificationSystem.triggerVisitationReminders('church-id')
await notificationSystem.triggerExpenseReminders('church-id', 'daily')
```

## 📧 Notification Types

### 1. Birthday Reminders
- **Trigger**: Daily at 9 AM
- **Logic**: Finds members with birthdays matching user's reminder preference (1, 3, 7, or 14 days ahead)
- **Recipients**: Users with birthday notifications enabled

### 2. Visitation Reminders
- **Trigger**: Daily at 8 AM and 6 PM, plus hourly for urgent reminders
- **Logic**: Finds upcoming visitations based on follow-up dates
- **Recipients**: Users with visitation reminder notifications enabled

### 3. Expense Approvals
- **Quick Reminders**: Every 30 minutes during business hours for urgent/high-amount expenses
- **Daily Summary**: 10 AM weekdays - summary of all pending expenses
- **Weekly Overdue**: Monday 9 AM - expenses pending more than 7 days

### 4. Member Events
- **New Member Welcome**: Automatic when member is created
- **Status Changes**: When member status changes (inactive, transferred, deceased)
- **Profile Updates**: Significant changes to member information

### 5. System Notifications
- **Custom Messages**: Manual notifications from administrators
- **System Announcements**: Important system-wide messages

## 🎯 Templates

### Default Templates

Each notification type has default templates for all channels:

```typescript
// Example: Birthday reminder email template
{
  subject: '생일을 축하드립니다! 🎉',
  title: '생일 축하 알림',
  content: `안녕하세요, {{recipientName}}님!

{{memberName}}님의 생일({{birthDate}})이 곧 다가옵니다.
{{age}}번째 생일을 맞이하시는 {{memberName}}님께 축하 인사를 전해주세요.

따뜻한 축복이 함께하기를 기도합니다.

{{churchName}} 드림`
}
```

### Custom Templates

Churches can create custom templates through the admin interface:

```typescript
// Create custom template
await trpc.notifications.createTemplate.mutate({
  name: 'Custom Birthday',
  type: 'BIRTHDAY_REMINDER',
  channel: 'EMAIL',
  subject: 'Happy Birthday!',
  title: 'Birthday Celebration',
  content: 'Custom birthday message...',
  isDefault: true,
})
```

## 🔄 Queue Management

### BullMQ (Recommended)

Features:
- Priority queues (URGENT > HIGH > NORMAL > LOW)
- Rate limiting per priority level
- Automatic retries with exponential backoff
- Dead letter queue for failed jobs
- Real-time monitoring dashboard

### Simple Redis Queue

Fallback option with basic functionality:
- FIFO processing
- Basic retry logic
- Redis-based storage

## 📊 Monitoring

### tRPC Endpoints

```typescript
// Get system status
const status = await trpc.notifications.getSystemStatus.query()

// Get queue statistics  
const stats = await trpc.notifications.getStats.query()

// Get delivery reports
const reports = await trpc.notifications.getDeliveryReports.query({
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31'),
})
```

### Queue Dashboard

Access the BullMQ dashboard at `/api/admin/queue-dashboard` (Super Admin only).

## 🎛️ User Preferences

Users can configure their notification preferences:

```typescript
// Update notification settings
await trpc.notifications.updateSettings.mutate({
  emailEnabled: true,
  smsEnabled: false,
  birthdayNotifications: true,
  visitationReminders: true,
  expenseApprovalNotifications: true,
  birthdayReminderDays: 7,        // 7 days before birthday
  visitationReminderHours: 24,    // 24 hours before visitation
})
```

## 🔧 Administrative Features

### Manual Triggers
Administrators can manually trigger schedulers:

```typescript
// Trigger birthday notifications
await trpc.notifications.triggerScheduler.mutate({
  type: 'birthday'
})

// Trigger expense reminders
await trpc.notifications.triggerScheduler.mutate({
  type: 'expense',
  subtype: 'daily'
})
```

### Failed Notification Management

```typescript
// Retry failed notifications
await trpc.notifications.retryFailedNotifications.mutate({
  olderThan: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago
})
```

### Queue Control

```typescript
// Pause queue processing
await trpc.notifications.pauseQueue.mutate()

// Resume queue processing  
await trpc.notifications.resumeQueue.mutate()
```

## 🧪 Testing

### Test Notifications

```typescript
// Test email connection
await trpc.notifications.testConnection.mutate({
  channel: 'EMAIL',
  recipient: 'test@example.com'
})

// Test SMS connection
await trpc.notifications.testConnection.mutate({
  channel: 'SMS',
  recipient: '+821012345678'
})
```

### Development Mode

In development:
- Schedulers are disabled by default
- Simple queue is used unless `USE_BULLMQ=true`
- Console logging is more verbose
- Queue dashboard is accessible without authentication

## 🚨 Error Handling

The system includes comprehensive error handling:

- **Service failures**: Automatic retries with exponential backoff
- **Template errors**: Fallback to default templates
- **Connection issues**: Queue notifications for retry when service recovers
- **Rate limiting**: Built-in rate limiting to prevent spam

## 📈 Performance Considerations

- **Batch Processing**: Processes notifications in configurable batches
- **Priority Queues**: Critical notifications processed first
- **Rate Limiting**: Prevents overwhelming email/SMS services
- **Connection Pooling**: Reuses email/SMS service connections
- **Cleanup**: Automatic cleanup of old notification records

## 🔐 Security

- **Authentication**: All admin endpoints require proper roles
- **Rate Limiting**: Built-in protection against abuse
- **Data Privacy**: Personal information handled according to privacy rules
- **Audit Trail**: Complete history of all notifications
- **Multi-tenancy**: Church data isolation

## 🔄 Migration

When upgrading:
1. Run database migrations for new schema
2. Update environment variables
3. Restart services to initialize new queues
4. Verify service connections
5. Test with sample notifications

## 📋 Troubleshooting

### Common Issues

1. **Email not sending**
   - Verify SMTP credentials
   - Check email service connection
   - Review firewall/security settings

2. **SMS failures**
   - Validate Twilio credentials
   - Check phone number format
   - Verify account balance

3. **Queue not processing**
   - Check Redis connection
   - Verify queue worker status
   - Review error logs

4. **Template errors**
   - Validate template syntax
   - Check required variables
   - Test template rendering

### Logs

All activities are logged through Winston:
- Service connections
- Queue processing
- Notification delivery
- Error conditions
- Performance metrics

Check logs for detailed troubleshooting information.