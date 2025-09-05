# Phase 3.4: 회계시스템 연동 및 지출결의서 결재단계 통합 전략

## 🎯 **전략 개요**

조직 구성원 관리 시스템과 회계시스템을 연동하여 **지출결의서의 결재단계를 조직 계층구조와 직책 기반으로 자동화**하는 통합 시스템을 구축합니다.

---

## 📊 **현재 시스템 분석**

### **조직 구성원 관리 시스템 (완료)**
- ✅ **Phase 1**: 기본 구성원 관리 (18/18 - 100%)
- ✅ **Phase 2**: 고급 관리 기능 (15/15 - 100%)
- ⚪ **Phase 3**: 고급 분석 및 자동화 (0/20 - 0%)

### **기존 회계시스템 구조**
```typescript
// 현재 회계시스템의 주요 모델들
interface Transaction {
  id: string
  amount: Decimal
  description: string
  accountId: string
  budgetItemId?: string
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED'
  createdBy: string
}

interface Budget {
  id: string
  name: string
  amount: Decimal
  status: 'DRAFT' | 'ACTIVE' | 'CLOSED'
  approvers: string[] // 현재는 단순 사용자 ID 배열
}
```

---

## 🔗 **통합 아키텍처 설계**

### **1. 결재선 자동 생성 시스템**

#### **1.1 조직 계층 기반 결재선 매핑**
```typescript
// src/lib/approval/approval-hierarchy.ts
interface ApprovalHierarchy {
  id: string
  organizationId: string
  minAmount: Decimal        // 결재 금액 기준
  maxAmount: Decimal
  requiredRoles: string[]   // 필수 결재 직책들
  approvalOrder: number     // 결재 순서
  isParallel: boolean      // 병렬 결재 여부
  escalationRules: EscalationRule[]
}

interface EscalationRule {
  condition: 'TIMEOUT' | 'ABSENCE' | 'DELEGATION'
  timeoutHours?: number
  alternativeRoles: string[]
  escalateToParent: boolean
}

// 예시: 교회 결재선 설정
const CHURCH_APPROVAL_MATRIX = {
  // ~10만원: 부서장 결재
  small_expense: {
    maxAmount: 100000,
    requiredRoles: ['부장', '차장'],
    approvalOrder: 1
  },
  
  // 10~50만원: 부서장 → 교구장 결재  
  medium_expense: {
    minAmount: 100001,
    maxAmount: 500000,
    requiredRoles: ['부장', '교구장'],
    approvalOrder: 2
  },
  
  // 50만원~: 부서장 → 교구장 → 위원장 결재
  large_expense: {
    minAmount: 500001,
    requiredRoles: ['부장', '교구장', '위원장'],
    approvalOrder: 3
  }
}
```

#### **1.2 동적 결재선 생성 엔진**
```typescript
// src/lib/approval/approval-engine.ts
export class ApprovalEngine {
  /**
   * 지출 요청에 대한 결재선을 자동 생성
   */
  async generateApprovalFlow(request: {
    organizationId: string
    requesterId: string
    amount: Decimal
    category: string
    description: string
  }): Promise<ApprovalFlow> {
    
    // 1. 요청자의 조직 계층 정보 조회
    const requesterMembership = await this.getRequesterOrganization(request.requesterId, request.organizationId)
    
    // 2. 금액 기준으로 결재 매트릭스 조회
    const approvalMatrix = await this.getApprovalMatrix(request.amount, request.category)
    
    // 3. 조직 계층을 따라 결재자 찾기
    const approvers = await this.findApproversInHierarchy(
      requesterMembership.organization,
      approvalMatrix.requiredRoles
    )
    
    // 4. 결재 플로우 생성
    return this.createApprovalFlow({
      requestId: request.id,
      approvers,
      escalationRules: approvalMatrix.escalationRules
    })
  }
  
  /**
   * 조직 계층을 따라 결재권자 검색
   */
  private async findApproversInHierarchy(
    organization: Organization,
    requiredRoles: string[]
  ): Promise<ApprovalStep[]> {
    const approvalSteps: ApprovalStep[] = []
    let currentOrg = organization
    let stepOrder = 1
    
    for (const roleName of requiredRoles) {
      // 현재 조직에서 해당 직책을 가진 활성 구성원 찾기
      let approver = await this.findRoleInOrganization(currentOrg, roleName)
      
      // 현재 조직에 해당 직책이 없으면 상위 조직으로 확장 검색
      if (!approver && currentOrg.parent) {
        approver = await this.findRoleInAncestors(currentOrg.parent, roleName)
      }
      
      if (approver) {
        approvalSteps.push({
          stepOrder,
          approverId: approver.memberId,
          approverName: approver.member.name,
          approverRole: approver.role.name,
          organizationName: approver.organization.name,
          status: 'PENDING',
          isRequired: true
        })
        
        stepOrder++
        // 결재자의 조직으로 컨텍스트 이동
        currentOrg = approver.organization
      } else {
        // 필수 결재자를 찾지 못한 경우 에스컬레이션 룰 적용
        await this.handleMissingApprover(roleName, currentOrg, approvalSteps)
      }
    }
    
    return approvalSteps
  }
}
```

