'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarInitials } from '@/components/ui/avatar'
import { CheckCircle, XCircle, Clock, User, Building2, Receipt, Calendar } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { TransactionApprovalStepWithDetails } from '@/types/approval'

const approvalFormSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT']),
  comments: z.string().optional(),
})

type ApprovalFormData = z.infer<typeof approvalFormSchema>

interface ApprovalProcessModalProps {
  isOpen: boolean
  onClose: () => void
  approval: TransactionApprovalStepWithDetails | null
  isProcessing: boolean
  onProcess: (data: { action: 'APPROVE' | 'REJECT'; comments?: string }) => Promise<void>
}

export function ApprovalProcessModal({
  isOpen,
  onClose,
  approval,
  isProcessing,
  onProcess
}: ApprovalProcessModalProps) {
  const [selectedAction, setSelectedAction] = useState<'APPROVE' | 'REJECT' | null>(null)

  const form = useForm<ApprovalFormData>({
    resolver: zodResolver(approvalFormSchema),
    defaultValues: {
      comments: '',
    },
  })

  const { watch, reset } = form

  const handleSubmit = async (data: ApprovalFormData) => {
    if (!selectedAction) return

    try {
      await onProcess({
        action: selectedAction,
        comments: data.comments,
      })
      
      reset()
      setSelectedAction(null)
      onClose()
    } catch (error) {
      console.error('Approval process error:', error)
    }
  }

  const handleClose = () => {
    reset()
    setSelectedAction(null)
    onClose()
  }

  if (!approval) return null

  const { flow } = approval
  const transaction = flow?.transaction
  const requester = (flow as any)?.requester || { name: '알 수 없음' }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            결재 처리
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 지출 정보 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">지출 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-gray-600">금액</div>
                  <div className="text-xl font-bold text-gray-900">
                    {formatCurrency(Number(flow?.amount || 0))}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-600">카테고리</div>
                  <Badge variant="outline">{flow?.category || 'N/A'}</Badge>
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-gray-600 mb-2">설명</div>
                <p className="text-gray-900">{transaction?.description || '설명 없음'}</p>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">
                    요청자: <span className="font-medium">{requester.name}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">
                    조직: <span className="font-medium">{(flow as any)?.organization?.name || '알 수 없음'}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">
                    요청일: <span className="font-medium">{formatDate(flow?.createdAt || new Date())}</span>
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 결재 진행 현황 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">결재 진행 현황</CardTitle>
              <CardDescription>
                {flow?.currentStep || 1}/{flow?.totalSteps || 1} 단계 진행 중
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {((flow as any)?.steps || []).map((step: any, index: number) => (
                  <div key={step.id} className="flex items-center gap-3">
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                      ${step.id === approval.id
                        ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                        : step.status === 'APPROVED'
                        ? 'bg-green-100 text-green-700'
                        : step.status === 'REJECTED'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-gray-100 text-gray-500'
                      }
                    `}>
                      {step.status === 'APPROVED' ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : step.status === 'REJECTED' ? (
                        <XCircle className="h-4 w-4" />
                      ) : step.id === approval.id ? (
                        <Clock className="h-4 w-4" />
                      ) : (
                        index + 1
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback>
                            <AvatarInitials name={step.approver?.name || 'N'} />
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{step.approver?.name || '알 수 없음'}</span>
                        <Badge variant="outline" className="text-xs">
                          {step.approverRole || 'N/A'}
                        </Badge>
                        {step.id === approval.id && (
                          <Badge variant="default" className="text-xs">
                            현재 결재자
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {step.organization?.name || '알 수 없음'}
                        {step.processedAt && (
                          <span className="ml-2">
                            • {formatDate(step.processedAt)}
                          </span>
                        )}
                      </div>
                      {step.comments && (
                        <div className="text-sm text-gray-700 mt-1 p-2 bg-gray-50 rounded">
                          {step.comments}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 결재 처리 폼 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">결재 처리</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                  {/* 승인/반려 선택 */}
                  <div className="space-y-3">
                    <FormLabel>결재 결정</FormLabel>
                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant={selectedAction === 'APPROVE' ? 'default' : 'outline'}
                        onClick={() => {
                          setSelectedAction('APPROVE')
                          form.setValue('action', 'APPROVE')
                        }}
                        className="flex-1"
                        disabled={isProcessing}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        승인
                      </Button>
                      <Button
                        type="button"
                        variant={selectedAction === 'REJECT' ? 'destructive' : 'outline'}
                        onClick={() => {
                          setSelectedAction('REJECT')
                          form.setValue('action', 'REJECT')
                        }}
                        className="flex-1"
                        disabled={isProcessing}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        반려
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  {/* 의견 입력 */}
                  <FormField
                    control={form.control}
                    name="comments"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          결재 의견 
                          {selectedAction === 'REJECT' && (
                            <span className="text-red-500 ml-1">*</span>
                          )}
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder={
                              selectedAction === 'REJECT'
                                ? "반려 사유를 입력해주세요."
                                : "결재 의견을 입력해주세요. (선택사항)"
                            }
                            rows={4}
                            disabled={isProcessing}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleClose}
            disabled={isProcessing}
          >
            취소
          </Button>
          <Button
            onClick={form.handleSubmit(handleSubmit)}
            disabled={!selectedAction || isProcessing || (selectedAction === 'REJECT' && !watch('comments'))}
            className={selectedAction === 'REJECT' ? 'bg-red-600 hover:bg-red-700' : ''}
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                처리 중...
              </>
            ) : (
              selectedAction === 'APPROVE' ? '승인 처리' : '반려 처리'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}