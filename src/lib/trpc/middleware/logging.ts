import { TRPCError } from '@trpc/server'
import { logger } from '../../logger'
import { monitorTRPCProcedure, reportError, addBreadcrumb } from '../../monitoring/sentry'
import { v4 as uuidv4 } from 'uuid'
import type { Context } from '../server'

// Generate unique request ID for correlation
const generateRequestId = () => uuidv4().slice(0, 8)

// Import tRPC context for middleware creation
import { initTRPC } from '@trpc/server'

// Create a temporary tRPC instance for middleware creation
const t = initTRPC.context<Context>().create()

// Logging middleware for tRPC procedures
export const loggingMiddleware = t.middleware(async ({ ctx, next, path, type, input, meta }) => {
  const requestId = generateRequestId()
  const startTime = Date.now()
  
  // Extract user context
  const userId = ctx.session?.user?.id
  const churchId = ctx.session?.user?.churchId
  const userRole = ctx.session?.user?.role
  
  // Create base log context
  const logContext = logger.withRequestId(requestId)
  const contextWithChurch = churchId ? logger.withChurch(churchId, logContext) : logContext
  const contextWithUser = userId ? logger.withUser(userId, contextWithChurch) : contextWithChurch
  
  // Log incoming request
  logger.info(`tRPC ${type} request: ${path}`, {
    ...contextWithUser,
    action: `trpc_${path}`,
    metadata: {
      type,
      path,
      hasInput: !!input,
      inputSize: input ? JSON.stringify(input).length : 0,
      userRole,
      requireAuth: (meta as any)?.requireAuth,
      allowedRoles: (meta as any)?.roles
    }
  })
  
  // Add breadcrumb for user action tracking
  addBreadcrumb(
    `tRPC ${type}: ${path}`,
    'trpc',
    {
      path,
      type,
      userId,
      churchId,
      inputSize: input ? JSON.stringify(input).length : 0
    }
  )
  
  try {
    // Execute the procedure with performance monitoring
    const result = await monitorTRPCProcedure(
      path,
      () => next(),
      input,
      { userId, churchId }
    )
    
    const duration = Date.now() - startTime
    
    // Log successful completion
    logger.info(`tRPC ${type} completed: ${path}`, {
      ...contextWithUser,
      action: `trpc_${path}_success`,
      metadata: {
        duration,
        hasResult: !!result,
        success: true
      }
    })
    
    // Audit log for sensitive operations
    if (shouldAuditOperation(path, type)) {
      logger.audit({
        churchId: churchId!,
        userId: userId!,
        action: `trpc_${path}`,
        resourceType: extractResourceType(path),
        resourceId: extractResourceId(input),
        success: true,
        details: {
          type,
          duration,
          requestId
        }
      })
    }
    
    return result
    
  } catch (error) {
    const duration = Date.now() - startTime
    const isExpectedError = error instanceof TRPCError
    
    // Log error with appropriate level
    if (isExpectedError) {
      logger.warn(`tRPC ${type} failed: ${path}`, {
        ...contextWithUser,
        action: `trpc_${path}_error`,
        metadata: {
          duration,
          errorCode: error.code,
          errorMessage: (error as Error).message,
          success: false
        }
      })
    } else {
      logger.error(`tRPC ${type} error: ${path}`, error as Error, {
        ...contextWithUser,
        action: `trpc_${path}_error`,
        metadata: {
          duration,
          success: false
        }
      })
      
      // Report unexpected errors to Sentry
      reportError(error as Error, {
        churchId,
        userId,
        action: `trpc_${path}`,
        extra: {
          path,
          type,
          input: input ? JSON.stringify(input).substring(0, 1000) : undefined,
          duration,
          requestId
        }
      })
    }
    
    // Audit log for failed sensitive operations
    if (shouldAuditOperation(path, type)) {
      logger.audit({
        churchId: churchId || 'unknown',
        userId: userId || 'unknown',
        action: `trpc_${path}`,
        resourceType: extractResourceType(path),
        resourceId: extractResourceId(input),
        success: false,
        details: {
          type,
          duration,
          errorCode: isExpectedError ? error.code : 'INTERNAL_ERROR',
          errorMessage: (error as Error).message,
          requestId
        }
      })
    }
    
    throw error
  }
})

