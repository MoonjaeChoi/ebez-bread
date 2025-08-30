# 에벤에셀(eVeNeZeR) 교회 관리 시스템 - 백엔드 기술 스펙 및 구현 계획

> 작성일: 2025-08-26
> 목표: 효과적인 유지보수를 위한 백엔드 아키텍처 구축

## 📊 **현재 기술 스택 분석**

### ✅ **현재 잘 선택된 기술들**
- **Next.js 14** - 풀스택 프레임워크, 서버 컴포넌트 지원
- **tRPC v10** - Type-safe API, 자동 타입 추론
- **Prisma ORM** - Type-safe 데이터베이스 ORM
- **NextAuth.js v4** - 인증 시스템
- **TypeScript** - 타입 안정성
- **Zod** - 런타임 스키마 검증
- **Redis (ioredis)** - 캐싱 지원

## 🎯 **유지보수성 향상을 위한 추가 기술 스펙**

### **1. 에러 처리 & 로깅** 📝

#### **추가할 라이브러리**
```json
{
  "@sentry/nextjs": "^8.0.0",
  "winston": "^3.11.0",
  "@types/winston": "^2.4.4"
}
```

#### **구현 구조**
```
src/lib/
├── logger/
│   ├── index.ts          # Logger 설정
│   ├── formatters.ts     # 로그 포맷터
│   └── transports.ts     # 전송 방식 설정
└── monitoring/
    ├── sentry.ts         # Sentry 설정
    └── performance.ts    # 성능 모니터링
```

#### **로깅 전략**
- **Development**: Console + File 로깅
- **Production**: Sentry + Structured Logging
- **로그 레벨**: ERROR > WARN > INFO > DEBUG
- **로그 보관**: 30일 (로컬), 90일 (클라우드)

### **2. 캐싱 전략** 🚀

#### **3-Tier 캐싱 시스템**
```typescript
// 1. Browser Cache (SWR/React Query) - 1분
// 2. Redis Cache (서버) - 5분  
// 3. Database (Prisma) - 원본 데이터
```

#### **캐시 키 전략**
```typescript
const CACHE_KEYS = {
  MEMBER: (id: string) => `member:${id}`,
  MEMBERS_LIST: (churchId: string, page: number) => `members:${churchId}:page:${page}`,
  OFFERING_STATS: (churchId: string, year: number, month: number) => `offering:stats:${churchId}:${year}:${month}`,
  ATTENDANCE_SUMMARY: (churchId: string, date: string) => `attendance:summary:${churchId}:${date}`
} as const;
```

### **3. 백그라운드 작업 처리** ⚙️

#### **추가할 라이브러리**
```json
{
  "bullmq": "^5.0.0",
  "@bull-board/api": "^5.0.0", 
  "@bull-board/ui": "^5.0.0",
  "node-cron": "^3.0.3"
}
```

#### **작업 큐 구조**
```
src/lib/queue/
├── index.ts              # 큐 설정
├── jobs/
│   ├── emailJobs.ts      # 이메일 발송
│   ├── smsJobs.ts        # SMS 발송
│   ├── backupJobs.ts     # 데이터 백업
│   └── notificationJobs.ts # 자동 알림
└── processors/
    ├── emailProcessor.ts
    ├── smsProcessor.ts
    └── backupProcessor.ts
```

#### **사용 사례**
- **즉시 실행**: 이메일/SMS 발송
- **지연 실행**: 생일 알림 (자정)
- **반복 실행**: 정기 백업 (매일 오전 2시)
- **우선순위**: 긴급 알림 > 일반 알림 > 백업

### **4. 유효성 검증 강화** ✅

#### **검증 레이어**
```
1. Client-side: React Hook Form + Zod
2. API-side: tRPC Input Validation
3. Database-side: Prisma Schema Constraints
```

