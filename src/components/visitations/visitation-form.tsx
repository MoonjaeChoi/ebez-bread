'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { trpc } from '@/lib/trpc/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const visitationFormSchema = z.object({
  memberId: z.string().min(1, '교인을 선택해주세요'),
  visitDate: z.string().min(1, '심방 날짜를 선택해주세요'),
  purpose: z.string().optional(),
  content: z.string().optional(),
  followUpNeeded: z.boolean().default(false),
  followUpDate: z.string().optional(),
})

type VisitationFormData = z.infer<typeof visitationFormSchema>

interface VisitationFormProps {
  isOpen: boolean
  onClose: () => void
  visitationId?: string
  preselectedMemberId?: string
  onSuccess?: () => void
}

// Purpose mapping outside component to ensure it's available
const purposeMapping = {
  '일반 심방': 'GENERAL',
  '새가족 심방': 'NEW_FAMILY',
  '병문안': 'HOSPITAL',
  '생일 축하': 'BIRTHDAY',
  '경조사': 'CONDOLENCE',
  '상담 및 기도': 'COUNSELING',
  '전도 및 초청': 'EVANGELISM',
  '교회 행사 안내': 'EVENT',
  '기타': 'OTHER'
} as const

// Reverse mapping for display
const reversePurposeMapping = Object.fromEntries(
  Object.entries(purposeMapping).map(([korean, english]) => [english, korean])
)

