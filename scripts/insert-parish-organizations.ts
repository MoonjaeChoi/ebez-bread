import { PrismaClient, OrganizationLevel } from '@prisma/client'

const prisma = new PrismaClient()

async function insertParishOrganizations() {
  console.log('🏛️ Inserting parish organizations...')

  try {
    // 1. 교회 ID 조회 (첫 번째 교회 사용)
    const church = await prisma.church.findFirst()
    if (!church) {
      throw new Error('No church found in database')
    }

    // 2. 기존 사용자 조회 또는 MJCHOI 사용자 생성
    let mjchoiUser = await prisma.user.findUnique({
      where: { email: 'mjchoi@gcchurch.kr' }
    })

    if (!mjchoiUser) {
      // 첫 번째 사용자를 MJCHOI로 사용하거나 생성
      const existingUser = await prisma.user.findFirst({
        where: { churchId: church.id }
      })
      
      if (existingUser) {
        mjchoiUser = existingUser
        console.log(`Using existing user as MJCHOI: ${existingUser.name} (${existingUser.id})`)
      } else {
        mjchoiUser = await prisma.user.create({
          data: {
            email: 'mjchoi@gcchurch.kr',
            name: 'MJCHOI',
            churchId: church.id
          }
        })
        console.log(`Created MJCHOI user: ${mjchoiUser.name} (${mjchoiUser.id})`)
      }
    }

    console.log(`Using church: ${church.name} (${church.id})`)
    console.log(`Using creator: ${mjchoiUser.name} (${mjchoiUser.id})`)

    // 3. 교구 조직 데이터
    const parishOrganizations = [
      {
        name: '1교구(1단지)',
        englishName: 'Parish 1 (Complex 1)',
        code: 'PR-01',
        description: '교구는 LEVEL_1 조직으로 최상위 조직 단위입니다. 1단지를 담당합니다.',
      },
      {
        name: '2교구(2단지)',
        englishName: 'Parish 2 (Complex 2)', 
        code: 'PR-02',
        description: '교구는 LEVEL_1 조직으로 최상위 조직 단위입니다. 2단지를 담당합니다.',
      },
      {
        name: '3교구(3단지)',
        englishName: 'Parish 3 (Complex 3)',
        code: 'PR-03', 
        description: '교구는 LEVEL_1 조직으로 최상위 조직 단위입니다. 3단지를 담당합니다.',
      },
      {
        name: '갈현교구(갈현동)',
        englishName: 'Galhyeon Parish (Galhyeon-dong)',
        code: 'PR-GH',
        description: '교구는 LEVEL_1 조직으로 최상위 조직 단위입니다. 갈현동을 담당합니다.',
      },
      {
        name: '4·5교구(4·5단지)',
        englishName: 'Parish 4 & 5 (Complex 4 & 5)',
        code: 'PR-45',
        description: '교구는 LEVEL_1 조직으로 최상위 조직 단위입니다. 4, 5단지를 담당합니다.',
      },
      {
        name: '6교구(6단지)',
        englishName: 'Parish 6 (Complex 6)',
        code: 'PR-06',
        description: '교구는 LEVEL_1 조직으로 최상위 조직 단위입니다. 6단지를 담당합니다.',
      },
      {
        name: '7·9교구(7·9단지)',
        englishName: 'Parish 7 & 9 (Complex 7 & 9)',
        code: 'PR-79',
        description: '교구는 LEVEL_1 조직으로 최상위 조직 단위입니다. 7, 9단지를 담당합니다.',
      },
      {
        name: '8교구(8단지)',
        englishName: 'Parish 8 (Complex 8)',
        code: 'PR-08',
        description: '교구는 LEVEL_1 조직으로 최상위 조직 단위입니다. 8단지를 담당합니다.',
      },
      {
        name: '부림교구(부림동)',
        englishName: 'Burim Parish (Burim-dong)',
        code: 'PR-BR',
        description: '교구는 LEVEL_1 조직으로 최상위 조직 단위입니다. 부림동을 담당합니다.',
      }
    ]

    // 4. 교구 조직 생성
    let sortOrder = 1
    for (const parish of parishOrganizations) {
      try {
        const created = await prisma.organization.create({
          data: {
            code: parish.code,
            name: parish.name,
            englishName: parish.englishName,
            description: parish.description,
            level: OrganizationLevel.LEVEL_1,
            churchId: church.id,
            createdById: mjchoiUser.id,
            sortOrder: sortOrder++,
            isActive: true,
          }
        })
        console.log(`✅ Created parish: ${parish.name} (${parish.code})`)
      } catch (error: any) {
        if (error.code === 'P2002') {
          console.log(`⚠️  Parish already exists: ${parish.name} (${parish.code})`)
        } else {
          throw error
        }
      }
    }

    console.log('🏛️ Parish organizations insertion completed!')

  } catch (error) {
    console.error('❌ Error inserting parish organizations:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// 스크립트 실행
insertParishOrganizations().catch(console.error)