### **2. 지출결의서 결재 워크플로우**

#### **2.1 확장된 Transaction 모델**
```typescript
// prisma/schema.prisma 확장
model Transaction {
  id                String              @id @default(cuid())
  amount            Decimal
  description       String
  category          TransactionCategory
  accountId         String
  budgetItemId      String?
  
  // 조직 연동 필드 추가
  requesterId       String
  requester         User                @relation("TransactionRequester", fields: [requesterId], references: [id])
  organizationId    String
  organization      Organization        @relation(fields: [organizationId], references: [id])
  
  // 결재 워크플로우
  approvalFlowId    String?
  approvalFlow      ApprovalFlow?       @relation(fields: [approvalFlowId], references: [id])
  currentStepId     String?
  currentStep       ApprovalStep?       @relation(fields: [currentStepId], references: [id])
  
  status            TransactionStatus   @default(PENDING)
  submittedAt       DateTime            @default(now())
  completedAt       DateTime?
  
  @@map("transactions")
}

model ApprovalFlow {
  id              String            @id @default(cuid())
  transactionId   String            @unique
  transaction     Transaction       @relation(fields: [transactionId], references: [id])
  
  totalSteps      Int
  currentStep     Int               @default(1)
  status          ApprovalStatus    @default(PENDING)
  
  steps           ApprovalStep[]
  
  createdAt       DateTime          @default(now())
  completedAt     DateTime?
  
  @@map("approval_flows")
}

model ApprovalStep {
  id              String            @id @default(cuid())
  flowId          String
  flow            ApprovalFlow      @relation(fields: [flowId], references: [id])
  
  stepOrder       Int
  approverId      String
  approver        User              @relation(fields: [approverId], references: [id])
  approverRole    String
  organizationId  String
  organization    Organization      @relation(fields: [organizationId], references: [id])
  
  status          StepStatus        @default(PENDING)
  isRequired      Boolean           @default(true)
  
  approvedAt      DateTime?
  rejectedAt      DateTime?
  comments        String?
  
  // 에스컬레이션
  escalatedFrom   String?
  escalatedTo     String?
  escalationReason String?
  
  @@map("approval_steps")
}

enum TransactionStatus {
  PENDING
  IN_REVIEW
  APPROVED  
  REJECTED
  CANCELLED
}

enum ApprovalStatus {
  PENDING
  IN_PROGRESS
  APPROVED
  REJECTED
  ESCALATED
}

enum StepStatus {
  PENDING
  APPROVED
  REJECTED
  SKIPPED
  ESCALATED
}
```

