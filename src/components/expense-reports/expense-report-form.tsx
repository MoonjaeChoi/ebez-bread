'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { trpc } from '@/lib/trpc/client'
import { useSession } from 'next-auth/react'
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
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Upload, FileText, Trash2, Shield, Clock, CheckCircle, XCircle, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'

const expenseReportFormSchema = z.object({
  title: z.string().min(1, '제목을 입력해주세요').max(200, '제목은 200자 이내로 입력해주세요'),
  description: z.string().optional(),
  amount: z.number().min(0.01, '금액을 입력해주세요').max(999999999, '금액이 너무 큽니다'),
  category: z.string().min(1, '지출 분류를 선택해주세요'),
  receiptUrl: z.string().optional(),
  // 결재담당자 선택
  approvers: z.object({
    step1: z.string().optional(),
    step2: z.string().optional(), 
    step3: z.string().optional(),
  }).optional(),
})

type ExpenseReportFormData = z.infer<typeof expenseReportFormSchema>

interface ExpenseReportFormProps {
  isOpen: boolean
  onClose: () => void
  reportId?: string
  onSuccess?: () => void
}

// 결재단계 이름 매핑
const getStepName = (stepOrder: number) => {
  switch (stepOrder) {
    case 1: return '부서회계'
    case 2: return '부장'  
    case 3: return '위원장'
    default: return '알 수 없음'
  }
}

// 결재단계 아이콘
const getStepIcon = (status: string, isCurrentStep: boolean) => {
  const iconClass = "w-4 h-4"
  
  if (status === 'APPROVED') {
    return <CheckCircle className={`${iconClass} text-green-600`} />
  } else if (status === 'REJECTED') {
    return <XCircle className={`${iconClass} text-red-600`} />
  } else if (isCurrentStep) {
    return <Clock className={`${iconClass} text-yellow-600`} />
  } else {
    return <Clock className={`${iconClass} text-gray-400`} />
  }
}

