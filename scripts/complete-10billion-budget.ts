#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'
import { BudgetCategory } from '@prisma/client'

const prisma = new PrismaClient()

async function complete10BillionBudget() {
  try {
    console.log('💰 10억원 예산 완성을 위한 추가 배정...')

    // 과천교회 정보 조회
    const church = await prisma.church.findFirst({
      where: { name: '과천교회' }
    })

    if (!church) {
      console.error('❌ 과천교회를 찾을 수 없습니다.')
      return
    }

    // 현재 2025년 예산 현황 조회
    const existingBudgets = await prisma.budget.findMany({
      where: {
        churchId: church.id,
        year: 2025
      },
      include: {
        department: { select: { name: true } }
      }
    })

    const currentTotal = existingBudgets.reduce((sum, budget) => sum + Number(budget.totalAmount), 0)
    const target = 1000000000 // 10억원
    const remaining = target - currentTotal

    console.log(`✅ 현재 총 예산: ${currentTotal.toLocaleString()}원`)
    console.log(`🎯 목표 예산: ${target.toLocaleString()}원`)
    console.log(`📊 부족 금액: ${remaining.toLocaleString()}원`)

    if (remaining <= 0) {
      console.log('🎉 이미 10억원 예산이 달성되었습니다!')
      return
    }

    // 관리자 사용자 조회
    const adminUser = await prisma.user.findFirst({
      where: {
        churchId: church.id,
        role: 'SUPER_ADMIN'
      }
    })

    if (!adminUser) {
      console.error('❌ 관리자 사용자를 찾을 수 없습니다.')
      return
    }

    // 예배부 예산 업데이트 (2억원 → 3.4억원)
    const 예배부Budget = existingBudgets.find(b => b.department.name === '예배부')
    if (예배부Budget) {
      const additionalAmount = remaining // 남은 금액을 모두 예배부에 배정

      await prisma.$transaction(async (tx) => {
        // 예배부 예산 총액 업데이트
        await tx.budget.update({
          where: { id: 예배부Budget.id },
          data: {
            totalAmount: Number(예배부Budget.totalAmount) + additionalAmount,
            description: `2025년 예배부 부서별 예산 배정 - 총 ${(Number(예배부Budget.totalAmount) + additionalAmount).toLocaleString()}원`
          }
        })

        // 새로운 예산 항목 추가
        const additionalItem = await tx.budgetItem.create({
          data: {
            name: '시설 개선',
            amount: additionalAmount,
            category: BudgetCategory.FACILITIES,
            code: '예배부_FACILITIES_UPGRADE',
            description: '예배실 및 부속시설 개선, 장비 업그레이드',
            budgetId: 예배부Budget.id
          }
        })

        // 예산 집행 현황 초기화
        await tx.budgetExecution.create({
          data: {
            budgetItemId: additionalItem.id,
            totalBudget: additionalAmount,
            usedAmount: 0,
            pendingAmount: 0,
            remainingAmount: additionalAmount,
            executionRate: 0
          }
        })

        console.log(`✅ 예배부 예산 업데이트: +${additionalAmount.toLocaleString()}원 (총 ${(Number(예배부Budget.totalAmount) + additionalAmount).toLocaleString()}원)`)
      })
    }

    // 최종 확인
    const finalBudgets = await prisma.budget.findMany({
      where: {
        churchId: church.id,
        year: 2025
      },
      include: {
        department: { select: { name: true } },
        budgetItems: true
      },
      orderBy: { totalAmount: 'desc' }
    })

    const finalTotal = finalBudgets.reduce((sum, budget) => sum + Number(budget.totalAmount), 0)
    
    console.log(`\n🎉 10억원 예산 배정 완료!`)
    console.log(`💰 최종 총 예산: ${finalTotal.toLocaleString()}원`)
    
    console.log(`\n📋 부서별 예산 현황:`)
    for (const budget of finalBudgets.slice(0, 10)) { // 상위 10개만 표시
      console.log(`   - ${budget.department.name}: ${Number(budget.totalAmount).toLocaleString()}원 (항목 ${budget.budgetItems.length}개)`)
    }

    if (finalBudgets.length > 10) {
      const remainingBudgets = finalBudgets.slice(10)
      const remainingTotal = remainingBudgets.reduce((sum, budget) => sum + Number(budget.totalAmount), 0)
      console.log(`   - 기타 ${remainingBudgets.length}개 부서: ${remainingTotal.toLocaleString()}원`)
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 스크립트 실행
if (require.main === module) {
  complete10BillionBudget()
}