# 조직도 및 교인 다대다 관계 시스템

## 개요

교회 관리 시스템에서 조직과 교인 간의 다대다 관계를 지원하는 데이터 모델입니다. 한 명의 교인이 여러 조직에 소속될 수 있고, 각 조직에서 서로 다른 직책을 가질 수 있습니다.

## 데이터 모델 구조

### 1. 핵심 모델

#### Organization (조직)
- 4단계 계층 구조 지원 (LEVEL_1 ~ LEVEL_4)
- 자기참조를 통한 트리 구조
- 조직 코드, 이름, 영문명, 설명 등 관리

#### OrganizationRole (조직 직책)
- 교회별로 관리되는 직책 정의
- 직책 레벨 (0-100)과 리더십 여부 구분
- 43개 기본 직책 제공

#### OrganizationMembership (조직 멤버십)
- Member와 Organization의 다대다 관계를 담는 중간 테이블
- 직책, 가입/종료일, 주 소속 여부 등 관리
- 활성/비활성 상태 추적

### 2. 지원하는 직책들

#### 최고위급 리더십 (Level 90-100)
- 회장, 위원장, 부위원장

#### 고위급 리더십 (Level 70-89)  
- 부장, 차장, 교구목사, 단장, 교역자

#### 중급 리더십 (Level 50-69)
- 교구장, 부교구장, 구역장, 부구역장, 리더

#### 관리직 (Level 30-49)
- 총무, 부총무, 서기, 부서기

#### 재정 관리직 (Level 30-39)
- 회계, 부회계

#### 대표직 (Level 60-70)
- 남선교회대표, 여전도회대표, 안수집사대표, 권사회대표

#### 교회 특수직분 (Level 70-80)
- 교구권사, 엘더, 임원

#### 전문직/특수직 (Level 15-35)
- 교사, 대장, 지휘자, 반주자, 솔리스트
- 소프라노, 알토, 테너, 베이스 (찬양대 파트)

#### 운영진 (Level 20-30)
- 운영위원, 부감

## API 구조

### 1. tRPC 라우터

#### organizationMemberships
- `getByOrganization`: 조직별 멤버십 조회
- `getByMember`: 교인별 멤버십 조회  
- `getLeadersByOrganization`: 조직별 리더십 조회
- `create`: 멤버십 생성
- `update`: 멤버십 수정
- `deactivate`: 멤버십 종료
- `delete`: 멤버십 삭제
- `getStatsByOrganization`: 조직별 멤버십 통계

#### organizationRoles  
- `getAll`: 전체 직책 조회
- `getLeadershipRoles`: 리더십 직책만 조회
- `getMembersByRole`: 직책별 멤버 조회
- `create`: 직책 생성
- `update`: 직책 수정
- `deactivate`: 직책 비활성화
- `delete`: 직책 삭제
- `getStats`: 직책 통계
- `getLevelDistribution`: 레벨별 직책 분포

### 2. 데이터베이스 제약조건

#### 고유 제약조건
- `OrganizationMembership`: 한 교인이 같은 조직에서 동시에 하나의 활성 멤버십만 보유
- `OrganizationRole`: 같은 교회 내에서 직책명 중복 방지

#### 인덱스
- 멤버십: memberId, organizationId, roleId, joinDate
- 직책: churchId+level, churchId+isLeadership
- 조직: churchId+level, churchId+parentId, code

## 사용 예시

### 1. 교인의 조직 소속 현황 조회
```typescript
const memberMemberships = await trpc.organizationMemberships.getByMember.query({
  memberId: "member123",
  includeInactive: false
});
```

### 2. 조직의 멤버 목록 조회
```typescript
const organizationMembers = await trpc.organizationMemberships.getByOrganization.query({
  organizationId: "org123", 
  includeInactive: false
});
```

### 3. 새로운 멤버십 생성
```typescript
await trpc.organizationMemberships.create.mutate({
  memberId: "member123",
  organizationId: "org123", 
  roleId: "role123",
  isPrimary: false,
  notes: "신규 가입"
});
```

### 4. 리더십 직책 조회
```typescript
const leadershipRoles = await trpc.organizationRoles.getLeadershipRoles.query();
```

## 비즈니스 규칙

### 1. 멤버십 관리
- 한 교인은 여러 조직에 소속 가능
- 각 조직에서 서로 다른 직책 보유 가능
- 주 소속 조직은 하나만 지정 가능
- 멤버십 종료 시 자동으로 비활성화

### 2. 직책 관리  
- 직책은 교회별로 관리
- 레벨이 높을수록 상위 직책
- 리더십 직책과 일반 직책 구분
- 사용 중인 직책은 삭제 불가 (비활성화만 가능)

### 3. 데이터 무결성
- 멤버와 조직은 같은 교회에 속해야 함
- 직책도 같은 교회에 속해야 함
- CASCADE 삭제로 데이터 일관성 보장

## 확장 가능성

### 1. 향후 추가 가능한 기능
- 조직별 권한 관리
- 직책별 업무 할당
- 멤버십 이력 추적
- 조직 간 관계 정의
- 직책 승계 시스템

### 2. 성능 최적화
- 적절한 인덱스 구성으로 조회 성능 확보
- 배치 처리를 통한 대량 데이터 처리
- 캐싱 전략 적용 가능

## 시드 데이터

### 1. 조직 구조
- `organization-seed.ts`: 기본 조직 구조
- `real-organization-seed.ts`: 실제 교회 조직 구조

### 2. 직책 정의
- `organization-role-seed.ts`: 43개 기본 직책 정의

### 3. 멤버십 예시
- `organization-membership-seed.ts`: 샘플 멤버십 데이터

## 마이그레이션 가이드

### 기존 시스템에서 새 시스템으로 이전 시
1. 기존 Member.organizationId 데이터를 OrganizationMembership으로 이전
2. 직책 정보를 OrganizationRole에 매핑
3. 주 소속 조직 설정 (isPrimary = true)
4. 기존 관계 정리

### Prisma 스키마 업데이트 후 실행
```bash
npm run db:push
npm run db:seed
```

이 시스템을 통해 복잡한 교회 조직 구조와 교인들의 다양한 역할을 효과적으로 관리할 수 있습니다.