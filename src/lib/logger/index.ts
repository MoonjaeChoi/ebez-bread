// Simple client-side logging fallback to avoid winston fs issues
const isServer = typeof window === 'undefined'

// Types for logging context
export interface LogContext {
  churchId?: string
  userId?: string
  requestId?: string
  action?: string
  resourceId?: string
  metadata?: Record<string, any>
  type?: string
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

// Create Winston logger instance (server-side only)
let winstonLogger: any = null

if (isServer) {
  try {
    const winston = require('winston')
    const { getTransports, ensureLogDirectory } = require('./transports')
    
    ensureLogDirectory()
    
    winstonLogger = winston.createLogger({
      level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
      transports: getTransports(),
      exitOnError: false,
      
      // Default metadata
      defaultMeta: {
        service: 'church-management-api',
        version: process.env.npm_package_version || '1.0.0'
      }
    })
  } catch (error) {
    console.warn('Winston logger initialization failed, using console fallback')
  }
}

// Logger class with enhanced functionality
export class Logger {
  private static instance: Logger
  private winston: any
  
  constructor() {
    this.winston = winstonLogger
    
    // Initialize Sentry integration in production
    if (isServer && process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
      this.initializeSentry()
    }
  }
  
  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger()
    }
    return Logger.instance
  }
  
  private initializeSentry() {
    // Sentry is already initialized in next.config.js for Next.js
    // We just need to ensure it captures our winston errors
    if (this.winston) {
      this.winston.on('error', (error: any) => {
        // Sentry.captureException(error) // 일시적으로 비활성화
        console.error('Winston error:', error)
      })
    }
  }
  
  // Core logging methods with context
  debug(message: string, context?: LogContext) {
    if (this.winston) {
      this.winston.debug(message, { context })
    } else {
      console.debug('[DEBUG]', message, context)
    }
  }
  
  info(message: string, context?: LogContext) {
    if (this.winston) {
      this.winston.info(message, { context })
    } else {
      console.info('[INFO]', message, context)
    }
  }
  
  warn(message: string, context?: LogContext) {
    if (this.winston) {
      this.winston.warn(message, { context })
    } else {
      console.warn('[WARN]', message, context)
    }
    
    // Send warnings to Sentry in production
    if (isServer && process.env.NODE_ENV === 'production') {
      // Sentry.addBreadcrumb({
      //   message,
      //   level: 'warning',
      //   data: context
      // }) // 일시적으로 비활성화
    }
  }
  
  error(message: string, error?: Error, context?: LogContext) {
    const logData = {
      context,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
        cause: (error as any).cause
      } : undefined
    }
    
    if (this.winston) {
      this.winston.error(message, logData)
    } else {
      console.error('[ERROR]', message, logData)
    }
    
    // Send errors to Sentry
    // if (error) {
    //   Sentry.withScope((scope) => {
    //     if (context?.churchId) scope.setTag('churchId', context.churchId)
    //     if (context?.userId) scope.setTag('userId', context.userId)
    //     if (context?.action) scope.setTag('action', context.action)
    //     if (context?.resourceId) scope.setTag('resourceId', context.resourceId)
    //     
    //     scope.setContext('logger_context', context || {})
    //     Sentry.captureException(error)
    //   })
    // } else {
    //   // If no error object, capture as message
    //   Sentry.withScope((scope) => {
    //     if (context?.churchId) scope.setTag('churchId', context.churchId)
    //     if (context?.userId) scope.setTag('userId', context.userId)
    //     if (context?.action) scope.setTag('action', context.action)
    //     
    //     scope.setContext('logger_context', context || {})
    //     Sentry.captureMessage(message, 'error')
    //   })
    // } // 일시적으로 비활성화
  }
  
  // Performance logging
  performance(context: PerformanceContext) {
    const message = `${context.operation} completed in ${context.duration}ms`
    const logData = {
      context: {
        ...context,
        type: 'performance'
      },
      performance: {
        operation: context.operation,
        duration: context.duration,
        timestamp: new Date().toISOString()
      }
    }
    
    if (this.winston) {
      this.winston.info(message, logData)
    } else {
      console.info('[PERFORMANCE]', message, logData)
    }
    
    // Add performance data to Sentry
    // Sentry.addBreadcrumb({
    //   category: 'performance',
    //   message,
    //   level: 'info',
    //   data: context
    // }) // 일시적으로 비활성화
    
    // Warn on slow operations (>5 seconds)
    if (context.duration > 5000) {
      this.warn(`Slow operation detected: ${context.operation}`, {
        ...context,
        type: 'slow_operation'
      })
    }
  }
  
  // Audit logging for security and compliance
  audit(context: AuditContext) {
    const message = `${context.action} ${context.success ? 'succeeded' : 'failed'} for ${context.resourceType}`
    const logData = {
      context: {
        ...context,
        type: 'audit'
      }
    }
    
    if (this.winston) {
      this.winston.info(message, logData)
    } else {
      console.info('[AUDIT]', message, logData)
    }
    
    // Add audit trail to Sentry
    // Sentry.addBreadcrumb({
    //   category: 'audit',
    //   message,
    //   level: context.success ? 'info' : 'warning',
    //   data: context
    // }) // 일시적으로 비활성화
  }
  
  // Database query logging
  query(sql: string, duration: number, context?: LogContext) {
    this.debug(`Database query executed in ${duration}ms`, {
      ...context,
      action: 'database_query',
      metadata: {
        type: 'database',
        sql: sql.substring(0, 200), // Truncate long queries
        duration
      }
    })
    
    // Warn on slow queries (>1 second)
    if (duration > 1000) {
      this.warn(`Slow database query detected`, {
        ...context,
        action: 'slow_query',
        metadata: {
          type: 'slow_query',
          sql: sql.substring(0, 500),
          duration
        }
      })
    }
  }
  
  // tRPC procedure logging
  trpc(procedure: string, input: any, duration: number, success: boolean, context?: LogContext) {
    const message = `tRPC ${procedure} ${success ? 'succeeded' : 'failed'} in ${duration}ms`
    const level = success ? 'info' : 'error'
    
    this.winston.log(level, message, {
      context: {
        ...context,
        type: 'trpc',
        procedure,
        duration,
        success,
        inputSize: input ? JSON.stringify(input).length : 0
      }
    })
  }
  
  // Authentication events
  auth(event: 'login' | 'logout' | 'register' | 'password_change' | 'failed_login', context: LogContext & { ipAddress?: string, userAgent?: string }) {
    const message = `Authentication event: ${event}`
    
    this.info(message, {
      ...context,
      action: 'auth_event',
      metadata: {
        type: 'auth',
        event
      }
    })
    
    // Track auth events in Sentry
    // Sentry.addBreadcrumb({
    //   category: 'auth',
    //   message,
    //   level: event === 'failed_login' ? 'warning' : 'info',
    //   data: context
    // }) // 일시적으로 비활성화
  }
  
  // Business logic events
  business(event: string, context: LogContext) {
    this.info(`Business event: ${event}`, {
      ...context,
      action: 'business_event',
      metadata: {
        type: 'business',
        event
      }
    })
  }
  
  // Request correlation for tracing
  withRequestId(requestId: string): LogContext {
    return { requestId }
  }
  
  // Church context helper
  withChurch(churchId: string, context?: LogContext): LogContext {
    return { ...context, churchId }
  }
  
  // User context helper
  withUser(userId: string, context?: LogContext): LogContext {
    return { ...context, userId }
  }
  
  // Action context helper
  withAction(action: string, context?: LogContext): LogContext {
    return { ...context, action }
  }
}

