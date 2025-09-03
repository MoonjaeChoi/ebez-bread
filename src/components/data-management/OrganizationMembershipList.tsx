'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
  Info
} from 'lucide-react'
import { trpc } from '@/lib/trpc/client'

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
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedOrganization, setSelectedOrganization] = useState(organizationId || '')
  const [showInactive, setShowInactive] = useState(false)
  const [selectedMembership, setSelectedMembership] = useState<OrganizationMembership | null>(null)

  // 조직별 멤버십 목록 조회
  const { data: memberships, isLoading, error } = trpc.organizationMemberships.getByOrganization.useQuery({
    organizationId: selectedOrganization,
    includeInactive: showInactive
  }, {
    enabled: !!selectedOrganization
  })

  // 조직 목록 조회
  const { data: organizations } = trpc.organizations.getHierarchy.useQuery({
    includeInactive: false
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

  // 검색 필터링
  const filteredMemberships = memberships?.filter(membership => {
    if (!searchTerm) return true
    
    const searchLower = searchTerm.toLowerCase()
    return (
      membership.member.name.toLowerCase().includes(searchLower) ||
      membership.member.phone?.toLowerCase().includes(searchLower) ||
      membership.member.email?.toLowerCase().includes(searchLower) ||
      membership.role?.name.toLowerCase().includes(searchLower)
    )
  }) || []

  const getLevelColor = (orgLevel: string) => {
    switch (orgLevel) {
      case 'LEVEL_1': return 'text-blue-600'
      case 'LEVEL_2': return 'text-green-600'
      case 'LEVEL_3': return 'text-orange-600'
      case 'LEVEL_4': return 'text-purple-600'
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
      {/* 필터 및 검색 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            검색 및 필터
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 조직 선택 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">조직 선택</label>
              <Select value={selectedOrganization} onValueChange={setSelectedOrganization}>
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
              <label className="text-sm font-medium">구성원 검색</label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="이름, 전화번호, 직책으로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* 옵션 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">표시 옵션</label>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="showInactive"
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="showInactive" className="text-sm">
                  비활성 구성원 포함
                </label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 구성원 목록 */}
      {selectedOrganization ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              구성원 목록
            </CardTitle>
            <CardDescription>
              {filteredMemberships.length}명의 구성원이 있습니다
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <Users className="h-8 w-8 animate-pulse text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">구성원 목록을 불러오는 중...</p>
              </div>
            ) : filteredMemberships.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-500 mb-2">
                  구성원이 없습니다
                </h3>
                <p className="text-gray-400">
                  {searchTerm ? '검색 조건에 맞는 구성원이 없습니다' : '아직 등록된 구성원이 없습니다'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredMemberships.map((membership) => (
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
                        <Button variant="ghost" size="sm">
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
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
    </div>
  )
}