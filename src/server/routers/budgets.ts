import { z } from 'zod'
import { router, protectedProcedure, managerProcedure } from '@/lib/trpc/server'
import { BudgetStatus, BudgetCategory, BudgetChangeType, BudgetChangeStatus } from '@prisma/client'
import { TRPCError } from '@trpc/server'

// Input schemas
const budgetItemSchema = z.object({
  name: z.string().min(1, '항목명을 입력해주세요').max(100, '항목명은 100자 이내로 입력해주세요'),
  code: z.string().max(50, '코드는 50자 이내로 입력해주세요').optional(),
  amount: z.number().min(0, '예산액은 0 이상이어야 합니다').max(999999999999, '예산액이 너무 큽니다'),
  category: z.nativeEnum(BudgetCategory, { errorMap: () => ({ message: '올바른 예산 분류를 선택해주세요' }) }),
  description: z.string().max(500, '설명은 500자 이내로 입력해주세요').optional(),
})

const budgetCreateSchema = z.object({
  name: z.string().min(1, '예산명을 입력해주세요').max(200, '예산명은 200자 이내로 입력해주세요'),
  year: z.number().min(2020).max(2050, '올바른 연도를 입력해주세요'),
  quarter: z.number().min(1).max(4).optional(),
  month: z.number().min(1).max(12).optional(),
  startDate: z.string().transform((val) => {
    const date = new Date(val);
    if (isNaN(date.getTime())) {
      throw new Error('시작일을 입력해주세요');
    }
    return date;
  }),
  endDate: z.string().transform((val) => {
    const date = new Date(val);
    if (isNaN(date.getTime())) {
      throw new Error('종료일을 입력해주세요');
    }
    return date;
  }),
  totalAmount: z.number().min(0, '총 예산액은 0 이상이어야 합니다'),
  departmentId: z.string().min(1, '부서를 선택해주세요'),
  description: z.string().max(1000, '설명은 1000자 이내로 입력해주세요').optional(),
  budgetItems: z.array(budgetItemSchema).min(1, '최소 1개의 예산 항목이 필요합니다'),
}).refine((data) => data.endDate > data.startDate, {
  message: '종료일은 시작일보다 늦어야 합니다',
  path: ['endDate'],
}).refine((data) => {
  const itemsTotal = data.budgetItems.reduce((sum, item) => sum + item.amount, 0)
  return Math.abs(itemsTotal - data.totalAmount) < 0.01 // 소수점 오차 허용
}, {
  message: '총 예산액과 항목별 예산의 합계가 일치해야 합니다',
  path: ['totalAmount'],
})

const budgetUpdateSchema = z.object({
  id: z.string(),
  name: z.string().min(1, '예산명을 입력해주세요').max(100, '예산명은 100자 이내로 입력해주세요').optional(),
  year: z.number().min(2020).max(2050).optional(),
  quarter: z.number().min(1).max(4).optional(),
  month: z.number().min(1).max(12).optional(),
  totalAmount: z.number().min(0, '예산 금액은 0 이상이어야 합니다').optional(),
  description: z.string().max(500, '설명은 500자 이내로 입력해주세요').optional(),
  startDate: z.string().transform((val) => new Date(val)).optional(),
  endDate: z.string().transform((val) => new Date(val)).optional(),
  departmentId: z.string().optional(),
  budgetItems: z.array(budgetItemSchema).optional(),
})

const budgetQuerySchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  search: z.string().optional(),
  departmentId: z.string().optional(),
  year: z.number().optional(),
  quarter: z.number().optional(),
  status: z.nativeEnum(BudgetStatus).optional(),
  startDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
  endDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
})

const budgetChangeRequestSchema = z.object({
  budgetId: z.string(),
  changeType: z.nativeEnum(BudgetChangeType),
  amount: z.number().min(0.01, '변경 금액을 입력해주세요'),
  fromItemId: z.string().optional(),
  toItemId: z.string().optional(),
  reason: z.string().min(1, '변경 사유를 입력해주세요').max(1000, '변경 사유는 1000자 이내로 입력해주세요'),
}).refine((data) => {
  if (data.changeType === BudgetChangeType.TRANSFER) {
    return data.fromItemId && data.toItemId && data.fromItemId !== data.toItemId
  }
  return true
}, {
  message: '이체의 경우 서로 다른 출발 항목과 도착 항목을 선택해야 합니다',
})

