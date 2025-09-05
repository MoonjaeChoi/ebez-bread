import { ApprovalMatrixCategory } from '@prisma/client'
import type { ApprovalMatrixConfig } from '@/types/approval'

// 기본 결재 매트릭스 설정
export const DEFAULT_APPROVAL_MATRIX: Record<string, ApprovalMatrixConfig> = {
  // 일반 사역비 (10만원 이하)
  ministry_expense_small: {
    category: [ApprovalMatrixCategory.MINISTRY, ApprovalMatrixCategory.SUPPLIES],
    maxAmount: 100000,
    approvalLevels: [
      { 
        levelOrder: 1, 
        requiredRoles: ['부장', '차장'], 
        organizationLevel: 'SAME',
        isRequired: true,
        timeoutHours: 24 
      },
    ]
  },

  // 중간 사역비 (10~50만원)
  ministry_expense_medium: {
    category: [
      ApprovalMatrixCategory.MINISTRY, 
      ApprovalMatrixCategory.SUPPLIES, 
      ApprovalMatrixCategory.EQUIPMENT
    ],
    minAmount: 100001,
    maxAmount: 500000,
    approvalLevels: [
      { 
        levelOrder: 1, 
        requiredRoles: ['부장'], 
        organizationLevel: 'SAME',
        isRequired: true,
        timeoutHours: 24 
      },
      { 
        levelOrder: 2, 
        requiredRoles: ['교구장', '단장'], 
        organizationLevel: 'PARENT',
        isRequired: true,
        timeoutHours: 48 
      }
    ]
  },

  // 대형 사역비 (50만원 이상)
  ministry_expense_large: {
    category: [
      ApprovalMatrixCategory.MINISTRY, 
      ApprovalMatrixCategory.EQUIPMENT, 
      ApprovalMatrixCategory.EVENT
    ],
    minAmount: 500001,
    approvalLevels: [
      { 
        levelOrder: 1, 
        requiredRoles: ['부장'], 
        organizationLevel: 'SAME',
        isRequired: true,
        timeoutHours: 24 
      },
      { 
        levelOrder: 2, 
        requiredRoles: ['교구장', '단장'], 
        organizationLevel: 'PARENT',
        isRequired: true,
        timeoutHours: 48 
      },
      { 
        levelOrder: 3, 
        requiredRoles: ['위원장', '회장'], 
        organizationLevel: 'ROOT',
        isRequired: true,
        timeoutHours: 72 
      }
    ]
  },

  // 건축/시설비 (금액 상관없이 특별 결재)
  construction: {
    category: [ApprovalMatrixCategory.CONSTRUCTION, ApprovalMatrixCategory.FACILITIES],
    minAmount: 1,
    approvalLevels: [
      { 
        levelOrder: 1, 
        requiredRoles: ['부장'], 
        organizationLevel: 'SAME',
        isRequired: true,
        timeoutHours: 24 
      },
      { 
        levelOrder: 2, 
        requiredRoles: ['교구장'], 
        organizationLevel: 'PARENT',
        isRequired: true,
        timeoutHours: 48 
      },
      { 
        levelOrder: 3, 
        requiredRoles: ['시설위원장'], 
        organizationLevel: 'ROOT',
        isRequired: true,
        timeoutHours: 72 
      },
      { 
        levelOrder: 4, 
        requiredRoles: ['담임목사'], 
        organizationLevel: 'ROOT',
        isRequired: true,
        timeoutHours: 72 
      }
    ]
  },

  // 인건비 (특별 결재선)
  personnel: {
    category: [
      ApprovalMatrixCategory.SALARY, 
      ApprovalMatrixCategory.BONUS, 
      ApprovalMatrixCategory.BENEFITS
    ],
    minAmount: 1,
    approvalLevels: [
      { 
        levelOrder: 1, 
        requiredRoles: ['총무'], 
        organizationLevel: 'ROOT',
        isRequired: true,
        timeoutHours: 48 
      },
      { 
        levelOrder: 2, 
        requiredRoles: ['담임목사'], 
        organizationLevel: 'ROOT',
        isRequired: true,
        timeoutHours: 72 
      }
    ]
  },

  // 공과금 및 유지보수 (중간 결재)
  utilities_maintenance: {
    category: [ApprovalMatrixCategory.UTILITIES, ApprovalMatrixCategory.MAINTENANCE],
    maxAmount: 1000000,
    approvalLevels: [
      { 
        levelOrder: 1, 
        requiredRoles: ['총무'], 
        organizationLevel: 'ROOT',
        isRequired: true,
        timeoutHours: 24 
      },
    ]
  },

  // 기타 일반 지출
  other: {
    category: [ApprovalMatrixCategory.OTHER],
    maxAmount: 50000,
    approvalLevels: [
      { 
        levelOrder: 1, 
        requiredRoles: ['부장', '차장', '총무'], 
        organizationLevel: 'SAME',
        isRequired: true,
        timeoutHours: 24 
      },
    ]
  }
}

