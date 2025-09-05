'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { trpc } from '@/lib/trpc/client'
import { Loader2, Users, Building2, Crown, TrendingUp } from 'lucide-react'
import OrganizationMemberChart from '@/components/dashboard/charts/OrganizationMemberChart'
import RoleDistributionChart from '@/components/dashboard/charts/RoleDistributionChart'
import TenureHistogram from '@/components/dashboard/charts/TenureHistogram'
import OrganizationLeadershipChart from '@/components/dashboard/charts/OrganizationLeadershipChart'
import MembershipTrendsChart from '@/components/dashboard/charts/MembershipTrendsChart'

export default function OrganizationStatisticsPage() {
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | undefined>(undefined)
  const [showInactiveMembers, setShowInactiveMembers] = useState(true)
  const [showLeadershipOnly, setShowLeadershipOnly] = useState(false)
  const [chartType, setChartType] = useState<'pie' | 'donut'>('pie')
  const [trendsChartType, setTrendsChartType] = useState<'line' | 'area'>('line')
  const [trendsPeriod, setTrendsPeriod] = useState<'month' | 'year'>('month')
  const [trendsMonths, setTrendsMonths] = useState(12)

  // API 호출
  const { data: dashboardSummary, isLoading: summaryLoading } = trpc.organizationStatistics.getDashboardSummary.useQuery({
    organizationId: selectedOrganizationId,
    includeInactive: false,
  })

  const { data: organizationStats, isLoading: orgStatsLoading } = trpc.organizationStatistics.getOrganizationMemberCount.useQuery({
    organizationId: selectedOrganizationId,
    includeInactive: false,
  })

  const { data: roleDistribution, isLoading: roleStatsLoading } = trpc.organizationStatistics.getRoleDistribution.useQuery({
    organizationId: selectedOrganizationId,
    includeInactive: false,
  })

  const { data: tenureDistribution, isLoading: tenureStatsLoading } = trpc.organizationStatistics.getTenureDistribution.useQuery({
    organizationId: selectedOrganizationId,
    includeInactive: false,
  })

  // 리더십 데이터를 위해 조직별 상세 데이터 사용 (인자 필요)
  const { data: organizationDetails, isLoading: leadershipStatsLoading } = trpc.organizations.getHierarchy.useQuery({})

  // 조직별 리더십 정보 조합
  const leadershipByOrganization = useMemo(() => {
    if (!organizationDetails || !organizationStats) return []
    
    return organizationStats.map((orgStat: any) => {
      const orgDetail = organizationDetails.find((org: any) => org.id === orgStat.organizationId)
      return {
        organizationId: orgStat.organizationId,
        organizationName: orgStat.organizationName,
        organizationCode: orgStat.organizationCode,
        level: orgStat.level,
        totalMembers: orgStat.totalMembers,
        leadershipMembers: Math.floor(orgStat.totalMembers * 0.15), // 임시로 15% 가정
        leadershipRatio: 15, // 임시 값
        leadershipRoles: []
      }
    })
  }, [organizationDetails, organizationStats])

  // 구성원 변화 추이 데이터 
  const { data: membershipTrends, isLoading: trendsLoading } = trpc.organizationStatistics.getMembershipTrends.useQuery({
    organizationId: selectedOrganizationId,
    includeInactive: false,
    period: trendsPeriod,
    months: trendsMonths,
  })

  if (summaryLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>통계 데이터를 불러오는 중...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">조직 통계 대시보드</h1>
          <p className="text-gray-600">조직별 구성원 및 직책 현황을 한눈에 확인하세요</p>
        </div>
      </div>

      {/* 요약 통계 카드들 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 조직 수</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardSummary?.totalOrganizations || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 구성원 수</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardSummary?.totalMembers || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">활성 직책 수</CardTitle>
            <Crown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardSummary?.totalRoles || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">리더십 비율</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardSummary?.leadershipRatio ? `${dashboardSummary.leadershipRatio.toFixed(1)}%` : '0%'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 상세 통계 탭 */}
      <Tabs defaultValue="organizations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="organizations">조직별 현황</TabsTrigger>
          <TabsTrigger value="roles">직책별 현황</TabsTrigger>
          <TabsTrigger value="tenure">재직 기간별</TabsTrigger>
          <TabsTrigger value="leadership">리더십 현황</TabsTrigger>
          <TabsTrigger value="trends">변화 추이</TabsTrigger>
          <TabsTrigger value="test">API 테스트</TabsTrigger>
        </TabsList>

        <TabsContent value="organizations" className="space-y-4">
          {/* 차트 컨트롤 */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="show-inactive"
                    checked={showInactiveMembers}
                    onCheckedChange={setShowInactiveMembers}
                  />
                  <Label htmlFor="show-inactive">비활성 구성원 표시</Label>
                </div>
                <div className="text-sm text-gray-600">
                  상위 10개 조직만 표시됩니다
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 차트 */}
          <OrganizationMemberChart
            data={organizationStats || []}
            loading={orgStatsLoading}
            showInactive={showInactiveMembers}
            maxItems={10}
            onOrganizationClick={(orgId) => {
              console.log('Organization clicked:', orgId)
              // 향후 드릴다운 기능 구현 시 사용
            }}
          />

          {/* 상세 데이터 테이블 */}
          <Card>
            <CardHeader>
              <CardTitle>상세 현황</CardTitle>
              <CardDescription>모든 조직의 구성원 현황 목록</CardDescription>
            </CardHeader>
            <CardContent>
              {orgStatsLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {organizationStats?.map((org) => (
                    <div key={org.organizationId} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <div className="font-medium">{org.organizationName}</div>
                        <div className="text-sm text-gray-600">{org.organizationCode} | {org.level}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{org.totalMembers}명</div>
                        <div className="text-sm text-gray-600">
                          활성: {org.activeMembers} | 비활성: {org.inactiveMembers}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          {/* 차트 컨트롤 */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="show-leadership"
                      checked={showLeadershipOnly}
                      onCheckedChange={setShowLeadershipOnly}
                    />
                    <Label htmlFor="show-leadership">리더십 직책만 표시</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="chart-type">차트 타입:</Label>
                    <Select value={chartType} onValueChange={(value) => setChartType(value as 'pie' | 'donut')}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pie">파이 차트</SelectItem>
                        <SelectItem value="donut">도넛 차트</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  멤버가 1명 이상인 직책만 표시됩니다
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 파이 차트 */}
          <RoleDistributionChart
            data={roleDistribution}
            loading={roleStatsLoading}
            showLeadershipOnly={showLeadershipOnly}
            minMembersToShow={1}
            chartType={chartType}
          />

          {/* 상세 데이터 테이블 */}
          <Card>
            <CardHeader>
              <CardTitle>전체 직책 목록</CardTitle>
              <CardDescription>
                전체: {roleDistribution?.totalMembers}명 | 
                리더십: {roleDistribution?.leadershipMembers}명
              </CardDescription>
            </CardHeader>
            <CardContent>
              {roleStatsLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {roleDistribution?.roles.map((role) => (
                    <div key={role.roleId} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{role.roleName}</span>
                          {role.isLeadership && <Crown className="h-4 w-4 text-yellow-500" />}
                        </div>
                        <div className="text-sm text-gray-600">
                          레벨: {role.level} | {role.englishName}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{role.memberCount}명</div>
                        <div className="text-sm text-gray-600">{role.percentage.toFixed(1)}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tenure" className="space-y-4">
          {/* 히스토그램 */}
          <TenureHistogram
            data={tenureDistribution}
            loading={tenureStatsLoading}
            showAverageLine={true}
            colorByRange={true}
          />
        </TabsContent>

        <TabsContent value="leadership" className="space-y-4">
          {/* 조직 계층별 리더십 현황 */}
          <OrganizationLeadershipChart
            data={leadershipByOrganization}
            loading={leadershipStatsLoading}
            minMembersToShow={5}
          />
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          {/* 차트 컨트롤 */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="trends-period">기간 단위:</Label>
                    <Select value={trendsPeriod} onValueChange={(value) => setTrendsPeriod(value as 'month' | 'year')}>
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="month">월별</SelectItem>
                        <SelectItem value="year">연도별</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="trends-months">기간:</Label>
                    <Select value={trendsMonths.toString()} onValueChange={(value) => setTrendsMonths(parseInt(value))}>
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="6">6개월</SelectItem>
                        <SelectItem value="12">12개월</SelectItem>
                        <SelectItem value="24">24개월</SelectItem>
                        <SelectItem value="36">36개월</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="trends-chart-type">차트 타입:</Label>
                    <Select value={trendsChartType} onValueChange={(value) => setTrendsChartType(value as 'line' | 'area')}>
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="line">라인</SelectItem>
                        <SelectItem value="area">영역</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  {trendsPeriod === 'month' ? '월별' : '연도별'} 구성원 변화 추이 분석
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 변화 추이 차트 */}
          <MembershipTrendsChart
            data={membershipTrends}
            loading={trendsLoading}
            chartType={trendsChartType}
            showNetChange={true}
            period={trendsPeriod}
          />
        </TabsContent>

        <TabsContent value="test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API 테스트</CardTitle>
              <CardDescription>통계 API가 정상적으로 작동하는지 확인합니다</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <h4 className="font-medium mb-2">대시보드 요약</h4>
                  <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
                    {JSON.stringify(dashboardSummary, null, 2)}
                  </pre>
                </div>
                <div>
                  <h4 className="font-medium mb-2">조직별 현황</h4>
                  <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
                    {JSON.stringify(organizationStats?.slice(0, 2), null, 2)}
                  </pre>
                </div>
                <div>
                  <h4 className="font-medium mb-2">직책별 분포</h4>
                  <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
                    {JSON.stringify(roleDistribution?.roles?.slice(0, 3), null, 2)}
                  </pre>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">재직 기간별 분포</h4>
                  <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
                    {JSON.stringify(tenureDistribution, null, 2)}
                  </pre>
                </div>
                <div>
                  <h4 className="font-medium mb-2">API 상태</h4>
                  <div className="text-xs bg-gray-100 p-2 rounded">
                    <div className="space-y-1">
                      <div className={`flex items-center gap-2 ${summaryLoading ? 'text-yellow-600' : 'text-green-600'}`}>
                        <div className={`w-2 h-2 rounded-full ${summaryLoading ? 'bg-yellow-400' : 'bg-green-400'}`}></div>
                        대시보드 요약: {summaryLoading ? '로딩 중' : '완료'}
                      </div>
                      <div className={`flex items-center gap-2 ${orgStatsLoading ? 'text-yellow-600' : 'text-green-600'}`}>
                        <div className={`w-2 h-2 rounded-full ${orgStatsLoading ? 'bg-yellow-400' : 'bg-green-400'}`}></div>
                        조직별 현황: {orgStatsLoading ? '로딩 중' : '완료'}
                      </div>
                      <div className={`flex items-center gap-2 ${roleStatsLoading ? 'text-yellow-600' : 'text-green-600'}`}>
                        <div className={`w-2 h-2 rounded-full ${roleStatsLoading ? 'bg-yellow-400' : 'bg-green-400'}`}></div>
                        직책별 분포: {roleStatsLoading ? '로딩 중' : '완료'}
                      </div>
                      <div className={`flex items-center gap-2 ${tenureStatsLoading ? 'text-yellow-600' : 'text-green-600'}`}>
                        <div className={`w-2 h-2 rounded-full ${tenureStatsLoading ? 'bg-yellow-400' : 'bg-green-400'}`}></div>
                        재직 기간별: {tenureStatsLoading ? '로딩 중' : '완료'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}