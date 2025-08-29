'use client'

import { useState, useCallback } from 'react'
import { signIn, signOut, getSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { logger } from '@/lib/logger'

export type AuthLoadingState = 'idle' | 'authenticating' | 'redirecting' | 'signing_out'

export interface LoginCredentials {
  email: string
  password: string
}

export interface UseAuthReturn {
  loadingState: AuthLoadingState
  error: string | null
  login: (credentials: LoginCredentials) => Promise<boolean>
  logout: () => Promise<void>
  isLoading: boolean
}

// Enhanced error messages for better UX
const AUTH_ERROR_MESSAGES = {
  CredentialsSignin: '이메일 또는 비밀번호가 올바르지 않습니다.',
  OAuthSignin: '소셜 로그인 중 오류가 발생했습니다.',
  OAuthCallback: '인증 콜백 처리 중 오류가 발생했습니다.',
  OAuthCreateAccount: '계정 생성 중 오류가 발생했습니다.',
  EmailCreateAccount: '이메일 계정 생성 중 오류가 발생했습니다.',
  Callback: '인증 콜백 처리 실패했습니다.',
  OAuthAccountNotLinked: '이미 다른 방법으로 등록된 계정입니다.',
  EmailSignin: '이메일 로그인 중 오류가 발생했습니다.',
  CredentialsSignup: '계정 생성 중 오류가 발생했습니다.',
  SessionRequired: '로그인이 필요합니다.',
  AccessDenied: '접근이 거부되었습니다.',
  Verification: '인증 토큰이 만료되었거나 잘못되었습니다.',
  Default: '로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
} as const

export function useAuth(): UseAuthReturn {
  const router = useRouter()
  const [loadingState, setLoadingState] = useState<AuthLoadingState>('idle')
  const [error, setError] = useState<string | null>(null)

  const isLoading = loadingState !== 'idle'

  const login = useCallback(async (credentials: LoginCredentials): Promise<boolean> => {
    try {
      setLoadingState('authenticating')
      setError(null)

      // Log login attempt
      logger.info('User login attempt initiated', {
        action: 'login_attempt',
        metadata: {
          email: credentials.email,
          timestamp: new Date().toISOString()
        }
      })

      // Add slight delay for better UX perception
      await new Promise(resolve => setTimeout(resolve, 100))

      const result = await signIn('credentials', {
        email: credentials.email.toLowerCase().trim(),
        password: credentials.password,
        redirect: false,
      })

      if (result?.error) {
        const errorKey = result.error as keyof typeof AUTH_ERROR_MESSAGES
        const errorMessage = AUTH_ERROR_MESSAGES[errorKey] || AUTH_ERROR_MESSAGES.Default
        
        logger.warn('Login attempt failed', {
          action: 'login_failed',
          metadata: {
            email: credentials.email,
            error: result.error,
            timestamp: new Date().toISOString()
          }
        })
        
        setError(errorMessage)
        setLoadingState('idle')
        return false
      }

      if (!result?.ok) {
        setError(AUTH_ERROR_MESSAGES.Default)
        setLoadingState('idle')
        return false
      }

      setLoadingState('redirecting')

      // Verify session establishment
      const session = await getSession()
      if (session?.user) {
        logger.info('User login successful', {
          userId: session.user.id,
          churchId: session.user.churchId,
          action: 'login_success',
          metadata: {
            email: session.user.email,
            role: session.user.role,
            timestamp: new Date().toISOString()
          }
        })

        // Use replace to prevent back navigation to login
        router.replace('/dashboard')
        
        // Force refresh to ensure all components are updated with new session
        setTimeout(() => {
          router.refresh()
        }, 100)
        
        return true
      } else {
        throw new Error('Session verification failed after successful authentication')
      }
    } catch (error) {
      logger.error('Authentication error', error as Error, {
        action: 'auth_error',
        metadata: {
          email: credentials.email,
          timestamp: new Date().toISOString()
        }
      })
      
      setError(AUTH_ERROR_MESSAGES.Default)
      setLoadingState('idle')
      return false
    }
  }, [router])

  const logout = useCallback(async (): Promise<void> => {
    try {
      setLoadingState('signing_out')
      setError(null)

      logger.info('User logout initiated', {
        action: 'logout_attempt',
        metadata: {
          timestamp: new Date().toISOString()
        }
      })

      // Sign out and redirect to home
      await signOut({ 
        redirect: true,
        callbackUrl: '/' 
      })

      // This will typically not execute due to redirect, but kept for completeness
      setLoadingState('idle')
    } catch (error) {
      logger.error('Logout error', error as Error, {
        action: 'logout_error',
        metadata: {
          timestamp: new Date().toISOString()
        }
      })
      
      setError('로그아웃 중 오류가 발생했습니다.')
      setLoadingState('idle')
    }
  }, [])

  return {
    loadingState,
    error,
    login,
    logout,
    isLoading,
  }
}