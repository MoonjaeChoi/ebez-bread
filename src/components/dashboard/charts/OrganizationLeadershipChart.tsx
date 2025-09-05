'use client'

import React, { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Cell
} from 'recharts'
import { Badge } from '@/components/ui/badge'
import { Crown, Building2, Users, TrendingUp } from 'lucide-react'
import ChartContainer from '@/components/dashboard/shared/ChartContainer'
import { 
  formatKoreanNumber,
  formatPercentage,
  chartMargin
} from '@/lib/utils/chartUtils'

interface OrganizationLeadershipData {
  organizationId: string
  organizationName: string
  organizationCode: string
  level: string
  totalMembers: number
  leadershipMembers: number
  leadershipRatio: number
  leadershipRoles: {
    roleId: string
    roleName: string
    memberCount: number
    level: number
  }[]
}

interface OrganizationLeadershipChartProps {
  data: OrganizationLeadershipData[] | undefined
  loading?: boolean
  minMembersToShow?: number
  showRatioThreshold?: number
}

// 차트용 데이터 변환
interface ChartData {
  name: string
  totalMembers: number
  leadershipMembers: number
  ratio: number
  fill: string
  organizationId: string
  level: string
}

// 커스텀 툴팁
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
        <div className="flex items-center gap-2 mb-2">
          <Building2 className="h-4 w-4 text-blue-500" />
          <span className="font-medium">{data.name}</span>
          <Badge variant="outline" className="text-xs">
            {data.level}
          </Badge>
        </div>
        <div className="space-y-1 text-sm">
          <div className="flex items-center gap-2">
            <Users className="h-3 w-3 text-gray-500" />
            <span>전체: {formatKoreanNumber(data.totalMembers)}명</span>
          </div>
          <div className="flex items-center gap-2">
            <Crown className="h-3 w-3 text-yellow-500" />
            <span>리더십: {formatKoreanNumber(data.leadershipMembers)}명</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-3 w-3 text-orange-500" />
            <span>리더십 비율: {formatPercentage(data.ratio)}</span>
          </div>
        </div>
      </div>
    )
  }
  return null
}

