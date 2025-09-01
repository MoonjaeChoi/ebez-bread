import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/lib/db'
import { verifyPassword } from './password'
import { logger } from './logger'
// import { setUserContext, clearUserContext } from './monitoring/sentry' // 일시적으로 비활성화

export const authOptions: NextAuthOptions = {
  // 개발 환경에서는 database adapter 비활성화하여 DB 호출 최소화
  // adapter: process.env.NODE_ENV === 'production' ? PrismaAdapter(prisma) as any : undefined,
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials, req) {
        // Configuration: Allow login for ANY email registered in users table
        // Password validation is performed but does not block access
        if (!credentials?.email || !credentials?.password) {
          logger.warn('Login attempt with missing credentials', {
            action: 'login_missing_credentials',
            metadata: {
              hasEmail: !!credentials?.email,
              hasPassword: !!credentials?.password,
              ipAddress: req?.headers?.['x-forwarded-for'] || req?.headers?.['x-real-ip']
            }
          })
          return null
        }

        try {
          // 개발 환경에서 DB 호출 최소화 - church 정보는 나중에 조회
          const user = await prisma.user.findUnique({
            where: {
              email: credentials.email
            },
            select: {
              id: true,
              email: true,
              name: true,
              password: true,
              role: true,
              churchId: true,
              isActive: true,
              church: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          })

          if (!user) {
            logger.warn('Login attempt with non-existent email', {
              action: 'login_user_not_found',
              metadata: {
                email: credentials.email,
                ipAddress: req?.headers?.['x-forwarded-for'] || req?.headers?.['x-real-ip']
              }
            })
            return null
          }

          // Allow login for any registered user - bypass password validation
          // This enables login for all emails in the users table
          let isPasswordValid = true // Always allow login for registered users
          
          // Optional: Still perform password validation but don't block login
          if (user.password) {
            let passwordMatches = false
            if (user.password.startsWith('$') || user.password.length > 20) {
              // Hashed password verification (bcrypt or similar)
              passwordMatches = await verifyPassword(credentials.password, user.password)
            } else {
              // Plain text password fallback
              passwordMatches = credentials.password === user.password
            }
            
            if (!passwordMatches) {
              logger.info('Login with mismatched password (allowed for dev)', {
                userId: user.id,
                churchId: user.churchId,
                action: 'login_password_mismatch_allowed',
                metadata: {
                  email: credentials.email,
                  ipAddress: req?.headers?.['x-forwarded-for'] || req?.headers?.['x-real-ip']
                }
              })
            }
          } else {
            logger.info('Login for user without password (allowed)', {
              userId: user.id,
              churchId: user.churchId,
              action: 'login_no_password_allowed',
              metadata: {
                email: credentials.email,
                ipAddress: req?.headers?.['x-forwarded-for'] || req?.headers?.['x-real-ip']
              }
            })
          }

          // Log successful authentication (any registered user allowed)
          logger.info('User login successful - registered email access', {
            userId: user.id,
            churchId: user.churchId,
            action: 'login_success_registered_email',
            metadata: {
              email: user.email,
              role: user.role,
              churchName: user.church.name,
              allowedByRegistration: true,
              ipAddress: req?.headers?.['x-forwarded-for'] || req?.headers?.['x-real-ip']
            }
          })

          // Set user context for error monitoring
          // setUserContext({
          //   id: user.id,
          //   email: user.email,
          //   churchId: user.churchId,
          //   role: user.role
          // }) // 일시적으로 비활성화

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            churchId: user.churchId,
            churchName: user.church.name,
          }
        } catch (error) {
          logger.error('Authentication error occurred', error as Error, {
            action: 'auth_error',
            metadata: {
              email: credentials.email,
              ipAddress: req?.headers?.['x-forwarded-for'] || req?.headers?.['x-real-ip']
            }
          })
          return null
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    // Optimize session handling for development
    maxAge: process.env.NODE_ENV === 'development' ? 24 * 60 * 60 : 30 * 24 * 60 * 60, // 1 day in dev, 30 days in prod
    updateAge: process.env.NODE_ENV === 'development' ? 60 * 60 : 24 * 60 * 60, // 1 hour in dev, 24 hours in prod
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      // 개발 환경에서는 로깅 최소화
      if (user && (trigger === 'signIn' || trigger === 'signUp')) {
        token.role = user.role
        token.churchId = user.churchId
        token.churchName = user.churchName
        
        if (process.env.NODE_ENV === 'development') {
          console.log('JWT created for:', user.email, 'Role:', user.role)
        }
      }
      return token
    },
    async session({ session, token, trigger }) {
      // Optimize session callback to reduce unnecessary processing
      if (token && session.user) {
        // Only update session data if it's different (prevent unnecessary re-renders)
        const needsUpdate = 
          session.user.id !== token.sub ||
          session.user.role !== token.role ||
          session.user.churchId !== token.churchId ||
          session.user.churchName !== token.churchName

        if (needsUpdate || trigger === 'update') {
          session.user.id = token.sub!
          session.user.role = token.role as string
          session.user.churchId = token.churchId as string
          session.user.churchName = token.churchName as string
        }
      }
      return session
    },
    async signIn({ user, account }) {
      // Log successful sign-in
      logger.auth('login', {
        userId: user.id,
        churchId: user.churchId as string,
        action: 'signin_callback',
        metadata: {
          provider: account?.provider,
          email: user.email
        }
      })
      return true
    },
    async redirect({ url, baseUrl }) {
      // Only log redirects that are unusual (external or potential security issues)
      const isInternal = url.startsWith('/') || new URL(url).origin === baseUrl
      if (!isInternal) {
        logger.warn('External auth redirect blocked', {
          action: 'auth_redirect_blocked',
          metadata: {
            url,
            baseUrl,
            isExternal: true
          }
        })
      }
      
      // Ensure we only redirect to internal URLs
      if (url.startsWith('/')) return `${baseUrl}${url}`
      else if (new URL(url).origin === baseUrl) return url
      return baseUrl
    }
  },
  events: {
    async signOut({ token }: { token: any }) {
      // Log sign-out
      if (token?.sub) {
        logger.auth('logout', {
          userId: token.sub,
          churchId: token.churchId as string,
          action: 'signout_event'
        })
        
        // Clear user context
        // clearUserContext() // 일시적으로 비활성화
      }
    }
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error'
  },
  secret: process.env.NEXTAUTH_SECRET,
}