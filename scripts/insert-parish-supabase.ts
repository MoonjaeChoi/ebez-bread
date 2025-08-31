import { PrismaClient, OrganizationLevel } from '@prisma/client'

// Supabase 연결을 위한 환경 변수 확인
const SUPABASE_DATABASE_URL = process.env.DATABASE_URL

if (!SUPABASE_DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set')
}

console.log('🔗 Using database URL:', SUPABASE_DATABASE_URL.replace(/:[^:]*@/, ':****@'))

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: SUPABASE_DATABASE_URL
    }
  }
})

async function insertParishOrganizationsToSupabase() {
  console.log('🏛️ Inserting parish organizations to Supabase...')

  try {
    // 1. Supabase 연결 테스트
    const testConnection = await prisma.$queryRaw`SELECT 1 as test`
    console.log('✅ Supabase database connection successful')

    // 2. 교회 ID 조회 (첫 번째 교회 사용)
    const church = await prisma.church.findFirst()
    if (!church) {
      throw new Error('No church found in Supabase database')
    }

    // 3. 기존 사용자 조회 또는 MJCHOI 사용자 생성
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

    // 4. 교구 조직 데이터
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

    // 5. 기존 교구 조직 확인
    const existingParishes = await prisma.organization.findMany({
      where: {
        code: {
          in: parishOrganizations.map(p => p.code)
        },
        churchId: church.id
      }
    })

    console.log(`Found ${existingParishes.length} existing parish organizations`)

    // 6. 교구 조직 생성
    let sortOrder = 1
    let createdCount = 0
    let skippedCount = 0

    for (const parish of parishOrganizations) {
      try {
        const existing = existingParishes.find(ep => ep.code === parish.code)
        
        if (existing) {
          console.log(`⚠️  Parish already exists: ${parish.name} (${parish.code})`)
          skippedCount++
          continue
        }

        await prisma.organization.create({
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
        createdCount++
      } catch (error: any) {
        if (error.code === 'P2002') {
          console.log(`⚠️  Parish already exists (unique constraint): ${parish.name} (${parish.code})`)
          skippedCount++
        } else {
          console.error(`❌ Error creating parish ${parish.code}:`, error)
          throw error
        }
      }
    }

    console.log(`\n📊 Summary:`)
    console.log(`   Created: ${createdCount} parishes`)
    console.log(`   Skipped: ${skippedCount} parishes`)
    console.log(`   Total: ${parishOrganizations.length} parishes`)
    console.log('🏛️ Parish organizations insertion to Supabase completed!')

  } catch (error) {
    console.error('❌ Error inserting parish organizations to Supabase:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// 스크립트 실행
insertParishOrganizationsToSupabase().catch(console.error)