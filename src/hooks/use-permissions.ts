'use client'

import { useSession } from 'next-auth/react'
import { useMemo } from 'react'
import { defineAbilityFor, getAccessibleMenus, getRoleDisplayName, type UserRole } from '@/lib/permissions'

export function usePermissions() {
  const { data: session } = useSession()

  const ability = useMemo(() => {
    if (!session?.user) {
      return null
    }

    return defineAbilityFor({
      id: session.user.id,
      role: session.user.role as UserRole,
      churchId: session.user.churchId,
      // TODO: departmentId를 세션에서 가져오도록 수정 필요
    })
  }, [session])

  const accessibleMenus = useMemo(() => {
    if (!session?.user?.role) {
      return {
        dashboard: false,
        members: false,
        finances: false,
        expenses: false,
        attendance: false,
        visitations: false,
        reports: false,
        admin: false,
      }
    }

    return getAccessibleMenus(session.user.role as UserRole)
  }, [session?.user?.role])

  const roleDisplayName = useMemo(() => {
    if (!session?.user?.role) {
      return ''
    }

    return getRoleDisplayName(session.user.role as UserRole)
  }, [session?.user?.role])

  return {
    ability,
    accessibleMenus,
    roleDisplayName,
    user: session?.user,
    isAuthenticated: !!session,
  }
}

// 특정 액션에 대한 권한 체크 훅
export function useCanAccess(action: string, subject: string) {
  const { ability } = usePermissions()

  return useMemo(() => {
    if (!ability) {
      return false
    }

    return ability.can(action, subject)
  }, [ability, action, subject])
}