export function ExpenseReportForm({ 
  isOpen, 
  onClose, 
  reportId,
  onSuccess 
}: ExpenseReportFormProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const dialogRef = useRef<HTMLDivElement>(null)
  const isEditing = !!reportId
  const { data: session } = useSession()

  const { data: categories } = trpc.expenseReports.getCategories.useQuery()
  const { data: approvalCandidates } = trpc.expenseReports.getApprovalCandidates.useQuery()
  
  const { data: editData } = trpc.expenseReports.getById.useQuery(
    { id: reportId! },
    { enabled: !!reportId }
  )

  const createMutation = trpc.expenseReports.create.useMutation({
    onSuccess: () => {
      toast.success('지출결의서가 작성되었습니다')
      handleClose()
      onSuccess?.()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const updateMutation = trpc.expenseReports.update.useMutation({
    onSuccess: () => {
      toast.success('지출결의서가 수정되었습니다')
      handleClose()
      onSuccess?.()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<ExpenseReportFormData>({
    resolver: zodResolver(expenseReportFormSchema),
    defaultValues: {
      title: '',
      description: '',
      amount: 0,
      category: '',
      receiptUrl: '',
      approvers: {
        step1: session?.user?.id || '',
        step2: '',
        step3: '',
      },
    },
  })

  const watchedReceiptUrl = watch('receiptUrl')

  useEffect(() => {
    if (editData) {
      reset({
        title: editData.title,
        description: editData.description || '',
        amount: Number(editData.amount),
        category: editData.category,
        receiptUrl: editData.receiptUrl || '',
      })
    } else {
      reset({
        title: '',
        description: '',
        amount: 0,
        category: '',
        receiptUrl: '',
        approvers: {
          step1: session?.user?.id || '',
          step2: '',
          step3: '',
        },
      })
    }
  }, [editData, reset, isOpen, session?.user?.id])

  const handleClose = () => {
    reset()
    setPosition({ x: 0, y: 0 })
    onClose()
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    })
  }

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      const newX = e.clientX - dragOffset.x
      const newY = e.clientY - dragOffset.y
      
      setPosition({
        x: newX,
        y: newY
      })
    }
  }, [isDragging, dragOffset.x, dragOffset.y])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  const onSubmit = (data: ExpenseReportFormData) => {
    if (isEditing && reportId) {
      updateMutation.mutate({
        id: reportId,
        ...data,
      })
    } else {
      createMutation.mutate(data)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      toast.error('지원하지 않는 파일 형식입니다. JPG, PNG, GIF, PDF만 업로드 가능합니다.')
      return
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('파일 크기는 10MB 이하만 업로드 가능합니다.')
      return
    }

    setIsUploading(true)
    
    try {
      // Create FormData for file upload
      const formData = new FormData()
      formData.append('file', file)
      
      // Upload to your file storage service (implement this based on your setup)
      // For now, we'll simulate with a placeholder URL
      // In a real application, you would upload to cloud storage like AWS S3, Cloudinary, etc.
      
      // Simulated upload - replace with actual upload logic
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const uploadedUrl = `uploads/receipts/${Date.now()}-${file.name}`
      setValue('receiptUrl', uploadedUrl)
      toast.success('영수증이 업로드되었습니다')
    } catch (error) {
      toast.error('파일 업로드에 실패했습니다')
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemoveFile = () => {
    setValue('receiptUrl', '')
    toast.success('영수증이 제거되었습니다')
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={isOpen} onOpenChange={!isDragging ? handleClose : undefined}>
      <DialogContent 
        ref={dialogRef}
        className="sm:max-w-[600px] max-h-[95vh] overflow-y-auto"
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
          cursor: isDragging ? 'grabbing' : 'default'
        }}
        onPointerDownOutside={(e) => {
          if (isDragging) {
            e.preventDefault()
          }
        }}
        onInteractOutside={(e) => {
          if (isDragging) {
            e.preventDefault()
          }
        }}
      >
        <DialogHeader 
          className={`${isDragging ? 'cursor-grabbing' : 'cursor-grab'} select-none`}
          onMouseDown={handleMouseDown}
        >
          <DialogTitle>
            {isEditing ? '지출결의서 수정' : '지출결의서 작성'}
          </DialogTitle>
          <DialogDescription>
            지출결의서 정보를 입력해주세요. 모든 필드를 정확히 작성해주시기 바랍니다.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {/* 결재담당자 선택 */}
            {!isEditing && (
              <div className="space-y-4">
                <Label>결재담당자 지정</Label>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* 1단계: 부서회계 */}
                  <div className="space-y-2">
                    <Label htmlFor="step1">1단계: 부서회계</Label>
                    <Select
                      value={watch('approvers')?.step1 || session?.user?.id || 'auto'}
                      onValueChange={(value) => setValue('approvers.step1', value === 'auto' ? undefined : value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="담당자 선택 (선택사항)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">역할별 자동 배정</SelectItem>
                        {approvalCandidates?.step1?.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            <div className="flex flex-col">
                              <span>{user.name}</span>
                              <span className="text-xs text-gray-500">{user.email}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 2단계: 부서장 */}
                  <div className="space-y-2">
                    <Label htmlFor="step2">2단계: 부서장</Label>
                    <Select
                      value={watch('approvers')?.step2 || 'auto'}
                      onValueChange={(value) => setValue('approvers.step2', value === 'auto' ? undefined : value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="담당자 선택 (선택사항)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">역할별 자동 배정</SelectItem>
                        {approvalCandidates?.step2?.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            <div className="flex flex-col">
                              <span>{user.name}</span>
                              <span className="text-xs text-gray-500">{user.email}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 3단계: 교구장 */}
                  <div className="space-y-2">
                    <Label htmlFor="step3">3단계: 교구장</Label>
                    <Select
                      value={watch('approvers')?.step3 || 'auto'}
                      onValueChange={(value) => setValue('approvers.step3', value === 'auto' ? undefined : value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="담당자 선택 (선택사항)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">역할별 자동 배정</SelectItem>
                        {approvalCandidates?.step3?.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            <div className="flex flex-col">
                              <span>{user.name}</span>
                              <span className="text-xs text-gray-500">{user.email}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* 결재단계 진행 상황 (수정 모드에서만 표시) */}
            {isEditing && editData?.approvals && editData.approvals.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center space-x-2">
                    <Shield className="w-5 h-5" />
                    <span>결재 진행 상황</span>
                    <Badge variant={
                      editData.workflowStatus === 'DRAFT' ? 'outline' :
                      editData.workflowStatus === 'IN_PROGRESS' ? 'secondary' :
                      editData.workflowStatus === 'APPROVED' ? 'default' :
                      editData.workflowStatus === 'REJECTED' ? 'destructive' :
                      'outline'
                    }>
                      {editData.workflowStatus === 'DRAFT' ? '초안' :
                       editData.workflowStatus === 'IN_PROGRESS' ? '승인 진행중' :
                       editData.workflowStatus === 'APPROVED' ? '최종 승인' :
                       editData.workflowStatus === 'REJECTED' ? '반려' :
                       editData.workflowStatus}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between space-x-4">
                    {editData.approvals?.map((approval, index) => (
                      <div key={approval.id} className="flex-1">
                        <div className="text-center space-y-2">
                          <div className="flex justify-center">
                            {getStepIcon(
                              approval.status, 
                              editData.currentStep === approval.stepOrder
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {getStepName(approval.stepOrder)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {approval.status === 'APPROVED' ? '승인 완료' :
                               approval.status === 'REJECTED' ? '반려' :
                               editData.currentStep === approval.stepOrder ? '승인 대기' : '대기'}
                            </p>
                            {approval.assignedUserId && (
                              <p className="text-xs text-gray-600 mt-1">
                                담당자 지정됨
                              </p>
                            )}
                            {approval.approver && (
                              <p className="text-xs text-green-600 mt-1">
                                승인자: {approval.approver.name}
                              </p>
                            )}
                            {approval.comment && (
                              <p className="text-xs text-gray-600 mt-1 p-1 bg-gray-100 rounded text-center">
                                {approval.comment}
                              </p>
                            )}
                          </div>
                        </div>
                        {index < editData.approvals.length - 1 && (
                          <div className="flex justify-center mt-2">
                            <ArrowRight className="w-4 h-4 text-gray-400" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-4 text-center text-sm text-gray-600">
                    {editData.workflowStatus === 'DRAFT' && '초안 상태입니다. 결재를 위해 제출해주세요.'}
                    {editData.workflowStatus === 'IN_PROGRESS' && (
                      <>현재 단계: <strong>{getStepName(editData.currentStep)}</strong> 승인 대기</>
                    )}
                    {editData.workflowStatus === 'APPROVED' && '모든 단계의 승인이 완료되었습니다.'}
                    {editData.workflowStatus === 'REJECTED' && '결재 과정에서 반려되었습니다.'}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 제목 */}
            <div className="space-y-2">
              <Label htmlFor="title">
                제목 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                placeholder="지출결의서 제목을 입력하세요"
                {...register('title')}
                className={errors.title ? 'border-red-500' : ''}
              />
              {errors.title && (
                <p className="text-sm text-red-500">{errors.title.message}</p>
              )}
            </div>

            {/* 금액과 분류 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">
                  금액 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="0"
                  {...register('amount', { valueAsNumber: true })}
                  className={errors.amount ? 'border-red-500' : ''}
                />
                {errors.amount && (
                  <p className="text-sm text-red-500">{errors.amount.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">
                  지출 분류 <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={watch('category')}
                  onValueChange={(value) => setValue('category', value)}
                >
                  <SelectTrigger className={errors.category ? 'border-red-500' : ''}>
                    <SelectValue placeholder="분류를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category && (
                  <p className="text-sm text-red-500">{errors.category.message}</p>
                )}
              </div>
            </div>

            {/* 설명 */}
            <div className="space-y-2">
              <Label htmlFor="description">설명</Label>
              <Textarea
                id="description"
                placeholder="지출에 대한 상세 설명을 입력하세요"
                rows={3}
                {...register('description')}
              />
            </div>

            {/* 영수증 업로드 */}
            <div className="space-y-2">
              <Label htmlFor="receipt">영수증 첨부</Label>
              <div className="space-y-2">
                {watchedReceiptUrl ? (
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4" />
                      <span className="text-sm truncate">
                        {watchedReceiptUrl.split('/').pop()}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveFile}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center w-full">
                    <label
                      htmlFor="receipt-upload"
                      className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 mb-4 text-gray-500" />
                        <p className="mb-2 text-sm text-gray-500">
                          <span className="font-semibold">클릭하여 업로드</span> 또는 드래그 앤 드롭
                        </p>
                        <p className="text-xs text-gray-500">
                          PNG, JPG, GIF, PDF (최대 10MB)
                        </p>
                      </div>
                      <input
                        id="receipt-upload"
                        type="file"
                        className="hidden"
                        onChange={handleFileUpload}
                        accept="image/*,application/pdf"
                        disabled={isUploading}
                      />
                    </label>
                  </div>
                )}
                {isUploading && (
                  <div className="text-sm text-blue-600">업로드 중...</div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              취소
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? '처리 중...' : (isEditing ? '수정' : '작성')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}