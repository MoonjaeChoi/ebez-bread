import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import { createTRPCCaller } from '@test-utils/trpc-helpers'
import { prismaMock } from '@test-utils/setup'
import { 
  accountCodeFactory, 
  budgetFactory, 
  transactionFactory, 
  churchFactory, 
  departmentFactory 
} from '@test-utils/factories'
import { AccountType, BudgetStatus, BudgetCategory } from '@prisma/client'

describe('Accounting System Integration Tests', () => {
  let caller: ReturnType<typeof createTRPCCaller>

  beforeAll(() => {
    caller = createTRPCCaller()
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Complete Accounting Workflow', () => {
    it('should handle complete budget lifecycle with transactions', async () => {
      // Setup: Create church and department
      const church = churchFactory.create()
      const department = departmentFactory.create()
      
      prismaMock.church.findFirst.mockResolvedValue(church as any)
      prismaMock.department.findUnique.mockResolvedValue(department as any)

      // Step 1: Create account hierarchy
      const accountHierarchy = accountCodeFactory.createHierarchy()
      const cashAccount = accountHierarchy.find((acc: any) => acc.code === '1111') // 현금
      const revenueAccount = accountCodeFactory.create({
        id: 'revenue-4000',
        code: '4000',
        name: '헌금수입',
        type: AccountType.REVENUE,
        level: 1,
        allowTransaction: true
      })

      prismaMock.accountCode.findMany.mockResolvedValue(accountHierarchy as any)
      prismaMock.accountCode.create
        .mockResolvedValueOnce(accountHierarchy[0] as any) // 자산
        .mockResolvedValueOnce(accountHierarchy[1] as any) // 유동자산
        .mockResolvedValueOnce(accountHierarchy[2] as any) // 현금및현금성자산
        .mockResolvedValueOnce(accountHierarchy[3] as any) // 현금

      // Create account hierarchy
      for (const account of accountHierarchy) {
        prismaMock.accountCode.findFirst.mockResolvedValueOnce(null) // No duplicate
        prismaMock.accountCode.findUnique.mockResolvedValueOnce(
          account.parentId ? { id: account.parentId, level: account.level - 1 } as any : null
        )
        
        await caller.accountCodes.create({
          code: account.code,
          name: account.name,
          type: account.type,
          parentId: account.parentId || undefined,
          allowTransaction: account.allowTransaction,
          isActive: account.isActive
        })
      }

      // Step 2: Create budget with items
      const budgetData = {
        name: '2024년 운영예산',
        description: '교회 연간 운영예산',
        year: 2024,
        totalAmount: 10000000,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        departmentId: department.id,
        budgetItems: [
          {
            name: '사무용품비',
            description: '사무운영 관련 경비',
            amount: 2000000,
            category: BudgetCategory.OPERATIONS,
            code: 'OP001'
          },
          {
            name: '목회활동비',
            description: '목회 사역 관련 경비',
            amount: 3000000,
            category: BudgetCategory.MINISTRY,
            code: 'MIN001'
          },
          {
            name: '시설관리비',
            description: '건물 및 시설 관리',
            amount: 5000000,
            category: BudgetCategory.FACILITIES,
            code: 'FAC001'
          }
        ]
      }

      const createdBudget = budgetFactory.createWithItems({
        ...budgetData,
        id: 'budget-integration-1'
      })

      prismaMock.budget.create.mockResolvedValue(createdBudget as any)

      const budget = await caller.budgets.create(budgetData)
      expect(budget!.name).toBe('2024년 운영예산')
      expect(budget!.budgetItems).toHaveLength(3)
      expect(Number(budget!.totalAmount)).toBe(10000000)

      // Step 3: Submit and approve budget
      prismaMock.budget.findUnique
        .mockResolvedValueOnce(budget as any) // For submit
        .mockResolvedValueOnce({ ...budget, status: BudgetStatus.SUBMITTED } as any) // For approve

      prismaMock.budget.update
        .mockResolvedValueOnce({ ...budget, status: BudgetStatus.SUBMITTED } as any)
        .mockResolvedValueOnce({ 
          ...budget, 
          status: BudgetStatus.APPROVED,
          approvedAt: new Date(),
          approvedById: 'test-user-id'
        } as any)

      // Submit budget
      await caller.budgets.submit({ id: budget!.id })
      
      // Approve budget
      const approvedBudget = await caller.budgets.approve({ 
        id: budget!.id,
        status: 'APPROVED' as const,
        reason: '승인합니다'
      })
      
      expect(approvedBudget!.status).toBe(BudgetStatus.APPROVED)

      // Step 4: Check budget balance before expense
      const budgetItem = createdBudget.budgetItems![0]
      prismaMock.budgetItem.findUnique.mockResolvedValue({
        ...budgetItem,
        budgetExecution: {
          totalBudget: '2000000',
          usedAmount: '0',
          pendingAmount: '0',
          remainingAmount: '2000000',
          executionRate: 0.0
        }
      } as any)

      const balanceCheck = await caller.budgets.checkBalance({
        budgetItemId: budgetItem.id,
        requestAmount: 500000
      })

      expect((balanceCheck as any).isValid).toBe(true)
      expect((balanceCheck as any).availableAmount).toBe(2000000)
      expect(balanceCheck.canApprove).toBe(true)

      // Step 5: Create income transaction (cash inflow)
      prismaMock.accountCode.findUnique
        .mockResolvedValueOnce(cashAccount as any)
        .mockResolvedValueOnce(revenueAccount as any)

      const incomeTransaction = transactionFactory.create({
        description: '주일헌금 수입',
        amount: '5000000',
        debitAccountId: cashAccount!.id,
        creditAccountId: revenueAccount.id
      })

      prismaMock.transaction.create.mockResolvedValue(incomeTransaction as any)

      const income = await caller.transactions.create({
        description: '주일헌금 수입',
        amount: 5000000,
        transactionDate: new Date('2024-01-07'),
        debitAccountId: cashAccount!.id,
        creditAccountId: revenueAccount.id,
        reference: 'OFFERING-20240107'
      })

      expect(income.description).toBe('주일헌금 수입')
      expect(Number(income.amount)).toBe(5000000)

      // Step 6: Create expense transaction (budget execution)
      const expenseAccount = accountCodeFactory.create({
        id: 'expense-5000',
        code: '5000',
        name: '운영비',
        type: AccountType.EXPENSE,
        allowTransaction: true
      })

      prismaMock.accountCode.findUnique
        .mockResolvedValueOnce(expenseAccount as any)
        .mockResolvedValueOnce(cashAccount as any)

      const expenseTransaction = transactionFactory.create({
        description: '사무용품 구매',
        amount: '500000',
        debitAccountId: expenseAccount.id,
        creditAccountId: cashAccount!.id
      })

      prismaMock.transaction.create.mockResolvedValue(expenseTransaction as any)

      const expense = await caller.transactions.create({
        description: '사무용품 구매',
        amount: 500000,
        transactionDate: new Date('2024-01-15'),
        debitAccountId: expenseAccount.id,
        creditAccountId: cashAccount!.id,
        reference: 'EXPENSE-20240115',
        voucherNumber: 'V001'
      })

      expect(expense.description).toBe('사무용품 구매')
      expect(Number(expense.amount)).toBe(500000)

      // Step 7: Generate trial balance
      const trialBalanceData = [
        {
          accountId: cashAccount!.id,
          accountCode: cashAccount!.code,
          accountName: cashAccount!.name,
          accountType: AccountType.ASSET,
          debitTotal: 5000000,
          creditTotal: 500000
        },
        {
          accountId: revenueAccount.id,
          accountCode: revenueAccount.code,
          accountName: revenueAccount.name,
          accountType: AccountType.REVENUE,
          debitTotal: 0,
          creditTotal: 5000000
        },
        {
          accountId: expenseAccount.id,
          accountCode: expenseAccount.code,
          accountName: expenseAccount.name,
          accountType: AccountType.EXPENSE,
          debitTotal: 500000,
          creditTotal: 0
        }
      ]

      prismaMock.$queryRaw.mockResolvedValue(trialBalanceData as any)

      const trialBalance = await caller.transactions.getTrialBalance({
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        accountLevel: 4
      })

      expect((trialBalance as any).accounts).toHaveLength(3)
      expect((trialBalance as any).totals?.isBalanced).toBe(true)
      expect((trialBalance as any).totals?.totalDebitBalance).toBe(5000000) // 4500000 + 500000
      expect((trialBalance as any).totals?.totalCreditBalance).toBe(5000000)

      // Step 8: Check account balance
      prismaMock.accountCode.findUnique.mockResolvedValue(cashAccount as any)
      prismaMock.$queryRaw.mockResolvedValue([{
        debitTotal: 5000000,
        creditTotal: 500000
      }] as any)

      const accountBalance = await (caller.transactions as any).getAccountBalance({
        accountId: cashAccount!.id,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      })

      expect(accountBalance.balance).toBe(4500000) // 5000000 - 500000
      expect(accountBalance.balanceType).toBe('DEBIT')

      // Step 9: Update budget execution
      prismaMock.budgetItem.findUnique.mockResolvedValue({
        ...budgetItem,
        budgetExecution: {
          totalBudget: '2000000',
          usedAmount: '500000',
          pendingAmount: '0',
          remainingAmount: '1500000',
          executionRate: 25.0
        }
      } as any)

      const updatedBalance = await caller.budgets.checkBalance({
        budgetItemId: budgetItem.id,
        requestAmount: 0
      })

      expect((updatedBalance as any).availableAmount).toBe(1500000)
    })

    it('should prevent budget overrun', async () => {
      // Setup budget item with limited remaining amount
      const budgetItem = {
        id: 'limited-item',
        name: '제한된 예산',
        amount: '1000000',
        budget: {
          name: '테스트 예산',
          status: BudgetStatus.ACTIVE
        },
        budgetExecution: {
          totalBudget: '1000000',
          usedAmount: '800000',
          pendingAmount: '100000',
          remainingAmount: '100000', // Only 100k remaining
          executionRate: 90.0
        }
      }

      prismaMock.budgetItem.findUnique.mockResolvedValue(budgetItem as any)

      // Try to request more than remaining amount
      const balanceCheck = await caller.budgets.checkBalance({
        budgetItemId: 'limited-item',
        requestAmount: 200000 // Exceeds remaining 100k
      })

      expect((balanceCheck as any).isValid).toBe(false)
      expect(balanceCheck.wouldExceed).toBe(true)
      expect(balanceCheck.canApprove).toBe(false)
    })

    it('should handle complex account hierarchy operations', async () => {
      // Create parent account
      const parentAccount = accountCodeFactory.create({
        id: 'parent-1',
        code: '2000',
        name: '부채',
        type: AccountType.LIABILITY,
        level: 1,
        allowTransaction: false
      })

      prismaMock.accountCode.findFirst.mockResolvedValue(null) // No duplicate
      prismaMock.accountCode.create.mockResolvedValue(parentAccount as any)

      await caller.accountCodes.create({
        code: '2000',
        name: '부채',
        type: AccountType.LIABILITY,
        allowTransaction: false
      })

      // Create child account
      prismaMock.accountCode.findUnique.mockResolvedValue(parentAccount as any)
      prismaMock.accountCode.findFirst.mockResolvedValue(null)
      
      const childAccount = accountCodeFactory.create({
        id: 'child-1',
        code: '2100',
        name: '유동부채',
        type: AccountType.LIABILITY,
        level: 2,
        parentId: 'parent-1',
        allowTransaction: false
      })

      prismaMock.accountCode.create.mockResolvedValue(childAccount as any)

      await caller.accountCodes.create({
        code: '2100',
        name: '유동부채',
        type: AccountType.LIABILITY,
        parentId: 'parent-1',
        allowTransaction: false
      })

      // Try to delete parent account with children - should fail
      prismaMock.accountCode.findUnique.mockResolvedValue({
        ...parentAccount,
        _count: { children: 1 }
      } as any)

      await expect(
        caller.accountCodes.delete({ id: 'parent-1' })
      ).rejects.toThrow('하위 계정이 있는 계정은 삭제할 수 없습니다')

      // Delete child account first
      prismaMock.accountCode.findUnique.mockResolvedValue({
        ...childAccount,
        _count: { children: 0 }
      } as any)
      prismaMock.transaction.findFirst.mockResolvedValue(null)
      prismaMock.accountCode.delete.mockResolvedValue(childAccount as any)

      await caller.accountCodes.delete({ id: 'child-1' })

      // Now parent can be deleted
      prismaMock.accountCode.findUnique.mockResolvedValue({
        ...parentAccount,
        _count: { children: 0 }
      } as any)
      prismaMock.accountCode.delete.mockResolvedValue(parentAccount as any)

      await caller.accountCodes.delete({ id: 'parent-1' })
    })

    it('should validate double-entry bookkeeping rules', async () => {
      const assetAccount = accountCodeFactory.create({
        type: AccountType.ASSET,
        allowTransaction: true
      })
      const liabilityAccount = accountCodeFactory.create({
        type: AccountType.LIABILITY,
        allowTransaction: true
      })

      // Try to create transaction with same account for debit and credit
      await expect(
        caller.transactions.create({
          description: '잘못된 거래',
          amount: 100000,
          transactionDate: new Date(),
          debitAccountId: assetAccount.id,
          creditAccountId: assetAccount.id, // Same account
          reference: 'INVALID'
        })
      ).rejects.toThrow('차변과 대변 계정이 동일할 수 없습니다')

      // Valid transaction
      prismaMock.accountCode.findUnique
        .mockResolvedValueOnce(assetAccount as any)
        .mockResolvedValueOnce(liabilityAccount as any)

      const validTransaction = transactionFactory.create()
      prismaMock.transaction.create.mockResolvedValue(validTransaction as any)

      const result = await caller.transactions.create({
        description: '정상 거래',
        amount: 100000,
        transactionDate: new Date(),
        debitAccountId: assetAccount.id,
        creditAccountId: liabilityAccount.id,
        reference: 'VALID-001'
      })

      expect(result.description).toBe('정상 거래')
    })
  })
})