export const budgetsRouter = router({
  // 예산 목록 조회
  getAll: protectedProcedure
    .input(budgetQuerySchema)
    .query(async ({ ctx, input }) => {
      const { page, limit, search, departmentId, year, quarter, status, startDate, endDate } = input
      const skip = (page - 1) * limit

      const where: any = {
        churchId: ctx.session.user.churchId,
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        }),
        ...(departmentId && { departmentId }),
        ...(year && { year }),
        ...(quarter && { quarter }),
        ...(status && { status }),
        ...(startDate && endDate && {
          OR: [
            { startDate: { gte: startDate, lte: endDate } },
            { endDate: { gte: startDate, lte: endDate } },
            { AND: [{ startDate: { lte: startDate } }, { endDate: { gte: endDate } }] },
          ],
        }),
      }

      const [budgets, total] = await Promise.all([
        ctx.prisma.budget.findMany({
          where,
          skip,
          take: limit,
          include: {
            department: {
              select: {
                id: true,
                name: true,
              },
            },
            approver: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            budgetItems: {
              select: {
                id: true,
                name: true,
                amount: true,
                category: true,
                description: true,
              },
            },
            _count: {
              select: {
                budgetItems: true,
                budgetChanges: true,
              },
            },
          },
          orderBy: [
            { year: 'desc' },
            { quarter: 'desc' },
            { month: 'desc' },
            { createdAt: 'desc' },
          ],
        }),
        ctx.prisma.budget.count({ where }),
      ])

      return {
        budgets,
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
      }
    }),

  // 예산 상세 조회 (집행현황 포함)
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const budget = await ctx.prisma.budget.findFirst({
        where: {
          id: input.id,
          churchId: ctx.session.user.churchId,
        },
        include: {
          department: {
            select: {
              id: true,
              name: true,
              budgetManager: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          approver: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          budgetItems: {
            include: {
              budgetExecution: true,
              _count: {
                select: {
                  expenseReports: {
                    where: {
                      status: { in: ['PENDING', 'APPROVED', 'PAID'] },
                    },
                  },
                },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
          budgetChanges: {
            include: {
              requester: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              approver: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      })

      if (!budget) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '예산을 찾을 수 없습니다',
        })
      }

      return budget
    }),

  // 부서별 예산 현황
  getByDepartment: protectedProcedure
    .input(z.object({
      departmentId: z.string(),
      year: z.number(),
      quarter: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { departmentId, year, quarter } = input

      // 부서 권한 확인
      const department = await ctx.prisma.department.findFirst({
        where: {
          id: departmentId,
          churchId: ctx.session.user.churchId,
        },
      })

      if (!department) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '부서를 찾을 수 없습니다',
        })
      }

      const budgets = await ctx.prisma.budget.findMany({
        where: {
          departmentId,
          churchId: ctx.session.user.churchId,
          year,
          ...(quarter && { quarter }),
          status: { in: ['ACTIVE', 'APPROVED'] },
        },
        include: {
          budgetItems: {
            include: {
              budgetExecution: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      })

      // 집행 현황 계산
      const summary = budgets.reduce(
        (acc, budget) => {
          acc.totalBudget += Number(budget.totalAmount)
          
          budget.budgetItems.forEach(item => {
            if (item.budgetExecution) {
              acc.usedAmount += Number(item.budgetExecution.usedAmount)
              acc.pendingAmount += Number(item.budgetExecution.pendingAmount)
              acc.remainingAmount += Number(item.budgetExecution.remainingAmount)
            }
          })
          
          return acc
        },
        {
          totalBudget: 0,
          usedAmount: 0,
          pendingAmount: 0,
          remainingAmount: 0,
        }
      )

      const executionRate = summary.totalBudget > 0 
        ? (summary.usedAmount / summary.totalBudget) * 100 
        : 0

      return {
        department,
        budgets,
        summary: {
          ...summary,
          executionRate,
        },
      }
    }),

  // 예산 생성
  create: managerProcedure
    .input(budgetCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const { budgetItems, ...budgetData } = input

      // 부서 확인
      const department = await ctx.prisma.department.findFirst({
        where: {
          id: input.departmentId,
          churchId: ctx.session.user.churchId,
        },
      })

      if (!department) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '부서를 찾을 수 없습니다',
        })
      }

      // 중복 예산 확인 (같은 부서, 연도, 분기, 월)
      const existingBudget = await ctx.prisma.budget.findFirst({
        where: {
          departmentId: input.departmentId,
          churchId: ctx.session.user.churchId,
          year: input.year,
          quarter: input.quarter,
          month: input.month,
        },
      })

      if (existingBudget) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: '해당 기간에 이미 예산이 존재합니다',
        })
      }

      // 트랜잭션으로 예산과 예산 항목들 생성
      const budget = await ctx.prisma.$transaction(async (tx) => {
        const newBudget = await tx.budget.create({
          data: {
            ...budgetData,
            churchId: ctx.session.user.churchId,
            createdById: ctx.session.user.id,
          },
        })

        // 예산 항목들 생성
        for (const item of budgetItems) {
          const budgetItem = await tx.budgetItem.create({
            data: {
              ...item,
              budgetId: newBudget.id,
            },
          })

          // 예산 집행 현황 초기화
          await tx.budgetExecution.create({
            data: {
              budgetItemId: budgetItem.id,
              totalBudget: item.amount,
              usedAmount: 0,
              pendingAmount: 0,
              remainingAmount: item.amount,
              executionRate: 0,
            },
          })
        }

        return newBudget
      })

      // 생성된 예산 상세 정보 조회
      return ctx.prisma.budget.findFirst({
        where: { id: budget.id },
        include: {
          department: {
            select: {
              id: true,
              name: true,
            },
          },
          budgetItems: {
            include: {
              budgetExecution: true,
            },
          },
        },
      })
    }),

  // 예산 수정
  update: managerProcedure
    .input(budgetUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, budgetItems, ...updateData } = input

      // 기존 예산 확인
      const existingBudget = await ctx.prisma.budget.findFirst({
        where: {
          id,
          churchId: ctx.session.user.churchId,
          status: { in: ['DRAFT', 'SUBMITTED'] }, // 승인된 예산은 수정 불가
        },
        include: {
          budgetItems: {
            include: {
              budgetExecution: true,
              _count: {
                select: {
                  expenseReports: {
                    where: { status: { in: ['APPROVED', 'PAID'] } },
                  },
                },
              },
            },
          },
        },
      })

      if (!existingBudget) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '예산을 찾을 수 없거나 수정할 수 없는 상태입니다',
        })
      }

      // 실행된 예산이 있으면 수정 제한
      const hasExecutedItems = existingBudget.budgetItems.some(
        item => item._count.expenseReports > 0 || Number(item.budgetExecution?.usedAmount || 0) > 0
      )

      if (hasExecutedItems) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '이미 집행된 예산 항목이 있어 수정할 수 없습니다',
        })
      }

      // 트랜잭션으로 예산 및 항목 수정
      const budget = await ctx.prisma.$transaction(async (tx) => {
        // 예산 기본 정보 수정
        const updatedBudget = await tx.budget.update({
          where: { id },
          data: updateData,
        })

        // 예산 항목 수정 (기존 항목 삭제 후 재생성)
        if (budgetItems) {
          // 기존 예산 집행 현황 삭제
          await tx.budgetExecution.deleteMany({
            where: {
              budgetItemId: {
                in: existingBudget.budgetItems.map(item => item.id),
              },
            },
          })

          // 기존 예산 항목 삭제
          await tx.budgetItem.deleteMany({
            where: { budgetId: id },
          })

          // 새로운 예산 항목들 생성
          for (const item of budgetItems) {
            const budgetItem = await tx.budgetItem.create({
              data: {
                ...item,
                budgetId: id,
              },
            })

            // 예산 집행 현황 초기화
            await tx.budgetExecution.create({
              data: {
                budgetItemId: budgetItem.id,
                totalBudget: item.amount,
                usedAmount: 0,
                pendingAmount: 0,
                remainingAmount: item.amount,
                executionRate: 0,
              },
            })
          }
        }

        return updatedBudget
      })

      return budget
    }),

  // 예산 승인/반려
  approve: managerProcedure
    .input(z.object({
      id: z.string(),
      status: z.enum(['APPROVED', 'REJECTED']),
      reason: z.string().max(1000, '사유는 1000자 이내로 입력해주세요').optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, status, reason } = input

      const existingBudget = await ctx.prisma.budget.findFirst({
        where: {
          id,
          churchId: ctx.session.user.churchId,
          status: { in: ['DRAFT', 'SUBMITTED'] },
        },
      })

      if (!existingBudget) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '예산을 찾을 수 없거나 승인할 수 없는 상태입니다',
        })
      }

      const budget = await ctx.prisma.budget.update({
        where: { id },
        data: {
          status: status === 'APPROVED' ? 'ACTIVE' : 'REJECTED',
          approvedById: ctx.session.user.id,
          approvedAt: new Date(),
          ...(reason && { description: reason }),
        },
        include: {
          department: {
            select: {
              id: true,
              name: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      })

      return budget
    }),

  // 예산 변경 요청
  requestChange: protectedProcedure
    .input(budgetChangeRequestSchema)
    .mutation(async ({ ctx, input }) => {
      const { budgetId, changeType, amount, fromItemId, toItemId, reason } = input

      // 예산 확인
      const budget = await ctx.prisma.budget.findFirst({
        where: {
          id: budgetId,
          churchId: ctx.session.user.churchId,
          status: 'ACTIVE',
        },
        include: {
          budgetItems: true,
        },
      })

      if (!budget) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '예산을 찾을 수 없거나 변경할 수 없는 상태입니다',
        })
      }

      // 이체의 경우 항목 확인
      if (changeType === BudgetChangeType.TRANSFER) {
        const fromItem = budget.budgetItems.find(item => item.id === fromItemId)
        const toItem = budget.budgetItems.find(item => item.id === toItemId)

        if (!fromItem || !toItem) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: '이체 대상 예산 항목을 찾을 수 없습니다',
          })
        }

        // 출발 항목의 잔여 예산 확인
        const fromExecution = await ctx.prisma.budgetExecution.findUnique({
          where: { budgetItemId: fromItemId! },
        })

        if (!fromExecution || Number(fromExecution.remainingAmount) < amount) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: '출발 항목의 잔여 예산이 부족합니다',
          })
        }
      }

      const budgetChange = await ctx.prisma.budgetChange.create({
        data: {
          budgetId,
          changeType,
          amount,
          fromItemId,
          toItemId,
          reason,
          requestedBy: ctx.session.user.id,
        },
        include: {
          requester: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          budget: {
            select: {
              id: true,
              name: true,
              department: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      })

      return budgetChange
    }),

  // 예산 변경 승인/반려
  approveChange: managerProcedure
    .input(z.object({
      id: z.string(),
      status: z.enum(['APPROVED', 'REJECTED']),
      reason: z.string().max(1000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, status, reason } = input

      const budgetChange = await ctx.prisma.budgetChange.findFirst({
        where: {
          id,
          status: 'PENDING',
          budget: {
            churchId: ctx.session.user.churchId,
          },
        },
        include: {
          budget: {
            include: {
              budgetItems: true,
            },
          },
        },
      })

      if (!budgetChange) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '예산 변경 요청을 찾을 수 없습니다',
        })
      }

      // 승인인 경우 실제 예산 변경 처리
      if (status === 'APPROVED') {
        await ctx.prisma.$transaction(async (tx) => {
          const { changeType, amount, fromItemId, toItemId } = budgetChange

          if (changeType === BudgetChangeType.TRANSFER && fromItemId && toItemId) {
            // 이체 처리
            const [fromExecution, toExecution] = await Promise.all([
              tx.budgetExecution.findUnique({ where: { budgetItemId: fromItemId } }),
              tx.budgetExecution.findUnique({ where: { budgetItemId: toItemId } }),
            ])

            if (!fromExecution || !toExecution) {
              throw new TRPCError({
                code: 'NOT_FOUND',
                message: '예산 집행 현황을 찾을 수 없습니다',
              })
            }

            // 출발 항목 예산 감소
            await tx.budgetItem.update({
              where: { id: fromItemId },
              data: { amount: { decrement: amount } },
            })

            await tx.budgetExecution.update({
              where: { budgetItemId: fromItemId },
              data: {
                totalBudget: { decrement: amount },
                remainingAmount: { decrement: amount },
                executionRate: Number(fromExecution.usedAmount) / (Number(fromExecution.totalBudget) - Number(amount)) * 100,
              },
            })

            // 도착 항목 예산 증가
            await tx.budgetItem.update({
              where: { id: toItemId },
              data: { amount: { increment: amount } },
            })

            await tx.budgetExecution.update({
              where: { budgetItemId: toItemId },
              data: {
                totalBudget: { increment: amount },
                remainingAmount: { increment: amount },
                executionRate: Number(toExecution.usedAmount) / (Number(toExecution.totalBudget) + Number(amount)) * 100,
              },
            })
          }

          // 변경 요청 승인 처리
          await tx.budgetChange.update({
            where: { id },
            data: {
              status: 'APPROVED',
              approvedBy: ctx.session.user.id,
              approvedAt: new Date(),
            },
          })
        })
      } else {
        // 반려 처리
        await ctx.prisma.budgetChange.update({
          where: { id },
          data: {
            status: 'REJECTED',
            approvedBy: ctx.session.user.id,
            approvedAt: new Date(),
          },
        })
      }

      return { success: true, status }
    }),

  // 예산 집행 현황 조회
  getExecution: protectedProcedure
    .input(z.object({
      budgetItemId: z.string().optional(),
      departmentId: z.string().optional(),
      year: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { budgetItemId, departmentId, year } = input

      if (budgetItemId) {
        // 특정 예산 항목의 집행 현황
        const execution = await ctx.prisma.budgetExecution.findUnique({
          where: { budgetItemId },
          include: {
            budgetItem: {
              include: {
                budget: {
                  include: {
                    department: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                },
                expenseReports: {
                  where: {
                    status: { in: ['PENDING', 'APPROVED', 'PAID'] },
                  },
                  include: {
                    requester: {
                      select: {
                        name: true,
                      },
                    },
                  },
                  orderBy: { requestDate: 'desc' },
                },
              },
            },
          },
        })

        return execution
      }

      // 부서별 또는 전체 집행 현황
      const where: any = {}
      
      if (departmentId || year) {
        where.budgetItem = {
          budget: {
            churchId: ctx.session.user.churchId,
            ...(departmentId && { departmentId }),
            ...(year && { year }),
          },
        }
      } else {
        where.budgetItem = {
          budget: {
            churchId: ctx.session.user.churchId,
          },
        }
      }

      const executions = await ctx.prisma.budgetExecution.findMany({
        where,
        include: {
          budgetItem: {
            include: {
              budget: {
                select: {
                  id: true,
                  name: true,
                  year: true,
                  department: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: {
          budgetItem: {
            budget: {
              year: 'desc',
            },
          },
        },
      })

      return executions
    }),

  // 예산 잔액 확인
  checkBalance: protectedProcedure
    .input(z.object({
      budgetItemId: z.string(),
      requestAmount: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const { budgetItemId, requestAmount } = input

      const budgetExecution = await ctx.prisma.budgetExecution.findUnique({
        where: { budgetItemId },
        include: {
          budgetItem: {
            include: {
              budget: {
                select: {
                  name: true,
                  status: true,
                },
              },
            },
          },
        },
      })

      if (!budgetExecution) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '예산 항목을 찾을 수 없습니다',
        })
      }

      const totalBudget = Number(budgetExecution.totalBudget)
      const usedAmount = Number(budgetExecution.usedAmount)
      const pendingAmount = Number(budgetExecution.pendingAmount)
      const remainingAmount = Number(budgetExecution.remainingAmount)

      const canApprove = remainingAmount >= requestAmount
      const wouldExceed = !canApprove
      const exceedAmount = wouldExceed ? requestAmount - remainingAmount : 0

      return {
        budgetItem: budgetExecution.budgetItem,
        totalBudget,
        usedAmount,
        pendingAmount,
        remainingAmount,
        requestAmount,
        canApprove,
        wouldExceed,
        exceedAmount,
        executionRate: budgetExecution.executionRate,
        projectedRate: totalBudget > 0 ? ((usedAmount + pendingAmount + requestAmount) / totalBudget) * 100 : 0,
      }
    }),

  // 사용 가능한 예산 항목 목록 (지출결의서용)
  getAvailableItems: protectedProcedure
    .input(z.object({
      departmentId: z.string().optional(),
      category: z.nativeEnum(BudgetCategory).optional(),
      minAmount: z.number().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const { departmentId, category, minAmount } = input

      const where: any = {
        budget: {
          churchId: ctx.session.user.churchId,
          status: 'ACTIVE',
          startDate: { lte: new Date() },
          endDate: { gte: new Date() },
          ...(departmentId && { departmentId }),
        },
        ...(category && { category }),
      }

      const budgetItems = await ctx.prisma.budgetItem.findMany({
        where,
        include: {
          budget: {
            select: {
              id: true,
              name: true,
              year: true,
              department: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          budgetExecution: {
            select: {
              remainingAmount: true,
              executionRate: true,
            },
          },
        },
        orderBy: [
          { budget: { year: 'desc' } },
          { budget: { departmentId: 'asc' } },
          { name: 'asc' },
        ],
      })

      // 최소 금액 이상 잔여 예산이 있는 항목만 필터링
      const availableItems = budgetItems.filter(item => 
        item.budgetExecution && Number(item.budgetExecution.remainingAmount) >= minAmount
      )

      return availableItems
    }),
})