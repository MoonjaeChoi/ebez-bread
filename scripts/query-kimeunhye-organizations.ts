import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function queryKimEunhyeOrganizations() {
  console.log('🔍 Querying organizations created by 김은혜...\n')

  try {
    // 1. 김은혜 사용자 ID 조회
    const kimEunhyeUser = await prisma.user.findFirst({
      where: { name: '김은혜' },
      select: { id: true, name: true, email: true, role: true }
    })

    if (!kimEunhyeUser) {
      throw new Error('김은혜 user not found')
    }

    console.log(`👤 Target User: ${kimEunhyeUser.name} (${kimEunhyeUser.email})`)
    console.log(`   Role: ${kimEunhyeUser.role}`)
    console.log(`   ID: ${kimEunhyeUser.id}\n`)

    // 2. 기본 조회: 김은혜가 생성한 모든 조직
    console.log('📋 Query 1: 김은혜가 생성한 모든 조직')
    console.log('========================================')
    
    const allOrganizations = await prisma.organization.findMany({
      where: {
        createdById: kimEunhyeUser.id
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true }
        },
        updatedBy: {
          select: { id: true, name: true, email: true }
        },
        church: {
          select: { id: true, name: true }
        },
        parent: {
          select: { id: true, name: true, code: true }
        },
        _count: {
          select: {
            children: true,
            budgets: true,
            budgetItems: true,
            expenseReports: true,
            organizationMemberships: true
          }
        }
      },
      orderBy: [
        { level: 'asc' },
        { sortOrder: 'asc' },
        { createdAt: 'asc' }
      ]
    })

    console.log(`Found ${allOrganizations.length} organizations created by 김은혜:\n`)

    allOrganizations.forEach((org, index) => {
      console.log(`${index + 1}. ${org.name} (${org.code})`)
      console.log(`   Level: ${org.level}`)
      console.log(`   English Name: ${org.englishName || 'N/A'}`)
      console.log(`   Description: ${org.description || 'N/A'}`)
      console.log(`   Parent: ${org.parent?.name || 'None'} (${org.parent?.code || 'N/A'})`)
      console.log(`   Created: ${org.createdAt.toISOString()}`)
      console.log(`   Updated: ${org.updatedAt.toISOString()}`)
      console.log(`   Updated By: ${org.updatedBy?.name || 'NULL'}`)
      console.log(`   Sort Order: ${org.sortOrder}`)
      console.log(`   Active: ${org.isActive}`)
      console.log(`   Children: ${org._count.children}`)
      console.log(`   Budgets: ${org._count.budgets}`)
      console.log(`   Budget Items: ${org._count.budgetItems}`)
      console.log(`   Expense Reports: ${org._count.expenseReports}`)
      console.log(`   Memberships: ${org._count.organizationMemberships}`)
      console.log('')
    })

    // 3. LEVEL별 조회
    console.log('\n📊 Query 2: 김은혜가 생성한 조직 - 레벨별 분류')
    console.log('===============================================')
    
    const organizationsByLevel = await prisma.organization.groupBy({
      by: ['level'],
      where: {
        createdById: kimEunhyeUser.id
      },
      _count: {
        _all: true
      },
      orderBy: {
        level: 'asc'
      }
    })

    organizationsByLevel.forEach(group => {
      console.log(`${group.level}: ${group._count._all} organizations`)
    })

    // 4. 교구만 조회 (PR- 코드로 시작)
    console.log('\n🏛️ Query 3: 김은혜가 생성한 교구 조직 (PR- 코드)')
    console.log('===============================================')
    
    const parishOrganizations = await prisma.organization.findMany({
      where: {
        createdById: kimEunhyeUser.id,
        code: {
          startsWith: 'PR-'
        }
      },
      include: {
        createdBy: {
          select: { name: true, email: true }
        }
      },
      orderBy: {
        sortOrder: 'asc'
      }
    })

    console.log(`Found ${parishOrganizations.length} parish organizations:\n`)

    parishOrganizations.forEach((org, index) => {
      console.log(`${index + 1}. ${org.name}`)
      console.log(`   Code: ${org.code}`)
      console.log(`   English Name: ${org.englishName}`)
      console.log(`   Created: ${org.createdAt.toISOString()}`)
      console.log(`   Sort Order: ${org.sortOrder}`)
      console.log('')
    })

    // 5. 최근 생성된 조직 (최근 7일)
    console.log('\n📅 Query 4: 김은혜가 최근 7일간 생성한 조직')
    console.log('==========================================')
    
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const recentOrganizations = await prisma.organization.findMany({
      where: {
        createdById: kimEunhyeUser.id,
        createdAt: {
          gte: sevenDaysAgo
        }
      },
      include: {
        createdBy: {
          select: { name: true, email: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log(`Found ${recentOrganizations.length} organizations created in the last 7 days:\n`)

    recentOrganizations.forEach((org, index) => {
      const daysAgo = Math.floor((Date.now() - org.createdAt.getTime()) / (1000 * 60 * 60 * 24))
      console.log(`${index + 1}. ${org.name} (${org.code})`)
      console.log(`   Created: ${org.createdAt.toISOString()} (${daysAgo} days ago)`)
      console.log(`   Level: ${org.level}`)
      console.log('')
    })

    // 6. 김은혜가 수정한 조직 (생성자와 수정자가 다를 수 있음)
    console.log('\n✏️  Query 5: 김은혜가 수정한 조직 (생성자 불문)')
    console.log('==========================================')
    
    const updatedOrganizations = await prisma.organization.findMany({
      where: {
        updatedById: kimEunhyeUser.id
      },
      include: {
        createdBy: {
          select: { name: true, email: true }
        },
        updatedBy: {
          select: { name: true, email: true }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    })

    console.log(`Found ${updatedOrganizations.length} organizations updated by 김은혜:\n`)

    updatedOrganizations.forEach((org, index) => {
      console.log(`${index + 1}. ${org.name} (${org.code})`)
      console.log(`   Created By: ${org.createdBy?.name || 'NULL'}`)
      console.log(`   Updated By: ${org.updatedBy?.name || 'NULL'}`)
      console.log(`   Created: ${org.createdAt.toISOString()}`)
      console.log(`   Updated: ${org.updatedAt.toISOString()}`)
      console.log('')
    })

    // 7. 통계 요약
    console.log('\n📊 Summary Statistics')
    console.log('====================')
    console.log(`Total organizations created by 김은혜: ${allOrganizations.length}`)
    console.log(`Parish organizations (PR-*): ${parishOrganizations.length}`)
    console.log(`Organizations updated by 김은혜: ${updatedOrganizations.length}`)
    console.log(`Recent organizations (last 7 days): ${recentOrganizations.length}`)
    
    // Level별 요약
    console.log('\nBy Level:')
    organizationsByLevel.forEach(group => {
      console.log(`  ${group.level}: ${group._count._all}`)
    })

    // 활성/비활성 상태
    const activeCount = allOrganizations.filter(o => o.isActive).length
    const inactiveCount = allOrganizations.filter(o => !o.isActive).length
    console.log('\nBy Status:')
    console.log(`  Active: ${activeCount}`)
    console.log(`  Inactive: ${inactiveCount}`)

    return {
      total: allOrganizations.length,
      parishes: parishOrganizations.length,
      updated: updatedOrganizations.length,
      recent: recentOrganizations.length,
      active: activeCount,
      inactive: inactiveCount
    }

  } catch (error) {
    console.error('❌ Error querying 김은혜 organizations:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

queryKimEunhyeOrganizations().catch(console.error)