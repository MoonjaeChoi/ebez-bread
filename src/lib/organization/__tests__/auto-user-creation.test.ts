import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { UserRole } from '@prisma/client'
import { createUserAccountIfNeeded } from '../auto-user-creation'

// Mock dependencies
vi.mock('@/lib/password', () => ({
  hashPassword: vi.fn().mockResolvedValue('hashed_password_123')
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}))

// Mock Prisma client
const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    create: vi.fn()
  }
}

// Mock data
const mockMember = {
  id: 'member-123',
  name: '김철수',
  email: 'kimcs@example.com',
  phone: '010-1234-5678'
}

const mockOrganizationRole = {
  id: 'role-123',
  name: '교구장',
  englishName: 'District Head',
  level: 65,
  isLeadership: true,
  description: '교구 담당자',
  isActive: true,
  sortOrder: 65,
  churchId: 'church-123',
  createdAt: new Date(),
  updatedAt: new Date()
}

const mockOrganizationRoleNonLeader = {
  id: 'role-456',
  name: '소프라노',
  englishName: 'Soprano',
  level: 15,
  isLeadership: false,
  description: '소프라노 파트',
  isActive: true,
  sortOrder: 15,
  churchId: 'church-123',
  createdAt: new Date(),
  updatedAt: new Date()
}

describe('Auto User Creation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Set default mock implementations
    mockPrisma.user.findUnique.mockResolvedValue(null)
    mockPrisma.user.create.mockResolvedValue({
      id: 'user-123',
      email: mockMember.email,
      name: mockMember.name,
      role: UserRole.COMMITTEE_CHAIR,
      passwordChangeRequired: true,
      churchId: 'church-123'
    })
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('createUserAccountIfNeeded', () => {
    it('should create user account for leadership role', async () => {
      const result = await createUserAccountIfNeeded(
        mockPrisma,
        mockMember,
        mockOrganizationRole,
        'church-123'
      )

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: mockMember.email }
      })

      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          email: mockMember.email,
          name: mockMember.name,
          phone: mockMember.phone,
          role: UserRole.COMMITTEE_CHAIR,
          password: 'hashed_password_123',
          passwordChangeRequired: true,
          lastPasswordChange: null,
          churchId: 'church-123',
          isActive: true
        }
      })

      expect(result).toEqual({
        id: 'user-123',
        email: mockMember.email,
        name: mockMember.name,
        role: UserRole.COMMITTEE_CHAIR,
        passwordChangeRequired: true,
        churchId: 'church-123'
      })
    })

    it('should not create user account for non-leadership role', async () => {
      const result = await createUserAccountIfNeeded(
        mockPrisma,
        mockMember,
        mockOrganizationRoleNonLeader,
        'church-123'
      )

      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled()
      expect(mockPrisma.user.create).not.toHaveBeenCalled()
      expect(result).toBe(null)
    })

    it('should return existing user if already exists', async () => {
      const existingUser = {
        id: 'existing-user-123',
        email: mockMember.email,
        name: mockMember.name,
        role: UserRole.DEPARTMENT_HEAD
      }

      mockPrisma.user.findUnique.mockResolvedValue(existingUser)

      const result = await createUserAccountIfNeeded(
        mockPrisma,
        mockMember,
        mockOrganizationRole,
        'church-123'
      )

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: mockMember.email }
      })

      expect(mockPrisma.user.create).not.toHaveBeenCalled()
      expect(result).toBe(existingUser)
    })

    it('should not create user account if member has no email', async () => {
      const memberWithoutEmail = {
        ...mockMember,
        email: null
      }

      const result = await createUserAccountIfNeeded(
        mockPrisma,
        memberWithoutEmail,
        mockOrganizationRole,
        'church-123'
      )

      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled()
      expect(mockPrisma.user.create).not.toHaveBeenCalled()
      expect(result).toBe(null)
    })

    it('should handle different role mappings correctly', async () => {
      const testCases = [
        {
          roleName: '부장',
          expectedUserRole: UserRole.DEPARTMENT_HEAD
        },
        {
          roleName: '회계',
          expectedUserRole: UserRole.DEPARTMENT_ACCOUNTANT
        },
        {
          roleName: '총무',
          expectedUserRole: UserRole.DEPARTMENT_HEAD
        }
      ]

      for (const testCase of testCases) {
        vi.clearAllMocks()
        mockPrisma.user.findUnique.mockResolvedValue(null)
        mockPrisma.user.create.mockResolvedValue({
          id: 'user-123',
          role: testCase.expectedUserRole
        })

        const role = {
          ...mockOrganizationRole,
          name: testCase.roleName
        }

        await createUserAccountIfNeeded(
          mockPrisma,
          mockMember,
          role,
          'church-123'
        )

        expect(mockPrisma.user.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            role: testCase.expectedUserRole
          })
        })
      }
    })

    it('should handle errors gracefully', async () => {
      const error = new Error('Database connection failed')
      mockPrisma.user.findUnique.mockRejectedValue(error)

      await expect(
        createUserAccountIfNeeded(
          mockPrisma,
          mockMember,
          mockOrganizationRole,
          'church-123'
        )
      ).rejects.toThrow('Database connection failed')
    })

    it('should set passwordChangeRequired to true for new accounts', async () => {
      await createUserAccountIfNeeded(
        mockPrisma,
        mockMember,
        mockOrganizationRole,
        'church-123'
      )

      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          passwordChangeRequired: true,
          lastPasswordChange: null
        })
      })
    })

    it('should handle member with empty string email', async () => {
      const memberWithEmptyEmail = {
        ...mockMember,
        email: ''
      }

      const result = await createUserAccountIfNeeded(
        mockPrisma,
        memberWithEmptyEmail,
        mockOrganizationRole,
        'church-123'
      )

      expect(result).toBe(null)
      expect(mockPrisma.user.create).not.toHaveBeenCalled()
    })
  })

  describe('Role-based account creation rules', () => {
    const testRoles = [
      // Should create accounts
      { name: '교구장', shouldCreate: true, level: 3 },
      { name: '부교구장', shouldCreate: true, level: 3 },
      { name: '위원장', shouldCreate: true, level: 3 },
      { name: '부위원장', shouldCreate: true, level: 3 },
      { name: '부장', shouldCreate: true, level: 2 },
      { name: '차장', shouldCreate: true, level: 2 },
      { name: '총무', shouldCreate: true, level: 2 },
      { name: '회계', shouldCreate: true, level: 1 },
      { name: '부회계', shouldCreate: true, level: 1 },

      // Should not create accounts
      { name: '서기', shouldCreate: false, level: 0 },
      { name: '부서기', shouldCreate: false, level: 0 },
      { name: '소프라노', shouldCreate: false, level: 0 },
      { name: '알토', shouldCreate: false, level: 0 },
      { name: '운영위원', shouldCreate: false, level: 0 }
    ]

    testRoles.forEach(({ name, shouldCreate }) => {
      it(`should ${shouldCreate ? 'create' : 'not create'} account for ${name}`, async () => {
        const role = {
          ...mockOrganizationRole,
          name
        }

        const result = await createUserAccountIfNeeded(
          mockPrisma,
          mockMember,
          role,
          'church-123'
        )

        if (shouldCreate) {
          expect(mockPrisma.user.create).toHaveBeenCalled()
          expect(result).not.toBe(null)
        } else {
          expect(mockPrisma.user.create).not.toHaveBeenCalled()
          expect(result).toBe(null)
        }
      })
    })
  })
})