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
import { 
  CheckCircle, 
  XCircle, 
  DollarSign, 
  User, 
  Calendar, 
  FileText,
  ArrowRight,
  Clock,
  Shield
} from 'lucide-react'
import { toast } from 'sonner'
import { getRoleDisplayName } from '@/lib/permissions'

const workflowApprovalSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT']),
  comment: z.string().optional(),
})

type WorkflowApprovalData = z.infer<typeof workflowApprovalSchema>

interface ExpenseWorkflowApprovalProps {
  isOpen: boolean
  onClose: () => void
  reportId: string
  onSuccess?: () => void
}

export function ExpenseWorkflowApproval({ 
  isOpen, 
  onClose, 
  reportId,
  onSuccess 
}: ExpenseWorkflowApprovalProps) {
  const [selectedAction, setSelectedAction] = useState<string>('')

  const { data: report, isLoading: isLoadingReport } = trpc.expenseReports.getById.useQuery(
    { id: reportId },
    { enabled: !!reportId && isOpen }
  )

  const workflowApproveMutation = trpc.expenseReports.approveWorkflowStep.useMutation({
    onSuccess: () => {
      const actionText = selectedAction === 'APPROVE' ? '승인되었습니다' : '반려되었습니다'
      toast.success(`지출결의서가 ${actionText}`)
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
  } = useForm<WorkflowApprovalData>({
    resolver: zodResolver(workflowApprovalSchema),
    defaultValues: {
      action: 'APPROVE',
      comment: '',
    },
  })

  const watchedAction = watch('action')

  useEffect(() => {
    if (watchedAction) {
      setSelectedAction(watchedAction)
    }
  }, [watchedAction])

  const handleClose = () => {
    reset()
    setSelectedAction('')
    onClose()
  }

  const onSubmit = (data: WorkflowApprovalData) => {
    // If rejecting, require comment
    if (data.action === 'REJECT' && !data.comment?.trim()) {
      toast.error('반려 사유를 입력해주세요')
      return
    }

    workflowApproveMutation.mutate({
      expenseReportId: reportId,
      action: data.action,
      comment: data.comment,
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

  const getWorkflowStatusBadge = (workflowStatus: string) => {
    switch (workflowStatus) {
      case 'DRAFT':
        return <Badge variant="secondary">초안</Badge>
      case 'IN_PROGRESS':
        return <Badge variant="default" className="bg-yellow-600">승인 진행중</Badge>
      case 'APPROVED':
        return <Badge variant="default" className="bg-green-600">최종 승인</Badge>
      case 'REJECTED':
        return <Badge variant="destructive">반려</Badge>
      default:
        return <Badge variant="outline">{workflowStatus}</Badge>
    }
  }

  const getStepName = (stepOrder: number) => {
    switch (stepOrder) {
      case 1: return '부서회계'
      case 2: return '부장'
      case 3: return '위원장'
      default: return '알 수 없음'
    }
  }

  const getStepIcon = (stepOrder: number, status: string) => {
    const iconClass = "w-4 h-4"
    
    if (status === 'APPROVED') {
      return <CheckCircle className={`${iconClass} text-green-600`} />
    } else if (status === 'REJECTED') {
      return <XCircle className={`${iconClass} text-red-600`} />
    } else {
      return <Clock className={`${iconClass} text-gray-400`} />
    }
  }

  const isLoading = workflowApproveMutation.isLoading

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
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Shield className="w-5 h-5" />
            <span>전자결재 승인 처리</span>
          </DialogTitle>
          <DialogDescription>
            3단계 전자결재 시스템에 따른 지출결의서 승인을 처리해주세요.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 워크플로우 진행 상태 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <span>결재 진행 상황</span>
                {getWorkflowStatusBadge(report.workflowStatus)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between space-x-4">
                {report.approvals?.map((approval, index) => (
                  <div key={approval.id} className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      {getStepIcon(approval.stepOrder, approval.status)}
                      <div className="text-center">
                        <p className="text-sm font-medium">
                          {getStepName(approval.stepOrder)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {approval.status === 'APPROVED' ? '승인 완료' :
                           approval.status === 'REJECTED' ? '반려' :
                           report.currentStep === approval.stepOrder ? '승인 대기' : '대기'}
                        </p>
                        {approval.approver && (
                          <p className="text-xs text-gray-600 mt-1">
                            {approval.approver.name}
                          </p>
                        )}
                      </div>
                    </div>
                    {index < report.approvals.length - 1 && (
                      <div className="flex justify-center">
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              <div className="mt-4 text-center text-sm text-gray-600">
                현재 단계: <strong>{getStepName(report.currentStep)}</strong> 승인 대기
              </div>
            </CardContent>
          </Card>

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
                    value={watchedAction}
                    onValueChange={(value) => setValue('action', value as any)}
                    className="space-y-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="APPROVE" id="approve" />
                      <Label htmlFor="approve" className="flex items-center space-x-2 cursor-pointer">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span>승인</span>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="REJECT" id="reject" />
                      <Label htmlFor="reject" className="flex items-center space-x-2 cursor-pointer">
                        <XCircle className="w-4 h-4 text-red-600" />
                        <span>반려</span>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="comment">
                    승인/반려 의견 {watchedAction === 'REJECT' && <span className="text-red-500">*</span>}
                  </Label>
                  <Textarea
                    id="comment"
                    placeholder={
                      watchedAction === 'REJECT' 
                        ? "반려 사유를 상세히 입력해주세요" 
                        : "승인 의견을 입력하세요 (선택사항)"
                    }
                    rows={3}
                    {...register('comment')}
                    className={errors.comment ? 'border-red-500' : ''}
                  />
                  {errors.comment && (
                    <p className="text-sm text-red-500">{errors.comment.message}</p>
                  )}
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>안내:</strong>
                    {watchedAction === 'APPROVE' && ' 승인 시 다음 단계 승인자에게 알림이 발송됩니다. 최종 단계일 경우 신청자에게 승인 완료 알림이 발송됩니다.'}
                    {watchedAction === 'REJECT' && ' 반려 처리 시 신청자에게 사유와 함께 알림이 발송되며, 전체 결재 과정이 종료됩니다.'}
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
                    disabled={isLoading || !watchedAction}
                    className={
                      watchedAction === 'APPROVE' ? 'bg-green-600 hover:bg-green-700' :
                      watchedAction === 'REJECT' ? 'bg-red-600 hover:bg-red-700' :
                      ''
                    }
                  >
                    {isLoading ? '처리 중...' : 
                     watchedAction === 'APPROVE' ? '승인 처리' :
                     watchedAction === 'REJECT' ? '반려 처리' :
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