'use client'

import { useState, useEffect } from 'react'
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
import { Upload, FileText, Trash2 } from 'lucide-react'
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

export function ExpenseReportForm({ 
  isOpen, 
  onClose, 
  reportId,
  onSuccess 
}: ExpenseReportFormProps) {
  const [isUploading, setIsUploading] = useState(false)
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
    control,
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
    onClose()
  }

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

  const isLoading = createMutation.isLoading || updateMutation.isLoading

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
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