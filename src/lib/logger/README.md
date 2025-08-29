# Church Management System - Winston Logging System

A comprehensive logging system built with Winston, designed specifically for the church management system with multi-tenant support, performance monitoring, and Sentry integration.

## Features

- **Multi-Level Logging**: DEBUG, INFO, WARN, ERROR with configurable levels
- **Multi-Tenant Context**: Automatic church and user context injection
- **Performance Monitoring**: Built-in timing and performance tracking
- **Security Auditing**: Comprehensive audit logging for sensitive operations
- **Error Monitoring**: Integrated Sentry error reporting
- **Development-Friendly**: Enhanced console output with colors and formatting
- **Production-Ready**: Structured JSON logging with log rotation
- **Request Tracing**: Unique request ID correlation across services

## Quick Start

### 1. Basic Usage

```typescript
import { logger } from '@/lib/logger'

// Simple logging
logger.info('User logged in successfully')
logger.warn('Slow database query detected')
logger.error('Payment processing failed', error)

// With context
logger.info('Member created', {
  churchId: 'church-123',
  userId: 'user-456',
  action: 'member_create',
  resourceId: 'member-789'
})
```

### 2. Performance Monitoring

```typescript
import { performanceMonitor } from '@/lib/monitoring/performance'

// Monitor async operations
const result = await performanceMonitor.measure('database_query', async () => {
  return await prisma.member.findMany()
}, { churchId, userId })

// Monitor database operations specifically
const members = await trackDatabaseOperation('query', 'members', async () => {
  return await prisma.member.findMany({ where: { churchId } })
}, { churchId, userId })
```

### 3. Business Event Logging

```typescript
import { businessLoggers } from '@/lib/logger/business'

// Log business events with consistent structure
businessLoggers.memberCreated(churchId, userId, memberId, {
  name: 'John Doe',
  email: 'john@example.com'
})

businessLoggers.expenseReportApproved(churchId, approverId, reportId, 1000, requesterId)
```

### 4. tRPC Integration (Automatic)

The logging system is automatically integrated with all tRPC procedures through middleware:

```typescript
// This is handled automatically by the logging middleware
export const myProcedure = protectedProcedure
  .input(z.object({ name: z.string() }))
  .mutation(async ({ ctx, input }) => {
    // Your logic here
    // All requests, responses, and errors are automatically logged
    return result
  })
```

## Configuration

### Environment Variables

```bash
# Logging Configuration
LOG_LEVEL="debug"                    # debug, info, warn, error
LOG_TO_FILE="true"                   # Enable file logging
LOG_PERFORMANCE="true"               # Enable performance logging

# Sentry Integration
SENTRY_DSN="your-sentry-dsn"
NEXT_PUBLIC_SENTRY_DSN="your-sentry-dsn"
SENTRY_ORG="your-org"
SENTRY_PROJECT="your-project"
SENTRY_AUTH_TOKEN="your-token"
```

### File Structure

```
src/lib/logger/
├── index.ts              # Main logger configuration and exports
├── formatters.ts         # Log formatting for different environments
├── transports.ts         # Winston transports configuration
├── init.ts               # System initialization and error handlers
├── business.ts           # Business event logging utilities
└── README.md            # This documentation

src/lib/monitoring/
├── sentry.ts            # Sentry configuration and helpers
└── performance.ts       # Performance monitoring utilities

src/lib/trpc/middleware/
└── logging.ts           # tRPC logging middleware
```

## Log Levels and When to Use Them

### DEBUG
- Detailed debugging information
- Variable values and state changes
- Development-only information

```typescript
logger.debug('Processing member search', {
  searchTerm: 'john',
  filters: { active: true },
  churchId
})
```

### INFO
- General application flow
- Successful operations
- User actions

```typescript
logger.info('Member created successfully', {
  memberId: 'member-123',
  churchId,
  userId
})
```

### WARN
- Potential issues that don't stop execution
- Slow operations
- Authentication failures
- Deprecated API usage

```typescript
logger.warn('Slow database query detected', {
  duration: 5000,
  query: 'SELECT * FROM members',
  churchId
})
```

### ERROR
- Application errors
- Failed operations
- Exceptions that require attention

```typescript
logger.error('Failed to create member', error, {
  input: memberData,
  churchId,
  userId
})
```

## Context-Aware Logging

The logger supports rich context that helps with debugging and monitoring:

```typescript
// Helper methods for context
const context = logger
  .withChurch('church-123')
  .withUser('user-456')
  .withAction('member_update')

logger.info('Operation completed', context)

// Or inline
logger.info('Payment processed', {
  churchId: 'church-123',
  userId: 'user-456',
  action: 'payment_process',
  resourceId: 'payment-789',
  metadata: {
    amount: 100.00,
    currency: 'USD',
    provider: 'stripe'
  }
})
```

## Performance Monitoring

### Automatic Performance Tracking

All tRPC procedures are automatically monitored for:
- Execution time
- Success/failure rates
- Memory usage (for heavy operations)
- Database query performance

### Manual Performance Tracking

