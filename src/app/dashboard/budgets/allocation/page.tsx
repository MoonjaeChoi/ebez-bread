'use client'

import { DepartmentBudgetAllocation } from '@/components/budgets/department-budget-allocation'

export default function BudgetAllocationPage() {
  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">부서별 예산 배정</h1>
        <p className="text-muted-foreground">
          연간 예산을 부서별로 배정하고 카테고리별 세부 계획을 수립하세요
        </p>
      </div>
      
      <DepartmentBudgetAllocation />
    </div>
  )
}