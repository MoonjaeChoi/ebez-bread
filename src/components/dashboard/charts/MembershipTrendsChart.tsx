'use client'

import React, { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, Calendar, Users } from 'lucide-react'
import ChartContainer from '@/components/dashboard/shared/ChartContainer'
import { 
  formatKoreanNumber,
  formatPercentage,
  chartMargin
} from '@/lib/utils/chartUtils'

interface MembershipTrendData {
  period: string
  netChange: number
  newJoins: number
  departures: number
  transfers: number
}

interface MembershipTrendsData {
  period: 'month' | 'year'
  trends: MembershipTrendData[]
  currentTotal: number
}

interface MembershipTrendsChartProps {
  data: MembershipTrendsData | undefined
  loading?: boolean
  chartType?: 'line' | 'area'
  showNetChange?: boolean
  period?: 'month' | 'year'
}

// 커스텀 툴팁
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="h-4 w-4 text-blue-500" />
          <span className="font-medium">{data.period}</span>
        </div>
        <div className="space-y-1 text-sm">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-3 w-3 text-green-500" />
            <span>신규 가입: {formatKoreanNumber(data.newJoins)}명</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingDown className="h-3 w-3 text-red-500" />
            <span>이탈: {formatKoreanNumber(data.departures)}명</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-3 w-3 text-blue-500" />
            <span>전환: {formatKoreanNumber(data.transfers)}명</span>
          </div>
          <div className="border-t pt-1 mt-2">
            <div className={`flex items-center gap-2 font-medium ${data.netChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {data.netChange >= 0 ? 
                <TrendingUp className="h-3 w-3" /> : 
                <TrendingDown className="h-3 w-3" />
              }
              <span>순증감: {data.netChange > 0 ? '+' : ''}{data.netChange}명</span>
            </div>
          </div>
        </div>
      </div>
    )
  }
  return null
}

export default function MembershipTrendsChart({
  data,
  loading = false,
  chartType = 'line',
  showNetChange = true,
  period = 'month'
}: MembershipTrendsChartProps) {
  
  // 차트 데이터 가공
  const chartData = useMemo(() => {
    if (!data || !data.trends) return []
    
    let runningTotal = data.currentTotal || 0
    
    return data.trends.map((trend, index) => {
      const periodLabel = data.period === 'month' 
        ? trend.period.slice(0, 7) // YYYY-MM 형식
        : trend.period.slice(0, 4) // YYYY 형식
      
      // 이전 기간들의 순증감을 누적해서 해당 기간의 총 인원 계산
      runningTotal += trend.netChange
      
      return {
        ...trend,
        periodLabel,
        totalMembers: runningTotal,
        newMembers: trend.newJoins,
        leftMembers: trend.departures,
        growthRate: runningTotal > 0 ? (trend.netChange / runningTotal) * 100 : 0,
      }
    }).reverse() // 시간순 정렬
  }, [data])

  // 통계 계산
  const stats = useMemo(() => {
    if (!data || !chartData.length) return null
    
    const totalNewMembers = chartData.reduce((sum, item) => sum + item.newJoins, 0)
    const totalLeftMembers = chartData.reduce((sum, item) => sum + item.departures, 0)
    const totalNetChange = chartData.reduce((sum, item) => sum + item.netChange, 0)
    
    // 성장 기간 vs 감소 기간
    const growthPeriods = chartData.filter(item => item.netChange > 0).length
    const declinePeriods = chartData.filter(item => item.netChange < 0).length
    const stablePeriods = chartData.filter(item => item.netChange === 0).length
    
    // 최대/최소 변화
    const sortedByNetChange = [...chartData].sort((a, b) => b.netChange - a.netChange)
    const bestPeriod = sortedByNetChange[0]
    const worstPeriod = sortedByNetChange[sortedByNetChange.length - 1]
    
    // 현재 대비 시작 시점
    const startMembers = chartData[0]?.totalMembers || data.currentTotal
    const endMembers = chartData[chartData.length - 1]?.totalMembers || data.currentTotal
    const overallGrowthRate = startMembers > 0 ? ((endMembers - startMembers) / startMembers) * 100 : 0
    
    return {
      totalPeriods: chartData.length,
      totalNewMembers,
      totalLeftMembers,
      totalNetChange,
      overallGrowthRate,
      growthPeriods,
      declinePeriods,
      stablePeriods,
      bestPeriod,
      worstPeriod,
      startMembers,
      endMembers,
      averageNewMembers: Math.round(totalNewMembers / chartData.length),
      averageLeftMembers: Math.round(totalLeftMembers / chartData.length),
    }
  }, [data, chartData])

  const isEmpty = !chartData || chartData.length === 0

  if (isEmpty) {
    return (
      <ChartContainer
        title={`구성원 변화 추이 (${period === 'month' ? '월별' : '연도별'})`}
        icon={<TrendingUp className="h-5 w-5" />}
        loading={loading}
      >
        <div className="h-80 flex items-center justify-center text-gray-500">
          표시할 추이 데이터가 없습니다
        </div>
      </ChartContainer>
    )
  }

  const description = stats 
    ? `${stats.totalPeriods}개 기간 • 순증감 ${stats.totalNetChange}명 • 전체 성장률 ${stats.overallGrowthRate.toFixed(1)}%`
    : undefined

  return (
    <ChartContainer
      title={`구성원 변화 추이 (${period === 'month' ? '월별' : '연도별'})`}
      description={description}
      icon={<TrendingUp className="h-5 w-5" />}
      loading={loading}
    >
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 추이 차트 */}
        <div className="lg:col-span-3">
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'area' ? (
                <AreaChart data={chartData} margin={chartMargin}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="periodLabel"
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    label={{ 
                      value: '구성원 수', 
                      angle: -90, 
                      position: 'insideLeft',
                      style: { textAnchor: 'middle' }
                    }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  
                  <Area 
                    type="monotone" 
                    dataKey="totalMembers" 
                    stroke="#3b82f6" 
                    fill="#3b82f6" 
                    fillOpacity={0.3}
                    name="전체 구성원"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="newJoins" 
                    stroke="#22c55e" 
                    fill="#22c55e" 
                    fillOpacity={0.2}
                    name="신규 가입"
                  />
                </AreaChart>
              ) : (
                <LineChart data={chartData} margin={chartMargin}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="periodLabel"
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    label={{ 
                      value: '구성원 수', 
                      angle: -90, 
                      position: 'insideLeft',
                      style: { textAnchor: 'middle' }
                    }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  
                  <Line 
                    type="monotone" 
                    dataKey="totalMembers" 
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    dot={{ fill: '#3b82f6', r: 4 }}
                    name="전체 구성원"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="newJoins" 
                    stroke="#22c55e" 
                    strokeWidth={2}
                    dot={{ fill: '#22c55e', r: 3 }}
                    name="신규 가입"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="departures" 
                    stroke="#ef4444" 
                    strokeWidth={2}
                    dot={{ fill: '#ef4444', r: 3 }}
                    name="이탈"
                  />
                  {showNetChange && (
                    <Line 
                      type="monotone" 
                      dataKey="netChange" 
                      stroke="#f59e0b" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{ fill: '#f59e0b', r: 3 }}
                      name="순증감"
                    />
                  )}
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* 통계 패널 */}
        <div className="space-y-4">
          {/* 전체 요약 */}
          {stats && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <h4 className="font-medium text-gray-900 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                전체 현황
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">분석 기간</span>
                  <span className="font-medium">{stats.totalPeriods}개 {period === 'month' ? '월' : '년'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">총 신규 가입</span>
                  <span className="font-medium text-green-600">+{formatKoreanNumber(stats.totalNewMembers)}명</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">총 이탈</span>
                  <span className="font-medium text-red-600">-{formatKoreanNumber(stats.totalLeftMembers)}명</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-gray-600">순증감</span>
                  <span className={`font-medium ${stats.totalNetChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {stats.totalNetChange > 0 ? '+' : ''}{formatKoreanNumber(stats.totalNetChange)}명
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">전체 성장률</span>
                  <span className={`font-medium ${stats.overallGrowthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercentage(stats.overallGrowthRate)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 기간별 분포 */}
          {stats && (
            <div className="bg-blue-50 rounded-lg p-4 space-y-3">
              <h4 className="font-medium text-blue-900">기간별 분포</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-700 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-green-500" />
                    성장 기간
                  </span>
                  <span className="font-medium">{stats.growthPeriods}개</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700 flex items-center gap-1">
                    <TrendingDown className="w-3 h-3 text-red-500" />
                    감소 기간
                  </span>
                  <span className="font-medium">{stats.declinePeriods}개</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700 flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-gray-400" />
                    변화 없음
                  </span>
                  <span className="font-medium">{stats.stablePeriods}개</span>
                </div>
              </div>
              
              {/* 성장률 바 */}
              <div className="mt-3">
                <div className="flex text-xs text-gray-600 mb-1">
                  <span>성장 {((stats.growthPeriods / stats.totalPeriods) * 100).toFixed(1)}%</span>
                  <span className="ml-auto">감소 {((stats.declinePeriods / stats.totalPeriods) * 100).toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(stats.growthPeriods / stats.totalPeriods) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* 최고/최저 성과 */}
          {stats && stats.bestPeriod && stats.worstPeriod && (
            <div className="space-y-3">
              <div className="bg-green-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-900">최고 성장 기간</span>
                </div>
                <div className="text-sm">
                  <div className="font-medium">{stats.bestPeriod.period}</div>
                  <div className="text-green-700">
                    +{stats.bestPeriod.netChange}명 ({formatPercentage(stats.bestPeriod.growthRate)})
                  </div>
                </div>
              </div>
              
              {stats.worstPeriod.netChange < 0 && (
                <div className="bg-red-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown className="h-4 w-4 text-red-600" />
                    <span className="font-medium text-red-900">최대 감소 기간</span>
                  </div>
                  <div className="text-sm">
                    <div className="font-medium">{stats.worstPeriod.period}</div>
                    <div className="text-red-700">
                      {stats.worstPeriod.netChange}명 ({formatPercentage(stats.worstPeriod.growthRate)})
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 평균 지표 */}
          {stats && (
            <div className="bg-amber-50 rounded-lg p-4 space-y-3">
              <h4 className="font-medium text-amber-900">평균 지표</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-amber-700">{period === 'month' ? '월' : '년'}평균 신규</span>
                  <span className="font-medium">{formatKoreanNumber(stats.averageNewMembers)}명</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-amber-700">{period === 'month' ? '월' : '년'}평균 이탈</span>
                  <span className="font-medium">{formatKoreanNumber(stats.averageLeftMembers)}명</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-amber-700">{period === 'month' ? '월' : '년'}평균 순증감</span>
                  <span className={`font-medium ${(stats.averageNewMembers - stats.averageLeftMembers) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {stats.averageNewMembers - stats.averageLeftMembers > 0 ? '+' : ''}
                    {formatKoreanNumber(stats.averageNewMembers - stats.averageLeftMembers)}명
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ChartContainer>
  )
}