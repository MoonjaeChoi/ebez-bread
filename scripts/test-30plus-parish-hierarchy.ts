import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function test30PlusParishHierarchy() {
  console.log('🔍 Testing 30+ Parish organization and its sub-organizations...\n')

  try {
    // 1. 30+교구 기본 조회
    console.log('1️⃣ Basic Query: 30+교구 조직 정보')
    console.log('=====================================')
    
    const thirtyPlusParish = await prisma.organization.findFirst({
      where: {
        OR: [
          { code: 'PR-30' },
          { 
            AND: [
              { name: { contains: '30+교구' } },
              { level: 'LEVEL_1' }
            ]
          }
        ]
      },
      orderBy: [
        { level: 'asc' }, // Prioritize LEVEL_1 (parishes)
        { code: 'asc' }
      ],
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
        }
      }
    })

    if (!thirtyPlusParish) {
      console.log('❌ 30+교구를 찾을 수 없습니다.')
      return
    }

    console.log(`✅ Found 30+ Parish:`)
    console.log(`   ID: ${thirtyPlusParish.id}`)
    console.log(`   Name: ${thirtyPlusParish.name}`)
    console.log(`   Code: ${thirtyPlusParish.code}`)
    console.log(`   English Name: ${thirtyPlusParish.englishName}`)
    console.log(`   Level: ${thirtyPlusParish.level}`)
    console.log(`   Description: ${thirtyPlusParish.description}`)
    console.log(`   Sort Order: ${thirtyPlusParish.sortOrder}`)
    console.log(`   Active: ${thirtyPlusParish.isActive}`)
    console.log(`   Created By: ${thirtyPlusParish.createdBy?.name} (${thirtyPlusParish.createdBy?.email})`)
    console.log(`   Updated By: ${thirtyPlusParish.updatedBy?.name || 'NULL'}`)
    console.log(`   Created At: ${thirtyPlusParish.createdAt.toISOString()}`)
    console.log(`   Updated At: ${thirtyPlusParish.updatedAt.toISOString()}`)
    console.log(`   Church: ${thirtyPlusParish.church.name}`)
    console.log(`   Parent: ${thirtyPlusParish.parent?.name || 'None (Top Level)'}`)

    // 2. 직속 하위 조직 조회 (LEVEL_2)
    console.log('\n2️⃣ Direct Sub-organizations (LEVEL_2)')
    console.log('======================================')
    
    const level2SubOrgs = await prisma.organization.findMany({
      where: {
        parentId: thirtyPlusParish.id,
        level: 'LEVEL_2'
      },
      include: {
        createdBy: {
          select: { name: true, email: true }
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
      orderBy: { sortOrder: 'asc' }
    })

    console.log(`Found ${level2SubOrgs.length} LEVEL_2 sub-organizations:`)
    
    if (level2SubOrgs.length === 0) {
      console.log('   No LEVEL_2 sub-organizations found.')
    } else {
      level2SubOrgs.forEach((org, index) => {
        console.log(`   ${index + 1}. ${org.name} (${org.code})`)
        console.log(`      Level: ${org.level}`)
        console.log(`      Created By: ${org.createdBy?.name || 'NULL'}`)
        console.log(`      Children: ${org._count.children}`)
        console.log(`      Budgets: ${org._count.budgets}`)
        console.log(`      Members: ${org._count.organizationMemberships}`)
        console.log('')
      })
    }

    // 3. 전체 하위 조직 계층 구조 조회 (모든 레벨)
    console.log('\n3️⃣ Complete Hierarchy: All Sub-organizations')
    console.log('=============================================')
    
    const completeHierarchy = await prisma.organization.findUnique({
      where: { id: thirtyPlusParish.id },
      include: {
        children: {
          include: {
            createdBy: {
              select: { name: true }
            },
            children: {
              include: {
                createdBy: {
                  select: { name: true }
                },
                children: {
                  include: {
                    createdBy: {
                      select: { name: true }
                    }
                  },
                  orderBy: { sortOrder: 'asc' }
                }
              },
              orderBy: { sortOrder: 'asc' }
            }
          },
          orderBy: { sortOrder: 'asc' }
        }
      }
    })

    if (completeHierarchy && completeHierarchy.children.length > 0) {
      console.log('Complete organizational hierarchy:')
      console.log(`📁 ${completeHierarchy.name} (${completeHierarchy.code}) - LEVEL_1`)
      
      completeHierarchy.children.forEach((level2, i) => {
        console.log(`  📁 ${level2.name} (${level2.code}) - LEVEL_2`)
        
        if (level2.children.length > 0) {
          level2.children.forEach((level3, j) => {
            console.log(`    📁 ${level3.name} (${level3.code}) - LEVEL_3`)
            
            if (level3.children.length > 0) {
              level3.children.forEach((level4, k) => {
                console.log(`      📄 ${level4.name} (${level4.code}) - LEVEL_4`)
              })
            }
          })
        }
      })
    } else {
      console.log('📁 30+교구 has no sub-organizations yet.')
    }

    // 4. 다른 30+ 관련 조직 검색 (혹시 다른 형태로 존재하는지)
    console.log('\n4️⃣ Related Organizations Search')
    console.log('================================')
    
    const relatedOrgs = await prisma.organization.findMany({
      where: {
        OR: [
          { name: { contains: '30' } },
          { englishName: { contains: '30' } },
          { code: { contains: '30' } },
          { description: { contains: '30' } }
        ]
      },
      include: {
        createdBy: {
          select: { name: true }
        },
        parent: {
          select: { name: true, code: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    console.log(`Found ${relatedOrgs.length} organizations related to '30':`)
    
    relatedOrgs.forEach((org, index) => {
      const isTarget = org.id === thirtyPlusParish.id
      const marker = isTarget ? '🎯 ' : '   '
      
      console.log(`${marker}${index + 1}. ${org.name} (${org.code})`)
      console.log(`${marker}   Level: ${org.level}`)
      console.log(`${marker}   Parent: ${org.parent?.name || 'None'}`)
      console.log(`${marker}   Created By: ${org.createdBy?.name || 'NULL'}`)
      console.log(`${marker}   Created At: ${org.createdAt.toISOString()}`)
      console.log('')
    })

    // 5. 30+교구와 유사한 다른 교구들과 비교
    console.log('\n5️⃣ Comparison with Other Special Parishes')
    console.log('==========================================')
    
    const specialParishes = await prisma.organization.findMany({
      where: {
        AND: [
          { level: 'LEVEL_1' },
          { code: { startsWith: 'PR-' } },
          {
            OR: [
              { name: { contains: '30+' } },
              { name: { contains: '청년' } },
              { name: { contains: '은빛' } }
            ]
          }
        ]
      },
      include: {
        createdBy: {
          select: { name: true }
        },
        _count: {
          select: { children: true }
        }
      },
      orderBy: { sortOrder: 'asc' }
    })

    console.log(`Special characteristic-based parishes:`)
    
    specialParishes.forEach((parish, index) => {
      const isTarget = parish.id === thirtyPlusParish.id
      const marker = isTarget ? '🎯 ' : '   '
      
      console.log(`${marker}${index + 1}. ${parish.name} (${parish.code})`)
      console.log(`${marker}   English: ${parish.englishName}`)
      console.log(`${marker}   Sub-orgs: ${parish._count.children}`)
      console.log(`${marker}   Created By: ${parish.createdBy?.name || 'NULL'}`)
      console.log('')
    })

    // 6. 30+교구 통계 및 관련 데이터
    console.log('\n6️⃣ 30+ Parish Statistics')
    console.log('=========================')
    
    const stats = await prisma.organization.findUnique({
      where: { id: thirtyPlusParish.id },
      include: {
        _count: {
          select: {
            children: true,
            budgets: true,
            budgetItems: true,
            expenseReports: true,
            responsibleUsers: true,
            organizationMemberships: true
          }
        },
        responsibleUsers: {
          select: { id: true, name: true, email: true, role: true }
        }
      }
    })

    if (stats) {
      console.log('Organization Statistics:')
      console.log(`  Direct Children: ${stats._count.children}`)
      console.log(`  Budgets: ${stats._count.budgets}`)
      console.log(`  Budget Items: ${stats._count.budgetItems}`)
      console.log(`  Expense Reports: ${stats._count.expenseReports}`)
      console.log(`  Responsible Users: ${stats._count.responsibleUsers}`)
      console.log(`  Memberships: ${stats._count.organizationMemberships}`)
      
      if (stats.responsibleUsers.length > 0) {
        console.log('\nResponsible Users:')
        stats.responsibleUsers.forEach((user, index) => {
          console.log(`  ${index + 1}. ${user.name} (${user.email}) - ${user.role}`)
        })
      } else {
        console.log('\nNo responsible users assigned yet.')
      }
    }

    // 7. Raw SQL로 계층구조 확인
    console.log('\n7️⃣ Raw SQL Hierarchy Check')
    console.log('===========================')
    
    const hierarchySQL = `
      WITH RECURSIVE org_hierarchy AS (
        -- Base case: start with 30+ Parish
        SELECT 
          id, name, code, level, "parentId", "sortOrder",
          0 as depth,
          ARRAY[name] as path,
          name as root_name
        FROM organizations 
        WHERE code = 'PR-30'
        
        UNION ALL
        
        -- Recursive case: find children
        SELECT 
          o.id, o.name, o.code, o.level, o."parentId", o."sortOrder",
          h.depth + 1,
          h.path || o.name,
          h.root_name
        FROM organizations o
        JOIN org_hierarchy h ON o."parentId" = h.id
        WHERE h.depth < 10  -- Prevent infinite recursion
      )
      SELECT 
        depth,
        level,
        REPEAT('  ', depth) || name as indented_name,
        code,
        "sortOrder",
        array_to_string(path, ' > ') as full_path
      FROM org_hierarchy
      ORDER BY depth, "sortOrder", name
    `

    const hierarchyResults: any[] = await prisma.$queryRawUnsafe(hierarchySQL)
    
    console.log('SQL Hierarchy Results:')
    if (hierarchyResults.length === 0) {
      console.log('  No hierarchy found (organization may not exist or have no children)')
    } else {
      hierarchyResults.forEach((row, index) => {
        console.log(`${index + 1}. ${row.indented_name} (${row.code}) - ${row.level}`)
        if (row.depth > 0) {
          console.log(`   Path: ${row.full_path}`)
        }
        console.log('')
      })
    }

    return {
      found: !!thirtyPlusParish,
      directChildren: level2SubOrgs.length,
      totalRelated: relatedOrgs.length,
      specialParishes: specialParishes.length,
      hierarchyDepth: hierarchyResults.length
    }

  } catch (error) {
    console.error('❌ Error testing 30+ Parish hierarchy:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

test30PlusParishHierarchy().catch(console.error)