// Determine if an operation should be audited
const shouldAuditOperation = (path: string, type: 'query' | 'mutation' | 'subscription'): boolean => {
  // Always audit mutations (create, update, delete operations)
  if (type === 'mutation') return true
  
  // Audit sensitive query operations
  const sensitiveOperations = [
    'members.getAll',
    'offerings.getStats',
    'expense-reports.getAll',
    'attendance.getStats',
    'visitations.getAll'
  ]
  
  return sensitiveOperations.some(op => path.includes(op))
}

// Extract resource type from tRPC path
const extractResourceType = (path: string): string => {
  const parts = path.split('.')
  return parts[0] || 'unknown'
}

// Extract resource ID from input if available
const extractResourceId = (input: any): string | undefined => {
  if (!input || typeof input !== 'object') return undefined
  
  // Common ID field names
  const idFields = ['id', 'memberId', 'reportId', 'offeringId', 'visitationId']
  
  for (const field of idFields) {
    if (input[field]) {
      return String(input[field])
    }
  }
  
  return undefined
}

// Performance monitoring middleware
export const performanceMiddleware = t.middleware(async ({ ctx, next, path, type }) => {
  const userId = ctx.session?.user?.id
  const churchId = ctx.session?.user?.churchId
  
  // Track memory usage for heavy operations
  const heavyOperations = [
    'reports.generate',
    'import-export.import',
    'import-export.export',
    'members.bulkUpdate'
  ]
  
  if (heavyOperations.some(op => path.includes(op))) {
    const memBefore = process.memoryUsage()
    
    try {
      const result = await next()
      
      const memAfter = process.memoryUsage()
      const memDelta = memAfter.heapUsed - memBefore.heapUsed
      
      logger.info(`Memory usage for heavy operation: ${path}`, {
        userId,
        churchId,
        action: `memory_${path}`,
        metadata: {
          memoryDelta: Math.round(memDelta / 1024 / 1024 * 100) / 100, // MB
          heapUsed: Math.round(memAfter.heapUsed / 1024 / 1024 * 100) / 100
        }
      })
      
      return result
    } catch (error) {
      const memAfter = process.memoryUsage()
      const memDelta = memAfter.heapUsed - memBefore.heapUsed
      
      logger.warn(`Memory usage for failed heavy operation: ${path}`, {
        userId,
        churchId,
        action: `memory_${path}_error`,
        metadata: {
          memoryDelta: Math.round(memDelta / 1024 / 1024 * 100) / 100,
          heapUsed: Math.round(memAfter.heapUsed / 1024 / 1024 * 100) / 100
        }
      })
      
      throw error
    }
  }
  
  return next()
})

// Rate limiting and abuse detection middleware
export const securityLoggingMiddleware = t.middleware(async ({ ctx, next, path, type }) => {
  const userId = ctx.session?.user?.id
  const churchId = ctx.session?.user?.churchId
  const ipAddress = (ctx.req?.headers as any)?.['x-forwarded-for'] || 
                   (ctx.req?.headers as any)?.['x-real-ip'] ||
                   (ctx.req as any)?.socket?.remoteAddress || 'unknown'
  
  // Log authentication-related operations
  const authOperations = [
    'auth.login',
    'auth.logout',
    'auth.register',
    'auth.changePassword'
  ]
  
  if (authOperations.some(op => path.includes(op))) {
    logger.auth(
      path.includes('login') ? 'login' : 
      path.includes('logout') ? 'logout' :
      path.includes('register') ? 'register' : 'password_change',
      {
        userId,
        churchId,
        ipAddress,
        userAgent: (ctx.req?.headers as any)?.['user-agent']
      }
    )
  }
  
  // Log potentially sensitive operations
  const sensitiveOperations = [
    'members.delete',
    'expense-reports.approve',
    'offerings.create',
    'users.updateRole'
  ]
  
  if (sensitiveOperations.some(op => path.includes(op))) {
    logger.warn(`Sensitive operation attempted: ${path}`, {
      userId,
      churchId,
      action: `sensitive_${path}`,
      metadata: {
        ipAddress,
        userAgent: (ctx.req?.headers as any)?.['user-agent'],
        type
      }
    })
  }
  
  return next()
})