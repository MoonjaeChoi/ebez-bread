import { PrismaClient, OrganizationLevel } from '@prisma/client'

const prisma = new PrismaClient()

async function insertFinalParishOrganizations() {
  console.log('🏛️ Inserting final parish organizations with 김은혜 as creator...')

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

    // 3. 최종 추가 교구 조직 데이터
    const finalParishOrganizations = [
      {
        name: '의왕교구(의왕)',
        englishName: 'Uiwang Parish (Uiwang)',
        code: 'PR-UW',
        description: '교구는 LEVEL_1 조직으로 최상위 조직 단위입니다. 의왕 지역을 담당합니다.',
      },
      {
        name: '중앙교구(중앙동)',
        englishName: 'Jungang Parish (Jungang-dong)',
        code: 'PR-JA',
        description: '교구는 LEVEL_1 조직으로 최상위 조직 단위입니다. 중앙동을 담당합니다.',
      },
      {
        name: '평촌교구(평촌)',
        englishName: 'Pyeongchon Parish (Pyeongchon)',
        code: 'PR-PC',
        description: '교구는 LEVEL_1 조직으로 최상위 조직 단위입니다. 평촌 지역을 담당합니다.',
      },
      {
        name: '은빛교구',
        englishName: 'Silverlight Parish',
        code: 'PR-SV', // PR-SL은 이미 서울교구에서 사용중이므로 PR-SV로 변경
        description: '교구는 LEVEL_1 조직으로 최상위 조직 단위입니다. 어르신들을 위한 교구입니다.',
      },
      {
        name: '30+교구',
        englishName: '30+ Parish',
        code: 'PR-30',
        description: '교구는 LEVEL_1 조직으로 최상위 조직 단위입니다. 30대 이상 성인들을 위한 교구입니다.',
      },
      {
        name: '청년교구',
        englishName: 'Youth Parish',
        code: 'PR-YT',
        description: '교구는 LEVEL_1 조직으로 최상위 조직 단위입니다. 청년들을 위한 교구입니다.',
      }
    ]

    // 4. 기존 조직 확인 (중복 방지)
    console.log('\n🔍 Checking for existing organizations and code conflicts...')
    
    const proposedCodes = finalParishOrganizations.map(p => p.code)
    const existingOrganizations = await prisma.organization.findMany({
      where: {
        OR: [
          { code: { in: proposedCodes } },
          { 
            AND: [
              { churchId: church.id },
              { 
                OR: proposedCodes.map(code => ({ name: { contains: code.replace('PR-', '') } }))
              }
            ]
          }
        ]
      },
      select: { id: true, code: true, name: true, englishName: true }
    })

    if (existingOrganizations.length > 0) {
      console.log(`Found ${existingOrganizations.length} potential conflicts:`)
      existingOrganizations.forEach(org => {
        console.log(`   - ${org.name} (${org.code})`)
      })
      
      // 특별한 경우: PR-SL (서울교구)가 이미 존재하므로 은빛교구를 PR-SV로 변경
      const conflictingCodes = existingOrganizations.map(o => o.code)
      console.log(`\n⚠️  Code conflicts detected: ${conflictingCodes.join(', ')}`)
      console.log(`   Adjusted 은빛교구 code from PR-SL to PR-SV to avoid Seoul Parish conflict`)
    }

    // 5. 중복이 없는 새 조직만 필터링
    const existingCodesSet = new Set(existingOrganizations.map(o => o.code))
    const newOrganizations = finalParishOrganizations.filter(p => !existingCodesSet.has(p.code))

    console.log(`\n📝 Will create ${newOrganizations.length} new parish organizations`)
    if (newOrganizations.length === 0) {
      console.log('✅ All organizations already exist - no new insertions needed')
      return
    }

    // 6. 현재 최대 sortOrder 확인
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
    console.log('\n🏗️  Creating new parish organizations...')
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
          },
          include: {
            createdBy: {
              select: { name: true, email: true }
            }
          }
        })
        
        console.log(`✅ Created parish: ${parish.name} (${parish.code})`)
        console.log(`   Sort Order: ${created.sortOrder}`)
        console.log(`   Created By: ${created.createdBy?.name}`)
        console.log(`   Created At: ${created.createdAt.toISOString()}`)
        createdCount++
        
      } catch (error: any) {
        if (error.code === 'P2002') {
          console.log(`⚠️  Parish already exists (unique constraint): ${parish.name} (${parish.code})`)
          skippedCount++
        } else {
          console.error(`❌ Error creating parish ${parish.code}:`, error.message)
          skippedCount++
        }
      }
    }

    // 8. 전체 교구 현황 확인
    const totalParishes = await prisma.organization.count({
      where: {
        churchId: church.id,
        level: OrganizationLevel.LEVEL_1,
        code: { startsWith: 'PR-' },
        createdById: kimEunhyeUser.id
      }
    })

    // 9. 결과 요약
    console.log(`\n📊 Final Insert Summary:`)
    console.log(`   New parishes to create: ${finalParishOrganizations.length}`)
    console.log(`   Already existing: ${existingOrganizations.length}`)
    console.log(`   Successfully created: ${createdCount}`)
    console.log(`   Skipped (conflicts/errors): ${skippedCount}`)
    console.log(`   Total parishes created by 김은혜: ${totalParishes}`)

    if (createdCount > 0) {
      console.log('\n🎉 Final parish organizations successfully inserted!')
    } else if (skippedCount === finalParishOrganizations.length) {
      console.log('\n✅ All requested parish organizations already exist')
    }

    return {
      requested: finalParishOrganizations.length,
      created: createdCount,
      existing: existingOrganizations.length,
      skipped: skippedCount,
      total: totalParishes
    }

  } catch (error) {
    console.error('❌ Error inserting final parish organizations:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

insertFinalParishOrganizations().catch(console.error)