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
import { Search, Plus, Edit, Trash2, Eye } from 'lucide-react'
import { MemberStatus, Gender, MaritalStatus } from '@prisma/client'
import { MemberForm } from '@/components/members/member-form'
import { DashboardLayout } from '@/components/layout'

export default function MembersPage() {
  const { data: session } = useSession()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<MemberStatus | ''>('')
  const [showForm, setShowForm] = useState(false)
  const [editingMemberId, setEditingMemberId] = useState<string | undefined>()

  const { data, isLoading, error, refetch } = trpc.members.getAll.useQuery({
    page,
    limit: 10,
    search: search || undefined,
    status: status || undefined,
  }, {
    retry: false,
    refetchOnWindowFocus: false
  })

  const { data: stats, error: statsError } = trpc.members.getStats.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false
  })

  const handleSearch = (value: string) => {
    setSearch(value)
    setPage(1) // Reset to first page when searching
  }

  const handleStatusChange = (value: string) => {
    setStatus(value === 'ALL' ? '' : value as MemberStatus)
    setPage(1)
  }

  const handleAdd = () => {
    setEditingMemberId(undefined)
    setShowForm(true)
  }

  const handleEdit = (memberId: string) => {
    setEditingMemberId(memberId)
    setShowForm(true)
  }

  const handleFormClose = () => {
    setShowForm(false)
    setEditingMemberId(undefined)
  }

  const handleFormSuccess = () => {
    refetch()
  }

  const getStatusBadge = (status: MemberStatus) => {
    const variants = {
      [MemberStatus.ACTIVE]: 'default',
      [MemberStatus.INACTIVE]: 'secondary',
      [MemberStatus.TRANSFERRED]: 'outline',
      [MemberStatus.DECEASED]: 'destructive',
    } as const

    const labels = {
      [MemberStatus.ACTIVE]: '활동',
      [MemberStatus.INACTIVE]: '비활동',
      [MemberStatus.TRANSFERRED]: '전출',
      [MemberStatus.DECEASED]: '소천',
    }

    return (
      <Badge variant={variants[status]}>
        {labels[status]}
      </Badge>
    )
  }

  const getGenderLabel = (gender: Gender | null) => {
    if (!gender) return '-'
    return gender === Gender.MALE ? '남' : '여'
  }

  const getMaritalStatusLabel = (status: MaritalStatus | null) => {
    if (!status) return '-'
    const labels = {
      [MaritalStatus.SINGLE]: '미혼',
      [MaritalStatus.MARRIED]: '기혼',
      [MaritalStatus.DIVORCED]: '이혼',
      [MaritalStatus.WIDOWED]: '사별',
    }
    return labels[status]
  }

  if (!session) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-muted-foreground">로그인이 필요합니다.</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col space-y-2 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">교인 관리</h1>
            <p className="text-muted-foreground">교인 정보를 효율적으로 관리하고 조회하세요</p>
          </div>
          <Button onClick={handleAdd} size="lg" className="shadow-md">
            <Plus className="w-4 h-4 mr-2" />
            새 교인 등록
          </Button>
        </div>

      {/* Statistics Cards */}
      {statsError ? (
        <div className="mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="text-center text-muted-foreground">
                통계 정보를 불러올 수 없습니다.
              </div>
            </CardContent>
          </Card>
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">전체 교인</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">활동 교인</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">비활동 교인</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-500">{stats.inactive}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">남성/여성</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm">
                {stats.byGender.map(g => (
                  <div key={g.gender || 'unknown'}>
                    {getGenderLabel(g.gender)}: {g._count}명
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>검색 및 필터</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="이름, 전화번호, 이메일로 검색..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <Select value={status || 'ALL'} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="상태 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">전체</SelectItem>
              <SelectItem value={MemberStatus.ACTIVE}>활동</SelectItem>
              <SelectItem value={MemberStatus.INACTIVE}>비활동</SelectItem>
              <SelectItem value={MemberStatus.TRANSFERRED}>전출</SelectItem>
              <SelectItem value={MemberStatus.DECEASED}>소천</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Members Table */}
      <Card>
        <CardHeader>
          <CardTitle>교인 목록</CardTitle>
          <CardDescription>
            {data && `총 ${data.total}명의 교인 (${data.currentPage}/${data.pages} 페이지)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">로딩 중...</div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <h3 className="text-red-800 font-semibold mb-2">데이터베이스 연결 오류</h3>
                <p className="text-red-600 text-sm mb-4">
                  현재 데이터베이스에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.
                </p>
                <Button 
                  onClick={() => refetch()} 
                  variant="outline"
                  className="border-red-200 text-red-700 hover:bg-red-50"
                >
                  다시 시도
                </Button>
              </div>
            </div>
          ) : data && data.members.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>이름</TableHead>
                    <TableHead>성별</TableHead>
                    <TableHead>연락처</TableHead>
                    <TableHead>이메일</TableHead>
                    <TableHead>직분</TableHead>
                    <TableHead>부서</TableHead>
                    <TableHead>결혼상태</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead className="text-right">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">{member.name}</TableCell>
                      <TableCell>{getGenderLabel(member.gender)}</TableCell>
                      <TableCell>{member.phone || '-'}</TableCell>
                      <TableCell>{member.email || '-'}</TableCell>
                      <TableCell>{member.position?.name || '-'}</TableCell>
                      <TableCell>{member.department?.name || '-'}</TableCell>
                      <TableCell>{getMaritalStatusLabel(member.maritalStatus)}</TableCell>
                      <TableCell>{getStatusBadge(member.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleEdit(member.id)}
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
              <p className="text-muted-foreground">등록된 교인이 없습니다.</p>
              <Button className="mt-4" onClick={handleAdd}>
                <Plus className="w-4 h-4 mr-2" />
                첫 교인 등록하기
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

        <MemberForm
          isOpen={showForm}
          onClose={handleFormClose}
          memberId={editingMemberId}
          onSuccess={handleFormSuccess}
        />
      </div>
    </DashboardLayout>
  )
}