// Export singleton instance
export const appLogger = Logger.getInstance()

// Convenience exports for direct usage
export const logger = {
  debug: (message: string, context?: LogContext) => appLogger.debug(message, context),
  info: (message: string, context?: LogContext) => appLogger.info(message, context),
  warn: (message: string, context?: LogContext) => appLogger.warn(message, context),
  error: (message: string, error?: Error, context?: LogContext) => appLogger.error(message, error, context),
  performance: (context: PerformanceContext) => appLogger.performance(context),
  audit: (context: AuditContext) => appLogger.audit(context),
  query: (sql: string, duration: number, context?: LogContext) => appLogger.query(sql, duration, context),
  trpc: (procedure: string, input: any, duration: number, success: boolean, context?: LogContext) => 
    appLogger.trpc(procedure, input, duration, success, context),
  auth: (event: 'login' | 'logout' | 'register' | 'password_change' | 'failed_login', 
         context: LogContext & { ipAddress?: string, userAgent?: string }) => 
    appLogger.auth(event, context),
  business: (event: string, context: LogContext) => appLogger.business(event, context),
  withRequestId: (requestId: string) => appLogger.withRequestId(requestId),
  withChurch: (churchId: string, context?: LogContext) => appLogger.withChurch(churchId, context),
  withUser: (userId: string, context?: LogContext) => appLogger.withUser(userId, context),
  withAction: (action: string, context?: LogContext) => appLogger.withAction(action, context)
}

// Types are already exported above