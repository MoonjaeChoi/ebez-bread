'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { trpc } from '@/lib/trpc/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CalendarDays, BarChart3, Users, DollarSign, TrendingUp, FileBarChart } from 'lucide-react'
import { usePermissions } from '@/hooks/use-permissions'
import { toast } from 'sonner'

// 컴포넌트 임포트
import { DashboardStats } from '@/components/reports/dashboard-stats'
import { OfferingChart } from '@/components/reports/offering-chart'
import { AttendanceChart } from '@/components/reports/attendance-chart'
import { MemberStatistics } from '@/components/reports/member-statistics'
import { PDFExport } from '@/components/reports/pdf-export'

export default function ReportsPage() {
  const { data: session, status } = useSession()
  const { accessibleMenus } = usePermissions()
  const router = useRouter()

  // 상태 관리
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [offeringPeriod, setOfferingPeriod] = useState<'monthly' | 'yearly'>('monthly')
  const [attendancePeriod, setAttendancePeriod] = useState<'weekly' | 'monthly'>('monthly')

  // 권한 확인
  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
    if (!accessibleMenus.reports) {
      toast.error('보고서 접근 권한이 없습니다.')
      router.push('/dashboard')
      return
    }
  }, [session, status, router, accessibleMenus])

  // 데이터 쿼리들
  const { data: dashboardStats, isLoading: statsLoading } = trpc.reports.getDashboardStats.useQuery(
    {
      churchId: session?.user?.churchId || '',
      year: selectedYear,
      month: selectedMonth
    },
    {
      enabled: !!session?.user?.churchId
    }
  )

  const { data: offeringTrends, isLoading: offeringLoading } = trpc.reports.getOfferingTrends.useQuery(
    {
      churchId: session?.user?.churchId || '',
      period: offeringPeriod,
      year: selectedYear
    },
    {
      enabled: !!session?.user?.churchId
    }
  )

  const { data: attendanceTrends, isLoading: attendanceLoading } = trpc.reports.getAttendanceTrends.useQuery(
    {
      churchId: session?.user?.churchId || '',
      period: attendancePeriod,
      year: selectedYear,
      month: attendancePeriod === 'weekly' ? selectedMonth : undefined
    },
    {
      enabled: !!session?.user?.churchId
    }
  )

  const { data: memberStats, isLoading: memberLoading } = trpc.reports.getMemberStatistics.useQuery(
    {
      churchId: session?.user?.churchId || ''
    },
    {
      enabled: !!session?.user?.churchId
    }
  )

  const { data: offeringByType, isLoading: offeringTypeLoading } = trpc.reports.getOfferingByType.useQuery(
    {
      churchId: session?.user?.churchId || '',
      year: selectedYear,
      month: selectedMonth
    },
    {
      enabled: !!session?.user?.churchId
    }
  )

  const { data: visitationStats, isLoading: visitationLoading } = trpc.reports.getVisitationStats.useQuery(
    {
      churchId: session?.user?.churchId || '',
      year: selectedYear
    },
    {
      enabled: !!session?.user?.churchId
    }
  )

  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">로딩 중...</div>
      </div>
    )
  }

  const currentYearOptions = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)
  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: `${i + 1}월`
  }))

  // PDF 데이터 준비
  const pdfData = {
    churchName: session.user.churchName || '교회',
    reportType: '종합 보고서',
    period: `${selectedYear}년 ${selectedMonth}월`,
    generatedAt: new Date(),
    stats: dashboardStats ? {
      totalMembers: dashboardStats.totalMembers,
      totalOfferings: Number(dashboardStats.currentMonthOfferings),
      avgAttendance: dashboardStats.avgAttendanceThisMonth
    } : undefined,
    offeringData: offeringByType,
    attendanceData: attendanceTrends?.map(item => ({
      name: item.week || item.month || '',
      total: item.total
    })),
    memberStats
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <FileBarChart className="h-8 w-8 text-blue-600" />
              고급 보고서 및 분석
            </h1>
            <p className="text-gray-600 mt-2">
              {session.user.churchName}의 상세 통계 및 트렌드 분석
            </p>
          </div>

          {/* 기간 선택 컨트롤 */}
          <div className="flex gap-2">
            <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currentYearOptions.map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}년</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map(month => (
                  <SelectItem key={month.value} value={month.value.toString()}>{month.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* PDF Export 래퍼 */}
        <PDFExport data={pdfData}>
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
              <TabsTrigger value="overview">개요</TabsTrigger>
              <TabsTrigger value="offerings">헌금 분석</TabsTrigger>
              <TabsTrigger value="attendance">출석 분석</TabsTrigger>
              <TabsTrigger value="members">교인 통계</TabsTrigger>
              <TabsTrigger value="comprehensive">종합 보고서</TabsTrigger>
            </TabsList>

            {/* 개요 탭 */}
            <TabsContent value="overview" className="space-y-6">
              {statsLoading ? (
                <div className="text-center py-8">통계 로딩 중...</div>
              ) : dashboardStats ? (
                <DashboardStats data={dashboardStats} />
              ) : (
                <div className="text-center py-8">통계 데이터가 없습니다.</div>
              )}

              {/* 빠른 인사이트 카드들 */}
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-green-600" />
                      헌금 현황
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {offeringTypeLoading ? (
                      <div>로딩 중...</div>
                    ) : offeringByType && offeringByType.length > 0 ? (
                      <div className="space-y-2">
                        {offeringByType.slice(0, 3).map(type => (
                          <div key={type.type} className="flex justify-between text-sm">
                            <span>{type.name}</span>
                            <span className="font-medium">{type.count}건</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-gray-500">데이터가 없습니다.</div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CalendarDays className="h-5 w-5 text-blue-600" />
                      출석 현황
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {dashboardStats && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>이번 달 평균</span>
                          <span className="font-medium">{dashboardStats.avgAttendanceThisMonth}명</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>지난 달 평균</span>
                          <span className="font-medium">{dashboardStats.avgAttendancePreviousMonth}명</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>증감율</span>
                          <span className={`font-medium ${dashboardStats.attendanceGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {dashboardStats.attendanceGrowth >= 0 ? '+' : ''}{dashboardStats.attendanceGrowth.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-purple-600" />
                      교인 현황
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {memberLoading ? (
                      <div>로딩 중...</div>
                    ) : memberStats ? (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>총 교인수</span>
                          <span className="font-medium">
                            {memberStats.gender.reduce((sum, g) => sum + g.value, 0)}명
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>남성</span>
                          <span className="font-medium">
                            {memberStats.gender.find(g => g.name === 'MALE')?.value || 0}명
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>여성</span>
                          <span className="font-medium">
                            {memberStats.gender.find(g => g.name === 'FEMALE')?.value || 0}명
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-gray-500">데이터가 없습니다.</div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* 헌금 분석 탭 */}
            <TabsContent value="offerings" className="space-y-6">
              {offeringLoading ? (
                <div className="text-center py-8">헌금 데이터 로딩 중...</div>
              ) : offeringTrends && offeringTrends.length > 0 ? (
                <OfferingChart 
                  data={offeringTrends}
                  period={offeringPeriod}
                  onPeriodChange={setOfferingPeriod}
                />
              ) : (
                <Card>
                  <CardContent className="text-center py-8">
                    <p className="text-gray-500">헌금 데이터가 없습니다.</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* 출석 분석 탭 */}
            <TabsContent value="attendance" className="space-y-6">
              {attendanceLoading ? (
                <div className="text-center py-8">출석 데이터 로딩 중...</div>
              ) : attendanceTrends && attendanceTrends.length > 0 ? (
                <AttendanceChart 
                  data={attendanceTrends}
                  period={attendancePeriod}
                  onPeriodChange={setAttendancePeriod}
                />
              ) : (
                <Card>
                  <CardContent className="text-center py-8">
                    <p className="text-gray-500">출석 데이터가 없습니다.</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* 교인 통계 탭 */}
            <TabsContent value="members" className="space-y-6">
              {memberLoading ? (
                <div className="text-center py-8">교인 데이터 로딩 중...</div>
              ) : memberStats ? (
                <MemberStatistics data={memberStats} />
              ) : (
                <Card>
                  <CardContent className="text-center py-8">
                    <p className="text-gray-500">교인 데이터가 없습니다.</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* 종합 보고서 탭 */}
            <TabsContent value="comprehensive" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>종합 보고서</CardTitle>
                  <CardDescription>
                    모든 데이터를 종합한 전체 보고서입니다.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                  {/* 대시보드 통계 */}
                  {dashboardStats && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4">📊 주요 지표</h3>
                      <DashboardStats data={dashboardStats} />
                    </div>
                  )}

                  {/* 헌금 차트 */}
                  {offeringTrends && offeringTrends.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4">💰 헌금 분석</h3>
                      <OfferingChart 
                        data={offeringTrends}
                        period={offeringPeriod}
                        onPeriodChange={setOfferingPeriod}
                      />
                    </div>
                  )}

                  {/* 출석 차트 */}
                  {attendanceTrends && attendanceTrends.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4">📅 출석 분석</h3>
                      <AttendanceChart 
                        data={attendanceTrends}
                        period={attendancePeriod}
                        onPeriodChange={setAttendancePeriod}
                      />
                    </div>
                  )}

                  {/* 교인 통계 */}
                  {memberStats && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4">👥 교인 분석</h3>
                      <MemberStatistics data={memberStats} />
                    </div>
                  )}

                  {/* 심방 통계 */}
                  {visitationStats && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4">🏠 심방 현황</h3>
                      <div className="grid gap-4 md:grid-cols-3">
                        <Card>
                          <CardContent className="pt-6">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-blue-600">{visitationStats.total}</div>
                              <div className="text-sm text-gray-600">총 심방 횟수</div>
                            </div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-6">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-orange-600">{visitationStats.followUpNeeded}</div>
                              <div className="text-sm text-gray-600">후속조치 필요</div>
                            </div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-6">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-green-600">
                                {visitationStats.total > 0 ? 
                                  Math.round((visitationStats.total - visitationStats.followUpNeeded) / visitationStats.total * 100) : 0}%
                              </div>
                              <div className="text-sm text-gray-600">완료율</div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </PDFExport>
      </div>
    </div>
  )
}