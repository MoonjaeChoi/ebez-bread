'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Building2, 
  Plus, 
  Minus,
  ArrowDown,
  ArrowRight,
  Crown,
  Shield,
  Users,
  CheckCircle,
  AlertTriangle,
  Info,
  Save,
  RotateCcw,
  Star,
  Music,
  Mic,
  Calculator
} from 'lucide-react'
import { trpc } from '@/lib/trpc/client'

interface Organization {
  id: string
  name: string
  code: string
  level: string
  parentId: string | null
  children?: Organization[]
  roleAssignments?: any[]
}

interface OrganizationRole {
  id: string
  name: string
  englishName?: string | null
  level: number
  isLeadership: boolean
  description?: string | null
}

interface RoleManagementTabProps {
  organizations: Organization[]
  roles: OrganizationRole[]
}

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

interface RoleAssignmentState {
  organizationId: string
  roleId: string
  isAssigned: boolean
  isInherited: boolean
  inheritedFrom?: string
  hasChanges: boolean
}

interface OrganizationTreeNodeProps {
  organization: Organization
  level: number
  roles: OrganizationRole[]
  roleAssignments: Map<string, RoleAssignmentState[]>
  onRoleToggle: (orgId: string, roleId: string, assigned: boolean) => void
  selectedOrgId: string | null
  onOrgSelect: (orgId: string) => void
  expandedOrgs: Set<string>
  onToggleExpand: (orgId: string) => void
}