export default function OrganizationLeadershipChart({
  data,
  loading = false,
  minMembersToShow = 5,
  showRatioThreshold = undefined
}: OrganizationLeadershipChartProps) {
  
  // 차트 데이터 가공
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return []
    
    let filteredData = data.filter(org => org.totalMembers >= minMembersToShow)
    
    if (showRatioThreshold !== undefined) {
      filteredData = filteredData.filter(org => org.leadershipRatio <= showRatioThreshold)
    }
    
    return filteredData
      .sort((a, b) => b.totalMembers - a.totalMembers)
      .slice(0, 15) // 상위 15개만 표시
      .map((org): ChartData => ({
        name: org.organizationName.length > 10 ? `${org.organizationName.substring(0, 10)}...` : org.organizationName,
        totalMembers: org.totalMembers,
        leadershipMembers: org.leadershipMembers,
        ratio: org.leadershipRatio,
        fill: getLeadershipRatioColor(org.leadershipRatio),
        organizationId: org.organizationId,
        level: org.level,
      }))
  }, [data, minMembersToShow, showRatioThreshold])

  // 통계 계산
  const stats = useMemo(() => {
    if (!data || data.length === 0) return null
    
    const totalOrgs = data.length
    const totalMembers = data.reduce((sum, org) => sum + org.totalMembers, 0)
    const totalLeadershipMembers = data.reduce((sum, org) => sum + org.leadershipMembers, 0)
    const avgLeadershipRatio = totalMembers > 0 ? (totalLeadershipMembers / totalMembers) * 100 : 0
    
    const excellentOrgs = data.filter(org => org.leadershipRatio >= 20).length
    const goodOrgs = data.filter(org => org.leadershipRatio >= 10 && org.leadershipRatio < 20).length
    const concernOrgs = data.filter(org => org.leadershipRatio < 10).length
    
    const sortedByRatio = [...data].sort((a, b) => b.leadershipRatio - a.leadershipRatio)
    const highestOrg = sortedByRatio[0]
    const lowestOrg = sortedByRatio[sortedByRatio.length - 1]
    
    return {
      totalOrgs,
      totalMembers,
      totalLeadershipMembers,
      avgLeadershipRatio,
      excellentOrgs,
      goodOrgs,
      concernOrgs,
      highestOrg,
      lowestOrg,
    }
  }, [data])

  const isEmpty = !chartData || chartData.length === 0

  if (isEmpty) {
    return (
      <ChartContainer
        title="조직 계층별 리더십 현황"
        icon={<Crown className="h-5 w-5" />}
        loading={loading}
      >
        <div className="h-80 flex items-center justify-center text-gray-500">
          {showRatioThreshold !== undefined
            ? `리더십 비율 ${showRatioThreshold}% 이하 조직이 없습니다`
            : '표시할 조직 리더십 데이터가 없습니다'
          }
        </div>
      </ChartContainer>
    )
  }

  const description = stats 
    ? `${stats.totalOrgs}개 조직 • 평균 리더십 비율 ${stats.avgLeadershipRatio.toFixed(1)}% • 우수 ${stats.excellentOrgs}개 • 관심 ${stats.concernOrgs}개`
    : undefined

  return (
    <ChartContainer
      title="조직 계층별 리더십 현황"
      description={description}
      icon={<Crown className="h-5 w-5" />}
      loading={loading}
    >
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 막대 차트 */}
        <div className="lg:col-span-3">
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={chartMargin}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  interval={0}
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  label={{ 
                    value: '리더십 비율 (%)', 
                    angle: -90, 
                    position: 'insideLeft',
                    style: { textAnchor: 'middle' }
                  }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="ratio" 
                  name="리더십 비율"
                  radius={[4, 4, 0, 0]}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          {/* 범례 */}
          <div className="mt-4 pt-4 border-t">
            <div className="text-sm font-medium mb-2">리더십 비율 범례</div>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#22c55e' }} />
                <span className="text-xs">우수 (20% 이상)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#f59e0b' }} />
                <span className="text-xs">양호 (10-20%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ef4444' }} />
                <span className="text-xs">관심 필요 (10% 미만)</span>
              </div>
            </div>
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
                  <span className="text-gray-600">총 조직 수</span>
                  <span className="font-medium">{stats.totalOrgs}개</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">전체 구성원</span>
                  <span className="font-medium">{formatKoreanNumber(stats.totalMembers)}명</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">리더십 구성원</span>
                  <span className="font-medium">{formatKoreanNumber(stats.totalLeadershipMembers)}명</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">평균 리더십 비율</span>
                  <span className="font-medium">{formatPercentage(stats.avgLeadershipRatio)}</span>
                </div>
              </div>
            </div>
          )}

          {/* 등급별 분포 */}
          {stats && (
            <div className="bg-blue-50 rounded-lg p-4 space-y-3">
              <h4 className="font-medium text-blue-900">등급별 분포</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-700 flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    우수 (20% 이상)
                  </span>
                  <span className="font-medium">{stats.excellentOrgs}개</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700 flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-orange-500" />
                    양호 (10-20%)
                  </span>
                  <span className="font-medium">{stats.goodOrgs}개</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700 flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    관심 필요 (10% 미만)
                  </span>
                  <span className="font-medium">{stats.concernOrgs}개</span>
                </div>
              </div>
            </div>
          )}

          {/* 최고/최저 조직 */}
          {stats && (
            <div className="space-y-3">
              <div className="bg-green-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-900">최고 리더십 조직</span>
                </div>
                <div className="text-sm">
                  <div className="font-medium">{stats.highestOrg.organizationName}</div>
                  <div className="text-green-700">
                    {formatPercentage(stats.highestOrg.leadershipRatio)} 
                    ({stats.highestOrg.leadershipMembers}/{stats.highestOrg.totalMembers}명)
                  </div>
                </div>
              </div>
              
              {stats.lowestOrg.leadershipRatio < 15 && (
                <div className="bg-red-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="h-4 w-4 text-red-600" />
                    <span className="font-medium text-red-900">관심 필요 조직</span>
                  </div>
                  <div className="text-sm">
                    <div className="font-medium">{stats.lowestOrg.organizationName}</div>
                    <div className="text-red-700">
                      {formatPercentage(stats.lowestOrg.leadershipRatio)} 
                      ({stats.lowestOrg.leadershipMembers}/{stats.lowestOrg.totalMembers}명)
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 상세 조직 목록 */}
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900">조직별 상세</h4>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {chartData.map((org) => (
                <div key={org.organizationId} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: org.fill }}
                    />
                    <div>
                      <div className="text-sm font-medium">{org.name}</div>
                      <div className="text-xs text-gray-500">{org.level}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {formatPercentage(org.ratio)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {org.leadershipMembers}/{org.totalMembers}명
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </ChartContainer>
  )
}

// 리더십 비율에 따른 색상 결정
function getLeadershipRatioColor(ratio: number): string {
  if (ratio >= 20) return '#22c55e'  // 초록색 - 우수
  if (ratio >= 10) return '#f59e0b'  // 주황색 - 양호  
  return '#ef4444'                   // 빨간색 - 관심 필요
}