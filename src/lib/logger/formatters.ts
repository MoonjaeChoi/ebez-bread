import * as winston from 'winston'
import type { LogContext } from './index'

const { combine, timestamp, errors, printf, colorize, json } = winston.format

// Custom format for development console logging
export const developmentFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  printf((info: any) => {
    const { timestamp, level, message, context, error, ...meta } = info
    let logMessage = `${timestamp} [${level}]`
    
    // Add context information
    if (context?.churchId) logMessage += ` [Church: ${context.churchId}]`
    if (context?.userId) logMessage += ` [User: ${context.userId}]`
    if (context?.requestId) logMessage += ` [Req: ${context.requestId}]`
    if (context?.action) logMessage += ` [${context.action}]`
    
    logMessage += `: ${message}`
    
    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      logMessage += `\n${JSON.stringify(meta, null, 2)}`
    }
    
    // Add error stack if present
    if (error?.stack) {
      logMessage += `\n${error.stack}`
    }
    
    return logMessage
  })
)

// Production format with structured JSON logging
export const productionFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json(),
  printf((info) => {
    const logObject = {
      timestamp: info.timestamp,
      level: info.level,
      message: info.message,
      service: 'church-management-api',
      environment: process.env.NODE_ENV || 'development',
      ...(info.context ? { context: info.context } : {}),
      ...(info.error && typeof info.error === 'object' && 'message' in info.error && 'stack' in info.error ? { 
        error: { 
          message: info.error.message, 
          stack: info.error.stack 
        } 
      } : {}),
      ...(info.performance ? { performance: info.performance } : {}),
      ...(info.meta ? { meta: info.meta } : {})
    }
    return JSON.stringify(logObject)
  })
)

// Sanitization format to remove sensitive data
export const sanitizeFormat = winston.format((info) => {
  const sensitiveKeys = [
    'password',
    'token',
    'secret',
    'key',
    'authorization',
    'cookie',
    'session'
  ]
  
  const sanitizeObject = (obj: any): any => {
    if (!obj || typeof obj !== 'object') return obj
    
    const sanitized = { ...obj }
    
    for (const key in sanitized) {
      if (sensitiveKeys.some(sensitiveKey => 
        key.toLowerCase().includes(sensitiveKey.toLowerCase())
      )) {
        sanitized[key] = '[REDACTED]'
      } else if (typeof sanitized[key] === 'object') {
        sanitized[key] = sanitizeObject(sanitized[key])
      }
    }
    
    return sanitized
  }
  
  if (info.context) {
    info.context = sanitizeObject(info.context)
  }
  
  if (info.meta) {
    info.meta = sanitizeObject(info.meta)
  }
  
  return info
})()

// Format for file logging with rotation
export const fileFormat = combine(
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  sanitizeFormat,
  json()
)

// Format for error logs specifically
export const errorFormat = combine(
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  sanitizeFormat,
  printf((info: any) => {
    const { timestamp, level, message, context, error, ...meta } = info
    const errorInfo = {
      timestamp,
      level,
      message,
      service: 'church-management-api',
      environment: process.env.NODE_ENV || 'development',
      context,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: error.code
      } : undefined,
      meta
    }
    
    return JSON.stringify(errorInfo, null, 2)
  })
)