#### **고급 검증 패턴**
```typescript
// 교인 등록 스키마
const createMemberSchema = z.object({
  name: z.string()
    .min(1, "이름은 필수입니다")
    .max(50, "이름은 50자 이내여야 합니다")
    .regex(/^[가-힣a-zA-Z\s]+$/, "한글 또는 영문만 입력 가능합니다"),
  
  email: z.string().email("올바른 이메일 형식이 아닙니다").optional(),
  
  phone: z.string()
    .regex(/^01[0-9]-?[0-9]{4}-?[0-9]{4}$/, "올바른 휴대폰 번호를 입력해주세요")
    .optional(),
    
  birthDate: z.date()
    .max(new Date(), "미래 날짜는 입력할 수 없습니다")
    .optional(),
    
}).refine(data => data.email || data.phone, {
  message: "이메일 또는 전화번호 중 하나는 필수입니다",
  path: ["email"]
});

// 복합 검증
const expenseReportSchema = z.object({
  amount: z.number()
    .positive("금액은 0보다 커야 합니다")
    .max(10000000, "1천만원을 초과할 수 없습니다"),
  category: z.enum(EXPENSE_CATEGORIES),
  requestDate: z.date()
}).refine(data => {
  // 미래 날짜 제한 (3개월 이내)
  const threeMonthsFromNow = new Date();
  threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
  return data.requestDate <= threeMonthsFromNow;
}, {
  message: "신청일은 3개월 이내여야 합니다",
  path: ["requestDate"]
});
```

### **5. 데이터베이스 최적화** 🗄️

#### **연결 풀링 최적화**
```typescript
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url = env("DATABASE_URL")
  directUrl = env("DIRECT_URL") // 마이그레이션용
}

generator client {
  provider = "prisma-client-js"
  previewFeatures = ["jsonProtocol", "metrics"]
}
```

#### **쿼리 최적화 패턴**
```typescript
// Bad: N+1 문제
const members = await prisma.member.findMany();
const membersWithDetails = await Promise.all(
  members.map(m => prisma.member.findUnique({
    where: { id: m.id },
    include: { position: true, department: true }
  }))
);

// Good: 한 번의 쿼리
const members = await prisma.member.findMany({
  include: { 
    position: true, 
    department: true,
    _count: {
      select: {
        offerings: true,
        attendances: true,
        visitations: true
      }
    }
  },
  orderBy: { createdAt: 'desc' },
  take: 20 // 페이징
});
```

#### **인덱스 전략**
```sql
-- 자주 검색되는 필드들
CREATE INDEX idx_member_church_name ON members(church_id, name);
CREATE INDEX idx_offering_church_date ON offerings(church_id, offering_date DESC);
CREATE INDEX idx_attendance_church_service_date ON attendances(church_id, service_type, attendance_date DESC);
CREATE INDEX idx_visitation_church_date ON visitations(church_id, visit_date DESC);

-- 복합 인덱스 (필터링 + 정렬)
CREATE INDEX idx_expense_reports_search ON expense_reports(church_id, status, request_date DESC);
```

### **6. API 성능 모니터링** 📊

#### **추가할 라이브러리**
```json
{
  "@prisma/instrumentation": "^5.0.0",
  "@opentelemetry/api": "^1.7.0",
  "@vercel/otel": "^1.0.0"
}
```

#### **모니터링 메트릭**
- **응답 시간**: API 엔드포인트별
- **쿼리 성능**: 느린 쿼리 감지
- **캐시 히트율**: Redis 성능
- **에러율**: 5xx 에러 추적
- **메모리 사용량**: 메모리 누수 방지

### **7. 테스트 전략** 🧪

#### **추가할 라이브러리**
```json
{
  "@testing-library/react-hooks": "^8.0.1",
  "msw": "^2.0.0",
  "jest-mock-extended": "^3.0.5"
}
```

#### **테스트 피라미드**
```
1. Unit Tests (70%)
   - Utility 함수
   - Validation 스키마
   - Business Logic

2. Integration Tests (20%)
   - tRPC 라우터
   - Database 쿼리
   - Cache 동작

3. E2E Tests (10%)
   - 핵심 사용자 플로우
   - 인증 흐름
   - 데이터 CRUD
```

## 🏗️ **권장 아키텍처 패턴**

### **1. Repository Pattern**

```
src/repositories/
├── base/
│   └── BaseRepository.ts     # 공통 CRUD 메서드
├── MemberRepository.ts       # 교인 관리
├── OfferingRepository.ts     # 헌금 관리
├── AttendanceRepository.ts   # 출석 관리
├── VisitationRepository.ts   # 심방 관리
├── ExpenseRepository.ts      # 지출결의서
└── NotificationRepository.ts # 알림 관리
```

