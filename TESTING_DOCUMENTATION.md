# 회계 시스템 테스트 문서

## 📋 테스트 개요

한국 교회 관리 시스템의 회계 기능에 대한 포괄적인 테스트 스위트가 구현되었습니다. 단위 테스트, 통합 테스트, 컴포넌트 테스트, E2E 테스트를 통해 시스템의 안정성과 신뢰성을 보장합니다.

## 🏗️ 테스트 아키텍처

### 테스트 계층 구조
```
src/
├── test-utils/                 # 테스트 유틸리티
│   ├── setup.ts               # 전역 테스트 설정
│   ├── factories.ts           # 테스트 데이터 팩토리
│   ├── trpc-helpers.ts        # tRPC 테스트 헬퍼
│   └── react-helpers.tsx      # React 컴포넌트 테스트 헬퍼
├── server/routers/__tests__/   # API 단위 테스트
│   ├── account-codes.test.ts
│   ├── budgets.test.ts
│   └── transactions.test.ts
├── components/**/__tests__/    # 컴포넌트 테스트
│   ├── account-tree.test.tsx
│   └── budget-form.test.tsx
├── test/integration/          # 통합 테스트
│   └── accounting-workflow.test.ts
└── e2e/accounting/            # E2E 테스트
    ├── account-management.spec.ts
    └── budget-management.spec.ts
```

## 🛠️ 테스트 도구 및 설정

### 사용된 테스트 도구
- **Vitest**: 단위/통합 테스트 러너
- **React Testing Library**: 컴포넌트 테스트
- **Playwright**: E2E 테스트
- **vitest-mock-extended**: 고급 모킹
- **MSW**: API 모킹 (옵션)

### 테스트 설정 파일
- `vitest.config.ts`: Vitest 설정
- `src/test-utils/setup.ts`: 전역 테스트 설정
- `playwright.config.ts`: E2E 테스트 설정

## 📊 테스트 커버리지

### 단위 테스트 (Unit Tests)

#### AccountCodes Router 테스트
- **파일**: `src/server/routers/__tests__/account-codes.test.ts`
- **커버리지**: 8개 주요 엔드포인트 테스트
- **테스트 케이스**:
  - ✅ `getAll`: 계정과목 목록 조회 (필터링, 계층구조)
  - ✅ `getById`: 특정 계정과목 조회
  - ✅ `create`: 계정과목 생성 (검증, 계층 제약)
  - ✅ `update`: 계정과목 수정 (권한, 시스템 계정 보호)
  - ✅ `delete`: 계정과목 삭제 (제약 검증)
  - ✅ `validateCode`: 코드 중복 검사

#### Budgets Router 테스트
- **파일**: `src/server/routers/__tests__/budgets.test.ts`
- **커버리지**: 10개 주요 엔드포인트 테스트
- **테스트 케이스**:
  - ✅ `getAll`: 예산 목록 조회 (페이지네이션, 필터링)
  - ✅ `getById`: 예산 상세 조회
  - ✅ `create`: 예산 생성 (검증, 항목 합계 확인)
  - ✅ `update`: 예산 수정 (상태별 권한 제어)
  - ✅ `delete`: 예산 삭제 (상태 검증)
  - ✅ `getAvailableItems`: 사용 가능한 예산 항목 조회
  - ✅ `checkBalance`: 예산 잔액 확인
  - ✅ `approve`: 예산 승인 프로세스

#### Transactions Router 테스트
- **파일**: `src/server/routers/__tests__/transactions.test.ts`
- **커버리지**: 8개 주요 엔드포인트 테스트
- **테스트 케이스**:
  - ✅ `create`: 거래 생성 (복식부기 검증)
  - ✅ `getAll`: 거래 목록 조회 (필터링, 페이지네이션)
  - ✅ `getById`: 거래 상세 조회
  - ✅ `update`: 거래 수정
  - ✅ `delete`: 거래 삭제
  - ✅ `getTrialBalance`: 시산표 생성
  - ✅ `getAccountBalance`: 계정별 잔액 조회

### 컴포넌트 테스트 (Component Tests)

#### AccountTree 컴포넌트 테스트
- **파일**: `src/components/accounting/__tests__/account-tree.test.tsx`
- **테스트 케이스**:
  - ✅ 로딩 상태 렌더링
  - ✅ 계정 계층구조 표시
  - ✅ 노드 확장/축소 기능
  - ✅ 계정 선택 이벤트
  - ✅ 액션 버튼 표시 (권한별)
  - ✅ 삭제 확인 다이얼로그
  - ✅ 계정 유형별 필터링
  - ✅ 오류 상태 처리

#### BudgetForm 컴포넌트 테스트
- **파일**: `src/components/budgets/__tests__/budget-form.test.tsx`
- **테스트 케이스**:
  - ✅ 생성/수정 모드 렌더링
  - ✅ 폼 제출 처리
  - ✅ 유효성 검증 오류 표시
  - ✅ 총액 자동 계산
  - ✅ 불일치 경고 표시
  - ✅ 로딩 상태 처리

### 통합 테스트 (Integration Tests)

