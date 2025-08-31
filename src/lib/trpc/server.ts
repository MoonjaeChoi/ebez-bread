import { initTRPC, TRPCError } from '@trpc/server'
import { type CreateNextContextOptions } from '@trpc/server/adapters/next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { UserRole } from '@prisma/client'
import { loggingMiddleware, performanceMiddleware, securityLoggingMiddleware } from './middleware/logging'
import { logger } from '../logger'

// Context creation for Next.js App Router
export async function createTRPCContext(opts?: { req?: Request }) {
  const session = await getServerSession(authOptions)

  return {
    prisma,
    session,
    req: opts?.req || null,
    res: null, // Not available in App Router
  }
}

export type Context = Awaited<ReturnType<typeof createTRPCContext>>

// Initialize tRPC
const t = initTRPC.context<Context>().create()

// Base router and procedure
export const router = t.router

// Public procedure with basic logging
export const publicProcedure = t.procedure
  .use(loggingMiddleware)
  .use(performanceMiddleware)
  .use(securityLoggingMiddleware)

// Auth middleware with enhanced logging
const authMiddleware = t.middleware(({ ctx, next }) => {
  if (!ctx.session || !ctx.session.user) {
    logger.warn('Unauthorized access attempt', {
      action: 'auth_failed',
      metadata: {
        hasSession: !!ctx.session,
        userAgent: (ctx.req?.headers as any)?.['user-agent'] || 'unknown',
        ipAddress: (ctx.req?.headers as any)?.['x-forwarded-for'] || (ctx.req?.headers as any)?.['x-real-ip'] || 'unknown'
      }
    })
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }

  // Check if user has churchId (required for most operations)
  if (!ctx.session.user.churchId) {
    logger.error('User authenticated but missing churchId', new Error('Missing churchId'), {
      userId: ctx.session.user.id,
      action: 'auth_missing_church_id',
      metadata: {
        userRole: ctx.session.user.role,
        userEmail: ctx.session.user.email,
        sessionKeys: Object.keys(ctx.session.user)
      }
    })
    throw new TRPCError({ 
      code: 'BAD_REQUEST', 
      message: 'User account is not associated with a church. Please contact your administrator.' 
    })
  }
  
  // Log successful authentication
  logger.debug('User authenticated for tRPC request', {
    userId: ctx.session.user.id,
    churchId: ctx.session.user.churchId,
    action: 'auth_success'
  })
  
  return next({
    ctx: {
      ...ctx,
      session: { ...ctx.session, user: ctx.session.user },
    },
  })
})

// Protected procedure with full logging stack
export const protectedProcedure = t.procedure
  .use(loggingMiddleware)
  .use(performanceMiddleware)
  .use(securityLoggingMiddleware)
  .use(authMiddleware)

// Role-based middleware with enhanced logging
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  const userRole = ctx.session.user.role as UserRole
  
  if (userRole !== UserRole.SUPER_ADMIN) {
    logger.warn('Admin access denied', {
      userId: ctx.session.user.id,
      churchId: ctx.session.user.churchId,
      action: 'admin_access_denied',
      metadata: {
        userRole,
        requiredRole: 'SUPER_ADMIN'
      }
    })
    throw new TRPCError({ code: 'FORBIDDEN' })
  }
  
  logger.debug('Admin access granted', {
    userId: ctx.session.user.id,
    churchId: ctx.session.user.churchId,
    action: 'admin_access_granted',
    metadata: { userRole }
  })
  
  return next({ ctx })
})

export const managerProcedure = protectedProcedure.use(({ ctx, next }) => {
  const userRole = ctx.session.user.role as UserRole
  const allowedRoles = [
    UserRole.SUPER_ADMIN,
    UserRole.FINANCIAL_MANAGER,
    UserRole.MINISTER,
    UserRole.COMMITTEE_CHAIR,
    'DEPARTMENT_HEAD' as UserRole,
  ]
  
  if (!allowedRoles.includes(userRole)) {
    logger.warn('Manager access denied', {
      userId: ctx.session.user.id,
      churchId: ctx.session.user.churchId,
      action: 'manager_access_denied',
      metadata: {
        userRole,
        allowedRoles: allowedRoles.join(', ')
      }
    })
    throw new TRPCError({ code: 'FORBIDDEN' })
  }
  
  logger.debug('Manager access granted', {
    userId: ctx.session.user.id,
    churchId: ctx.session.user.churchId,
    action: 'manager_access_granted',
    metadata: { userRole }
  })
  
  return next({ ctx })
})