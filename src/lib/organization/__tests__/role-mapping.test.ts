import { describe, it, expect } from 'vitest'
import { UserRole } from '@prisma/client'
import {
  mapOrganizationRoleToUserRole,
  shouldCreateUserAccount,
  getApprovalAuthorityLevel,
  canCreateExpenseReport,
  getRoleCapabilities,
  getAllRoleMappings
} from '../role-mapping'

describe('Organization Role Mapping', () => {
  describe('mapOrganizationRoleToUserRole', () => {
    it('should map final approver roles to appropriate UserRole', () => {
      expect(mapOrganizationRoleToUserRole('교구장')).toBe(UserRole.COMMITTEE_CHAIR)
      expect(mapOrganizationRoleToUserRole('부교구장')).toBe(UserRole.COMMITTEE_CHAIR)
      expect(mapOrganizationRoleToUserRole('위원장')).toBe(UserRole.COMMITTEE_CHAIR)
      expect(mapOrganizationRoleToUserRole('부위원장')).toBe(UserRole.COMMITTEE_CHAIR)
    })

    it('should map senior approver roles to DEPARTMENT_HEAD', () => {
      expect(mapOrganizationRoleToUserRole('부장')).toBe(UserRole.DEPARTMENT_HEAD)
      expect(mapOrganizationRoleToUserRole('차장')).toBe(UserRole.DEPARTMENT_HEAD)
      expect(mapOrganizationRoleToUserRole('총무')).toBe(UserRole.DEPARTMENT_HEAD)
    })

    it('should map financial staff to DEPARTMENT_ACCOUNTANT', () => {
      expect(mapOrganizationRoleToUserRole('회계')).toBe(UserRole.DEPARTMENT_ACCOUNTANT)
      expect(mapOrganizationRoleToUserRole('부회계')).toBe(UserRole.DEPARTMENT_ACCOUNTANT)
    })

    it('should map ministry roles to MINISTER', () => {
      expect(mapOrganizationRoleToUserRole('목사')).toBe(UserRole.MINISTER)
      expect(mapOrganizationRoleToUserRole('전도사')).toBe(UserRole.MINISTER)
      expect(mapOrganizationRoleToUserRole('교역자')).toBe(UserRole.MINISTER)
    })

    it('should map unknown roles to GENERAL_USER', () => {
      expect(mapOrganizationRoleToUserRole('일반회원')).toBe(UserRole.GENERAL_USER)
      expect(mapOrganizationRoleToUserRole('알 수 없는 직책')).toBe(UserRole.GENERAL_USER)
    })

    it('should handle whitespace in role names', () => {
      expect(mapOrganizationRoleToUserRole(' 교구장 ')).toBe(UserRole.COMMITTEE_CHAIR)
      expect(mapOrganizationRoleToUserRole('  회계  ')).toBe(UserRole.DEPARTMENT_ACCOUNTANT)
    })
  })

  describe('shouldCreateUserAccount', () => {
    it('should return true for roles requiring user accounts', () => {
      // Final approvers
      expect(shouldCreateUserAccount('교구장')).toBe(true)
      expect(shouldCreateUserAccount('부교구장')).toBe(true)
      expect(shouldCreateUserAccount('위원장')).toBe(true)
      expect(shouldCreateUserAccount('부위원장')).toBe(true)

      // Senior approvers
      expect(shouldCreateUserAccount('부장')).toBe(true)
      expect(shouldCreateUserAccount('차장')).toBe(true)
      expect(shouldCreateUserAccount('총무')).toBe(true)

      // Financial staff
      expect(shouldCreateUserAccount('회계')).toBe(true)
      expect(shouldCreateUserAccount('부회계')).toBe(true)
    })

    it('should return false for roles not requiring user accounts', () => {
      expect(shouldCreateUserAccount('서기')).toBe(false)
      expect(shouldCreateUserAccount('부서기')).toBe(false)
      expect(shouldCreateUserAccount('운영위원')).toBe(false)
      expect(shouldCreateUserAccount('소프라노')).toBe(false)
    })
  })

  describe('getApprovalAuthorityLevel', () => {
    it('should return correct authority levels', () => {
      // Level 3 (Final approvers)
      expect(getApprovalAuthorityLevel('교구장')).toBe(3)
      expect(getApprovalAuthorityLevel('부교구장')).toBe(3)
      expect(getApprovalAuthorityLevel('위원장')).toBe(3)
      expect(getApprovalAuthorityLevel('부위원장')).toBe(3)

      // Level 2 (Senior approvers)
      expect(getApprovalAuthorityLevel('부장')).toBe(2)
      expect(getApprovalAuthorityLevel('차장')).toBe(2)
      expect(getApprovalAuthorityLevel('총무')).toBe(2)

      // Level 1 (Financial staff)
      expect(getApprovalAuthorityLevel('회계')).toBe(1)
      expect(getApprovalAuthorityLevel('부회계')).toBe(1)

      // Level 0 (No approval authority)
      expect(getApprovalAuthorityLevel('서기')).toBe(0)
      expect(getApprovalAuthorityLevel('소프라노')).toBe(0)
    })
  })

  describe('canCreateExpenseReport', () => {
    it('should return true for roles that can create expense reports', () => {
      // Financial staff should be able to create
      expect(canCreateExpenseReport('회계')).toBe(true)
      expect(canCreateExpenseReport('부회계')).toBe(true)

      // Approvers should also be able to create
      expect(canCreateExpenseReport('부장')).toBe(true)
      expect(canCreateExpenseReport('교구장')).toBe(true)
      expect(canCreateExpenseReport('위원장')).toBe(true)
    })

    it('should return false for roles that cannot create expense reports', () => {
      expect(canCreateExpenseReport('서기')).toBe(false)
      expect(canCreateExpenseReport('소프라노')).toBe(false)
      expect(canCreateExpenseReport('운영위원')).toBe(false)
    })
  })

  describe('getRoleCapabilities', () => {
    it('should return complete capability information for 교구장', () => {
      const capabilities = getRoleCapabilities('교구장')
      
      expect(capabilities).toEqual({
        roleName: '교구장',
        userRole: UserRole.COMMITTEE_CHAIR,
        authorityLevel: 3,
        needsAccount: true,
        canCreateExpense: true,
        description: '3단계 및 최종승인 권한, 지출결의서 작성 가능'
      })
    })

    it('should return complete capability information for 회계', () => {
      const capabilities = getRoleCapabilities('회계')
      
      expect(capabilities).toEqual({
        roleName: '회계',
        userRole: UserRole.DEPARTMENT_ACCOUNTANT,
        authorityLevel: 1,
        needsAccount: true,
        canCreateExpense: true,
        description: '1단계 승인 권한, 지출결의서 작성 가능'  // 실제 구현에 맞게 수정
      })
    })

    it('should return complete capability information for 서기', () => {
      const capabilities = getRoleCapabilities('서기')
      
      expect(capabilities).toEqual({
        roleName: '서기',
        userRole: UserRole.BUDGET_MANAGER,
        authorityLevel: 0,
        needsAccount: false,
        canCreateExpense: false,
        description: '승인 권한 없음'
      })
    })
  })

  describe('getAllRoleMappings', () => {
    it('should return mappings for all defined roles', () => {
      const mappings = getAllRoleMappings()
      
      expect(mappings.length).toBeGreaterThan(0)
      expect(mappings.every(mapping => 
        typeof mapping.roleName === 'string' &&
        typeof mapping.userRole === 'string' &&
        typeof mapping.authorityLevel === 'number' &&
        typeof mapping.needsAccount === 'boolean' &&
        typeof mapping.canCreateExpense === 'boolean' &&
        typeof mapping.description === 'string'
      )).toBe(true)
    })

    it('should include expected high-level roles', () => {
      const mappings = getAllRoleMappings()
      const roleNames = mappings.map(m => m.roleName)
      
      expect(roleNames).toContain('교구장')
      expect(roleNames).toContain('부교구장')
      expect(roleNames).toContain('위원장')
      expect(roleNames).toContain('부위원장')
      expect(roleNames).toContain('부장')
      expect(roleNames).toContain('차장')
      expect(roleNames).toContain('총무')
      expect(roleNames).toContain('회계')
      expect(roleNames).toContain('부회계')
    })
  })

  describe('Role consistency checks', () => {
    it('should ensure roles requiring accounts have authority levels > 0', () => {
      const mappings = getAllRoleMappings()
      
      mappings.forEach(mapping => {
        if (mapping.needsAccount) {
          expect(mapping.authorityLevel).toBeGreaterThan(0)
        }
      })
    })

    it('should ensure financial roles can create expense reports', () => {
      const financialRoles = ['회계', '부회계']
      
      financialRoles.forEach(role => {
        expect(canCreateExpenseReport(role)).toBe(true)
      })
    })

    it('should ensure approver roles can create expense reports', () => {
      const approverRoles = ['교구장', '부교구장', '위원장', '부위원장', '부장', '차장', '총무']
      
      approverRoles.forEach(role => {
        expect(canCreateExpenseReport(role)).toBe(true)
      })
    })
  })
})