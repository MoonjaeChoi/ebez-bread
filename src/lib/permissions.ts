import { AbilityBuilder, createMongoAbility, MongoAbility } from '@casl/ability'

export type AppAbility = MongoAbility

// 사용자 역할 타입
export type UserRole = 
  | 'SUPER_ADMIN'
  | 'FINANCIAL_MANAGER' 
  | 'MINISTER'
  | 'COMMITTEE_CHAIR'
  | 'DEPARTMENT_HEAD'
  | 'DEPARTMENT_ACCOUNTANT'
  | 'GENERAL_USER'

// 액션 타입
export type Action = 
  | 'manage'
  | 'create'
  | 'read'
  | 'update' 
  | 'delete'
  | 'approve'
  | 'reject'

// 리소스 타입
export type Subject = 
  | 'all'
  | 'Member'
  | 'Offering'
  | 'ExpenseReport'
  | 'User'
  | 'Church'
  | 'Position'
  | 'Department'
  | 'Attendance'
  | 'Visitation'
  | 'AccountCode'

export interface User {
  id: string
  role: UserRole
  churchId: string
  departmentId?: string
}

export function defineAbilityFor(user: User) {
  const { can, cannot, build } = new AbilityBuilder(createMongoAbility)

  switch (user.role) {
    case 'SUPER_ADMIN':
      // 슈퍼 관리자는 모든 권한
      can('manage', 'all')
      break

    case 'FINANCIAL_MANAGER':
      // 재정 담당자 권한
      can(['read', 'create', 'update'], 'Offering')
      can(['read', 'create', 'update', 'approve', 'reject'], 'ExpenseReport')
      can('read', 'Member', ['name', 'phone', 'email']) // 제한된 개인정보만
      can(['read', 'create', 'update'], 'AccountCode')
      can('read', 'Church')
      can('read', 'Position')
      can('read', 'Department')
      break

    case 'MINISTER':
      // 교역자 권한
      can(['read', 'create', 'update'], 'Member')
      can(['read', 'create', 'update'], 'Visitation')
      can(['read', 'create', 'update'], 'Attendance')
      can('read', 'Offering', ['amount', 'offeringType', 'offeringDate']) // 헌금 통계만
      can('read', 'ExpenseReport', { departmentId: user.departmentId }) // 자신 부서만
      can(['read', 'create', 'update'], 'Position')
      can(['read', 'create', 'update'], 'Department')
      can('read', 'Church')
      break

    case 'COMMITTEE_CHAIR':
      // 위원장 권한 (교역자와 유사하지만 재정 승인 권한 추가)
      can(['read', 'create', 'update'], 'Member')
      can(['read', 'create', 'update'], 'Visitation')
      can(['read', 'create', 'update'], 'Attendance')
      can('read', 'Offering')
      can(['read', 'approve', 'reject'], 'ExpenseReport')
      can(['read', 'create', 'update'], 'Position')
      can(['read', 'create', 'update'], 'Department')
      can('read', 'Church')
      break

    case 'DEPARTMENT_HEAD':
      // 부서장 권한
      can('read', 'Member', { departmentId: user.departmentId })
      can(['read', 'create', 'update'], 'Attendance', { departmentId: user.departmentId })
      can(['read', 'create'], 'ExpenseReport', { departmentId: user.departmentId })
      can('read', 'Offering', ['offeringType', 'offeringDate']) // 개인 헌금액은 제외
      can('read', 'Position')
      can('read', 'Department')
      can('read', 'Church')
      break

    case 'DEPARTMENT_ACCOUNTANT':
      // 부서 회계 권한
      can('read', 'Member', { departmentId: user.departmentId })
      can(['read', 'create', 'update'], 'Offering', { departmentId: user.departmentId })
      can(['read', 'create'], 'ExpenseReport', { departmentId: user.departmentId })
      can('read', 'AccountCode')
      can('read', 'Position')
      can('read', 'Department')
      can('read', 'Church')
      break

    case 'GENERAL_USER':
      // 일반 사용자 권한 (최소한의 조회 권한)
      can('read', 'Member', { id: user.id }) // 본인 정보만
      can('read', 'Church')
      can('read', 'Position')
      can('read', 'Department')
      break

    default:
      // 기본적으로 권한 없음
      break
  }

  return build()
}

// 권한 체크 유틸리티 함수들
export function canAccessMembers(userRole: UserRole): boolean {
  return ['SUPER_ADMIN', 'MINISTER', 'COMMITTEE_CHAIR', 'DEPARTMENT_HEAD'].includes(userRole)
}

export function canManageFinances(userRole: UserRole): boolean {
  return ['SUPER_ADMIN', 'FINANCIAL_MANAGER', 'COMMITTEE_CHAIR'].includes(userRole)
}

export function canApproveExpenses(userRole: UserRole): boolean {
  if (!userRole) {
    return false
  }
  return ['SUPER_ADMIN', 'FINANCIAL_MANAGER', 'COMMITTEE_CHAIR'].includes(userRole)
}

export function canManageUsers(userRole: UserRole): boolean {
  return ['SUPER_ADMIN'].includes(userRole)
}

export function canViewAllData(userRole: UserRole): boolean {
  return ['SUPER_ADMIN', 'FINANCIAL_MANAGER', 'MINISTER'].includes(userRole)
}

export function canManageVisitations(userRole: UserRole): boolean {
  return ['SUPER_ADMIN', 'MINISTER', 'COMMITTEE_CHAIR'].includes(userRole)
}

// 역할별 메뉴 접근 권한
export function getAccessibleMenus(userRole: UserRole) {
  const menus = {
    dashboard: true, // 모든 사용자 접근 가능
    members: canAccessMembers(userRole),
    finances: canManageFinances(userRole),
    expenses: ['SUPER_ADMIN', 'FINANCIAL_MANAGER', 'MINISTER', 'COMMITTEE_CHAIR', 'DEPARTMENT_HEAD', 'DEPARTMENT_ACCOUNTANT'].includes(userRole),
    attendance: ['SUPER_ADMIN', 'MINISTER', 'COMMITTEE_CHAIR', 'DEPARTMENT_HEAD'].includes(userRole),
    visitations: canManageVisitations(userRole),
    reports: ['SUPER_ADMIN', 'FINANCIAL_MANAGER', 'MINISTER', 'COMMITTEE_CHAIR'].includes(userRole),
    admin: canManageUsers(userRole),
  }

  return menus
}

// 역할 이름을 한국어로 변환
export function getRoleDisplayName(role: UserRole): string {
  const roleNames: Record<UserRole, string> = {
    SUPER_ADMIN: '슈퍼 관리자',
    FINANCIAL_MANAGER: '재정 담당자',
    MINISTER: '교역자',
    COMMITTEE_CHAIR: '위원장',
    DEPARTMENT_HEAD: '부서장',
    DEPARTMENT_ACCOUNTANT: '부서 회계',
    GENERAL_USER: '일반 사용자',
  }

  return roleNames[role] || role
}