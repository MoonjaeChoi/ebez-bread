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
import { Search, Plus, Edit, Trash2, Calendar, DollarSign } from 'lucide-react'
import { OfferingType } from '@prisma/client'
import { OfferingForm } from '@/components/offerings/offering-form'

export default function OfferingsPage() {
  const { data: session } = useSession()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [offeringType, setOfferingType] = useState<OfferingType | 'ALL'>('ALL')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingOfferingId, setEditingOfferingId] = useState<string | undefined>()

  const { data, isLoading, refetch } = trpc.offerings.getAll.useQuery({
    page,
    limit: 15,
    search: search || undefined,
    offeringType: offeringType === 'ALL' ? undefined : offeringType,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  })

  const { data: stats } = trpc.offerings.getStats.useQuery({
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  })

  const handleSearch = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  const handleTypeChange = (value: string) => {
    setOfferingType(value as OfferingType | 'ALL')
    setPage(1)
  }

  const handleAdd = () => {
    setEditingOfferingId(undefined)
    setShowForm(true)
  }

  const handleEdit = (offeringId: string) => {
    setEditingOfferingId(offeringId)
    setShowForm(true)
  }

  const handleFormClose = () => {
    setShowForm(false)
    setEditingOfferingId(undefined)
  }

  const handleFormSuccess = () => {
    refetch()
  }

  const getOfferingTypeBadge = (type: OfferingType) => {
    const typeConfig = {
      [OfferingType.TITHE]: { label: '십일조', variant: 'default' as const },
      [OfferingType.SUNDAY_OFFERING]: { label: '주일헌금', variant: 'secondary' as const },
      [OfferingType.THANKSGIVING]: { label: '감사헌금', variant: 'outline' as const },
      [OfferingType.SPECIAL]: { label: '특별헌금', variant: 'destructive' as const },
      [OfferingType.MISSION]: { label: '선교헌금', variant: 'default' as const },
      [OfferingType.BUILDING]: { label: '건축헌금', variant: 'secondary' as const },
      [OfferingType.OTHER]: { label: '기타', variant: 'outline' as const },
    }

    const config = typeConfig[type]
    return (
      <Badge variant={config.variant}>
        {config.label}
      </Badge>
    )
  }

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount) + '원'
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (!session) {
    return <div>로그인이 필요합니다.</div>
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">헌금 관리</h1>
          <p className="text-muted-foreground">헌금 입력 및 관리를 할 수 있습니다</p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="w-4 h-4 mr-2" />
          헌금 입력
        </Button>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">총 헌금</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatAmount(stats.totalAmount)}</div>
              <p className="text-xs text-muted-foreground">
                총 {stats.totalCount}건
              </p>
            </CardContent>
          </Card>
          
          {/* Top offering types */}
          {stats.byType.slice(0, 3).map((typeStats, index) => (
            <Card key={typeStats.offeringType}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {getOfferingTypeBadge(typeStats.offeringType)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatAmount(Number(typeStats._sum.amount))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {typeStats._count}건
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>검색 및 필터</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="교인명, 설명으로 검색..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Select value={offeringType} onValueChange={handleTypeChange}>
            <SelectTrigger>
              <SelectValue placeholder="헌금 종류" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">전체</SelectItem>
              <SelectItem value={OfferingType.TITHE}>십일조</SelectItem>
              <SelectItem value={OfferingType.SUNDAY_OFFERING}>주일헌금</SelectItem>
              <SelectItem value={OfferingType.THANKSGIVING}>감사헌금</SelectItem>
              <SelectItem value={OfferingType.SPECIAL}>특별헌금</SelectItem>
              <SelectItem value={OfferingType.MISSION}>선교헌금</SelectItem>
              <SelectItem value={OfferingType.BUILDING}>건축헌금</SelectItem>
              <SelectItem value={OfferingType.OTHER}>기타</SelectItem>
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
              setOfferingType('ALL')
              setStartDate('')
              setEndDate('')
              setPage(1)
            }}
          >
            초기화
          </Button>
        </CardContent>
      </Card>

      {/* Offerings Table */}
      <Card>
        <CardHeader>
          <CardTitle>헌금 목록</CardTitle>
          <CardDescription>
            {data && `총 ${data.total}건의 헌금 기록 (${data.currentPage}/${data.pages} 페이지)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">로딩 중...</div>
          ) : data && data.offerings.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>날짜</TableHead>
                    <TableHead>교인명</TableHead>
                    <TableHead>헌금 종류</TableHead>
                    <TableHead>금액</TableHead>
                    <TableHead>설명</TableHead>
                    <TableHead className="text-right">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.offerings.map((offering) => (
                    <TableRow key={offering.id}>
                      <TableCell className="font-medium">
                        {formatDate(new Date(offering.offeringDate))}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{offering.member.name}</div>
                          {offering.member.phone && (
                            <div className="text-sm text-muted-foreground">
                              {offering.member.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getOfferingTypeBadge(offering.offeringType)}</TableCell>
                      <TableCell className="font-medium">
                        {formatAmount(Number(offering.amount))}
                      </TableCell>
                      <TableCell>{offering.description || '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleEdit(offering.id)}
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
              <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">등록된 헌금 기록이 없습니다.</p>
              <Button className="mt-4" onClick={handleAdd}>
                <Plus className="w-4 h-4 mr-2" />
                첫 헌금 입력하기
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <OfferingForm
        isOpen={showForm}
        onClose={handleFormClose}
        offeringId={editingOfferingId}
        onSuccess={handleFormSuccess}
      />
    </div>
  )
}