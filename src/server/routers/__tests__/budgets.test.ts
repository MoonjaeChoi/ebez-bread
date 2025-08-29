import { describe, it, expect, beforeEach } from 'vitest'
import { BudgetStatus, BudgetCategory } from '@prisma/client'
import { createTRPCCaller, createAuthenticatedContext } from '@test-utils/trpc-helpers'
import { prismaMock } from '@test-utils/setup'
import { budgetFactory, departmentFactory } from '@test-utils/factories'
import { TRPCError } from '@trpc/server'

describe('Budgets Router', () => {
  let caller: ReturnType<typeof createTRPCCaller>

  beforeEach(() => {
    caller = createTRPCCaller()
  })

  describe('getAll', () => {
    it('should return paginated budgets with filters', async () => {
      const mockBudgets = [
        budgetFactory.create(),
        budgetFactory.create({ id: 'budget-2', name: '2024년 선교예산' })
      ]

      prismaMock.budget.findMany.mockResolvedValue(mockBudgets as any)
      prismaMock.budget.count.mockResolvedValue(2)

      const result = await caller.budgets.getAll({
        year: 2024,
        departmentId: 'dept-1',
        status: BudgetStatus.ACTIVE,
        page: 1,
        limit: 10
      })

      expect(result).toEqual({
        budgets: mockBudgets,
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1
      })

      expect(prismaMock.budget.findMany).toHaveBeenCalledWith({
        where: {
          churchId: 'test-church-id',
          year: 2024,
          departmentId: 'dept-1',
          status: BudgetStatus.ACTIVE
        },
        include: {
          department: {
            select: {
              id: true,
              name: true
            }
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          approver: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          budgetItems: true,
          budgetChanges: {
            orderBy: {
              createdAt: 'desc'
            }
          },
          _count: {
            select: {
              budgetItems: true,
              budgetChanges: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: 0,
        take: 10
      })
    })

    it('should handle empty results', async () => {
      prismaMock.budget.findMany.mockResolvedValue([])
      prismaMock.budget.count.mockResolvedValue(0)

      const result = await caller.budgets.getAll({})

      expect(result).toEqual({
        budgets: [],
        total: 0,
        page: 1,
        limit: 50,
        totalPages: 0
      })
    })
  })

  describe('getById', () => {
    it('should return budget with all related data', async () => {
      const mockBudget = budgetFactory.createWithItems()
      prismaMock.budget.findUnique.mockResolvedValue(mockBudget as any)

      const result = await caller.budgets.getById({ id: 'budget-1' })

      expect(result).toEqual(mockBudget)
      expect(prismaMock.budget.findUnique).toHaveBeenCalledWith({
        where: { 
          id: 'budget-1',
          churchId: 'test-church-id'
        },
        include: {
          department: true,
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          approver: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          budgetItems: {
            include: {
              budgetExecution: true
            }
          },
          budgetChanges: {
            include: {
              createdBy: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            },
            orderBy: {
              createdAt: 'desc'
            }
          },
          _count: {
            select: {
              budgetItems: true,
              budgetChanges: true
            }
          }
        }
      })
    })

    it('should throw error if budget not found', async () => {
      prismaMock.budget.findUnique.mockResolvedValue(null)

      await expect(
        caller.budgets.getById({ id: 'non-existent' })
      ).rejects.toThrow('예산을 찾을 수 없습니다')
    })
  })

  describe('create', () => {
    it('should create budget with items', async () => {
      const budgetData = {
        name: '2024년 신규예산',
        description: '신규 예산 계획',
        year: 2024,
        totalAmount: 10000000,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        departmentId: 'dept-1',
        budgetItems: [
          {
            name: '사무용품비',
            description: '사무용품 구매',
            amount: 1000000,
            category: BudgetCategory.OPERATIONS,
            code: 'OP001'
          },
          {
            name: '목회활동비',
            description: '목회 활동 경비',
            amount: 2000000,
            category: BudgetCategory.MINISTRY,
            code: 'MIN001'
          }
        ]
      }

      const mockDepartment = departmentFactory.create()
      const createdBudget = budgetFactory.createWithItems({
        ...budgetData,
        id: 'new-budget-id'
      })

      prismaMock.department.findUnique.mockResolvedValue(mockDepartment as any)
      prismaMock.budget.create.mockResolvedValue(createdBudget as any)

      const result = await caller.budgets.create(budgetData)

      expect(result).toEqual(createdBudget)
      expect(prismaMock.budget.create).toHaveBeenCalledWith({
        data: {
          name: '2024년 신규예산',
          description: '신규 예산 계획',
          year: 2024,
          quarter: null,
          month: null,
          totalAmount: '10000000',
          status: BudgetStatus.DRAFT,
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
          churchId: 'test-church-id',
          departmentId: 'dept-1',
          createdById: 'test-user-id',
          budgetItems: {
            create: [
              {
                name: '사무용품비',
                description: '사무용품 구매',
                amount: '1000000',
                category: BudgetCategory.OPERATIONS,
                code: 'OP001'
              },
              {
                name: '목회활동비',
                description: '목회 활동 경비',
                amount: '2000000',
                category: BudgetCategory.MINISTRY,
                code: 'MIN001'
              }
            ]
          }
        },
        include: expect.any(Object)
      })
    })

    it('should validate total amount matches sum of items', async () => {
      const invalidBudgetData = {
        name: '잘못된 예산',
        year: 2024,
        totalAmount: 5000000, // Doesn't match sum of items (3000000)
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        departmentId: 'dept-1',
        budgetItems: [
          {
            name: '항목1',
            amount: 1000000,
            category: BudgetCategory.OPERATIONS,
            code: 'OP001'
          },
          {
            name: '항목2',
            amount: 2000000,
            category: BudgetCategory.MINISTRY,
            code: 'MIN001'
          }
        ]
      }

      const mockDepartment = departmentFactory.create()
      prismaMock.department.findUnique.mockResolvedValue(mockDepartment as any)

      await expect(
        caller.budgets.create(invalidBudgetData)
      ).rejects.toThrow('총 예산액이 항목별 합계와 일치하지 않습니다')
    })

    it('should validate department exists', async () => {
      const budgetData = {
        name: '예산',
        year: 2024,
        totalAmount: 1000000,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        departmentId: 'non-existent-dept',
        budgetItems: [
          {
            name: '항목1',
            amount: 1000000,
            category: BudgetCategory.OPERATIONS,
            code: 'OP001'
          }
        ]
      }

      prismaMock.department.findUnique.mockResolvedValue(null)

      await expect(
        caller.budgets.create(budgetData)
      ).rejects.toThrow('부서를 찾을 수 없습니다')
    })
  })

  describe('update', () => {
    it('should update budget and recalculate total', async () => {
      const existingBudget = budgetFactory.create({ status: BudgetStatus.DRAFT })
      const updateData = {
        id: 'budget-1',
        name: '수정된 예산명',
        budgetItems: [
          {
            name: '수정된 항목',
            amount: 1500000,
            category: BudgetCategory.OPERATIONS,
            code: 'OP002'
          }
        ],
        totalAmount: 1500000
      }

      prismaMock.budget.findUnique.mockResolvedValue(existingBudget as any)
      prismaMock.budget.update.mockResolvedValue({
        ...existingBudget,
        ...updateData
      } as any)

      await caller.budgets.update(updateData)

      expect(prismaMock.budget.update).toHaveBeenCalledWith({
        where: { 
          id: 'budget-1',
          churchId: 'test-church-id'
        },
        data: {
          name: '수정된 예산명',
          totalAmount: '1500000',
          budgetItems: {
            deleteMany: {},
            create: [
              {
                name: '수정된 항목',
                amount: '1500000',
                category: BudgetCategory.OPERATIONS,
                code: 'OP002'
              }
            ]
          }
        },
        include: expect.any(Object)
      })
    })

    it('should prevent updating approved budget', async () => {
      const approvedBudget = budgetFactory.create({ 
        status: BudgetStatus.APPROVED,
        approvedAt: new Date(),
        approvedById: 'approver-id'
      })

      prismaMock.budget.findUnique.mockResolvedValue(approvedBudget as any)

      await expect(
        caller.budgets.update({
          id: 'budget-1',
          name: '승인된 예산 수정 시도'
        })
      ).rejects.toThrow('승인된 예산은 수정할 수 없습니다')
    })
  })

  describe('delete', () => {
    it('should delete draft budget', async () => {
      const draftBudget = budgetFactory.create({ status: BudgetStatus.DRAFT })
      
      prismaMock.budget.findUnique.mockResolvedValue(draftBudget as any)
      prismaMock.budget.delete.mockResolvedValue(draftBudget as any)

      await caller.budgets.delete({ id: 'budget-1' })

      expect(prismaMock.budget.delete).toHaveBeenCalledWith({
        where: { 
          id: 'budget-1',
          churchId: 'test-church-id'
        }
      })
    })

    it('should prevent deleting non-draft budget', async () => {
      const activeBudget = budgetFactory.create({ status: BudgetStatus.ACTIVE })
      
      prismaMock.budget.findUnique.mockResolvedValue(activeBudget as any)

      await expect(
        caller.budgets.delete({ id: 'budget-1' })
      ).rejects.toThrow('초안 상태의 예산만 삭제할 수 있습니다')
    })
  })

  describe('getAvailableItems', () => {
    it('should return active budget items', async () => {
      const mockBudgetItems = [
        {
          id: 'item-1',
          name: '사무용품비',
          amount: '1000000',
          category: BudgetCategory.OPERATIONS,
          code: 'OP001',
          budget: {
            id: 'budget-1',
            name: '2024년 운영예산',
            status: BudgetStatus.ACTIVE,
            department: {
              name: '총무부'
            }
          }
        }
      ]

      prismaMock.budgetItem.findMany.mockResolvedValue(mockBudgetItems as any)

      const result = await caller.budgets.getAvailableItems({})

      expect(result).toEqual(mockBudgetItems)
      expect(prismaMock.budgetItem.findMany).toHaveBeenCalledWith({
        where: {
          budget: {
            churchId: 'test-church-id',
            status: BudgetStatus.ACTIVE
          }
        },
        include: {
          budget: {
            select: {
              id: true,
              name: true,
              status: true,
              department: {
                select: {
                  name: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
    })
  })

  describe('checkBalance', () => {
    it('should return budget balance information', async () => {
      const mockBudgetItem = {
        id: 'item-1',
        name: '사무용품비',
        amount: '1000000',
        budget: {
          name: '2024년 예산',
          status: BudgetStatus.ACTIVE
        },
        budgetExecution: {
          totalBudget: '1000000',
          usedAmount: '300000',
          pendingAmount: '100000',
          remainingAmount: '600000',
          executionRate: 30.0,
          lastUpdated: new Date()
        }
      }

      prismaMock.budgetItem.findUnique.mockResolvedValue(mockBudgetItem as any)

      const result = await caller.budgets.checkBalance({
        budgetItemId: 'item-1',
        requestAmount: 200000
      })

      expect(result).toEqual({
        budgetItem: mockBudgetItem,
        requestAmount: 200000,
        isValid: true,
        availableAmount: 600000,
        wouldExceed: false,
        totalAfterRequest: 500000,
        executionRateAfter: 50.0,
        canApprove: true
      })
    })

    it('should detect budget overrun', async () => {
      const mockBudgetItem = {
        id: 'item-1',
        name: '사무용품비',
        amount: '1000000',
        budget: {
          name: '2024년 예산',
          status: BudgetStatus.ACTIVE
        },
        budgetExecution: {
          remainingAmount: '100000'
        }
      }

      prismaMock.budgetItem.findUnique.mockResolvedValue(mockBudgetItem as any)

      const result = await caller.budgets.checkBalance({
        budgetItemId: 'item-1',
        requestAmount: 200000
      })

      expect(result.isValid).toBe(false)
      expect(result.wouldExceed).toBe(true)
      expect(result.canApprove).toBe(false)
    })

    it('should handle budget item without execution data', async () => {
      const mockBudgetItem = {
        id: 'item-1',
        name: '사무용품비',
        amount: '1000000',
        budget: {
          name: '2024년 예산',
          status: BudgetStatus.ACTIVE
        },
        budgetExecution: null
      }

      prismaMock.budgetItem.findUnique.mockResolvedValue(mockBudgetItem as any)

      const result = await caller.budgets.checkBalance({
        budgetItemId: 'item-1',
        requestAmount: 500000
      })

      expect(result.isValid).toBe(true)
      expect(result.availableAmount).toBe(1000000)
      expect(result.canApprove).toBe(true)
    })
  })

  describe('approve', () => {
    it('should approve submitted budget', async () => {
      const submittedBudget = budgetFactory.create({ 
        status: BudgetStatus.SUBMITTED 
      })

      prismaMock.budget.findUnique.mockResolvedValue(submittedBudget as any)
      prismaMock.budget.update.mockResolvedValue({
        ...submittedBudget,
        status: BudgetStatus.APPROVED,
        approvedById: 'test-user-id',
        approvedAt: expect.any(Date)
      } as any)

      const result = await caller.budgets.approve({
        id: 'budget-1',
        comment: '승인합니다'
      })

      expect(prismaMock.budget.update).toHaveBeenCalledWith({
        where: { 
          id: 'budget-1',
          churchId: 'test-church-id'
        },
        data: {
          status: BudgetStatus.APPROVED,
          approvedById: 'test-user-id',
          approvedAt: expect.any(Date)
        },
        include: expect.any(Object)
      })
    })

    it('should only approve submitted budgets', async () => {
      const draftBudget = budgetFactory.create({ status: BudgetStatus.DRAFT })
      
      prismaMock.budget.findUnique.mockResolvedValue(draftBudget as any)

      await expect(
        caller.budgets.approve({
          id: 'budget-1',
          comment: '잘못된 상태 승인 시도'
        })
      ).rejects.toThrow('제출된 예산만 승인할 수 있습니다')
    })
  })
})