#### **2.2 결재 처리 서비스**
```typescript
// src/server/services/approval.service.ts
export class ApprovalService {
  /**
   * 지출 요청 제출 및 결재선 생성
   */
  async submitExpenseRequest(request: CreateTransactionRequest): Promise<Transaction> {
    // 1. 트랜잭션 생성
    const transaction = await prisma.transaction.create({
      data: {
        ...request,
        status: 'PENDING'
      }
    })
    
    // 2. 결재선 자동 생성
    const approvalFlow = await this.approvalEngine.generateApprovalFlow({
      organizationId: request.organizationId,
      requesterId: request.requesterId,
      amount: request.amount,
      category: request.category,
      description: request.description
    })
    
    // 3. 결재 프로세스 시작
    await this.startApprovalProcess(transaction.id, approvalFlow)
    
    // 4. 첫 번째 결재자에게 알림 발송
    await this.notificationService.sendApprovalRequest(
      approvalFlow.steps[0].approverId,
      transaction
    )
    
    return transaction
  }
  
  /**
   * 결재 처리 (승인/반려)
   */
  async processApproval(stepId: string, decision: {
    action: 'APPROVE' | 'REJECT'
    comments?: string
    approverId: string
  }): Promise<ApprovalResult> {
    
    const step = await prisma.approvalStep.findUnique({
      where: { id: stepId },
      include: { 
        flow: { 
          include: { 
            steps: { orderBy: { stepOrder: 'asc' } },
            transaction: true 
          } 
        } 
      }
    })
    
    if (!step) throw new Error('Approval step not found')
    
    // 1. 결재 권한 확인
    await this.validateApprovalAuthority(step, decision.approverId)
    
    // 2. 결재 처리
    if (decision.action === 'APPROVE') {
      await this.approveStep(step, decision)
      
      // 다음 단계 진행 또는 최종 승인
      const nextStep = step.flow.steps.find(s => s.stepOrder === step.stepOrder + 1)
      
      if (nextStep) {
        // 다음 결재자에게 알림
        await this.notificationService.sendApprovalRequest(
          nextStep.approverId,
          step.flow.transaction
        )
      } else {
        // 최종 승인 처리
        await this.completeApproval(step.flow.transactionId)
      }
      
    } else {
      await this.rejectStep(step, decision)
      await this.rejectTransaction(step.flow.transactionId, decision.comments)
    }
    
    return { success: true, nextStep: nextStep?.id }
  }
}
```

### **3. 실시간 결재 대시보드**

#### **3.1 결재 현황 대시보드**
```typescript
// src/components/accounting/ApprovalDashboard.tsx
export function ApprovalDashboard() {
  const [filter, setFilter] = useState<ApprovalFilter>({
    status: 'ALL',
    role: 'ALL',
    dateRange: 'WEEK'
  })
  
  // 내가 결재해야 할 항목들
  const { data: pendingApprovals } = trpc.approvals.getPendingForUser.useQuery()
  
  // 내가 요청한 항목들의 현황
  const { data: myRequests } = trpc.approvals.getMyRequests.useQuery()
  
  // 조직별 결재 현황 통계
  const { data: approvalStats } = trpc.approvals.getStatsByOrganization.useQuery()
  
  return (
    <div className="space-y-6">
      {/* 대기 중인 결재 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            결재 대기 ({pendingApprovals?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingApprovals?.map(approval => (
            <ApprovalCard
              key={approval.id}
              approval={approval}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))}
        </CardContent>
      </Card>
      
      {/* 내 요청 현황 */}
      <Card>
        <CardHeader>
          <CardTitle>내 요청 현황</CardTitle>
        </CardHeader>
        <CardContent>
          <ApprovalTracker requests={myRequests} />
        </CardContent>
      </Card>
      
      {/* 결재 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="이번 달 결재"
          value={approvalStats?.monthlyCount}
          trend={approvalStats?.monthlyTrend}
        />
        <StatCard
          title="평균 결재 시간"
          value={`${approvalStats?.avgApprovalTime}시간`}
          trend={approvalStats?.timeTrend}
        />
        <StatCard
          title="결재율"
          value={`${approvalStats?.approvalRate}%`}
          trend={approvalStats?.rateTrend}
        />
      </div>
    </div>
  )
}
```

