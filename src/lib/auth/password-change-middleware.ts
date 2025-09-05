import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

/**
 * 비밀번호 변경이 필요한 사용자를 확인하고 리다이렉트하는 미들웨어
 */

// 비밀번호 변경이 필요 없는 경로들
const EXCLUDED_PATHS = [
  '/auth/signin',
  '/auth/signout', 
  '/auth/error',
  '/api/auth',
  '/api/user/change-password',
  '/change-password',
  '/_next',
  '/favicon.ico',
  '/public',
  '/static'
]

/**
 * 요청 경로가 제외 목록에 포함되는지 확인
 */
function isExcludedPath(pathname: string): boolean {
  return EXCLUDED_PATHS.some(path => 
    pathname.startsWith(path) || pathname === path
  )
}

/**
 * 비밀번호 변경 필요 여부 확인 및 리다이렉트 처리
 */
export async function handlePasswordChangeRedirect(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 제외 경로는 건너뛰기
  if (isExcludedPath(pathname)) {
    return NextResponse.next()
  }

  try {
    // 현재 세션 확인
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.next()
    }

    // 사용자의 비밀번호 변경 필요 상태 확인
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        passwordChangeRequired: true,
        lastPasswordChange: true
      }
    })

    if (!user) {
      return NextResponse.next()
    }

    // 비밀번호 변경이 필요한 경우
    if (user.passwordChangeRequired) {
      // 이미 비밀번호 변경 페이지에 있으면 그대로 진행
      if (pathname === '/change-password') {
        return NextResponse.next()
      }

      // 비밀번호 변경 페이지로 리다이렉트
      const changePasswordUrl = new URL('/change-password', request.url)
      changePasswordUrl.searchParams.set('returnUrl', pathname)
      
      return NextResponse.redirect(changePasswordUrl)
    }

    // 일반 사용자는 그대로 진행
    return NextResponse.next()

  } catch (error) {
    console.error('Password change middleware error:', error)
    // 오류 발생 시에도 요청 진행 (시스템 안정성 우선)
    return NextResponse.next()
  }
}

/**
 * 비밀번호 변경 완료 처리
 */
export async function markPasswordChangeCompleted(userId: string) {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordChangeRequired: false,
        lastPasswordChange: new Date()
      }
    })

    return true
  } catch (error) {
    console.error('Failed to mark password change completed:', error)
    return false
  }
}

/**
 * 사용자에게 비밀번호 변경 필요 상태 설정
 */
export async function requirePasswordChange(userId: string) {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordChangeRequired: true
      }
    })

    return true
  } catch (error) {
    console.error('Failed to require password change:', error)
    return false
  }
}