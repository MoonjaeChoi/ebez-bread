import { logger } from './logger'

/**
 * Error handling utilities with enhanced logging and user-friendly messages
 */

export interface AppError extends Error {
  statusCode: number
  code?: string
  context?: Record<string, any>
}

export class AppError extends Error implements AppError {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
    public context?: Record<string, any>
  ) {
    super(message)
    this.name = 'AppError'
    
    // Ensure proper prototype chain
    Object.setPrototypeOf(this, AppError.prototype)
    
    // Capture stack trace if available
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError)
    }
  }
}

// Predefined error types
export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 400, 'VALIDATION_ERROR', context)
    this.name = 'ValidationError'
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = '인증이 필요합니다', context?: Record<string, any>) {
    super(message, 401, 'AUTHENTICATION_ERROR', context)
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = '권한이 없습니다', context?: Record<string, any>) {
    super(message, 403, 'AUTHORIZATION_ERROR', context)
    this.name = 'AuthorizationError'
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = '요청한 리소스를 찾을 수 없습니다', context?: Record<string, any>) {
    super(message, 404, 'NOT_FOUND_ERROR', context)
    this.name = 'NotFoundError'
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = '너무 많은 요청입니다. 잠시 후 다시 시도해주세요', context?: Record<string, any>) {
    super(message, 429, 'RATE_LIMIT_ERROR', context)
    this.name = 'RateLimitError'
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = '데이터베이스 오류가 발생했습니다', context?: Record<string, any>) {
    super(message, 500, 'DATABASE_ERROR', context)
    this.name = 'DatabaseError'
  }
}

// Error handler utility
export function handleError(error: unknown, defaultMessage?: string): AppError {
  // If it's already an AppError, return as is
  if (error instanceof AppError) {
    return error
  }
  
  // If it's a standard Error, convert to AppError
  if (error instanceof Error) {
    return new AppError(
      error.message || defaultMessage || '알 수 없는 오류가 발생했습니다',
      500,
      'UNKNOWN_ERROR',
      { originalError: error.name, stack: error.stack }
    )
  }
  
  // For any other type, create generic error
  return new AppError(
    defaultMessage || '알 수 없는 오류가 발생했습니다',
    500,
    'UNKNOWN_ERROR',
    { originalError: error }
  )
}

// Async error wrapper
export function withErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args)
    } catch (error) {
      const appError = handleError(error)
      
      // Log the error
      logger.error('Error caught in withErrorHandling', appError, {
        action: 'error_handling',
        metadata: {
          context: appError.context,
          statusCode: appError.statusCode,
          code: appError.code
        }
      })
      
      throw appError
    }
  }
}

// Client-safe error serialization
export function serializeError(error: AppError): {
  message: string
  statusCode: number
  code?: string
} {
  // In production, don't expose internal error details
  const isProduction = process.env.NODE_ENV === 'production'
  
  return {
    message: isProduction && error.statusCode === 500 
      ? '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
      : error.message,
    statusCode: error.statusCode || 500,
    code: error.code
  }
}

// Validation error aggregation
export class ValidationErrorCollector {
  private errors: Array<{ field: string; message: string }> = []

  add(field: string, message: string) {
    this.errors.push({ field, message })
  }

  hasErrors(): boolean {
    return this.errors.length > 0
  }

  getErrors() {
    return this.errors
  }

  throwIfErrors() {
    if (this.hasErrors()) {
      const messages = this.errors.map(e => `${e.field}: ${e.message}`).join(', ')
      throw new ValidationError(`검증 오류: ${messages}`, { fields: this.errors })
    }
  }
}

// Error recovery utilities
export async function retry<T>(
  fn: () => Promise<T>,
  attempts: number = 3,
  delay: number = 1000,
  backoff: number = 2
): Promise<T> {
  let lastError: unknown
  
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      
      if (i === attempts - 1) {
        break // Don't delay on last attempt
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(backoff, i)))
    }
  }
  
  throw handleError(lastError, `작업이 ${attempts}번의 시도 후 실패했습니다`)
}

// Circuit breaker pattern
export class CircuitBreaker {
  private failures = 0
  private lastFailTime = 0
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED'

  constructor(
    private threshold: number = 5,
    private timeout: number = 60000 // 1 minute
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailTime < this.timeout) {
        throw new AppError('서비스가 일시적으로 중단되었습니다', 503, 'CIRCUIT_BREAKER_OPEN')
      }
      this.state = 'HALF_OPEN'
    }

    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private onSuccess() {
    this.failures = 0
    this.state = 'CLOSED'
  }

  private onFailure() {
    this.failures++
    this.lastFailTime = Date.now()
    
    if (this.failures >= this.threshold) {
      this.state = 'OPEN'
    }
  }
}