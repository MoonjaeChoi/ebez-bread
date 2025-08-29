'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface MemberStatisticsProps {
  data: {
    gender: Array<{ name: string; value: number }>
    position: Array<{ name: string; value: number }>
    age: Array<{ name: string; value: number }>
  }
}

const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', 
  '#8884D8', '#82CA9D', '#FFC658', '#8DD1E1',
  '#FF6B9D', '#9C88FF', '#4ECDC4', '#F7DC6F'
]

const RADIAN = Math.PI / 180
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)

  if (percent < 0.05) return null // 5% 미만은 라벨 숨기기

  return (
    <text 
      x={x} 
      y={y} 
      fill="white" 
      textAnchor={x > cx ? 'start' : 'end'} 
      dominantBaseline="central"
      fontSize={12}
      fontWeight="bold"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

export function MemberStatistics({ data }: MemberStatisticsProps) {
  const totalMembers = data.gender.reduce((sum, item) => sum + item.value, 0)

  const genderData = data.gender.filter(item => item.name && item.name !== '미분류')
  const positionData = data.position.sort((a, b) => b.value - a.value)
  const ageData = data.age.sort((a, b) => {
    const ageOrder = ['10대', '20대', '30대', '40대', '50대', '60대', '70대 이상', '미분류']
    return ageOrder.indexOf(a.name) - ageOrder.indexOf(b.name)
  })

  return (
    <div className="space-y-6">
      {/* 총 교인수 요약 */}
      <Card>
        <CardHeader>
          <CardTitle>교인 현황 요약</CardTitle>
          <CardDescription>전체 교인 통계 개요</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-600 mb-2">{totalMembers}</div>
            <div className="text-gray-600">총 교인수</div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-semibold text-blue-700">
                {genderData.find(g => g.name === 'MALE')?.value || 0}
              </div>
              <div className="text-sm text-blue-600">남성</div>
            </div>
            <div className="text-center p-4 bg-pink-50 rounded-lg">
              <div className="text-2xl font-semibold text-pink-700">
                {genderData.find(g => g.name === 'FEMALE')?.value || 0}
              </div>
              <div className="text-sm text-pink-600">여성</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 상세 통계 탭 */}
      <Tabs defaultValue="gender" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="gender">성별</TabsTrigger>
          <TabsTrigger value="age">연령대</TabsTrigger>
          <TabsTrigger value="position">직분</TabsTrigger>
        </TabsList>

        {/* 성별 통계 */}
        <TabsContent value="gender" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>성별 분포</CardTitle>
                <CardDescription>남녀 교인 비율</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={genderData.map(item => ({
                          ...item,
                          name: item.name === 'MALE' ? '남성' : item.name === 'FEMALE' ? '여성' : item.name
                        }))}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={renderCustomizedLabel}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {genderData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? '#3B82F6' : '#EC4899'} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>성별 상세 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {genderData.map((item, index) => {
                  const percentage = totalMembers > 0 ? (item.value / totalMembers * 100).toFixed(1) : 0
                  const displayName = item.name === 'MALE' ? '남성' : item.name === 'FEMALE' ? '여성' : item.name
                  return (
                    <div key={item.name} className="flex justify-between items-center p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: index === 0 ? '#3B82F6' : '#EC4899' }}
                        />
                        <span className="font-medium">{displayName}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{item.value}명</div>
                        <div className="text-sm text-gray-500">{percentage}%</div>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 연령대 통계 */}
        <TabsContent value="age" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>연령대별 분포</CardTitle>
                <CardDescription>교인들의 연령대 현황</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ageData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>연령대 상세 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {ageData.filter(item => item.value > 0).map((item, index) => {
                  const percentage = totalMembers > 0 ? (item.value / totalMembers * 100).toFixed(1) : 0
                  return (
                    <div key={item.name} className="flex justify-between items-center p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="font-medium">{item.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{item.value}명</div>
                        <div className="text-sm text-gray-500">{percentage}%</div>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 직분 통계 */}
        <TabsContent value="position" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>직분별 분포</CardTitle>
                <CardDescription>교인들의 직분 현황</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={positionData.filter(item => item.value > 0)}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => percent > 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : ''}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {positionData.filter(item => item.value > 0).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>직분별 상세 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 max-h-80 overflow-y-auto">
                {positionData.filter(item => item.value > 0).map((item, index) => {
                  const percentage = totalMembers > 0 ? (item.value / totalMembers * 100).toFixed(1) : 0
                  return (
                    <div key={item.name} className="flex justify-between items-center p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="font-medium">{item.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{item.value}명</div>
                        <div className="text-sm text-gray-500">{percentage}%</div>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}