#### **3.2 결재선 시각화 컴포넌트**
```typescript
// src/components/accounting/ApprovalFlowVisualization.tsx
export function ApprovalFlowVisualization({ 
  approvalFlow 
}: { 
  approvalFlow: ApprovalFlow 
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">결재 진행 현황</h3>
        <Badge variant={getStatusVariant(approvalFlow.status)}>
          {approvalFlow.status}
        </Badge>
      </div>
      
      <div className="relative">
        {approvalFlow.steps.map((step, index) => (
          <div key={step.id} className="flex items-center space-x-4">
            {/* 단계 아이콘 */}
            <div className={`
              w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold
              ${getStepColor(step.status)}
            `}>
              {index + 1}
            </div>
            
            {/* 결재자 정보 */}
            <div className="flex-1 p-4 rounded-lg border">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{step.approver.name}</div>
                  <div className="text-sm text-gray-600">
                    {step.approverRole} • {step.organization.name}
                  </div>
                </div>
                
                <div className="text-right">
                  <Badge variant={getStatusVariant(step.status)}>
                    {getStepStatusText(step.status)}
                  </Badge>
                  {step.approvedAt && (
                    <div className="text-xs text-gray-500 mt-1">
                      {formatDateTime(step.approvedAt)}
                    </div>
                  )}
                </div>
              </div>
              
              {step.comments && (
                <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                  <strong>의견:</strong> {step.comments}
                </div>
              )}
            </div>
            
            {/* 연결선 */}
            {index < approvalFlow.steps.length - 1 && (
              <div className="absolute left-5 mt-10 w-0.5 h-8 bg-gray-300" />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
```

### **4. 알림 및 에스컬레이션 시스템**

#### **4.1 결재 알림 시스템**
```typescript
// src/lib/notifications/approval-notifications.ts
export class ApprovalNotificationService {
  /**
   * 결재 요청 알림
   */
  async sendApprovalRequest(approverId: string, transaction: Transaction) {
    const approver = await prisma.user.findUnique({
      where: { id: approverId },
      include: { notificationSettings: true }
    })
    
    const notifications = []
    
    // 이메일 알림
    if (approver.notificationSettings?.emailEnabled) {
      notifications.push(
        this.emailService.send({
          to: approver.email,
          template: 'approval-request',
          data: {
            approverName: approver.name,
            amount: transaction.amount,
            description: transaction.description,
            requesterName: transaction.requester.name,
            approvalUrl: `${process.env.NEXTAUTH_URL}/dashboard/accounting/approvals/${transaction.id}`
          }
        })
      )
    }
    
    // SMS 알림 (긴급 건)
    if (transaction.amount > 1000000 && approver.phone) {
      notifications.push(
        this.smsService.send({
          to: approver.phone,
          message: `[긴급결재] ${transaction.amount}원 지출결의서 결재요청`
        })
      )
    }
    
    // 인앱 알림
    notifications.push(
      this.pushNotificationService.send({
        userId: approverId,
        title: '결재 요청',
        body: `${transaction.amount}원 지출결의서 결재가 필요합니다`,
        data: { transactionId: transaction.id }
      })
    )
    
    await Promise.all(notifications)
  }
  
  /**
   * 결재 지연 에스컬레이션
   */
  async escalateDelayedApprovals() {
    // 24시간 이상 대기 중인 결재 찾기
    const delayedApprovals = await prisma.approvalStep.findMany({
      where: {
        status: 'PENDING',
        createdAt: {
          lt: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      },
      include: {
        flow: { include: { transaction: true } },
        approver: true,
        organization: { include: { parent: true } }
      }
    })
    
    for (const step of delayedApprovals) {
      // 상위 조직 결재자에게 에스컬레이션
      if (step.organization.parent) {
        await this.escalateToParentOrganization(step)
      }
      
      // 결재자에게 리마인더 발송
      await this.sendReminderNotification(step)
    }
  }
}
```

### **5. 권한 기반 결재 매트릭스**