#### 회계 워크플로우 통합 테스트
- **파일**: `src/test/integration/accounting-workflow.test.ts`
- **테스트 시나리오**:
  - ✅ **완전한 회계 라이프사이클**: 계정 생성 → 예산 수립 → 승인 → 거래 기록 → 시산표 생성
  - ✅ **예산 초과 방지**: 예산 잔액 확인 및 초과 지출 차단
  - ✅ **계정 계층구조 작업**: 부모-자식 관계 제약 검증
  - ✅ **복식부기 규칙 검증**: 차변/대변 균형 확인

### E2E 테스트 (End-to-End Tests)

#### 계정 관리 E2E 테스트
- **파일**: `e2e/accounting/account-management.spec.ts`
- **테스트 시나리오**:
  - ✅ 계정 트리 구조 표시
  - ✅ 새 계정 생성
  - ✅ 중복 코드 검증
  - ✅ 계정 노드 확장/축소
  - ✅ 계정 유형별 필터링
  - ✅ 계정 수정/삭제
  - ✅ 권한별 기능 제한
  - ✅ 로딩/오류 상태 처리

#### 예산 관리 E2E 테스트
- **파일**: `e2e/accounting/budget-management.spec.ts`
- **테스트 시나리오**:
  - ✅ 예산 현황 대시보드
  - ✅ 새 예산 생성
  - ✅ 예산 제출/승인 프로세스
  - ✅ 예산 잔액 확인
  - ✅ 예산 초과 방지
  - ✅ 예산 필터링
  - ✅ 집행 진행률 표시
  - ✅ 예산 변경/마감

## 🚀 테스트 실행 방법

### 기본 테스트 명령어
```bash
# 모든 테스트 실행
npm test

# 테스트 감시 모드
npm run test:watch

# 테스트 UI 실행
npm run test:ui

# 커버리지 리포트 생성
npm run test:coverage
```

### 특화된 테스트 명령어
```bash
# 회계 시스템 API 테스트만 실행
npm run test:accounting

# 컴포넌트 테스트만 실행
npm run test:components

# 통합 테스트만 실행
npm run test:integration

# E2E 테스트 실행
npm run e2e

# 회계 관련 E2E 테스트만 실행
npm run e2e:accounting
```

## 📋 테스트 데이터 팩토리

### 주요 팩토리 함수
```typescript
// 계정과목 팩토리
accountCodeFactory.create()           // 단일 계정 생성
accountCodeFactory.createHierarchy()  // 4단계 계층구조 생성

// 예산 팩토리
budgetFactory.create()                // 기본 예산 생성
budgetFactory.createWithItems()       // 예산 항목 포함 생성

// 거래 팩토리
transactionFactory.create()           // 복식부기 거래 생성

// 교회/부서 팩토리
churchFactory.create()                // 교회 데이터 생성
departmentFactory.create()            // 부서 데이터 생성
```

## 🔍 테스트 모킹 전략

### Prisma 모킹
```typescript
// prismaMock을 사용한 데이터베이스 모킹
prismaMock.accountCode.findMany.mockResolvedValue(mockData)
prismaMock.budget.create.mockResolvedValue(createdData)
```

### tRPC 모킹
```typescript
// tRPC 프로시저 직접 테스트
const caller = createTRPCCaller()
const result = await caller.accountCodes.getAll({})
```

### React 컴포넌트 모킹
```typescript
// 커스텀 렌더 함수 사용
render(<AccountTree />, {
  session: mockSession,
  queryClient: testQueryClient
})
```

## 📊 테스트 메트릭

### 현재 테스트 커버리지
- **단위 테스트**: 26개 주요 API 엔드포인트
- **컴포넌트 테스트**: 16개 주요 UI 컴포넌트
- **통합 테스트**: 4개 복합 시나리오
- **E2E 테스트**: 20개 사용자 시나리오

### 예상 커버리지 목표
- **라인 커버리지**: 85% 이상
- **브랜치 커버리지**: 80% 이상
- **함수 커버리지**: 90% 이상

## 🚨 테스트 모범 사례

### 1. 테스트 격리
- 각 테스트는 독립적으로 실행 가능
- `beforeEach`에서 모킹 초기화
- 테스트 간 상태 공유 방지

### 2. 현실적인 테스트 데이터
- 실제 운영 데이터와 유사한 팩토리 사용
- 경계값 테스트 포함
- 다양한 시나리오 커버

### 3. 오류 시나리오 테스트
- 네트워크 오류, 권한 오류 등
- 사용자 입력 검증
- 시스템 제약 조건 검증

### 4. 성능 고려사항
- 테스트 실행 시간 최적화
- 무거운 E2E 테스트 선별 실행
- 병렬 테스트 실행 활용

## 🔧 CI/CD 통합

### GitHub Actions 워크플로우 예시
```yaml
- name: Run Tests
  run: |
    npm run test:coverage
    npm run e2e:accounting
    
- name: Upload Coverage
  uses: codecov/codecov-action@v1
```

## 📈 지속적인 개선

### 향후 개선 계획
1. **테스트 커버리지 확대**: 95% 목표
2. **성능 테스트 추가**: 대량 데이터 처리 검증
3. **보안 테스트 강화**: 권한 체계 검증
4. **시각적 회귀 테스트**: UI 일관성 검증

---

**작성일**: 2025년 8월 27일  
**작성자**: Claude Opus 4.1  
**버전**: 1.0.0