```typescript
import { performanceMonitor, trackBatchOperation } from '@/lib/monitoring/performance'

// Single operation
const timer = performanceMonitor.startTimer('operation-id')
// ... do work ...
const duration = performanceMonitor.endTimer('operation-id', 'data_processing', { churchId })

// Batch operations
await trackBatchOperation('member_import', 100, async () => {
  // Process 100 members
}, { churchId, userId })
```

## Security and Audit Logging

### Automatic Audit Events

Certain operations are automatically audited:
- Member deletions
- Expense report approvals/rejections
- Data exports
- Administrative actions

### Manual Audit Logging

```typescript
logger.audit({
  churchId: 'church-123',
  userId: 'user-456',
  action: 'sensitive_operation',
  resourceType: 'member',
  resourceId: 'member-789',
  success: true,
  details: {
    operation: 'role_change',
    from: 'member',
    to: 'admin'
  }
})
```

## Error Monitoring with Sentry

### Automatic Integration

- All errors logged through the logger are sent to Sentry
- User context is automatically set
- Breadcrumbs track user actions
- Performance monitoring for slow operations

### Manual Error Reporting

```typescript
import { reportError } from '@/lib/monitoring/sentry'

reportError(error, {
  churchId: 'church-123',
  userId: 'user-456',
  action: 'payment_processing',
  extra: {
    paymentId: 'pay-123',
    amount: 100.00
  }
})
```

## Log File Management

### Production Logging

- **Application logs**: `logs/application.log` (10MB, 30 days retention)
- **Error logs**: `logs/errors.log` (5MB, 60 days retention)
- **Performance logs**: `logs/performance.log` (10MB, 7 days retention)
- **Audit logs**: `logs/audit.log` (50MB, 365 days retention)

### Log Rotation

Winston automatically handles log rotation based on file size and time:

```typescript
// Configured in transports.ts
maxsize: 10 * 1024 * 1024, // 10MB
maxFiles: 30, // Keep 30 files
tailable: true
```

## Best Practices

### 1. Use Appropriate Log Levels
```typescript
// ✅ Good
logger.debug('Validating input', { input })        // Debug info
logger.info('User action completed', { userId })   // User actions
logger.warn('Slow operation', { duration })        // Performance issues
logger.error('Operation failed', error)            // Errors

// ❌ Avoid
logger.error('User clicked button')                // Not an error
logger.debug('System crashed', error)              // Too low level for critical errors
```

### 2. Include Relevant Context
```typescript
// ✅ Good - Rich context helps debugging
logger.info('Member created', {
  churchId: 'church-123',
  userId: 'user-456',
  resourceId: 'member-789',
  metadata: {
    name: 'John Doe',
    department: 'Youth Ministry'
  }
})

// ❌ Avoid - Minimal context makes debugging hard
logger.info('Member created')
```

### 3. Handle Sensitive Data
```typescript
// ✅ Good - Sensitive data is automatically sanitized
logger.info('User login attempt', {
  email: 'user@example.com',
  password: 'secret123',    // Automatically redacted
  token: 'jwt-token'        // Automatically redacted
})

// Result: password and token fields become '[REDACTED]'
```

### 4. Use Business Event Loggers
```typescript
// ✅ Good - Consistent business event logging
businessLoggers.expenseReportApproved(churchId, approverId, reportId, amount, requesterId)

// ❌ Avoid - Inconsistent manual logging
logger.info('Expense approved', { reportId, amount })
```

## Troubleshooting

### Common Issues

1. **Logs not appearing in files**
   - Check `LOG_TO_FILE=true` in environment
   - Verify `logs/` directory exists and is writable
   - Check file permissions

2. **Sentry errors not appearing**
   - Verify `SENTRY_DSN` is set correctly
   - Check network connectivity
   - Ensure error level is appropriate

3. **Performance logs missing**
   - Enable with `LOG_PERFORMANCE=true`
   - Check if operations are meeting performance thresholds

4. **Context missing in logs**
   - Ensure tRPC middleware is properly configured
   - Check if session context is available
   - Verify user authentication

### Debug Mode

Enable debug logging to see detailed information:

```bash
LOG_LEVEL=debug npm run dev
```

This will show:
- All database queries
- tRPC procedure calls
- Authentication events
- Context switching
- Performance metrics

## Migration from Console Logging

### Before (Console Logging)
```typescript
console.log('Member created:', member)
console.error('Error:', error)
```

### After (Winston Logging)
```typescript
logger.info('Member created', {
  resourceId: member.id,
  churchId,
  userId,
  metadata: { name: member.name }
})

logger.error('Member creation failed', error, {
  churchId,
  userId,
  action: 'member_create'
})
```

## Testing with Logging

The logging system works seamlessly in test environments:

```typescript
// In tests, logs go to console with minimal formatting
import { logger } from '@/lib/logger'

// Test your logging
logger.info('Test operation', { testId: 'test-123' })
```

## Performance Impact

The logging system is designed for minimal performance impact:
- Async log writing
- Log level filtering before processing
- Efficient JSON serialization
- Conditional file logging

Typical overhead: < 1ms per log entry in production.

---

This logging system provides comprehensive observability for the church management system while maintaining security, performance, and ease of use.