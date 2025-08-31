import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function test30PlusParishSimple() {
  console.log('🔍 Testing 30+ Parish organizations...\n')

  try {
    // 1. 모든 30+ 관련 조직 찾기
    console.log('1️⃣ All 30+ Related Organizations')
    console.log('=================================')
    
    const all30PlusOrgs = await prisma.organization.findMany({
      where: {
        OR: [
          { name: { contains: '30+' } },
          { name: { contains: '30' } },
          { code: 'PR-30' },
          { code: 'DC-23' }
        ]
      },
      include: {
        createdBy: {
          select: { name: true, email: true }
        },
        updatedBy: {
          select: { name: true, email: true }
        },
        parent: {
          select: { id: true, name: true, code: true }
        },
        church: {
          select: { name: true }
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
      orderBy: { createdAt: 'asc' }
    })

    console.log(`Found ${all30PlusOrgs.length} organizations related to 30+:\n`)
    
    all30PlusOrgs.forEach((org, index) => {
      console.log(`${index + 1}. ${org.name} (${org.code})`)
      console.log(`   Level: ${org.level}`)
      console.log(`   English Name: ${org.englishName}`)
      console.log(`   Description: ${org.description}`)
      console.log(`   Parent: ${org.parent?.name || 'None'} (${org.parent?.code || 'N/A'})`)
      console.log(`   Created By: ${org.createdBy?.name || 'NULL'} (${org.createdBy?.email || 'N/A'})`)
      console.log(`   Updated By: ${org.updatedBy?.name || 'NULL'}`)
      console.log(`   Created At: ${org.createdAt.toISOString()}`)
      console.log(`   Sort Order: ${org.sortOrder}`)
      console.log(`   Active: ${org.isActive}`)
      console.log(`   Children: ${org._count.children}`)
      console.log(`   Budgets: ${org._count.budgets}`)
      console.log(`   Members: ${org._count.organizationMemberships}`)
      console.log('')
    })

    // 2. 각 30+ 조직의 직속 하위 조직들 조회
    console.log('2️⃣ Direct Sub-organizations for Each 30+ Org')
    console.log('==============================================')
    
    for (const org of all30PlusOrgs) {
      console.log(`📁 ${org.name} (${org.code}) - Sub-organizations:`)
      
      const subOrgs = await prisma.organization.findMany({
        where: {
          parentId: org.id
        },
        include: {
          createdBy: {
            select: { name: true }
          }
        },
        orderBy: { sortOrder: 'asc' }
      })

      if (subOrgs.length === 0) {
        console.log(`   No direct sub-organizations found.`)
      } else {
        subOrgs.forEach((subOrg, index) => {
          console.log(`   ${index + 1}. ${subOrg.name} (${subOrg.code}) - ${subOrg.level}`)
          console.log(`      Created By: ${subOrg.createdBy?.name || 'NULL'}`)
          console.log(`      Created At: ${subOrg.createdAt.toISOString()}`)
        })
      }
      console.log('')
    }

    // 3. 30+ 교구들의 차이점 분석
    console.log('3️⃣ Analysis of Different 30+ Organizations')
    console.log('==========================================')
    
    const kimEunhye30Plus = all30PlusOrgs.find(org => org.createdBy?.name === '김은혜')
    const other30Plus = all30PlusOrgs.find(org => org.createdBy?.name !== '김은혜')

    if (kimEunhye30Plus) {
      console.log(`🆕 김은혜가 생성한 30+교구:`)
      console.log(`   Name: ${kimEunhye30Plus.name}`)
      console.log(`   Code: ${kimEunhye30Plus.code}`)
      console.log(`   Level: ${kimEunhye30Plus.level}`)
      console.log(`   Parent: ${kimEunhye30Plus.parent?.name || 'None'}`)
      console.log(`   Created: ${kimEunhye30Plus.createdAt.toISOString()}`)
      console.log('')
    }

    if (other30Plus) {
      console.log(`📋 기존 30+교구:`)
      console.log(`   Name: ${other30Plus.name}`)
      console.log(`   Code: ${other30Plus.code}`)
      console.log(`   Level: ${other30Plus.level}`)
      console.log(`   Parent: ${other30Plus.parent?.name || 'None'}`)
      console.log(`   Created: ${other30Plus.createdAt.toISOString()}`)
      console.log('')
    }

    // 4. 30+ 조직들의 계층구조 확인 (Raw SQL 사용)
    console.log('4️⃣ Hierarchy Structure Analysis')
    console.log('================================')
    
    const hierarchySQL = `
      WITH RECURSIVE org_tree AS (
        -- 30+ 관련 조직들을 시작점으로 설정
        SELECT 
          id, name, code, level, "parentId", "sortOrder",
          0 as depth,
          name as root_name
        FROM organizations 
        WHERE name LIKE '%30%'
        
        UNION ALL
        
        -- 하위 조직들을 재귀적으로 찾기
        SELECT 
          o.id, o.name, o.code, o.level, o."parentId", o."sortOrder",
          t.depth + 1,
          t.root_name
        FROM organizations o
        JOIN org_tree t ON o."parentId" = t.id
        WHERE t.depth < 5
      )
      SELECT 
        depth,
        level,
        REPEAT('  ', depth) || name as indented_name,
        code,
        root_name
      FROM org_tree
      ORDER BY root_name, depth, "sortOrder", name
    `

    const hierarchyResults: any[] = await prisma.$queryRawUnsafe(hierarchySQL)
    
    if (hierarchyResults.length === 0) {
      console.log('No hierarchy structure found.')
    } else {
      console.log('30+ Organizations Hierarchy:')
      let currentRoot = ''
      
      hierarchyResults.forEach((row, index) => {
        if (row.root_name !== currentRoot) {
          currentRoot = row.root_name
          console.log(`\n📁 Root: ${currentRoot}`)
        }
        console.log(`${row.indented_name} (${row.code}) - ${row.level}`)
      })
    }

    // 5. 30+ 조직들과 유사한 특성 기반 교구들과 비교
    console.log('\n5️⃣ Comparison with Other Special Parishes')
    console.log('==========================================')
    
    const specialParishes = await prisma.organization.findMany({
      where: {
        AND: [
          {
            OR: [
              { name: { contains: '30+' } },
              { name: { contains: '청년' } },
              { name: { contains: '은빛' } },
              { name: { contains: 'Youth' } },
              { name: { contains: 'Silver' } }
            ]
          }
        ]
      },
      include: {
        createdBy: {
          select: { name: true }
        },
        parent: {
          select: { name: true, code: true }
        },
        _count: {
          select: { children: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    console.log(`Special characteristic-based organizations:`)
    
    specialParishes.forEach((org, index) => {
      console.log(`${index + 1}. ${org.name} (${org.code})`)
      console.log(`   Level: ${org.level}`)
      console.log(`   Parent: ${org.parent?.name || 'None'}`)
      console.log(`   Created By: ${org.createdBy?.name || 'NULL'}`)
      console.log(`   Children: ${org._count.children}`)
      console.log(`   Created: ${org.createdAt.toISOString()}`)
      console.log('')
    })

    // 6. 결과 요약
    console.log('📊 Summary')
    console.log('==========')
    console.log(`Total 30+ related organizations: ${all30PlusOrgs.length}`)
    
    const hasKimEunhye = all30PlusOrgs.some(org => org.createdBy?.name === '김은혜')
    const hasOthers = all30PlusOrgs.some(org => org.createdBy?.name !== '김은혜')
    
    console.log(`Created by 김은혜: ${hasKimEunhye ? 'Yes' : 'No'}`)
    console.log(`Created by others: ${hasOthers ? 'Yes' : 'No'}`)
    
    const totalChildren = all30PlusOrgs.reduce((sum, org) => sum + org._count.children, 0)
    console.log(`Total sub-organizations: ${totalChildren}`)
    
    const levelDistribution: Record<string, number> = {}
    all30PlusOrgs.forEach(org => {
      levelDistribution[org.level] = (levelDistribution[org.level] || 0) + 1
    })
    
    console.log('Level distribution:')
    Object.keys(levelDistribution).forEach(level => {
      console.log(`  ${level}: ${levelDistribution[level]}`)
    })

    return {
      total: all30PlusOrgs.length,
      withSubOrgs: all30PlusOrgs.filter(org => org._count.children > 0).length,
      totalChildren: totalChildren,
      specialParishes: specialParishes.length
    }

  } catch (error) {
    console.error('❌ Error testing 30+ Parish:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

test30PlusParishSimple().catch(console.error)