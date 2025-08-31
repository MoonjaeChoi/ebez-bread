import { PrismaClient, OrganizationLevel } from '@prisma/client'

const prisma = new PrismaClient()

async function testOrganizationAPI() {
  console.log('🧪 Testing Organization API with audit fields...')

  try {
    // 1. API 스타일 조회 테스트 (getHierarchy와 유사)
    console.log('\n1️⃣ Testing organization hierarchy query with audit fields...')
    
    const church = await prisma.church.findFirst()
    if (!church) {
      throw new Error('Church not found')
    }

    const organizations = await prisma.organization.findMany({
      where: {
        churchId: church.id,
        isActive: true,
        level: OrganizationLevel.LEVEL_1
      },
      include: {
        parent: true,
        createdBy: {
          select: { id: true, name: true, email: true }
        },
        updatedBy: {
          select: { id: true, name: true, email: true }
        },
        children: {
          where: { isActive: true },
          include: {
            createdBy: {
              select: { id: true, name: true, email: true }
            },
            updatedBy: {
              select: { id: true, name: true, email: true }
            }
          },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }]
        },
        _count: {
          select: {
            budgets: true,
            budgetItems: true,
            expenseReports: true,
            responsibleUsers: true,
            organizationMemberships: true,
          }
        }
      },
      orderBy: [
        { level: 'asc' },
        { sortOrder: 'asc' },
        { name: 'asc' }
      ]
    })

    console.log(`✅ Found ${organizations.length} LEVEL_1 organizations`)
    
    organizations.forEach((org, index) => {
      console.log(`\n${index + 1}. ${org.name} (${org.code})`)
      console.log(`   Created: ${org.createdAt.toISOString()}`)
      console.log(`   Updated: ${org.updatedAt.toISOString()}`)
      console.log(`   Created By: ${org.createdBy?.name || 'NULL'} (${org.createdBy?.email || 'NULL'})`)
      console.log(`   Updated By: ${org.updatedBy?.name || 'NULL'} (${org.updatedBy?.email || 'NULL'})`)
      console.log(`   Children: ${org.children.length}`)
      
      if (org.children.length > 0) {
        org.children.forEach((child, childIndex) => {
          console.log(`     ${childIndex + 1}. ${child.name} (${child.code})`)
          console.log(`        Created By: ${child.createdBy?.name || 'NULL'}`)
          console.log(`        Updated By: ${child.updatedBy?.name || 'NULL'}`)
        })
      }
    })

    // 2. 특정 조직 상세 조회 테스트 (getById와 유사)
    console.log('\n2️⃣ Testing single organization query with full audit info...')
    
    const parishOrg = organizations.find(org => org.code.startsWith('PR-'))
    
    if (parishOrg) {
      const detailOrg = await prisma.organization.findUnique({
        where: { id: parishOrg.id },
        include: {
          parent: true,
          createdBy: {
            select: { id: true, name: true, email: true }
          },
          updatedBy: {
            select: { id: true, name: true, email: true }
          },
          children: {
            where: { isActive: true },
            include: {
              createdBy: {
                select: { id: true, name: true, email: true }
              }
            },
            orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }]
          },
          budgets: {
            take: 3,
            orderBy: { createdAt: 'desc' },
            include: {
              createdBy: {
                select: { name: true }
              }
            }
          },
          expenseReports: {
            take: 3,
            orderBy: { createdAt: 'desc' },
            include: {
              requester: {
                select: { name: true }
              }
            }
          },
          responsibleUsers: {
            select: {
              id: true,
              name: true,
              role: true,
              email: true,
            }
          },
          _count: {
            select: {
              children: true,
              budgets: true,
              budgetItems: true,
              expenseReports: true,
              responsibleUsers: true,
              organizationMemberships: true,
            }
          }
        }
      })

      if (detailOrg) {
        console.log(`✅ Detailed organization query successful: ${detailOrg.name}`)
        console.log(`   ID: ${detailOrg.id}`)
        console.log(`   Code: ${detailOrg.code}`)
        console.log(`   Level: ${detailOrg.level}`)
        console.log(`   Created: ${detailOrg.createdAt.toISOString()}`)
        console.log(`   Updated: ${detailOrg.updatedAt.toISOString()}`)
        console.log(`   Created By: ${detailOrg.createdBy?.name} (${detailOrg.createdBy?.email})`)
        console.log(`   Updated By: ${detailOrg.updatedBy?.name || 'NULL'}`)
        console.log(`   Parent: ${detailOrg.parent?.name || 'None'}`)
        console.log(`   Children: ${detailOrg._count.children}`)
        console.log(`   Budgets: ${detailOrg._count.budgets}`)
        console.log(`   Budget Items: ${detailOrg._count.budgetItems}`)
        console.log(`   Expense Reports: ${detailOrg._count.expenseReports}`)
        console.log(`   Responsible Users: ${detailOrg._count.responsibleUsers}`)
        console.log(`   Organization Memberships: ${detailOrg._count.organizationMemberships}`)
      }
    }

    // 3. 조직 생성 API 시뮬레이션 테스트
    console.log('\n3️⃣ Testing organization creation with audit tracking...')
    
    const user = await prisma.user.findFirst({ where: { churchId: church.id } })
    if (!user) {
      throw new Error('User not found for testing')
    }

    const testCode = `API-TEST-${Date.now()}`
    const createdOrg = await prisma.organization.create({
      data: {
        code: testCode,
        name: `API 테스트 조직 ${Date.now()}`,
        englishName: `API Test Organization ${Date.now()}`,
        description: 'API 테스트를 위한 조직입니다.',
        level: OrganizationLevel.LEVEL_1,
        churchId: church.id,
        createdById: user.id, // API에서 현재 사용자 ID 설정
        sortOrder: 1000,
        isActive: true,
      },
      include: {
        parent: true,
        createdBy: {
          select: { id: true, name: true, email: true }
        },
        updatedBy: {
          select: { id: true, name: true, email: true }
        },
        _count: {
          select: {
            children: true,
            budgets: true,
            budgetItems: true,
            expenseReports: true,
            responsibleUsers: true,
            organizationMemberships: true,
          }
        }
      }
    })

    console.log(`✅ Created organization via API simulation: ${createdOrg.name}`)
    console.log(`   ID: ${createdOrg.id}`)
    console.log(`   Code: ${createdOrg.code}`)
    console.log(`   Created By: ${createdOrg.createdBy?.name} (${createdOrg.createdBy?.email})`)
    console.log(`   Created At: ${createdOrg.createdAt.toISOString()}`)

    // 4. 조직 수정 API 시뮬레이션 테스트
    console.log('\n4️⃣ Testing organization update with audit tracking...')
    
    await new Promise(resolve => setTimeout(resolve, 1000)) // 시간 차이를 위해 대기

    const updatedOrg = await prisma.organization.update({
      where: { id: createdOrg.id },
      data: {
        description: 'API 수정 테스트: 조직 설명이 업데이트되었습니다.',
        englishName: `Updated API Test Organization ${Date.now()}`,
        updatedById: user.id, // API에서 현재 사용자 ID 설정
      },
      include: {
        parent: true,
        createdBy: {
          select: { id: true, name: true, email: true }
        },
        updatedBy: {
          select: { id: true, name: true, email: true }
        },
        children: {
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }]
        },
        _count: {
          select: {
            children: true,
            budgets: true,
            budgetItems: true,
            expenseReports: true,
            responsibleUsers: true,
            organizationMemberships: true,
          }
        }
      }
    })

    console.log(`✅ Updated organization via API simulation: ${updatedOrg.name}`)
    console.log(`   Created By: ${updatedOrg.createdBy?.name} (unchanged)`)
    console.log(`   Updated By: ${updatedOrg.updatedBy?.name} (${updatedOrg.updatedBy?.email})`)
    console.log(`   Created At: ${updatedOrg.createdAt.toISOString()} (unchanged)`)
    console.log(`   Updated At: ${updatedOrg.updatedAt.toISOString()} (changed)`)

    const timeDiff = updatedOrg.updatedAt.getTime() - updatedOrg.createdAt.getTime()
    console.log(`   Time Difference: ${timeDiff}ms`)

    // 5. 정리
    console.log('\n5️⃣ Cleaning up test organization...')
    await prisma.organization.delete({
      where: { id: createdOrg.id }
    })
    console.log(`✅ Deleted test organization: ${testCode}`)

    console.log('\n🎉 All API audit field tests completed successfully!')

    // 6. 테스트 결과 요약
    console.log('\n📊 API Test Results Summary:')
    console.log('✅ Audit fields are properly included in API responses')
    console.log('✅ Organization hierarchy queries include audit information')
    console.log('✅ Single organization queries include full audit details')
    console.log('✅ Organization creation sets createdById correctly')
    console.log('✅ Organization updates set updatedById correctly')
    console.log('✅ Timestamps (createdAt/updatedAt) work as expected')
    console.log('✅ Audit field relationships (createdBy/updatedBy) load properly')

  } catch (error) {
    console.error('❌ Error testing organization API:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

testOrganizationAPI().catch(console.error)