#### **Base Repository 예시**
```typescript
// src/repositories/base/BaseRepository.ts
export abstract class BaseRepository<T> {
  constructor(protected prisma: PrismaClient) {}

  async findById(id: string): Promise<T | null> {
    return this.getModel().findUnique({ where: { id } });
  }

  async findWithPagination(options: PaginationOptions): Promise<PaginatedResult<T>> {
    const { page = 1, limit = 10, where, orderBy } = options;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.getModel().findMany({ where, orderBy, skip, take: limit }),
      this.getModel().count({ where })
    ]);

    return {
      items,
      total,
      page,
      pages: Math.ceil(total / limit),
      hasMore: skip + items.length < total
    };
  }

  protected abstract getModel(): any;
}
```

### **2. Service Layer Pattern**

```
src/services/
├── MemberService.ts          # 교인 비즈니스 로직
├── OfferingService.ts        # 헌금 비즈니스 로직
├── AttendanceService.ts      # 출석 비즈니스 로직
├── VisitationService.ts      # 심방 비즈니스 로직
├── ExpenseService.ts         # 지출결의서 비즈니스 로직
├── NotificationService.ts    # 알림 비즈니스 로직
├── ReportService.ts          # 보고서 생성 로직
└── DataImportService.ts      # 데이터 가져오기 로직
```

#### **Service 예시**
```typescript
// src/services/MemberService.ts
export class MemberService {
  constructor(
    private memberRepo: MemberRepository,
    private logger: Logger,
    private cache: Redis,
    private eventEmitter: EventEmitter
  ) {}

  async createMember(churchId: string, data: CreateMemberInput): Promise<Member> {
    // 1. 유효성 검증
    const validatedData = createMemberSchema.parse(data);
    
    // 2. 중복 확인
    await this.checkDuplicateEmail(churchId, validatedData.email);
    
    // 3. 데이터 생성
    const member = await this.memberRepo.create({
      ...validatedData,
      churchId
    });
    
    // 4. 캐시 무효화
    await this.cache.del(`members:${churchId}:*`);
    
    // 5. 로깅
    this.logger.info('Member created', {
      memberId: member.id,
      churchId,
      name: member.name
    });
    
    // 6. 이벤트 발생
    this.eventEmitter.emit('member.created', { member, churchId });
    
    return member;
  }

  private async checkDuplicateEmail(churchId: string, email?: string) {
    if (!email) return;
    
    const existing = await this.memberRepo.findByEmail(churchId, email);
    if (existing) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: '이미 등록된 이메일입니다'
      });
    }
  }
}
```

### **3. Event-Driven Architecture**

```
src/events/
├── index.ts                  # 이벤트 에미터 설정
├── types.ts                  # 이벤트 타입 정의
├── handlers/
│   ├── memberEvents.ts       # 교인 관련 이벤트
│   ├── offeringEvents.ts     # 헌금 관련 이벤트
│   ├── expenseEvents.ts      # 지출결의서 이벤트
│   └── notificationEvents.ts # 알림 이벤트
└── middleware/
    ├── logging.ts            # 이벤트 로깅
    ├── analytics.ts          # 분석 데이터 수집
    └── audit.ts              # 감사 로그
```

#### **이벤트 시스템 예시**
```typescript
// src/events/types.ts
export const Events = {
  // 교인 관련
  MEMBER_CREATED: 'member.created',
  MEMBER_UPDATED: 'member.updated',
  MEMBER_DELETED: 'member.deleted',
  
  // 지출결의서 관련
  EXPENSE_SUBMITTED: 'expense.submitted',
  EXPENSE_APPROVED: 'expense.approved',
  EXPENSE_REJECTED: 'expense.rejected',
  
  // 시스템 관련
  DATA_BACKUP_COMPLETED: 'system.backup.completed',
  NOTIFICATION_SENT: 'notification.sent'
} as const;

// src/events/handlers/expenseEvents.ts
eventEmitter.on(Events.EXPENSE_SUBMITTED, async ({ expense, requester }) => {
  // 1. 승인자에게 이메일 알림
  await notificationService.sendExpenseApprovalRequest(expense, requester);
  
  // 2. 통계 업데이트
  await analyticsService.updateExpenseStats(expense.churchId);
  
  // 3. 감사 로그
  await auditService.log({
    action: 'EXPENSE_SUBMITTED',
    resourceId: expense.id,
    userId: requester.id,
    metadata: { amount: expense.amount, category: expense.category }
  });
});
```

