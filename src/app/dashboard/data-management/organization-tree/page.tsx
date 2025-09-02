'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  ArrowLeft, 
  Building2, 
  Users, 
  ChevronDown, 
  ChevronRight,
  Info,
  Wallet,
  FileText,
  BarChart3,
  Activity
} from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { OrganizationLevel } from '@prisma/client'

interface OrganizationWithChildren {
  id: string
  code: string
  name: string
  englishName?: string | null
  level: OrganizationLevel
  description?: string | null
  parentId?: string | null
  sortOrder: number
  isActive: boolean
  createdAt: string | Date
  updatedAt: string | Date
  churchId: string
  createdById: string | null
  updatedById?: string | null
  children: OrganizationWithChildren[]
  parent?: any
  createdBy?: { id: string; name: string; email: string } | null
  updatedBy?: { id: string; name: string; email: string } | null
  _count?: {
    budgets: number
    budgetItems: number
    expenseReports: number
    responsibleUsers: number
    organizationMemberships: number
    children: number
  }
}

export default function OrganizationTreePage() {
  const router = useRouter()
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [selectedOrg, setSelectedOrg] = useState<OrganizationWithChildren | null>(null)

  // 조직 트리 구조 조회
  const { data: organizations, isLoading, error } = trpc.organizations.getHierarchy.useQuery({
    includeInactive: false,
    includeStats: true
  })

  const toggleNode = (organizationId: string) => {
    const newExpanded = new Set(expandedNodes)
    if (newExpanded.has(organizationId)) {
      newExpanded.delete(organizationId)
    } else {
      newExpanded.add(organizationId)
    }
    setExpandedNodes(newExpanded)
  }

  const getLevelLabel = (level: OrganizationLevel) => {
    switch (level) {
      case 'LEVEL_1': return '본부/교구'
      case 'LEVEL_2': return '부서/팀'
      case 'LEVEL_3': return '소그룹/모임'
      case 'LEVEL_4': return '세부조직'
      default: return '조직'
    }
  }

  const getLevelColor = (level: OrganizationLevel) => {
    switch (level) {
      case 'LEVEL_1': return 'text-blue-700 bg-blue-100 border-blue-200'
      case 'LEVEL_2': return 'text-green-700 bg-green-100 border-green-200'
      case 'LEVEL_3': return 'text-orange-700 bg-orange-100 border-orange-200'
      case 'LEVEL_4': return 'text-purple-700 bg-purple-100 border-purple-200'
      default: return 'text-gray-700 bg-gray-100 border-gray-200'
    }
  }

  const renderOrganizationNode = (org: OrganizationWithChildren, level: number = 0) => {
    const hasChildren = org.children && org.children.length > 0
    const isExpanded = expandedNodes.has(org.id)
    
    // Use inline styles for dynamic indentation to ensure proper rendering
    const indentStyle = { marginLeft: `${level * 24}px` }
    
    // Use predefined Tailwind classes for consistent indentation
    const getIndentClass = (level: number) => {
      switch (level) {
        case 0: return ''
        case 1: return 'ml-6'
        case 2: return 'ml-12'
        case 3: return 'ml-18'
        case 4: return 'ml-24'
        default: return 'ml-24'
      }
    }

    // Add visual styling based on hierarchy level
    const getLevelStyling = (level: number) => {
      switch (level) {
        case 0: return 'border-l-4 border-l-blue-500'
        case 1: return 'border-l-4 border-l-green-400'
        case 2: return 'border-l-4 border-l-orange-400'
        case 3: return 'border-l-4 border-l-purple-400'
        default: return 'border-l-4 border-l-gray-400'
      }
    }

    return (
      <div key={org.id} className="space-y-1">
        <div 
          className={`flex items-center gap-2 p-3 rounded-lg border transition-all duration-200 cursor-pointer hover:shadow-md ${
            selectedOrg?.id === org.id 
              ? 'bg-blue-50 border-blue-200 shadow-sm' 
              : 'bg-white border-gray-200 hover:border-gray-300'
          } ${getIndentClass(level)} ${getLevelStyling(level)}`}
          style={level > 4 ? indentStyle : undefined}
          onClick={() => setSelectedOrg(org)}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleNode(org.id)
              }}
              className="p-1 rounded hover:bg-gray-100"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-500" />
              )}
            </button>
          )}
          
          {!hasChildren && <div className="w-6" />}
          
          <Building2 className="h-5 w-5 text-indigo-600 flex-shrink-0" />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900 truncate">{org.name}</h3>
              <Badge variant="outline" className={`text-xs ${getLevelColor(org.level)}`}>
                {getLevelLabel(org.level)}
              </Badge>
              {org.code && (
                <Badge variant="secondary" className="text-xs">
                  {org.code}
                </Badge>
              )}
            </div>
            {org.description && (
              <p className="text-sm text-gray-600 truncate">{org.description}</p>
            )}
          </div>

          {org._count && (
            <div className="flex items-center gap-4 text-xs text-gray-500 flex-shrink-0">
              {org._count.children > 0 && (
                <div className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  <span>{org._count.children}</span>
                </div>
              )}
              {org._count.organizationMemberships > 0 && (
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  <span>{org._count.organizationMemberships}</span>
                </div>
              )}
              {org._count.budgets > 0 && (
                <div className="flex items-center gap-1">
                  <Wallet className="h-3 w-3" />
                  <span>{org._count.budgets}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {hasChildren && isExpanded && (
          <div className="space-y-1">
            {org.children.map(child => renderOrganizationNode(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  if (isLoading) {
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
            <Activity className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">조직도를 불러오는 중...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            돌아가기
          </Button>
        </div>
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            조직도를 불러오는 중 오류가 발생했습니다: {error.message}
          </AlertDescription>
        </Alert>
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
            <h1 className="text-3xl font-bold">교회 조직도</h1>
            <p className="text-muted-foreground">
              현재 교회의 조직 구조를 트리 형태로 확인할 수 있습니다
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const allOrgIds = new Set<string>()
              const collectIds = (orgs: OrganizationWithChildren[]) => {
                orgs.forEach(org => {
                  if (org.children && org.children.length > 0) {
                    allOrgIds.add(org.id)
                    collectIds(org.children)
                  }
                })
              }
              collectIds(organizations || [])
              setExpandedNodes(allOrgIds)
            }}
          >
            모두 펼치기
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExpandedNodes(new Set())}
          >
            모두 접기
          </Button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* 조직 트리 - 스크롤 가능한 메인 영역 */}
        <div className="flex-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                조직 트리구조
              </CardTitle>
              <CardDescription>
                조직을 클릭하면 상세 정보를 확인할 수 있습니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!organizations || organizations.length === 0 ? (
                <div className="text-center py-12">
                  <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-500 mb-2">
                    등록된 조직이 없습니다
                  </h3>
                  <p className="text-gray-400">
                    조직 관리 페이지에서 조직을 추가해보세요
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {organizations.map(org => renderOrganizationNode(org))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 조직 상세 정보 - 고정 사이드바 */}
        <div className="w-80 flex-shrink-0">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>조직 상세 정보</CardTitle>
              <CardDescription>
                선택된 조직의 자세한 정보를 확인할 수 있습니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedOrg ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      {selectedOrg.name}
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`${getLevelColor(selectedOrg.level)}`}>
                          {getLevelLabel(selectedOrg.level)}
                        </Badge>
                        {selectedOrg.code && (
                          <Badge variant="secondary">{selectedOrg.code}</Badge>
                        )}
                        <Badge variant={selectedOrg.isActive ? "default" : "secondary"}>
                          {selectedOrg.isActive ? '활성' : '비활성'}
                        </Badge>
                      </div>
                      {selectedOrg.description && (
                        <p className="text-sm text-gray-600">{selectedOrg.description}</p>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* 통계 정보 */}
                  {selectedOrg._count && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm">관련 정보</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <Building2 className="h-4 w-4 text-blue-600" />
                            <span className="text-xs font-medium text-blue-700">하위조직</span>
                          </div>
                          <p className="text-lg font-semibold text-blue-900">
                            {selectedOrg._count.children}개
                          </p>
                        </div>
                        
                        <div className="bg-green-50 p-3 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <Users className="h-4 w-4 text-green-600" />
                            <span className="text-xs font-medium text-green-700">구성원</span>
                          </div>
                          <p className="text-lg font-semibold text-green-900">
                            {selectedOrg._count.organizationMemberships}명
                          </p>
                        </div>
                        
                        <div className="bg-amber-50 p-3 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <Wallet className="h-4 w-4 text-amber-600" />
                            <span className="text-xs font-medium text-amber-700">예산</span>
                          </div>
                          <p className="text-lg font-semibold text-amber-900">
                            {selectedOrg._count.budgets}개
                          </p>
                        </div>
                        
                        <div className="bg-purple-50 p-3 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <FileText className="h-4 w-4 text-purple-600" />
                            <span className="text-xs font-medium text-purple-700">지출서</span>
                          </div>
                          <p className="text-lg font-semibold text-purple-900">
                            {selectedOrg._count.expenseReports}건
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* 기본 정보 */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm">기본 정보</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">정렬 순서:</span>
                        <span className="font-medium">{selectedOrg.sortOrder}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">생성일:</span>
                        <span className="font-medium">
                          {new Date(selectedOrg.createdAt).toLocaleDateString('ko-KR')}
                        </span>
                      </div>
                      {selectedOrg.updatedAt && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">수정일:</span>
                          <span className="font-medium">
                            {new Date(selectedOrg.updatedAt).toLocaleDateString('ko-KR')}
                          </span>
                        </div>
                      )}
                      {selectedOrg.createdBy && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">생성자:</span>
                          <span className="font-medium">{selectedOrg.createdBy.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-2">조직 정보 확인</p>
                  <p className="text-sm text-gray-400">
                    왼쪽 트리에서 조직을 선택하세요
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}