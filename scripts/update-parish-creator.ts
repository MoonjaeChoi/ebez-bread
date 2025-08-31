import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function updateParishOrganizationsCreator() {
  console.log('👤 Updating parish organizations creator to 김은혜...')

  try {
    // 1. 교회 ID 조회
    const church = await prisma.church.findFirst()
    if (!church) {
      throw new Error('No church found in database')
    }

    // 2. 김은혜 사용자 조회 또는 생성
    let kimEunhyeUser = await prisma.user.findFirst({
      where: { 
        name: '김은혜',
        churchId: church.id 
      }
    })

    if (!kimEunhyeUser) {
      // 김은혜 사용자가 없으면 생성
      console.log('김은혜 사용자를 찾을 수 없습니다. 새로 생성합니다...')
      kimEunhyeUser = await prisma.user.create({
        data: {
          email: 'kimeunhye@gcchurch.kr',
          name: '김은혜',
          churchId: church.id,
          role: 'GENERAL_USER'
        }
      })
      console.log(`✅ Created 김은혜 user: ${kimEunhyeUser.name} (${kimEunhyeUser.id})`)
    } else {
      console.log(`✅ Found existing 김은혜 user: ${kimEunhyeUser.name} (${kimEunhyeUser.id})`)
    }

    console.log(`Using church: ${church.name} (${church.id})`)
    console.log(`Using creator: ${kimEunhyeUser.name} (${kimEunhyeUser.id})`)

    // 3. 교구 조직 코드 목록
    const parishCodes = [
      'PR-01', 'PR-02', 'PR-03', 'PR-GH', 'PR-45', 
      'PR-06', 'PR-79', 'PR-08', 'PR-BR'
    ]

    // 4. 기존 교구 조직들 조회
    const existingParishes = await prisma.organization.findMany({
      where: {
        code: { in: parishCodes },
        churchId: church.id
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    console.log(`\nFound ${existingParishes.length} existing parish organizations`)

    if (existingParishes.length === 0) {
      console.log('❌ No existing parish organizations found to update')
      return
    }

    // 5. 교구 조직들의 작성자를 김은혜로 업데이트
    console.log('\n📝 Updating parish organizations creator...')

    let updatedCount = 0
    for (const parish of existingParishes) {
      try {
        await prisma.organization.update({
          where: { id: parish.id },
          data: {
            createdById: kimEunhyeUser.id,
            updatedById: kimEunhyeUser.id, // 수정자도 김은혜로 설정
          }
        })

        console.log(`✅ Updated ${parish.name} (${parish.code})`)
        console.log(`   Previous creator: ${parish.createdBy?.name || 'NULL'}`)
        console.log(`   New creator: ${kimEunhyeUser.name}`)
        updatedCount++

      } catch (error) {
        console.error(`❌ Error updating ${parish.code}:`, error)
      }
    }

    console.log(`\n📊 Update Summary:`)
    console.log(`   Total parishes found: ${existingParishes.length}`)
    console.log(`   Successfully updated: ${updatedCount}`)
    console.log(`   Failed updates: ${existingParishes.length - updatedCount}`)

    if (updatedCount === existingParishes.length) {
      console.log('🎉 All parish organizations successfully updated with 김은혜 as creator!')
    }

  } catch (error) {
    console.error('❌ Error updating parish organizations creator:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

updateParishOrganizationsCreator().catch(console.error)