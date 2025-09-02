'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Wallet, 
  Receipt, 
  AlertTriangle,
  CheckCircle,
  Calendar,
  PieChart,
  BarChart3,
  Building2,
  FileText,
  Clock
} from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'

interface FinancialDashboardProps {
  selectedYear?: number
  selectedDepartmentId?: string
}

export function FinancialDashboard({ 
  selectedYear = new Date().getFullYear(),
  selectedDepartmentId 
}: FinancialDashboardProps) {
  const [timeFrame, setTimeFrame] = useState<'month' | 'quarter' | 'year'>('month')

  // 예산 현황 조회
  const { data: budgetsOverview } = trpc.budgets.getAll.useQuery({
    year: selectedYear,
    departmentId: selectedDepartmentId,
    limit: 100
  })

  // 지출결의서 통계 조회
  const { data: expensesOverview } = trpc.expenseReports.getAll?.useQuery({
    limit: 1,
    status: undefined
  }) || { data: undefined }

  // 시산표 조회 (간단 버전)
  const currentDate = new Date()
  const startOfYear = new Date(selectedYear, 0, 1)
  const endOfYear = new Date(selectedYear, 11, 31)

  const { data: trialBalance } = trpc.transactions.getTrialBalance.useQuery({
    startDate: startOfYear,
    endDate: endOfYear,
    accountLevel: 1 // 관(Level 1)만 조회
  })

  const budgets = budgetsOverview?.budgets || []
  
  // 통계 계산
  const totalBudgetAmount = budgets.reduce((sum, budget) => sum + Number(budget.totalAmount), 0)
  const activeBudgets = budgets.filter(b => b.status === 'ACTIVE').length
  
  // 예산 집행 통계 (임시로 기본값 사용)
  const budgetExecutionStats = {
    totalBudget: totalBudgetAmount,
    usedAmount: totalBudgetAmount * 0.4, // 40% 집행됨으로 가정
    pendingAmount: totalBudgetAmount * 0.1, // 10% 대기중
    remainingAmount: totalBudgetAmount * 0.5 // 50% 남음
  }

  const executionRate = budgetExecutionStats.totalBudget > 0 
    ? (budgetExecutionStats.usedAmount / budgetExecutionStats.totalBudget) * 100 
    : 0

  // 부서별 예산 현황
  const departmentBudgets = budgets.reduce((acc, budget) => {
    const deptName = (budget as any).department?.name || '미분류'
    if (!acc[deptName]) {
      acc[deptName] = {
        count: 0,
        totalAmount: 0,
        usedAmount: 0,
        executionRate: 0
      }
    }
    
    acc[deptName].count += 1
    acc[deptName].totalAmount += Number(budget.totalAmount)
    
    const budgetUsed = Number(budget.totalAmount) * 0.4 // 임시로 40% 사용으로 가정
    
    acc[deptName].usedAmount += budgetUsed
    acc[deptName].executionRate = acc[deptName].totalAmount > 0 
      ? (acc[deptName].usedAmount / acc[deptName].totalAmount) * 100 
      : 0
    
    return acc
  }, {} as Record<string, any>)

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div>
          <h2 className="text-2xl font-bold">재무 대시보드</h2>
          <p className="text-gray-600">전체 재무 현황을 한눈에 확인하세요</p>
        </div>
        
        <div className="flex gap-2">
          <Select value={timeFrame} onValueChange={(value: any) => setTimeFrame(value)}>
            <SelectTrigger className="w-32">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">월간</SelectItem>
              <SelectItem value="quarter">분기</SelectItem>
              <SelectItem value="year">연간</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 주요 지표 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">총 예산액</p>
                <p className="text-2xl font-bold">{formatCurrency(totalBudgetAmount)}</p>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  {budgets.length}개 예산
                </p>
              </div>
              <Wallet className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">집행 금액</p>
                <p className="text-2xl font-bold">{formatCurrency(budgetExecutionStats.usedAmount)}</p>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {executionRate.toFixed(1)}%
                </p>
              </div>
              <Receipt className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">잔여 예산</p>
                <p className="text-2xl font-bold">{formatCurrency(budgetExecutionStats.remainingAmount)}</p>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  사용 가능
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">활성 예산</p>
                <p className="text-2xl font-bold">{activeBudgets}</p>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  개 진행중
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 예산 집행률 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              전체 예산 집행률
            </span>
            <Badge variant={executionRate > 90 ? 'destructive' : executionRate > 70 ? 'default' : 'secondary'}>
              {executionRate.toFixed(1)}%
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Progress value={executionRate} className="h-3" />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <p className="text-gray-600">사용된 예산</p>
                <p className="text-lg font-semibold text-red-600">
                  {formatCurrency(budgetExecutionStats.usedAmount)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-gray-600">대기중인 예산</p>
                <p className="text-lg font-semibold text-yellow-600">
                  {formatCurrency(budgetExecutionStats.pendingAmount)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-gray-600">남은 예산</p>
                <p className="text-lg font-semibold text-green-600">
                  {formatCurrency(budgetExecutionStats.remainingAmount)}
                </p>
              </div>
            </div>

            {executionRate > 90 && (
              <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-md">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm">
                  예산 집행률이 90%를 초과했습니다. 남은 예산을 신중하게 사용하세요.
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="departments" className="w-full">
        <TabsList>
          <TabsTrigger value="departments">부서별 현황</TabsTrigger>
          <TabsTrigger value="accounts">계정별 현황</TabsTrigger>
          <TabsTrigger value="recent">최근 활동</TabsTrigger>
        </TabsList>
        
        <TabsContent value="departments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>부서별 예산 현황</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(departmentBudgets).map(([deptName, stats]: [string, any]) => (
                  <div key={deptName} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium">{deptName}</h3>
                        <Badge variant="outline">{stats.count}개 예산</Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>총 예산: {formatCurrency(stats.totalAmount)}</span>
                        <span>사용: {formatCurrency(stats.usedAmount)}</span>
                        <span>집행률: {stats.executionRate.toFixed(1)}%</span>
                      </div>
                      
                      <div className="mt-2">
                        <Progress value={stats.executionRate} className="h-2" />
                      </div>
                    </div>

                    <div className="ml-4">
                      {stats.executionRate > 90 && (
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                      )}
                      {stats.executionRate >= 70 && stats.executionRate <= 90 && (
                        <TrendingUp className="w-5 h-5 text-yellow-500" />
                      )}
                      {stats.executionRate < 70 && (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      )}
                    </div>
                  </div>
                ))}

                {Object.keys(departmentBudgets).length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    부서별 예산 현황이 없습니다.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accounts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>계정별 현황 (관 단위)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {trialBalance?.balances.slice(0, 5).map((balance) => (
                  <div key={balance.account.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <span className="text-sm font-mono">{balance.account.code}</span>
                      </div>
                      <div>
                        <h3 className="font-medium">{balance.account.name}</h3>
                        <p className="text-sm text-gray-600">{balance.account.type}</p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="font-semibold">
                        {formatCurrency(Math.abs(balance.balance))}
                      </p>
                      <p className="text-sm text-gray-500">
                        {balance.balance >= 0 ? '차변' : '대변'} 잔액
                      </p>
                    </div>
                  </div>
                )) || (
                  <div className="text-center py-8 text-gray-500">
                    계정별 데이터가 없습니다.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recent" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">최근 예산 현황</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {budgets.slice(0, 5).map((budget) => (
                    <div key={budget.id} className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{budget.name}</h4>
                        <p className="text-xs text-gray-500">{(budget as any).department?.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">
                          {formatCurrency(Number(budget.totalAmount))}
                        </p>
                        <Badge 
                          variant={budget.status === 'ACTIVE' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {budget.status === 'ACTIVE' ? '활성' : budget.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-4 pt-4 border-t">
                  <Link href="/dashboard/budgets/allocation">
                    <Button variant="outline" size="sm" className="w-full">
                      <FileText className="w-4 h-4 mr-2" />
                      전체 예산 보기
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">빠른 액세스</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/dashboard/accounting/accounts">
                  <Button variant="outline" className="w-full justify-start">
                    <Building2 className="w-4 h-4 mr-2" />
                    계정과목 관리
                  </Button>
                </Link>
                
                <Link href="/dashboard/accounting/transactions">
                  <Button variant="outline" className="w-full justify-start">
                    <Receipt className="w-4 h-4 mr-2" />
                    거래 입력
                  </Button>
                </Link>
                
                <Link href="/dashboard/expense-reports">
                  <Button variant="outline" className="w-full justify-start">
                    <FileText className="w-4 h-4 mr-2" />
                    지출결의서
                  </Button>
                </Link>
                
                <Link href="/dashboard/accounting/reports">
                  <Button variant="outline" className="w-full justify-start">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    재무 보고서.
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
