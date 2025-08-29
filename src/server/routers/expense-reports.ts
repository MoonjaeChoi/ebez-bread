import { z } from 'zod'
import { router, protectedProcedure, managerProcedure, adminProcedure } from '@/lib/trpc/server'
import { ReportStatus } from '@prisma/client'
import { canApproveExpenses } from '@/lib/permissions'
import { logger } from '@/lib/logger'
import { trackDatabaseOperation, performanceMonitor } from '@/lib/monitoring/performance'
import { TRPCError } from '@trpc/server'

// Input schemas
const expenseReportCreateSchema = z.object({
  title: z.string().min(1, '제목을 입력해주세요').max(200, '제목은 200자 이내로 입력해주세요'),
  description: z.string().optional(),
  amount: z.number().min(0.01, '금액을 입력해주세요').max(999999999, '금액이 너무 큽니다'),
  category: z.string().min(1, '지출 분류를 선택해주세요'),
  receiptUrl: z.string().optional(),
  budgetItemId: z.string().optional(), // 예산 항목 연결
})

const expenseReportUpdateSchema = expenseReportCreateSchema.extend({
  id: z.string(),
})

const expenseReportApprovalSchema = z.object({
  id: z.string(),
  status: z.enum(['APPROVED', 'REJECTED', 'PAID']),
  rejectionReason: z.string().optional(),
})

const expenseReportQuerySchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  search: z.string().optional(),
  category: z.string().optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'PAID']).optional(),
  requesterId: z.string().optional(),
  startDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
  endDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
  minAmount: z.number().optional(),
  maxAmount: z.number().optional(),
})

const expenseReportStatsSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  category: z.string().optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'PAID']).optional(),
}).optional()

