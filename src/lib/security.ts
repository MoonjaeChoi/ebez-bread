import { headers } from 'next/headers'
import { NextRequest } from 'next/server'
import crypto from 'crypto'

/**
 * Security utilities for enhanced application protection
 */

// CSRF token generation and validation
export class CSRFProtection {
  private static readonly TOKEN_LENGTH = 32
  private static readonly SECRET = process.env.CSRF_SECRET || 'default-csrf-secret-change-me'

  static generateToken(sessionId?: string): string {
    const token = crypto.randomBytes(this.TOKEN_LENGTH).toString('hex')
    const timestamp = Date.now().toString()
    const payload = `${token}:${timestamp}:${sessionId || ''}`
    const signature = crypto
      .createHmac('sha256', this.SECRET)
      .update(payload)
      .digest('hex')
    
    return Buffer.from(`${payload}:${signature}`).toString('base64')
  }

  static validateToken(token: string, sessionId?: string, maxAge: number = 3600000): boolean {
    try {
      const payload = Buffer.from(token, 'base64').toString('utf8')
      const parts = payload.split(':')
      
      if (parts.length !== 4) return false
      
      const [tokenPart, timestamp, sessionPart, signature] = parts
      const expectedPayload = `${tokenPart}:${timestamp}:${sessionPart}`
      const expectedSignature = crypto
        .createHmac('sha256', this.SECRET)
        .update(expectedPayload)
        .digest('hex')
      
      // Verify signature
      if (signature !== expectedSignature) return false
      
      // Check timestamp
      const tokenTime = parseInt(timestamp, 10)
      if (Date.now() - tokenTime > maxAge) return false
      
      // Check session ID if provided
      if (sessionId && sessionPart !== sessionId) return false
      
      return true
    } catch (error) {
      return false
    }
  }
}

// Input sanitization
export class InputSanitizer {
  // Remove potentially dangerous HTML tags and attributes
  static sanitizeHtml(input: string): string {
    if (!input) return ''
    
    // Remove script tags and their content
    let sanitized = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    
    // Remove dangerous attributes
    sanitized = sanitized.replace(/\s*(on\w+|javascript:|data:)\s*=\s*["'][^"']*["']/gi, '')
    
    // Remove dangerous tags
    const dangerousTags = ['script', 'object', 'embed', 'form', 'iframe', 'meta', 'link']
    dangerousTags.forEach(tag => {
      const regex = new RegExp(`<\\/?${tag}\\b[^>]*>`, 'gi')
      sanitized = sanitized.replace(regex, '')
    })
    
    return sanitized.trim()
  }

  // Sanitize SQL-like input to prevent injection
  static sanitizeSql(input: string): string {
    if (!input) return ''
    
    // Remove common SQL injection patterns
    const patterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|OR|AND)\b)/gi,
      /(--|\/\*|\*\/|;)/g,
      /['"]/g
    ]
    
    let sanitized = input
    patterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '')
    })
    
    return sanitized.trim()
  }

  // Validate email format with additional security checks
  static validateEmail(email: string): { isValid: boolean; error?: string } {
    if (!email) {
      return { isValid: false, error: '이메일이 필요합니다' }
    }

    // Basic format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return { isValid: false, error: '올바른 이메일 형식이 아닙니다' }
    }

    // Length validation
    if (email.length > 254) {
      return { isValid: false, error: '이메일이 너무 깁니다' }
    }

    // Check for dangerous patterns
    const dangerousPatterns = [
      /<script/i,
      /javascript:/i,
      /data:/i,
      /\0/
    ]

    for (const pattern of dangerousPatterns) {
      if (pattern.test(email)) {
        return { isValid: false, error: '허용되지 않는 문자가 포함되어 있습니다' }
      }
    }

    return { isValid: true }
  }
}

// Request validation
export class RequestValidator {
  // Validate request origin
  static validateOrigin(request: NextRequest): boolean {
    const origin = request.headers.get('origin')
    const referer = request.headers.get('referer')
    
    if (!origin && !referer) {
      return false // Suspicious: no origin/referer
    }
    
    const allowedOrigins = [
      process.env.NEXTAUTH_URL || 'http://localhost:3000',
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
    ].filter(Boolean)
    
    if (origin && !allowedOrigins.some(allowed => origin.startsWith(allowed as string))) {
      return false
    }
    
    return true
  }

  // Check for common bot patterns
  static isSuspiciousUserAgent(userAgent?: string): boolean {
    if (!userAgent) return true
    
    const suspiciousPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /curl/i,
      /wget/i,
      /python/i,
      /php/i,
      /go-http-client/i,
      /^$/
    ]
    
