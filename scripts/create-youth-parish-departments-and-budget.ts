import { PrismaClient, BudgetStatus } from '@prisma/client'

const prisma = new PrismaClient()

async function createYouthParishDepartmentsAndBudget() {
  console.log('💰 Creating Youth Parish (청년교구) departments and 2025 budget...\n')

  try {
    // 1. 교회 ID 조회
    const church = await prisma.church.findFirst()
    if (!church) {
      throw new Error('No church found in database')
    }

    // 2. 김은혜 사용자 조회 (예산 생성자)
    const kimEunhyeUser = await prisma.user.findFirst({
      where: { 
        name: '김은혜',
        churchId: church.id 
      }
    })

    if (!kimEunhyeUser) {
      throw new Error('김은혜 user not found. Please create the user first.')
    }

    // 3. 청년교구(PR-YT) 하위 조직들 조회 (LEVEL_2 부서들)
    const youthParish = await prisma.organization.findFirst({
      where: {
        code: 'PR-YT',
        churchId: church.id
      }
    })

    if (!youthParish) {
      throw new Error('청년교구(PR-YT) not found.')
    }

    const youthOrganizations = await prisma.organization.findMany({
      where: {
        parentId: youthParish.id,
        level: 'LEVEL_2'
      },
      orderBy: { sortOrder: 'asc' }
    })

    console.log(`Using church: ${church.name} (${church.id})`)
    console.log(`Using creator: ${kimEunhyeUser.name} (${kimEunhyeUser.id})`)
    console.log(`Found ${youthOrganizations.length} Youth Parish departments`)

    // 4. 기존 부서와 예산 확인
    const existingDepartments = await prisma.department.findMany({
      where: {
        churchId: church.id,
        name: { in: youthOrganizations.map(org => org.name) }
      }
    })

    console.log(`\n📊 Existing departments: ${existingDepartments.length}개`)

    // 5. 2025년도 예산 기간 설정
    const startDate = new Date('2025-01-01T00:00:00.000Z')
    const endDate = new Date('2025-12-31T23:59:59.999Z')
    const budgetAmount = 20000000 // 2천만원

    console.log('\n📅 Budget Period:')
    console.log(`   Start: ${startDate.toISOString().split('T')[0]}`)
    console.log(`   End: ${endDate.toISOString().split('T')[0]}`)
    console.log(`   Amount per department: ${budgetAmount.toLocaleString()}원`)

    // 6. 각 청년교구 부서에 대해 부서와 예산 생성
    let departmentsCreated = 0
    let budgetsCreated = 0

    console.log('\n🏗️  Processing Youth Parish departments...\n')

    for (const organization of youthOrganizations) {
      console.log(`📂 Processing ${organization.name} (${organization.code})...`)
      
      try {
        // 6.1. 부서가 없으면 생성
        let department = existingDepartments.find(dept => dept.name === organization.name)
        
        if (!department) {
          department = await prisma.department.create({
            data: {
              name: organization.name,
              description: `${organization.name} 부서 - ${organization.description || '청년교구 산하 부서'}`,
              churchId: church.id,
              isActive: true,
            }
          })
          
          console.log(`   ✅ Created department: ${department.name}`)
          departmentsCreated++
        } else {
          console.log(`   📁 Department exists: ${department.name}`)
        }

        // 6.2. 2025년 예산이 없으면 생성
        const existingBudget = await prisma.budget.findFirst({
          where: {
            departmentId: department.id,
            year: 2025,
            churchId: church.id
          }
        })

        if (!existingBudget) {
          const budgetName = `${organization.name} 2025년도 예산`
          const budgetDescription = `${organization.name}의 2025년도 운영 예산입니다. 총 예산: ${budgetAmount.toLocaleString()}원`

          const budget = await prisma.budget.create({
            data: {
              name: budgetName,
              description: budgetDescription,
              year: 2025,
              totalAmount: budgetAmount,
              status: BudgetStatus.ACTIVE,
              startDate,
              endDate,
              departmentId: department.id,
              organizationId: organization.id,
              churchId: church.id,
              createdById: kimEunhyeUser.id,
            }
          })

          console.log(`   ✅ Created budget: ${budgetAmount.toLocaleString()}원`)
          budgetsCreated++
        } else {
          console.log(`   💰 Budget already exists: ${Number(existingBudget.totalAmount).toLocaleString()}원`)
        }

        console.log('')

      } catch (error: any) {
        console.error(`   ❌ Error processing ${organization.name}:`, error.message)
      }
    }

    // 7. 전체 결과 조회 및 요약
    const allYouthDepartments = await prisma.department.findMany({
      where: {
        churchId: church.id,
        name: { in: youthOrganizations.map(org => org.name) }
      },
      include: {
        budgets: {
          where: { year: 2025 },
          select: {
            id: true,
            name: true,
            totalAmount: true,
            status: true,
            startDate: true,
            endDate: true
          }
        }
      },
      orderBy: { name: 'asc' }
    })

    // 8. 최종 결과 출력
    console.log(`📊 Youth Parish 2025 Budget Creation Summary:`)
    console.log('=' .repeat(60))
    console.log(`Organizations processed: ${youthOrganizations.length}개`)
    console.log(`Departments created: ${departmentsCreated}개`)
    console.log(`Budgets created: ${budgetsCreated}개`)
    console.log(`Budget per department: ${budgetAmount.toLocaleString()}원`)
    console.log(`Total new budget amount: ${(budgetsCreated * budgetAmount).toLocaleString()}원`)

    console.log('\n💼 All Youth Parish Departments & 2025 Budgets:')
    console.log('=' .repeat(60))
    
    let totalBudgetAmount = 0
    allYouthDepartments.forEach((dept, index) => {
      console.log(`${index + 1}. 📂 ${dept.name}`)
      
      if (dept.budgets.length > 0) {
        const budget = dept.budgets[0]
        const amount = Number(budget.totalAmount)
        console.log(`   💰 Budget: ${amount.toLocaleString()}원`)
        console.log(`   📅 Period: ${budget.startDate.toISOString().split('T')[0]} ~ ${budget.endDate.toISOString().split('T')[0]}`)
        console.log(`   📊 Status: ${budget.status}`)
        totalBudgetAmount += amount
      } else {
        console.log(`   ❌ No 2025 budget found`)
      }
      console.log('')
    })

    console.log(`💰 Total Youth Parish 2025 Budget: ${totalBudgetAmount.toLocaleString()}원`)
    console.log(`📈 Departments with budgets: ${allYouthDepartments.filter(d => d.budgets.length > 0).length}/${allYouthDepartments.length}`)

    // 9. Supabase 배포 확인
    console.log('\n🔗 Supabase Deployment Status:')
    console.log('=============================')
    console.log(`Supabase 연결: ${process.env.DATABASE_URL?.includes('supabase') ? '✅ 온라인 배포됨' : '로컬'}`)
    
    if (process.env.DATABASE_URL?.includes('supabase')) {
      console.log('✅ All Youth Parish 2025 budgets have been deployed to Supabase!')
      console.log('🌐 Budget allocations are now available online')
    }

    return {
      organizationsProcessed: youthOrganizations.length,
      departmentsCreated,
      budgetsCreated,
      budgetPerDepartment: budgetAmount,
      totalNewBudgetAmount: budgetsCreated * budgetAmount,
      totalYouthBudget2025: totalBudgetAmount
    }

  } catch (error) {
    console.error('❌ Error creating Youth Parish departments and budget:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

createYouthParishDepartmentsAndBudget().catch(console.error)