import { describe, it, expect, beforeEach } from 'vitest'
import { AccountType } from '@prisma/client'
import { createTRPCCaller } from '@test-utils/trpc-helpers'
import { prismaMock } from '@test-utils/setup'
import { transactionFactory, accountCodeFactory } from '@test-utils/factories'
import { TRPCError } from '@trpc/server'

describe('Transactions Router', () => {
  let caller: ReturnType<typeof createTRPCCaller>

  beforeEach(() => {
    caller = createTRPCCaller()
  })

  describe('create', () => {
    it('should create transaction with valid debit and credit accounts', async () => {
      const transactionData = {
        description: '현금 수입',
        amount: 500000,
        transactionDate: new Date('2024-01-15'),
        debitAccountId: 'cash-account',
        creditAccountId: 'revenue-account',
        reference: 'REF001',
        voucherNumber: 'V001'
      }

      const mockDebitAccount = accountCodeFactory.create({
        id: 'cash-account',
        type: AccountType.ASSET,
        allowTransaction: true
      })
      const mockCreditAccount = accountCodeFactory.create({
        id: 'revenue-account',
        type: AccountType.REVENUE,
        allowTransaction: true
      })
      const createdTransaction = transactionFactory.create()

      prismaMock.accountCode.findUnique
        .mockResolvedValueOnce(mockDebitAccount as any)
        .mockResolvedValueOnce(mockCreditAccount as any)
      prismaMock.transaction.create.mockResolvedValue(createdTransaction as any)

      const result = await caller.transactions.create(transactionData)

      expect(result).toEqual(createdTransaction)
      expect(prismaMock.transaction.create).toHaveBeenCalledWith({
        data: {
          description: '현금 수입',
          amount: '500000',
          transactionDate: new Date('2024-01-15'),
          debitAccountId: 'cash-account',
          creditAccountId: 'revenue-account',
          reference: 'REF001',
          voucherNumber: 'V001',
          churchId: 'test-church-id',
          createdById: 'test-user-id'
        },
        include: {
          debitAccount: {
            select: {
              id: true,
              code: true,
              name: true,
              type: true
            }
          },
          creditAccount: {
            select: {
              id: true,
              code: true,
              name: true,
              type: true
            }
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      })
    })

    it('should prevent same account for debit and credit', async () => {
      const invalidData = {
        description: '잘못된 거래',
        amount: 100000,
        transactionDate: new Date(),
        debitAccountId: 'same-account',
        creditAccountId: 'same-account',
        reference: 'REF001'
      }

      await expect(
        caller.transactions.create(invalidData)
      ).rejects.toThrow('차변과 대변 계정이 동일할 수 없습니다')
    })

    it('should validate account exists and allows transactions', async () => {
      const transactionData = {
        description: '거래',
        amount: 100000,
        transactionDate: new Date(),
        debitAccountId: 'non-transactional',
        creditAccountId: 'revenue-account',
        reference: 'REF001'
      }

      const nonTransactionalAccount = accountCodeFactory.create({
        id: 'non-transactional',
        allowTransaction: false
      })
      const revenueAccount = accountCodeFactory.create({
        id: 'revenue-account',
        allowTransaction: true
      })

      prismaMock.accountCode.findUnique
        .mockResolvedValueOnce(nonTransactionalAccount as any)
        .mockResolvedValueOnce(revenueAccount as any)

      await expect(
        caller.transactions.create(transactionData)
      ).rejects.toThrow('거래가 허용되지 않는 계정입니다')
    })

    it('should validate account belongs to church', async () => {
      const transactionData = {
        description: '거래',
        amount: 100000,
        transactionDate: new Date(),
        debitAccountId: 'other-church-account',
        creditAccountId: 'revenue-account',
        reference: 'REF001'
      }

      const otherChurchAccount = accountCodeFactory.create({
        id: 'other-church-account',
        churchId: 'other-church',
        allowTransaction: true
      })
      const revenueAccount = accountCodeFactory.create({
        id: 'revenue-account',
        allowTransaction: true
      })

      prismaMock.accountCode.findUnique
        .mockResolvedValueOnce(otherChurchAccount as any)
        .mockResolvedValueOnce(revenueAccount as any)

      await expect(
        caller.transactions.create(transactionData)
      ).rejects.toThrow('해당 교회의 계정이 아닙니다')
    })
  })

  describe('getAll', () => {
    it('should return paginated transactions with filters', async () => {
      const mockTransactions = [
        transactionFactory.create(),
        transactionFactory.create({ 
          id: 'transaction-2', 
          description: '다른 거래' 
        })
      ]

      prismaMock.transaction.findMany.mockResolvedValue(mockTransactions as any)
      prismaMock.transaction.count.mockResolvedValue(2)

      const result = await caller.transactions.getAll({
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        accountId: 'cash-account',
        page: 1,
        limit: 10
      })

      expect(result).toEqual({
        transactions: mockTransactions,
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1
      })

      expect(prismaMock.transaction.findMany).toHaveBeenCalledWith({
        where: {
          churchId: 'test-church-id',
          transactionDate: {
            gte: new Date('2024-01-01'),
            lte: new Date('2024-01-31')
          },
          OR: [
            { debitAccountId: 'cash-account' },
            { creditAccountId: 'cash-account' }
          ]
        },
        include: {
          debitAccount: {
            select: {
              id: true,
              code: true,
              name: true,
              type: true
            }
          },
          creditAccount: {
            select: {
              id: true,
              code: true,
              name: true,
              type: true
            }
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: {
          transactionDate: 'desc'
        },
        skip: 0,
        take: 10
      })
    })
  })

  describe('getById', () => {
    it('should return transaction by id', async () => {
      const mockTransaction = transactionFactory.create()
      prismaMock.transaction.findUnique.mockResolvedValue(mockTransaction as any)

      const result = await caller.transactions.getById({ id: 'transaction-1' })

      expect(result).toEqual(mockTransaction)
      expect(prismaMock.transaction.findUnique).toHaveBeenCalledWith({
        where: { 
          id: 'transaction-1',
          churchId: 'test-church-id'
        },
        include: {
          debitAccount: {
            select: {
              id: true,
              code: true,
              name: true,
              type: true
            }
          },
          creditAccount: {
            select: {
              id: true,
              code: true,
              name: true,
              type: true
            }
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      })
    })

    it('should throw error if transaction not found', async () => {
      prismaMock.transaction.findUnique.mockResolvedValue(null)

      await expect(
        caller.transactions.getById({ id: 'non-existent' })
      ).rejects.toThrow('거래를 찾을 수 없습니다')
    })
  })

  describe('update', () => {
    it('should update transaction', async () => {
      const existingTransaction = transactionFactory.create()
      const updateData = {
        id: 'transaction-1',
        description: '수정된 거래',
        amount: 600000,
        reference: 'REF002'
      }

      prismaMock.transaction.findUnique.mockResolvedValue(existingTransaction as any)
      prismaMock.transaction.update.mockResolvedValue({
        ...existingTransaction,
        ...updateData
      } as any)

      const result = await caller.transactions.update(updateData)

      expect(prismaMock.transaction.update).toHaveBeenCalledWith({
        where: { 
          id: 'transaction-1',
          churchId: 'test-church-id'
        },
        data: {
          description: '수정된 거래',
          amount: '600000',
          reference: 'REF002'
        },
        include: expect.any(Object)
      })
    })

    it('should validate account changes', async () => {
      const existingTransaction = transactionFactory.create()
      const updateData = {
        id: 'transaction-1',
        debitAccountId: 'same-account',
        creditAccountId: 'same-account'
      }

      prismaMock.transaction.findUnique.mockResolvedValue(existingTransaction as any)

      await expect(
        caller.transactions.update(updateData)
      ).rejects.toThrow('차변과 대변 계정이 동일할 수 없습니다')
    })
  })

  describe('delete', () => {
    it('should delete transaction', async () => {
      const transactionToDelete = transactionFactory.create()
      
      prismaMock.transaction.findUnique.mockResolvedValue(transactionToDelete as any)
      prismaMock.transaction.delete.mockResolvedValue(transactionToDelete as any)

      await caller.transactions.delete({ id: 'transaction-1' })

      expect(prismaMock.transaction.delete).toHaveBeenCalledWith({
        where: { 
          id: 'transaction-1',
          churchId: 'test-church-id'
        }
      })
    })

    it('should throw error if transaction not found', async () => {
      prismaMock.transaction.findUnique.mockResolvedValue(null)

      await expect(
        caller.transactions.delete({ id: 'non-existent' })
      ).rejects.toThrow('거래를 찾을 수 없습니다')
    })
  })

  describe('getTrialBalance', () => {
    it('should generate trial balance for specified period', async () => {
      const mockBalanceData = [
        {
          accountId: 'asset-1',
          accountCode: '1111',
          accountName: '현금',
          accountType: AccountType.ASSET,
          debitTotal: 1000000,
          creditTotal: 200000
        },
        {
          accountId: 'revenue-1', 
          accountCode: '4000',
          accountName: '헌금수입',
          accountType: AccountType.REVENUE,
          debitTotal: 0,
          creditTotal: 800000
        }
      ]

      // Mock raw SQL query result
      prismaMock.$queryRaw.mockResolvedValue(mockBalanceData as any)

      const result = await caller.transactions.getTrialBalance({
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        accountLevel: 4
      })

      expect(result).toEqual({
        period: {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31')
        },
        accounts: [
          {
            accountId: 'asset-1',
            accountCode: '1111',
            accountName: '현금',
            accountType: AccountType.ASSET,
            debitBalance: 800000, // 1000000 - 200000
            creditBalance: 0,
            netBalance: 800000
          },
          {
            accountId: 'revenue-1',
            accountCode: '4000', 
            accountName: '헌금수입',
            accountType: AccountType.REVENUE,
            debitBalance: 0,
            creditBalance: 800000,
            netBalance: -800000
          }
        ],
        totals: {
          totalDebitBalance: 800000,
          totalCreditBalance: 800000,
          isBalanced: true
        }
      })
    })

    it('should detect unbalanced trial balance', async () => {
      const unbalancedData = [
        {
          accountId: 'asset-1',
          accountCode: '1111', 
          accountName: '현금',
          accountType: AccountType.ASSET,
          debitTotal: 1000000,
          creditTotal: 0
        },
        {
          accountId: 'revenue-1',
          accountCode: '4000',
          accountName: '헌금수입', 
          accountType: AccountType.REVENUE,
          debitTotal: 0,
          creditTotal: 500000 // Unbalanced
        }
      ]

      prismaMock.$queryRaw.mockResolvedValue(unbalancedData as any)

      const result = await caller.transactions.getTrialBalance({
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31')
      })

      expect(result.totals.isBalanced).toBe(false)
      expect(result.totals.totalDebitBalance).toBe(1000000)
      expect(result.totals.totalCreditBalance).toBe(500000)
    })

    it('should filter by account level', async () => {
      await caller.transactions.getTrialBalance({
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        accountLevel: 2
      })

      expect(prismaMock.$queryRaw).toHaveBeenCalledWith(
        expect.stringContaining('WHERE ac.level = 2')
      )
    })
  })

  describe('getAccountBalance', () => {
    it('should calculate account balance for specified period', async () => {
      const mockBalanceResult = [
        {
          debitTotal: 1500000,
          creditTotal: 500000
        }
      ]

      prismaMock.$queryRaw.mockResolvedValue(mockBalanceResult as any)
      
      const mockAccount = accountCodeFactory.create({
        id: 'asset-1',
        type: AccountType.ASSET
      })
      prismaMock.accountCode.findUnique.mockResolvedValue(mockAccount as any)

      const result = await caller.transactions.getAccountBalance({
        accountId: 'asset-1',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31')
      })

      expect(result).toEqual({
        accountId: 'asset-1',
        account: mockAccount,
        period: {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31')
        },
        debitTotal: 1500000,
        creditTotal: 500000,
        balance: 1000000, // For ASSET: debit - credit
        balanceType: 'DEBIT'
      })
    })

    it('should calculate credit balance for liability account', async () => {
      const mockBalanceResult = [
        {
          debitTotal: 200000,
          creditTotal: 800000
        }
      ]

      prismaMock.$queryRaw.mockResolvedValue(mockBalanceResult as any)
      
      const liabilityAccount = accountCodeFactory.create({
        id: 'liability-1',
        type: AccountType.LIABILITY
      })
      prismaMock.accountCode.findUnique.mockResolvedValue(liabilityAccount as any)

      const result = await caller.transactions.getAccountBalance({
        accountId: 'liability-1',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31')
      })

      expect(result.balance).toBe(600000) // For LIABILITY: credit - debit
      expect(result.balanceType).toBe('CREDIT')
    })

    it('should handle account with no transactions', async () => {
      prismaMock.$queryRaw.mockResolvedValue([])
      
      const mockAccount = accountCodeFactory.create()
      prismaMock.accountCode.findUnique.mockResolvedValue(mockAccount as any)

      const result = await caller.transactions.getAccountBalance({
        accountId: 'asset-1',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31')
      })

      expect(result.debitTotal).toBe(0)
      expect(result.creditTotal).toBe(0)
      expect(result.balance).toBe(0)
    })

    it('should throw error for non-existent account', async () => {
      prismaMock.accountCode.findUnique.mockResolvedValue(null)

      await expect(
        caller.transactions.getAccountBalance({
          accountId: 'non-existent',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31')
        })
      ).rejects.toThrow('계정을 찾을 수 없습니다')
    })
  })
})