'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useState } from 'react'
import { formatCurrency } from '@/lib/utils'

interface OfferingChartProps {
  data: Array<{
    month?: string
    year?: number
    total: number
    details: Array<{
      type: string
      amount: number
    }>
  }>
  period: 'monthly' | 'yearly'
  onPeriodChange: (period: 'monthly' | 'yearly') => void
}

const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', 
  '#8884D8', '#82CA9D', '#FFC658', '#8DD1E1'
]

export function OfferingChart({ data, period, onPeriodChange }: OfferingChartProps) {
  const [chartType, setChartType] = useState<'line' | 'bar'>('line')

  const chartData = data.map(item => ({
    name: item.month || `${item.year}년`,
    value: item.total,
    ...item.details.reduce((acc, detail) => {
      acc[getOfferingTypeName(detail.type)] = detail.amount
      return acc
    }, {} as Record<string, number>)
  }))

  // 헌금 타입별 총합 계산 (파이차트용)
  const offeringTypeData = data.reduce((acc, item) => {
    item.details.forEach(detail => {
      const typeName = getOfferingTypeName(detail.type)
      acc[typeName] = (acc[typeName] || 0) + detail.amount
    })
    return acc
  }, {} as Record<string, number>)

  const pieData = Object.entries(offeringTypeData).map(([name, value]) => ({
    name,
    value
  }))

  function getOfferingTypeName(type: string): string {
    const typeMap: Record<string, string> = {
      TITHE: '십일조',
      THANKSGIVING: '감사헌금',
      SUNDAY_OFFERING: '주일헌금',
      SPECIAL: '특별헌금',
      MISSION: '선교헌금',
      BUILDING: '건축헌금',
      OTHER: '기타'
    }
    return typeMap[type] || type
  }

  const totalAmount = data.reduce((sum, item) => sum + item.total, 0)
  const averageAmount = data.length > 0 ? totalAmount / data.length : 0

  return (
    <div className="space-y-6">
      {/* 컨트롤 패널 */}
      <div className="flex gap-4">
        <Select value={period} onValueChange={onPeriodChange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="monthly">월별</SelectItem>
            <SelectItem value="yearly">연도별</SelectItem>
          </SelectContent>
        </Select>

        <Select value={chartType} onValueChange={(value: 'line' | 'bar') => setChartType(value)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="line">선 그래프</SelectItem>
            <SelectItem value="bar">막대 그래프</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 헌금 추이 차트 */}
        <Card>
          <CardHeader>
            <CardTitle>헌금 추이</CardTitle>
            <CardDescription>
              {period === 'monthly' ? '월별' : '연도별'} 헌금 변화 추이
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'line' ? (
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={formatCurrency} />
                    <Tooltip formatter={(value) => [formatCurrency(Number(value)), '헌금액']} />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#8884d8" 
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                ) : (
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={formatCurrency} />
                    <Tooltip formatter={(value) => [formatCurrency(Number(value)), '헌금액']} />
                    <Bar dataKey="value" fill="#8884d8" />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
            <div className="mt-4 text-sm text-gray-600">
              <p>총 헌금액: {formatCurrency(totalAmount)}</p>
              <p>평균 헌금액: {formatCurrency(averageAmount)}</p>
            </div>
          </CardContent>
        </Card>

        {/* 헌금 타입별 분포 */}
        <Card>
          <CardHeader>
            <CardTitle>헌금 타입별 분포</CardTitle>
            <CardDescription>
              헌금 종류별 비율 및 금액
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(1)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [formatCurrency(Number(value)), '헌금액']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-1">
              {pieData.map((item, index) => (
                <div key={item.name} className="flex justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-sm" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    {item.name}
                  </span>
                  <span className="font-medium">{formatCurrency(item.value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}