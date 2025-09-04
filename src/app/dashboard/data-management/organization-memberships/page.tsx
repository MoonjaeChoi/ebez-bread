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
import { OrganizationMembershipList } from '@/components/data-management/OrganizationMembershipList'
import { RoleManagementTab } from '@/components/organization/RoleManagementTab'

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
        
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          구성원 추가
        </Button>
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
          <OrganizationMembershipList />
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
  )
}