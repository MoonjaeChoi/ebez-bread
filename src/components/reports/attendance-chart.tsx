'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Area, AreaChart } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useState } from 'react'

interface AttendanceChartProps {
  data: Array<{
    week?: string
    month?: string
    weekNumber?: number
    monthNumber?: number
    total: number
    serviceTypes: Record<string, number>
  }>
  period: 'weekly' | 'monthly'
  onPeriodChange: (period: 'weekly' | 'monthly') => void
}

const SERVICE_TYPE_COLORS: Record<string, string> = {
  SUNDAY_MORNING: '#8884d8',
  SUNDAY_EVENING: '#82ca9d',
  WEDNESDAY: '#ffc658',
  DAWN: '#ff7c7c',
  FRIDAY: '#8dd1e1',
  SATURDAY: '#ffa726',
  SPECIAL: '#d084d0'
}

function getServiceTypeName(type: string): string {
  const typeMap: Record<string, string> = {
    SUNDAY_MORNING: '주일 오전',
    SUNDAY_EVENING: '주일 오후',
    WEDNESDAY: '수요예배',
    DAWN: '새벽기도',
    FRIDAY: '금요기도',
    SATURDAY: '토요집회',
    SPECIAL: '특별예배'
  }
  return typeMap[type] || type
}

export function AttendanceChart({ data, period, onPeriodChange }: AttendanceChartProps) {
  const [chartType, setChartType] = useState<'bar' | 'line' | 'area'>('bar')

  const chartData = data.map(item => ({
    name: item.week || item.month,
    total: item.total,
    ...Object.entries(item.serviceTypes).reduce((acc, [type, count]) => {
      acc[getServiceTypeName(type)] = count
      return acc
    }, {} as Record<string, number>)
  }))

  const totalAttendance = data.reduce((sum, item) => sum + item.total, 0)
  const averageAttendance = data.length > 0 ? Math.round(totalAttendance / data.length) : 0
  const maxAttendance = Math.max(...data.map(item => item.total))
  const minAttendance = Math.min(...data.map(item => item.total))

  // 예배별 총 출석수 계산
  const serviceTypeStats = data.reduce((acc, item) => {
    Object.entries(item.serviceTypes).forEach(([type, count]) => {
      const typeName = getServiceTypeName(type)
      acc[typeName] = (acc[typeName] || 0) + count
    })
    return acc
  }, {} as Record<string, number>)

  // 가장 활발한 예배 유형 찾기
  const mostActiveService = Object.entries(serviceTypeStats)
    .sort(([,a], [,b]) => b - a)[0]

  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 5, right: 30, left: 20, bottom: 5 }
    }

    switch (chartType) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Line 
              type="monotone" 
              dataKey="total" 
              stroke="#8884d8" 
              strokeWidth={2}
              dot={{ r: 4 }}
            />
          </LineChart>
        )
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Area 
              type="monotone" 
              dataKey="total" 
              stroke="#8884d8" 
              fill="#8884d8" 
              fillOpacity={0.3}
            />
          </AreaChart>
        )
      default:
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            {Object.keys(serviceTypeStats).map((serviceType, index) => (
              <Bar 
                key={serviceType}
                dataKey={serviceType} 
                stackId="a"
                fill={Object.values(SERVICE_TYPE_COLORS)[index % Object.keys(SERVICE_TYPE_COLORS).length]}
              />
            ))}
          </BarChart>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* 컨트롤 패널 */}
      <div className="flex gap-4">
        <Select value={period} onValueChange={onPeriodChange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="weekly">주별</SelectItem>
            <SelectItem value="monthly">월별</SelectItem>
          </SelectContent>
        </Select>

        <Select value={chartType} onValueChange={(value: 'bar' | 'line' | 'area') => setChartType(value)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="bar">막대 그래프</SelectItem>
            <SelectItem value="line">선 그래프</SelectItem>
            <SelectItem value="area">영역 그래프</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* 통계 요약 카드 */}
        <Card>
          <CardHeader>
            <CardTitle>출석 통계</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">총 출석수</span>
              <span className="font-medium">{totalAttendance}명</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">평균 출석수</span>
              <span className="font-medium">{averageAttendance}명</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">최대 출석수</span>
              <span className="font-medium text-green-600">{maxAttendance}명</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">최소 출석수</span>
              <span className="font-medium text-red-600">{minAttendance}명</span>
            </div>
            {mostActiveService && (
              <div className="pt-2 border-t">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">가장 활발한 예배</span>
                  <span className="font-medium text-blue-600">{mostActiveService[0]}</span>
                </div>
                <div className="text-xs text-gray-500 text-right">
                  {mostActiveService[1]}명
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 출석률 추이 차트 */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>출석률 추이</CardTitle>
            <CardDescription>
              {period === 'weekly' ? '주별' : '월별'} 출석 변화 추이
              {chartType === 'bar' && ' (예배별 누적)'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                {renderChart()}
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 예배별 출석 통계 */}
      <Card>
        <CardHeader>
          <CardTitle>예배별 출석 현황</CardTitle>
          <CardDescription>
            각 예배별 총 출석수 및 비율
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
            {Object.entries(serviceTypeStats)
              .sort(([,a], [,b]) => b - a)
              .map(([serviceType, count], index) => {
                const percentage = totalAttendance > 0 ? (count / totalAttendance * 100).toFixed(1) : 0
                return (
                  <div key={serviceType} className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ 
                          backgroundColor: Object.values(SERVICE_TYPE_COLORS)[index % Object.keys(SERVICE_TYPE_COLORS).length] 
                        }}
                      />
                      <span className="font-medium text-sm">{serviceType}</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{count}</div>
                    <div className="text-xs text-gray-500">{percentage}%</div>
                  </div>
                )
              })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}