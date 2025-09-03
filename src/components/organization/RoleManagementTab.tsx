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
  RotateCcw
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
  const unassignMutation = trpc.organizationRoleAssignments.unassign.useMutation()

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
      const orgAssignments = roleAssignments.get(selectedOrgId) || []
      const changedAssignments = orgAssignments.filter(a => a.hasChanges)
      
      // 할당할 직책들과 해제할 직책들 분리
      const toAssign = changedAssignments.filter(a => a.isAssigned).map(a => a.roleId)
      const toUnassign = changedAssignments.filter(a => !a.isAssigned)
      
      // 직책 할당 (자동 상속 포함)
      if (toAssign.length > 0) {
        await bulkAssignMutation.mutateAsync({
          organizationId: selectedOrgId,
          roleIds: toAssign,
          replaceExisting: false,
          autoInheritToChildren: true // 하위 조직에 자동 상속
        })
      }
      
      // 직책 해제
      for (const assignment of toUnassign) {
        await unassignMutation.mutateAsync({
          organizationId: selectedOrgId,
          roleId: assignment.roleId,
          removeInherited: true // 하위 조직의 상속도 제거
        })
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

  const selectedOrg = organizations.find(org => org.id === selectedOrgId)
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
                  상위 조직의 직책은 자동으로 상속되며, 새로 선택한 직책은 하위 조직에 상속됩니다.
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

                  {/* 직접 선택 가능한 직책들 */}
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-600" />
                      직접 할당 직책
                    </h4>
                    <div className="space-y-2">
                      {roles.map((role) => {
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
                </div>
                
                {roles.length === 0 && (
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