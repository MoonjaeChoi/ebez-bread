'use client'

import React, { useState } from 'react'
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
import { Checkbox } from '@/components/ui/checkbox'
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
import { Calendar, Users, UserCheck, UserX, Save, Plus } from 'lucide-react'
import { ServiceType } from '@prisma/client'

export default function AttendancePage() {
  const { data: session } = useSession()
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedService, setSelectedService] = useState<ServiceType>(ServiceType.SUNDAY_MORNING)
  const [attendanceData, setAttendanceData] = useState<Record<string, boolean>>({})

  const { data: serviceAttendance, refetch } = trpc.attendance.getByService.useQuery({
    serviceType: selectedService,
    attendanceDate: selectedDate,
  })

  const { data: stats } = trpc.attendance.getStats.useQuery()

  const bulkUpsertMutation = trpc.attendance.bulkUpsert.useMutation({
    onSuccess: () => {
      refetch()
    },
  })

  const getServiceTypeLabel = (type: ServiceType) => {
    const labels = {
      [ServiceType.SUNDAY_MORNING]: '주일 오전 예배',
      [ServiceType.SUNDAY_EVENING]: '주일 오후 예배',
      [ServiceType.WEDNESDAY]: '수요예배',
      [ServiceType.DAWN]: '새벽기도회',
      [ServiceType.FRIDAY]: '금요기도회',
      [ServiceType.SATURDAY]: '토요집회',
      [ServiceType.SPECIAL]: '특별예배',
    }
    return labels[type]
  }

  const handleAttendanceChange = (memberId: string, isPresent: boolean) => {
    setAttendanceData(prev => ({
      ...prev,
      [memberId]: isPresent,
    }))
  }

  const handleSaveAttendance = async () => {
    if (!serviceAttendance) return

    const attendances = serviceAttendance.allMembers.map(member => ({
      memberId: member.id,
      isPresent: attendanceData[member.id] ?? false,
      notes: '',
    }))

    try {
      await bulkUpsertMutation.mutateAsync({
        serviceType: selectedService,
        attendanceDate: selectedDate,
        attendances,
      })
    } catch (error) {
      console.error('Failed to save attendance:', error)
    }
  }

  const handleMarkAllPresent = () => {
    if (!serviceAttendance) return
    const newData: Record<string, boolean> = {}
    serviceAttendance.allMembers.forEach(member => {
      newData[member.id] = true
    })
    setAttendanceData(newData)
  }

  const handleMarkAllAbsent = () => {
    if (!serviceAttendance) return
    const newData: Record<string, boolean> = {}
    serviceAttendance.allMembers.forEach(member => {
      newData[member.id] = false
    })
    setAttendanceData(newData)
  }

  // Initialize attendance data when service data loads
  React.useEffect(() => {
    if (serviceAttendance) {
      const initialData: Record<string, boolean> = {}
      
      // Set existing attendance records
      serviceAttendance.attendances.forEach(att => {
        initialData[att.memberId] = att.isPresent
      })
      
      // Set default false for members without records
      serviceAttendance.allMembers.forEach(member => {
        if (!(member.id in initialData)) {
          initialData[member.id] = false
        }
      })
      
      setAttendanceData(initialData)
    }
  }, [serviceAttendance])

  if (!session) {
    return <div>로그인이 필요합니다.</div>
  }

  const presentCount = Object.values(attendanceData).filter(Boolean).length
  const totalCount = serviceAttendance?.allMembers.length || 0

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">출석 관리</h1>
          <p className="text-muted-foreground">예배 및 모임 출석을 관리합니다</p>
        </div>
      </div>

      <Tabs defaultValue="check" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="check">출석 체크</TabsTrigger>
          <TabsTrigger value="history">출석 기록</TabsTrigger>
          <TabsTrigger value="stats">통계</TabsTrigger>
        </TabsList>

        {/* 출석 체크 탭 */}
        <TabsContent value="check" className="space-y-6">
          {/* 서비스 선택 */}
          <Card>
            <CardHeader>
              <CardTitle>예배/모임 선택</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">날짜</label>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">예배/모임</label>
                <Select 
                  value={selectedService} 
                  onValueChange={(value) => setSelectedService(value as ServiceType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(ServiceType).map((type) => (
                      <SelectItem key={type} value={type}>
                        {getServiceTypeLabel(type)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">빠른 작업</label>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={handleMarkAllPresent}>
                    전체 출석
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleMarkAllAbsent}>
                    전체 결석
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 출석 현황 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">총 교인 수</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalCount}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">출석</CardTitle>
                <UserCheck className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{presentCount}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">결석</CardTitle>
                <UserX className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{totalCount - presentCount}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">출석률</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0}%
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 출석 체크 테이블 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>출석 체크</CardTitle>
                <CardDescription>
                  {getServiceTypeLabel(selectedService)} - {new Date(selectedDate).toLocaleDateString('ko-KR')}
                </CardDescription>
              </div>
              <Button onClick={handleSaveAttendance} disabled={bulkUpsertMutation.isLoading}>
                <Save className="w-4 h-4 mr-2" />
                {bulkUpsertMutation.isLoading ? '저장 중...' : '저장'}
              </Button>
            </CardHeader>
            <CardContent>
              {serviceAttendance ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">출석</TableHead>
                      <TableHead>이름</TableHead>
                      <TableHead>연락처</TableHead>
                      <TableHead>직분</TableHead>
                      <TableHead>부서</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {serviceAttendance.allMembers.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>
                          <Checkbox
                            checked={attendanceData[member.id] || false}
                            onCheckedChange={(checked) => 
                              handleAttendanceChange(member.id, checked as boolean)
                            }
                          />
                        </TableCell>
                        <TableCell className="font-medium">{member.name}</TableCell>
                        <TableCell>{member.phone || '-'}</TableCell>
                        <TableCell>-</TableCell>
                        <TableCell>-</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">데이터를 불러오는 중...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 출석 기록 탭 */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>출석 기록</CardTitle>
              <CardDescription>과거 출석 기록을 조회할 수 있습니다</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center py-8 text-muted-foreground">
                출석 기록 기능은 개발 중입니다.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 통계 탭 */}
        <TabsContent value="stats">
          <Card>
            <CardHeader>
              <CardTitle>출석 통계</CardTitle>
              <CardDescription>출석률과 관련 통계를 확인할 수 있습니다</CardDescription>
            </CardHeader>
            <CardContent>
              {stats ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-4">전체 통계</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>총 출석 기록:</span>
                        <span className="font-medium">{stats.totalAttendances}건</span>
                      </div>
                      <div className="flex justify-between">
                        <span>출석:</span>
                        <span className="font-medium text-green-600">{stats.presentCount}건</span>
                      </div>
                      <div className="flex justify-between">
                        <span>결석:</span>
                        <span className="font-medium text-red-600">{stats.absentCount}건</span>
                      </div>
                      <div className="flex justify-between">
                        <span>출석률:</span>
                        <span className="font-medium">{stats.attendanceRate.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-4">예배별 출석</h4>
                    <div className="space-y-2">
                      {stats.byServiceType.map((service) => (
                        <div key={service.serviceType} className="flex justify-between">
                          <span>{getServiceTypeLabel(service.serviceType)}:</span>
                          <span className="font-medium">{service._count._all}건</span>
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
    </div>
  )
}