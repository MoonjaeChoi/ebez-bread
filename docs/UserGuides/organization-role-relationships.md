# OrganizationRole 관계도 및 연동 테이블 가이드

## 개요

`OrganizationRole` 모델은 교회 조직 내에서 다양한 직책과 역할을 정의하고 관리하는 핵심 테이블입니다. 이 문서는 OrganizationRole이 다른 테이블들과 어떻게 연결되어 있는지, 그리고 각 관계의 역할과 특징을 설명합니다.

## OrganizationRole 모델 구조

```typescript
model OrganizationRole {
  id           String   @id @default(cuid())
  name         String   // 역할명 (예: 담임목사, 부목사, 장로)
  englishName  String?  // 영문 역할명
  description  String?  // 역할 설명
  level        Int      // 조직 내 계층 레벨
  sortOrder    Int      // 정렬 순서
  isActive     Boolean  // 활성 상태
  isLeadership Boolean  // 리더십 역할 여부
  createdAt    DateTime
  updatedAt    DateTime
  churchId     String   // 소속 교회 ID
}
```

## 연동 관계 상세

### 1. Church (교회) - 상위 관계

**관계 타입**: Many-to-One (N:1)
**외래키**: `OrganizationRole.churchId → Church.id`

```typescript
// OrganizationRole에서
church: Church @relation(fields: [churchId], references: [id], onDelete: Cascade)

// Church에서
organizationRoles: OrganizationRole[]
```

**특징**:
- 각 조직 역할은 반드시 하나의 교회에 소속
- 교회가 삭제되면 해당 교회의 모든 조직 역할도 함께 삭제 (Cascade)
- 교회별로 고유한 역할 체계 구축 가능

### 2. OrganizationMembership (조직 구성원) - 하위 관계

**관계 타입**: One-to-Many (1:N)
**외래키**: `OrganizationMembership.roleId → OrganizationRole.id`

```typescript
// OrganizationRole에서
memberships: OrganizationMembership[]

// OrganizationMembership에서
role: OrganizationRole? @relation(fields: [roleId], references: [id])
```

**특징**:
- **선택적 관계**: roleId가 null일 수 있음 (역할 없는 일반 구성원)
- 한 역할에 여러 구성원이 배정될 수 있음
- 구성원별로 조직 내 역할 추적 가능

**사용 예시**:
```sql
-- 장로 역할을 맡은 구성원 조회
SELECT m.name, om.joinDate 
FROM organization_memberships om
JOIN members m ON om.memberId = m.id
JOIN organization_roles r ON om.roleId = r.id
WHERE r.name = '장로' AND om.isActive = true;
```

### 3. OrganizationRoleAssignment (역할 배정) - 하위 관계

**관계 타입**: One-to-Many (1:N)
**외래키**: `OrganizationRoleAssignment.roleId → OrganizationRole.id`

```typescript
// OrganizationRole에서
roleAssignments: OrganizationRoleAssignment[]

// OrganizationRoleAssignment에서
role: OrganizationRole @relation(fields: [roleId], references: [id], onDelete: Cascade)
```

**특징**:
- **필수 관계**: Cascade 삭제 설정
- 조직별로 어떤 역할들이 배정되어 있는지 관리
- 역할 상속 기능 지원 (`isInherited`, `inheritedFrom` 필드)

**사용 예시**:
```sql
-- 특정 조직에 배정된 모든 역할 조회
SELECT r.name, ra.isInherited, ra.createdAt
FROM organization_role_assignments ra
JOIN organization_roles r ON ra.roleId = r.id
WHERE ra.organizationId = 'org_id' AND ra.isActive = true;
```

## 데이터베이스 인덱스

OrganizationRole 테이블의 성능 최적화를 위한 인덱스:

```sql
-- 복합 유니크 인덱스: 교회별 역할명 중복 방지
@@unique([churchId, name])

-- 성능 인덱스들
@@index([churchId, level])      -- 교회별 계층 레벨 조회
@@index([churchId, isLeadership]) -- 교회별 리더십 역할 조회
```

## 실제 사용 시나리오

### 1. 새 조직 역할 생성
```typescript
const newRole = await prisma.organizationRole.create({
  data: {
    name: '부목사',
    englishName: 'Associate Pastor',
    description: '담임목사를 보조하는 목회자',
    level: 2,
    isLeadership: true,
    churchId: 'church_id'
  }
})
```

### 2. 조직에 구성원 추가 (역할 포함)
```typescript
const membership = await prisma.organizationMembership.create({
  data: {
    memberId: 'member_id',
    organizationId: 'org_id',
    roleId: 'role_id',  // OrganizationRole.id
    isActive: true
  }
})
```

### 3. 조직에 역할 배정
```typescript
const roleAssignment = await prisma.organizationRoleAssignment.create({
  data: {
    organizationId: 'org_id',
    roleId: 'role_id',
    isInherited: false,
    isActive: true
  }
})
```

## 주의사항 및 베스트 프랙티스

### 1. 데이터 무결성
- 교회 삭제 시 모든 관련 역할이 자동 삭제됨 (Cascade)
- 역할명은 교회 내에서 유일해야 함
- 비활성 역할도 데이터 보존을 위해 물리 삭제하지 않음

### 2. 성능 고려사항
- 교회별 역할 조회 시 `churchId` 인덱스 활용
- 리더십 역할만 조회할 때는 `isLeadership` 인덱스 활용
- 대량 데이터 조회 시 필요한 필드만 select

### 3. 확장성
- `level` 필드를 활용한 계층 구조 표현
- `sortOrder`로 화면 표시 순서 제어
- `englishName` 필드로 다국어 지원 준비

## 관련 문서
- [조직 구성원 관리 가이드](./organization-member-guide.md)
- [교회 조직 구조 설계 가이드](./church-organization-structure.md)