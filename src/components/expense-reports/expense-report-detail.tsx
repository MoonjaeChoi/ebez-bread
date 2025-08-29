'use client'

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
  Download
} from 'lucide-react'
import { getRoleDisplayName } from '@/lib/permissions'
import { ReportStatus } from '@prisma/client'

interface ExpenseReportDetailProps {
  isOpen: boolean
  onClose: () => void
  reportId: string
}

export function ExpenseReportDetail({ 
  isOpen, 
  onClose, 
  reportId 
}: ExpenseReportDetailProps) {
  const { data: report, isLoading } = trpc.expenseReports.getById.useQuery(
    { id: reportId },
    { enabled: !!reportId && isOpen }
  )

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
            지출결의서 상세 정보
            {getStatusBadge(report.status)}
          </DialogTitle>
          <DialogDescription>
            지출결의서의 상세 정보를 확인할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
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
    </Dialog>
  )
}