import { PrismaClient } from '@prisma/client'
import type { 
  CreateApprovalFlowRequest, 
  ProcessApprovalRequest, 
  ApprovalResult,
  ApprovalFlowWithDetails,
  TransactionApprovalStepWithDetails 
} from '@/types/approval'
import { ApprovalEngine } from '@/lib/approval/approval-engine'
import { notificationService } from '@/lib/notifications/service'

export class ApprovalService {
  private approvalEngine: ApprovalEngine

  constructor(private prisma: PrismaClient) {
    this.approvalEngine = new ApprovalEngine(prisma)
  }

  /**
   * 지출 요청 제출 및 결재선 생성
   */
  async submitExpenseRequest(request: CreateApprovalFlowRequest): Promise<string> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // 1. 결재선 미리보기 생성
        const approvalPreview = await this.approvalEngine.generateApprovalFlow(request)

        if (approvalPreview.steps.length === 0) {
          throw new Error('결재선을 생성할 수 없습니다.')
        }

        // 2. ApprovalFlow 생성
        const approvalFlow = await tx.approvalFlow.create({
          data: {
            transactionId: request.transactionId,
            requesterId: request.requesterId,
            organizationId: request.organizationId,
            amount: request.amount,
            category: request.category,
            priority: request.priority || 'NORMAL',
            totalSteps: approvalPreview.totalSteps,
            currentStep: 1,
            status: 'PENDING'
          }
        })

        // 3. ApprovalStep들 생성
        for (const stepInfo of approvalPreview.steps) {
          // 결재자의 조직 정보 조회
          const approverMembership = await tx.organizationMembership.findFirst({
            where: {
              member: {
                id: stepInfo.approverId
              },
              isActive: true
            },
            include: {
              organization: true
            }
          })

          await (tx as any).transactionApprovalStep.create({
            data: {
              flowId: approvalFlow.id,
              stepOrder: stepInfo.stepOrder,
              approverId: stepInfo.approverId,
              approverRole: stepInfo.approverRole,
              organizationId: approverMembership?.organizationId || request.organizationId,
              status: 'PENDING',
              isRequired: stepInfo.isRequired,
              isParallel: stepInfo.isParallel || false,
              timeoutHours: stepInfo.timeoutHours
            }
          })
        }

        // 4. Transaction 상태 업데이트
        await tx.transaction.update({
          where: { id: request.transactionId },
          data: {
            submittedAt: new Date()
          }
        })

        // 5. 첫 번째 결재자에게 알림 발송
        if (approvalPreview.steps.length > 0) {
          const firstStep = approvalPreview.steps[0]
          await notificationService.sendApprovalRequest(
            firstStep.approverId, 
            request.transactionId, 
            request.organizationId || ''
          )
        }

