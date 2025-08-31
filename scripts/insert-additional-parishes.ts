import { PrismaClient, OrganizationLevel } from '@prisma/client'

const prisma = new PrismaClient()

async function insertAdditionalParishOrganizations() {
  console.log('🏛️ Inserting additional parish organizations with 김은혜 as creator...')

  try {
    // 1. 교회 ID 조회
    const church = await prisma.church.findFirst()
    if (!church) {
      throw new Error('No church found in database')
    }

    // 2. 김은혜 사용자 조회
    const kimEunhyeUser = await prisma.user.findFirst({
      where: { 
        name: '김은혜',
        churchId: church.id 
      }
    })

    if (!kimEunhyeUser) {
      throw new Error('김은혜 user not found. Please create the user first.')
    }

    console.log(`Using church: ${church.name} (${church.id})`)
    console.log(`Using creator: ${kimEunhyeUser.name} (${kimEunhyeUser.id})`)

    // 3. 추가 교구 조직 데이터 (중복 제거)
    const additionalParishOrganizations = [
      {
        name: '10교구(10단지)',
        englishName: 'Parish 10 (Complex 10)',
        code: 'PR-10',
        description: '교구는 LEVEL_1 조직으로 최상위 조직 단위입니다. 10단지를 담당합니다.',
      },
      {
        name: '11교구(11단지)',
        englishName: 'Parish 11 (Complex 11)',
        code: 'PR-11',
        description: '교구는 LEVEL_1 조직으로 최상위 조직 단위입니다. 11단지를 담당합니다.',
      },
      {
        name: '문원교구(문원동)',
        englishName: 'Munwon Parish (Munwon-dong)',
        code: 'PR-MW',
        description: '교구는 LEVEL_1 조직으로 최상위 조직 단위입니다. 문원동을 담당합니다.',
      },
      {
        name: '별양교구(별양동)',
        englishName: 'Byeolyang Parish (Byeolyang-dong)',
        code: 'PR-BY',
        description: '교구는 LEVEL_1 조직으로 최상위 조직 단위입니다. 별양동을 담당합니다.',
      },
      {
        name: '서울교구(서울)',
        englishName: 'Seoul Parish (Seoul)',
        code: 'PR-SL',
        description: '교구는 LEVEL_1 조직으로 최상위 조직 단위입니다. 서울 지역을 담당합니다.',
      },
      {
        name: '수산교구(수원·산본·안산)',
        englishName: 'SUSAN Parish (Suwon, Sanbon, Ansan)',
        code: 'PR-SS',
        description: '교구는 LEVEL_1 조직으로 최상위 조직 단위입니다. 수원, 산본, 안산 지역을 담당합니다.',
      },
      {
        name: '분수교구(분당·수지)',
        englishName: 'Bunsu Parish (Bundang, Suji)',
        code: 'PR-BS',
        description: '교구는 LEVEL_1 조직으로 최상위 조직 단위입니다. 분당, 수지 지역을 담당합니다.',
      },
      {
        name: '안양교구(안양)',
        englishName: 'Anyang Parish (Anyang)',
        code: 'PR-AY',
        description: '교구는 LEVEL_1 조직으로 최상위 조직 단위입니다. 안양 지역을 담당합니다.',
      },
      {
        name: '우면·관문교구(우면·과천·관문·주암)',
        englishName: 'Umyeon & Gwanmun Parish',
        code: 'PR-UG',
        description: '교구는 LEVEL_1 조직으로 최상위 조직 단위입니다. 우면, 과천, 관문, 주암 지역을 담당합니다.',
      }
    ]

    // 4. 기존 조직 확인 (중복 방지)
    const existingCodes = additionalParishOrganizations.map(p => p.code)
    const existingOrganizations = await prisma.organization.findMany({
      where: {
        code: { in: existingCodes },
        churchId: church.id
      },
      select: { code: true, name: true }
    })

    console.log(`\n🔍 Checking for existing organizations...`)
    if (existingOrganizations.length > 0) {
      console.log(`Found ${existingOrganizations.length} existing organizations:`)
      existingOrganizations.forEach(org => {
        console.log(`   - ${org.name} (${org.code})`)
      })
    } else {
      console.log(`No existing organizations found with the new codes`)
    }

    // 5. 새 조직만 필터링
    const existingCodesSet = new Set(existingOrganizations.map(o => o.code))
    const newOrganizations = additionalParishOrganizations.filter(p => !existingCodesSet.has(p.code))

    console.log(`\n📝 Will create ${newOrganizations.length} new parish organizations`)

    // 6. 기존 교구 조직의 sortOrder 중 최대값 확인
    const maxSortOrder = await prisma.organization.findFirst({
      where: {
        churchId: church.id,
        level: OrganizationLevel.LEVEL_1,
        code: { startsWith: 'PR-' }
      },
      select: { sortOrder: true },
      orderBy: { sortOrder: 'desc' }
    })

    let currentSortOrder = (maxSortOrder?.sortOrder || 0) + 1
    console.log(`Starting sortOrder: ${currentSortOrder}`)

    // 7. 새 교구 조직 생성
    let createdCount = 0
    let skippedCount = 0

    for (const parish of newOrganizations) {
      try {
        const created = await prisma.organization.create({
          data: {
            code: parish.code,
            name: parish.name,
            englishName: parish.englishName,
            description: parish.description,
            level: OrganizationLevel.LEVEL_1,
            churchId: church.id,
            createdById: kimEunhyeUser.id,
            sortOrder: currentSortOrder++,
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

    // 8. 결과 요약
    console.log(`\n📊 Insert Summary:`)
    console.log(`   Total parishes to create: ${additionalParishOrganizations.length}`)
    console.log(`   Already existing: ${existingOrganizations.length}`)
    console.log(`   New parishes created: ${createdCount}`)
    console.log(`   Skipped (errors): ${skippedCount}`)
    console.log(`   Expected new total: ${existingOrganizations.length + createdCount}`)

    if (createdCount > 0) {
      console.log('\n🎉 Additional parish organizations successfully inserted!')
    } else if (existingOrganizations.length === additionalParishOrganizations.length) {
      console.log('\n✅ All parish organizations already exist - no new insertions needed')
    }

    return {
      created: createdCount,
      existing: existingOrganizations.length,
      skipped: skippedCount
    }

  } catch (error) {
    console.error('❌ Error inserting additional parish organizations:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

insertAdditionalParishOrganizations().catch(console.error)