function OrganizationTreeNode({
  organization,
  level,
  roles,
  roleAssignments,
  onRoleToggle,
  selectedOrgId,
  onOrgSelect,
  expandedOrgs,
  onToggleExpand
}: OrganizationTreeNodeProps) {
  const hasChildren = organization.children && organization.children.length > 0
  const isExpanded = expandedOrgs.has(organization.id)
  const isSelected = selectedOrgId === organization.id
  
  const orgAssignments = roleAssignments.get(organization.id) || []
  const directRoles = orgAssignments.filter(a => a.isAssigned && !a.isInherited)
  const inheritedRoles = orgAssignments.filter(a => a.isAssigned && a.isInherited)
  
  return (
    <div className="space-y-1">
      {/* 조직 노드 */}
      <div
        className={`flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-gray-50 transition-colors ${
          isSelected ? 'bg-blue-50 border border-blue-200' : ''
        }`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => onOrgSelect(organization.id)}
      >
        {/* 확장/축소 버튼 */}
        {hasChildren ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={(e) => {
              e.stopPropagation()
              onToggleExpand(organization.id)
            }}
          >
            {isExpanded ? (
              <ArrowDown className="h-3 w-3" />
            ) : (
              <ArrowRight className="h-3 w-3" />
            )}
          </Button>
        ) : (
          <div className="w-6" />
        )}
        
        {/* 조직 정보 */}
        <Building2 className="h-4 w-4 text-gray-500 flex-shrink-0" />
        <span className="font-medium flex-1">{organization.name}</span>
        
        {/* 직책 통계 */}
        <div className="flex items-center gap-1">
          {directRoles.length > 0 && (
            <Badge variant="default" className="text-xs h-5">
              {directRoles.length}개 직책
            </Badge>
          )}
          {inheritedRoles.length > 0 && (
            <Badge variant="outline" className="text-xs h-5">
              +{inheritedRoles.length}개 상속
            </Badge>
          )}
        </div>
      </div>
      
      {/* 하위 조직들 */}
      {isExpanded && hasChildren && (
        <div className="space-y-1">
          {organization.children?.map((child) => (
            <OrganizationTreeNode
              key={child.id}
              organization={child}
              level={level + 1}
              roles={roles}
              roleAssignments={roleAssignments}
              onRoleToggle={onRoleToggle}
              selectedOrgId={selectedOrgId}
              onOrgSelect={onOrgSelect}
              expandedOrgs={expandedOrgs}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function RoleManagementTab({ organizations, roles }: RoleManagementTabProps) {
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null)
  const [expandedOrgs, setExpandedOrgs] = useState<Set<string>>(new Set())
  const [roleAssignments, setRoleAssignments] = useState<Map<string, RoleAssignmentState[]>>(new Map())
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  // 조직별 직책 할당 데이터 로드
  const { data: assignmentData, refetch: refetchAssignments } = trpc.organizationRoleAssignments.getByOrganization.useQuery(
    {
      organizationId: selectedOrgId || '',
      includeInherited: true,
      includeInactive: false
    },
    {
      enabled: !!selectedOrgId,
    }
  )

  // 직책 할당/해제 뮤테이션
  const bulkAssignMutation = trpc.organizationRoleAssignments.bulkAssign.useMutation()
  const createRoleMutation = trpc.organizationRoles.create.useMutation()

  // 선택된 조직이 변경될 때마다 역할 할당 상태 초기화
  useEffect(() => {
    if (selectedOrgId && assignmentData) {
      const assignments = new Map<string, RoleAssignmentState[]>()
      
      // 현재 조직의 할당 상태 설정
      const orgAssignments = roles.map(role => {
        const existing = assignmentData.find((a: any) => a.roleId === role.id)
        return {
          organizationId: selectedOrgId,
          roleId: role.id,
          isAssigned: !!existing?.isActive,
          isInherited: !!existing?.isInherited,
          inheritedFrom: existing?.inheritedFrom || undefined,
          hasChanges: false
        }
      })
      
      assignments.set(selectedOrgId, orgAssignments)
      setRoleAssignments(assignments)
      setHasUnsavedChanges(false)
    }
  }, [selectedOrgId, assignmentData, roles])

  const handleOrgSelect = (orgId: string) => {
    if (hasUnsavedChanges) {
      if (!confirm('저장되지 않은 변경사항이 있습니다. 다른 조직을 선택하시겠습니까?')) {
        return
      }
    }
    setSelectedOrgId(orgId)
  }

  const handleToggleExpand = (orgId: string) => {
    const newExpanded = new Set(expandedOrgs)
    if (newExpanded.has(orgId)) {
      newExpanded.delete(orgId)
    } else {
      newExpanded.add(orgId)
    }
    setExpandedOrgs(newExpanded)
  }

  const handleRoleToggle = (orgId: string, roleId: string, assigned: boolean) => {
    const newAssignments = new Map(roleAssignments)
    const orgAssignments = newAssignments.get(orgId) || []
    
    const updatedAssignments = orgAssignments.map(assignment => {
      if (assignment.roleId === roleId) {
        return {
          ...assignment,
          isAssigned: assigned,
          isInherited: false, // 직접 할당/해제이므로 상속이 아님
          inheritedFrom: undefined,
          hasChanges: true
        }
      }
      return assignment
    })
    
    newAssignments.set(orgId, updatedAssignments)
    setRoleAssignments(newAssignments)
    setHasUnsavedChanges(true)
  }

  const handleSaveChanges = async () => {
    if (!selectedOrgId) return

    setIsLoading(true)
    try {
      
      // 현재 선택된 조직의 모든 직책 할당 상태를 가져옴
      const orgAssignmentStates = roleAssignments.get(selectedOrgId) || []
      
      // 현재 할당되어야 할 모든 직책들 (변경사항 + 기존 할당)
      const currentlyAssignedRoles = orgAssignmentStates
        .filter(a => a.isAssigned && !a.isInherited) // 직접 할당된 것만
        .map(a => a.roleId)
      
      // 1. 현재 조직에 직책 할당
      if (currentlyAssignedRoles.length > 0) {
        await bulkAssignMutation.mutateAsync({
          organizationId: selectedOrgId,
          roleIds: currentlyAssignedRoles,
          replaceExisting: true, // 기존 직접 할당을 모두 제거하고 새로 할당
          autoInheritToChildren: false // 수동으로 하위 조직에 상속 처리
        })
      } else {
        // 모든 직책을 해제하는 경우
        await bulkAssignMutation.mutateAsync({
          organizationId: selectedOrgId,
          roleIds: [], // 빈 배열로 모든 직책 해제
          replaceExisting: true,
          autoInheritToChildren: false
        })
      }
      
      // 2. 하위 조직에 직책 상속 (이미 직책이 있는 조직은 제외)
      if (currentlyAssignedRoles.length > 0) {
        console.log('🔄 하위 조직에 직책 상속 시작...')
        const inheritedCount = await inheritRolesToChildren(selectedOrgId, currentlyAssignedRoles)
        if (inheritedCount > 0) {
          console.log(`✅ ${inheritedCount}개 하위 조직에 직책 상속 완료`)
        }
      }
      
      // 데이터 새로고침
      await refetchAssignments()
      setHasUnsavedChanges(false)
    } catch (error) {
      console.error('직책 할당 저장 중 오류:', error)
      alert('직책 할당 저장 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  // 하위 조직에 직책을 상속하는 함수
  const inheritRolesToChildren = async (parentOrgId: string, roleIds: string[]): Promise<number> => {
    const parentOrg = allOrganizations.find(org => org.id === parentOrgId)
    if (!parentOrg?.children || parentOrg.children.length === 0) {
      return 0
    }

    let inheritedCount = 0

    // 하위 조직들을 재귀적으로 처리
    const processChildren = async (children: Organization[]): Promise<number> => {
      let count = 0
      
      for (const child of children) {
        try {
          // 모든 역할을 상속 (서버에서 기존 직책과 중복 처리)
          await bulkAssignMutation.mutateAsync({
            organizationId: child.id,
            roleIds: roleIds,
            replaceExisting: false, // 기존 직책 유지하면서 새로운 직책 추가
            autoInheritToChildren: false // 재귀 호출로 직접 처리
          })

          console.log(`✅ 직책 상속: ${child.name}에 ${roleIds.length}개 직책 상속`)
          count++

          // 하위 조직의 하위 조직들도 재귀적으로 처리
          if (child.children && child.children.length > 0) {
            count += await processChildren(child.children)
          }
        } catch (error) {
          console.error(`하위 조직 ${child.name}에 직책 상속 중 오류:`, error)
          // 개별 조직 오류는 전체 프로세스를 중단하지 않음
        }
      }
      
      return count
    }

    inheritedCount = await processChildren(parentOrg.children)
    return inheritedCount
  }

  const handleResetChanges = () => {
    if (selectedOrgId && assignmentData) {
      const assignments = new Map<string, RoleAssignmentState[]>()
      const orgAssignments = roles.map(role => {
        const existing = assignmentData.find((a: any) => a.roleId === role.id)
        return {
          organizationId: selectedOrgId,
          roleId: role.id,
          isAssigned: !!existing?.isActive,
          isInherited: !!existing?.isInherited,
          inheritedFrom: existing?.inheritedFrom || undefined,
          hasChanges: false
        }
      })
      
      assignments.set(selectedOrgId, orgAssignments)
      setRoleAssignments(assignments)
      setHasUnsavedChanges(false)
    }
  }

  const handleToggleGroup = (groupId: string) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId)
    } else {
      newExpanded.add(groupId)
    }
    setExpandedGroups(newExpanded)
  }

  const handleGroupRoleToggle = async (groupRoleName: string, assigned: boolean) => {
    if (!selectedOrgId) return
    
    // 데이터베이스에서 해당 이름의 역할 찾기
    const existingRole = roles.find(r => r.name === groupRoleName)
    if (existingRole) {
      handleRoleToggle(selectedOrgId, existingRole.id, assigned)
    } else if (assigned) {
      // 새로운 직책을 데이터베이스에 생성
      try {
        setIsLoading(true)
        const groupRoleTemplate = ROLE_GROUPS
          .flatMap(group => group.roles)
          .find(role => role.name === groupRoleName)
        
        if (groupRoleTemplate) {
          const newRole = await createRoleMutation.mutateAsync({
            name: groupRoleTemplate.name,
            level: groupRoleTemplate.level,
            isLeadership: groupRoleTemplate.isLeadership,
            description: `${groupRoleTemplate.name} 직책`
          })
          
          // 새 직책을 생성한 후 바로 할당
          await bulkAssignMutation.mutateAsync({
            organizationId: selectedOrgId,
            roleIds: [newRole.id],
            replaceExisting: false,
            autoInheritToChildren: false
          })
          
          // 데이터 새로고침
          await refetchAssignments()
          window.location.reload() // roles 데이터도 새로고침하기 위해
        }
      } catch (error) {
        console.error('새 직책 생성 중 오류:', error)
        alert('새 직책 생성 중 오류가 발생했습니다.')
      } finally {
        setIsLoading(false)
      }
    }
  }

  // 그룹별 직책 상태 확인 함수
  const getGroupRoleState = (groupRoleName: string) => {
    const existingRole = roles.find(r => r.name === groupRoleName)
    if (!existingRole || !selectedOrgId) {
      return { isAssigned: false, isInherited: false, exists: false }
    }

    const orgAssignments = roleAssignments.get(selectedOrgId) || []
    const assignment = orgAssignments.find(a => a.roleId === existingRole.id)
    
    return {
      isAssigned: assignment?.isAssigned || false,
      isInherited: assignment?.isInherited || false,
      exists: true
    }
  }

  // 조직 트리를 평면화하는 함수
  const flattenOrganizations = (orgs: Organization[]): Organization[] => {
    const result: Organization[] = []
    
    const flatten = (orgList: Organization[]) => {
      for (const org of orgList) {
        result.push(org)
        if (org.children && org.children.length > 0) {
          flatten(org.children)
        }
      }
    }
    
    flatten(orgs)
    return result
  }

  const allOrganizations = flattenOrganizations(organizations)
  const selectedOrg = allOrganizations.find(org => org.id === selectedOrgId)
  const selectedOrgAssignments = selectedOrgId ? roleAssignments.get(selectedOrgId) || [] : []
  const directAssignments = selectedOrgAssignments.filter((a: RoleAssignmentState) => a.isAssigned && !a.isInherited)
  const inheritedAssignments = selectedOrgAssignments.filter((a: RoleAssignmentState) => a.isAssigned && a.isInherited)
  const changedAssignments = selectedOrgAssignments.filter((a: RoleAssignmentState) => a.hasChanges)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 조직 트리 */}
      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            조직도
          </CardTitle>
          <CardDescription>
            직책을 관리할 조직을 선택하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {organizations.map((org) => (
              <OrganizationTreeNode
                key={org.id}
                organization={org}
                level={0}
                roles={roles}
                roleAssignments={roleAssignments}
                onRoleToggle={handleRoleToggle}
                selectedOrgId={selectedOrgId}
                onOrgSelect={handleOrgSelect}
                expandedOrgs={expandedOrgs}
                onToggleExpand={handleToggleExpand}
              />
            ))}
          </div>
          
          {organizations.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>등록된 조직이 없습니다.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 직책 관리 */}
      <div className="space-y-6">
        {selectedOrg ? (
          <>
            {/* 선택된 조직 정보 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  {selectedOrg.name} 직책 관리
                </CardTitle>
                <CardDescription>
                  이 조직에서 사용할 직책을 선택하세요. 
                  상위 조직의 직책은 자동으로 상속되며, <strong>새로 선택한 직책은 하위 조직에 자동으로 상속됩니다.</strong>
                  (단, 하위 조직에 이미 같은 직책이 있으면 변경되지 않습니다.)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 통계 */}
                <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {directAssignments.length}
                    </div>
                    <div className="text-sm text-gray-600">직접 할당</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {inheritedAssignments.length}
                    </div>
                    <div className="text-sm text-gray-600">상속받은 직책</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {directAssignments.length + inheritedAssignments.length}
                    </div>
                    <div className="text-sm text-gray-600">총 사용 가능</div>
                  </div>
                </div>

                {/* 변경사항 알림 */}
                {hasUnsavedChanges && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="flex items-center justify-between">
                      <span>
                        {changedAssignments.length}개의 변경사항이 있습니다.
                      </span>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={handleSaveChanges}
                          disabled={isLoading}
                        >
                          <Save className="h-3 w-3 mr-1" />
                          저장
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleResetChanges}
                          disabled={isLoading}
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          취소
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* 직책 목록 */}
            <Card>
              <CardHeader>
                <CardTitle>직책 선택</CardTitle>
                <CardDescription>
                  이 조직에서 사용할 직책들을 선택하세요
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* 상속된 직책들 */}
                  {inheritedAssignments.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <ArrowDown className="h-4 w-4 text-green-600" />
                        상속받은 직책
                      </h4>
                      <div className="space-y-2">
                        {inheritedAssignments.map((assignment) => {
                          const role = roles.find(r => r.id === assignment.roleId)
                          if (!role) return null
                          
                          return (
                            <div
                              key={assignment.roleId}
                              className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-md"
                            >
                              <div className="flex items-center gap-3">
                                {role.isLeadership ? (
                                  <Crown className="h-4 w-4 text-amber-500" />
                                ) : (
                                  <Shield className="h-4 w-4 text-gray-500" />
                                )}
                                <div>
                                  <span className="font-medium">{role.name}</span>
                                  {role.englishName && (
                                    <span className="text-sm text-gray-500 ml-2">
                                      ({role.englishName})
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  상속됨
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                  Lv.{role.level}
                                </Badge>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      <Separator className="my-4" />
                    </div>
                  )}

                  {/* 직책 그룹별 선택 */}
                  <div>
                    <h4 className="font-medium mb-4 flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-600" />
                      직책 선택 (그룹별)
                    </h4>
                    
                    <div className="space-y-4">
                      {ROLE_GROUPS.map((group) => {
                        const Icon = group.icon
                        const isExpanded = expandedGroups.has(group.id)
                        
                        return (
                          <div key={group.id} className="border rounded-lg">
                            {/* 그룹 헤더 */}
                            <div
                              className={`flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 rounded-t-lg ${
                                isExpanded ? 'border-b' : ''
                              }`}
                              onClick={() => handleToggleGroup(group.id)}
                            >
                              <div className="flex items-center gap-3">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                >
                                  {isExpanded ? (
                                    <ArrowDown className="h-3 w-3" />
                                  ) : (
                                    <ArrowRight className="h-3 w-3" />
                                  )}
                                </Button>
                                <Icon className={`h-5 w-5 ${group.color}`} />
                                <span className="font-medium">{group.name}</span>
                              </div>
                              <Badge variant="secondary" className="text-xs">
                                {group.roles.length}개
                              </Badge>
                            </div>
                            
                            {/* 그룹 내 직책들 */}
                            {isExpanded && (
                              <div className="p-3 space-y-2">
                                {group.roles.map((groupRole, idx) => {
                                  const roleState = getGroupRoleState(groupRole.name)
                                  const existingRole = roles.find(r => r.name === groupRole.name)
                                  
                                  return (
                                    <div
                                      key={`${group.id}-${idx}`}
                                      className={`flex items-center justify-between p-3 border rounded-md transition-colors ${
                                        roleState.isInherited 
                                          ? 'bg-gray-50 border-gray-200 opacity-60' 
                                          : roleState.isAssigned
                                          ? 'bg-blue-50 border-blue-200'
                                          : roleState.exists
                                          ? 'bg-white border-gray-200 hover:bg-gray-50'
                                          : 'bg-green-50 border-green-200 hover:bg-green-100'
                                      }`}
                                    >
                                      <div className="flex items-center gap-3">
                                        <Checkbox
                                          checked={roleState.isAssigned}
                                          disabled={roleState.isInherited}
                                          onCheckedChange={(checked) => 
                                            handleGroupRoleToggle(groupRole.name, !!checked)
                                          }
                                        />
                                        {groupRole.isLeadership ? (
                                          <Crown className="h-4 w-4 text-amber-500" />
                                        ) : (
                                          <Shield className="h-4 w-4 text-gray-500" />
                                        )}
                                        <div>
                                          <div className="flex items-center gap-2">
                                            <span className="font-medium">{groupRole.name}</span>
                                            {!roleState.exists && (
                                              <Badge variant="outline" className="text-xs text-green-600 border-green-300">
                                                새로 생성
                                              </Badge>
                                            )}
                                          </div>
                                          {existingRole?.description && (
                                            <p className="text-xs text-gray-500 mt-1">
                                              {existingRole.description}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {groupRole.isLeadership && (
                                          <Badge variant="default" className="text-xs">
                                            리더십
                                          </Badge>
                                        )}
                                        <Badge variant="secondary" className="text-xs">
                                          Lv.{groupRole.level}
                                        </Badge>
                                        {roleState.isInherited && (
                                          <Badge variant="outline" className="text-xs">
                                            상속됨
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    
                    {/* 등록된 기타 직책들 */}
                    {roles.filter(role => !ROLE_GROUPS.some(group => 
                      group.roles.some(groupRole => groupRole.name === role.name)
                    )).length > 0 && (
                      <div className="mt-6">
                        <h5 className="font-medium mb-2 text-sm text-gray-600">기타 등록된 직책</h5>
                        <div className="space-y-2">
                          {roles
                            .filter(role => !ROLE_GROUPS.some(group => 
                              group.roles.some(groupRole => groupRole.name === role.name)
                            ))
                            .map((role) => {
                              const assignment = selectedOrgAssignments.find(a => a.roleId === role.id)
                              const isAssigned = assignment?.isAssigned && !assignment?.isInherited
                              const isInherited = assignment?.isAssigned && assignment?.isInherited
                              
                              return (
                                <div
                                  key={role.id}
                                  className={`flex items-center justify-between p-3 border rounded-md transition-colors ${
                                    isInherited 
                                      ? 'bg-gray-50 border-gray-200 opacity-60' 
                                      : isAssigned
                                      ? 'bg-blue-50 border-blue-200'
                                      : 'bg-white border-gray-200 hover:bg-gray-50'
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <Checkbox
                                      checked={isAssigned}
                                      disabled={isInherited}
                                      onCheckedChange={(checked) => 
                                        handleRoleToggle(selectedOrgId!, role.id, !!checked)
                                      }
                                    />
                                    {role.isLeadership ? (
                                      <Crown className="h-4 w-4 text-amber-500" />
                                    ) : (
                                      <Shield className="h-4 w-4 text-gray-500" />
                                    )}
                                    <div>
                                      <span className="font-medium">{role.name}</span>
                                      {role.englishName && (
                                        <span className="text-sm text-gray-500 ml-2">
                                          ({role.englishName})
                                        </span>
                                      )}
                                      {role.description && (
                                        <p className="text-xs text-gray-500 mt-1">
                                          {role.description}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {role.isLeadership && (
                                      <Badge variant="default" className="text-xs">
                                        리더십
                                      </Badge>
                                    )}
                                    <Badge variant="secondary" className="text-xs">
                                      Lv.{role.level}
                                    </Badge>
                                  </div>
                                </div>
                              )
                            })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {ROLE_GROUPS.length === 0 && roles.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>등록된 직책이 없습니다.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">조직을 선택하세요</h3>
              <p className="text-gray-500 text-center">
                왼쪽 조직도에서 직책을 관리할 조직을 선택해주세요
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}