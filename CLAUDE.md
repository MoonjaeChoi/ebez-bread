# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Ebenezer Church Management System** - A multi-tenant Next.js application for church administration including member management, financial accounting, attendance tracking, and offerings management.

## Essential Development Commands

### Core Development
```bash
npm run dev                    # Start development server (localhost:3000)
npm run build && npm run type-check && npm run lint  # Full build pipeline
npm run test                   # Run all tests
npm run test:watch             # Test watch mode
```

### Testing Specific Components
```bash
npm run test:accounting        # Test accounting modules only
npm run test:components        # Test React components only
npm run test:integration       # Integration tests
npm run e2e:accounting         # E2E tests for accounting
```

### Database Operations
```bash
npm run db:push               # Push schema changes to database
npm run db:seed               # Seed basic test data
npm run db:seed:accounting    # Seed accounting-specific data
npm run db:studio             # Open Prisma Studio
```

## Architecture & Key Patterns

### Multi-tenant Design
- All data is scoped by `churchId` - every Prisma query must filter by church
- Authentication handled via NextAuth.js with role-based permissions (7 tiers: SUPER_ADMIN → GENERAL_USER)
- Database models in `prisma/schema.prisma` with Church as the root tenant entity

### tRPC API Structure
- All business logic in `src/server/routers/` - organized by domain (members, offerings, accounting, etc.)
- Type-safe client-server communication via tRPC
- Three procedure types: `publicProcedure`, `protectedProcedure`, `adminProcedure`
- Main router in `src/server/routers/app.ts`

### Key Systems
- **Accounting**: Full double-entry bookkeeping with account codes, budgets, transactions
- **Notifications**: BullMQ-based queue system with Redis (`src/lib/notifications/`)
- **Logging**: Winston structured logging (`src/lib/logger/`)
- **Data Management**: Import/Export with Excel support (`src/lib/data-management/`)

### Component Organization
```
src/components/
├── accounting/        # Account trees, budget forms
├── ui/               # Shadcn/ui base components  
├── layout/           # Dashboard, sidebar, headers
├── mobile/           # PWA and mobile-specific components
└── [domain]/         # Feature-specific components
```

## Development Principles

### Implementation Workflow
- Business logic: Write tests first (TDD), implement in tRPC routers
- UI components: Implement first, then add tests
- Always use Clean Architecture and SOLID principles
- Multi-tenant: Every database operation must include `churchId` filter

### Code Standards
- TypeScript strict mode enabled
- ES modules only (no require())
- Import organization: external → internal → relative
- PascalCase for components/classes, camelCase for variables
- One component per file

### Testing Strategy
- Vitest for unit/integration tests with happy-dom environment
- Playwright for E2E tests in `e2e/` directory
- Test utilities in `src/test-utils/` with factories for test data
- Prefer integration tests over mocks when possible

### Database Development
- PostgreSQL in production, SQLite for development
- Always run `npm run db:push` after schema changes
- Use `npm run db:seed:accounting` for accounting-related development
- Multi-tenancy enforced at database level with CASCADE deletes

## Git & Deployment

### Branch Strategy
- Main branch: `main`
- Feature branches: `feature/[feature-name]`
- Hotfixes: `hotfix/[issue-id]`

### Commit Standards
- Use prefixes: `[feat]`, `[fix]`, `[docs]`, etc.
- All changes via Pull Requests only
- Run full test suite before commits: `npm run test && npm run type-check && npm run lint`

### Environment Setup
- Production/staging requires Supabase PostgreSQL setup via `npm run setup:supabase`
- Authentication test account: `admin@ebenezer.org` / `password`

## Key Integration Points

### External Services
- **Supabase**: PostgreSQL database and auth (production)
- **Redis**: Required for notification queue system
- **Twilio**: SMS notifications (optional)
- **Nodemailer**: Email notifications

### PWA Features
- Service worker configuration in `next.config.js`
- Push notifications via Web Push API
- Offline support with caching strategies

