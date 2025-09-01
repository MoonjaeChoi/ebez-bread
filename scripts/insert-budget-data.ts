#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'
import { BudgetCategory, BudgetStatus } from '@prisma/client'

const prisma = new PrismaClient()

async function insertBudgetData() {
  try {
    console.log('🏦 부서별 예산 데이터 삽입 시작...')

    // 과천교회 정보 조회
    const church = await prisma.church.findFirst({
      where: { name: '과천교회' }
    })

    if (!church) {
      console.error('❌ 과천교회를 찾을 수 없습니다.')
      return
    }

    console.log(`✅ 교회 정보: ${church.name} (ID: ${church.id})`)

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

    console.log(`✅ 관리자 사용자: ${adminUser.name} (${adminUser.email})`)

    // 부서 정보 조회
    const departments = await prisma.department.findMany({
      where: { churchId: church.id }
    })

    console.log(`✅ 부서 개수: ${departments.length}개`)

    // 부서별 예산 배정 데이터
    const budgetData = [
      {
        departmentName: '예배부',
        amount: 200000000,
        items: [
          { name: '음향/영상 장비', amount: 80000000, category: 'FACILITIES' as BudgetCategory },
          { name: '예배용품', amount: 60000000, category: 'OPERATIONS' as BudgetCategory },
          { name: '성가대 운영', amount: 60000000, category: 'MINISTRY' as BudgetCategory }
        ]
      },
      {
        departmentName: '교육부',
        amount: 150000000,
        items: [
          { name: '교육 프로그램', amount: 80000000, category: 'EDUCATION' as BudgetCategory },
          { name: '교육자료', amount: 40000000, category: 'EDUCATION' as BudgetCategory },
          { name: '교사 연수', amount: 30000000, category: 'EDUCATION' as BudgetCategory }
        ]
      },
      {
        departmentName: '선교부',
        amount: 120000000,
        items: [
          { name: '선교사 후원', amount: 70000000, category: 'MISSION' as BudgetCategory },
          { name: '선교 프로그램', amount: 30000000, category: 'MISSION' as BudgetCategory },
          { name: '선교 자료', amount: 20000000, category: 'MISSION' as BudgetCategory }
        ]
      },
      {
        departmentName: '행정부',
        amount: 100000000,
        items: [
          { name: '사무용품', amount: 30000000, category: 'OPERATIONS' as BudgetCategory },
          { name: '시설관리', amount: 50000000, category: 'MANAGEMENT' as BudgetCategory },
          { name: '통신비', amount: 20000000, category: 'MANAGEMENT' as BudgetCategory }
        ]
      },
      {
        departmentName: '전도부',
        amount: 80000000,
        items: [
          { name: '전도 이벤트', amount: 50000000, category: 'EVENT' as BudgetCategory },
          { name: '새가족 환영회', amount: 20000000, category: 'EVENT' as BudgetCategory },
          { name: '전도 자료', amount: 10000000, category: 'OPERATIONS' as BudgetCategory }
        ]
      },
      {
        departmentName: '봉사부',
        amount: 60000000,
        items: [
          { name: '사회봉사', amount: 30000000, category: 'WELFARE' as BudgetCategory },
          { name: '구제사업', amount: 20000000, category: 'WELFARE' as BudgetCategory },
          { name: '봉사활동', amount: 10000000, category: 'WELFARE' as BudgetCategory }
        ]
      },
      {
        departmentName: '청년부',
        amount: 80000000,
        items: [
          { name: '청년 모임', amount: 40000000, category: 'MINISTRY' as BudgetCategory },
          { name: '수련회', amount: 30000000, category: 'EVENT' as BudgetCategory },
          { name: '청년 사역', amount: 10000000, category: 'MINISTRY' as BudgetCategory }
        ]
      },
      {
        departmentName: '총무부',
        amount: 70000000,
        items: [
          { name: '인건비', amount: 40000000, category: 'PERSONNEL' as BudgetCategory },
          { name: '관리비', amount: 20000000, category: 'MANAGEMENT' as BudgetCategory },
          { name: '기타', amount: 10000000, category: 'OTHER' as BudgetCategory }
        ]
      }
    ]

    let totalInserted = 0
    const year = 2025

    for (const budgetInfo of budgetData) {
      const department = departments.find(d => d.name === budgetInfo.departmentName)
      if (!department) {
        console.log(`⚠️  부서 '${budgetInfo.departmentName}'을 찾을 수 없습니다. 건너뜁니다.`)
        continue
      }

      // 기존 예산이 있는지 확인
      const existingBudget = await prisma.budget.findFirst({
        where: {
          departmentId: department.id,
          year: year,
          churchId: church.id
        }
      })

      if (existingBudget) {
        console.log(`⚠️  ${budgetInfo.departmentName} ${year}년 예산이 이미 존재합니다. 건너뜁니다.`)
        continue
      }

      // 트랜잭션으로 예산 및 항목 생성
      await prisma.$transaction(async (tx) => {
        // 예산 생성
        const budget = await tx.budget.create({
          data: {
            name: `${budgetInfo.departmentName} ${year}년 예산`,
            description: `${year}년 ${budgetInfo.departmentName} 부서별 예산 배정`,
            year: year,
            totalAmount: budgetInfo.amount,
            status: BudgetStatus.ACTIVE,
            startDate: new Date(`${year}-01-01`),
            endDate: new Date(`${year}-12-31`),
            churchId: church.id,
            departmentId: department.id,
            createdById: adminUser.id
          }
        })

        // 예산 항목들 생성
        for (const item of budgetInfo.items) {
          const budgetItem = await tx.budgetItem.create({
            data: {
              name: item.name,
              amount: item.amount,
              category: item.category,
              code: `${department.name}_${item.category}`,
              description: `${item.name} 예산`,
              budgetId: budget.id
            }
          })

          // 예산 집행 현황 초기화
          await tx.budgetExecution.create({
            data: {
              budgetItemId: budgetItem.id,
              totalBudget: item.amount,
              usedAmount: 0,
              pendingAmount: 0,
              remainingAmount: item.amount,
              executionRate: 0
            }
          })
        }

        console.log(`✅ ${budgetInfo.departmentName} 예산 생성: ${budgetInfo.amount.toLocaleString()}원`)
        totalInserted++
      })
    }

    // 결과 요약
    console.log(`\n📊 예산 생성 완료 요약:`)
    console.log(`   - 생성된 예산: ${totalInserted}개`)
    
    const totalBudgetAmount = budgetData.reduce((sum, b) => sum + b.amount, 0)
    console.log(`   - 총 예산액: ${totalBudgetAmount.toLocaleString()}원 (${totalBudgetAmount / 100000000}억원)`)

    // 생성된 예산 확인
    const createdBudgets = await prisma.budget.findMany({
      where: {
        churchId: church.id,
        year: year
      },
      include: {
        department: { select: { name: true } },
        budgetItems: true
      },
      orderBy: { totalAmount: 'desc' }
    })

    console.log(`\n🎯 생성된 예산 목록:`)
    for (const budget of createdBudgets) {
      console.log(`   - ${budget.department.name}: ${Number(budget.totalAmount).toLocaleString()}원 (항목 ${budget.budgetItems.length}개)`)
    }

    console.log(`\n🎉 부서별 예산 데이터 삽입 완료!`)

  } catch (error) {
    console.error('❌ 오류 발생:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 스크립트 실행
if (require.main === module) {
  insertBudgetData()
}