'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { trpc } from '@/lib/trpc/client'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, DollarSign, User, Calendar, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { getRoleDisplayName } from '@/lib/permissions'

const approvalFormSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'PAID']),
  rejectionReason: z.string().optional(),
})

type ApprovalFormData = z.infer<typeof approvalFormSchema>

interface ExpenseReportApprovalProps {
  isOpen: boolean
  onClose: () => void
  reportId: string
  onSuccess?: () => void
}

export function ExpenseReportApproval({ 
  isOpen, 
  onClose, 
  reportId,
  onSuccess 
}: ExpenseReportApprovalProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>('')

  const { data: report, isLoading: isLoadingReport } = trpc.expenseReports.getById.useQuery(
    { id: reportId },
    { enabled: !!reportId && isOpen }
  )

  const approveMutation = trpc.expenseReports.approve.useMutation({
    onSuccess: () => {
      const statusText: Record<string, string> = {
        APPROVED: '승인되었습니다',
        REJECTED: '반려되었습니다',
        PAID: '지급완료로 처리되었습니다'
      }
      const message = statusText[selectedStatus]
      
      toast.success(`지출결의서가 ${message}`)
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
  } = useForm<ApprovalFormData>({
    resolver: zodResolver(approvalFormSchema),
    defaultValues: {
      status: 'APPROVED',
      rejectionReason: '',
    },
  })

  const watchedStatus = watch('status')

  useEffect(() => {
    if (watchedStatus) {
      setSelectedStatus(watchedStatus)
    }
  }, [watchedStatus])

  const handleClose = () => {
    reset()
    setSelectedStatus('')
    onClose()
  }

  const onSubmit = (data: ApprovalFormData) => {
    // If rejecting, require rejection reason
    if (data.status === 'REJECTED' && !data.rejectionReason?.trim()) {
      toast.error('반려 사유를 입력해주세요')
      return
    }

    approveMutation.mutate({
      id: reportId,
      status: data.status,
      rejectionReason: data.rejectionReason,
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(amount)
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const isLoading = approveMutation.isLoading

  if (isLoadingReport) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent>
          <div className="text-center py-8">로딩 중...</div>
        </DialogContent>
      </Dialog>
    )
  }

  if (!report) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent>
          <div className="text-center py-8">지출결의서를 찾을 수 없습니다.</div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>지출결의서 승인 처리</DialogTitle>
          <DialogDescription>
            지출결의서를 검토하고 승인 또는 반려 처리해주세요.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 지출결의서 정보 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">지출결의서 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-600">신청자</p>
                      <p className="font-medium">{report.requester.name}</p>
                      <p className="text-xs text-gray-500">
                        {getRoleDisplayName(report.requester.role as any)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-600">신청일</p>
                      <p className="font-medium">{formatDate(new Date(report.requestDate))}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="w-4 h-4 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-600">신청 금액</p>
                      <p className="font-bold text-lg text-blue-600">
                        {formatCurrency(Number(report.amount))}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4" />
                    <div>
                      <p className="text-sm text-gray-600">지출 분류</p>
                      <Badge variant="outline">{report.category}</Badge>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-2">제목</p>
                <p className="font-medium">{report.title}</p>
              </div>

              {report.description && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">설명</p>
                  <p className="text-gray-800 whitespace-pre-wrap">{report.description}</p>
                </div>
              )}

              {report.receiptUrl && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">첨부 영수증</p>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg bg-gray-50">
                    <FileText className="w-4 h-4" />
                    <span className="text-sm">
                      {report.receiptUrl.split('/').pop()}
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => window.open(report.receiptUrl!, '_blank')}
                    >
                      보기
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 승인 처리 폼 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">승인 처리</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-3">
                  <Label>처리 결과</Label>
                  <RadioGroup
                    value={watchedStatus}
                    onValueChange={(value) => setValue('status', value as any)}
                    className="space-y-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="APPROVED" id="approved" />
                      <Label htmlFor="approved" className="flex items-center space-x-2 cursor-pointer">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span>승인</span>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="PAID" id="paid" />
                      <Label htmlFor="paid" className="flex items-center space-x-2 cursor-pointer">
                        <DollarSign className="w-4 h-4 text-blue-600" />
                        <span>지급 완료</span>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="REJECTED" id="rejected" />
                      <Label htmlFor="rejected" className="flex items-center space-x-2 cursor-pointer">
                        <XCircle className="w-4 h-4 text-red-600" />
                        <span>반려</span>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {watchedStatus === 'REJECTED' && (
                  <div className="space-y-2">
                    <Label htmlFor="rejectionReason">
                      반려 사유 <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id="rejectionReason"
                      placeholder="반려 사유를 상세히 입력해주세요"
                      rows={3}
                      {...register('rejectionReason')}
                      className={errors.rejectionReason ? 'border-red-500' : ''}
                    />
                    {errors.rejectionReason && (
                      <p className="text-sm text-red-500">{errors.rejectionReason.message}</p>
                    )}
                  </div>
                )}

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    <strong>안내:</strong>
                    {watchedStatus === 'APPROVED' && ' 승인 처리 시 재정 담당자에게 알림이 발송됩니다.'}
                    {watchedStatus === 'PAID' && ' 지급 완료 처리 시 신청자에게 완료 알림이 발송됩니다.'}
                    {watchedStatus === 'REJECTED' && ' 반려 처리 시 신청자에게 사유와 함께 알림이 발송됩니다.'}
                  </p>
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
                  <Button 
                    type="submit" 
                    disabled={isLoading || !watchedStatus}
                    className={
                      watchedStatus === 'APPROVED' ? 'bg-green-600 hover:bg-green-700' :
                      watchedStatus === 'PAID' ? 'bg-blue-600 hover:bg-blue-700' :
                      watchedStatus === 'REJECTED' ? 'bg-red-600 hover:bg-red-700' :
                      ''
                    }
                  >
                    {isLoading ? '처리 중...' : 
                     watchedStatus === 'APPROVED' ? '승인 처리' :
                     watchedStatus === 'PAID' ? '지급 완료 처리' :
                     watchedStatus === 'REJECTED' ? '반려 처리' :
                     '처리하기'}
                  </Button>
                </DialogFooter>
              </form>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}