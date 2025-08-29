import * as Sentry from '@sentry/nextjs'
import { logger } from '../logger'

// Sentry configuration for Next.js
export const initSentry = () => {
  if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      
      // Performance monitoring
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      
      // Release tracking
      release: process.env.npm_package_version || '1.0.0',
      
      // Error filtering
      beforeSend(event, hint) {
        // Filter out non-critical errors in development
        if (process.env.NODE_ENV === 'development') {
          // Skip certain error types in development
          const error = hint.originalException
          if (error && typeof error === 'object' && 'code' in error) {
            // Skip connection errors in development
            if (['ECONNREFUSED', 'ENOTFOUND'].includes(error.code as string)) {
              return null
            }
          }
        }
        
        return event
      },
      
      // Additional integrations
      integrations: [
        Sentry.httpIntegration(),
        Sentry.prismaIntegration(),
      ],
      
      // Privacy settings
      sendDefaultPii: false,
      
      // Performance
      profilesSampleRate: 1.0,
    })
    
    logger.info('Sentry initialized for error monitoring', {
      action: 'sentry_init',
      metadata: {
        environment: process.env.NODE_ENV
      }
    })
  }
}

// Enhanced error reporting with context
export const reportError = (
  error: Error, 
  context?: {
    churchId?: string
    userId?: string
    action?: string
    extra?: Record<string, any>
  }
) => {
  logger.error('Application error occurred', error, context)
  
  if (process.env.NODE_ENV === 'production') {
    Sentry.withScope((scope) => {
      // Add church context
      if (context?.churchId) {
        scope.setTag('churchId', context.churchId)
        scope.setContext('church', { id: context.churchId })
      }
      
      // Add user context
      if (context?.userId) {
        scope.setTag('userId', context.userId)
        scope.setUser({ id: context.userId })
      }
      
      // Add action context
      if (context?.action) {
        scope.setTag('action', context.action)
      }
      
      // Add extra context
      if (context?.extra) {
        scope.setContext('extra', context.extra)
      }
      
      Sentry.captureException(error)
    })
  }
}

// Performance monitoring helper
export const measurePerformance = async <T>(
  operation: string,
  fn: () => Promise<T>,
  context?: { churchId?: string; userId?: string }
): Promise<T> => {
  const startTime = Date.now()
  // Note: Sentry transaction API updated - temporarily disabled
  // const transaction = Sentry.startTransaction({ name: operation })
  
  try {
    const result = await fn()
    const duration = Date.now() - startTime
    
    logger.performance({
      operation,
      duration,
      ...context
    })
    
    // transaction.setStatus('ok')
    return result
  } catch (error) {
    const duration = Date.now() - startTime
    
    logger.performance({
      operation: `${operation}_failed`,
      duration,
      ...context
    })
    
    // transaction.setStatus('internal_error')
    reportError(error as Error, { action: operation, ...context })
    throw error
  } finally {
    // transaction.finish()
  }
}

// Database query monitoring
export const monitorQuery = async <T>(
  queryName: string,
  query: () => Promise<T>,
  context?: { churchId?: string; userId?: string }
): Promise<T> => {
  return measurePerformance(`db_${queryName}`, query, context)
}

// tRPC procedure monitoring
export const monitorTRPCProcedure = async <T>(
  procedureName: string,
  procedure: () => Promise<T>,
  input?: any,
  context?: { churchId?: string; userId?: string }
): Promise<T> => {
  const startTime = Date.now()
  
  try {
    const result = await procedure()
    const duration = Date.now() - startTime
    
    logger.trpc(procedureName, input, duration, true, context)
    return result
  } catch (error) {
    const duration = Date.now() - startTime
    
    logger.trpc(procedureName, input, duration, false, context)
    reportError(error as Error, { action: `trpc_${procedureName}`, extra: { input }, ...context })
    throw error
  }
}

// Add breadcrumb for tracking user actions
export const addBreadcrumb = (
  message: string,
  category: string = 'action',
  data?: Record<string, any>
) => {
  Sentry.addBreadcrumb({
    message,
    category,
    level: 'info',
    data
  })
  
  logger.debug(`Breadcrumb: ${message}`, {
    action: 'sentry_breadcrumb',
    metadata: {
      type: 'breadcrumb',
      category,
      data
    }
  })
}

// Set user context for the entire session
export const setUserContext = (user: {
  id: string
  email?: string
  churchId?: string
  role?: string
}) => {
  Sentry.setUser({
    id: user.id,
    email: user.email
  })
  
  if (user.churchId) {
    Sentry.setTag('churchId', user.churchId)
  }
  
  if (user.role) {
    Sentry.setTag('userRole', user.role)
  }
  
  logger.debug('User context set for monitoring', {
    userId: user.id,
    churchId: user.churchId,
    action: 'set_user_context'
  })
}

// Clear user context on logout
export const clearUserContext = () => {
  Sentry.setUser(null)
  Sentry.setTag('churchId', null)
  Sentry.setTag('userRole', null)
  
  logger.debug('User context cleared', {
    action: 'clear_user_context'
  })
}