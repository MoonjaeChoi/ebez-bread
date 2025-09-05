'use client'

import React, { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { Badge } from '@/components/ui/badge'
import { Building2, Users, UserCheck, UserX } from 'lucide-react'
import ChartContainer from '@/components/dashboard/shared/ChartContainer'
import { 
  ORGANIZATION_LEVEL_COLORS, 
  STATUS_COLORS, 
  truncateText, 
  formatKoreanNumber,
  chartMargin,
  tooltipStyle,
  legendStyle 
} from '@/lib/utils/chartUtils'

interface OrganizationData {
  organizationId: string
  organizationName: string
  organizationCode: string
  level: keyof typeof ORGANIZATION_LEVEL_COLORS
  totalMembers: number
  activeMembers: number
  inactiveMembers: number
  parentId: string | null
}

interface OrganizationMemberChartProps {
  data: OrganizationData[]
  loading?: boolean
  showInactive?: boolean
  maxItems?: number
  onOrganizationClick?: (organizationId: string) => void
}

// 커스텀 툴팁 컴포넌트
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
        <div className="flex items-center gap-2 mb-2">
          <Building2 className="h-4 w-4" />
          <span className="font-medium">{data.organizationName}</span>
          <Badge variant="outline" className="text-xs">
            {data.level}
          </Badge>
        </div>
        <div className="space-y-1 text-sm">
          <div className="flex items-center gap-2">
            <Users className="h-3 w-3" />
            <span>전체: {formatKoreanNumber(data.totalMembers)}명</span>
          </div>
          <div className="flex items-center gap-2">
            <UserCheck className="h-3 w-3 text-green-500" />
            <span>활성: {formatKoreanNumber(data.activeMembers)}명</span>
          </div>
          <div className="flex items-center gap-2">
            <UserX className="h-3 w-3 text-gray-500" />
            <span>비활성: {formatKoreanNumber(data.inactiveMembers)}명</span>
          </div>
        </div>
      </div>
    )
  }
  return null
}

// 레이블 포맷터는 이제 truncateText 유틸리티 사용

export default function OrganizationMemberChart({
  data,
  loading = false,
  showInactive = true,
  maxItems = 10,
  onOrganizationClick,
}: OrganizationMemberChartProps) {
  // 데이터 가공 및 정렬
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return []
    
    // 전체 멤버 수로 정렬 후 상위 N개만 선택
    const sortedData = [...data]
      .sort((a, b) => b.totalMembers - a.totalMembers)
      .slice(0, maxItems)
    
    return sortedData.map((item) => ({
      ...item,
      shortName: truncateText(item.organizationName),
      levelColor: ORGANIZATION_LEVEL_COLORS[item.level],
    }))
  }, [data, maxItems])

  if (!chartData || chartData.length === 0) {
    return (
      <ChartContainer
        title="조직별 구성원 수"
        icon={<Building2 className="h-5 w-5" />}
        loading={loading}
      >
        <div className="h-80 flex items-center justify-center text-gray-500">
          표시할 데이터가 없습니다
        </div>
      </ChartContainer>
    )
  }

  // 총계 계산
  const totalMembers = chartData.reduce((sum, item) => sum + item.totalMembers, 0)
  const totalActiveMembers = chartData.reduce((sum, item) => sum + item.activeMembers, 0)
  const totalInactiveMembers = chartData.reduce((sum, item) => sum + item.inactiveMembers, 0)

  return (
    <ChartContainer
      title="조직별 구성원 수"
      description={`상위 ${chartData.length}개 조직 • 전체 ${formatKoreanNumber(totalMembers)}명 (활성 ${formatKoreanNumber(totalActiveMembers)}명, 비활성 ${formatKoreanNumber(totalInactiveMembers)}명)`}
      icon={<Building2 className="h-5 w-5" />}
      loading={loading}
    >
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={chartMargin}
              onClick={(data) => {
                if (data && data.activePayload && onOrganizationClick) {
                  const orgId = data.activePayload[0]?.payload?.organizationId
                  if (orgId) onOrganizationClick(orgId)
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="shortName"
                angle={-45}
                textAnchor="end"
                height={60}
                interval={0}
                tick={{ fontSize: 12 }}
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
              <Legend 
                wrapperStyle={legendStyle}
                iconType="rect"
              />
              
              {/* 활성 멤버 바 */}
              <Bar 
                dataKey="activeMembers" 
                name="활성 구성원"
                fill={STATUS_COLORS.active}
                radius={[0, 0, 4, 4]}
                cursor="pointer"
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`active-cell-${index}`} 
                    fill={STATUS_COLORS.active}
                  />
                ))}
              </Bar>

              {/* 비활성 멤버 바 (선택적 표시) */}
              {showInactive && (
                <Bar 
                  dataKey="inactiveMembers" 
                  name="비활성 구성원"
                  fill={STATUS_COLORS.inactive}
                  radius={[4, 4, 0, 0]}
                  cursor="pointer"
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`inactive-cell-${index}`} 
                      fill={STATUS_COLORS.inactive}
                    />
                  ))}
                </Bar>
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 레벨 범례 */}
        <div className="mt-4 pt-4 border-t">
          <div className="text-sm font-medium mb-2">조직 레벨</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(ORGANIZATION_LEVEL_COLORS).map(([level, color]) => {
              const hasData = chartData.some(item => item.level === level)
              if (!hasData) return null
              
              return (
                <div key={level} className="flex items-center gap-1">
                  <div 
                    className="w-3 h-3 rounded-sm" 
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-xs text-gray-600">{level}</span>
                </div>
              )
            })}
          </div>
        </div>
    </ChartContainer>
  )
}