export const expenseReportsRouter = router({
  // Get all expense reports with pagination and filters
  getAll: protectedProcedure
    .input(expenseReportQuerySchema)
    .query(async ({ ctx, input }) => {
      const { page, limit, search, category, status, requesterId, startDate, endDate, minAmount, maxAmount } = input
      const skip = (page - 1) * limit

      const where = {
        church: {
          id: ctx.session.user.churchId,
        },
        ...(search && {
          OR: [
            { title: { contains: search, mode: 'insensitive' as const } },
            { description: { contains: search, mode: 'insensitive' as const } },
            { requester: { name: { contains: search, mode: 'insensitive' as const } } },
          ],
        }),
        ...(category && { category }),
        ...(status && { status }),
        ...(requesterId && { requesterId }),
        ...(startDate && endDate && {
          requestDate: {
            gte: startDate,
            lte: endDate,
          },
        }),
        ...(minAmount !== undefined && { amount: { gte: minAmount } }),
        ...(maxAmount !== undefined && { amount: { lte: maxAmount } }),
      }

      const [expenseReports, total] = await Promise.all([
        ctx.prisma.expenseReport.findMany({
          where,
          skip,
          take: limit,
          include: {
            requester: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
          orderBy: { requestDate: 'desc' },
        }),
        ctx.prisma.expenseReport.count({ where }),
      ])

      return {
        expenseReports,
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
      }
    }),

  // Get single expense report
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const expenseReport = await ctx.prisma.expenseReport.findFirst({
        where: {
          id: input.id,
          churchId: ctx.session.user.churchId,
        },
        include: {
          requester: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      })

      if (!expenseReport) {
        throw new Error('지출결의서를 찾을 수 없습니다')
      }

      return expenseReport
    }),

  // Get my expense reports
  getMy: protectedProcedure
    .input(z.object({
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(10),
      status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'PAID']).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { page, limit, status } = input
      const skip = (page - 1) * limit

      const where = {
        requesterId: ctx.session.user.id,
        churchId: ctx.session.user.churchId,
        ...(status && { status }),
      }

      const [expenseReports, total] = await Promise.all([
        ctx.prisma.expenseReport.findMany({
          where,
          skip,
          take: limit,
          include: {
            requester: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
          orderBy: { requestDate: 'desc' },
        }),
        ctx.prisma.expenseReport.count({ where }),
      ])

      return {
        expenseReports,
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
      }
    }),

  // Get pending approvals (for managers/admins)
  getPendingApprovals: protectedProcedure
    .input(z.object({
      limit: z.number().default(10),
    }))
    .query(async ({ ctx, input }) => {
      // Check if user can approve expenses
      if (!canApproveExpenses(ctx.session.user.role as any)) {
        return { expenseReports: [] }
      }

      const expenseReports = await ctx.prisma.expenseReport.findMany({
        where: {
          churchId: ctx.session.user.churchId,
          status: 'PENDING',
        },
        take: input.limit,
        include: {
          requester: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: { requestDate: 'asc' }, // Oldest first for approvals
      })

      return { expenseReports }
    }),

  // Create new expense report
  create: protectedProcedure
    .input(expenseReportCreateSchema)
    .mutation(async ({ ctx, input }) => {
      // 예산 항목이 지정된 경우 예산 검증
      if (input.budgetItemId) {
        const budgetValidation = await validateBudgetExpense(
          input.budgetItemId,
          input.amount,
          ctx
        )

        if (!budgetValidation.isValid) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: budgetValidation.error || '예산 확인에 실패했습니다',
          })
        }
      }

      const expenseReport = await ctx.prisma.$transaction(async (tx) => {
        const newExpenseReport = await tx.expenseReport.create({
          data: {
            ...input,
            requesterId: ctx.session.user.id,
            churchId: ctx.session.user.churchId,
            status: 'PENDING',
          },
          include: {
            requester: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
            budgetItem: {
              include: {
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
            },
          },
        })

        // 예산 집행 현황 업데이트 (대기 중인 금액 증가)
        if (newExpenseReport.budgetItemId) {
          await updateBudgetExecution(newExpenseReport.budgetItemId, tx)
        }

        return newExpenseReport
      })

      // Send approval request notification
      try {
        // await notificationService.sendExpenseApprovalRequest({
        //   expenseReportId: expenseReport.id,
        //   title: expenseReport.title,
        //   amount: Number(expenseReport.amount),
        //   category: expenseReport.category,
        //   requesterId: expenseReport.requesterId,
        //   requesterName: expenseReport.requester.name,
        //   requesterEmail: expenseReport.requester.email || undefined,
        // })
      } catch (error) {
        console.error('Failed to send expense approval notification:', error)
        // Don't fail the entire operation if notification fails
      }

      return expenseReport
    }),

  // Update expense report (only for creator and before approval)
  update: protectedProcedure
    .input(expenseReportUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input

      // Check if the expense report exists and belongs to the user or user has admin rights
      const existingReport = await ctx.prisma.expenseReport.findFirst({
        where: {
          id,
          churchId: ctx.session.user.churchId,
        },
      })

      if (!existingReport) {
        throw new Error('지출결의서를 찾을 수 없습니다')
      }

      // Only creator can update, and only if it's still pending
      if (existingReport.requesterId !== ctx.session.user.id && !canApproveExpenses(ctx.session.user.role as any)) {
        throw new Error('수정 권한이 없습니다')
      }

      if (existingReport.status !== 'PENDING') {
        throw new Error('승인된 지출결의서는 수정할 수 없습니다')
      }

      const expenseReport = await ctx.prisma.expenseReport.update({
        where: { id },
        data,
        include: {
          requester: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      })

      return expenseReport
    }),

  // Approve/Reject expense report
  approve: managerProcedure
    .input(expenseReportApprovalSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, status, rejectionReason } = input

      if (!canApproveExpenses(ctx.session.user.role as any)) {
        throw new Error('승인 권한이 없습니다')
      }

      const existingReport = await ctx.prisma.expenseReport.findFirst({
        where: {
          id,
          churchId: ctx.session.user.churchId,
        },
      })

      if (!existingReport) {
        throw new Error('지출결의서를 찾을 수 없습니다')
      }

      if (existingReport.status !== 'PENDING') {
        throw new Error('이미 처리된 지출결의서입니다')
      }

      const updateData: any = {
        status,
        ...(status === 'APPROVED' && { approvedDate: new Date() }),
        ...(status === 'REJECTED' && {
          rejectedDate: new Date(),
          rejectionReason: rejectionReason || '사유 없음',
        }),
        ...(status === 'PAID' && { approvedDate: new Date() }),
      }

      const expenseReport = await ctx.prisma.expenseReport.update({
        where: { id },
        data: updateData,
        include: {
          requester: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      })

      // Send approval result notification
      try {
        // await notificationService.sendExpenseApprovalResult(
        //   id,
        //   status === 'APPROVED' || status === 'PAID',
        //   rejectionReason
        // )
      } catch (error) {
        console.error('Failed to send expense approval result notification:', error)
        // Don't fail the entire operation if notification fails
      }

      return expenseReport
    }),

  // Delete expense report
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existingReport = await ctx.prisma.expenseReport.findFirst({
        where: {
          id: input.id,
          churchId: ctx.session.user.churchId,
        },
      })

      if (!existingReport) {
        throw new Error('지출결의서를 찾을 수 없습니다')
      }

      // Only creator or admin can delete, and only if it's pending or rejected
      const isCreator = existingReport.requesterId === ctx.session.user.id
      const isAdmin = canApproveExpenses(ctx.session.user.role as any)
      
      if (!isCreator && !isAdmin) {
        throw new Error('삭제 권한이 없습니다')
      }

      if (existingReport.status === 'APPROVED' || existingReport.status === 'PAID') {
        throw new Error('승인되거나 지급된 지출결의서는 삭제할 수 없습니다')
      }

      const expenseReport = await ctx.prisma.expenseReport.delete({
        where: { id: input.id },
      })

      return expenseReport
    }),

  // Get expense categories
  getCategories: protectedProcedure
    .query(async ({ ctx }) => {
      // Return enum values with Korean labels for display
      const categoryMapping = [
        { value: 'OFFICE', label: '사무용품' },
        { value: 'FACILITY', label: '시설/전기/가스/수도' },
        { value: 'EDUCATION', label: '교육/도서' },
        { value: 'MISSION', label: '선교/전도' },
        { value: 'WELFARE', label: '복지/구제' },
        { value: 'EVENT', label: '행사/모임' },
        { value: 'OTHER', label: '기타' },
      ]

      return categoryMapping
    }),

  // Get expense statistics
  getStats: protectedProcedure
    .input(expenseReportStatsSchema)
    .query(async ({ ctx, input }) => {
      const churchId = ctx.session.user.churchId
      const startDate = input?.startDate ? new Date(input.startDate) : undefined
      const endDate = input?.endDate ? new Date(input.endDate) : undefined
      const category = input?.category
      const status = input?.status

      const where = {
        churchId,
        ...(startDate && endDate && {
          requestDate: {
            gte: startDate,
            lte: endDate,
          },
        }),
        ...(category && { category }),
        ...(status && { status }),
      }

      const [
        totalReports,
        pendingReports,
        approvedReports,
        rejectedReports,
        paidReports,
        totalAmount,
        approvedAmount,
        paidAmount,
        categoryStats,
        monthlyStats,
        requesterStats,
      ] = await Promise.all([
        ctx.prisma.expenseReport.count({ where }),
        ctx.prisma.expenseReport.count({ where: { ...where, status: 'PENDING' } }),
        ctx.prisma.expenseReport.count({ where: { ...where, status: 'APPROVED' } }),
        ctx.prisma.expenseReport.count({ where: { ...where, status: 'REJECTED' } }),
        ctx.prisma.expenseReport.count({ where: { ...where, status: 'PAID' } }),
        
        // Amount aggregations
        ctx.prisma.expenseReport.aggregate({
          where,
          _sum: { amount: true },
        }),
        ctx.prisma.expenseReport.aggregate({
          where: { ...where, status: 'APPROVED' },
          _sum: { amount: true },
        }),
        ctx.prisma.expenseReport.aggregate({
          where: { ...where, status: 'PAID' },
          _sum: { amount: true },
        }),

        // Category statistics
        ctx.prisma.expenseReport.groupBy({
          by: ['category'],
          where,
          _count: true,
          _sum: { amount: true },
        }),

        // Monthly statistics for current year
        ctx.prisma.expenseReport.groupBy({
          by: ['requestDate'],
          where: {
            churchId,
            requestDate: {
              gte: new Date(new Date().getFullYear(), 0, 1),
              lte: new Date(new Date().getFullYear(), 11, 31),
            },
          },
          _count: true,
          _sum: { amount: true },
        }),

        // Requester statistics
        ctx.prisma.expenseReport.groupBy({
          by: ['requesterId'],
          where,
          _count: true,
          _sum: { amount: true },
        }),
      ])

      // Process monthly stats
      const monthlyData = Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        count: 0,
        amount: 0,
      }))

      monthlyStats.forEach(stat => {
        const month = new Date(stat.requestDate).getMonth()
        monthlyData[month].count += stat._count
        monthlyData[month].amount += Number(stat._sum.amount) || 0
      })

      return {
        totalReports,
        pendingReports,
        approvedReports,
        rejectedReports,
        paidReports,
        totalAmount: Number(totalAmount._sum.amount) || 0,
        approvedAmount: Number(approvedAmount._sum.amount) || 0,
        paidAmount: Number(paidAmount._sum.amount) || 0,
        averageAmount: totalReports > 0 ? (Number(totalAmount._sum.amount) || 0) / totalReports : 0,
        approvalRate: totalReports > 0 ? ((approvedReports + paidReports) / totalReports) * 100 : 0,
        categoryStats: categoryStats.map(stat => ({
          category: stat.category,
          count: stat._count,
          amount: Number(stat._sum.amount) || 0,
        })),
        monthlyData,
        requesterStats: requesterStats.length,
      }
    }),

  // Get recent activity
  getRecentActivity: protectedProcedure
    .input(z.object({
      limit: z.number().default(10),
      days: z.number().default(30),
    }))
    .query(async ({ ctx, input }) => {
      const since = new Date()
      since.setDate(since.getDate() - input.days)

      const recentReports = await ctx.prisma.expenseReport.findMany({
        where: {
          churchId: ctx.session.user.churchId,
          updatedAt: {
            gte: since,
          },
        },
        take: input.limit,
        include: {
          requester: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      })

      return recentReports
    }),

  // 예산 기반 지출 검증
  validateBudgetExpense: protectedProcedure
    .input(z.object({
      budgetItemId: z.string(),
      amount: z.number(),
      excludeExpenseId: z.string().optional(), // 수정 시 자기 자신 제외
    }))
    .query(async ({ ctx, input }) => {
      const { budgetItemId, amount, excludeExpenseId } = input

      const budgetExecution = await ctx.prisma.budgetExecution.findUnique({
        where: { budgetItemId },
        include: {
          budgetItem: {
            include: {
              budget: {
                select: {
                  id: true,
                  name: true,
                  status: true,
                  startDate: true,
                  endDate: true,
                  department: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      })

      if (!budgetExecution) {
        return {
          isValid: false,
          error: '예산 항목을 찾을 수 없습니다',
        }
      }

      if (budgetExecution.budgetItem.budget.status !== 'ACTIVE') {
        return {
          isValid: false,
          error: '활성화된 예산이 아닙니다',
        }
      }

      const now = new Date()
      const { startDate, endDate } = budgetExecution.budgetItem.budget

      if (now < startDate || now > endDate) {
        return {
          isValid: false,
          error: '예산 기간이 아닙니다',
        }
      }

      // 현재 사용 중인 예산 계산 (승인된 지출결의서)
      const usedAmountResult = await ctx.prisma.expenseReport.aggregate({
        where: {
          budgetItemId,
          status: { in: ['APPROVED', 'PAID'] },
          ...(excludeExpenseId && { id: { not: excludeExpenseId } }),
        },
        _sum: { amount: true },
      })

      // 승인 대기 중인 예산 계산
      const pendingAmountResult = await ctx.prisma.expenseReport.aggregate({
        where: {
          budgetItemId,
          status: 'PENDING',
          ...(excludeExpenseId && { id: { not: excludeExpenseId } }),
        },
        _sum: { amount: true },
      })

      const totalBudget = Number(budgetExecution.totalBudget)
      const usedAmount = Number(usedAmountResult._sum.amount || 0)
      const pendingAmount = Number(pendingAmountResult._sum.amount || 0)
      const remainingAmount = totalBudget - usedAmount - pendingAmount
      
      const isValid = remainingAmount >= amount
      const wouldExceed = !isValid
      const exceedAmount = wouldExceed ? amount - remainingAmount : 0

      return {
        isValid,
        budgetItem: budgetExecution.budgetItem,
        totalBudget,
        usedAmount,
        pendingAmount,
        remainingAmount,
        requestAmount: amount,
        wouldExceed,
        exceedAmount,
        executionRate: totalBudget > 0 ? (usedAmount / totalBudget) * 100 : 0,
        projectedRate: totalBudget > 0 ? ((usedAmount + pendingAmount + amount) / totalBudget) * 100 : 0,
        ...(wouldExceed && {
          error: `예산이 부족합니다. 잔여 예산: ${remainingAmount.toLocaleString()}원, 부족 금액: ${exceedAmount.toLocaleString()}원`
        }),
      }
    }),

  // 예산 잔액 실시간 조회
  getBudgetBalance: protectedProcedure
    .input(z.object({
      budgetItemId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      return validateBudgetExpense(input.budgetItemId, 0, ctx)
    }),

  // 다단계 승인 워크플로우 처리
  processApproval: managerProcedure
    .input(z.object({
      id: z.string(),
      action: z.enum(['APPROVE', 'REJECT']),
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, action, reason } = input

      const expense = await ctx.prisma.expenseReport.findFirst({
        where: {
          id,
          churchId: ctx.session.user.churchId,
        },
        include: {
          requester: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          budgetItem: {
            include: {
              budget: {
                select: {
                  department: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      })

      if (!expense) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '지출결의서를 찾을 수 없습니다',
        })
      }

      if (expense.status !== 'PENDING') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '이미 처리된 지출결의서입니다',
        })
      }

      // 예산 확인 (승인하는 경우에만)
      if (action === 'APPROVE' && expense.budgetItemId) {
        const budgetValidation = await validateBudgetExpense(
          expense.budgetItemId,
          Number(expense.amount),
          ctx,
          expense.id
        )

        if (!budgetValidation.isValid) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: budgetValidation.error || '예산 확인에 실패했습니다',
          })
        }
      }

      // 승인 단계 결정 (금액 및 정책에 따라)
      const approvalSteps = determineApprovalSteps(Number(expense.amount), expense.category)
      
      let updateData: any = {}

      if (action === 'APPROVE') {
        if (approvalSteps.requiresDepartmentApproval && !expense.departmentApprovedBy) {
          // 부서장 승인
          updateData = {
            departmentApprovedBy: ctx.session.user.id,
            departmentApprovedAt: new Date(),
          }
        } else if (approvalSteps.requiresFinanceApproval && !expense.financeApprovedBy) {
          // 재무담당 승인
          updateData = {
            financeApprovedBy: ctx.session.user.id,
            financeApprovedAt: new Date(),
          }
        } else if (approvalSteps.requiresFinalApproval && !expense.finalApprovedBy) {
          // 최종 승인
          updateData = {
            finalApprovedBy: ctx.session.user.id,
            finalApprovedAt: new Date(),
            status: 'APPROVED',
            approvedDate: new Date(),
          }
        } else {
          // 단일 승인 또는 모든 단계 완료
          updateData = {
            status: 'APPROVED',
            approvedDate: new Date(),
          }
        }
      } else {
        // 반려
        updateData = {
          status: 'REJECTED',
          rejectedDate: new Date(),
          rejectionReason: reason || '사유 없음',
        }
      }

      const updatedExpense = await ctx.prisma.$transaction(async (tx) => {
        const updated = await tx.expenseReport.update({
          where: { id },
          data: updateData,
          include: {
            requester: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            budgetItem: {
              include: {
                budget: {
                  select: {
                    name: true,
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
        })

        // 최종 승인된 경우 예산 집행 현황 업데이트
        if (updated.status === 'APPROVED' && updated.budgetItemId) {
          await updateBudgetExecution(updated.budgetItemId, tx)
        }

        return updated
      })

      return updatedExpense
    }),
})

// 헬퍼 함수들
async function validateBudgetExpense(
  budgetItemId: string,
  amount: number,
  ctx: any,
  excludeExpenseId?: string
) {
  const budgetExecution = await ctx.prisma.budgetExecution.findUnique({
    where: { budgetItemId },
    include: {
      budgetItem: {
        include: {
          budget: {
            select: {
              status: true,
              startDate: true,
              endDate: true,
            },
          },
        },
      },
    },
  })

  if (!budgetExecution) {
    return {
      isValid: false,
      error: '예산 항목을 찾을 수 없습니다',
    }
  }

  if (budgetExecution.budgetItem.budget.status !== 'ACTIVE') {
    return {
      isValid: false,
      error: '활성화된 예산이 아닙니다',
    }
  }

  const now = new Date()
  const { startDate, endDate } = budgetExecution.budgetItem.budget

  if (now < startDate || now > endDate) {
    return {
      isValid: false,
      error: '예산 기간이 아닙니다',
    }
  }

  // 현재 사용된 예산과 대기 중인 예산 계산
  const [usedResult, pendingResult] = await Promise.all([
    ctx.prisma.expenseReport.aggregate({
      where: {
        budgetItemId,
        status: { in: ['APPROVED', 'PAID'] },
        ...(excludeExpenseId && { id: { not: excludeExpenseId } }),
      },
      _sum: { amount: true },
    }),
    ctx.prisma.expenseReport.aggregate({
      where: {
        budgetItemId,
        status: 'PENDING',
        ...(excludeExpenseId && { id: { not: excludeExpenseId } }),
      },
      _sum: { amount: true },
    }),
  ])

  const totalBudget = Number(budgetExecution.totalBudget)
  const usedAmount = Number(usedResult._sum.amount || 0)
  const pendingAmount = Number(pendingResult._sum.amount || 0)
  const remainingAmount = totalBudget - usedAmount - pendingAmount

  return {
    isValid: remainingAmount >= amount,
    totalBudget,
    usedAmount,
    pendingAmount,
    remainingAmount,
    error: remainingAmount < amount 
      ? `예산이 부족합니다. 잔여 예산: ${remainingAmount.toLocaleString()}원` 
      : undefined,
  }
}

function determineApprovalSteps(amount: number, category: string) {
  // 금액과 카테고리에 따른 승인 단계 결정
  const requiresDepartmentApproval = amount >= 100000 // 10만원 이상
  const requiresFinanceApproval = amount >= 500000    // 50만원 이상
  const requiresFinalApproval = amount >= 1000000     // 100만원 이상

  return {
    requiresDepartmentApproval,
    requiresFinanceApproval,
    requiresFinalApproval,
  }
}

async function updateBudgetExecution(budgetItemId: string, tx: any) {
  // 예산 집행 현황 재계산
  const [usedResult, pendingResult, budgetItem] = await Promise.all([
    tx.expenseReport.aggregate({
      where: {
        budgetItemId,
        status: { in: ['APPROVED', 'PAID'] },
      },
      _sum: { amount: true },
    }),
    tx.expenseReport.aggregate({
      where: {
        budgetItemId,
        status: 'PENDING',
      },
      _sum: { amount: true },
    }),
    tx.budgetItem.findUnique({
      where: { id: budgetItemId },
      select: { amount: true },
    }),
  ])

  const totalBudget = Number(budgetItem?.amount || 0)
  const usedAmount = Number(usedResult._sum.amount || 0)
  const pendingAmount = Number(pendingResult._sum.amount || 0)
  const remainingAmount = totalBudget - usedAmount - pendingAmount
  const executionRate = totalBudget > 0 ? (usedAmount / totalBudget) * 100 : 0

  await tx.budgetExecution.update({
    where: { budgetItemId },
    data: {
      usedAmount,
      pendingAmount,
      remainingAmount,
      executionRate,
    },
  })
}