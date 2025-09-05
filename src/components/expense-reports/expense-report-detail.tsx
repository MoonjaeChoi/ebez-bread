'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc/client'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  User, 
  Calendar, 
  DollarSign, 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle,
  Download,
  ArrowRight,
  Shield,
  Send
} from 'lucide-react'
import { getRoleDisplayName } from '@/lib/permissions'
import { ReportStatus, WorkflowStatus } from '@prisma/client'
import { toast } from 'sonner'
import { ExpenseWorkflowApproval } from './expense-workflow-approval'

interface ExpenseReportDetailProps {
  isOpen: boolean
  onClose: () => void
  reportId: string
  showSubmitButton?: boolean
  useOrganizationApproval?: boolean
  stepId?: string // For organization-based approval
  onRefresh?: () => void
}

export function ExpenseReportDetail({ 
  isOpen, 
  onClose, 
  reportId,
  showSubmitButton = false,
  useOrganizationApproval = false,
  stepId,
  onRefresh
}: ExpenseReportDetailProps) {
  const [showWorkflowApproval, setShowWorkflowApproval] = useState(false)
  
  const { data: report, isLoading, refetch } = trpc.expenseReports.getById.useQuery(
    { id: reportId },
    { enabled: !!reportId && isOpen }
  )

  const { data: approvalPermission } = trpc.expenseReports.checkApprovalPermission.useQuery(
    { expenseReportId: reportId },
    { 
      enabled: !!reportId && isOpen && !!report && report.workflowStatus === 'IN_PROGRESS' && !useOrganizationApproval,
      refetchOnWindowFocus: false,
    }
  )
  
  // Get organization-based approval flow data
  const { data: approvalFlow } = trpc.approvals.getApprovalFlowByTransaction.useQuery(
    { transactionId: reportId },
    { enabled: !!reportId && isOpen && useOrganizationApproval }
  )

  const submitMutation = trpc.expenseReports.submit.useMutation({
    onSuccess: () => {
      toast.success('지출결의서가 제출되었습니다')
      refetch()
      onRefresh?.()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(amount)
  }

  const formatDate = (date: Date | null) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (status: ReportStatus) => {
    const statusConfig = {
      PENDING: { variant: 'secondary' as const, icon: Clock, text: '승인 대기', color: 'text-orange-600' },
      DEPARTMENT_APPROVED: { variant: 'outline' as const, icon: Clock, text: '부장 승인', color: 'text-blue-600' },
      APPROVED: { variant: 'default' as const, icon: CheckCircle, text: '승인됨', color: 'text-green-600' },
      REJECTED: { variant: 'destructive' as const, icon: XCircle, text: '반려됨', color: 'text-red-600' },
      PAID: { variant: 'secondary' as const, icon: CheckCircle, text: '지급완료', color: 'text-blue-600' },
    }

    const config = statusConfig[status]
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.text}
      </Badge>
    )
  }

  const getWorkflowStatusBadge = (workflowStatus: WorkflowStatus) => {
    switch (workflowStatus) {
      case 'DRAFT':
        return <Badge variant="outline">초안</Badge>
      case 'SUBMITTED':
        return <Badge variant="secondary">제출됨</Badge>
      case 'IN_PROGRESS':
        return <Badge variant="default" className="bg-yellow-600">승인 진행중</Badge>
      case 'APPROVED':
        return <Badge variant="default" className="bg-green-600">최종 승인</Badge>
      case 'REJECTED':
        return <Badge variant="destructive">반려</Badge>
      case 'CANCELLED':
        return <Badge variant="outline" className="text-gray-500">취소됨</Badge>
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

  const getStepIcon = (stepOrder: number, status: string, isCurrentStep: boolean) => {
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

  const handleSubmit = () => {
    if (!report) return
    submitMutation.mutate({ id: report.id })
  }

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <div className="text-center py-8">로딩 중...</div>
        </DialogContent>
      </Dialog>
    )
  }

  if (!report) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <div className="text-center py-8">지출결의서를 찾을 수 없습니다.</div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="w-5 h-5" />
              <span>지출결의서 상세 정보</span>
            </div>
            <div className="flex items-center space-x-2">
              {report.workflowStatus && getWorkflowStatusBadge(report.workflowStatus)}
              {getStatusBadge(report.status)}
            </div>
          </DialogTitle>
          <DialogDescription>
            {useOrganizationApproval 
              ? '조직 기반 자동 결재를 통한 지출결의서 상세 정보입니다.'
              : '3단계 전자결재 시스템을 통한 지출결의서 상세 정보입니다.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 결재 진행 상황 */}
          {((useOrganizationApproval && approvalFlow) || (!useOrganizationApproval && report.approvals && report.approvals.length > 0)) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Shield className="w-5 h-5" />
                  <span>결재 진행 상황</span>
                  {useOrganizationApproval && approvalFlow ? (
                    <Badge variant={approvalFlow.status === 'PENDING' ? 'secondary' : 
                                   approvalFlow.status === 'IN_PROGRESS' ? 'default' :
                                   approvalFlow.status === 'APPROVED' ? 'default' :
                                   approvalFlow.status === 'REJECTED' ? 'destructive' : 'outline'}>
                      {approvalFlow.status === 'PENDING' ? '대기' :
                       approvalFlow.status === 'IN_PROGRESS' ? '진행중' :
                       approvalFlow.status === 'APPROVED' ? '승인완료' :
                       approvalFlow.status === 'REJECTED' ? '반려' : '알 수 없음'}
                    </Badge>
                  ) : (
                    report.workflowStatus && getWorkflowStatusBadge(report.workflowStatus)
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {useOrganizationApproval && approvalFlow ? (
                  // Organization-based approval visualization
                  <div className="space-y-4">
                    <div className="flex items-center justify-between space-x-4 overflow-x-auto">
                      {approvalFlow.steps?.map((step, index) => (
                        <div key={step.id} className="flex-shrink-0">
                          <div className="text-center space-y-2">
                            <div className="flex justify-center">
                              {step.status === 'APPROVED' ? (
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              ) : step.status === 'REJECTED' ? (
                                <XCircle className="w-4 h-4 text-red-600" />
                              ) : approvalFlow.currentStep === step.stepOrder ? (
                                <Clock className="w-4 h-4 text-yellow-600" />
                              ) : (
                                <Clock className="w-4 h-4 text-gray-400" />
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{step.approverRole}</p>
                              <p className="text-xs text-gray-500">
                                {step.approver ? step.approver.name : '미배정'}
                              </p>
                              <p className="text-xs text-gray-400">
                                {step.organization ? step.organization.name : ''}
                              </p>
                              <p className="text-xs text-gray-500">
                                {step.status === 'APPROVED' ? '승인완료' :
                                 step.status === 'REJECTED' ? '반려' :
                                 approvalFlow.currentStep === step.stepOrder ? '승인대기' : '대기'}
                              </p>
                              {step.isRequired && (
                                <Badge variant="outline" className="text-xs mt-1">필수</Badge>
                              )}
                              {step.processedAt && (
                                <p className={`text-xs mt-1 ${
                                  step.status === 'APPROVED' ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {formatDate(new Date(step.processedAt))}
                                </p>
                              )}
                              {step.comments && (
                                <p className="text-xs text-gray-600 mt-1 p-1 bg-gray-100 rounded text-center">
                                  {step.comments}
                                </p>
                              )}
                            </div>
                          </div>
                          {index < approvalFlow.steps.length - 1 && (
                            <div className="flex justify-center mt-2">
                              <ArrowRight className="w-4 h-4 text-gray-400" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 text-center text-sm text-gray-600">
                      현재 단계: <strong>{approvalFlow.currentStep}/{approvalFlow.totalSteps}</strong>
                    </div>
                  </div>
                ) : (
                  // Legacy approval visualization
                  <div className="space-y-4">
                    <div className="flex items-center justify-between space-x-4">
                      {report.approvals?.map((approval, index) => (
                        <div key={approval.id} className="flex-1">
                          <div className="text-center space-y-2">
                            <div className="flex justify-center">
                              {getStepIcon(
                                approval.stepOrder, 
                                approval.status, 
                                report.currentStep === approval.stepOrder
                              )}
                            </div>
                            <div>
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
                              {approval.approvedAt && (
                                <p className="text-xs text-green-600 mt-1">
                                  {formatDate(new Date(approval.approvedAt))}
                                </p>
                              )}
                              {approval.rejectedAt && (
                                <p className="text-xs text-red-600 mt-1">
                                  {formatDate(new Date(approval.rejectedAt))}
                                </p>
                              )}
                              {approval.comment && (
                                <p className="text-xs text-gray-600 mt-1 p-1 bg-gray-100 rounded text-center">
                                  {approval.comment}
                                </p>
                              )}
                            </div>
                          </div>
                          {index < report.approvals.length - 1 && (
                            <div className="flex justify-center mt-2">
                              <ArrowRight className="w-4 h-4 text-gray-400" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 text-center text-sm text-gray-600">
                      {report.workflowStatus === 'DRAFT' && '초안 상태입니다. 결재를 위해 제출해주세요.'}
                      {report.workflowStatus === 'IN_PROGRESS' && (
                        <>현재 단계: <strong>{getStepName(report.currentStep)}</strong> 승인 대기</>
                      )}
                      {report.workflowStatus === 'APPROVED' && '모든 단계의 승인이 완료되었습니다.'}
                      {report.workflowStatus === 'REJECTED' && '결재 과정에서 반려되었습니다.'}
                    </div>
                  </div>
                )}

                {/* 제출/승인 버튼 */}
                <div className="mt-4 flex justify-center space-x-2">
                  {showSubmitButton && report.workflowStatus === 'DRAFT' && (
                    <Button 
                      onClick={handleSubmit}
                      disabled={submitMutation.isLoading}
                      className="flex items-center space-x-2"
                    >
                      <Send className="w-4 h-4" />
                      <span>{submitMutation.isLoading ? '제출 중...' : '결재 제출'}</span>
                    </Button>
                  )}
                  
                  {/* Legacy approval system */}
                  {!useOrganizationApproval && report.workflowStatus === 'IN_PROGRESS' && approvalPermission?.canApprove && (
                    <Button 
                      onClick={() => setShowWorkflowApproval(true)}
                      className="flex items-center space-x-2"
                    >
                      <Shield className="w-4 h-4" />
                      <span>승인 처리</span>
                    </Button>
                  )}
                  
                  {!useOrganizationApproval && report.workflowStatus === 'IN_PROGRESS' && approvalPermission && !approvalPermission.canApprove && (
                    <div className="text-center text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
                      <Shield className="w-4 h-4 mx-auto mb-1 text-gray-400" />
                      <p>{approvalPermission.message || '승인 권한이 없습니다'}</p>
                    </div>
                  )}
                  
                  {/* Organization-based approval system */}
                  {useOrganizationApproval && approvalFlow && approvalFlow.status === 'IN_PROGRESS' && stepId && (
                    <Button 
                      onClick={() => setShowWorkflowApproval(true)}
                      className="flex items-center space-x-2"
                    >
                      <Shield className="w-4 h-4" />
                      <span>승인 처리</span>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 기본 정보 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">기본 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-start space-x-2">
                    <User className="w-5 h-5 text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-600">신청자</p>
                      <p className="font-medium">{report.requester.name}</p>
                      <p className="text-xs text-gray-500">
                        {getRoleDisplayName(report.requester.role as any)}
                      </p>
                      <p className="text-xs text-gray-500">{report.requester.email}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start space-x-2">
                    <DollarSign className="w-5 h-5 text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-600">신청 금액</p>
                      <p className="font-bold text-xl text-blue-600">
                        {formatCurrency(Number(report.amount))}
                      </p>
                      <Badge variant="outline" className="mt-1">
                        {report.category}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-2">제목</p>
                <p className="font-medium text-lg">{report.title}</p>
              </div>

              {report.description && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">설명</p>
                  <p className="text-gray-800 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
                    {report.description}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 처리 이력 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">처리 이력</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-start space-x-2">
                  <Calendar className="w-5 h-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">신청일</p>
                    <p className="font-medium">{formatDate(new Date(report.requestDate))}</p>
                  </div>
                </div>

                {report.approvedDate && (
                  <div className="flex items-start space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-600">승인일</p>
                      <p className="font-medium">{formatDate(new Date(report.approvedDate))}</p>
                    </div>
                  </div>
                )}

                {report.rejectedDate && (
                  <div className="flex items-start space-x-2">
                    <XCircle className="w-5 h-5 text-red-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-600">반려일</p>
                      <p className="font-medium">{formatDate(new Date(report.rejectedDate))}</p>
                    </div>
                  </div>
                )}
              </div>

              {report.rejectionReason && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-red-800 mb-2">반려 사유</p>
                  <p className="text-sm text-red-700">{report.rejectionReason}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 첨부 파일 */}
          {report.receiptUrl && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">첨부 파일</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-6 h-6 text-gray-500" />
                    <div>
                      <p className="font-medium">
                        {report.receiptUrl.split('/').pop()}
                      </p>
                      <p className="text-sm text-gray-500">영수증 첨부파일</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.open(report.receiptUrl!, '_blank')}
                    >
                      미리보기
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        const link = document.createElement('a')
                        link.href = report.receiptUrl!
                        link.download = report.receiptUrl!.split('/').pop() || 'receipt'
                        link.click()
                      }}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      다운로드
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 현재 상태 안내 */}
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                {report.status === 'PENDING' && (
                  <div className="text-orange-600">
                    <Clock className="w-8 h-8 mx-auto mb-2" />
                    <p className="font-medium">승인 대기 중</p>
                    <p className="text-sm text-gray-500">관리자의 승인을 기다리고 있습니다.</p>
                  </div>
                )}
                {report.status === 'DEPARTMENT_APPROVED' && (
                  <div className="text-blue-600">
                    <Clock className="w-8 h-8 mx-auto mb-2" />
                    <p className="font-medium">부장 승인 완료</p>
                    <p className="text-sm text-gray-500">부서장 승인이 완료되었습니다. 위원장 승인을 기다리고 있습니다.</p>
                  </div>
                )}
                {report.status === 'APPROVED' && (
                  <div className="text-green-600">
                    <CheckCircle className="w-8 h-8 mx-auto mb-2" />
                    <p className="font-medium">승인 완료</p>
                    <p className="text-sm text-gray-500">지출결의서가 승인되었습니다. 지급을 기다리고 있습니다.</p>
                  </div>
                )}
                {report.status === 'REJECTED' && (
                  <div className="text-red-600">
                    <XCircle className="w-8 h-8 mx-auto mb-2" />
                    <p className="font-medium">반려됨</p>
                    <p className="text-sm text-gray-500">지출결의서가 반려되었습니다. 사유를 확인해 주세요.</p>
                  </div>
                )}
                {report.status === 'PAID' && (
                  <div className="text-blue-600">
                    <CheckCircle className="w-8 h-8 mx-auto mb-2" />
                    <p className="font-medium">지급 완료</p>
                    <p className="text-sm text-gray-500">지출결의서 처리가 완료되었습니다.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
      
      {/* 워크플로우 승인 다이얼로그 */}
      {showWorkflowApproval && (
        <ExpenseWorkflowApproval
          isOpen={showWorkflowApproval}
          onClose={() => setShowWorkflowApproval(false)}
          reportId={reportId}
          stepId={stepId}
          useOrganizationApproval={useOrganizationApproval}
          onSuccess={() => {
            refetch()
            onRefresh?.()
          }}
        />
      )}
    </Dialog>
  )
}