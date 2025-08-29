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
import { Search, Plus, Edit, Trash2, Calendar, Users, MapPin, Clock, AlertCircle } from 'lucide-react'
import { VisitationForm } from '@/components/visitations/visitation-form'

export default function VisitationsPage() {
  const { data: session } = useSession()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [followUpFilter, setFollowUpFilter] = useState<boolean | ''>('')
  const [showForm, setShowForm] = useState(false)
  const [editingVisitationId, setEditingVisitationId] = useState<string | undefined>()

  const { data, isLoading, refetch } = trpc.visitations.getAll.useQuery({
    page,
    limit: 15,
    search: search || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    needsFollowUp: followUpFilter !== '' ? followUpFilter : undefined,
  })

  const { data: stats } = trpc.visitations.getStats.useQuery()
  const { data: upcomingFollowUps } = trpc.visitations.getUpcomingFollowUps.useQuery({ days: 7 })

  const handleSearch = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  const handleFollowUpFilterChange = (value: string) => {
    if (value === 'all') {
      setFollowUpFilter('')
    } else {
      setFollowUpFilter(value === 'true')
    }
    setPage(1)
  }

  const handleAdd = () => {
    setEditingVisitationId(undefined)
    setShowForm(true)
  }

  const handleEdit = (visitationId: string) => {
    setEditingVisitationId(visitationId)
    setShowForm(true)
  }

  const handleFormClose = () => {
    setShowForm(false)
    setEditingVisitationId(undefined)
  }

  const handleFormSuccess = () => {
    refetch()
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatDateTime = (date: Date) => {
    return new Date(date).toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getFollowUpBadge = (visitation: any) => {
    if (!(visitation as any).needsFollowUp) {
      return <Badge variant="secondary">완료</Badge>
    }
    
    if (visitation.followUpDate) {
      const isOverdue = new Date(visitation.followUpDate) < new Date()
      return (
        <Badge variant={isOverdue ? "destructive" : "default"}>
          {isOverdue ? "지연" : "예정"}
        </Badge>
      )
    }
    
    return <Badge variant="outline">후속조치 필요</Badge>
  }

  if (!session) {
    return <div>로그인이 필요합니다.</div>
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">심방 관리</h1>
          <p className="text-muted-foreground">교인 심방 계획 및 기록을 관리합니다</p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="w-4 h-4 mr-2" />
          심방 기록 추가
        </Button>
      </div>

      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="list">심방 목록</TabsTrigger>
          <TabsTrigger value="followups">후속조치</TabsTrigger>
          <TabsTrigger value="calendar">달력</TabsTrigger>
          <TabsTrigger value="stats">통계</TabsTrigger>
        </TabsList>

        {/* 심방 목록 탭 */}
        <TabsContent value="list" className="space-y-6">
          {/* Statistics Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">총 심방</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalVisitations}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.membersCovered}명 교인 대상
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">후속조치 필요</CardTitle>
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">{stats.followUpNeeded}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">완료된 심방</CardTitle>
                  <Users className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{stats.completedFollowUps}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">평균 심방</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats.averageVisitsPerMember.toFixed(1)}
                  </div>
                  <p className="text-xs text-muted-foreground">회/교인</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>검색 및 필터</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="교인명으로 검색..."
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              <Select value={followUpFilter.toString()} onValueChange={handleFollowUpFilterChange}>
                <SelectTrigger>
                  <SelectValue placeholder="후속조치 상태" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="true">후속조치 필요</SelectItem>
                  <SelectItem value="false">완료</SelectItem>
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
                  setFollowUpFilter('')
                  setStartDate('')
                  setEndDate('')
                  setPage(1)
                }}
              >
                초기화
              </Button>
            </CardContent>
          </Card>

          {/* Visitations Table */}
          <Card>
            <CardHeader>
              <CardTitle>심방 기록</CardTitle>
              <CardDescription>
                {data && `총 ${data.total}건의 심방 기록 (${data.currentPage}/${data.pages} 페이지)`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">로딩 중...</div>
              ) : data && data.visitations.length > 0 ? (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>심방일</TableHead>
                        <TableHead>교인명</TableHead>
                        <TableHead>목적</TableHead>
                        <TableHead>후속조치</TableHead>
                        <TableHead>후속조치일</TableHead>
                        <TableHead className="text-right">작업</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.visitations.map((visitation) => (
                        <TableRow key={visitation.id}>
                          <TableCell className="font-medium">
                            {formatDate(new Date(visitation.visitDate))}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{visitation.member.name}</div>
                              {visitation.member.phone && (
                                <div className="text-sm text-muted-foreground">
                                  {visitation.member.phone}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{visitation.purpose || '-'}</TableCell>
                          <TableCell>{getFollowUpBadge(visitation)}</TableCell>
                          <TableCell>
                            {visitation.followUpDate ? 
                              formatDate(new Date(visitation.followUpDate)) : '-'
                            }
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleEdit(visitation.id)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="w-4 h-4" />
                              </Button>
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
                  <MapPin className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">등록된 심방 기록이 없습니다.</p>
                  <Button className="mt-4" onClick={handleAdd}>
                    <Plus className="w-4 h-4 mr-2" />
                    첫 심방 기록 추가하기
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 후속조치 탭 */}
        <TabsContent value="followups">
          <Card>
            <CardHeader>
              <CardTitle>예정된 후속조치</CardTitle>
              <CardDescription>향후 7일 내 후속조치가 필요한 심방들</CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingFollowUps && upcomingFollowUps.length > 0 ? (
                <div className="space-y-4">
                  {upcomingFollowUps.map((followUp) => (
                    <div key={followUp.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium">{followUp.member.name}</h4>
                          {followUp.followUpDate && new Date(followUp.followUpDate) < new Date() && (
                            <Badge variant="destructive">지연됨</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          후속조치 예정일: {followUp.followUpDate ? formatDate(new Date(followUp.followUpDate)) : '미정'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          원래 심방일: {formatDate(new Date(followUp.visitDate))}
                        </p>
                        {followUp.member.address && (
                          <p className="text-sm text-muted-foreground flex items-center">
                            <MapPin className="w-4 h-4 mr-1" />
                            {followUp.member.address}
                          </p>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline">
                          완료 처리
                        </Button>
                        <Button size="sm">
                          수정
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">예정된 후속조치가 없습니다.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 달력 탭 */}
        <TabsContent value="calendar">
          <Card>
            <CardHeader>
              <CardTitle>심방 달력</CardTitle>
              <CardDescription>월별 심방 일정과 후속조치를 확인할 수 있습니다</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center py-8 text-muted-foreground">
                달력 기능은 개발 중입니다.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 통계 탭 */}
        <TabsContent value="stats">
          <Card>
            <CardHeader>
              <CardTitle>심방 통계</CardTitle>
              <CardDescription>심방 현황과 관련 통계를 확인할 수 있습니다</CardDescription>
            </CardHeader>
            <CardContent>
              {stats ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-4">전체 통계</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>총 심방 기록:</span>
                        <span className="font-medium">{stats.totalVisitations}건</span>
                      </div>
                      <div className="flex justify-between">
                        <span>심방받은 교인:</span>
                        <span className="font-medium">{stats.membersCovered}명</span>
                      </div>
                      <div className="flex justify-between">
                        <span>후속조치 필요:</span>
                        <span className="font-medium text-orange-600">{stats.followUpNeeded}건</span>
                      </div>
                      <div className="flex justify-between">
                        <span>완료된 심방:</span>
                        <span className="font-medium text-green-600">{stats.completedFollowUps}건</span>
                      </div>
                      <div className="flex justify-between">
                        <span>평균 심방 수:</span>
                        <span className="font-medium">{stats.averageVisitsPerMember.toFixed(1)}회/교인</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-4">심방 목적별</h4>
                    <div className="space-y-2">
                      {stats.purposeStats.map((purpose) => (
                        <div key={purpose.purpose} className="flex justify-between">
                          <span>{purpose.purpose}:</span>
                          <span className="font-medium">{purpose._count}건</span>
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

      <VisitationForm
        isOpen={showForm}
        onClose={handleFormClose}
        visitationId={editingVisitationId}
        onSuccess={handleFormSuccess}
      />
    </div>
  )
}