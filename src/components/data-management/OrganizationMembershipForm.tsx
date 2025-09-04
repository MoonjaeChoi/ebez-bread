'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Building2, 
  Users, 
  Crown, 
  Calendar,
  AlertTriangle,
  CheckCircle,
  Search,
  UserCheck,
  Info
} from 'lucide-react'
import { trpc } from '@/lib/trpc/client'

const membershipSchema = z.object({
  memberId: z.string().min(1, '교인을 선택해주세요'),
  organizationId: z.string().min(1, '조직을 선택해주세요'),
  roleId: z.string().optional(),
  isPrimary: z.boolean().default(false),
  joinDate: z.string().optional(),
  notes: z.string().max(500, '메모는 500자 이내로 입력해주세요').optional(),
})

type MembershipFormData = z.infer<typeof membershipSchema>

interface Member {
  id: string
  name: string
  phone?: string | null
  email?: string | null
  position?: {
    id: string
    name: string
  } | null
}

interface Organization {
  id: string
  name: string
  code?: string | null
  level: string
  description?: string | null
  children?: Organization[]
  _count?: {
    organizationMemberships: number
  }
}

interface Role {
  id: string
  name: string
  englishName?: string | null
  level: number
  isLeadership: boolean
  description?: string | null
}

interface OrganizationMembershipFormProps {
  open: boolean
  onClose: () => void
  organizations: Organization[]
  roles: Role[]
  onSuccess?: () => void
  filterByRoleAssignments?: boolean // 직책이 할당된 조직만 필터링할지 여부
}