#### **5.1 결재 권한 설정**
```typescript
// src/lib/approval/approval-matrix.ts
export const APPROVAL_MATRIX = {
  // 일반 사역비 (10만원 이하)
  ministry_expense_small: {
    category: ['MINISTRY', 'SUPPLIES'],
    maxAmount: 100000,
    approvalLevels: [
      { roles: ['부장', '차장'], organizationLevel: 'SAME' },
    ]
  },
  
  // 중간 사역비 (10~50만원)
  ministry_expense_medium: {
    category: ['MINISTRY', 'SUPPLIES', 'EQUIPMENT'],
    minAmount: 100001,
    maxAmount: 500000,
    approvalLevels: [
      { roles: ['부장'], organizationLevel: 'SAME' },
      { roles: ['교구장', '단장'], organizationLevel: 'PARENT' }
    ]
  },
  
  // 대형 사역비 (50만원 이상)
  ministry_expense_large: {
    category: ['MINISTRY', 'EQUIPMENT', 'EVENT'],
    minAmount: 500001,
    approvalLevels: [
      { roles: ['부장'], organizationLevel: 'SAME' },
      { roles: ['교구장', '단장'], organizationLevel: 'PARENT' },
      { roles: ['위원장', '회장'], organizationLevel: 'ROOT' }
    ]
  },
  
  // 건축/시설비 (금액 상관없이 특별 결재)
  construction: {
    category: ['CONSTRUCTION', 'FACILITIES'],
    minAmount: 1,
    approvalLevels: [
      { roles: ['부장'], organizationLevel: 'SAME' },
      { roles: ['교구장'], organizationLevel: 'PARENT' },
      { roles: ['시설위원장'], organizationLevel: 'ROOT', isRequired: true },
      { roles: ['담임목사'], organizationLevel: 'ROOT', isRequired: true }
    ]
  },
  
  // 인건비 (특별 결재선)
  personnel: {
    category: ['SALARY', 'BONUS', 'BENEFITS'],
    minAmount: 1,
    approvalLevels: [
      { roles: ['총무'], organizationLevel: 'ROOT', isRequired: true },
      { roles: ['담임목사'], organizationLevel: 'ROOT', isRequired: true }
    ]
  }
}
```

## 🚀 **구현 로드맵 및 상세 Todo List**

### **Phase 3.4.1: 데이터베이스 스키마 및 기본 모델 구현 (1주) ✅ COMPLETED**

#### **🗄️ 데이터베이스 스키마 작업**
- [x] `ApprovalFlow` 모델을 Prisma 스키마에 추가
- [x] `TransactionApprovalStep` 모델을 Prisma 스키마에 추가 (기존 ApprovalStep 충돌 방지)
- [x] `ApprovalMatrix` 및 `ApprovalMatrixLevel` 설정 테이블 추가
- [x] `Transaction` 모델에 결재 관련 필드 추가 (`status`, `submittedAt`, `approvedAt`, `rejectedAt`, `rejectionReason`)
- [x] 결재 상태 관련 Enum 타입들 추가 (`TransactionStatus`, `ApprovalFlowStatus`, `ApprovalStepStatus`, `ApprovalMatrixCategory`)
- [x] 데이터베이스 마이그레이션 실행 (`npm run db:push`)
- [x] 기본 결재 매트릭스 Seed 데이터 작성 (`prisma/seeds/approval-matrix.ts`)

#### **🏗️ 기본 서비스 구조 구현**
- [x] `src/lib/approval/` 디렉토리 구조 생성
- [x] `ApprovalEngine` 클래스 완전 구현 (`src/lib/approval/approval-engine.ts`)
- [x] `ApprovalService` 클래스 완전 구현 (`src/server/services/approval.service.ts`)
- [x] 결재 매트릭스 설정 파일 생성 (`src/lib/approval/approval-matrix.ts`)
- [x] 포괄적 타입 정의 파일 생성 (`src/types/approval.ts` - 30+ 인터페이스)

### **Phase 3.4.2: 조직 기반 결재선 생성 엔진 (2주) ✅ COMPLETED**

#### **🔄 결재선 자동 생성 로직**
- [x] 조직 계층 구조 조회 함수 구현 (`getOrganizationHierarchy`)
- [x] 금액별 결재 매트릭스 조회 로직 구현 (`getApprovalMatrix`)
- [x] 조직에서 특정 직책을 가진 결재자 검색 함수 (`findRoleInOrganization`)
- [x] 상위 조직으로 결재자 확장 검색 함수 (`findRoleInAncestors`)
- [x] 동적 결재선 생성 메인 엔진 구현 (`generateApprovalFlow`)
- [x] 에스컬레이션 룰 처리 로직 구현 (`handleMissingApprover`)
- [x] 중복 결재자 제거 로직 구현 (`removeDuplicateApprovers`)
- [x] 계층별 결재자 검색 및 에스컬레이션 구현