## 1. 구현 작업 원칙
- 비즈니스 로직 구현 작업은 반드시 테스트를 먼저 작성하고 구현하세요.
- SOLID 원칙을 사용해서 구현하세요.
- Clean Architecture를 사용해서 구현하세요.
- Pulumi나 CloudFormation에서 설정하는 
Description은 영문으로 작성하세요.
- UI 작업시에는 구현을 다 끝낸 다음 테스트 코드를 작성할 것
- UI 이외의 코어 로직은 TDD로 구현할 것.

## 2. 코드 품질 원칙
- **단순성**: 언제나 복잡한 솔루션보다 가장 단순한 솔루션을 우선하세요.
- **중복 방지**: 코드 중복을 피하고, 가능한 기존 기능을 재사용하세요. (DRY 원칙).
- **가드레일**: 테스트 외에는 개발이나 프로덕션 환경에서 모의 데이터를 사용하지 마세요.
- **효율성**: 명확성을 희생하지 않으면서 토큰 사용을 최소화하도록 출력을 최적화하세요.

## 3. 리팩토링
- 리팩토링이 필요한 경우 계획을 설명하고 허락을 받은 다음 진행하세요.
- 코드 구조를 개선하는 것이 목표이며, 기능 변경은 아닙니다.
- 리팩토링 후에는 모든 테스트가 통과하는지 확인하세요.

## 4. 디버깅
- 디버깅 시에는 원인 및 해결책을 설명하고 허락을 받은 다음 진행하세요.
- 여러 해결이 중요한 것이 아니라 제대로 동작하는 것이 중요합니다.
- 원인이 불분명할 경우 분석을 위해 상세 로그를 추가하세요.

## 5. 언어
- AWS 리소스에 대한 설명은 영문으로 작성하세요.
- 기술적인 용어나 라이브러리 이름 등은 원문을 유지합니다.
- 간단한 다이어그램은 mermaid를 사용하고, 복잡한 아키텍처 다이어그램은 별도의 svg 파일을 생성해서 문서에 포함시킬것

## 6. Git 커밋
- Personal Access Token:"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"
- github address:"https://github.com/MoonjaeChoi/ebez-bread.git"
- 원격 저장소에 푸시할 때, 먼저 HTTP 버퍼 크기를 늘리고 조금씩 나누어 푸시할 것. 에러 시 작은 변경사항만 포함하는 새 커밋을 만들어 푸시할 것.
- `--no-verify`를 절대 사용하지 마세요
- 명확하고 일관된 커밋 메시지를 작성하세요.
- 적절한 크기로 커밋을 유지하세요.
- .git 이 존재하지 않으면 git 저장소 초기화할 것.( git init )
- 파일 생성 또는 수정 시, 파일 생성 또는 수정한 후, git add와 commit 수행할 것.
- 파일 삭제시 git rm 및 commit 사용할 것.

## 코드 스타일 가이드
- ES 모듈(import/export)만 사용, require 금지
- import 시 구조 분해 할당 권장 (예: import { x } from 'y')
- 함수/클래스 이름은 PascalCase, 변수/상수는 camelCase
- 1 파일 1 컴포넌트 원칙
## 테스트 및 워크플로우
- 테스트 코드를 먼저 작성(TDD 원칙)
- mock 사용 지양, 실제 환경 최대한 가깝게 작성
- 여러 코드 변경 시 반드시 typecheck, lint, test 전부 재실행
- 전체 테스트보다 단일 테스트 실행을 우선
## PR 및 커밋 규칙
- 모든 수정은 Pull Request로만 병합
- 커밋 메시지는 '[feat], [fix], [docs]' 등 prefix 사용
- PR마다 변경 요약 필수 (변경 전후 예시 첨부 권장)

## 브랜치 규칙
- 메인 브랜치는 main, 개발 브랜치는 feature/ 기능명, hotfix/ 이슈ID 형식

## 프로젝트 특이사항
- 외부 라이브러리 추가 시 반드시 CLAUDE.md 하단에 사유 및 버전 기록

## Claude Code 사용법
- 항상 /clear 명령어로 대화 이력 초기화 후 작업 시작
- 복잡한 작업은 Plan 모드에서 설계 → 승인 → 실행
- think, think hard 등 사고 강화 모드를 중요 변경마다 활용
- 컨텍스트 창(토큰) 절약 위해 불필요 기록 수시 삭제