'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  Plus, 
  Save, 
  Building2, 
  DollarSign, 
  Percent, 
  Calculator,
  AlertTriangle,
  CheckCircle,
  Edit
} from 'lucide-react'
import { toast } from 'sonner'
import { trpc } from '@/lib/trpc/client'
import { BudgetCategory } from '@prisma/client'
import { Skeleton } from '@/components/ui/skeleton'

interface DepartmentBudgetAllocation {
  departmentId: string
  departmentName: string
  totalAllocated: number
  budgetItems: {
    category: BudgetCategory
    amount: number
    percentage: number
    accountCodeId?: string
    accountCode?: string
    accountName?: string
  }[]
}

interface BudgetAllocationData {
  year: number
  totalBudget: number
  allocatedAmount: number
  remainingAmount: number
  departments: DepartmentBudgetAllocation[]
}

export function DepartmentBudgetAllocation() {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [totalBudget, setTotalBudget] = useState<number>(0)
  const [allocations, setAllocations] = useState<DepartmentBudgetAllocation[]>([])
  const [editingDepartment, setEditingDepartment] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // 부서 목록 조회
  const { data: departments } = trpc.departments.getAll.useQuery({
    includeInactive: false
  })

  // 기존 예산 배정 조회
  const { data: existingBudgets, refetch: refetchBudgets } = trpc.budgets.getAll.useQuery({
    year: selectedYear,
    page: 1,
    limit: 100
  })

  // 회계 계정코드 목록 조회
  const { data: accountCodes } = trpc.accountCodes.getAll.useQuery({
    page: 1,
    limit: 100,
    includeInactive: false
  })

  // 카테고리별 추천 회계 계정코드 필터링 함수
  const getFilteredAccountCodes = (category: BudgetCategory) => {
    if (!accountCodes?.accountCodes) return []
    
    // 카테고리별 회계계정 코드 매핑 (코드 패턴 기반 필터링)
    const categoryCodePatterns: Record<BudgetCategory, RegExp[]> = {
      PERSONNEL: [/^6[0-2]/, /인건비|급여|수당|보험/], // 60x-62x 인건비 관련
      OPERATIONS: [/^6[3-5]/, /운영|관리|소모품|통신/], // 63x-65x 운영비 관련
      MANAGEMENT: [/^6[6-7]/, /관리|수수료|수도|전기/], // 66x-67x 관리비 관련
      FACILITIES: [/^[47]/, /시설|건물|장비|수선/], // 4xx, 7xx 시설/자산 관련
      EDUCATION: [/교육|연수|도서|교재/, /^6[8-9]/], // 교육 관련 키워드
      MINISTRY: [/사역|목회|교회/, /^6[8-9]/], // 사역 관련 키워드
      MISSION: [/선교|후원|기부/, /^6[8-9]/], // 선교 관련 키워드
      WELFARE: [/복지|장학|구제|지원/, /^6[8-9]/], // 복지 관련 키워드
      EVENT: [/행사|예배|집회|모임/, /^6[8-9]/], // 행사 관련 키워드
      OTHER: [/^6/, /기타|잡비/] // 6xx 비용 계정 전반
    }

    const patterns = categoryCodePatterns[category] || []
    
    return accountCodes.accountCodes.filter(account => {
      // 계정 코드나 이름이 패턴과 매치되는지 확인
      return patterns.some(pattern => 
        pattern.test(account.code) || pattern.test(account.name)
      )
    })
  }

  const saveBudgetMutation = trpc.budgets.create.useMutation({
    onSuccess: () => {
      toast.success('부서별 예산이 성공적으로 저장되었습니다')
      refetchBudgets()
      setEditingDepartment(null)
    },
    onError: (error) => {
      toast.error(`예산 저장 실패: ${error.message}`)
    }
  })

  const updateBudgetMutation = trpc.budgets.update.useMutation({
    onSuccess: () => {
      toast.success('예산이 성공적으로 수정되었습니다')
      refetchBudgets()
      setEditingDepartment(null)
    },
    onError: (error) => {
      toast.error(`예산 수정 실패: ${error.message}`)
    }
  })

  // 기존 예산 데이터를 allocations에 반영
  useEffect(() => {
    if (existingBudgets?.budgets && departments?.departments) {
      const departmentBudgets = departments.departments.map(dept => {
        const existingBudget = existingBudgets.budgets.find(b => b.departmentId === dept.id)
        
        if (existingBudget && existingBudget.budgetItems) {
          // 카테고리별 금액 집계
          const categoryAmounts = existingBudget.budgetItems.reduce((acc: Record<BudgetCategory, number>, item: any) => {
            acc[item.category as BudgetCategory] = (acc[item.category as BudgetCategory] || 0) + Number(item.amount)
            return acc
          }, {} as Record<BudgetCategory, number>)

          const budgetItems = Object.entries(categoryAmounts).map(([category, amount]) => ({
            category: category as BudgetCategory,
            amount: Number(amount),
            percentage: Number(existingBudget.totalAmount) > 0 ? (Number(amount) / Number(existingBudget.totalAmount)) * 100 : 0
          }))

          return {
            departmentId: dept.id,
            departmentName: dept.name,
            totalAllocated: Number(existingBudget.totalAmount),
            budgetItems
          }
        }

        return {
          departmentId: dept.id,
          departmentName: dept.name,
          totalAllocated: 0,
          budgetItems: []
        }
      })

      setAllocations(departmentBudgets)
    }
  }, [existingBudgets, departments])

  const getCurrentAllocation = (): BudgetAllocationData => {
    const allocatedAmount = allocations.reduce((sum, dept) => sum + dept.totalAllocated, 0)
    return {
      year: selectedYear,
      totalBudget,
      allocatedAmount,
      remainingAmount: totalBudget - allocatedAmount,
      departments: allocations
    }
  }

  const handleDepartmentAllocationChange = (
    departmentId: string, 
    category: BudgetCategory, 
    amount: number
  ) => {
    setAllocations(prev => prev.map(dept => {
      if (dept.departmentId === departmentId) {
        const updatedItems = dept.budgetItems.filter(item => item.category !== category)
        if (amount > 0) {
          const existingItem = dept.budgetItems.find(item => item.category === category)
          updatedItems.push({
            category,
            amount,
            percentage: 0, // 나중에 계산
            accountCodeId: existingItem?.accountCodeId,
            accountCode: existingItem?.accountCode,
            accountName: existingItem?.accountName
          })
        }

        const totalAllocated = updatedItems.reduce((sum, item) => sum + item.amount, 0)
        const itemsWithPercentage = updatedItems.map(item => ({
          ...item,
          percentage: totalAllocated > 0 ? (item.amount / totalAllocated) * 100 : 0
        }))

        return {
          ...dept,
          totalAllocated,
          budgetItems: itemsWithPercentage
        }
      }
      return dept
    }))
  }

  const handleAccountCodeChange = (departmentId: string, category: BudgetCategory, accountCodeId: string) => {
    const selectedAccount = accountCodes?.accountCodes?.find(acc => acc.id === accountCodeId)
    
    setAllocations(prev => prev.map(dept => {
      if (dept.departmentId === departmentId) {
        const existingItemIndex = dept.budgetItems.findIndex(item => item.category === category)
        
        if (existingItemIndex >= 0) {
          // 기존 항목이 있는 경우 업데이트
          const updatedItems = [...dept.budgetItems]
          updatedItems[existingItemIndex] = {
            ...updatedItems[existingItemIndex],
            accountCodeId,
            accountCode: selectedAccount?.code,
            accountName: selectedAccount?.name
          }
          
          return {
            ...dept,
            budgetItems: updatedItems
          }
        } else {
          // 기존 항목이 없는 경우 새로 생성 (금액은 0으로 설정)
          const newItem = {
            category,
            amount: 0,
            percentage: 0,
            accountCodeId,
            accountCode: selectedAccount?.code,
            accountName: selectedAccount?.name
          }
          
          return {
            ...dept,
            budgetItems: [...dept.budgetItems, newItem]
          }
        }
      }
      return dept
    }))
  }

  const handleSaveDepartmentBudget = async (departmentId: string) => {
    const allocation = allocations.find(a => a.departmentId === departmentId)
    if (!allocation) {
      toast.error('부서 정보를 찾을 수 없습니다')
      return
    }

    // 금액이 0보다 큰 예산 항목만 확인
    const validBudgetItems = allocation.budgetItems.filter(item => item.amount > 0)
    if (validBudgetItems.length === 0) {
      toast.error('예산 금액을 입력해주세요')
      return
    }

    if (allocation.totalAllocated <= 0) {
      toast.error('총 예산 금액이 0보다 커야 합니다')
      return
    }

    setIsLoading(true)
    try {
      const department = departments?.departments?.find((d: any) => d.id === departmentId)
      if (!department) throw new Error('부서를 찾을 수 없습니다')

      // 기존 예산이 있는지 확인
      const existingBudget = existingBudgets?.budgets.find(b => b.departmentId === departmentId)

      const budgetData = {
        name: `${department.name} ${selectedYear}년 예산`,
        year: selectedYear,
        startDate: new Date(selectedYear, 0, 1),
        endDate: new Date(selectedYear, 11, 31),
        totalAmount: allocation.totalAllocated,
        departmentId: departmentId,
        description: `${selectedYear}년 ${department.name} 부서별 예산 배정`,
        budgetItems: allocation.budgetItems
          .filter(item => item.amount > 0) // 금액이 0보다 큰 항목만 포함
          .map(item => ({
            name: getCategoryName(item.category),
            code: item.accountCode || `${departmentId}_${item.category}`,
            amount: item.amount,
            category: item.category,
            description: `${getCategoryName(item.category)} 예산 ${item.accountName ? `(${item.accountName})` : ''}`
          }))
      }

      if (existingBudget) {
        // 기존 예산이 있으면 업데이트
        const updateData = {
          id: existingBudget.id,
          name: budgetData.name,
          totalAmount: budgetData.totalAmount,
          description: budgetData.description,
          budgetItems: budgetData.budgetItems
        }
        await updateBudgetMutation.mutateAsync(updateData)
      } else {
        // 새로운 예산 생성
        await saveBudgetMutation.mutateAsync(budgetData)
      }
    } catch (error: any) {
      console.error('예산 저장 오류:', error)
      
      // tRPC 에러 처리
      let errorMessage = '알 수 없는 오류가 발생했습니다'
      if (error?.message) {
        errorMessage = error.message
      } else if (error?.data?.message) {
        errorMessage = error.data.message
      } else if (error?.shape?.message) {
        errorMessage = error.shape.message
      }
      
      toast.error(`예산 저장 실패: ${errorMessage}`)
    } finally {
      setIsLoading(false)
    }
  }

  const getCategoryName = (category: BudgetCategory): string => {
    const categoryNames: Record<BudgetCategory, string> = {
      PERSONNEL: '인건비',
      OPERATIONS: '운영비',
      MANAGEMENT: '관리비',
      FACILITIES: '시설비',
      EDUCATION: '교육비',
      MINISTRY: '사역비',
      MISSION: '선교비',
      WELFARE: '복지비',
      EVENT: '행사비',
      OTHER: '기타'
    }
    return categoryNames[category] || category
  }

  const getCategoryColor = (category: BudgetCategory): string => {
    const colors: Record<BudgetCategory, string> = {
      PERSONNEL: 'bg-blue-100 text-blue-800',
      OPERATIONS: 'bg-green-100 text-green-800',
      MANAGEMENT: 'bg-yellow-100 text-yellow-800',
      FACILITIES: 'bg-purple-100 text-purple-800',
      EDUCATION: 'bg-indigo-100 text-indigo-800',
      MINISTRY: 'bg-cyan-100 text-cyan-800',
      MISSION: 'bg-orange-100 text-orange-800',
      WELFARE: 'bg-pink-100 text-pink-800',
      EVENT: 'bg-red-100 text-red-800',
      OTHER: 'bg-gray-100 text-gray-800'
    }
    return colors[category] || 'bg-gray-100 text-gray-800'
  }

  const currentData = getCurrentAllocation()
  const allocationPercentage = currentData.totalBudget > 0 ? 
    (currentData.allocatedAmount / currentData.totalBudget) * 100 : 0

  if (!departments || !departments.departments) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 예산 설정 헤더 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            부서별 예산 배정
          </CardTitle>
          <CardDescription>
            연간 예산을 부서별로 배정하고 카테고리별로 세부 계획을 수립하세요
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="year">예산 연도</Label>
              <Select 
                value={selectedYear.toString()} 
                onValueChange={(value) => setSelectedYear(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 5 }, (_, i) => {
                    const year = new Date().getFullYear() + i - 2
                    return (
                      <SelectItem key={year} value={year.toString()}>
                        {year}년
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="totalBudget">총 예산액</Label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-sm text-muted-foreground">₩</span>
                <Input
                  id="totalBudget"
                  type="number"
                  placeholder="0"
                  value={totalBudget || ''}
                  onChange={(e) => setTotalBudget(parseFloat(e.target.value) || 0)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="flex flex-col justify-end">
              <div className="text-sm text-muted-foreground mb-1">
                배정률: {allocationPercentage.toFixed(1)}%
              </div>
              <Progress value={Math.min(allocationPercentage, 100)} className="h-2" />
            </div>
          </div>

          {/* 예산 현황 요약 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg border">
              <div className="text-2xl font-bold text-blue-600">
                {currentData.totalBudget.toLocaleString()}원
              </div>
              <div className="text-sm text-blue-600">총 예산</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg border">
              <div className="text-2xl font-bold text-green-600">
                {currentData.allocatedAmount.toLocaleString()}원
              </div>
              <div className="text-sm text-green-600">배정 완료</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg border">
              <div className="text-2xl font-bold text-orange-600">
                {currentData.remainingAmount.toLocaleString()}원
              </div>
              <div className="text-sm text-orange-600">배정 가능</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 부서별 예산 배정 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {allocations.map((allocation) => (
          <Card key={allocation.departmentId} className="h-fit">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <div>
                <CardTitle className="text-lg">{allocation.departmentName}</CardTitle>
                <CardDescription>
                  배정액: {allocation.totalAllocated.toLocaleString()}원
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {allocation.totalAllocated > 0 && (
                  <Badge variant="secondary">
                    {currentData.totalBudget > 0 ? 
                      `${((allocation.totalAllocated / currentData.totalBudget) * 100).toFixed(1)}%` 
                      : '0%'
                    }
                  </Badge>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingDepartment(
                    editingDepartment === allocation.departmentId ? null : allocation.departmentId
                  )}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {editingDepartment === allocation.departmentId ? (
                <div className="space-y-4">
                  <div className="text-sm font-medium mb-2">예산 카테고리별 배정</div>
                  {Object.values(BudgetCategory).map((category) => {
                    const existingItem = allocation.budgetItems.find(item => item.category === category)
                    return (
                      <div key={category} className="space-y-2">
                        <div className="flex items-center gap-3">
                          <Badge className={`w-20 justify-center ${getCategoryColor(category)}`}>
                            {getCategoryName(category)}
                          </Badge>
                          <div className="relative flex-1">
                            <span className="absolute left-2 top-2.5 text-sm text-muted-foreground">₩</span>
                            <Input
                              type="number"
                              placeholder="0"
                              value={existingItem?.amount || ''}
                              onChange={(e) => handleDepartmentAllocationChange(
                                allocation.departmentId,
                                category,
                                parseFloat(e.target.value) || 0
                              )}
                              className="pl-6"
                            />
                          </div>
                        </div>
                        {/* 선택된 회계계정 표시 (금액이 0이어도 표시) */}
                        {existingItem?.accountCode && existingItem.amount === 0 && (
                          <div className="ml-[5.5rem] text-xs text-blue-600 flex items-center gap-1">
                            <span>선택된 계정:</span>
                            <span className="font-mono">{existingItem.accountCode}</span>
                            <span>{existingItem.accountName}</span>
                          </div>
                        )}
                        <div className="ml-[5.5rem]">
                          <Select 
                            value={existingItem?.accountCodeId || ''} 
                            onValueChange={(value) => {
                              if (value) {
                                handleAccountCodeChange(
                                  allocation.departmentId,
                                  category,
                                  value
                                )
                              }
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue 
                                placeholder="회계 계정 선택"
                                className="text-left"
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {getFilteredAccountCodes(category).map((account) => (
                                <SelectItem key={account.id} value={account.id}>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">{account.code}</span>
                                    <span>{account.name}</span>
                                  </div>
                                </SelectItem>
                              ))}
                              {getFilteredAccountCodes(category).length === 0 && (
                                <div className="px-2 py-1 text-xs text-muted-foreground">
                                  해당 카테고리에 적합한 회계 계정이 없습니다.
                                </div>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )
                  })}
                  <Separator />
                  <div className="flex justify-between items-center">
                    <div className="text-sm">
                      <div className="font-medium">
                        소계: {allocation.totalAllocated.toLocaleString()}원
                      </div>
                    </div>
                    <Button 
                      onClick={() => handleSaveDepartmentBudget(allocation.departmentId)}
                      disabled={isLoading || allocation.budgetItems.length === 0}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      저장
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {allocation.budgetItems.length > 0 ? (
                    <>
                      {allocation.budgetItems.map((item) => (
                        <div key={item.category} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge className={`${getCategoryColor(item.category)}`}>
                                {getCategoryName(item.category)}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {item.percentage.toFixed(1)}%
                              </span>
                            </div>
                            <div className="font-medium">
                              {item.amount.toLocaleString()}원
                            </div>
                          </div>
                          {item.accountCode && (
                            <div className="ml-2 text-xs text-muted-foreground flex items-center gap-1">
                              <span>계정:</span>
                              <span className="font-mono">{item.accountCode}</span>
                              <span>{item.accountName}</span>
                            </div>
                          )}
                        </div>
                      ))}
                      <div className="flex items-center gap-2 pt-2 border-t">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-green-600">예산 배정 완료</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm">예산이 배정되지 않았습니다</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 배정 현황 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            예산 배정 현황
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>부서명</TableHead>
                  <TableHead>배정액</TableHead>
                  <TableHead>비율</TableHead>
                  <TableHead>주요 카테고리</TableHead>
                  <TableHead>연동 계정</TableHead>
                  <TableHead>상태</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allocations.map((allocation) => (
                  <TableRow key={allocation.departmentId}>
                    <TableCell className="font-medium">
                      {allocation.departmentName}
                    </TableCell>
                    <TableCell>
                      {allocation.totalAllocated.toLocaleString()}원
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress 
                          value={currentData.totalBudget > 0 ? 
                            (allocation.totalAllocated / currentData.totalBudget) * 100 : 0
                          } 
                          className="w-16 h-2" 
                        />
                        <span className="text-sm">
                          {currentData.totalBudget > 0 ? 
                            `${((allocation.totalAllocated / currentData.totalBudget) * 100).toFixed(1)}%` 
                            : '0%'
                          }
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {allocation.budgetItems
                          .sort((a, b) => b.amount - a.amount)
                          .slice(0, 2)
                          .map((item) => (
                            <Badge 
                              key={item.category} 
                              variant="secondary" 
                              className={`text-xs ${getCategoryColor(item.category)}`}
                            >
                              {getCategoryName(item.category)}
                            </Badge>
                          ))}
                        {allocation.budgetItems.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{allocation.budgetItems.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {allocation.budgetItems
                          .filter(item => item.accountCode)
                          .slice(0, 2)
                          .map((item) => (
                            <div key={item.category} className="text-xs text-muted-foreground">
                              <span className="font-mono">{item.accountCode}</span>
                            </div>
                          ))}
                        {allocation.budgetItems.filter(item => item.accountCode).length > 2 && (
                          <div className="text-xs text-muted-foreground">
                            +{allocation.budgetItems.filter(item => item.accountCode).length - 2}개
                          </div>
                        )}
                        {allocation.budgetItems.filter(item => item.accountCode).length === 0 && (
                          <span className="text-xs text-muted-foreground">미설정</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {allocation.totalAllocated > 0 ? (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          배정완료
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          미배정
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}