#### **📋 tRPC 라우터 구현**
- [x] `src/server/routers/approvals.ts` 라우터 파일 완전 구현
- [x] 결재선 생성 API (`createApprovalFlow`) 구현
- [x] 결재선 미리보기 API (`previewApprovalFlow`) 구현
- [x] 결재 처리 API (`processApproval`) 구현
- [x] 결재 현황 조회 API (`getApprovalFlowByTransaction`) 구현
- [x] 내 대기 결재 목록 API (`getPendingApprovals`) 구현
- [x] 내 요청 현황 API (`getMyRequests`) 구현
- [x] 조직별 결재 통계 API (`getApprovalStats`) 구현
- [x] 모든 tRPC 엔드포인트 타입 안전성 확보

### **Phase 3.4.3: 기존 지출결의서 페이지와 통합 (1주) ✅ COMPLETED**

#### **🔗 기존 컴포넌트 확장**
- [x] `src/components/expense-reports/expense-report-form.tsx` - 조직 선택 필드 추가
- [x] `src/components/expense-reports/expense-report-form.tsx` - 결재선 미리보기 기능 추가
- [x] `src/components/expense-reports/expense-report-form.tsx` - 수동/자동 결재 시스템 토글 기능
- [x] `src/components/expense-reports/expense-workflow-approval.tsx` - 조직 기반 결재선으로 리팩토링
- [x] `src/components/expense-reports/expense-workflow-approval.tsx` - 이중 결재 시스템 지원 (레거시 + 조직 기반)
- [x] `src/components/expense-reports/expense-report-approval.tsx` - 새로운 결재 플로우와 연동
- [x] `src/components/expense-reports/expense-report-detail.tsx` - 결재 현황 시각화 추가
- [x] 기존 시스템과의 완전한 하위 호환성 유지

#### **🎨 새로운 UI 컴포넌트 구현**
- [x] 조직 선택 드롭다운 - 계층 구조 시각화 포함
- [x] 실시간 결재선 미리보기 - 금액/카테고리 변경 시 동적 업데이트
- [x] 결재 플로우 시각화 - 단계별 진행 현황 및 결재자 정보
- [x] 이중 시스템 지원 UI - 사용자가 수동/자동 결재 방식 선택 가능
- [x] 타입 안전성 확보 - 모든 컴포넌트 타입스크립트 완전 지원
- [x] 반응형 디자인 - 모바일 및 데스크톱 최적화

### **Phase 3.4.4: 결재 처리 워크플로우 구현 (1주) ✅ COMPLETED**

#### **⚡ 결재 처리 로직**
- [x] 결재 권한 검증 함수 구현 (`validateApprovalAuthority`)
- [x] 단계별 결재 처리 함수 구현 (`approveStep`, `rejectStep`)
- [x] 다음 단계 진행 로직 구현 (`advanceToNextStep`)
- [x] 최종 승인 처리 함수 구현 (`completeApproval`)
- [x] 반려 처리 함수 구현 (`rejectTransaction`)
- [x] 결재 지연 체크 및 에스컬레이션 로직 기본 구현

#### **🔔 알림 시스템 통합**
- [x] 기존 알림 서비스와 결재 알림 통합 (`src/lib/notifications/service.ts`)
- [x] 결재 요청 알림 기능 구현 (`sendApprovalRequest`)
- [x] 결재 완료 알림 기능 구현 (`sendApprovalCompletion`) 
- [x] 결재 지연 에스컬레이션 알림 기능 구현 (`sendDelayedApprovalEscalation`)
- [ ] 결재 알림 이메일 템플릿 생성 (추후 구현)
- [ ] 결재 지연 알림 스케줄러 고도화 (추후 구현)

### **Phase 3.4.5: 결재 현황 대시보드 및 통계 (1주) ✅ COMPLETED**

