'use client'

import React, { useMemo } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts'
import { Badge } from '@/components/ui/badge'
import { Crown, Users, UserCheck } from 'lucide-react'
import ChartContainer from '@/components/dashboard/shared/ChartContainer'
import { 
  getChartColor, 
  getRoleTypeColor,
  formatKoreanNumber,
  formatPercentage,
  tooltipStyle 
} from '@/lib/utils/chartUtils'

interface RoleData {
  roleId: string
  roleName: string
  englishName: string | null
  level: number
  isLeadership: boolean
  memberCount: number
  percentage: number
}

interface RoleDistributionData {
  roles: RoleData[]
  totalMembers: number
  leadershipMembers: number
}

interface RoleDistributionChartProps {
  data: RoleDistributionData | undefined
  loading?: boolean
  showLeadershipOnly?: boolean
  minMembersToShow?: number
  chartType?: 'pie' | 'donut'
}

// 커스텀 툴팁 컴포넌트
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
        <div className="flex items-center gap-2 mb-2">
          {data.isLeadership ? (
            <Crown className="h-4 w-4 text-yellow-500" />
          ) : (
            <Users className="h-4 w-4 text-gray-500" />
          )}
          <span className="font-medium">{data.roleName}</span>
          {data.isLeadership && (
            <Badge variant="outline" className="text-xs bg-yellow-50">
              리더십
            </Badge>
          )}
        </div>
        <div className="space-y-1 text-sm">
          <div className="flex items-center gap-2">
            <UserCheck className="h-3 w-3" />
            <span>인원: {formatKoreanNumber(data.memberCount)}명</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">비율:</span>
            <span className="font-medium">{formatPercentage(data.percentage)}</span>
          </div>
          {data.level > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-gray-500">레벨:</span>
              <span>{data.level}</span>
            </div>
          )}
        </div>
      </div>
    )
  }
  return null
}

// 커스텀 라벨 컴포넌트
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, value, index }: any) => {
  if (value < 5) return null // 5% 미만은 라벨 숨김
  
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)

  return (
    <text 
      x={x} 
      y={y} 
      fill="white" 
      textAnchor={x > cx ? 'start' : 'end'} 
      dominantBaseline="central"
      className="text-xs font-medium"
    >
      {`${value.toFixed(1)}%`}
    </text>
  )
}

export default function RoleDistributionChart({
  data,
  loading = false,
  showLeadershipOnly = false,
  minMembersToShow = 1,
  chartType = 'pie'
}: RoleDistributionChartProps) {
  // 차트 데이터 가공
  const chartData = useMemo(() => {
    if (!data || !data.roles) return []
    
    let filteredRoles = data.roles.filter(role => 
      role.memberCount >= minMembersToShow &&
      (!showLeadershipOnly || role.isLeadership)
    )
    
    // 멤버 수로 정렬
    filteredRoles = filteredRoles.sort((a, b) => b.memberCount - a.memberCount)
    
    // 색상 및 추가 정보 매핑
    return filteredRoles.map((role, index) => ({
      ...role,
      fill: role.isLeadership 
        ? getRoleTypeColor(true) 
        : getChartColor(index),
      displayName: role.roleName.length > 8 
        ? `${role.roleName.substring(0, 8)}...` 
        : role.roleName,
    }))
  }, [data, minMembersToShow, showLeadershipOnly])

  const isEmpty = !chartData || chartData.length === 0

  // 통계 계산
  const stats = useMemo(() => {
    if (!data) return null
    
    const displayedMembers = chartData.reduce((sum, role) => sum + role.memberCount, 0)
    const leadershipCount = chartData.filter(role => role.isLeadership).length
    const generalCount = chartData.length - leadershipCount
    
    return {
      totalDisplayed: displayedMembers,
      totalMembers: data.totalMembers,
      leadershipRoles: leadershipCount,
      generalRoles: generalCount,
      leadershipMembers: chartData
        .filter(role => role.isLeadership)
        .reduce((sum, role) => sum + role.memberCount, 0),
    }
  }, [data, chartData])

  if (isEmpty) {
    return (
      <ChartContainer
        title="직책별 인원 현황"
        icon={<Crown className="h-5 w-5" />}
        loading={loading}
      >
        <div className="h-80 flex items-center justify-center text-gray-500">
          {showLeadershipOnly 
            ? '표시할 리더십 직책이 없습니다' 
            : '표시할 직책 데이터가 없습니다'
          }
        </div>
      </ChartContainer>
    )
  }

  const description = stats 
    ? `${formatKoreanNumber(stats.totalDisplayed)}명 표시 중 / 전체 ${formatKoreanNumber(stats.totalMembers)}명 • 리더십 ${stats.leadershipRoles}개 • 일반 ${stats.generalRoles}개`
    : undefined

  return (
    <ChartContainer
      title="직책별 인원 현황"
      description={description}
      icon={<Crown className="h-5 w-5" />}
      loading={loading}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 파이 차트 */}
        <div className="lg:col-span-2">
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomLabel}
                  outerRadius={chartType === 'donut' ? 120 : 130}
                  innerRadius={chartType === 'donut' ? 60 : 0}
                  fill="#8884d8"
                  dataKey="memberCount"
                  paddingAngle={2}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                {chartType === 'pie' && (
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value, entry: any) => (
                      <span className="text-sm">
                        {entry.payload.displayName}
                        {entry.payload.isLeadership && (
                          <Crown className="inline h-3 w-3 ml-1 text-yellow-500" />
                        )}
                      </span>
                    )}
                  />
                )}
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 상세 정보 패널 */}
        <div className="space-y-4">
          {/* 요약 통계 */}
          {stats && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <h4 className="font-medium text-gray-900">요약 통계</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">전체 구성원</span>
                  <span className="font-medium">{formatKoreanNumber(stats.totalMembers)}명</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">리더십 구성원</span>
                  <span className="font-medium">{formatKoreanNumber(stats.leadershipMembers)}명</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">리더십 비율</span>
                  <span className="font-medium">
                    {stats.totalMembers > 0 
                      ? formatPercentage((stats.leadershipMembers / stats.totalMembers) * 100)
                      : '0%'
                    }
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 직책 목록 */}
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900">직책별 상세</h4>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {chartData.map((role) => (
                <div key={role.roleId} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: role.fill }}
                    />
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-medium">{role.roleName}</span>
                        {role.isLeadership && (
                          <Crown className="h-3 w-3 text-yellow-500" />
                        )}
                      </div>
                      {role.englishName && (
                        <div className="text-xs text-gray-500">{role.englishName}</div>
                      )}
                      {role.level > 0 && (
                        <Badge variant="outline" className="text-xs mt-1">
                          Lv.{role.level}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {formatKoreanNumber(role.memberCount)}명
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatPercentage(role.percentage)}
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