// 결재 매트릭스 우선순위 (높을수록 우선 적용)
export const APPROVAL_MATRIX_PRIORITY: Record<string, number> = {
  personnel: 100,           // 인건비 최우선
  construction: 90,         // 건축/시설 2순위
  ministry_expense_large: 80,
  ministry_expense_medium: 70,
  utilities_maintenance: 60,
  ministry_expense_small: 50,
  other: 10                 // 기타 최후순위
}

// 조직 레벨별 기본 역할 매핑
export const DEFAULT_ROLE_MAPPING = {
  LEVEL_1: ['담임목사', '부목사', '전도사'], // 교회 레벨
  LEVEL_2: ['위원장', '회장', '국장'],      // 위원회/국 레벨
  LEVEL_3: ['교구장', '단장', '부장'],      // 교구/단 레벨
  LEVEL_4: ['부서장', '차장', '총무'],      // 부서 레벨
  LEVEL_5: ['팀장', '리더', '간사']        // 팀 레벨
}

// 에스컬레이션 기본 설정
export const DEFAULT_ESCALATION_RULES = {
  timeout: 24,              // 기본 타임아웃 (시간)
  maxEscalations: 3,        // 최대 에스컬레이션 단계
  escalationInterval: 24,   // 에스컬레이션 간격 (시간)
  finalApprover: '담임목사' // 최종 결재자
}

/**
 * 금액과 카테고리에 따라 적절한 결재 매트릭스를 찾는 함수
 */
export function findApprovalMatrix(
  amount: number, 
  category: ApprovalMatrixCategory,
  organizationId?: string
): ApprovalMatrixConfig | null {
  const eligibleMatrices = Object.entries(DEFAULT_APPROVAL_MATRIX)
    .filter(([_, config]) => {
      // 카테고리 매칭
      if (!config.category.includes(category)) return false
      
      // 금액 범위 체크
      if (config.minAmount && amount < config.minAmount) return false
      if (config.maxAmount && amount > config.maxAmount) return false
      
      // 조직 제한 체크
      if (config.organizationId && config.organizationId !== organizationId) return false
      
      return true
    })
    .sort(([a], [b]) => (APPROVAL_MATRIX_PRIORITY[b] || 0) - (APPROVAL_MATRIX_PRIORITY[a] || 0))

  return eligibleMatrices.length > 0 ? eligibleMatrices[0][1] : null
}

/**
 * 카테고리별 기본 우선순위 가져오기
 */
export function getDefaultPriority(category: ApprovalMatrixCategory): 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' {
  switch (category) {
    case ApprovalMatrixCategory.CONSTRUCTION:
    case ApprovalMatrixCategory.SALARY:
      return 'HIGH'
    case ApprovalMatrixCategory.UTILITIES:
    case ApprovalMatrixCategory.MAINTENANCE:
      return 'NORMAL'
    case ApprovalMatrixCategory.SUPPLIES:
    case ApprovalMatrixCategory.OTHER:
      return 'LOW'
    default:
      return 'NORMAL'
  }
}