import { logger } from '../logger'
import { measurePerformance } from './sentry'

// Performance monitoring utilities
export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private timers = new Map<string, number>()
  
  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }
  
  // Start timing an operation
  startTimer(operationId: string): void {
    this.timers.set(operationId, Date.now())
  }
  
  // End timing and log performance
  endTimer(
    operationId: string, 
    operationName: string,
    context?: { churchId?: string; userId?: string }
  ): number {
    const startTime = this.timers.get(operationId)
    if (!startTime) {
      logger.warn('Timer not found for operation', {
        ...context,
        action: 'timer_not_found',
        metadata: {
          operationId,
          operationName
        }
      })
      return 0
    }
    
    const duration = Date.now() - startTime
    this.timers.delete(operationId)
    
    logger.performance({
      operation: operationName,
      duration,
      ...context
    })
    
    return duration
  }
  
  // Measure and log a function execution
  async measure<T>(
    operationName: string,
    fn: () => Promise<T>,
    context?: { churchId?: string; userId?: string }
  ): Promise<T> {
    return measurePerformance(operationName, fn, context)
  }
  
  // Measure sync function execution
  measureSync<T>(
    operationName: string,
    fn: () => T,
    context?: { churchId?: string; userId?: string }
  ): T {
    const startTime = Date.now()
    
    try {
      const result = fn()
      const duration = Date.now() - startTime
      
      logger.performance({
        operation: operationName,
        duration,
        ...context
      })
      
      return result
    } catch (error) {
      const duration = Date.now() - startTime
      
      logger.performance({
        operation: `${operationName}_failed`,
        duration,
        ...context
      })
      
      throw error
    }
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance()

// Helper decorators and functions
export const withPerformanceTracking = <T extends (...args: any[]) => Promise<any>>(
  operationName: string,
  fn: T,
  contextExtractor?: (...args: Parameters<T>) => { churchId?: string; userId?: string }
): T => {
  return (async (...args: Parameters<T>) => {
    const context = contextExtractor ? contextExtractor(...args) : undefined
    return performanceMonitor.measure(operationName, () => fn(...args), context)
  }) as T
}

// Database performance monitoring helpers
export const trackDatabaseOperation = async <T>(
  operationType: 'query' | 'create' | 'update' | 'delete',
  tableName: string,
  operation: () => Promise<T>,
  context?: { churchId?: string; userId?: string }
): Promise<T> => {
  const operationName = `db_${operationType}_${tableName}`
  return performanceMonitor.measure(operationName, operation, context)
}

// API endpoint performance tracking
export const trackAPIEndpoint = async <T>(
  method: string,
  endpoint: string,
  handler: () => Promise<T>,
  context?: { churchId?: string; userId?: string }
): Promise<T> => {
  const operationName = `api_${method.toLowerCase()}_${endpoint.replace(/\//g, '_')}`
  return performanceMonitor.measure(operationName, handler, context)
}

// Memory usage monitoring
export const logMemoryUsage = (context?: { churchId?: string; userId?: string; action?: string }) => {
  const used = process.memoryUsage()
  
  logger.info('Memory usage snapshot', {
    ...context,
    type: 'memory',
    metadata: {
      heapUsed: Math.round(used.heapUsed / 1024 / 1024 * 100) / 100,
      heapTotal: Math.round(used.heapTotal / 1024 / 1024 * 100) / 100,
      external: Math.round(used.external / 1024 / 1024 * 100) / 100,
      rss: Math.round(used.rss / 1024 / 1024 * 100) / 100
    }
  })
}

// Performance warnings for critical operations
export const warnOnSlowOperation = (
  operation: string,
  duration: number,
  threshold: number = 5000,
  context?: { churchId?: string; userId?: string }
) => {
  if (duration > threshold) {
    logger.warn(`Slow operation detected: ${operation}`, {
      ...context,
      action: 'slow_operation',
      metadata: {
        type: 'slow_operation',
        duration,
        threshold,
        performance_issue: true
      }
    })
  }
}

// Background task performance monitoring
export const trackBackgroundTask = async <T>(
  taskName: string,
  task: () => Promise<T>,
  context?: { churchId?: string }
): Promise<T> => {
  const operationName = `background_${taskName}`
  return performanceMonitor.measure(operationName, task, context)
}

// Batch operation performance tracking
export const trackBatchOperation = async <T>(
  operationType: string,
  batchSize: number,
  operation: () => Promise<T>,
  context?: { churchId?: string; userId?: string }
): Promise<T> => {
  const operationName = `batch_${operationType}_${batchSize}_items`
  
  const startTime = Date.now()
  try {
    const result = await operation()
    const duration = Date.now() - startTime
    
    logger.performance({
      operation: operationName,
      duration,
      ...context,
      metadata: {
        batchSize,
        avgTimePerItem: Math.round((duration / batchSize) * 100) / 100
      }
    })
    
    return result
  } catch (error) {
    const duration = Date.now() - startTime
    
    logger.performance({
      operation: `${operationName}_failed`,
      duration,
      ...context,
      metadata: { batchSize }
    })
    
    throw error
  }
}