export function VisitationForm({ 
  isOpen, 
  onClose, 
  visitationId, 
  preselectedMemberId,
  onSuccess 
}: VisitationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const { data: members = [] } = trpc.visitations.getAvailableMembers.useQuery()
  
  const createMutation = trpc.visitations.create.useMutation()
  const updateMutation = trpc.visitations.update.useMutation()
  
  const { data: visitationData } = trpc.visitations.getById.useQuery(
    { id: visitationId! },
    { enabled: !!visitationId }
  )

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors }
  } = useForm<VisitationFormData>({
    resolver: zodResolver(visitationFormSchema),
    defaultValues: {
      visitDate: new Date().toISOString().split('T')[0],
      memberId: preselectedMemberId || '',
      followUpNeeded: false,
      ...(visitationData && {
        memberId: visitationData.memberId,
        visitDate: new Date(visitationData.visitDate).toISOString().split('T')[0],
        purpose: visitationData.purpose ? 
          (reversePurposeMapping[visitationData.purpose] || visitationData.purpose) : '',
        content: visitationData.content || '',
        followUpNeeded: visitationData.needsFollowUp,
        followUpDate: visitationData.followUpDate ? 
          new Date(visitationData.followUpDate).toISOString().split('T')[0] : '',
      }),
    }
  })

  const onSubmit = async (data: VisitationFormData) => {
    setIsSubmitting(true)
    
    try {
      const { followUpNeeded, ...dataWithoutFollowUpNeeded } = data
      
      // Map Korean purpose to English enum value
      let mappedPurpose: string | undefined = undefined
      if (data.purpose) {
        mappedPurpose = purposeMapping[data.purpose as keyof typeof purposeMapping] || data.purpose
      }
      
      const processedData = {
        ...dataWithoutFollowUpNeeded,
        purpose: mappedPurpose as "EVENT" | "OTHER" | "GENERAL" | "NEW_FAMILY" | "HOSPITAL" | "BIRTHDAY" | "CONDOLENCE" | "COUNSELING" | "EVANGELISM",
        needsFollowUp: followUpNeeded,
        followUpDate: followUpNeeded && data.followUpDate ? data.followUpDate : undefined,
      }

      if (visitationId) {
        await updateMutation.mutateAsync({ ...processedData, id: visitationId })
      } else {
        await createMutation.mutateAsync(processedData)
      }

      reset()
      onClose()
      onSuccess?.()
    } catch (error) {
      console.error('Failed to save visitation:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const selectedMember = members.find(m => m.id === watch('memberId'))
  const followUpNeeded = watch('followUpNeeded')

  const commonPurposes = Object.keys(purposeMapping)

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {visitationId ? '심방 기록 수정' : '심방 기록 추가'}
          </DialogTitle>
          <DialogDescription>
            교인 심방 정보를 입력해주세요.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* 교인 선택 */}
          <div className="space-y-2">
            <Label htmlFor="memberId">교인 선택 *</Label>
            <Select 
              value={watch('memberId') || ''} 
              onValueChange={(value) => setValue('memberId', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="심방할 교인을 선택해주세요">
                  {watch('memberId') && selectedMember ? selectedMember.name : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {members?.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{member.name}</span>
                      <div className="text-xs text-muted-foreground space-y-1">
                        {member.phone && <div>{member.phone}</div>}
                        {member.address && <div>{member.address}</div>}
                        {member.position?.name && (
                          <div>직분: {member.position.name}</div>
                        )}
                        {member.department?.name && (
                          <div>부서: {member.department.name}</div>
                        )}
                        {member.lastVisitDate && (
                          <div className="text-blue-600">
                            최근 심방: {new Date(member.lastVisitDate).toLocaleDateString('ko-KR')}
                          </div>
                        )}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.memberId && (
              <p className="text-sm text-red-500">{errors.memberId.message}</p>
            )}
          </div>

          {/* 선택된 교인 정보 표시 */}
          {selectedMember && (
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">교인 정보</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>이름: {selectedMember.name}</div>
                <div>연락처: {selectedMember.phone || '없음'}</div>
                <div>직분: {selectedMember.position?.name || '없음'}</div>
                <div>부서: {selectedMember.department?.name || '없음'}</div>
                {selectedMember.address && (
                  <div className="col-span-2">주소: {selectedMember.address}</div>
                )}
                {selectedMember.lastVisitDate && (
                  <div className="col-span-2 text-blue-600">
                    최근 심방: {new Date(selectedMember.lastVisitDate).toLocaleDateString('ko-KR')}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 심방 날짜 */}
            <div className="space-y-2">
              <Label htmlFor="visitDate">심방 날짜 *</Label>
              <Input
                id="visitDate"
                type="date"
                {...register('visitDate')}
              />
              {errors.visitDate && (
                <p className="text-sm text-red-500">{errors.visitDate.message}</p>
              )}
            </div>

            {/* 심방 목적 */}
            <div className="space-y-2">
              <Label htmlFor="purpose">심방 목적</Label>
              <Select 
                value={watch('purpose') || ''} 
                onValueChange={(value) => setValue('purpose', value === 'custom' ? '' : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="목적을 선택하거나 직접 입력" />
                </SelectTrigger>
                <SelectContent>
                  {commonPurposes.map((purpose) => (
                    <SelectItem key={purpose} value={purpose}>
                      {purpose}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">직접 입력</SelectItem>
                </SelectContent>
              </Select>
              {(!commonPurposes.includes(watch('purpose') || '') || watch('purpose') === '') && (
                <Input
                  placeholder="심방 목적을 입력해주세요"
                  {...register('purpose')}
                />
              )}
            </div>
          </div>

          {/* 심방 내용 */}
          <div className="space-y-2">
            <Label htmlFor="content">심방 내용</Label>
            <Textarea
              id="content"
              {...register('content')}
              placeholder="심방 중 나눈 대화, 기도제목, 특이사항 등을 기록해주세요"
              rows={4}
            />
          </div>

          {/* 후속조치 설정 */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="followUpNeeded"
                checked={followUpNeeded}
                onCheckedChange={(checked) => setValue('followUpNeeded', checked as boolean)}
              />
              <Label htmlFor="followUpNeeded">후속조치가 필요합니다</Label>
            </div>

            {followUpNeeded && (
              <div className="pl-6 space-y-2">
                <Label htmlFor="followUpDate">후속조치 예정일</Label>
                <Input
                  id="followUpDate"
                  type="date"
                  {...register('followUpDate')}
                  min={new Date().toISOString().split('T')[0]}
                />
                <p className="text-sm text-muted-foreground">
                  후속조치가 필요한 날짜를 설정하면 알림을 받을 수 있습니다.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              취소
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? '저장 중...' : (visitationId ? '수정' : '등록')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}