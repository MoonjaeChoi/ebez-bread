import { PrismaClient, OrganizationLevel } from '@prisma/client'
import type { 
  CreateApprovalFlowRequest, 
  ApprovalFlowPreview, 
  ApprovalStepInfo,
  ApprovalMatrixConfig 
} from '@/types/approval'
import { findApprovalMatrix, DEFAULT_ROLE_MAPPING } from './approval-matrix'

export class ApprovalEngine {
  constructor(private prisma: PrismaClient) {}

  /**
   * 지출 요청에 대한 결재선을 자동 생성
   */
  async generateApprovalFlow(request: CreateApprovalFlowRequest): Promise<ApprovalFlowPreview> {
    // 1. 요청자의 조직 계층 정보 조회
    const requesterOrganization = await this.getRequesterOrganization(
      request.requesterId, 
      request.organizationId
    )

    if (!requesterOrganization) {
      throw new Error('요청자의 조직 정보를 찾을 수 없습니다.')
    }

    // 2. 금액 및 카테고리 기준으로 결재 매트릭스 조회
    const approvalMatrix = findApprovalMatrix(
      request.amount,
      request.category,
      request.organizationId
    )

    if (!approvalMatrix) {
      throw new Error('해당 조건에 맞는 결재 매트릭스를 찾을 수 없습니다.')
    }

    // 3. 조직 계층을 따라 결재자 찾기
    const steps = await this.findApproversInHierarchy(
      requesterOrganization,
      approvalMatrix.approvalLevels
    )

    // 4. 결재 플로우 미리보기 생성
    return {
      steps,
      totalSteps: steps.length,
      estimatedDays: this.calculateEstimatedDays(steps),
      warnings: this.generateWarnings(steps, approvalMatrix)
    }
  }

