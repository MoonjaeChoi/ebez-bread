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
import { Gender, MaritalStatus, FamilyRelation } from '@prisma/client'

const memberFormSchema = z.object({
  name: z.string().min(1, '이름을 입력해주세요'),
  phone: z.string().optional(),
  email: z.string().email('올바른 이메일을 입력해주세요').optional().or(z.literal('')),
  birthDate: z.string().optional(),
  address: z.string().optional(),
  gender: z.string().optional(),
  maritalStatus: z.string().optional(),
  baptismDate: z.string().optional(),
  confirmationDate: z.string().optional(),
  positionId: z.string().optional(),
  departmentId: z.string().optional(),
  familyId: z.string().optional(),
  relationship: z.string().optional(),
  notes: z.string().optional(),
})

type MemberFormData = z.infer<typeof memberFormSchema>

interface MemberFormProps {
  isOpen: boolean
  onClose: () => void
  memberId?: string
  onSuccess?: () => void
}

export function MemberForm({ isOpen, onClose, memberId, onSuccess }: MemberFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const { data: positions = [], error: positionsError } = trpc.members.getPositions.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false
  })
  const { data: departments = [], error: departmentsError } = trpc.members.getDepartments.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false
  })
  
  const createMutation = trpc.members.create.useMutation()
  const updateMutation = trpc.members.update.useMutation()
  
  const { data: memberData } = trpc.members.getById.useQuery(
    { id: memberId! },
    { 
      enabled: !!memberId,
      retry: false,
      refetchOnWindowFocus: false
    }
  )

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors }
  } = useForm<MemberFormData>({
    resolver: zodResolver(memberFormSchema),
    defaultValues: memberData ? {
      name: memberData.name,
      phone: memberData.phone || '',
      email: memberData.email || '',
      birthDate: memberData.birthDate ? new Date(memberData.birthDate).toISOString().split('T')[0] : '',
      address: memberData.address || '',
      gender: memberData.gender || 'NONE',
      maritalStatus: memberData.maritalStatus || 'NONE',
      baptismDate: memberData.baptismDate ? new Date(memberData.baptismDate).toISOString().split('T')[0] : '',
      confirmationDate: memberData.confirmationDate ? new Date(memberData.confirmationDate).toISOString().split('T')[0] : '',
      positionId: memberData.positionId || 'NONE',
      departmentId: memberData.departmentId || 'NONE',
      notes: memberData.notes || '',
    } : {
      gender: 'NONE',
      maritalStatus: 'NONE',
      positionId: 'NONE',
      departmentId: 'NONE',
    }
  })

  const onSubmit = async (data: MemberFormData) => {
    setIsSubmitting(true)
    setError(null)
    
    try {
      const processedData = {
        ...data,
        gender: (data.gender && data.gender !== 'NONE') ? data.gender as Gender : undefined,
        maritalStatus: (data.maritalStatus && data.maritalStatus !== 'NONE') ? data.maritalStatus as MaritalStatus : undefined,
        relationship: (data.relationship && data.relationship !== 'NONE') ? data.relationship as FamilyRelation : undefined,
        positionId: (data.positionId && data.positionId !== 'NONE') ? data.positionId : undefined,
        departmentId: (data.departmentId && data.departmentId !== 'NONE') ? data.departmentId : undefined,
        familyId: (data.familyId && data.familyId !== 'NONE') ? data.familyId : undefined,
      }

      if (memberId) {
        await updateMutation.mutateAsync({ ...processedData, id: memberId })
      } else {
        await createMutation.mutateAsync(processedData)
      }

      reset()
      onClose()
      onSuccess?.()
    } catch (error: any) {
      console.error('Failed to save member:', error)
      const errorMessage = error?.message || '교인 정보 저장에 실패했습니다. 데이터베이스 연결을 확인해주세요.'
      setError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    reset()
    setError(null)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {memberId ? '교인 정보 수정' : '새 교인 등록'}
          </DialogTitle>
          <DialogDescription>
            교인의 기본 정보를 입력해주세요.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    저장 오류
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 기본 정보 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">이름 *</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="홍길동"
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">연락처</Label>
              <Input
                id="phone"
                {...register('phone')}
                placeholder="010-1234-5678"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                placeholder="example@email.com"
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="birthDate">생년월일</Label>
              <Input
                id="birthDate"
                type="date"
                {...register('birthDate')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender">성별</Label>
              <Select 
                value={watch('gender') || ''} 
                onValueChange={(value) => setValue('gender', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="성별 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">선택 안함</SelectItem>
                  <SelectItem value={Gender.MALE}>남성</SelectItem>
                  <SelectItem value={Gender.FEMALE}>여성</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maritalStatus">결혼상태</Label>
              <Select 
                value={watch('maritalStatus') || ''} 
                onValueChange={(value) => setValue('maritalStatus', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="결혼상태 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">선택 안함</SelectItem>
                  <SelectItem value={MaritalStatus.SINGLE}>미혼</SelectItem>
                  <SelectItem value={MaritalStatus.MARRIED}>기혼</SelectItem>
                  <SelectItem value={MaritalStatus.DIVORCED}>이혼</SelectItem>
                  <SelectItem value={MaritalStatus.WIDOWED}>사별</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="positionId">직분</Label>
              <Select 
                value={watch('positionId') || ''} 
                onValueChange={(value) => setValue('positionId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="직분 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">선택 안함</SelectItem>
                  {positions?.map((position) => (
                    <SelectItem key={position.id} value={position.id}>
                      {position.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="departmentId">부서</Label>
              <Select 
                value={watch('departmentId') || ''} 
                onValueChange={(value) => setValue('departmentId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="부서 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">선택 안함</SelectItem>
                  {departments?.map((department) => (
                    <SelectItem key={department.id} value={department.id}>
                      {department.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="baptismDate">세례일</Label>
              <Input
                id="baptismDate"
                type="date"
                {...register('baptismDate')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmationDate">입교일</Label>
              <Input
                id="confirmationDate"
                type="date"
                {...register('confirmationDate')}
              />
            </div>
          </div>

          {/* 주소 */}
          <div className="space-y-2">
            <Label htmlFor="address">주소</Label>
            <Input
              id="address"
              {...register('address')}
              placeholder="서울특별시 강남구..."
            />
          </div>

          {/* 메모 */}
          <div className="space-y-2">
            <Label htmlFor="notes">메모</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="특이사항이나 메모를 입력해주세요"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              취소
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? '저장 중...' : (memberId ? '수정' : '등록')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}