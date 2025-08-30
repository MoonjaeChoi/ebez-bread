# 에벤에셀(eVeNeZeR) 교회 관리 시스템

> 교회 교적 및 재정 관리를 위한 통합 플랫폼

## 🎯 프로젝트 개요

에벤에셀(eVeNeZeR) 교회 관리 시스템은 여러 엑셀 파일과 수기 장부로 분산 관리되던 교적 및 헌금 정보를 하나의 웹 기반 플랫폼에서 통합 관리하는 시스템입니다.

## 🚀 기술 스택

### Frontend
- **Next.js 14** - React 기반 풀스택 프레임워크
- **TypeScript** - 타입 안전성 보장
- **Tailwind CSS** - 유틸리티 우선 CSS 프레임워크
- **Shadcn/ui** - 재사용 가능한 UI 컴포넌트

### Backend & Database
- **Prisma** - 차세대 ORM
- **SQLite** (개발환경) / **PostgreSQL** (프로덕션)
- **NextAuth.js** - 인증 및 세션 관리
- **tRPC** - 타입 안전한 API (예정)

### 개발도구
- **ESLint** + **Prettier** - 코드 품질 관리
- **Husky** - Git 훅 관리
- **TypeScript** - 정적 타입 검사

## 🏗️ 프로젝트 구조

```
src/
├── app/                 # Next.js App Router
│   ├── auth/           # 인증 관련 페이지
│   ├── dashboard/      # 대시보드
│   └── api/            # API 라우트
├── components/         # 재사용 컴포넌트
│   ├── ui/            # 기본 UI 컴포넌트
│   └── providers/     # Context Providers
├── lib/               # 유틸리티 함수
├── hooks/             # 커스텀 훅
├── types/             # TypeScript 타입 정의
└── server/            # 서버 사이드 코드 (예정)
```

## 🔧 설치 및 실행

### 1. 프로젝트 클론 및 의존성 설치

```bash
git clone <repository-url>
cd church-app
npm install
```

### 2. 환경 변수 설정

`.env` 파일이 이미 개발용으로 설정되어 있습니다.

### 3. 데이터베이스 설정

```bash
# Prisma 클라이언트 생성
npx prisma generate

# 데이터베이스 생성 및 스키마 적용
npx prisma db push

# 시드 데이터 생성 (테스트 계정 포함)
npm run db:seed
```

### 4. 개발 서버 실행

```bash
npm run dev
```

http://localhost:3000 에서 애플리케이션 확인

## 🔐 테스트 계정

- **이메일**: `admin@ebenezer.church`
- **비밀번호**: `password`
- **역할**: SUPER_ADMIN (모든 권한)

## 📊 데이터베이스

### 개발 환경
- **SQLite** 사용 (dev.db 파일)
- 빠른 개발 및 테스트 가능

### 프로덕션 환경 (Supabase)
Supabase PostgreSQL로 전환하려면:

```bash
# Supabase 설정 가이드 실행
npm run setup:supabase

# 스키마를 PostgreSQL용으로 전환
npm run setup:supabase-schema

# 환경 변수에 Supabase URL 설정 후
npx prisma generate
npx prisma db push
npm run db:seed
```

자세한 가이드는 [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) 참조

## 👤 사용자 역할 및 권한

### 역할 체계 (7단계)
1. **SUPER_ADMIN** - 시스템 전체 관리
2. **FINANCIAL_MANAGER** - 재정 관리 전담
3. **MINISTER** - 교역자 (교인 및 목양 관리)
4. **COMMITTEE_CHAIR** - 위원장 (교역자 + 재정 승인)
5. **DEPARTMENT_HEAD** - 부서장 (부서 내 관리)
6. **DEPARTMENT_ACCOUNTANT** - 부서 회계
7. **GENERAL_USER** - 일반 사용자 (제한적 접근)

### 권한 시스템
- **CASL 기반** 세밀한 권한 제어
- **Multi-tenancy** 교회별 데이터 격리
- **역할별 메뉴** 접근 제어

## 🗄️ 데이터 모델

### 핵심 엔티티
- **Church** - 교회 정보 (Multi-tenancy 키)
- **User** - 사용자/직원 계정
- **Member** - 교인 정보
- **Position** - 직분 관리
- **Department** - 부서 관리
- **Offering** - 헌금 관리
- **Attendance** - 출석 관리
- **Visitation** - 심방 관리

## 🎯 주요 기능

### ✅ 완료된 기능
- 🔐 **인증 시스템** (NextAuth.js)
- 👥 **역할 기반 접근 제어**
- 🏢 **Multi-tenancy 지원**
- 📊 **대시보드** (권한별 메뉴)
- 🗄️ **완전한 데이터베이스 스키마**

### 🚧 개발 예정
- 📋 **교인 관리 CRUD**
- 💰 **헌금 관리 시스템**
- 📈 **출석 관리**
- 📊 **통계 및 보고서**
- 🏦 **지출결의서 시스템**

## 🛠️ 개발 명령어

```bash
# 개발 서버 실행
npm run dev

# 빌드
npm run build

# 타입 체크
npm run type-check

# 린트 및 포맷팅
npm run lint
npm run format

# 데이터베이스 관련
npm run db:generate      # Prisma 클라이언트 생성
npm run db:push          # 스키마를 DB에 푸시
npm run db:seed          # 시드 데이터 생성
npm run db:studio        # Prisma Studio 실행

# 테스트
npm run test
npm run e2e
```

## 📋 TODO 관리

프로젝트 진행 상황은 [TODOs.md](./TODOs.md)에서 확인할 수 있습니다.

## 📝 관련 문서

- [STEP2_PRD.md](../STEP2_PRD.md) - 기술 요구사항 정의서
- [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) - Supabase 설정 가이드
- [TODOs.md](../TODOs.md) - 개발 진행 현황

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 교회 사역을 위한 목적으로 개발되었습니다.

---

**개발 문의**: 에벤에셀(eVeNeZeR) 교회 관리 시스템 개발팀