export function OrganizationMembershipForm({
  open,
  onClose,
  organizations,
  roles,
  onSuccess,
  filterByRoleAssignments = false
}: OrganizationMembershipFormProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<MembershipFormData>({
    resolver: zodResolver(membershipSchema),
    defaultValues: {
      isPrimary: false,
      joinDate: new Date().toISOString().split('T')[0]
    }
  })

  // 교인 목록 조회
  const { data: members, isLoading: membersLoading } = trpc.members.search.useQuery({
    query: searchTerm,
    limit: 20
  }, {
    enabled: searchTerm.length >= 2
  })

  // 직책이 할당된 조직들만 조회 (필터링 옵션이 활성화된 경우)
  const { data: organizationsWithRoles } = trpc.organizationRoleAssignments.getOrganizationsWithRoles.useQuery({
    includeInherited: true,
    includeInactive: false
  }, {
    enabled: filterByRoleAssignments
  })

  // 조직 멤버십 생성
  const createMembershipMutation = trpc.organizationMemberships.create.useMutation({
    onSuccess: () => {
      reset()
      setSelectedOrganization(null)
      setSelectedRole(null)
      onSuccess?.()
      onClose()
    },
    onError: (error) => {
      console.error('Error creating membership:', error)
    }
  })

  const watchedValues = watch()

  // 사용할 조직 목록 결정 (필터링 여부에 따라)
  const sourceOrganizations = filterByRoleAssignments && organizationsWithRoles 
    ? organizationsWithRoles 
    : organizations

  // 조직 트리를 평면화
  const flattenOrganizations = (orgs: Organization[], depth = 0): Array<Organization & { depth: number }> => {
    return orgs.reduce((acc, org) => {
      acc.push({ ...org, depth })
      if (org.children) {
        acc.push(...flattenOrganizations(org.children, depth + 1))
      }
      return acc
    }, [] as Array<Organization & { depth: number }>)
  }

  const flatOrganizations = flattenOrganizations(sourceOrganizations)

  // 리더십 직책과 일반 직책 분리
  const leadershipRoles = roles.filter(r => r.isLeadership).sort((a, b) => b.level - a.level)
  const generalRoles = roles.filter(r => !r.isLeadership).sort((a, b) => b.level - a.level)

  const onSubmit = async (data: MembershipFormData) => {
    try {
      await createMembershipMutation.mutateAsync({
        memberId: data.memberId,
        organizationId: data.organizationId,
        roleId: data.roleId || undefined,
        isPrimary: data.isPrimary,
        joinDate: data.joinDate ? new Date(data.joinDate) : new Date(),
        notes: data.notes || undefined
      })
    } catch (error) {
      console.error('Form submission error:', error)
    }
  }

  const handleOrganizationChange = (orgId: string) => {
    setValue('organizationId', orgId)
    const org = flatOrganizations.find(o => o.id === orgId)
    setSelectedOrganization(org || null)
  }

  const handleRoleChange = (roleId: string) => {
    setValue('roleId', roleId)
    const role = roles.find(r => r.id === roleId)
    setSelectedRole(role || null)
  }

  const handleMemberChange = (memberId: string) => {
    setValue('memberId', memberId)
  }

  const getLevelIndent = (depth: number) => {
    return '  '.repeat(depth) + (depth > 0 ? '└ ' : '')
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            조직 구성원 추가
          </DialogTitle>
          <DialogDescription>
            선택한 조직에 교인을 직책과 함께 추가할 수 있습니다
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* 교인 선택 */}
          <div className="space-y-2">
            <Label htmlFor="member-search" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              교인 선택
            </Label>
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="member-search"
                  placeholder="교인 이름, 전화번호, 이메일로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {searchTerm.length >= 2 && (
                <div className="border rounded-lg max-h-40 overflow-y-auto">
                  {membersLoading ? (
                    <div className="p-3 text-center text-sm text-muted-foreground">
                      검색 중...
                    </div>
                  ) : members && members.length > 0 ? (
                    <div className="divide-y">
                      {members.map((member) => (
                        <button
                          key={member.id}
                          type="button"
                          className="w-full p-3 text-left hover:bg-muted transition-colors"
                          onClick={() => handleMemberChange(member.id)}
                        >
                          <div className="font-medium">{member.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {member.phone && <span>{member.phone}</span>}
                            {member.phone && member.email && <span> • </span>}
                            {member.email && <span>{member.email}</span>}
                            {member.position && (
                              <Badge variant="outline" className="ml-2 text-xs">
                                {member.position.name}
                              </Badge>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 text-center text-sm text-muted-foreground">
                      검색 결과가 없습니다
                    </div>
                  )}
                </div>
              )}
            </div>
            {errors.memberId && (
              <p className="text-sm text-red-600">{errors.memberId.message}</p>
            )}
          </div>

          {/* 조직 선택 */}
          <div className="space-y-2">
            <Label htmlFor="organization" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              조직 선택
            </Label>
            <Select onValueChange={handleOrganizationChange}>
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
                      {org._count && org._count.organizationMemberships > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {org._count.organizationMemberships}명
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.organizationId && (
              <p className="text-sm text-red-600">{errors.organizationId.message}</p>
            )}
          </div>

          {/* 선택된 조직 정보 */}
          {selectedOrganization && (
            <Alert>
              <Building2 className="h-4 w-4" />
              <AlertDescription>
                <strong>{selectedOrganization.name}</strong>
                {selectedOrganization.description && (
                  <span> - {selectedOrganization.description}</span>
                )}
                <br />
                <span className="text-sm text-muted-foreground">
                  현재 {selectedOrganization._count?.organizationMemberships || 0}명의 구성원이 있습니다
                </span>
              </AlertDescription>
            </Alert>
          )}

          {/* 직책 선택 */}
          <div className="space-y-2">
            <Label htmlFor="role" className="flex items-center gap-2">
              <Crown className="h-4 w-4" />
              직책 선택 (선택사항)
            </Label>
            <Select onValueChange={handleRoleChange}>
              <SelectTrigger>
                <SelectValue placeholder="직책을 선택하세요 (없으면 일반 구성원)" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {leadershipRoles.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted">
                      리더십 직책
                    </div>
                    {leadershipRoles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        <div className="flex items-center gap-2">
                          <Crown className="h-3 w-3 text-amber-500" />
                          <span>{role.name}</span>
                          <Badge variant="outline" className="text-xs">
                            Lv.{role.level}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </>
                )}
                
                {generalRoles.length > 0 && (
                  <>
                    {leadershipRoles.length > 0 && <Separator className="my-1" />}
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted">
                      일반 직책
                    </div>
                    {generalRoles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        <div className="flex items-center gap-2">
                          <span>{role.name}</span>
                          <Badge variant="outline" className="text-xs">
                            Lv.{role.level}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* 선택된 직책 정보 */}
          {selectedRole && (
            <Alert>
              <Crown className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center gap-2">
                  <strong>{selectedRole.name}</strong>
                  <Badge variant={selectedRole.isLeadership ? "default" : "secondary"}>
                    {selectedRole.isLeadership ? "리더십" : "일반"} 직책
                  </Badge>
                  <Badge variant="outline">Lv.{selectedRole.level}</Badge>
                </div>
                {selectedRole.description && (
                  <p className="text-sm mt-1">{selectedRole.description}</p>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* 추가 설정 */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isPrimary"
                {...register('isPrimary')}
                onCheckedChange={(checked) => setValue('isPrimary', !!checked)}
              />
              <Label htmlFor="isPrimary" className="text-sm font-medium">
                주요 조직으로 설정
              </Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="joinDate" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                참여 시작일
              </Label>
              <Input
                id="joinDate"
                type="date"
                {...register('joinDate')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">메모</Label>
              <Textarea
                id="notes"
                placeholder="추가 메모가 있다면 입력하세요..."
                {...register('notes')}
                rows={3}
              />
              {errors.notes && (
                <p className="text-sm text-red-600">{errors.notes.message}</p>
              )}
            </div>
          </div>

          {/* 에러 메시지 */}
          {createMembershipMutation.error && (
            <Alert className="border-red-200">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-red-700">
                {createMembershipMutation.error.message}
              </AlertDescription>
            </Alert>
          )}

          {/* 폼 액션 */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              취소
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || createMembershipMutation.isLoading}
            >
              {isSubmitting || createMembershipMutation.isLoading ? (
                <>등록 중...</>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  구성원 추가
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}