'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { 
  Users, 
  Crown, 
  Building2,
  Search,
  Filter,
  MoreHorizontal,
  Edit2,
  Trash2,
  UserX,
  Phone,
  Mail,
  Calendar,
  Info,
  ChevronLeft,
  ChevronRight,
  X,
  RefreshCw
} from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { OrganizationMemberEditDialog } from './OrganizationMemberEditDialog'

interface Organization {
  id: string
  name: string
  code?: string | null
  level: string
}

interface Role {
  id: string
  name: string
  level: number
  isLeadership: boolean
}

interface Member {
  id: string
  name: string
  phone?: string | null
  email?: string | null
  photoUrl?: string | null
}

interface OrganizationMembership {
  id: string
  isPrimary: boolean
  joinDate: string | Date
  endDate?: string | Date | null
  isActive: boolean
  notes?: string | null
  member: Member
  organization: Organization
  role?: Role | null
}

interface OrganizationMembershipListProps {
  organizationId?: string
  memberId?: string
}

export function OrganizationMembershipList({
  organizationId,
  memberId
}: OrganizationMembershipListProps) {
  // 검색 및 필터 상태
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedOrganization, setSelectedOrganization] = useState(organizationId || '')
  const [selectedRole, setSelectedRole] = useState('__ALL_ROLES__')
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('active')
  const [selectedMembership, setSelectedMembership] = useState<OrganizationMembership | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  
  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  
  // 디바운스된 검색어
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm)
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
      setCurrentPage(1) // 검색 시 첫 페이지로 리셋
    }, 300)
    
    return () => clearTimeout(timer)
  }, [searchTerm])

  // 조직별 멤버십 목록 조회 (페이지네이션 지원)
  const { data: membershipData, isLoading, error, refetch } = trpc.organizationMemberships.getByOrganizationPaginated.useQuery({
    organizationId: selectedOrganization,
    page: currentPage,
    limit: pageSize,
    search: debouncedSearch || undefined,
    roleFilter: selectedRole === '__ALL_ROLES__' ? undefined : selectedRole,
    statusFilter: statusFilter
  }, {
    enabled: !!selectedOrganization,
    keepPreviousData: true
  })

  const memberships = membershipData?.data || []
  const pagination = membershipData?.pagination

  // 조직 목록 조회
  const { data: organizations } = trpc.organizations.getHierarchy.useQuery({
    includeInactive: false
  })

  // 직책 목록 조회
  const { data: roles } = trpc.organizationRoles.getAll.useQuery({
    includeStats: false
  })

  const flattenOrganizations = (orgs: any[], depth = 0): Array<any & { depth: number }> => {
    return orgs.reduce((acc, org) => {
      acc.push({ ...org, depth })
      if (org.children) {
        acc.push(...flattenOrganizations(org.children, depth + 1))
      }
      return acc
    }, [] as Array<any & { depth: number }>)
  }

  const flatOrganizations = organizations ? flattenOrganizations(organizations) : []

  // 필터 및 검색 초기화 함수
  const handleResetFilters = () => {
    setSearchTerm('')
    setSelectedRole('__ALL_ROLES__')
    setStatusFilter('active')
    setCurrentPage(1)
  }

  // 조직 변경 시 필터 초기화
  const handleOrganizationChange = (orgId: string) => {
    setSelectedOrganization(orgId)
    setCurrentPage(1)
  }

  // 페이지 변경
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  // 구성원 편집
  const handleEditMember = (membership: OrganizationMembership) => {
    setSelectedMembership(membership)
    setShowEditDialog(true)
  }

  // 편집 완료 후
  const handleEditSuccess = () => {
    refetch() // 목록 새로고침
  }

  // 편집 모달 닫기
  const handleCloseEditDialog = () => {
    setShowEditDialog(false)
    setSelectedMembership(null)
  }

  const getLevelColor = (orgLevel: string) => {
    switch (orgLevel) {
      case 'LEVEL_1': return 'text-blue-600'
      case 'LEVEL_2': return 'text-green-600'
      case 'LEVEL_3': return 'text-orange-600'
      case 'LEVEL_4': return 'text-purple-600'
      case 'LEVEL_5': return 'text-pink-600'
      default: return 'text-gray-600'
    }
  }

  const getLevelIndent = (depth: number) => {
    return '  '.repeat(depth) + (depth > 0 ? '└ ' : '')
  }

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('ko-KR')
  }

  if (error) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          멤버십 목록을 불러오는 중 오류가 발생했습니다: {error.message}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* 고급 검색 및 필터 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              검색 및 필터
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleResetFilters}>
                <X className="h-4 w-4 mr-1" />
                초기화
              </Button>
              <Button variant="ghost" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-1" />
                새로고침
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 조직 선택 */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">조직 선택</Label>
              <Select value={selectedOrganization} onValueChange={handleOrganizationChange}>
                <SelectTrigger>
                  <SelectValue placeholder="조직을 선택하세요" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {flatOrganizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      <div className="flex items-center gap-2">
                        <span className={getLevelColor(org.level)}>
                          {getLevelIndent(org.depth)}{org.name}
                        </span>
                        {org.code && (
                          <Badge variant="secondary" className="text-xs">
                            {org.code}
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 검색 */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">구성원 검색</Label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="이름, 전화번호, 이메일, 직책..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1 h-7 w-7 p-0"
                    onClick={() => setSearchTerm('')}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>

            {/* 직책 필터 */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">직책 필터</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue placeholder="모든 직책" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="__ALL_ROLES__">모든 직책</SelectItem>
                  {roles?.filter(role => role.isActive).map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      <div className="flex items-center gap-2">
                        {role.isLeadership && (
                          <Crown className="h-3 w-3 text-amber-500" />
                        )}
                        <span>{role.name}</span>
                        <Badge variant="outline" className="text-xs">
                          Lv.{role.level}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 상태 필터 */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">상태 필터</Label>
              <Select value={statusFilter} onValueChange={(value: 'active' | 'inactive' | 'all') => setStatusFilter(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">활성 구성원만</SelectItem>
                  <SelectItem value="inactive">비활성 구성원만</SelectItem>
                  <SelectItem value="all">모든 구성원</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 페이지 크기 설정 */}
          <div className="flex items-center gap-4">
            <Label className="text-sm font-medium">페이지당 항목 수:</Label>
            <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(parseInt(value))}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 활성화된 필터 표시 */}
          {(searchTerm || selectedRole !== '__ALL_ROLES__' || statusFilter !== 'active') && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium">활성 필터:</span>
              {searchTerm && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  검색: {searchTerm}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setSearchTerm('')} />
                </Badge>
              )}
              {selectedRole !== '__ALL_ROLES__' && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  직책: {roles?.find(r => r.id === selectedRole)?.name}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedRole('__ALL_ROLES__')} />
                </Badge>
              )}
              {statusFilter !== 'active' && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  상태: {statusFilter === 'inactive' ? '비활성' : '모든 상태'}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setStatusFilter('active')} />
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 구성원 목록 */}
      {selectedOrganization ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  구성원 목록
                </CardTitle>
                <CardDescription>
                  {pagination ? (
                    <>
                      전체 {pagination.totalCount}명 중 {((pagination.currentPage - 1) * pagination.limit) + 1}-
                      {Math.min(pagination.currentPage * pagination.limit, pagination.totalCount)}명 표시
                    </>
                  ) : (
                    '구성원을 불러오는 중...'
                  )}
                </CardDescription>
              </div>
              
              {/* 페이지네이션 정보 */}
              {pagination && pagination.totalPages > 1 && (
                <div className="text-sm text-muted-foreground">
                  {pagination.currentPage} / {pagination.totalPages} 페이지
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <Users className="h-8 w-8 animate-pulse text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">구성원 목록을 불러오는 중...</p>
              </div>
            ) : memberships.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-500 mb-2">
                  구성원이 없습니다
                </h3>
                <p className="text-gray-400">
                  {debouncedSearch || selectedRole !== '__ALL_ROLES__' || statusFilter !== 'active'
                    ? '검색 조건에 맞는 구성원이 없습니다' 
                    : '아직 등록된 구성원이 없습니다'}
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {memberships.map((membership) => (
                  <div
                    key={membership.id}
                    className={`p-4 border rounded-lg transition-colors ${
                      membership.isActive 
                        ? 'border-gray-200 hover:border-gray-300' 
                        : 'border-gray-100 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        {/* 멤버 정보 */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">{membership.member.name}</h3>
                            
                            {/* 직책 배지 */}
                            {membership.role && (
                              <Badge 
                                variant={membership.role.isLeadership ? "default" : "secondary"}
                                className="flex items-center gap-1"
                              >
                                {membership.role.isLeadership && (
                                  <Crown className="h-3 w-3" />
                                )}
                                {membership.role.name}
                              </Badge>
                            )}
                            
                            {/* 주요 조직 배지 */}
                            {membership.isPrimary && (
                              <Badge variant="outline" className="text-blue-600 border-blue-200">
                                주요
                              </Badge>
                            )}
                            
                            {/* 활성/비활성 상태 */}
                            <Badge variant={membership.isActive ? "default" : "secondary"}>
                              {membership.isActive ? '활성' : '비활성'}
                            </Badge>
                          </div>

                          {/* 연락처 정보 */}
                          <div className="space-y-1 text-sm text-gray-600">
                            {membership.member.phone && (
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4" />
                                <span>{membership.member.phone}</span>
                              </div>
                            )}
                            {membership.member.email && (
                              <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4" />
                                <span>{membership.member.email}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              <span>참여일: {formatDate(membership.joinDate)}</span>
                              {membership.endDate && (
                                <span>~ 종료일: {formatDate(membership.endDate)}</span>
                              )}
                            </div>
                          </div>

                          {/* 메모 */}
                          {membership.notes && (
                            <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                              <strong>메모:</strong> {membership.notes}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 액션 버튼 */}
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEditMember(membership)}
                          title="구성원 정보 수정"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" title="추가 작업">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                </div>

                {/* 페이지네이션 */}
                {pagination && pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={!pagination.hasPreviousPage}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        이전
                      </Button>
                      
                      <div className="flex items-center gap-1">
                        {/* 페이지 번호 버튼들 */}
                        {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                          const startPage = Math.max(1, currentPage - 2)
                          const pageNum = startPage + i
                          
                          if (pageNum > pagination.totalPages) return null
                          
                          return (
                            <Button
                              key={pageNum}
                              variant={currentPage === pageNum ? "default" : "outline"}
                              size="sm"
                              onClick={() => handlePageChange(pageNum)}
                              className="w-10 h-8"
                            >
                              {pageNum}
                            </Button>
                          )
                        })}
                        
                        {pagination.totalPages > 5 && currentPage < pagination.totalPages - 2 && (
                          <>
                            <span className="px-2">...</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePageChange(pagination.totalPages)}
                              className="w-10 h-8"
                            >
                              {pagination.totalPages}
                            </Button>
                          </>
                        )}
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={!pagination.hasNextPage}
                      >
                        다음
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      {pagination.totalCount}개 항목 중 {((currentPage - 1) * pageSize) + 1}-
                      {Math.min(currentPage * pageSize, pagination.totalCount)}개 표시
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-500 mb-2">
                조직을 선택하세요
              </h3>
              <p className="text-gray-400">
                구성원을 확인하려면 먼저 조직을 선택해주세요
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 구성원 편집 모달 */}
      <OrganizationMemberEditDialog
        open={showEditDialog}
        onClose={handleCloseEditDialog}
        membership={selectedMembership}
        onSuccess={handleEditSuccess}
      />
    </div>
  )
}