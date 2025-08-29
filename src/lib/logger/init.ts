/**
 * Initialize logging system during application startup
 * This should be imported and called early in the application lifecycle
 */

import { logger } from './index'
import { initSentry } from '../monitoring/sentry'

let initialized = false

export const initializeLogging = () => {
  if (initialized) {
    return
  }
  
  try {
    // Initialize Sentry for error monitoring
    initSentry()
    
    // Log system startup
    logger.info('Church Management System starting up', {
      action: 'app_startup',
      metadata: {
        environment: process.env.NODE_ENV,
        version: process.env.npm_package_version || '1.0.0',
        logLevel: process.env.LOG_LEVEL || 'info',
        sentryEnabled: !!process.env.SENTRY_DSN
      }
    })
    
    // Log configuration details
    logger.debug('Logging system initialized', {
      action: 'logging_init',
      metadata: {
        fileLogging: process.env.LOG_TO_FILE === 'true',
        performanceLogging: process.env.LOG_PERFORMANCE === 'true',
        sentryDSN: process.env.SENTRY_DSN ? '[CONFIGURED]' : '[NOT_CONFIGURED]'
      }
    })
    
    initialized = true
    
  } catch (error) {
    console.error('Failed to initialize logging system:', error)
    // Don't throw - let the app continue even if logging fails
  }
}

// Handle uncaught exceptions and promise rejections
export const setupGlobalErrorHandlers = () => {
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', error, {
      action: 'uncaught_exception',
      metadata: {
        fatal: true
      }
    })
    
    // Give time for logs to be written before exiting
    setTimeout(() => {
      process.exit(1)
    }, 1000)
  })
  
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection', reason as Error, {
      action: 'unhandled_rejection',
      metadata: {
        promise: promise.toString()
      }
    })
  })
  
  // Handle SIGTERM gracefully
  process.on('SIGTERM', () => {
    logger.info('Received SIGTERM, gracefully shutting down', {
      action: 'app_shutdown',
      metadata: {
        signal: 'SIGTERM'
      }
    })
    process.exit(0)
  })
  
  // Handle SIGINT gracefully
  process.on('SIGINT', () => {
    logger.info('Received SIGINT, gracefully shutting down', {
      action: 'app_shutdown',
      metadata: {
        signal: 'SIGINT'
      }
    })
    process.exit(0)
  })
}