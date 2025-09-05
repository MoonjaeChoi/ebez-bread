'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  ArrowLeft, 
  UserCheck, 
  Users, 
  Plus,
  Building2,
  Info,
  Crown,
  Star,
  Shield,
  Music,
  Mic,
  Calculator
} from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { OrganizationMembershipForm } from '@/components/data-management/OrganizationMembershipForm'
import { OptimizedOrganizationMembershipList } from '@/components/data-management/optimized/OptimizedOrganizationMembershipList'
import { RoleManagementTab } from '@/components/organization/RoleManagementTab'
import { MembershipErrorBoundary, ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { HelpModal } from '@/components/ui/HelpModal'

// 조직 구성원 관리 사용자 가이드 내용
const ORGANIZATION_MEMBER_GUIDE = `# 조직도 구성원 추가 및 직책 할당 가이드

## 📋 개요

이 가이드는 조직도에서 구성원을 추가하고 직책을 할당하는 방법에 대해 설명합니다. 특정 직책을 할당받은 구성원은 자동으로 시스템 로그인 계정이 생성되어 지출결의서 승인 등의 업무를 수행할 수 있습니다.

## 🎯 주요 기능

- **구성원 자동 검색**: Member 테이블에서 교인 정보를 검색하여 선택
- **직책별 자동 권한 할당**: 직책에 따라 결재 권한과 시스템 역할이 자동으로 부여
- **자동 계정 생성**: 중요 직책 할당 시 자동으로 로그인 계정 생성
- **비밀번호 변경 강제**: 첫 로그인 시 반드시 비밀번호 변경 필요

---

## 📝 Step 1: 조직도 페이지 접근

1. **대시보드 메뉴**에서 \`데이터 관리\` → \`조직 구성원 관리\` 선택
2. 또는 URL 직접 접근: \`/dashboard/data-management/organization-memberships\`

---

## 👥 Step 2: 구성원 추가하기

### 2-1. 구성원 추가 버튼 클릭
- 페이지 상단의 **"+ 구성원 추가"** 버튼 클릭
- 구성원 추가 모달 창이 열립니다

### 2-2. 교인 검색 및 선택
1. **교인 검색창**에 이름, 전화번호, 또는 이메일 입력
2. 실시간으로 \`Member\` 테이블에서 교인 정보 검색
3. 검색 결과에서 원하는 교인 선택
   - 교인 이름, 연락처, 이메일 정보 확인 가능

### 2-3. 조직 선택
1. **조직 선택** 드롭다운에서 해당 교인이 소속될 조직 선택
2. 조직은 계층적 구조로 표시됩니다 (부서 → 팀 → 소그룹)

### 2-4. 직책 할당
1. **직책 선택** 드롭다운에서 해당 교인의 직책 선택
2. 직책별 권한은 다음과 같이 자동 할당됩니다:

---

## 🏆 Step 3: 직책별 권한 및 계정 생성 규칙

### 📊 직책별 권한 매핑표

| 직책 분류 | 해당 직책 | 시스템 역할 | 결재 권한 | 자동 계정 생성 |
|-----------|-----------|-------------|-----------|----------------|
| **최고 승인자** | 교구장, 부교구장, 위원장, 부위원장 | COMMITTEE_CHAIR | 3단계 + 최종승인 | ✅ |
| **중간 승인자** | 부장, 차장, 총무 | DEPARTMENT_HEAD | 2단계 승인 | ✅ |
| **초기 승인자** | 회계, 부회계 | DEPARTMENT_ACCOUNTANT | 1단계 승인 + 작성 | ✅ |
| **일반 구성원** | 기타 모든 직책 | GENERAL_USER | 없음 | ❌ |

### ⚡ 자동 처리 내용

#### **중요 직책 할당 시 (교구장, 부교구장, 위원장, 부위원장, 부장, 차장, 총무, 회계, 부회계)**

1. **자동 계정 생성**:
   - \`users\` 테이블에 로그인 계정 자동 생성
   - 임시 비밀번호: 로그인 이메일과 동일하게 설정
   - 이메일: Member 테이블의 이메일 정보 사용
   - \`passwordChangeRequired = true\` 설정

2. **권한 할당**:
   - 직책에 맞는 UserRole 자동 할당
   - 지출결의서 승인 권한 부여
   - 시스템 메뉴 접근 권한 부여

3. **알림 발송** (현재는 로그):
   - 계정 생성 완료 메시지
   - 로그인 정보 안내: 이메일과 임시 비밀번호(이메일과 동일) 제공

---

## 🔑 Step 4: 첫 로그인 및 비밀번호 변경

### 4-1. 로그인 정보 확인
- **이메일**: Member 테이블에 등록된 이메일 주소
- **임시 비밀번호**: 이메일 주소와 동일 (예: admin@gc.kr → 비밀번호도 admin@gc.kr)
- 계정 생성 시 관리자에게 전달되는 정보 확인

### 4-2. 첫 로그인 과정
1. \`/auth/signin\` 페이지에서 로그인
2. **자동 리다이렉트**: \`/change-password\` 페이지로 이동
3. 다른 페이지 접근 시도 시 자동으로 비밀번호 변경 페이지로 이동

### 4-3. 비밀번호 변경
1. **현재 비밀번호**: 임시 비밀번호 입력
2. **새 비밀번호**: 
   - 최소 8자 이상
3. **비밀번호 확인**: 새 비밀번호 재입력
4. **저장** 버튼 클릭
5. 변경 완료 후 대시보드로 자동 이동

---

## ⚠️ 주의사항 및 문제 해결

### 🚨 주의사항

1. **중복 방지**: 이미 시스템 계정이 있는 교인의 경우 새 계정이 생성되지 않습니다
2. **이메일 필수**: Member 테이블에 이메일이 없는 교인은 계정 생성이 되지 않을 수 있습니다
3. **권한 범위**: 할당된 직책에 따라 접근 가능한 메뉴와 기능이 제한됩니다
4. **데이터 일관성**: 조직 구성원 추가와 계정 생성은 트랜잭션으로 처리됩니다

### 🔧 문제 해결

#### **교인을 찾을 수 없는 경우**
- Member 테이블에 해당 교인이 등록되어 있는지 확인
- 교인 등록 페이지에서 먼저 교인 정보 등록 필요

#### **계정 생성이 안 되는 경우**
1. 해당 직책이 계정 생성 대상인지 확인 (위 표 참조)
2. Member 테이블의 이메일 정보 확인
3. 이미 동일한 이메일로 계정이 있는지 확인

#### **로그인이 안 되는 경우**
1. 이메일 주소 정확성 확인
2. 임시 비밀번호 정확성 확인
3. 관리자에게 계정 생성 상태 문의

#### **비밀번호 변경이 안 되는 경우**
- 새 비밀번호 정책 준수 확인 (8자 이상)
- 브라우저 캐시 삭제 후 재시도

---

## 📞 지원 및 문의

### 기술 지원
- **시스템 관리자**: admin@gc.kr
- **전화 문의**: 교회 사무실

### 추가 도움말
- 지출결의서 사용법: \`/docs/UserGuides/expense-report-guide.md\`
- 결재 승인 프로세스: \`/docs/UserGuides/approval-process-guide.md\`
- 시스템 사용법: \`/docs/UserGuides/dashboard-guide.md\`

---

## 📚 부록: 시스템 역할별 권한 상세

### COMMITTEE_CHAIR (위원장급)
- ✅ 지출결의서 최종 승인
- ✅ 모든 부서 지출내역 조회
- ✅ 예산 관리 및 수정
- ✅ 통계 및 리포트 조회
- ✅ 조직 관리 권한

### DEPARTMENT_HEAD (부장급)
- ✅ 소속 부서 지출결의서 승인
- ✅ 소속 부서 예산 관리
- ✅ 소속 부서 통계 조회
- ✅ 팀원 관리 권한

### DEPARTMENT_ACCOUNTANT (회계)
- ✅ 지출결의서 작성 및 1차 승인
- ✅ 소속 부서 재정 관리
- ✅ 예산 집행 현황 모니터링
- ✅ 회계 장부 관리

### GENERAL_USER (일반 사용자)
- ✅ 개인 정보 조회/수정
- ✅ 공지사항 확인
- ❌ 지출결의서 승인 권한 없음
- ❌ 관리자 메뉴 접근 불가

---

*이 가이드는 버전 1.0 기준으로 작성되었습니다. 시스템 업데이트에 따라 내용이 변경될 수 있습니다.*`

// 직책 그룹 정의
const ROLE_GROUPS = [
  {
    id: 'ministry',
    name: '목회자/교역자',
    icon: Crown,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    roles: [
      { name: '교구목사', level: 95, isLeadership: true },
      { name: '교역자', level: 90, isLeadership: true },
    ]
  },
  {
    id: 'high_leadership',
    name: '리더십',
    icon: Shield,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    roles: [
      { name: '회장', level: 95, isLeadership: true },
      { name: '위원장', level: 90, isLeadership: true },
      { name: '부위원장', level: 85, isLeadership: true },
      { name: '교구장', level: 80, isLeadership: true },
      { name: '부교구장', level: 75, isLeadership: true },
      { name: '대장', level: 70, isLeadership: true },
      { name: '단장', level: 70, isLeadership: true },
    ]
  },
  {
    id: 'middle_leadership',
    name: '중간리더십',
    icon: Building2,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    roles: [
      { name: '구역장', level: 65, isLeadership: true },
      { name: '부구역장', level: 60, isLeadership: true },
      { name: '임원', level: 60, isLeadership: true },
      { name: '엘더', level: 65, isLeadership: true },
      { name: '리더', level: 55, isLeadership: true },
    ]
  },
  {
    id: 'department_staff',
    name: '부서 실무진',
    icon: Users,
    color: 'text-teal-600',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-200',
    roles: [
      { name: '부장', level: 70, isLeadership: true },
      { name: '차장', level: 65, isLeadership: true },
      { name: '부감', level: 50, isLeadership: false },
      { name: '교사', level: 50, isLeadership: false },
      { name: '운영위원', level: 45, isLeadership: false },
    ]
  },
  {
    id: 'administration',
    name: '행정 직책',
    icon: Calculator,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    roles: [
      { name: '총무', level: 65, isLeadership: true },
      { name: '부총무', level: 60, isLeadership: false },
      { name: '서기', level: 55, isLeadership: false },
      { name: '부서기', level: 50, isLeadership: false },
      { name: '회계', level: 65, isLeadership: true },
      { name: '부회계', level: 60, isLeadership: false },
    ]
  },
  {
    id: 'representatives',
    name: '각부 대표직',
    icon: Star,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    roles: [
      { name: '남선교회대표', level: 75, isLeadership: true },
      { name: '여전도회대표', level: 75, isLeadership: true },
      { name: '안수집사대표', level: 75, isLeadership: true },
      { name: '권사회대표', level: 75, isLeadership: true },
      { name: '교구권사', level: 70, isLeadership: true },
    ]
  },
  {
    id: 'music_ministry',
    name: '음악 사역',
    icon: Music,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-200',
    roles: [
      { name: '지휘자', level: 60, isLeadership: true },
      { name: '반주자', level: 50, isLeadership: false },
      { name: '솔리스트', level: 45, isLeadership: false },
      { name: '소프라노', level: 30, isLeadership: false },
      { name: '알토', level: 30, isLeadership: false },
      { name: '테너', level: 30, isLeadership: false },
      { name: '베이스', level: 30, isLeadership: false },
    ]
  },
]

export default function OrganizationMembershipsPage() {
  const router = useRouter()
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  // 조직 목록 조회
  const { data: organizations, isLoading: orgsLoading } = trpc.organizations.getHierarchy.useQuery({
    includeInactive: false,
    includeStats: true
  })

  // 직책 목록 조회
  const { data: roles, isLoading: rolesLoading } = trpc.organizationRoles.getAll.useQuery({
    includeStats: true
  })

  const handleRoleGroupSetup = async (groupId: string) => {
    const group = ROLE_GROUPS.find(g => g.id === groupId)
    if (!group) return

    try {
      // 각 그룹의 직책들을 데이터베이스에 생성
      for (const roleData of group.roles) {
        // 이미 존재하는 직책인지 확인
        const existingRole = roles?.find(r => r.name === roleData.name)
        if (!existingRole) {
          // 새 직책 생성 API 호출 로직 추가
          console.log('Creating role:', roleData)
        }
      }
    } catch (error) {
      console.error('Error setting up role group:', error)
    }
  }

  const getTotalMembersCount = () => {
    if (!organizations) return 0
    
    const countMembers = (orgs: any[]): number => {
      return orgs.reduce((total, org) => {
        const orgCount = org._count?.organizationMemberships || 0
        const childrenCount = org.children ? countMembers(org.children) : 0
        return total + orgCount + childrenCount
      }, 0)
    }
    
    return countMembers(organizations)
  }

  const getOrganizationsWithMembers = () => {
    if (!organizations) return []
    
    const flatten = (orgs: any[]): any[] => {
      return orgs.reduce((acc, org) => {
        if (org._count?.organizationMemberships > 0) {
          acc.push(org)
        }
        if (org.children) {
          acc.push(...flatten(org.children))
        }
        return acc
      }, [])
    }
    
    return flatten(organizations)
  }

  if (orgsLoading || rolesLoading) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            돌아가기
          </Button>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <UserCheck className="h-8 w-8 animate-pulse text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">데이터를 불러오는 중...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div className="container mx-auto p-6 max-w-7xl">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            돌아가기
          </Button>
          <div>
            <h1 className="text-3xl font-bold">조직별 직책 구성원</h1>
            <p className="text-muted-foreground">
              조직에 직책을 가진 구성원을 추가하고 관리할 수 있습니다
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            구성원 추가
          </Button>
          
          <HelpModal
            title="조직 구성원 관리 가이드"
            markdownContent={ORGANIZATION_MEMBER_GUIDE}
            size="xl"
          />
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">개요</TabsTrigger>
          <TabsTrigger value="roles">직책 관리</TabsTrigger>
          <TabsTrigger value="memberships">구성원 관리</TabsTrigger>
        </TabsList>

        {/* 개요 탭 */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 통계 카드 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">전체 통계</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">총 조직 수</span>
                  <Badge variant="secondary">
                    {organizations?.length || 0}개
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">총 구성원 수</span>
                  <Badge variant="secondary">
                    {getTotalMembersCount()}명
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">등록된 직책 수</span>
                  <Badge variant="secondary">
                    {roles?.length || 0}개
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">리더십 직책</span>
                  <Badge variant="secondary">
                    {roles?.filter(r => r.isLeadership).length || 0}개
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* 빠른 작업 카드 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">빠른 작업</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-start" onClick={() => setShowForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  구성원 추가
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Building2 className="h-4 w-4 mr-2" />
                  조직도 보기
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Users className="h-4 w-4 mr-2" />
                  구성원 목록
                </Button>
              </CardContent>
            </Card>

            {/* 최근 활동 카드 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">구성원 현황</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {getOrganizationsWithMembers().slice(0, 5).map((org) => (
                    <div key={org.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium truncate">{org.name}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {org._count?.organizationMemberships}명
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 직책 그룹 카드 */}
          <Card>
            <CardHeader>
              <CardTitle>지원되는 직책 그룹</CardTitle>
              <CardDescription>
                교회 조직에서 사용할 수 있는 직책들을 그룹별로 확인하고 설정할 수 있습니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {ROLE_GROUPS.map((group) => {
                  const Icon = group.icon
                  
                  return (
                    <div
                      key={group.id}
                      className={`p-4 rounded-lg border ${group.bgColor} ${group.borderColor} cursor-pointer hover:shadow-md transition-all duration-200`}
                      onClick={() => setSelectedGroup(selectedGroup === group.id ? null : group.id)}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <Icon className={`h-5 w-5 ${group.color}`} />
                        <h3 className="font-semibold">{group.name}</h3>
                        <Badge variant="secondary" className="text-xs ml-auto">
                          {group.roles.length}개
                        </Badge>
                      </div>
                      
                      {selectedGroup === group.id && (
                        <div className="space-y-2 pt-2 border-t border-gray-200">
                          {group.roles.map((role, idx) => (
                            <div key={idx} className="flex items-center justify-between">
                              <span className="text-sm">{role.name}</span>
                              <div className="flex items-center gap-2">
                                {role.isLeadership && (
                                  <Crown className="h-3 w-3 text-amber-500" />
                                )}
                                <Badge variant="outline" className="text-xs">
                                  Lv.{role.level}
                                </Badge>
                              </div>
                            </div>
                          ))}
                          
                          <Button 
                            size="sm" 
                            className="w-full mt-3"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRoleGroupSetup(group.id)
                            }}
                          >
                            이 그룹 직책들 등록
                          </Button>
                        </div>
                      )}
                      
                      {selectedGroup !== group.id && (
                        <div className="text-xs text-muted-foreground">
                          클릭하여 직책 목록 보기
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 직책 관리 탭 */}
        <TabsContent value="roles" className="space-y-6">
          <RoleManagementTab 
            organizations={organizations || []}
            roles={roles || []}
          />
        </TabsContent>

        {/* 구성원 관리 탭 */}
        <TabsContent value="memberships" className="space-y-6">
          <MembershipErrorBoundary>
            <OptimizedOrganizationMembershipList />
          </MembershipErrorBoundary>
        </TabsContent>
      </Tabs>

      {/* 구성원 추가 폼 모달 */}
      {showForm && (
        <OrganizationMembershipForm
          open={showForm}
          onClose={() => setShowForm(false)}
          organizations={organizations || []}
          roles={roles || []}
          filterByRoleAssignments={true}
        />
      )}
      </div>
    </ErrorBoundary>
  )
}