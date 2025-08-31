import { z } from 'zod'
import { router, protectedProcedure, managerProcedure, adminProcedure } from '@/lib/trpc/server'
import { ReportStatus, WorkflowStatus, ApprovalStatus, UserRole } from '@prisma/client'
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
  // 3단계 결재담당자 지정
  approvers: z.object({
    step1: z.string().optional(), // 부서회계 담당자
    step2: z.string().optional(), // 부서장
    step3: z.string().optional(), // 교구장
  }).optional(),
})

const expenseReportUpdateSchema = expenseReportCreateSchema.extend({
  id: z.string(),
})

const expenseReportApprovalSchema = z.object({
  id: z.string(),
  status: z.enum(['APPROVED', 'REJECTED', 'PAID']),
  rejectionReason: z.string().optional(),
})

// 3단계 워크플로우 승인 스키마
const workflowApprovalSchema = z.object({
  expenseReportId: z.string(),
  action: z.enum(['APPROVE', 'REJECT']),
  comment: z.string().optional(),
})

// 지출결의서 제출 스키마
const expenseSubmitSchema = z.object({
  id: z.string(),
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
        ...(category && { category: category as any }),
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
          approvals: {
            orderBy: { stepOrder: 'asc' },
            include: {
              approver: {
                select: {
                  id: true,
                  name: true,
                },
              },
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
        const { approvers, ...createData } = input
        const newExpenseReport = await tx.expenseReport.create({
          data: {
            ...createData,
            category: input.category as any,
            requesterId: ctx.session.user.id,
            churchId: ctx.session.user.churchId,
            status: 'PENDING',
            workflowStatus: 'DRAFT',
            currentStep: 0,
            totalSteps: 3,
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

        // 3단계 승인 워크플로우 단계 생성
        await createApprovalSteps(newExpenseReport.id, tx, approvers)

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
      const { id, ...inputData } = input
      const data = {
        ...inputData,
        category: inputData.category as any,
      }

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
        ...(category && { category: category as any }),
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

      // 간단한 승인/반려 처리
      let updateData: any = {}

      if (action === 'APPROVE') {
        updateData = {
          status: 'APPROVED',
          approvedDate: new Date(),
        }
      } else {
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

  // 지출결의서 제출 (초안 -> 승인 대기)
  submit: protectedProcedure
    .input(expenseSubmitSchema)
    .mutation(async ({ ctx, input }) => {
      const { id } = input

      const expense = await ctx.prisma.expenseReport.findFirst({
        where: {
          id,
          requesterId: ctx.session.user.id,
          churchId: ctx.session.user.churchId,
        },
      })

      if (!expense) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '지출결의서를 찾을 수 없습니다',
        })
      }

      if (expense.workflowStatus !== 'DRAFT') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '초안 상태의 지출결의서만 제출할 수 있습니다',
        })
      }

      // 제출 시 첫 번째 승인 단계로 진행
      const updatedExpense = await ctx.prisma.$transaction(async (tx) => {
        const updated = await tx.expenseReport.update({
          where: { id },
          data: {
            workflowStatus: 'IN_PROGRESS',
            currentStep: 1,
            status: 'PENDING',
          },
          include: {
            approvals: {
              orderBy: { stepOrder: 'asc' },
            },
          },
        })

        // 첫 번째 단계(부서회계) 알림 발송
        await sendApprovalNotification(updated.id, 1, tx)

        return updated
      })

      return updatedExpense
    }),

  // 워크플로우 승인/반려 처리
  approveWorkflowStep: protectedProcedure
    .input(workflowApprovalSchema)
    .mutation(async ({ ctx, input }) => {
      const { expenseReportId, action, comment } = input
      const userId = ctx.session.user.id
      const userRole = ctx.session.user.role as UserRole

      const expense = await ctx.prisma.expenseReport.findFirst({
        where: {
          id: expenseReportId,
          churchId: ctx.session.user.churchId,
        },
        include: {
          approvals: {
            orderBy: { stepOrder: 'asc' },
          },
        },
      })

      if (!expense) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '지출결의서를 찾을 수 없습니다',
        })
      }

      if (expense.workflowStatus !== 'IN_PROGRESS') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '승인 진행 중인 지출결의서가 아닙니다',
        })
      }

      // 현재 승인 단계 확인
      const currentApproval = expense.approvals.find(
        approval => approval.stepOrder === expense.currentStep && approval.status === 'PENDING'
      )

      if (!currentApproval) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '현재 승인 단계를 찾을 수 없습니다',
        })
      }

      // 승인 권한 확인
      if (!canApproveAtStep(userRole, currentApproval.stepOrder)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: '이 단계의 승인 권한이 없습니다',
        })
      }

      return await ctx.prisma.$transaction(async (tx) => {
        // 현재 단계 승인/반려 처리
        await tx.approvalStep.update({
          where: { id: currentApproval.id },
          data: {
            status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
            approverId: userId,
            approvedAt: action === 'APPROVE' ? new Date() : null,
            rejectedAt: action === 'REJECT' ? new Date() : null,
            comment,
          },
        })

        let updatedExpense
        
        if (action === 'REJECT') {
          // 반려된 경우 전체 워크플로우 종료
          updatedExpense = await tx.expenseReport.update({
            where: { id: expenseReportId },
            data: {
              workflowStatus: 'REJECTED',
              status: 'REJECTED',
              rejectedDate: new Date(),
              rejectionReason: comment || '승인자가 반려하였습니다',
            },
            include: {
              approvals: {
                orderBy: { stepOrder: 'asc' },
              },
            },
          })

          // 신청자에게 반려 알림
          await sendRejectionNotification(expenseReportId, expense.currentStep, comment, tx)
        } else {
          // 승인된 경우
          if (expense.currentStep >= expense.totalSteps) {
            // 최종 승인 완료
            updatedExpense = await tx.expenseReport.update({
              where: { id: expenseReportId },
              data: {
                workflowStatus: 'APPROVED',
                status: 'APPROVED',
                approvedDate: new Date(),
              },
              include: {
                approvals: {
                  orderBy: { stepOrder: 'asc' },
                },
              },
            })

            // 최종 승인 완료 알림
            await sendFinalApprovalNotification(expenseReportId, tx)
          } else {
            // 다음 승인 단계로 진행
            const nextStep = expense.currentStep + 1
            updatedExpense = await tx.expenseReport.update({
              where: { id: expenseReportId },
              data: {
                currentStep: nextStep,
              },
              include: {
                approvals: {
                  orderBy: { stepOrder: 'asc' },
                },
              },
            })

            // 다음 단계 승인자에게 알림
            await sendApprovalNotification(expenseReportId, nextStep, tx)
          }
        }

        return updatedExpense
      })
    }),

  // 결재 담당자 후보 목록 조회
  getApprovalCandidates: protectedProcedure
    .query(async ({ ctx }) => {
      const candidates = await ctx.prisma.user.findMany({
        where: {
          churchId: ctx.session.user.churchId,
          isActive: true,
          role: {
            in: ['DEPARTMENT_ACCOUNTANT', 'DEPARTMENT_HEAD', 'COMMITTEE_CHAIR', 'FINANCIAL_MANAGER', 'SUPER_ADMIN']
          }
        },
        select: {
          id: true,
          name: true,
          role: true,
          email: true,
        },
        orderBy: [
          { role: 'asc' },
          { name: 'asc' }
        ]
      })

      // 역할별로 그룹화
      const groupedCandidates = {
        step1: candidates.filter(u => ['DEPARTMENT_ACCOUNTANT', 'FINANCIAL_MANAGER', 'SUPER_ADMIN'].includes(u.role)),
        step2: candidates.filter(u => ['DEPARTMENT_HEAD'].includes(u.role)), // 부서장만 필터링
        step3: candidates.filter(u => ['COMMITTEE_CHAIR'].includes(u.role)), // 교구장(위원장)만 필터링
      }

      return groupedCandidates
    }),

  // 내가 승인해야 할 지출결의서 목록
  getMyApprovals: protectedProcedure
    .input(z.object({
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(20),
    }))
    .query(async ({ ctx, input }) => {
      const { page, limit } = input
      const skip = (page - 1) * limit
      const userRole = ctx.session.user.role as UserRole

      // 사용자 역할에 따른 승인 가능한 단계 확인
      const approvalSteps = getApprovalStepsForRole(userRole)
      if (approvalSteps.length === 0) {
        return {
          expenseReports: [],
          total: 0,
          pages: 0,
          currentPage: page,
        }
      }

      const where = {
        churchId: ctx.session.user.churchId,
        workflowStatus: 'IN_PROGRESS' as WorkflowStatus,
        approvals: {
          some: {
            stepOrder: { in: approvalSteps },
            status: 'PENDING' as ApprovalStatus,
          },
        },
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
            approvals: {
              orderBy: { stepOrder: 'asc' },
              include: {
                approver: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: { requestDate: 'asc' },
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

// 3단계 승인 워크플로우 단계 생성
async function createApprovalSteps(expenseReportId: string, tx: any, approvers?: { step1?: string; step2?: string; step3?: string }) {
  const steps = [
    { stepOrder: 1, role: 'DEPARTMENT_ACCOUNTANT', assignedUserId: approvers?.step1 || null }, // 부서회계
    { stepOrder: 2, role: 'DEPARTMENT_HEAD', assignedUserId: approvers?.step2 || null },       // 부서장
    { stepOrder: 3, role: 'COMMITTEE_CHAIR', assignedUserId: approvers?.step3 || null },       // 교구장
  ]

  for (const step of steps) {
    await tx.approvalStep.create({
      data: {
        expenseReportId,
        stepOrder: step.stepOrder,
        role: step.role as UserRole,
        assignedUserId: step.assignedUserId,
        status: 'PENDING',
      },
    })
  }
}

// 역할별 승인 가능한 단계 반환
function getApprovalStepsForRole(role: UserRole): number[] {
  switch (role) {
    case 'DEPARTMENT_ACCOUNTANT':
      return [1] // 1단계: 부서회계
    case 'DEPARTMENT_HEAD':
      return [2] // 2단계: 부서장
    case 'COMMITTEE_CHAIR':
      return [3] // 3단계: 교구장
    case 'SUPER_ADMIN':
    case 'FINANCIAL_MANAGER':
      return [1, 2, 3] // 모든 단계 승인 가능
    default:
      return []
  }
}

// 특정 단계에서 승인 권한 확인
function canApproveAtStep(role: UserRole, stepOrder: number): boolean {
  const allowedSteps = getApprovalStepsForRole(role)
  return allowedSteps.includes(stepOrder)
}

// 승인 요청 알림 발송
async function sendApprovalNotification(expenseReportId: string, stepOrder: number, tx: any) {
  try {
    const expense = await tx.expenseReport.findUnique({
      where: { id: expenseReportId },
      include: {
        requester: { select: { name: true } },
        approvals: {
          where: { stepOrder },
          include: {
            assignedUser: { select: { id: true, name: true } }
          }
        }
      }
    })

    if (!expense) return

    const currentApprovalStep = expense.approvals[0]
    if (!currentApprovalStep) return

    // 지정된 승인자가 있으면 그 사람에게만, 없으면 해당 역할을 가진 모든 사용자에게
    let approvers = []
    
    if (currentApprovalStep.assignedUserId && currentApprovalStep.assignedUser) {
      // 지정된 승인자에게만 알림
      approvers = [currentApprovalStep.assignedUser]
    } else {
      // 역할에 따른 모든 승인자에게 알림
      const roleForStep = stepOrder === 1 ? 'DEPARTMENT_ACCOUNTANT' :
                         stepOrder === 2 ? 'DEPARTMENT_HEAD' :
                         stepOrder === 3 ? 'COMMITTEE_CHAIR' : null

      if (!roleForStep) return

      approvers = await tx.user.findMany({
        where: {
          churchId: expense.churchId,
          role: roleForStep,
          isActive: true,
        }
      })
    }

    for (const approver of approvers) {
      await tx.notificationQueue.create({
        data: {
          type: 'EXPENSE_WORKFLOW_STEP_APPROVAL',
          recipientType: 'USER',
          recipientId: approver.id,
          title: `지출결의서 승인 요청`,
          message: `${expense.requester.name}님이 ${formatCurrency(Number(expense.amount))} 지출결의서 승인을 요청했습니다. (${getStepName(stepOrder)} 단계)`,
          relatedId: expenseReportId,
          relatedType: 'EXPENSE_REPORT',
          churchId: expense.churchId,
          priority: 'NORMAL',
          scheduledAt: new Date(),
        }
      })
    }

    logger.info('Approval notification sent', { churchId: expense.churchId })
  } catch (error) {
    logger.error('Failed to send approval notification', error as Error)
  }
}

// 반려 알림 발송
async function sendRejectionNotification(expenseReportId: string, stepOrder: number, comment: string | undefined, tx: any) {
  try {
    const expense = await tx.expenseReport.findUnique({
      where: { id: expenseReportId },
      include: {
        requester: { select: { id: true, name: true } }
      }
    })

    if (!expense) return

    // 신청자에게 반려 알림
    await tx.notificationQueue.create({
      data: {
        type: 'EXPENSE_WORKFLOW_REJECTED',
        recipientType: 'USER',
        recipientId: expense.requesterId,
        title: `지출결의서 반려`,
        message: `${formatCurrency(Number(expense.amount))} 지출결의서가 ${getStepName(stepOrder)} 단계에서 반려되었습니다.${comment ? ` 사유: ${comment}` : ''}`,
        relatedId: expenseReportId,
        relatedType: 'EXPENSE_REPORT',
        churchId: expense.churchId,
        priority: 'HIGH',
        scheduledAt: new Date(),
      }
    })

    logger.info('Rejection notification sent', { churchId: expense.churchId })
  } catch (error) {
    logger.error('Failed to send rejection notification', error as Error)
  }
}

// 최종 승인 완료 알림 발송
async function sendFinalApprovalNotification(expenseReportId: string, tx: any) {
  try {
    const expense = await tx.expenseReport.findUnique({
      where: { id: expenseReportId },
      include: {
        requester: { select: { id: true, name: true } }
      }
    })

    if (!expense) return

    // 신청자에게 최종 승인 완료 알림
    await tx.notificationQueue.create({
      data: {
        type: 'EXPENSE_WORKFLOW_APPROVED',
        recipientType: 'USER',
        recipientId: expense.requesterId,
        title: `지출결의서 최종 승인`,
        message: `${formatCurrency(Number(expense.amount))} 지출결의서가 모든 단계의 승인을 완료했습니다. 지급 처리를 기다리고 있습니다.`,
        relatedId: expenseReportId,
        relatedType: 'EXPENSE_REPORT',
        churchId: expense.churchId,
        priority: 'NORMAL',
        scheduledAt: new Date(),
      }
    })

    logger.info('Final approval notification sent', { churchId: expense.churchId })
  } catch (error) {
    logger.error('Failed to send final approval notification', error as Error)
  }
}

// 단계 이름 반환
function getStepName(stepOrder: number): string {
  switch (stepOrder) {
    case 1: return '부서회계'
    case 2: return '부서장'
    case 3: return '교구장'
    default: return '알 수 없음'
  }
}

// 통화 형식 함수
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
  }).format(amount)
}