#### **📊 대시보드 페이지 구현**
- [x] `/dashboard/approvals` 페이지 생성 (`src/app/dashboard/approvals/page.tsx`)
- [x] 대기 중인 결재 목록 섹션 구현 (`ApprovalDashboard` 컴포넌트)
- [x] 내 요청 현황 섹션 구현 (내 요청 탭 및 상태 표시)
- [x] 결재 통계 대시보드 구현 (대기/진행/완료 상태별 카드)
- [x] 결재 처리 모달 구현 (`ApprovalProcessModal` 컴포넌트)
- [x] 실시간 결재 상태 업데이트 기능
- [ ] 필터링 및 검색 기능 구현 (추후 구현)
- [ ] 결재 내역 Export 기능 구현 (추후 구현)

#### **📈 통계 및 분석 기능**
- [x] 기본 결재 현황 통계 API 구현 (`getPendingApprovals`, `getMyRequests`)
- [x] 사용자별 결재 대기 목록 조회
- [x] 결재 플로우 상태 추적 시스템
- [ ] 조직별 결재 패턴 분석 API (추후 구현)
- [ ] 결재자별 성과 통계 API (추후 구현)
- [ ] 결재 지연 분석 리포트 API (추후 구현)
- [ ] 결재 병목 지점 분석 기능 (추후 구현)
- [ ] 결재 승인율 추이 분석 (추후 구현)

### **Phase 3.4.6: 고급 기능 및 최적화 (1주)**

#### **🚀 성능 및 사용성 개선**
- [ ] 결재 처리 성능 최적화 (트랜잭션 처리, 인덱스 최적화)
- [ ] 결재선 생성 캐싱 구현 (Redis 캐시 활용)
- [ ] 무한 스크롤 또는 가상화 목록 구현 (대용량 결재 데이터)
- [ ] 결재 처리 시 낙관적 업데이트 적용
- [ ] 모바일 친화적 결재 UI 최적화

#### **🔧 관리자 설정 기능**
- [ ] 결재 매트릭스 관리 UI 구현 (`/dashboard/admin/approval-settings`)
- [ ] 조직별 결재 규칙 설정 기능
- [ ] 결재 권한 위임 기능 구현
- [ ] 결재 템플릿 관리 기능
- [ ] 결재 감사 로그 조회 기능

### **Phase 3.4.7: 테스트 및 문서화 (1주)**

#### **🧪 테스트 구현**
- [ ] ApprovalEngine 단위 테스트 작성 (`src/lib/approval/__tests__/`)
- [ ] ApprovalService 통합 테스트 작성 (`src/server/services/__tests__/`)
- [ ] 결재 워크플로우 E2E 테스트 작성 (`e2e/approval-workflow.spec.ts`)
- [ ] 결재 권한 검증 테스트 작성
- [ ] 에스컬레이션 로직 테스트 작성
- [ ] 결재 알림 기능 테스트 작성

#### **📚 문서화 및 배포 준비**
- [ ] API 문서 작성 (결재 관련 모든 엔드포인트)
- [ ] 사용자 가이드 작성 (결재 프로세스 설명)
- [ ] 관리자 설정 가이드 작성
- [ ] 마이그레이션 가이드 작성 (기존 데이터 이전 방법)
- [ ] 성능 모니터링 대시보드 설정
- [ ] 프로덕션 배포 체크리스트 작성

---

## ✅ **구현 우선순위 및 의존성**

### **🔴 High Priority (즉시 시작)**
1. **Phase 3.4.1**: 데이터베이스 스키마 - 모든 기능의 기반
2. **Phase 3.4.2**: 결재선 생성 엔진 - 핵심 비즈니스 로직
3. **Phase 3.4.3**: 기존 지출결의서 페이지 통합 - 사용자 경험

### **🟡 Medium Priority (순차 진행)**
4. **Phase 3.4.4**: 결재 처리 워크플로우 - 완전한 기능 구현
5. **Phase 3.4.5**: 결재 현황 대시보드 - 관리 편의성

### **🟢 Low Priority (여유있을 때)**
6. **Phase 3.4.6**: 고급 기능 및 최적화 - 성능 개선
7. **Phase 3.4.7**: 테스트 및 문서화 - 품질 보증

