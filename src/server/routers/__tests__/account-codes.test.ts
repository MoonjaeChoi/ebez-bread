import { describe, it, expect, beforeEach } from 'vitest'
import { AccountType } from '@prisma/client'
import { createTRPCCaller, createAuthenticatedContext, createUnauthenticatedContext } from '@test-utils/trpc-helpers'
import { prismaMock } from '@test-utils/setup'
import { accountCodeFactory, churchFactory } from '@test-utils/factories'
import { TRPCError } from '@trpc/server'

describe('AccountCodes Router', () => {
  let caller: ReturnType<typeof createTRPCCaller>

  beforeEach(() => {
    caller = createTRPCCaller()
  })

  describe('getAll', () => {
    it('should return account codes with hierarchy', async () => {
      const mockAccountCodes = accountCodeFactory.createHierarchy()
      
      prismaMock.accountCode.findMany.mockResolvedValue(mockAccountCodes as any)

      const result = await caller.accountCodes.getAll({
        accountType: AccountType.ASSET,
        churchOnly: false,
        level: 1
      })

      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
      expect(prismaMock.accountCode.findMany).toHaveBeenCalledWith({
        where: {
          type: AccountType.ASSET,
          level: 1,
          OR: [
            { isSystem: true },
            { churchId: 'test-church-id' }
          ]
        },
        include: {
          parent: {
            select: {
              id: true,
              code: true,
              name: true,
              level: true
            }
          },
          children: {
            include: {
              children: {
                include: {
                  children: true
                }
              }
            }
          },
          _count: {
            select: {
              children: true
            }
          }
        },
        orderBy: { order: 'asc' }
      })
    })

    it('should filter by church only when churchOnly is true', async () => {
      const mockAccountCodes = [accountCodeFactory.create({ churchId: 'test-church-id' })]
      
      prismaMock.accountCode.findMany.mockResolvedValue(mockAccountCodes as any)

      await caller.accountCodes.getAll({
        churchOnly: true
      })

      expect(prismaMock.accountCode.findMany).toHaveBeenCalledWith({
        where: {
          churchId: 'test-church-id'
        },
        include: expect.any(Object),
        orderBy: { order: 'asc' }
      })
    })

    it('should require authentication', async () => {
      const unauthenticatedCaller = createTRPCCaller()
      unauthenticatedCaller.accountCodes = unauthenticatedCaller.accountCodes

      await expect(
        unauthenticatedCaller.accountCodes.getAll({})
      ).rejects.toThrow(TRPCError)
    })
  })

  describe('getById', () => {
    it('should return account code by id', async () => {
      const mockAccount = accountCodeFactory.create()
      prismaMock.accountCode.findUnique.mockResolvedValue(mockAccount as any)

      const result = await caller.accountCodes.getById({ id: 'account-1' })

      expect(result).toEqual(mockAccount)
      expect(prismaMock.accountCode.findUnique).toHaveBeenCalledWith({
        where: { id: 'account-1' },
        include: {
          parent: {
            select: {
              id: true,
              code: true,
              name: true,
              level: true
            }
          },
          children: {
            include: {
              children: {
                include: {
                  children: true
                }
              }
            }
          },
          _count: {
            select: {
              children: true
            }
          }
        }
      })
    })

    it('should throw error if account code not found', async () => {
      prismaMock.accountCode.findUnique.mockResolvedValue(null)

      await expect(
        caller.accountCodes.getById({ id: 'non-existent' })
      ).rejects.toThrow('계정과목을 찾을 수 없습니다')
    })
  })

  describe('create', () => {
    it('should create new account code', async () => {
      const newAccountData = {
        code: '1112',
        name: '보통예금',
        englishName: 'Bank Account',
        type: AccountType.ASSET,
        parentId: 'asset-1111',
        allowTransaction: true,
        isActive: true
      }

      const parentAccount = accountCodeFactory.create({ 
        id: 'asset-1111', 
        level: 3, 
        code: '1111' 
      })
      const createdAccount = accountCodeFactory.create({
        ...newAccountData,
        id: 'new-account-id',
        level: 4,
        order: 1112,
        churchId: 'test-church-id'
      })

      prismaMock.accountCode.findUnique.mockResolvedValue(parentAccount as any)
      prismaMock.accountCode.findFirst.mockResolvedValue(null) // Code doesn't exist
      prismaMock.accountCode.create.mockResolvedValue(createdAccount as any)

      const result = await caller.accountCodes.create(newAccountData)

      expect(result).toEqual(createdAccount)
      expect(prismaMock.accountCode.create).toHaveBeenCalledWith({
        data: {
          code: '1112',
          name: '보통예금',
          englishName: 'Bank Account',
          type: AccountType.ASSET,
          level: 4,
          parentId: 'asset-1111',
          order: 1112,
          allowTransaction: true,
          isActive: true,
          isSystem: false,
          churchId: 'test-church-id'
        },
        include: expect.any(Object)
      })
    })

    it('should prevent creating duplicate account codes', async () => {
      const duplicateData = {
        code: '1111',
        name: '중복코드',
        type: AccountType.ASSET,
        allowTransaction: true,
        isActive: true
      }

      prismaMock.accountCode.findFirst.mockResolvedValue(
        accountCodeFactory.create({ code: '1111' }) as any
      )

      await expect(
        caller.accountCodes.create(duplicateData)
      ).rejects.toThrow('이미 존재하는 계정 코드입니다')
    })

    it('should enforce level hierarchy constraints', async () => {
      const invalidLevelData = {
        code: '1999',
        name: '잘못된 레벨',
        type: AccountType.ASSET,
        parentId: 'asset-1111', // Level 4 parent
        allowTransaction: true,
        isActive: true
      }

      const parentAccount = accountCodeFactory.create({ 
        id: 'asset-1111', 
        level: 4, // Max level
        code: '1111' 
      })

      prismaMock.accountCode.findUnique.mockResolvedValue(parentAccount as any)
      prismaMock.accountCode.findFirst.mockResolvedValue(null)

      await expect(
        caller.accountCodes.create(invalidLevelData)
      ).rejects.toThrow('최대 레벨(4)을 초과할 수 없습니다')
    })
  })

  describe('update', () => {
    it('should update account code', async () => {
      const existingAccount = accountCodeFactory.create()
      const updateData = {
        id: 'account-1',
        name: '수정된 이름',
        englishName: 'Updated Name',
        isActive: false
      }

      prismaMock.accountCode.findUnique.mockResolvedValue(existingAccount as any)
      prismaMock.accountCode.findFirst.mockResolvedValue(null) // No duplicate
      prismaMock.accountCode.update.mockResolvedValue({
        ...existingAccount,
        ...updateData
      } as any)

      const result = await caller.accountCodes.update(updateData)

      expect(prismaMock.accountCode.update).toHaveBeenCalledWith({
        where: { id: 'account-1' },
        data: {
          name: '수정된 이름',
          englishName: 'Updated Name',
          isActive: false
        },
        include: expect.any(Object)
      })
    })

    it('should prevent updating system accounts', async () => {
      const systemAccount = accountCodeFactory.create({ isSystem: true })
      prismaMock.accountCode.findUnique.mockResolvedValue(systemAccount as any)

      await expect(
        caller.accountCodes.update({
          id: 'account-1',
          name: '시스템 계정 수정 시도'
        })
      ).rejects.toThrow('시스템 계정은 수정할 수 없습니다')
    })
  })

  describe('delete', () => {
    it('should delete account code without children', async () => {
      const accountToDelete = accountCodeFactory.create({
        isSystem: false,
        _count: { children: 0 }
      })

      prismaMock.accountCode.findUnique.mockResolvedValue(accountToDelete as any)
      prismaMock.transaction.findFirst.mockResolvedValue(null) // No transactions
      prismaMock.accountCode.delete.mockResolvedValue(accountToDelete as any)

      await caller.accountCodes.delete({ id: 'account-1' })

      expect(prismaMock.accountCode.delete).toHaveBeenCalledWith({
        where: { id: 'account-1' }
      })
    })

    it('should prevent deleting account with children', async () => {
      const accountWithChildren = accountCodeFactory.create({
        _count: { children: 2 }
      })

      prismaMock.accountCode.findUnique.mockResolvedValue(accountWithChildren as any)

      await expect(
        caller.accountCodes.delete({ id: 'account-1' })
      ).rejects.toThrow('하위 계정이 있는 계정은 삭제할 수 없습니다')
    })

    it('should prevent deleting system accounts', async () => {
      const systemAccount = accountCodeFactory.create({ 
        isSystem: true,
        _count: { children: 0 }
      })

      prismaMock.accountCode.findUnique.mockResolvedValue(systemAccount as any)

      await expect(
        caller.accountCodes.delete({ id: 'account-1' })
      ).rejects.toThrow('시스템 계정은 삭제할 수 없습니다')
    })

    it('should prevent deleting account with transactions', async () => {
      const accountWithTransactions = accountCodeFactory.create({
        _count: { children: 0 }
      })

      prismaMock.accountCode.findUnique.mockResolvedValue(accountWithTransactions as any)
      prismaMock.transaction.findFirst.mockResolvedValue({ id: 'transaction-1' } as any)

      await expect(
        caller.accountCodes.delete({ id: 'account-1' })
      ).rejects.toThrow('거래 내역이 있는 계정은 삭제할 수 없습니다')
    })
  })

  describe('validateCode', () => {
    it('should return valid for unique code', async () => {
      prismaMock.accountCode.findFirst.mockResolvedValue(null)

      const result = await caller.accountCodes.validateCode({
        code: '1999'
      })

      expect(result).toEqual({
        isValid: true,
        message: '사용 가능한 코드입니다'
      })
    })

    it('should return invalid for duplicate code', async () => {
      prismaMock.accountCode.findFirst.mockResolvedValue(
        accountCodeFactory.create({ code: '1111' }) as any
      )

      const result = await caller.accountCodes.validateCode({
        code: '1111'
      })

      expect(result).toEqual({
        isValid: false,
        message: '이미 존재하는 계정 코드입니다'
      })
    })

    it('should exclude current account when updating', async () => {
      prismaMock.accountCode.findFirst.mockResolvedValue(null)

      await caller.accountCodes.validateCode({
        code: '1111',
        excludeId: 'account-1'
      })

      expect(prismaMock.accountCode.findFirst).toHaveBeenCalledWith({
        where: {
          code: '1111',
          id: {
            not: 'account-1'
          }
        }
      })
    })
  })
})