## 🚀 **구현 우선순위**

### **Phase 1: 필수 백엔드 (1-2주)**

#### **1.1 지출결의서 tRPC 라우터 (최우선)**
```typescript
// src/server/routers/expenseRouter.ts
export const expenseRouter = router({
  // CRUD 작업
  create: protectedProcedure
    .input(createExpenseSchema)
    .mutation(async ({ ctx, input }) => { /* 구현 */ }),
    
  getAll: protectedProcedure
    .input(getExpensesSchema)
    .query(async ({ ctx, input }) => { /* 구현 */ }),
    
  // 승인 워크플로우
  approve: managerProcedure
    .input(approveExpenseSchema)
    .mutation(async ({ ctx, input }) => { /* 구현 */ }),
    
  // 통계
  getStats: protectedProcedure
    .input(z.object({ churchId: z.string() }))
    .query(async ({ ctx, input }) => { /* 구현 */ }),
});
```

#### **1.2 로깅 시스템 구축**
```bash
# 설치
npm install winston @types/winston @sentry/nextjs
```

#### **1.3 Repository Pattern 적용**
- BaseRepository 구현
- 각 도메인별 Repository 클래스 생성

### **Phase 2: 성능 최적화 (2-3주)**

#### **2.1 Redis 캐싱 전략**
- 캐시 키 설계
- TTL 전략 수립
- 캐시 무효화 로직

#### **2.2 데이터베이스 최적화**
- 인덱스 추가
- 쿼리 최적화
- Connection Pooling

#### **2.3 백그라운드 작업**
```bash
# 설치
npm install bullmq @bull-board/api @bull-board/ui node-cron
```

### **Phase 3: 고도화 기능 (3-4주)**

#### **3.1 알림 시스템**
- 이메일 발송 (Nodemailer)
- SMS 발송 (Twilio)
- 자동 알림 스케줄링

#### **3.2 데이터 처리**
- Excel/CSV 파일 처리
- 데이터 검증 및 변환
- 백업 시스템

#### **3.3 성능 모니터링**
- API 응답시간 추적
- 에러율 모니터링
- 리소스 사용량 추적

## 📁 **최종 파일 구조**

```
src/
├── lib/
│   ├── cache/              # Redis 캐싱
│   ├── events/             # 이벤트 시스템
│   ├── logger/             # 로깅 설정
│   ├── queue/              # 백그라운드 작업
│   ├── validation/         # 스키마 검증
│   └── monitoring/         # 성능 모니터링
├── repositories/           # 데이터 접근 레이어
├── services/              # 비즈니스 로직
├── server/
│   ├── routers/           # tRPC 라우터
│   ├── middleware/        # 공통 미들웨어
│   └── context.ts         # tRPC 컨텍스트
└── utils/                 # 유틸리티 함수
```

## 📋 **체크리스트**

### **Phase 1 완료 기준**
- [ ] ExpenseReport tRPC 라우터 구현
- [ ] Winston 로깅 시스템 설정
- [ ] Sentry 에러 모니터링 연동
- [ ] BaseRepository 패턴 적용
- [ ] 기본 유닛 테스트 작성

### **Phase 2 완료 기준**
- [ ] Redis 캐싱 시스템 구축
- [ ] 주요 API 성능 10% 이상 개선
- [ ] 데이터베이스 인덱스 최적화
- [ ] BullMQ 작업 큐 설정

### **Phase 3 완료 기준**
- [ ] 이메일/SMS 알림 시스템
- [ ] Excel/CSV 데이터 처리
- [ ] 성능 모니터링 대시보드
- [ ] 통합 테스트 90% 이상 커버리지

---

**🎯 목표: 확장 가능하고 유지보수가 쉬운 백엔드 아키텍처 구축**

이 계획을 단계별로 실행하면 **안정적이고 확장 가능한** 교회 관리 시스템 백엔드를 구축할 수 있습니다!