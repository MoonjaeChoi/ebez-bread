import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { handlePasswordChangeRedirect } from '@/lib/auth/password-change-middleware'

// Rate limiting store (in production, use Redis or external store)
const rateLimitMap = new Map<string, { count: number; lastReset: number }>()

// Rate limiting configuration
const RATE_LIMIT = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxAttempts: 10, // max requests per window
  blockDuration: 30 * 60 * 1000, // 30 minutes block
}

function getRateLimitKey(request: NextRequest): string {
  // Use IP address or fallback identifiers
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const ip = forwarded?.split(',')[0] || realIp || 'anonymous'
  return `rate_limit:${ip}`
}

function checkRateLimit(request: NextRequest): boolean {
  const key = getRateLimitKey(request)
  const now = Date.now()
  const record = rateLimitMap.get(key)

  if (!record) {
    rateLimitMap.set(key, { count: 1, lastReset: now })
    return true
  }

  // Reset if window has passed
  if (now - record.lastReset > RATE_LIMIT.windowMs) {
    rateLimitMap.set(key, { count: 1, lastReset: now })
    return true
  }

  // Check if under limit
  if (record.count < RATE_LIMIT.maxAttempts) {
    record.count++
    return true
  }

  return false
}

export default withAuth(
  async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Apply rate limiting to auth endpoints
    if (pathname.startsWith('/api/auth') || pathname.startsWith('/auth/signin')) {
      if (!checkRateLimit(request)) {
        return new NextResponse(
          JSON.stringify({
            error: 'Too many requests',
            message: '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.',
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': Math.ceil(RATE_LIMIT.blockDuration / 1000).toString(),
            },
          }
        )
      }
    }

    // Check for password change requirement (for authenticated users)
    const passwordRedirectResponse = await handlePasswordChangeRedirect(request)
    if (passwordRedirectResponse && passwordRedirectResponse.status === 307) {
      return passwordRedirectResponse
    }

    // Security headers
    const response = NextResponse.next()
    
    // Add security headers
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    response.headers.set('X-XSS-Protection', '1; mode=block')
    
    // Add CSP for auth pages
    if (pathname.startsWith('/auth/')) {
      response.headers.set(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;"
      )
    }

    return response
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl

        // Public paths that don't require authentication
        const publicPaths = [
          '/',
          '/auth/signin',
          '/auth/error',
          '/api/auth',
          '/api/health',
          '/change-password',  // Allow password change page
        ]

        // Check if path is public
        const isPublicPath = publicPaths.some(path => 
          pathname === path || pathname.startsWith(`${path}/`)
        )

        if (isPublicPath) {
          return true
        }

        // Protected paths require authentication
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}