// Client-side logger for browser environment
export interface LogContext {
  churchId?: string
  userId?: string
  requestId?: string
  action?: string
  resourceId?: string
  metadata?: Record<string, any>
}

export interface PerformanceContext {
  operation: string
  duration: number
  churchId?: string
  userId?: string
  metadata?: Record<string, any>
}

export interface AuditContext {
  churchId: string
  userId: string
  action: string
  resourceType: string
  resourceId?: string
  ipAddress?: string
  userAgent?: string
  success: boolean
  details?: Record<string, any>
}

// Simple client-side logger using console
export const clientLogger = {
  debug: (message: string, context?: LogContext) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug('[DEBUG]', message, context)
    }
  },
  
  info: (message: string, context?: LogContext) => {
    console.info('[INFO]', message, context)
  },
  
  warn: (message: string, context?: LogContext) => {
    console.warn('[WARN]', message, context)
  },
  
  error: (message: string, error?: Error, context?: LogContext) => {
    console.error('[ERROR]', message, error, context)
  },
  
  performance: (context: PerformanceContext) => {
    const message = `${context.operation} completed in ${context.duration}ms`
    if (context.duration > 1000) {
      console.warn('[PERFORMANCE]', message, context)
    } else {
      console.info('[PERFORMANCE]', message, context)
    }
  },
  
  audit: (context: AuditContext) => {
    const message = `${context.action} ${context.success ? 'succeeded' : 'failed'} for ${context.resourceType}`
    console.info('[AUDIT]', message, context)
  },
  
  auth: (event: string, context: LogContext & { ipAddress?: string, userAgent?: string }) => {
    console.info('[AUTH]', `Authentication event: ${event}`, context)
  },
  
  business: (event: string, context: LogContext) => {
    console.info('[BUSINESS]', `Business event: ${event}`, context)
  }
}

// Types are already exported from index.ts