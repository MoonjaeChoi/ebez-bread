/**
 * Simple test script to verify logging system functionality
 * Run with: node -r ts-node/register src/lib/logger/test.ts
 */

import { logger } from './index'
import { businessLoggers } from './business'
import { performanceMonitor } from '../monitoring/performance'

console.log('🚀 Testing Winston Logging System...\n')

// Test basic logging levels
console.log('1. Testing basic logging levels:')
logger.debug('This is a debug message', { action: 'test', metadata: { test: true, level: 'debug' } })
logger.info('This is an info message', { action: 'test', metadata: { test: true, level: 'info' } })
logger.warn('This is a warning message', { action: 'test', metadata: { test: true, level: 'warn' } })
logger.error('This is an error message', new Error('Test error'), { action: 'test', metadata: { test: true, level: 'error' } })

console.log('\n2. Testing contextual logging:')
// Test contextual logging
const churchId = 'church-123'
const userId = 'user-456'

logger.info('User performed action', {
  churchId,
  userId,
  action: 'member_create',
  resourceId: 'member-789',
  metadata: {
    memberName: 'John Doe',
    memberEmail: 'john@example.com'
  }
})

console.log('\n3. Testing business event logging:')
// Test business event logging
businessLoggers.memberCreated(churchId, userId, 'member-789', {
  name: 'John Doe',
  email: 'john@example.com',
  phone: '+1234567890'
})

businessLoggers.expenseReportApproved(churchId, 'approver-123', 'report-456', 1500, userId)

console.log('\n4. Testing performance monitoring:')
// Test performance monitoring
async function simulateSlowOperation() {
  return new Promise(resolve => setTimeout(resolve, 100))
}

performanceMonitor.measure('test_operation', async () => {
  await simulateSlowOperation()
  return 'operation completed'
}, { churchId, userId }).then(() => {
  console.log('Performance monitoring test completed')
})

console.log('\n5. Testing audit logging:')
// Test audit logging
logger.audit({
  churchId,
  userId,
  action: 'sensitive_operation_test',
  resourceType: 'test_resource',
  resourceId: 'test-123',
  success: true,
  details: {
    operation: 'test_audit',
    description: 'This is a test audit log entry'
  }
})

console.log('\n6. Testing authentication events:')
// Test auth logging
logger.auth('login', {
  userId,
  churchId,
  ipAddress: '192.168.1.100',
  userAgent: 'Test User Agent'
})

console.log('\n✅ Logging system test completed!\n')
console.log('Check the console output above and any log files in the logs/ directory.')
console.log('If Sentry is configured, check your Sentry dashboard for test events.')

export {}