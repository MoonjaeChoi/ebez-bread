import { z } from 'zod'
import { router, protectedProcedure, adminProcedure } from '@/lib/trpc/server'
import { TRPCError } from '@trpc/server'
import { ApprovalService } from '@/server/services/approval.service'
import { ApprovalMatrixCategory, ApprovalStepStatus, ApprovalFlowStatus } from '@prisma/client'

// 결재 라우터
export const approvalsRouter = router({
  /**
   * 결재선 미리보기 생성
   */
  previewApprovalFlow: protectedProcedure
    .input(z.object({
      organizationId: z.string(),
      amount: z.number().positive(),
      category: z.nativeEnum(ApprovalMatrixCategory),
      description: z.string().min(1),
      priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional().default('NORMAL')
    }))
    .query(async ({ ctx, input }) => {
      try {
        const approvalService = new ApprovalService(ctx.prisma)
        
        // 임시 요청으로 결재선 미리보기 생성
        const preview = await approvalService['approvalEngine'].generateApprovalFlow({
          transactionId: 'preview', // 미리보기용 임시 ID
          organizationId: input.organizationId,
          requesterId: ctx.session.user.id,
          amount: input.amount,
          category: input.category,
          description: input.description,
          priority: input.priority
        })

        return preview
      } catch (error) {
        console.error('Error generating approval flow preview:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: '결재선 미리보기 생성 중 오류가 발생했습니다.'
        })
      }
    }),

  /**
   * 결재선 생성 및 지출 요청 제출
   */
  createApprovalFlow: protectedProcedure
    .input(z.object({
      transactionId: z.string(),
      organizationId: z.string(),
      amount: z.number().positive(),
      category: z.nativeEnum(ApprovalMatrixCategory),
      description: z.string().min(1),
      priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional().default('NORMAL')
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const approvalService = new ApprovalService(ctx.prisma)
        
        const flowId = await approvalService.submitExpenseRequest({
          transactionId: input.transactionId,
          organizationId: input.organizationId,
          requesterId: ctx.session.user.id,
          amount: input.amount,
          category: input.category,
          description: input.description,
          priority: input.priority
        })

        return { flowId, success: true }
      } catch (error) {
        console.error('Error creating approval flow:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : '결재선 생성 중 오류가 발생했습니다.'
        })
      }
    }),

  /**
   * 결재 처리 (승인/반려)
   */
  processApproval: protectedProcedure
    .input(z.object({
      stepId: z.string(),
      action: z.enum(['APPROVE', 'REJECT']),
      comments: z.string().optional(),
      attachments: z.array(z.string()).optional()
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const approvalService = new ApprovalService(ctx.prisma)
        
        const result = await approvalService.processApproval({
          stepId: input.stepId,
          action: input.action,
          comments: input.comments,
          attachments: input.attachments,
          approverId: ctx.session.user.id
        })

        return result
      } catch (error) {
        console.error('Error processing approval:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : '결재 처리 중 오류가 발생했습니다.'
        })
      }
    }),

  /**
   * 결재 현황 조회
   */
  getApprovalStatus: protectedProcedure
    .input(z.object({
      flowId: z.string()
    }))
    .query(async ({ ctx, input }) => {
      try {
        const approvalFlow = await ctx.prisma.approvalFlow.findUnique({
          where: { id: input.flowId },
          include: {
            transaction: {
              include: {
                requester: true,
                organization: true
              }
            },
            requester: true,
            organization: true,
            steps: {
              include: {
                approver: true,
                organization: true
              },
              orderBy: { stepOrder: 'asc' }
            }
          }
        })

        if (!approvalFlow) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: '결재 정보를 찾을 수 없습니다.'
          })
        }

        // 요청자이거나 결재자인 경우에만 조회 가능
        const isRequester = approvalFlow.requesterId === ctx.session.user.id
        const isApprover = approvalFlow.steps.some(step => step.approverId === ctx.session.user.id)
        
        if (!isRequester && !isApprover) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: '결재 정보를 조회할 권한이 없습니다.'
          })
        }

        return approvalFlow
      } catch (error) {
        if (error instanceof TRPCError) throw error
        
        console.error('Error getting approval status:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: '결재 현황 조회 중 오류가 발생했습니다.'
        })
      }
    }),

  /**
   * 거래 ID로 결재 플로우 조회
   */
  getApprovalFlowByTransaction: protectedProcedure
    .input(z.object({
      transactionId: z.string()
    }))
    .query(async ({ ctx, input }) => {
      try {
        const approvalFlow = await ctx.prisma.approvalFlow.findUnique({
          where: { transactionId: input.transactionId },
          include: {
            transaction: {
              include: {
                requester: true,
                organization: true
              }
            },
            requester: true,
            organization: true,
            steps: {
              include: {
                approver: true,
                organization: true
              },
              orderBy: { stepOrder: 'asc' }
            }
          }
        })

        if (!approvalFlow) {
          return null // 결재 플로우가 없는 경우 null 반환 (에러 아님)
        }

        // 요청자이거나 결재자인 경우에만 조회 가능
        const isRequester = approvalFlow.requesterId === ctx.session.user.id
        const isApprover = approvalFlow.steps.some(step => step.approverId === ctx.session.user.id)
        
        if (!isRequester && !isApprover) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: '결재 정보를 조회할 권한이 없습니다.'
          })
        }

        return approvalFlow
      } catch (error) {
        if (error instanceof TRPCError) throw error
        
        console.error('Error getting approval flow by transaction:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: '결재 플로우 조회 중 오류가 발생했습니다.'
        })
      }
    }),

  /**
   * 내 대기 중인 결재 목록
   */
  getPendingApprovals: protectedProcedure
    .input(z.object({
      status: z.nativeEnum(ApprovalStepStatus).optional(),
      priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
      organizationId: z.string().optional(),
      page: z.number().int().positive().default(1),
      limit: z.number().int().positive().max(100).default(20)
    }))
    .query(async ({ ctx, input }) => {
      try {
        const approvalService = new ApprovalService(ctx.prisma)
        
        const pendingApprovals = await approvalService.getPendingApprovals(
          ctx.session.user.id,
          input.page,
          input.limit
        )

        // 필터링 적용
        let filteredApprovals = pendingApprovals

        if (input.status) {
          filteredApprovals = filteredApprovals.filter(
            approval => approval.status === input.status
          )
        }

        if (input.priority) {
          filteredApprovals = filteredApprovals.filter(
            approval => approval.flow.priority === input.priority
          )
        }

        if (input.organizationId) {
          filteredApprovals = filteredApprovals.filter(
            approval => approval.flow.organizationId === input.organizationId
          )
        }

        return {
          approvals: filteredApprovals,
          total: filteredApprovals.length,
          page: input.page,
          limit: input.limit
        }
      } catch (error) {
        console.error('Error getting pending approvals:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: '대기 중인 결재 목록 조회 중 오류가 발생했습니다.'
        })
      }
    }),

  /**
   * 내 요청 현황
   */
  getMyRequests: protectedProcedure
    .input(z.object({
      status: z.nativeEnum(ApprovalFlowStatus).optional(),
      category: z.nativeEnum(ApprovalMatrixCategory).optional(),
      dateRange: z.object({
        from: z.date(),
        to: z.date()
      }).optional(),
      page: z.number().int().positive().default(1),
      limit: z.number().int().positive().max(100).default(20)
    }))
    .query(async ({ ctx, input }) => {
      try {
        const approvalService = new ApprovalService(ctx.prisma)
        
        const myRequests = await approvalService.getMyRequests(
          ctx.session.user.id,
          input.page,
          input.limit
        )

        // 필터링 적용
        let filteredRequests = myRequests

        if (input.status) {
          filteredRequests = filteredRequests.filter(
            request => request.status === input.status
          )
        }

        if (input.category) {
          filteredRequests = filteredRequests.filter(
            request => request.category === input.category
          )
        }

        if (input.dateRange) {
          filteredRequests = filteredRequests.filter(
            request => {
              const createdAt = new Date(request.createdAt)
              return createdAt >= input.dateRange!.from && createdAt <= input.dateRange!.to
            }
          )
        }

        return {
          requests: filteredRequests,
          total: filteredRequests.length,
          page: input.page,
          limit: input.limit
        }
      } catch (error) {
        console.error('Error getting my requests:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: '내 요청 현황 조회 중 오류가 발생했습니다.'
        })
      }
    }),

  /**
   * 조직별 결재 통계
   */
  getApprovalStats: protectedProcedure
    .input(z.object({
      organizationId: z.string().optional(),
      dateRange: z.object({
        from: z.date(),
        to: z.date()
      }).optional().default(() => ({
        from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30일 전
        to: new Date()
      }))
    }))
    .query(async ({ ctx, input }) => {
      try {
        const whereCondition = {
          createdAt: {
            gte: input.dateRange.from,
            lte: input.dateRange.to
          },
          ...(input.organizationId && { organizationId: input.organizationId })
        }

        // 전체 결재 건수
        const totalCount = await ctx.prisma.approvalFlow.count({
          where: whereCondition
        })

        // 상태별 집계
        const statusCounts = await ctx.prisma.approvalFlow.groupBy({
          by: ['status'],
          where: whereCondition,
          _count: { status: true }
        })

        // 평균 결재 시간 계산 (완료된 건만)
        const completedFlows = await ctx.prisma.approvalFlow.findMany({
          where: {
            ...whereCondition,
            status: { in: ['APPROVED', 'REJECTED'] },
            completedAt: { not: null }
          },
          select: {
            createdAt: true,
            completedAt: true
          }
        })

        const avgApprovalTime = completedFlows.length > 0
          ? completedFlows.reduce((sum, flow) => {
              const diffHours = (flow.completedAt!.getTime() - flow.createdAt.getTime()) / (1000 * 60 * 60)
              return sum + diffHours
            }, 0) / completedFlows.length
          : 0

        // 승인율 계산
        const approvedCount = statusCounts.find(s => s.status === 'APPROVED')?._count.status || 0
        const rejectedCount = statusCounts.find(s => s.status === 'REJECTED')?._count.status || 0
        const completedTotal = approvedCount + rejectedCount
        const approvalRate = completedTotal > 0 ? (approvedCount / completedTotal) * 100 : 0

        return {
          totalCount,
          pendingCount: statusCounts.find(s => s.status === 'PENDING')?._count.status || 0,
          approvedCount,
          rejectedCount,
          avgApprovalTime: Math.round(avgApprovalTime * 100) / 100,
          approvalRate: Math.round(approvalRate * 100) / 100,
          statusBreakdown: statusCounts.map(s => ({
            status: s.status,
            count: s._count.status
          }))
        }
      } catch (error) {
        console.error('Error getting approval stats:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: '결재 통계 조회 중 오류가 발생했습니다.'
        })
      }
    }),

  /**
   * 결재 매트릭스 목록 조회 (관리자용)
   */
  getApprovalMatrices: adminProcedure
    .query(async ({ ctx }) => {
      try {
        const matrices = await ctx.prisma.approvalMatrix.findMany({
          where: {
            churchId: ctx.session.user.churchId,
            isActive: true
          },
          include: {
            approvalLevels: {
              orderBy: { levelOrder: 'asc' }
            },
            organization: true,
            createdBy: {
              select: { name: true, email: true }
            }
          },
          orderBy: [
            { priority: 'desc' },
            { name: 'asc' }
          ]
        })

        return matrices
      } catch (error) {
        console.error('Error getting approval matrices:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: '결재 매트릭스 조회 중 오류가 발생했습니다.'
        })
      }
    }),

  /**
   * 조직별 결재권자 목록 조회
   */
  getApproversByOrganization: protectedProcedure
    .input(z.object({
      organizationId: z.string(),
      requiredRoles: z.array(z.string()).optional()
    }))
    .query(async ({ ctx, input }) => {
      try {
        const memberships = await ctx.prisma.organizationMembership.findMany({
          where: {
            organizationId: input.organizationId,
            isActive: true,
            role: {
              isActive: true,
              isLeadership: true,
              ...(input.requiredRoles && { name: { in: input.requiredRoles } })
            },
            member: {
              status: 'ACTIVE'
            }
          },
          include: {
            member: true,
            role: true,
            organization: true
          },
          orderBy: {
            role: {
              level: 'desc'
            }
          }
        })

        return memberships.map(membership => ({
          userId: membership.member.id,
          userName: membership.member.name,
          userEmail: membership.member.email,
          roleName: membership.role?.name,
          roleLevel: membership.role?.level,
          organizationName: membership.organization.name,
          isLeadership: membership.role?.isLeadership || false
        })).filter(approver => approver.userId) // userId가 있는 것만 반환
      } catch (error) {
        console.error('Error getting approvers by organization:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: '조직별 결재권자 조회 중 오류가 발생했습니다.'
        })
      }
    }),
})