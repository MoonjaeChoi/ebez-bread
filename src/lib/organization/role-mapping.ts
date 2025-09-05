import { UserRole } from '@prisma/client'

/**
 * 조직 직책에 따른 시스템 사용자 권한 매핑
 * 요구사항:
 * - 교구장, 부교구장, 위원장, 부위원장: 3단계 및 최종승인자 권한
 * - 부장, 차장, 총무: 2단계 승인자 권한  
 * - 회계, 부회계: 지출결의서 작성자 및 1단계 승인자 권한
 */

// 직책별 권한 레벨 정의
export const ROLE_AUTHORITY_LEVELS = {
  // 최고위급 - 3단계 및 최종승인 권한
  FINAL_APPROVER: ['교구장', '부교구장', '위원장', '부위원장'],
  
  // 고위급 - 2단계 승인 권한
  SENIOR_APPROVER: ['부장', '차장', '총무'],
  
  // 재정 담당 - 1단계 승인 및 지출결의서 작성 권한
  FINANCIAL_STAFF: ['회계', '부회계'],
  
  // 기타 중요 직책
  LEADERSHIP: ['회장', '단장', '교역자', '엘더', '교구권사'],
  
  // 일반 관리직
  MANAGEMENT: ['서기', '부서기', '임원', '대장'],
} as const

/**
 * 조직 직책명을 기반으로 적절한 UserRole을 반환
 */
export function mapOrganizationRoleToUserRole(roleName: string): UserRole {
  // 정규화: 공백 제거, 소문자 변환
  const normalizedRole = roleName.trim()

  // 최고위급 직책 (3단계 및 최종승인자)
  if (ROLE_AUTHORITY_LEVELS.FINAL_APPROVER.includes(normalizedRole as any)) {
    // 위원장급은 COMMITTEE_CHAIR
    if (normalizedRole.includes('위원장') || normalizedRole.includes('교구장')) {
      return UserRole.COMMITTEE_CHAIR
    }
    // 부위원장, 부교구장은 DEPARTMENT_HEAD
    return UserRole.DEPARTMENT_HEAD
  }

  // 고위급 직책 (2단계 승인자)
  if (ROLE_AUTHORITY_LEVELS.SENIOR_APPROVER.includes(normalizedRole as any)) {
    if (normalizedRole === '총무') {
      return UserRole.DEPARTMENT_HEAD // 총무는 부서장급 권한
    }
    return UserRole.DEPARTMENT_HEAD // 부장, 차장
  }

  // 재정 담당직 (1단계 승인 및 지출결의서)
  if (ROLE_AUTHORITY_LEVELS.FINANCIAL_STAFF.includes(normalizedRole as any)) {
    return UserRole.DEPARTMENT_ACCOUNTANT // 회계, 부회계
  }

  // 목회자급
  if (normalizedRole.includes('목사') || normalizedRole.includes('전도사') || normalizedRole === '교역자') {
    return UserRole.MINISTER
  }

  // 기타 리더십 직책
  if (ROLE_AUTHORITY_LEVELS.LEADERSHIP.includes(normalizedRole as any)) {
    return UserRole.DEPARTMENT_HEAD
  }

  // 관리직
  if (ROLE_AUTHORITY_LEVELS.MANAGEMENT.includes(normalizedRole as any)) {
    return UserRole.BUDGET_MANAGER
  }

  // 기본값: 일반 사용자
  return UserRole.GENERAL_USER
}

/**
 * 직책이 로그인 계정 생성이 필요한지 확인
 */
export function shouldCreateUserAccount(roleName: string): boolean {
  const normalizedRole = roleName.trim()
  
  return [
    ...ROLE_AUTHORITY_LEVELS.FINAL_APPROVER,
    ...ROLE_AUTHORITY_LEVELS.SENIOR_APPROVER,
    ...ROLE_AUTHORITY_LEVELS.FINANCIAL_STAFF,
  ].includes(normalizedRole as any)
}

/**
 * 직책별 결재 권한 레벨 반환
 */
export function getApprovalAuthorityLevel(roleName: string): number {
  const normalizedRole = roleName.trim()

  // 3단계 및 최종승인 권한
  if (ROLE_AUTHORITY_LEVELS.FINAL_APPROVER.includes(normalizedRole as any)) {
    return 3
  }

  // 2단계 승인 권한
  if (ROLE_AUTHORITY_LEVELS.SENIOR_APPROVER.includes(normalizedRole as any)) {
    return 2
  }

  // 1단계 승인 권한
  if (ROLE_AUTHORITY_LEVELS.FINANCIAL_STAFF.includes(normalizedRole as any)) {
    return 1
  }

  return 0 // 승인 권한 없음
}

/**
 * 지출결의서 작성 권한 확인
 */
export function canCreateExpenseReport(roleName: string): boolean {
  const normalizedRole = roleName.trim()
  
  return ROLE_AUTHORITY_LEVELS.FINANCIAL_STAFF.includes(normalizedRole as any) ||
         ROLE_AUTHORITY_LEVELS.SENIOR_APPROVER.includes(normalizedRole as any) ||
         ROLE_AUTHORITY_LEVELS.FINAL_APPROVER.includes(normalizedRole as any)
}

/**
 * 직책 정보 요약
 */
export function getRoleCapabilities(roleName: string) {
  const normalizedRole = roleName.trim()
  const userRole = mapOrganizationRoleToUserRole(normalizedRole)
  const authorityLevel = getApprovalAuthorityLevel(normalizedRole)
  const needsAccount = shouldCreateUserAccount(normalizedRole)
  const canCreateExpense = canCreateExpenseReport(normalizedRole)

  return {
    roleName: normalizedRole,
    userRole,
    authorityLevel,
    needsAccount,
    canCreateExpense,
    description: getAuthorityDescription(authorityLevel, canCreateExpense)
  }
}

/**
 * 권한 레벨에 따른 설명
 */
function getAuthorityDescription(level: number, canCreateExpense: boolean): string {
  let desc = ''
  
  switch (level) {
    case 3:
      desc = '3단계 및 최종승인 권한'
      break
    case 2:
      desc = '2단계 승인 권한'
      break
    case 1:
      desc = '1단계 승인 권한'
      break
    default:
      desc = '승인 권한 없음'
  }

  if (canCreateExpense && level > 0) {
    desc += ', 지출결의서 작성 가능'
  } else if (canCreateExpense) {
    desc = '지출결의서 작성 및 1단계 승인 권한'
  }

  return desc
}

/**
 * 테스트용 - 모든 직책의 권한 매핑 결과
 */
export function getAllRoleMappings() {
  const allRoles = [
    ...ROLE_AUTHORITY_LEVELS.FINAL_APPROVER,
    ...ROLE_AUTHORITY_LEVELS.SENIOR_APPROVER,
    ...ROLE_AUTHORITY_LEVELS.FINANCIAL_STAFF,
    ...ROLE_AUTHORITY_LEVELS.LEADERSHIP,
    ...ROLE_AUTHORITY_LEVELS.MANAGEMENT,
  ]

  return allRoles.map(role => getRoleCapabilities(role))
}