'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Users, DollarSign, Calendar, Heart } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface DashboardStatsProps {
  data: {
    totalMembers: number
    newMembersThisMonth: number
    currentMonthOfferings: number
    previousMonthOfferings: number
    avgAttendanceThisMonth: number
    avgAttendancePreviousMonth: number
    offeringGrowth: number
    attendanceGrowth: number
  }
}

export function DashboardStats({ data }: DashboardStatsProps) {
  const stats = [
    {
      title: '총 교인수',
      value: data.totalMembers,
      change: data.newMembersThisMonth,
      changeText: `이번 달 신규 ${data.newMembersThisMonth}명`,
      icon: Users,
      color: 'blue',
      format: (val: number) => `${val}명`
    },
    {
      title: '이번 달 헌금',
      value: data.currentMonthOfferings,
      change: data.offeringGrowth,
      changeText: `전월 대비 ${data.offeringGrowth >= 0 ? '+' : ''}${data.offeringGrowth.toFixed(1)}%`,
      icon: DollarSign,
      color: 'green',
      format: (val: number) => formatCurrency(val),
      isPercentage: true
    },
    {
      title: '평균 출석수',
      value: data.avgAttendanceThisMonth,
      change: data.attendanceGrowth,
      changeText: `전월 대비 ${data.attendanceGrowth >= 0 ? '+' : ''}${data.attendanceGrowth.toFixed(1)}%`,
      icon: Calendar,
      color: 'orange',
      format: (val: number) => `${val}명`,
      isPercentage: true
    },
    {
      title: '전월 헌금',
      value: data.previousMonthOfferings,
      change: null,
      changeText: '참고용',
      icon: Heart,
      color: 'purple',
      format: (val: number) => formatCurrency(val)
    }
  ]

  const getColorClasses = (color: string, isPositive: boolean | null = null) => {
    const baseColors = {
      blue: 'text-blue-600 bg-blue-50',
      green: 'text-green-600 bg-green-50',
      orange: 'text-orange-600 bg-orange-50',
      purple: 'text-purple-600 bg-purple-50'
    }

    if (isPositive === null) return baseColors[color as keyof typeof baseColors]
    
    return isPositive 
      ? 'text-green-600 bg-green-50'
      : 'text-red-600 bg-red-50'
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => {
        const isPositiveChange = stat.change === null ? null : stat.change >= 0
        const Icon = stat.icon
        
        return (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.color === 'blue' ? 'bg-blue-50' : 
                                                  stat.color === 'green' ? 'bg-green-50' :
                                                  stat.color === 'orange' ? 'bg-orange-50' : 'bg-purple-50'}`}>
                <Icon className={`h-4 w-4 ${stat.color === 'blue' ? 'text-blue-600' : 
                                              stat.color === 'green' ? 'text-green-600' :
                                              stat.color === 'orange' ? 'text-orange-600' : 'text-purple-600'}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stat.format(stat.value)}
              </div>
              <div className="flex items-center gap-1 mt-1">
                {stat.change !== null && stat.isPercentage && (
                  <>
                    {isPositiveChange ? (
                      <TrendingUp className="h-3 w-3 text-green-600" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-600" />
                    )}
                  </>
                )}
                <p className={`text-xs ${
                  stat.change === null ? 'text-gray-500' :
                  stat.isPercentage ? 
                    (isPositiveChange ? 'text-green-600' : 'text-red-600') :
                    'text-gray-600'
                }`}>
                  {stat.changeText}
                </p>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

interface QuickStatsProps {
  totalMembers: number
  totalOfferings: number
  totalAttendance: number
  activeMembers: number
}

export function QuickStats({ totalMembers, totalOfferings, totalAttendance, activeMembers }: QuickStatsProps) {
  const attendanceRate = totalMembers > 0 ? ((totalAttendance / totalMembers) * 100).toFixed(1) : 0
  const avgOfferingPerMember = activeMembers > 0 ? (totalOfferings / activeMembers) : 0

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">교인수</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-blue-600">{totalMembers}</div>
          <p className="text-xs text-gray-500 mt-1">총 등록 교인</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">출석률</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-green-600">{attendanceRate}%</div>
          <p className="text-xs text-gray-500 mt-1">평균 출석 비율</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">총 헌금</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-purple-600">{formatCurrency(totalOfferings)}</div>
          <p className="text-xs text-gray-500 mt-1">누적 헌금액</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">1인당 헌금</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-orange-600">{formatCurrency(avgOfferingPerMember)}</div>
          <p className="text-xs text-gray-500 mt-1">교인 1인 평균</p>
        </CardContent>
      </Card>
    </div>
  )
}