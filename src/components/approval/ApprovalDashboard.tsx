'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarInitials } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Search,
  Filter,
  User,
  Building2,
  Calendar,
  Receipt,
  TrendingUp,
  Timer
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { trpc } from '@/lib/trpc/client'
import { ApprovalProcessModal } from './ApprovalProcessModal'
import { useToast } from '@/hooks/use-toast'
import type { TransactionApprovalStepWithDetails, ApprovalFlowWithDetails } from '@/types/approval'

interface ApprovalDashboardProps {
  userId: string
}

export function ApprovalDashboard({ userId }: ApprovalDashboardProps) {
  const { toast } = useToast()
  const [selectedApproval, setSelectedApproval] = useState<TransactionApprovalStepWithDetails | null>(null)
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')

  // 대기 중인 결재 목록 조회
  const { 
    data: pendingApprovalsData, 
    isLoading: isLoadingPending,
    refetch: refetchPending 
  } = trpc.approvals.getPendingApprovals.useQuery({
    status: statusFilter !== 'all' ? statusFilter as any : undefined,
    priority: priorityFilter !== 'all' ? priorityFilter as any : undefined,
    page: 1,
    limit: 20
  })

  const pendingApprovals = pendingApprovalsData?.approvals || []

  // 내 요청 현황 조회
  const { 
    data: myRequestsData, 
    isLoading: isLoadingRequests,
    refetch: refetchRequests 
  } = trpc.approvals.getMyRequests.useQuery({
    page: 1,
    limit: 10
  })

  const myRequests = myRequestsData?.requests || []

  // 결재 통계 조회
  const { 
    data: approvalStats, 
    isLoading: isLoadingStats 
  } = trpc.approvals.getApprovalStats.useQuery({})

  // 결재 처리 뮤테이션
  const processApprovalMutation = trpc.approvals.processApproval.useMutation({
    onSuccess: (result) => {
      toast({
        title: "결재 처리 완료",
        description: result.message,
      })
      refetchPending()
      refetchRequests()
    },
    onError: (error) => {
      toast({
        title: "처리 실패",
        description: error.message,
        variant: "destructive"
      })
    }
  })

  const handleProcessApproval = async (data: { action: 'APPROVE' | 'REJECT'; comments?: string }) => {
    if (!selectedApproval) return

    await processApprovalMutation.mutateAsync({
      stepId: selectedApproval.id,
      action: data.action,
      comments: data.comments
    })
  }

  const handleApprovalClick = (approval: TransactionApprovalStepWithDetails) => {
    setSelectedApproval(approval)
    setIsProcessModalOpen(true)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'APPROVED':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'REJECTED':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'IN_PROGRESS':
        return <AlertCircle className="h-4 w-4 text-blue-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'secondary'
      case 'APPROVED':
        return 'default'
      case 'REJECTED':
        return 'destructive'
      case 'IN_PROGRESS':
        return 'outline'
      default:
        return 'secondary'
    }
  }

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'destructive'
      case 'HIGH':
        return 'default'
      case 'NORMAL':
        return 'outline'
      case 'LOW':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  const filteredPendingApprovals = pendingApprovals?.filter(approval => {
    const matchesSearch = approval.flow?.transaction?.description
      ?.toLowerCase()
      ?.includes(searchTerm.toLowerCase()) ||
      approval.approver?.name?.toLowerCase()?.includes(searchTerm.toLowerCase()) ||
      false
    
    const matchesStatus = statusFilter === 'all' || approval.status === statusFilter
    const matchesPriority = priorityFilter === 'all' || approval.flow?.priority === priorityFilter
    
    return matchesSearch && matchesStatus && matchesPriority
  })

  if (isLoadingPending || isLoadingRequests || isLoadingStats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">대기 중인 결재</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingApprovals?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              총 {formatCurrency((pendingApprovals || []).reduce((sum, a) => sum + Number(a.flow.amount), 0))}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 결재 건수</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvalStats?.totalCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              최근 30일 기준
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">평균 결재 시간</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvalStats?.avgApprovalTime || 0}시간</div>
            <p className="text-xs text-muted-foreground">
              완료된 건수 기준
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">결재 승인율</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvalStats?.approvalRate || 0}%</div>
            <p className="text-xs text-muted-foreground">
              완료된 건수 기준
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 대기 중인 결재 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                결재 대기 ({filteredPendingApprovals?.length || 0})
              </CardTitle>
              <CardDescription>
                내가 결재해야 할 항목들입니다.
              </CardDescription>
            </div>
            
            {/* 필터 및 검색 */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="상태" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="PENDING">대기</SelectItem>
                  <SelectItem value="IN_PROGRESS">진행중</SelectItem>
                </SelectContent>
              </Select>

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="우선순위" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="URGENT">긴급</SelectItem>
                  <SelectItem value="HIGH">높음</SelectItem>
                  <SelectItem value="NORMAL">보통</SelectItem>
                  <SelectItem value="LOW">낮음</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredPendingApprovals && filteredPendingApprovals.length > 0 ? (
            <div className="space-y-4">
              {filteredPendingApprovals.map((approval) => (
                <Card key={approval.id} className="cursor-pointer hover:bg-gray-50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <Receipt className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">
                            {approval.flow?.transaction?.description || '제목 없음'}
                          </span>
                          <Badge variant={getPriorityBadgeVariant(approval.flow?.priority || 'NORMAL')}>
                            {approval.flow?.priority || 'NORMAL'}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            요청자
                          </div>
                          <div className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            조직
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(approval.flow?.createdAt || approval.createdAt)}
                          </div>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(approval.flow?.status || approval.status)}
                            {approval.flow?.currentStep || 1}/{approval.flow?.totalSteps || 1} 단계
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-lg font-semibold">
                            {formatCurrency(Number(approval.flow?.amount || 0))}
                          </div>
                          <Badge variant={getStatusBadgeVariant(approval.flow?.status || approval.status)}>
                            {approval.flow?.status || approval.status}
                          </Badge>
                        </div>
                        
                        <Button 
                          onClick={() => handleApprovalClick(approval as any)}
                          size="sm"
                        >
                          결재하기
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              대기 중인 결재가 없습니다.
            </div>
          )}
        </CardContent>
      </Card>

      {/* 내 요청 현황 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            내 요청 현황 ({myRequests?.length || 0})
          </CardTitle>
          <CardDescription>
            내가 요청한 지출결의서의 결재 진행 상황입니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {myRequests && myRequests.length > 0 ? (
            <div className="space-y-4">
              {myRequests.slice(0, 5).map((request) => (
                <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <div className="font-medium">{request.transaction?.description || '제목 없음'}</div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>{formatCurrency(Number(request.amount || 0))}</span>
                      <span>{formatDate(request.createdAt)}</span>
                      <span>{request.currentStep || 1}/{request.totalSteps || 1} 단계</span>
                    </div>
                  </div>
                  <Badge variant={getStatusBadgeVariant(request.status)}>
                    {request.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              요청한 지출결의서가 없습니다.
            </div>
          )}
        </CardContent>
      </Card>

      {/* 결재 처리 모달 */}
      <ApprovalProcessModal
        isOpen={isProcessModalOpen}
        onClose={() => {
          setIsProcessModalOpen(false)
          setSelectedApproval(null)
        }}
        approval={selectedApproval}
        isProcessing={processApprovalMutation.isLoading}
        onProcess={handleProcessApproval}
      />
    </div>
  )
}