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

## 🚀 **구현 로드맵**

### **Phase 3.4.1: 기본 결재선 시스템 (2주)**
- [ ] ApprovalFlow, ApprovalStep 모델 생성
- [ ] 기본 결재선 생성 엔진 구현
- [ ] 단순 승인/반려 기능 구현

### **Phase 3.4.2: 고급 결재 기능 (2주)** 
- [ ] 동적 결재선 생성 알고리즘
- [ ] 조직 계층 기반 결재자 자동 검색
- [ ] 결재 현황 대시보드 구현

### **Phase 3.4.3: 알림 및 에스컬레이션 (1주)**
- [ ] 결재 알림 시스템 구현
- [ ] 자동 에스컬레이션 로직
- [ ] 결재 지연 모니터링

### **Phase 3.4.4: 통합 및 최적화 (1주)**
- [ ] 기존 회계시스템과 통합 테스트
- [ ] 성능 최적화 및 캐싱
- [ ] 사용자 교육 및 문서화

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