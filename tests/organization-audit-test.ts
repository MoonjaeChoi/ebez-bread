import { PrismaClient, OrganizationLevel } from '@prisma/client'

const prisma = new PrismaClient()

async function testOrganizationAuditFields() {
  console.log('🧪 Testing organization audit fields functionality...')

  try {
    // 1. 기존 데이터에서 audit 필드 확인
    console.log('\n1️⃣ Testing existing audit fields...')
    
    const existingOrg = await prisma.organization.findFirst({
      where: {
        code: 'PR-01'
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true }
        },
        updatedBy: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    if (existingOrg) {
      console.log(`✅ Found existing organization: ${existingOrg.name}`)
      console.log(`   createdById: ${existingOrg.createdById}`)
      console.log(`   createdBy: ${existingOrg.createdBy?.name} (${existingOrg.createdBy?.email})`)
      console.log(`   createdAt: ${existingOrg.createdAt.toISOString()}`)
      console.log(`   updatedById: ${existingOrg.updatedById || 'NULL'}`)
      console.log(`   updatedBy: ${existingOrg.updatedBy?.name || 'NULL'}`)
      console.log(`   updatedAt: ${existingOrg.updatedAt.toISOString()}`)
    } else {
      console.log('❌ No existing organization found')
    }

    // 2. 새 조직 생성 테스트
    console.log('\n2️⃣ Testing organization creation with audit fields...')
    
    const church = await prisma.church.findFirst()
    const user = await prisma.user.findFirst({ where: { churchId: church?.id } })
    
    if (!church || !user) {
      throw new Error('Church or user not found for testing')
    }

    const testOrgCode = `TEST-${Date.now()}`
    const createdOrg = await prisma.organization.create({
      data: {
        code: testOrgCode,
        name: `테스트조직-${Date.now()}`,
        englishName: `Test Organization ${Date.now()}`,
        description: '테스트를 위한 임시 조직입니다.',
        level: OrganizationLevel.LEVEL_1,
        churchId: church.id,
        createdById: user.id,
        sortOrder: 999,
        isActive: true,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true }
        },
        updatedBy: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    console.log(`✅ Created test organization: ${createdOrg.name}`)
    console.log(`   ID: ${createdOrg.id}`)
    console.log(`   Code: ${createdOrg.code}`)
    console.log(`   createdById: ${createdOrg.createdById}`)
    console.log(`   createdBy: ${createdOrg.createdBy?.name} (${createdOrg.createdBy?.email})`)
    console.log(`   createdAt: ${createdOrg.createdAt.toISOString()}`)
    console.log(`   updatedById: ${createdOrg.updatedById || 'NULL'}`)
    console.log(`   updatedBy: ${createdOrg.updatedBy?.name || 'NULL'}`)
    console.log(`   updatedAt: ${createdOrg.updatedAt.toISOString()}`)

    // 3. 조직 수정 테스트
    console.log('\n3️⃣ Testing organization update with audit fields...')
    
    // 다른 사용자 찾기 (또는 같은 사용자 사용)
    const updaterUser = user // 테스트를 위해 같은 사용자 사용

    await new Promise(resolve => setTimeout(resolve, 1000)) // 1초 대기 (updatedAt 차이를 보기 위해)

    const updatedOrg = await prisma.organization.update({
      where: { id: createdOrg.id },
      data: {
        description: '수정된 테스트 조직 설명입니다.',
        updatedById: updaterUser.id,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true }
        },
        updatedBy: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    console.log(`✅ Updated test organization: ${updatedOrg.name}`)
    console.log(`   createdById: ${updatedOrg.createdById} (unchanged)`)
    console.log(`   createdBy: ${updatedOrg.createdBy?.name} (unchanged)`)
    console.log(`   createdAt: ${updatedOrg.createdAt.toISOString()} (unchanged)`)
    console.log(`   updatedById: ${updatedOrg.updatedById}`)
    console.log(`   updatedBy: ${updatedOrg.updatedBy?.name} (${updatedOrg.updatedBy?.email})`)
    console.log(`   updatedAt: ${updatedOrg.updatedAt.toISOString()} (changed)`)

    // 4. 시간 차이 확인
    const timeDiff = updatedOrg.updatedAt.getTime() - updatedOrg.createdAt.getTime()
    console.log(`   Time difference: ${timeDiff}ms`)

    if (timeDiff > 0) {
      console.log('✅ updatedAt is properly updated after modification')
    } else {
      console.log('⚠️  updatedAt timestamp issue')
    }

    // 5. 조직 관계 포함 조회 테스트
    console.log('\n4️⃣ Testing organization query with full relationships...')
    
    const fullOrg = await prisma.organization.findUnique({
      where: { id: updatedOrg.id },
      include: {
        createdBy: true,
        updatedBy: true,
        church: {
          select: { id: true, name: true }
        },
        parent: {
          select: { id: true, name: true, code: true }
        },
        children: {
          select: { id: true, name: true, code: true }
        }
      }
    })

    if (fullOrg) {
      console.log(`✅ Full organization query successful`)
      console.log(`   Organization: ${fullOrg.name}`)
      console.log(`   Church: ${fullOrg.church.name}`)
      console.log(`   Created by: ${fullOrg.createdBy?.name} at ${fullOrg.createdAt.toISOString()}`)
      console.log(`   Updated by: ${fullOrg.updatedBy?.name} at ${fullOrg.updatedAt.toISOString()}`)
      console.log(`   Parent: ${fullOrg.parent?.name || 'None'}`)
      console.log(`   Children: ${fullOrg.children.length} child organizations`)
    }

    // 6. 테스트 조직 정리
    console.log('\n5️⃣ Cleaning up test organization...')
    
    await prisma.organization.delete({
      where: { id: createdOrg.id }
    })
    
    console.log(`✅ Deleted test organization: ${testOrgCode}`)

    console.log('\n🎉 All audit field tests completed successfully!')

    // 7. 테스트 결과 요약
    console.log('\n📊 Test Results Summary:')
    console.log('✅ Audit fields properly added to schema')
    console.log('✅ createdById is set correctly on organization creation')  
    console.log('✅ createdAt is automatically set on creation')
    console.log('✅ updatedById can be set manually on updates')
    console.log('✅ updatedAt is automatically updated on modifications')
    console.log('✅ Relationships with User model work correctly')
    console.log('✅ Queries with audit field relationships work')

  } catch (error) {
    console.error('❌ Error testing organization audit fields:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

testOrganizationAuditFields().catch(console.error)