### **📝 각 Phase 완료 기준**
- [x] **Phase 3.4.1 완료**: 모든 스키마 적용, 기본 서비스 구조 완성 ✅
- [x] **Phase 3.4.2 완료**: 조직 기반 결재선 자동 생성 동작 ✅
- [x] **Phase 3.4.3 완료**: 기존 지출결의서 페이지에서 새로운 결재선 사용 가능 ✅
- [x] **Phase 3.4.4 완료**: 완전한 결재 승인/반려 프로세스 동작 ✅
- [x] **Phase 3.4.5 완료**: 결재 현황 대시보드 정상 동작 ✅
- [ ] **Phase 3.4.6 완료**: 모든 고급 기능 구현 및 성능 최적화
- [ ] **Phase 3.4.7 완료**: 테스트 커버리지 80% 이상, 문서화 완료

**전체 예상 소요 기간**: 7주 (약 2개월)
**MVP(최소 기능) 완료**: Phase 3.4.5 완료 시점 (5주) ✅ **완료됨**

---

## 🆕 **최근 추가 개발 사항 (2024년 9월 5일 기준)**

### **🔧 시스템 관리 기능 강화**
- [x] **교회 정보 수정 기능** - 시스템 관리자(SUPER_ADMIN)가 시스템 설정 페이지에서 교회 기본 정보 수정 가능
  - 교회명, 이메일, 전화번호, 주소, 홈페이지, 담임목사, 교회소개 편집
  - 권한 기반 접근 제어 (SUPER_ADMIN만 수정 가능)
  - 실시간 폼 유효성 검사 및 사용자 친화적 UI
  - tRPC API (`admin.church.getInfo`, `admin.church.updateInfo`) 구현

### **🗃️ 데이터 관리 개선**
- [x] **테스트 멤버 데이터 시드 스크립트** - "교인을 찾을 수 없습니다" 오류 해결
  - `src/scripts/seed-members.ts` - 교회, 조직, 역할, 교인 데이터 자동 생성
  - 5명의 테스트 교인 (장로, 권사, 집사, 성도) 및 조직 멤버십 생성
  - 데이터베이스 무결성 검증 및 중복 생성 방지

### **🛡️ 오류 처리 강화**
- [x] **지출결의서 폼 오류 처리 개선** - 반복 서버 호출 방지
  - tRPC 쿼리 옵션 추가: `retry: false`, `refetchOnWindowFocus: false`
  - ErrorBoundary 래핑으로 예상치 못한 오류 처리
  - 사용자 친화적 오류 메시지 및 복구 옵션 제공

### **📊 현재 개발 진행률**
```
Phase 3.4.1: ████████████████████ 100% ✅ 완료
Phase 3.4.2: ████████████████████ 100% ✅ 완료  
Phase 3.4.3: ████████████████████ 100% ✅ 완료
Phase 3.4.4: ████████████████████ 100% ✅ 완료
Phase 3.4.5: ████████████████████ 100% ✅ 완료
Phase 3.4.6: ░░░░░░░░░░░░░░░░░░░░  0%
Phase 3.4.7: ░░░░░░░░░░░░░░░░░░░░  0%

전체 진행률: ██████████████░░░░░░ 71.4% (5/7 Phase 완료)
```

---

## 🎯 **기대 효과**

### **1. 업무 효율성 개선**
- ⚡ **80% 빠른 결재**: 자동 결재선으로 수동 설정 불필요
- 🔄 **실시간 진행상황**: 언제든 결재 현황 확인 가능
- 📱 **모바일 결재**: 언제 어디서나 결재 처리

### **2. 내부통제 강화**
- 🛡️ **규정 준수**: 조직 규정에 따른 자동 결재선
- 📊 **투명한 프로세스**: 모든 결재 과정 추적 가능
- ⚠️ **리스크 관리**: 금액별/카테고리별 차등 결재

### **3. 관리 편의성 향상**
- 👥 **조직 변경 자동 반영**: 인사이동 시 결재선 자동 업데이트
- 📈 **결재 분석**: 결재 패턴 및 병목 지점 분석
- 🔔 **지능형 알림**: 결재 지연 자동 감지 및 에스컬레이션

이 통합 시스템으로 **교회 회계 업무의 디지털 혁신**을 이루어낼 수 있습니다! 🎊