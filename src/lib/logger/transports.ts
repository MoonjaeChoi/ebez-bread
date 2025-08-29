import winston from 'winston'
import path from 'path'
import { developmentFormat, productionFormat, fileFormat, errorFormat } from './formatters'

const logDir = path.join(process.cwd(), 'logs')

// Console transport for development
export const consoleTransport = new winston.transports.Console({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: process.env.NODE_ENV === 'production' ? productionFormat : developmentFormat,
  handleExceptions: true,
  handleRejections: true
})

// File transports for all logs (lazy initialization)
let fileTransport: InstanceType<typeof winston.transports.File> | null = null
let errorFileTransport: InstanceType<typeof winston.transports.File> | null = null
let performanceFileTransport: InstanceType<typeof winston.transports.File> | null = null
let auditFileTransport: InstanceType<typeof winston.transports.File> | null = null

// Create file transports only when needed (server-side)
const createFileTransports = () => {
  if (typeof window !== 'undefined') return

  if (!fileTransport) {
    fileTransport = new winston.transports.File({
      filename: path.join(logDir, 'application.log'),
      level: 'info',
      format: fileFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 30, // Keep 30 days of logs
      tailable: true,
      handleExceptions: true,
      handleRejections: true
    })
  }

  if (!errorFileTransport) {
    errorFileTransport = new winston.transports.File({
      filename: path.join(logDir, 'errors.log'),
      level: 'error',
      format: errorFormat,
      maxsize: 5 * 1024 * 1024, // 5MB
      maxFiles: 60, // Keep 60 days of error logs
      tailable: true,
      handleExceptions: true,
      handleRejections: true
    })
  }

  if (!performanceFileTransport) {
    performanceFileTransport = new winston.transports.File({
      filename: path.join(logDir, 'performance.log'),
      level: 'info',
      format: fileFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 7, // Keep 1 week of performance logs
      tailable: true
    })
  }

  if (!auditFileTransport) {
    auditFileTransport = new winston.transports.File({
      filename: path.join(logDir, 'audit.log'),
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.json()
      ),
      maxsize: 50 * 1024 * 1024, // 50MB
      maxFiles: 365, // Keep 1 year of audit logs
      tailable: true
    })
  }
}

// Get transports based on environment
export const getTransports = () => {
  const transports: winston.transport[] = [consoleTransport]
  
  // Add file transports only in production or server environment
  if (typeof window === 'undefined' && (process.env.NODE_ENV === 'production' || process.env.LOG_TO_FILE === 'true')) {
    createFileTransports()
    
    if (fileTransport && errorFileTransport) {
      transports.push(fileTransport, errorFileTransport)
    }
    
    // Add performance logging in development for debugging
    if ((process.env.NODE_ENV === 'development' || process.env.LOG_PERFORMANCE === 'true') && performanceFileTransport) {
      transports.push(performanceFileTransport)
    }
    
    // Always add audit logging for security events
    if (auditFileTransport) {
      transports.push(auditFileTransport)
    }
  }
  
  return transports
}

// Create logs directory if it doesn't exist (server-side only)
export const ensureLogDirectory = () => {
  if (typeof window === 'undefined' && (process.env.NODE_ENV === 'production' || process.env.LOG_TO_FILE === 'true')) {
    const fs = require('fs')
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true })
    }
  }
}