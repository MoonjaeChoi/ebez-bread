import type { 
  ApprovalFlow, 
  TransactionApprovalStep, 
  ApprovalMatrix, 
  ApprovalMatrixLevel,
  Organization,
  User,
  Transaction,
  ApprovalFlowStatus,
  ApprovalStepStatus,
  ApprovalMatrixCategory,
  TransactionStatus 
} from '@prisma/client'

// Re-export types that are used in components
export { ApprovalMatrixCategory }

// 결재선 생성 요청 타입
export interface CreateApprovalFlowRequest {
  transactionId: string
  organizationId: string
  requesterId: string
  amount: number
  category: ApprovalMatrixCategory
  description: string
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
}

// 결재 처리 요청 타입
export interface ProcessApprovalRequest {
  stepId: string
  action: 'APPROVE' | 'REJECT'
  comments?: string
  attachments?: string[]
  approverId: string
}

// 결재 처리 결과 타입
export interface ApprovalResult {
  success: boolean
  nextStepId?: string
  isCompleted?: boolean
  message?: string
}

// 결재선 단계 정보
export interface ApprovalStepInfo {
  stepOrder: number
  approverId: string
  approverName: string
  approverRole: string
  organizationName: string
  status: ApprovalStepStatus
  isRequired: boolean
  isParallel?: boolean
  timeoutHours?: number
}

// 결재선 미리보기
export interface ApprovalFlowPreview {
  steps: ApprovalStepInfo[]
  totalSteps: number
  estimatedDays: number
  warnings?: string[]
}

// 에스컬레이션 룰
export interface EscalationRule {
  condition: 'TIMEOUT' | 'ABSENCE' | 'DELEGATION'
  timeoutHours?: number
  alternativeRoles: string[]
  escalateToParent: boolean
}

// 결재 매트릭스 설정
export interface ApprovalMatrixConfig {
  category: ApprovalMatrixCategory[]
  minAmount?: number
  maxAmount?: number
  organizationId?: string
  approvalLevels: {
    levelOrder: number
    requiredRoles: string[]
    organizationLevel: 'SAME' | 'PARENT' | 'ROOT'
    isRequired: boolean
    isParallel?: boolean
    timeoutHours?: number
    escalationRules?: EscalationRule[]
  }[]
}

// 결재 현황 통계
export interface ApprovalStats {
  pendingCount: number
  approvedCount: number
  rejectedCount: number
  avgApprovalTime: number // hours
  approvalRate: number // percentage
  monthlyCount: number
  monthlyTrend: number // percentage change
  timeTrend: number // percentage change in approval time
  rateTrend: number // percentage change in approval rate
}

// 확장된 ApprovalFlow 타입 (join 포함)
export type ApprovalFlowWithDetails = ApprovalFlow & {
  transaction: Transaction & {
    requester: User
    organization: Organization
  }
  requester: User
  organization: Organization
  steps: (TransactionApprovalStep & {
    approver: User
    organization: Organization
  })[]
}

// 확장된 TransactionApprovalStep 타입
export type TransactionApprovalStepWithDetails = TransactionApprovalStep & {
  approver: User
  organization: Organization
  flow: ApprovalFlow & {
    transaction: Transaction
  }
}

// 결재 대기 목록 필터
export interface PendingApprovalsFilter {
  status?: ApprovalStepStatus
  priority?: string
  organizationId?: string
  dateRange?: {
    from: Date
    to: Date
  }
  page?: number
  limit?: number
}

// 내 요청 현황 필터
export interface MyRequestsFilter {
  status?: ApprovalFlowStatus
  category?: ApprovalMatrixCategory
  dateRange?: {
    from: Date
    to: Date
  }
  page?: number
  limit?: number
}

// 조직별 결재 매트릭스 매핑
export interface OrganizationApprovalMapping {
  organizationId: string
  organizationName: string
  level: string
  applicableMatrices: ApprovalMatrix[]
  inheritedMatrices: ApprovalMatrix[]
}