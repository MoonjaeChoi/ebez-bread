'use client'

import React, { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts'
import { Badge } from '@/components/ui/badge'
import { Clock, Users, Calendar, TrendingUp } from 'lucide-react'
import ChartContainer from '@/components/dashboard/shared/ChartContainer'
import { 
  getChartColor,
  formatKoreanNumber,
  chartMargin,
  tooltipStyle 
} from '@/lib/utils/chartUtils'

interface TenureRangeData {
  periodRange: string
  memberCount: number
  averageTenure: number
}

interface TenureDistributionData {
  distribution: TenureRangeData[]
  totalMembers: number
}

interface TenureHistogramProps {
  data: TenureDistributionData | undefined
  loading?: boolean
  showAverageLine?: boolean
  colorByRange?: boolean
}

// 기간 구간별 색상 정의 (재직 기간이 길수록 진한 색)
const TENURE_COLORS = {
  '0-6개월': '#fef3c7',      // 연한 노랑
  '6개월-1년': '#fcd34d',    // 노랑
  '1-2년': '#f59e0b',       // 주황
  '2-5년': '#d97706',       // 진한 주황
  '5-10년': '#92400e',      // 갈색
  '10년 이상': '#451a03',   // 진한 갈색
} as const

// 커스텀 툴팁 컴포넌트
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="h-4 w-4 text-blue-500" />
          <span className="font-medium">{data.periodRange}</span>
        </div>
        <div className="space-y-1 text-sm">
          <div className="flex items-center gap-2">
            <Users className="h-3 w-3 text-gray-500" />
            <span>구성원 수: {formatKoreanNumber(data.memberCount)}명</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3 text-orange-500" />
            <span>평균 재직: {data.averageTenure.toFixed(1)}개월</span>
          </div>
        </div>
      </div>
    )
  }
  return null
}

// 기간 구간 순서 정의
const PERIOD_ORDER = [
  '0-6개월',
  '6개월-1년', 
  '1-2년',
  '2-5년',
  '5-10년',
  '10년 이상'
]

export default function TenureHistogram({
  data,
  loading = false,
  showAverageLine = true,
  colorByRange = true
}: TenureHistogramProps) {
  // 차트 데이터 가공
  const chartData = useMemo(() => {
    if (!data || !data.distribution) return []
    
    // 기간 순서대로 정렬
    const sortedData = [...data.distribution].sort((a, b) => {
      const orderA = PERIOD_ORDER.indexOf(a.periodRange)
      const orderB = PERIOD_ORDER.indexOf(b.periodRange)
      return orderA - orderB
    })
    
    return sortedData.map((item, index) => ({
      ...item,
      fill: colorByRange 
        ? (TENURE_COLORS[item.periodRange as keyof typeof TENURE_COLORS] || getChartColor(index))
        : getChartColor(index),
      percentage: data.totalMembers > 0 
        ? (item.memberCount / data.totalMembers) * 100 
        : 0,
    }))
  }, [data, colorByRange])

  // 통계 계산
  const stats = useMemo(() => {
    if (!data || !chartData.length) return null
    
    const totalMembers = data.totalMembers
    const weightedAverageTenure = chartData.reduce(
      (sum, item) => sum + (item.averageTenure * item.memberCount), 0
    ) / totalMembers
    
    // 가장 많은 구성원이 속한 기간대
    const mostCommonRange = chartData.reduce((prev, current) => 
      prev.memberCount > current.memberCount ? prev : current
    )
    
    // 신입 (1년 미만) vs 경력직 (1년 이상) 비율
    const newMembers = chartData
      .filter(item => ['0-6개월', '6개월-1년'].includes(item.periodRange))
      .reduce((sum, item) => sum + item.memberCount, 0)
    
    const experiencedMembers = totalMembers - newMembers
    
    return {
      totalMembers,
      weightedAverageTenure,
      mostCommonRange: mostCommonRange.periodRange,
      mostCommonCount: mostCommonRange.memberCount,
      newMembers,
      experiencedMembers,
      newMemberRatio: totalMembers > 0 ? (newMembers / totalMembers) * 100 : 0,
    }
  }, [data, chartData])

  const isEmpty = !chartData || chartData.length === 0

  if (isEmpty) {
    return (
      <ChartContainer
        title="참여 기간별 분포"
        icon={<Clock className="h-5 w-5" />}
        loading={loading}
      >
        <div className="h-80 flex items-center justify-center text-gray-500">
          표시할 기간별 분포 데이터가 없습니다
        </div>
      </ChartContainer>
    )
  }

  const description = stats 
    ? `전체 ${formatKoreanNumber(stats.totalMembers)}명 • 평균 재직 ${stats.weightedAverageTenure.toFixed(1)}개월 • 신입 비율 ${stats.newMemberRatio.toFixed(1)}%`
    : undefined

  return (
    <ChartContainer
      title="참여 기간별 분포"
      description={description}
      icon={<Clock className="h-5 w-5" />}
      loading={loading}
    >
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 히스토그램 차트 */}
        <div className="lg:col-span-3">
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={chartMargin}
              >
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="periodRange"
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  interval={0}
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
                
                <Bar 
                  dataKey="memberCount" 
                  name="구성원 수"
                  radius={[4, 4, 0, 0]}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 통계 정보 패널 */}
        <div className="space-y-4">
          {/* 주요 통계 */}
          {stats && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <h4 className="font-medium text-gray-900 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                주요 지표
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">전체 구성원</span>
                  <span className="font-medium">{formatKoreanNumber(stats.totalMembers)}명</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">평균 재직</span>
                  <span className="font-medium">{stats.weightedAverageTenure.toFixed(1)}개월</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">신입 비율</span>
                  <span className="font-medium">{stats.newMemberRatio.toFixed(1)}%</span>
                </div>
                <div className="pt-2 border-t">
                  <div className="text-xs text-gray-500 mb-1">가장 많은 기간대</div>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      {stats.mostCommonRange}
                    </Badge>
                    <span className="text-sm font-medium">
                      {formatKoreanNumber(stats.mostCommonCount)}명
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 기간별 상세 */}
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900">기간별 상세</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {chartData.map((period) => (
                <div key={period.periodRange} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded" 
                      style={{ backgroundColor: period.fill }}
                    />
                    <div>
                      <div className="text-sm font-medium">{period.periodRange}</div>
                      <div className="text-xs text-gray-500">
                        평균 {period.averageTenure.toFixed(1)}개월
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {formatKoreanNumber(period.memberCount)}명
                    </div>
                    <div className="text-xs text-gray-500">
                      {period.percentage.toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 신입 vs 경력직 비교 */}
          {stats && (
            <div className="bg-blue-50 rounded-lg p-4 space-y-3">
              <h4 className="font-medium text-blue-900">경력 분포</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-blue-700">신입 (1년 미만)</span>
                  <span className="font-medium">{formatKoreanNumber(stats.newMembers)}명</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-blue-700">경력직 (1년 이상)</span>
                  <span className="font-medium">{formatKoreanNumber(stats.experiencedMembers)}명</span>
                </div>
                {/* 비율 바 */}
                <div className="mt-3">
                  <div className="flex text-xs text-gray-600 mb-1">
                    <span>신입 {stats.newMemberRatio.toFixed(1)}%</span>
                    <span className="ml-auto">경력직 {(100 - stats.newMemberRatio).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${stats.newMemberRatio}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ChartContainer>
  )
}