    return suspiciousPatterns.some(pattern => pattern.test(userAgent))
  }

  // Validate content type for API requests
  static validateContentType(request: NextRequest, expected: string[]): boolean {
    const contentType = request.headers.get('content-type')
    if (!contentType) return false
    
    return expected.some(type => contentType.includes(type))
  }

  // Check request size to prevent DoS
  static validateRequestSize(request: NextRequest, maxSize: number = 10 * 1024 * 1024): boolean {
    const contentLength = request.headers.get('content-length')
    if (!contentLength) return true // Let it pass, will be checked later
    
    return parseInt(contentLength, 10) <= maxSize
  }
}

// IP-based security
export class IPSecurity {
  private static blockedIPs = new Set<string>()
  private static suspiciousActivity = new Map<string, { count: number; lastActivity: number }>()

  // Get client IP from request
  static getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const remoteAddr = request.headers.get('remote-addr')
    
    if (forwarded) {
      return forwarded.split(',')[0].trim()
    }
    
    return realIp || remoteAddr || 'unknown'
  }

  // Block IP temporarily
  static blockIP(ip: string, duration: number = 3600000): void {
    this.blockedIPs.add(ip)
    
    setTimeout(() => {
      this.blockedIPs.delete(ip)
    }, duration)
  }

  // Check if IP is blocked
  static isBlocked(ip: string): boolean {
    return this.blockedIPs.has(ip)
  }

  // Track suspicious activity
  static trackActivity(ip: string, threshold: number = 100): boolean {
    const now = Date.now()
    const activity = this.suspiciousActivity.get(ip) || { count: 0, lastActivity: now }
    
    // Reset if more than 1 hour passed
    if (now - activity.lastActivity > 3600000) {
      activity.count = 1
    } else {
      activity.count++
    }
    
    activity.lastActivity = now
    this.suspiciousActivity.set(ip, activity)
    
    // Block if threshold exceeded
    if (activity.count > threshold) {
      this.blockIP(ip)
      return false
    }
    
    return true
  }

  // Validate IP format
  static isValidIP(ip: string): boolean {
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/
    
    return ipv4Regex.test(ip) || ipv6Regex.test(ip)
  }
}

// Security headers helper
export class SecurityHeaders {
  static getSecurityHeaders(): Record<string, string> {
    return {
      // Prevent XSS attacks
      'X-XSS-Protection': '1; mode=block',
      
      // Prevent MIME type sniffing
      'X-Content-Type-Options': 'nosniff',
      
      // Control framing to prevent clickjacking
      'X-Frame-Options': 'DENY',
      
      // Referrer policy
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      
      // Remove server information
      'Server': '',
      
      // Prevent caching of sensitive pages
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      
      // HSTS (only for HTTPS)
      ...(process.env.NODE_ENV === 'production' && {
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
      }),
      
      // Content Security Policy
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "font-src 'self' data:",
        "connect-src 'self'",
        "media-src 'self'",
        "object-src 'none'",
        "child-src 'none'",
        "worker-src 'none'",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'"
      ].join('; ')
    }
  }
}

// Data encryption utilities (for sensitive data at rest)
export class DataEncryption {
  private static readonly ALGORITHM = 'aes-256-gcm'
  private static readonly KEY_LENGTH = 32
  private static readonly IV_LENGTH = 16
  private static readonly TAG_LENGTH = 16
  
  private static getKey(): Buffer {
    const secret = process.env.ENCRYPTION_KEY || 'default-key-change-me-in-production'
    return crypto.scryptSync(secret, 'salt', this.KEY_LENGTH)
  }

  // Encrypt sensitive data
  static encrypt(data: string): string {
    const key = this.getKey()
    const iv = crypto.randomBytes(this.IV_LENGTH)
    const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv)
    
    let encrypted = cipher.update(data, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    const tag = (cipher as any).getAuthTag()
    
    return `${iv.toString('hex')}:${encrypted}:${tag.toString('hex')}`
  }

  // Decrypt sensitive data
  static decrypt(encryptedData: string): string {
    try {
      const key = this.getKey()
      const parts = encryptedData.split(':')
      
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format')
      }
      
      const [ivHex, encrypted, tagHex] = parts
      const iv = Buffer.from(ivHex, 'hex')
      const tag = Buffer.from(tagHex, 'hex')
      
      const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv)
      ;(decipher as any).setAuthTag(tag)
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8')
      decrypted += decipher.final('utf8')
      
      return decrypted
    } catch (error) {
      throw new Error('Failed to decrypt data')
    }
  }

  // Hash sensitive data (one-way)
  static hash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex')
  }
}