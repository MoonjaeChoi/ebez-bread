'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Wallet,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  PieChart,
  Calendar,
  Building2
} from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { BudgetStatus } from '@prisma/client'
import { formatCurrency } from '@/lib/utils'

interface BudgetOverviewProps {
  selectedYear?: number
  selectedDepartmentId?: string
  onYearChange?: (year: number) => void
  onDepartmentChange?: (departmentId: string) => void
}

const budgetStatusLabels: Record<BudgetStatus, string> = {
  DRAFT: '초안',
  SUBMITTED: '제출됨',
  APPROVED: '승인됨',
  REJECTED: '반려됨',
  ACTIVE: '활성',
  CLOSED: '마감'
}

const budgetStatusColors: Record<BudgetStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  SUBMITTED: 'bg-blue-100 text-blue-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  ACTIVE: 'bg-emerald-100 text-emerald-800',
  CLOSED: 'bg-slate-100 text-slate-800'
}

export function BudgetOverview({ 
  selectedYear = new Date().getFullYear(),
  selectedDepartmentId,
  onYearChange,
  onDepartmentChange 
}: BudgetOverviewProps) {
  // 예산 목록 조회
  const { data: budgetsData, isLoading } = trpc.budgets.getAll.useQuery({
    year: selectedYear,
    departmentId: selectedDepartmentId,
    limit: 50
  })

  // 부서 목록 조회 (임시로 빈 배열 사용)
  const departments: any[] = []

  const budgets = budgetsData?.budgets || []
  
  // 통계 계산
  const totalBudgets = budgets.length
  const activeBudgets = budgets.filter(b => b.status === 'ACTIVE').length
  const totalBudgetAmount = budgets.reduce((sum, budget) => sum + Number(budget.totalAmount), 0)
  const averageExecutionRate = budgets.length > 0 
    ? budgets.reduce((sum, budget) => {
        const execution = (budget as any)._count?.budgetItems || 0
        return sum + (execution > 0 ? 50 : 0) // 임시로 고정값 사용
      }, 0) / budgets.length
    : 0

  // 집행률별 분류 (임시로 균등 분배)
  const executionRateRanges = {
    high: Math.floor(budgets.length / 3),
    medium: Math.floor(budgets.length / 3), 
    low: budgets.length - Math.floor(budgets.length / 3) * 2
  }

  return (
    <div className="space-y-6">
      {/* 필터 섹션 */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Select
            value={selectedYear.toString()}
            onValueChange={(value) => onYearChange?.(parseInt(value))}
          >
            <SelectTrigger>
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 5 }, (_, i) => {
                const year = new Date().getFullYear() - 2 + i
                return (
                  <SelectItem key={year} value={year.toString()}>
                    {year}년
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex-1">
          <Select
            value={selectedDepartmentId || 'ALL'}
            onValueChange={(value) => onDepartmentChange?.(value === 'ALL' ? '' : value)}
          >
            <SelectTrigger>
              <Building2 className="w-4 h-4 mr-2" />
              <SelectValue placeholder="부서 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">전체 부서</SelectItem>
              {departments?.map((dept: any) => (
                <SelectItem key={dept.id} value={dept.id}>
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">전체 예산</p>
                <p className="text-2xl font-bold">{totalBudgets}</p>
                <p className="text-xs text-gray-500">개</p>
              </div>
              <Wallet className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">활성 예산</p>
                <p className="text-2xl font-bold">{activeBudgets}</p>
                <p className="text-xs text-gray-500">개</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">총 예산액</p>
                <p className="text-xl font-bold">{formatCurrency(totalBudgetAmount)}</p>
                <p className="text-xs text-gray-500">원</p>
              </div>
              <DollarSign className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">평균 집행률</p>
                <p className="text-2xl font-bold">{averageExecutionRate.toFixed(1)}</p>
                <p className="text-xs text-gray-500">%</p>
              </div>
              <PieChart className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 집행률 분석 */}
      <Card>
        <CardHeader>
          <CardTitle>예산 집행률 분석</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <TrendingDown className="w-8 h-8 text-red-600" />
              </div>
              <p className="text-2xl font-bold text-red-600">{executionRateRanges.low}</p>
              <p className="text-sm text-gray-600">저집행률 (50% 미만)</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
              <p className="text-2xl font-bold text-yellow-600">{executionRateRanges.medium}</p>
              <p className="text-sm text-gray-600">중간집행률 (50-80%)</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-600">{executionRateRanges.high}</p>
              <p className="text-sm text-gray-600">고집행률 (80% 이상)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 예산 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>예산 현황</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-20 bg-gray-200 rounded"></div>
                </div>
              ))
            ) : budgets.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                선택한 조건에 해당하는 예산이 없습니다.
              </div>
            ) : (
              budgets.slice(0, 10).map((budget) => {
                const avgExecutionRate = Math.random() * 100 // 임시로 랜덤값 사용

                return (
                  <div 
                    key={budget.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium">{budget.name}</h3>
                        <Badge 
                          variant="outline" 
                          className={budgetStatusColors[budget.status]}
                        >
                          {budgetStatusLabels[budget.status]}
                        </Badge>
                        {(budget as any).department && (
                          <Badge variant="secondary">
                            {(budget as any).department.name}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>예산: {formatCurrency(Number(budget.totalAmount))}</span>
                        <span>기간: {budget.year}년</span>
                        {budget.quarter && <span>Q{budget.quarter}</span>}
                        {budget.month && <span>{budget.month}월</span>}
                      </div>
                      
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span>집행률</span>
                          <span>{avgExecutionRate.toFixed(1)}%</span>
                        </div>
                        <Progress 
                          value={avgExecutionRate} 
                          className="h-2"
                        />
                      </div>
                    </div>

                    <div className="ml-4">
                      {avgExecutionRate >= 90 && (
                        <AlertTriangle className="w-5 h-5 text-yellow-500" />
                      )}
                      {avgExecutionRate >= 80 && avgExecutionRate < 90 && (
                        <TrendingUp className="w-5 h-5 text-green-500" />
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
          
          {budgets.length > 10 && (
            <div className="text-center mt-4">
              <Button variant="outline" size="sm">
                더 보기 ({budgets.length - 10}개 더)
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}