  /**
   * 요청자의 조직 정보 조회 (계층 구조 포함)
   */
  private async getRequesterOrganization(requesterId: string, organizationId: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        organizationMemberships: {
          where: {
            isActive: true
          },
          include: {
            member: true,
            role: true
          }
        }
      }
    })

    if (!organization) return null

    // 조직 계층 구조를 효율적으로 조회
    const hierarchy = await this.getOrganizationHierarchy(organizationId)
    
    return {
      ...organization,
      hierarchy
    }
  }

  /**
   * 조직 계층 구조 조회 (루트까지의 전체 경로)
   */
  private async getOrganizationHierarchy(organizationId: string) {
    const hierarchy: any[] = []
    let currentId: string | null = organizationId

    // 재귀적으로 상위 조직들을 찾아 올라가기
    while (currentId) {
      const org: any = await this.prisma.organization.findUnique({
        where: { id: currentId },
        include: {
          parent: true,
          roleAssignments: {
            where: { isActive: true },
            include: {
              role: true
            }
          }
        }
      })

      if (!org) break

      hierarchy.push(org)
      currentId = org.parentId
    }

    return hierarchy
  }

  /**
   * 조직 계층을 따라 결재권자 검색 (최적화됨)
   */
  private async findApproversInHierarchy(
    organization: any,
    approvalLevels: ApprovalMatrixConfig['approvalLevels']
  ): Promise<ApprovalStepInfo[]> {
    const steps: ApprovalStepInfo[] = []
    const hierarchy = organization.hierarchy || []

    for (const level of approvalLevels) {
      let targetOrganization: any = null

      // 조직 레벨에 따라 결재 조직 결정
      switch (level.organizationLevel) {
        case 'SAME':
          targetOrganization = hierarchy[0] // 현재 조직
          break
        case 'PARENT':
          targetOrganization = hierarchy[1] || hierarchy[0] // 상위 조직 또는 현재 조직
          break
        case 'ROOT':
          targetOrganization = hierarchy[hierarchy.length - 1] || hierarchy[0] // 최상위 조직
          break
      }

      if (!targetOrganization) {
        console.warn(`Target organization not found for level: ${level.organizationLevel}`)
        continue
      }

      // 해당 조직에서 필요한 역할의 결재자 찾기
      const approver = await this.findRoleInOrganization(
        targetOrganization.id,
        level.requiredRoles
      )

      if (approver) {
        steps.push({
          stepOrder: level.levelOrder,
          approverId: approver.userId,
          approverName: approver.userName,
          approverRole: approver.roleName,
          organizationName: approver.organizationName,
          status: 'PENDING',
          isRequired: level.isRequired,
          isParallel: level.isParallel,
          timeoutHours: level.timeoutHours
        })
      } else if (level.isRequired) {
        // 필수 결재자를 찾지 못한 경우 에스컬레이션 처리
        const escalatedApprover = await this.handleMissingApprover(
          level.requiredRoles,
          targetOrganization,
          level.levelOrder,
          hierarchy
        )
        
        if (escalatedApprover) {
          steps.push(escalatedApprover)
        }
      }
    }

    // 중복 결재자 제거 (동일한 사람이 여러 단계에 있는 경우)
    const uniqueSteps = this.removeDuplicateApprovers(steps)

    return uniqueSteps.sort((a, b) => a.stepOrder - b.stepOrder)
  }

  /**
   * 중복 결재자 제거
   */
  private removeDuplicateApprovers(steps: ApprovalStepInfo[]): ApprovalStepInfo[] {
    const seenApprovers = new Set<string>()
    const uniqueSteps: ApprovalStepInfo[] = []

    for (const step of steps) {
      if (!seenApprovers.has(step.approverId)) {
        seenApprovers.add(step.approverId)
        uniqueSteps.push(step)
      } else {
        // 중복된 결재자가 있는 경우, 더 높은 단계를 유지
        const existingStepIndex = uniqueSteps.findIndex(s => s.approverId === step.approverId)
        if (existingStepIndex !== -1) {
          const existingStep = uniqueSteps[existingStepIndex]
          // 더 높은 stepOrder 또는 더 중요한 역할을 유지
          if (step.stepOrder > existingStep.stepOrder) {
            uniqueSteps[existingStepIndex] = step
          }
        }
      }
    }

    return uniqueSteps
  }

  /**
   * 특정 조직에서 역할을 가진 결재자 찾기
   */
  private async findRoleInOrganization(
    organizationId: string, 
    requiredRoles: string[]
  ) {
    // 조직에 할당된 역할 찾기 (OrganizationRoleAssignment 통해)
    const roleAssignments = await this.prisma.organizationRoleAssignment.findMany({
      where: {
        organizationId,
        isActive: true,
        role: {
          name: { in: requiredRoles },
          isActive: true,
          isLeadership: true
        }
      },
      include: {
        role: true,
        organization: true
      },
      orderBy: {
        role: {
          level: 'desc' // 높은 레벨의 역할 우선
        }
      }
    })

    // 각 역할에 대해 실제 구성원 찾기
    for (const assignment of roleAssignments) {
      const membership = await this.prisma.organizationMembership.findFirst({
        where: {
          organizationId,
          roleId: assignment.roleId,
          isActive: true,
          member: {
            status: 'ACTIVE',
          }
        },
        include: {
          member: true,
          role: true,
          organization: true
        }
      })

      if (membership?.member) {
        return {
          userId: membership.member.id,
          userName: membership.member.name,
          roleName: membership.role?.name || '',
          organizationId: membership.organizationId,
          organizationName: membership.organization.name
        }
      }
    }

    return null
  }

  /**
   * 루트 조직 찾기
   */
  private async findRootOrganization(organization: any): Promise<any> {
    let currentOrg = organization
    while (currentOrg.parent) {
      currentOrg = await this.prisma.organization.findUnique({
        where: { id: currentOrg.parent.id },
        include: {
          parent: true
        }
      })
    }
    return currentOrg
  }

  /**
   * 필수 결재자가 없을 때 에스컬레이션 처리 (최적화됨)
   */
  private async handleMissingApprover(
    requiredRoles: string[],
    organization: any,
    stepOrder: number,
    hierarchy: any[]
  ): Promise<ApprovalStepInfo | null> {
    // 계층 구조를 따라 상위 조직들에서 대체 결재자 찾기
    for (let i = 1; i < hierarchy.length; i++) {
      const parentOrg = hierarchy[i]
      const parentApprover = await this.findRoleInOrganization(
        parentOrg.id,
        requiredRoles
      )

      if (parentApprover) {
        return {
          stepOrder,
          approverId: parentApprover.userId,
          approverName: parentApprover.userName,
          approverRole: parentApprover.roleName,
          organizationName: parentApprover.organizationName,
          status: 'PENDING',
          isRequired: true
        }
      }
    }

    // 대체 역할로 확장 검색
    const alternativeRoles = this.getAlternativeRoles(requiredRoles)
    
    for (const altRoles of alternativeRoles) {
      for (const org of hierarchy) {
        const altApprover = await this.findRoleInOrganization(org.id, altRoles)
        if (altApprover) {
          return {
            stepOrder,
            approverId: altApprover.userId,
            approverName: altApprover.userName,
            approverRole: altApprover.roleName,
            organizationName: altApprover.organizationName,
            status: 'PENDING',
            isRequired: true
          }
        }
      }
    }

    // 최종적으로 최상위 권한자에게 에스컬레이션
    const rootOrg = hierarchy[hierarchy.length - 1]
    if (rootOrg) {
      const finalApprover = await this.findRoleInOrganization(
        rootOrg.id,
        ['담임목사', '담임', '목사', '위원장', '회장', '총무']
      )

      if (finalApprover) {
        return {
          stepOrder,
          approverId: finalApprover.userId,
          approverName: finalApprover.userName,
          approverRole: finalApprover.roleName,
          organizationName: finalApprover.organizationName,
          status: 'PENDING',
          isRequired: true
        }
      }
    }

    return null
  }

  /**
   * 대체 가능한 역할들 정의
   */
  private getAlternativeRoles(requiredRoles: string[]): string[][] {
    const alternatives: string[][] = []
    
    for (const role of requiredRoles) {
      switch (role) {
        case '부장':
          alternatives.push(['차장', '팀장', '리더'])
          break
        case '교구장':
          alternatives.push(['부교구장', '단장', '부장'])
          break
        case '단장':
          alternatives.push(['부단장', '부장', '차장'])
          break
        case '위원장':
          alternatives.push(['부위원장', '총무', '서기'])
          break
        case '회장':
          alternatives.push(['부회장', '총무', '위원장'])
          break
        default:
          alternatives.push([role])
      }
    }

    return alternatives
  }

  /**
   * 예상 결재 완료 일수 계산
   */
  private calculateEstimatedDays(steps: ApprovalStepInfo[]): number {
    const totalHours = steps.reduce((sum, step) => {
      return sum + (step.timeoutHours || 24)
    }, 0)
    
    // 시간을 일수로 변환 (8시간 = 1 업무일 기준)
    return Math.ceil(totalHours / 24)
  }

  /**
   * 결재선 경고 메시지 생성
   */
  private generateWarnings(
    steps: ApprovalStepInfo[],
    matrix: ApprovalMatrixConfig
  ): string[] {
    const warnings: string[] = []

    // 결재자가 없는 단계 체크
    const missingApprovers = steps.filter(step => !step.approverId)
    if (missingApprovers.length > 0) {
      warnings.push(`${missingApprovers.length}개 단계에서 결재자를 찾을 수 없습니다.`)
    }

    // 예상 결재 기간이 긴 경우 경고
    const estimatedDays = this.calculateEstimatedDays(steps)
    if (estimatedDays > 7) {
      warnings.push(`예상 결재 기간이 ${estimatedDays}일로 길 수 있습니다.`)
    }

    // 동일한 결재자가 여러 단계에 있는 경우
    const approverIds = steps.map(step => step.approverId)
    const duplicateApprovers = approverIds.filter((id, index) => 
      approverIds.indexOf(id) !== index
    )
    if (duplicateApprovers.length > 0) {
      warnings.push('동일한 결재자가 여러 단계에 배정되었습니다.')
    }

    return warnings
  }
}