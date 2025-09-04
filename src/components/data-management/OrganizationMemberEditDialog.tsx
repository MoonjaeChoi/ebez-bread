'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Edit2, 
  Crown, 
  Calendar,
  AlertTriangle,
  CheckCircle,
  Loader2,
  User,
  Mail,
  Phone,
  Building2,
  History
} from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { MembershipHistoryView } from './MembershipHistoryView'

// 폼 스키마
const memberEditSchema = z.object({
  roleId: z.string().optional(),
  isPrimary: z.boolean().default(false),
  joinDate: z.string(),
  endDate: z.string().optional(),
  notes: z.string().max(500, '메모는 500자 이내로 입력해주세요').optional(),
})

type MemberEditFormData = z.infer<typeof memberEditSchema>

interface OrganizationMember {
  id: string
  isPrimary: boolean
  joinDate: string | Date
  endDate?: string | Date | null
  isActive: boolean
  notes?: string | null
  member: {
    id: string
    name: string
    phone?: string | null
    email?: string | null
  }
  organization: {
    id: string
    name: string
    code?: string | null
  }
  role?: {
    id: string
    name: string
    level: number
    isLeadership: boolean
  } | null
}

interface OrganizationMemberEditDialogProps {
  open: boolean
  onClose: () => void
  membership: OrganizationMember | null
  onSuccess?: () => void
}

export function OrganizationMemberEditDialog({
  open,
  onClose,
  membership,
  onSuccess
}: OrganizationMemberEditDialogProps) {
  const [isDeactivating, setIsDeactivating] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<MemberEditFormData>({
    resolver: zodResolver(memberEditSchema),
  })

  // 직책 목록 조회
  const { data: roles } = trpc.organizationRoles.getAll.useQuery({
    includeStats: false
  })

  // 멤버십 수정 mutation
  const updateMembershipMutation = trpc.organizationMemberships.update.useMutation({
    onSuccess: () => {
      onSuccess?.()
      onClose()
      reset()
    },
    onError: (error) => {
      console.error('Error updating membership:', error)
    }
  })

  // 폼 초기값 설정
  useEffect(() => {
    if (membership && open) {
      const joinDate = new Date(membership.joinDate).toISOString().split('T')[0]
      const endDate = membership.endDate 
        ? new Date(membership.endDate).toISOString().split('T')[0] 
        : undefined

      reset({
        roleId: membership.role?.id || '',
        isPrimary: membership.isPrimary,
        joinDate,
        endDate,
        notes: membership.notes || '',
      })
      setIsDeactivating(!membership.isActive)
    }
  }, [membership, open, reset])

  const watchedValues = watch()

  const onSubmit = async (data: MemberEditFormData) => {
    if (!membership) return

    try {
      const updateData = {
        id: membership.id,
        roleId: data.roleId || null,
        isPrimary: data.isPrimary,
        endDate: isDeactivating && data.endDate ? new Date(data.endDate) : null,
        notes: data.notes || '',
      }

      await updateMembershipMutation.mutateAsync(updateData)
    } catch (error) {
      console.error('Form submission error:', error)
    }
  }

  const handleClose = () => {
    reset()
    setIsDeactivating(false)
    onClose()
  }

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('ko-KR')
  }

  if (!membership) return null

  // 리더십 직책과 일반 직책 분리
  const leadershipRoles = roles?.filter(r => r.isLeadership && r.isActive).sort((a, b) => b.level - a.level) || []
  const generalRoles = roles?.filter(r => !r.isLeadership && r.isActive).sort((a, b) => b.level - a.level) || []

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit2 className="h-5 w-5" />
            구성원 정보 수정
          </DialogTitle>
          <DialogDescription>
            {membership.member.name}님의 조직 멤버십 정보를 수정합니다
          </DialogDescription>
        </DialogHeader>

        {/* 구성원 기본 정보 표시 */}
        <div className="bg-gray-50 p-4 rounded-lg space-y-3">
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-gray-500" />
            <div>
              <h3 className="font-semibold text-lg">{membership.member.name}</h3>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                {membership.member.phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {membership.member.phone}
                  </div>
                )}
                {membership.member.email && (
                  <div className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {membership.member.email}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-gray-500" />
            <span className="font-medium">{membership.organization.name}</span>
            {membership.organization.code && (
              <Badge variant="secondary" className="text-xs">
                {membership.organization.code}
              </Badge>
            )}
            {membership.isPrimary && (
              <Badge variant="outline" className="text-blue-600 border-blue-200">
                주요 조직
              </Badge>
            )}
            <Badge variant={membership.isActive ? "default" : "secondary"}>
              {membership.isActive ? '활성' : '비활성'}
            </Badge>
          </div>
        </div>

        <Tabs defaultValue="edit" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="edit" className="flex items-center gap-2">
              <Edit2 className="h-4 w-4" />
              정보 수정
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              변경 이력
            </TabsTrigger>
          </TabsList>

          <TabsContent value="edit">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* 직책 선택 */}
          <div className="space-y-2">
            <Label htmlFor="role" className="flex items-center gap-2">
              <Crown className="h-4 w-4" />
              직책
            </Label>
            <Select 
              value={watchedValues.roleId || ''} 
              onValueChange={(value) => setValue('roleId', value || undefined)}
            >
              <SelectTrigger>
                <SelectValue placeholder="직책을 선택하세요 (없으면 일반 구성원)" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value="">일반 구성원 (직책 없음)</SelectItem>
                
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
                    {leadershipRoles.length > 0 && <div className="border-t my-1" />}
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

          {/* 주요 조직 설정 */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isPrimary"
              checked={watchedValues.isPrimary}
              onCheckedChange={(checked) => setValue('isPrimary', !!checked)}
            />
            <Label htmlFor="isPrimary" className="text-sm font-medium">
              주요 조직으로 설정
            </Label>
          </div>

          {/* 참여 시작일 */}
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

          {/* 비활성화 설정 */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="deactivate"
                checked={isDeactivating}
                onCheckedChange={(checked) => setIsDeactivating(!!checked)}
              />
              <Label htmlFor="deactivate" className="text-sm font-medium">
                구성원 비활성화 (종료 처리)
              </Label>
            </div>

            {isDeactivating && (
              <div className="space-y-2">
                <Label htmlFor="endDate">종료일</Label>
                <Input
                  id="endDate"
                  type="date"
                  {...register('endDate')}
                />
              </div>
            )}
          </div>

          {/* 메모 */}
          <div className="space-y-2">
            <Label htmlFor="notes">메모</Label>
            <Textarea
              id="notes"
              placeholder="구성원에 대한 추가 메모가 있다면 입력하세요..."
              {...register('notes')}
              rows={3}
            />
            {errors.notes && (
              <p className="text-sm text-red-600">{errors.notes.message}</p>
            )}
          </div>

          {/* 에러 메시지 */}
          {updateMembershipMutation.error && (
            <Alert className="border-red-200">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-red-700">
                {updateMembershipMutation.error.message}
              </AlertDescription>
            </Alert>
          )}

          {/* 폼 액션 */}
          <DialogFooter className="flex flex-row gap-2 justify-end">
            <Button type="button" variant="outline" onClick={handleClose}>
              취소
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || updateMembershipMutation.isLoading}
            >
              {isSubmitting || updateMembershipMutation.isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  수정 중...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  수정 완료
                </>
              )}
            </Button>
              </DialogFooter>
            </form>
          </TabsContent>

          <TabsContent value="history">
            <MembershipHistoryView membershipId={membership.id} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}