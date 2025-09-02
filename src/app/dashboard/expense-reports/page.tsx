'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { trpc } from '@/lib/trpc/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs'
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Clock, 
  CheckCircle,
  XCircle,
  Receipt,
  Globe,
  Target
} from 'lucide-react'
import { ExpenseReportForm } from '@/components/expense-reports/expense-report-form'
import { ExpenseReportApproval } from '@/components/expense-reports/expense-report-approval'
import { canApproveExpenses, getRoleDisplayName } from '@/lib/permissions'
import { ReportStatus } from '@prisma/client'

export default function ExpenseReportsPage() {
  const { data: session } = useSession()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [statusFilter, setStatusFilter] = useState<ReportStatus | ''>('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [editingReportId, setEditingReportId] = useState<string | undefined>()
  const [approvingReportId, setApprovingReportId] = useState<string | undefined>()

  const canApprove = session?.user ? canApproveExpenses(session.user.role as any) : false

  const { data, isLoading, refetch } = trpc.expenseReports.getAll.useQuery({
    page,
    limit: 15,
    search: search || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    status: statusFilter !== '' ? statusFilter : undefined,
    category: categoryFilter || undefined,
  })

  const { data: stats } = trpc.expenseReports.getStats.useQuery()
  const { data: pendingApprovals } = trpc.expenseReports.getPendingApprovals.useQuery(
    { limit: 5 },
    { enabled: canApprove }
  )
  const { data: myReports } = trpc.expenseReports.getMy.useQuery({ limit: 5 })
  const { data: categories } = trpc.expenseReports.getCategories.useQuery()

  const deleteMutation = trpc.expenseReports.delete.useMutation({
    onSuccess: () => {
      refetch()
    },
    onError: (error) => {
      alert(error.message)
    },
  })

  const handleSearch = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value === 'all' ? '' : value as ReportStatus)
    setPage(1)
  }

  const handleCategoryFilterChange = (value: string) => {
    setCategoryFilter(value === 'all' ? '' : value)
    setPage(1)
  }

  const handleAdd = () => {
    setEditingReportId(undefined)
    setShowForm(true)
  }

  const handleEdit = (reportId: string) => {
    setEditingReportId(reportId)
    setShowForm(true)
  }

  const handleApprove = (reportId: string) => {
    setApprovingReportId(reportId)
    setShowApprovalModal(true)
  }

  const handleDelete = async (reportId: string) => {
    if (confirm('정말로 이 지출결의서를 삭제하시겠습니까?')) {
      deleteMutation.mutate({ id: reportId })
    }
  }

  const handleFormClose = () => {
    setShowForm(false)
    setEditingReportId(undefined)
  }

  const handleApprovalClose = () => {
    setShowApprovalModal(false)
    setApprovingReportId(undefined)
  }

  const handleFormSuccess = () => {
    refetch()
  }

  const handleApprovalSuccess = () => {
    refetch()
  }

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(amount)
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

  if (!session) {
    return <div>로그인이 필요합니다.</div>
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">지출결의서 관리</h1>
          <p className="text-muted-foreground">지출결의서 작성, 승인 및 관리를 할 수 있습니다</p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="w-4 h-4 mr-2" />
          지출결의서 작성
        </Button>
      </div>

      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="list">전체 목록</TabsTrigger>
          <TabsTrigger value="my">내 결의서</TabsTrigger>
          {canApprove && <TabsTrigger value="approvals">승인 대기</TabsTrigger>}
          <TabsTrigger value="stats">통계</TabsTrigger>
        </TabsList>

        {/* 전체 목록 탭 */}
        <TabsContent value="list" className="space-y-6">
          {/* Statistics Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">총 결의서</CardTitle>
                  <Globe className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalReports}</div>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(stats.totalAmount)}
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">승인 대기</CardTitle>
                  <Clock className="h-4 w-4 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">{stats.pendingReports}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">승인됨</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{stats.approvedReports}</div>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(stats.approvedAmount)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">승인률</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats.approvalRate.toFixed(1)}%
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>검색 및 필터</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="제목, 신청자로 검색..."
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              <Select value={statusFilter.toString()} onValueChange={handleStatusFilterChange}>
                <SelectTrigger>
                  <SelectValue placeholder="상태" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="PENDING">승인 대기</SelectItem>
                  <SelectItem value="DEPARTMENT_APPROVED">부장 승인</SelectItem>
                  <SelectItem value="APPROVED">승인됨</SelectItem>
                  <SelectItem value="REJECTED">반려됨</SelectItem>
                  <SelectItem value="PAID">지급완료</SelectItem>
                </SelectContent>
              </Select>

              <Select value={categoryFilter} onValueChange={handleCategoryFilterChange}>
                <SelectTrigger>
                  <SelectValue placeholder="분류" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  {categories?.map(category => (
                    <SelectItem key={category.value} value={category.value}>{category.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                type="date"
                placeholder="시작일"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />

              <Input
                type="date"
                placeholder="종료일"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />

              <Button 
                variant="outline" 
                onClick={() => {
                  setSearch('')
                  setStatusFilter('')
                  setCategoryFilter('')
                  setStartDate('')
                  setEndDate('')
                  setPage(1)
                }}
              >
                초기화
              </Button>
            </CardContent>
          </Card>

          {/* Expense Reports Table */}
          <Card>
            <CardHeader>
              <CardTitle>지출결의서 목록</CardTitle>
              <CardDescription>
                {data && `총 ${data.total}건의 지출결의서 (${data.currentPage}/${data.pages} 페이지)`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">로딩 중...</div>
              ) : data && data.expenseReports.length > 0 ? (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>신청일</TableHead>
                        <TableHead>제목</TableHead>
                        <TableHead>신청자</TableHead>
                        <TableHead>분류</TableHead>
                        <TableHead>금액</TableHead>
                        <TableHead>상태</TableHead>
                        <TableHead className="text-right">작업</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.expenseReports.map((report) => (
                        <TableRow key={report.id}>
                          <TableCell className="font-medium">
                            {formatDate(report.requestDate)}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{report.title}</div>
                              {report.description && (
                                <div className="text-sm text-muted-foreground line-clamp-1">
                                  {report.description}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{(report as any).requester?.name || 'N/A'}</div>
                              <div className="text-sm text-muted-foreground">
                                {getRoleDisplayName((report as any).requester?.role as any) || '-'}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{report.category}</TableCell>
                          <TableCell className="font-mono">
                            {formatCurrency(Number(report.amount))}
                          </TableCell>
                          <TableCell>{getStatusBadge(report.status)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              {(report.requesterId === session.user.id || canApprove) && (
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleEdit(report.id)}
                                  disabled={report.status !== 'PENDING'}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                              )}
                              {(report as any).canApproveCurrentStep && (
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleApprove(report.id)}
                                  title="승인 처리"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                              )}
                              {(report.requesterId === session.user.id || canApprove) && 
                               report.status !== 'APPROVED' && report.status !== 'PAID' && (
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleDelete(report.id)}
                                  disabled={deleteMutation.isPending}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Pagination */}
                  {data.pages > 1 && (
                    <div className="flex justify-center items-center space-x-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(page - 1)}
                        disabled={page <= 1}
                      >
                        이전
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        {page} / {data.pages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(page + 1)}
                        disabled={page >= data.pages}
                      >
                        다음
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <Receipt className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">등록된 지출결의서가 없습니다.</p>
                  <Button className="mt-4" onClick={handleAdd}>
                    <Plus className="w-4 h-4 mr-2" />
                    첫 지출결의서 작성하기
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 내 결의서 탭 */}
        <TabsContent value="my" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>내 지출결의서</CardTitle>
              <CardDescription>내가 작성한 지출결의서 목록입니다</CardDescription>
            </CardHeader>
            <CardContent>
              {myReports && myReports.expenseReports.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>신청일</TableHead>
                      <TableHead>제목</TableHead>
                      <TableHead>분류</TableHead>
                      <TableHead>금액</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead className="text-right">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myReports.expenseReports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell className="font-medium">
                          {formatDate(report.requestDate)}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{report.title}</div>
                            {report.description && (
                              <div className="text-sm text-muted-foreground line-clamp-1">
                                {report.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{report.category}</TableCell>
                        <TableCell className="font-mono">
                          {formatCurrency(Number(report.amount))}
                        </TableCell>
                        <TableCell>{getStatusBadge(report.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleEdit(report.id)}
                              disabled={report.status !== 'PENDING'}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            {report.status !== 'APPROVED' && report.status !== 'PAID' && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleDelete(report.id)}
                                disabled={deleteMutation.isPending}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <Receipt className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">작성한 지출결의서가 없습니다.</p>
                  <Button className="mt-4" onClick={handleAdd}>
                    <Plus className="w-4 h-4 mr-2" />
                    지출결의서 작성하기
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 승인 대기 탭 */}
        {canApprove && (
          <TabsContent value="approvals" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>승인 대기 목록</CardTitle>
                <CardDescription>승인이 필요한 지출결의서 목록입니다</CardDescription>
              </CardHeader>
              <CardContent>
                {pendingApprovals && pendingApprovals.expenseReports.length > 0 ? (
                  <div className="space-y-4">
                    {pendingApprovals.expenseReports.map((report) => (
                      <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium">{report.title}</h4>
                            <Badge variant="secondary">
                              {formatCurrency(Number(report.amount))}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            신청자: {(report as any).requester?.name || 'N/A'} | 분류: {report.category}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            신청일: {formatDate(report.requestDate)}
                          </p>
                          {report.description && (
                            <p className="text-sm text-muted-foreground">
                              {report.description}
                            </p>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          {(report as any).canApproveCurrentStep ? (
                            <Button 
                              size="sm" 
                              onClick={() => handleApprove(report.id)}
                            >
                              승인 처리
                            </Button>
                          ) : (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              disabled
                              title="현재 단계의 승인 권한이 없습니다"
                            >
                              승인 권한 없음
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">승인 대기 중인 지출결의서가 없습니다.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* 통계 탭 */}
        <TabsContent value="stats">
          <Card>
            <CardHeader>
              <CardTitle>지출결의서 통계</CardTitle>
              <CardDescription>지출결의서 현황과 관련 통계를 확인할 수 있습니다</CardDescription>
            </CardHeader>
            <CardContent>
              {stats ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-4">전체 통계</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>총 결의서 수:</span>
                        <span className="font-medium">{stats.totalReports}건</span>
                      </div>
                      <div className="flex justify-between">
                        <span>총 신청 금액:</span>
                        <span className="font-medium">{formatCurrency(stats.totalAmount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>승인된 금액:</span>
                        <span className="font-medium text-green-600">{formatCurrency(stats.approvedAmount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>지급된 금액:</span>
                        <span className="font-medium text-blue-600">{formatCurrency(stats.paidAmount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>평균 신청 금액:</span>
                        <span className="font-medium">{formatCurrency(stats.averageAmount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>승인률:</span>
                        <span className="font-medium">{stats.approvalRate.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-4">분류별 통계</h4>
                    <div className="space-y-2">
                      {stats.categoryStats.map((category) => (
                        <div key={category.category} className="flex justify-between">
                          <span>{category.category}:</span>
                          <span className="font-medium">
                            {Number(category.count) || 0}건 ({formatCurrency(Number(category.amount) || 0)})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">통계를 불러오는 중...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ExpenseReportForm
        isOpen={showForm}
        onClose={handleFormClose}
        reportId={editingReportId}
        onSuccess={handleFormSuccess}
      />

      {showApprovalModal && approvingReportId && (
        <ExpenseReportApproval
          isOpen={showApprovalModal}
          onClose={handleApprovalClose}
          reportId={approvingReportId}
          onSuccess={handleApprovalSuccess}
        />
      )}
    </div>
  )
}