        return approvalFlow.id
      })
    } catch (error) {
      console.error('Error submitting expense request:', error)
      throw new Error('지출 요청 제출 중 오류가 발생했습니다.')
    }
  }

  /**
   * 결재 처리 (승인/반려)
   */
  async processApproval(request: ProcessApprovalRequest): Promise<ApprovalResult> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // 1. 결재 단계 조회
        const step = await (tx as any).transactionApprovalStep.findUnique({
          where: { id: request.stepId },
          include: {
            flow: {
              include: {
                steps: { orderBy: { stepOrder: 'asc' } },
                transaction: true
              }
            }
          }
        })

        if (!step) {
          throw new Error('결재 단계를 찾을 수 없습니다.')
        }

        // 2. 결재 권한 검증
        this.validateApprovalAuthority(step, request.approverId)

        // 3. 결재 처리
        if (request.action === 'APPROVE') {
          return await this.approveStep(tx, step, request)
        } else {
          return await this.rejectStep(tx, step, request)
        }
      })
    } catch (error) {
      console.error('Error processing approval:', error)
      throw new Error('결재 처리 중 오류가 발생했습니다.')
    }
  }

  /**
   * 결재 단계 승인 처리
   */
  private async approveStep(
    tx: any, 
    step: any, 
    request: ProcessApprovalRequest
  ): Promise<ApprovalResult> {
    // 1. 결재 단계 승인 처리
    await (tx as any).transactionApprovalStep.update({
      where: { id: step.id },
      data: {
        status: 'APPROVED',
        processedAt: new Date(),
        comments: request.comments,
        attachments: request.attachments ? JSON.stringify(request.attachments) : null
      }
    })

    // 2. 다음 단계 확인
    const nextStep = step.flow.steps.find((s: any) => 
      s.stepOrder === step.stepOrder + 1 && s.status === 'PENDING'
    )

    if (nextStep) {
      // 다음 단계로 진행
      await tx.approvalFlow.update({
        where: { id: step.flowId },
        data: {
          currentStep: nextStep.stepOrder,
          status: 'IN_PROGRESS'
        }
      })

      // 다음 결재자에게 알림 발송
      await notificationService.sendApprovalRequest(
        nextStep.approverId, 
        step.flow.transactionId, 
        step.flow.transaction.requester?.churchId || ''
      )

      return {
        success: true,
        nextStepId: nextStep.id,
        isCompleted: false,
        message: '결재가 승인되었습니다. 다음 단계로 진행됩니다.'
      }
    } else {
      // 최종 승인 완료
      await this.completeApproval(tx, step.flow.transactionId, step.flowId)

      return {
        success: true,
        isCompleted: true,
        message: '모든 결재가 완료되었습니다.'
      }
    }
  }

  /**
   * 결재 단계 반려 처리
   */
  private async rejectStep(
    tx: any, 
    step: any, 
    request: ProcessApprovalRequest
  ): Promise<ApprovalResult> {
    // 1. 결재 단계 반려 처리
    await (tx as any).transactionApprovalStep.update({
      where: { id: step.id },
      data: {
        status: 'REJECTED',
        processedAt: new Date(),
        comments: request.comments,
        attachments: request.attachments ? JSON.stringify(request.attachments) : null
      }
    })

    // 2. 전체 결재 플로우 반려 처리
    await tx.approvalFlow.update({
      where: { id: step.flowId },
      data: {
        status: 'REJECTED',
        completedAt: new Date()
      }
    })

    // 3. Transaction 반려 처리
    await tx.transaction.update({
      where: { id: step.flow.transactionId },
      data: {
        status: 'REJECTED',
        rejectedAt: new Date(),
        rejectionReason: request.comments
      }
    })

    // 요청자에게 반려 알림 발송
    await notificationService.sendApprovalCompletion(
      step.flow.transactionId, 
      false, 
      request.comments
    )

    return {
      success: true,
      isCompleted: true,
      message: '결재가 반려되었습니다.'
    }
  }

  /**
   * 최종 승인 처리
   */
  private async completeApproval(
    tx: any, 
    transactionId: string, 
    flowId: string
  ): Promise<void> {
    // 1. 결재 플로우 완료 처리
    await tx.approvalFlow.update({
      where: { id: flowId },
      data: {
        status: 'APPROVED',
        completedAt: new Date()
      }
    })

    // 2. Transaction 승인 완료 처리
    await tx.transaction.update({
      where: { id: transactionId },
      data: {
        status: 'APPROVED',
        approvedAt: new Date()
      }
    })

    // 요청자에게 승인 완료 알림 발송
    await notificationService.sendApprovalCompletion(transactionId, true)
    
    // TODO: 회계 처리 자동화 (선택적)
  }

  /**
   * 결재 권한 검증
   */
  private validateApprovalAuthority(step: any, approverId: string): void {
    if (step.approverId !== approverId) {
      throw new Error('해당 결재 단계의 결재 권한이 없습니다.')
    }

    if (step.status !== 'PENDING') {
      throw new Error('이미 처리된 결재 단계입니다.')
    }

    if (step.flow.status !== 'PENDING' && step.flow.status !== 'IN_PROGRESS') {
      throw new Error('결재 가능한 상태가 아닙니다.')
    }
  }

  /**
   * 내 대기 중인 결재 목록 조회
   */
  async getPendingApprovals(
    approverId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<TransactionApprovalStepWithDetails[]> {
    const skip = (page - 1) * limit

    return await (this.prisma as any).transactionApprovalStep.findMany({
      where: {
        approverId,
        status: 'PENDING',
        flow: {
          status: {
            in: ['PENDING', 'IN_PROGRESS']
          }
        }
      },
      include: {
        approver: true,
        organization: true,
        flow: {
          include: {
            transaction: {
              include: {
                requester: true,
                organization: true
              }
            },
            requester: true,
            organization: true
          }
        }
      },
      orderBy: [
        { flow: { priority: 'desc' } },
        { createdAt: 'asc' }
      ],
      skip,
      take: limit
    })
  }

  /**
   * 내 요청 현황 조회
   */
  async getMyRequests(
    requesterId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<ApprovalFlowWithDetails[]> {
    const skip = (page - 1) * limit

    return await (this.prisma as any).approvalFlow.findMany({
      where: {
        requesterId
      },
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
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    })
  }
}