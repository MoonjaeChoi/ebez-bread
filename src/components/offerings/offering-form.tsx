'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { trpc } from '@/lib/trpc/client'
import { logger } from '@/lib/safe-logger'
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
import { OfferingType } from '@prisma/client'

const offeringFormSchema = z.object({
  memberId: z.string().min(1, '교인을 선택해주세요'),
  amount: z.number().positive('헌금액은 0보다 커야 합니다'),
  offeringType: z.nativeEnum(OfferingType),
  description: z.string().optional(),
  offeringDate: z.string().min(1, '헌금 날짜를 선택해주세요'),
})

type OfferingFormData = z.infer<typeof offeringFormSchema>

interface OfferingFormProps {
  isOpen: boolean
  onClose: () => void
  offeringId?: string
  onSuccess?: () => void
}

export function OfferingForm({ isOpen, onClose, offeringId, onSuccess }: OfferingFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const { data: members = [] } = trpc.offerings.getMembers.useQuery()
  
  const createMutation = trpc.offerings.create.useMutation()
  const updateMutation = trpc.offerings.update.useMutation()
  
  const { data: offeringData } = trpc.offerings.getById.useQuery(
    { id: offeringId! },
    { enabled: !!offeringId }
  )

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors }
  } = useForm<OfferingFormData>({
    resolver: zodResolver(offeringFormSchema),
    defaultValues: offeringData ? {
      memberId: offeringData.memberId,
      amount: Number(offeringData.amount),
      offeringType: offeringData.offeringType,
      description: offeringData.description || '',
      offeringDate: new Date(offeringData.offeringDate).toISOString().split('T')[0],
    } : {
      offeringDate: new Date().toISOString().split('T')[0],
    }
  })

  const onSubmit = async (data: OfferingFormData) => {
    setIsSubmitting(true)
    
    try {
      if (offeringId) {
        await updateMutation.mutateAsync({ ...data, id: offeringId })
      } else {
        await createMutation.mutateAsync(data)
      }

      reset()
      onClose()
      onSuccess?.()
    } catch (error) {
      // 안전한 로깅
      logger.error('Failed to save offering:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const formatAmount = (value: string) => {
    // 숫자만 추출
    const numbers = value.replace(/[^\d]/g, '')
    // 천단위 구분자 추가
    return numbers.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  }

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatAmount(e.target.value)
    const numericValue = parseFloat(formatted.replace(/,/g, '')) || 0
    setValue('amount', numericValue)
  }

  const getOfferingTypeLabel = (type: OfferingType) => {
    const labels = {
      [OfferingType.TITHE]: '십일조',
      [OfferingType.SUNDAY_OFFERING]: '주일헌금',
      [OfferingType.THANKSGIVING]: '감사헌금',
      [OfferingType.SPECIAL]: '특별헌금',
      [OfferingType.MISSION]: '선교헌금',
      [OfferingType.BUILDING]: '건축헌금',
      [OfferingType.OTHER]: '기타',
    }
    return labels[type]
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] top-[10%] translate-y-0">
        <DialogHeader>
          <DialogTitle>
            {offeringId ? '헌금 정보 수정' : '헌금 입력'}
          </DialogTitle>
          <DialogDescription>
            헌금 정보를 입력해주세요.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* 교인 선택 */}
          <div className="space-y-2">
            <Label htmlFor="memberId">교인명 *</Label>
            <Select 
              value={watch('memberId') || ''} 
              onValueChange={(value) => setValue('memberId', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="교인을 선택해주세요" />
              </SelectTrigger>
              <SelectContent>
                {members?.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    <div className="flex flex-col">
                      <span>{member.name}</span>
                      {member.phone && (
                        <span className="text-xs text-muted-foreground">
                          {member.phone}
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.memberId && (
              <p className="text-sm text-red-500">{errors.memberId.message}</p>
            )}
          </div>

          {/* 헌금 종류 */}
          <div className="space-y-2">
            <Label htmlFor="offeringType">헌금 종류 *</Label>
            <Select 
              value={watch('offeringType') || ''} 
              onValueChange={(value) => setValue('offeringType', value as OfferingType)}
            >
              <SelectTrigger>
                <SelectValue placeholder="헌금 종류를 선택해주세요" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(OfferingType).map((type) => (
                  <SelectItem key={type} value={type}>
                    {getOfferingTypeLabel(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.offeringType && (
              <p className="text-sm text-red-500">{errors.offeringType.message}</p>
            )}
          </div>

          {/* 헌금액 */}
          <div className="space-y-2">
            <Label htmlFor="amount">헌금액 *</Label>
            <div className="relative">
              <Input
                id="amount"
                value={watch('amount') ? watch('amount').toLocaleString() : ''}
                onChange={handleAmountChange}
                placeholder="100,000"
                className="pr-8"
              />
              <span className="absolute right-3 top-3 text-sm text-muted-foreground">
                원
              </span>
            </div>
            {errors.amount && (
              <p className="text-sm text-red-500">{errors.amount.message}</p>
            )}
          </div>

          {/* 헌금 날짜 */}
          <div className="space-y-2">
            <Label htmlFor="offeringDate">헌금 날짜 *</Label>
            <Input
              id="offeringDate"
              type="date"
              {...register('offeringDate')}
            />
            {errors.offeringDate && (
              <p className="text-sm text-red-500">{errors.offeringDate.message}</p>
            )}
          </div>

          {/* 설명 */}
          <div className="space-y-2">
            <Label htmlFor="description">설명</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="헌금에 대한 추가 설명을 입력해주세요"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              취소
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? '저장 중...' : (offeringId ? '수정' : '등록')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}