import { PrismaClient, OrganizationLevel } from '@prisma/client'

const prisma = new PrismaClient()

async function insertAdditionalMissionDepartments() {
  console.log('🏛️ Inserting additional Mission Committee departments and Environmental Mission Committee with 김은혜 as creator...')

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

    // 3. 추가 선교위원회 부서들과 환경선교위원회 데이터
    const additionalMissionOrganizations = [
      // 국내선교위원회 추가 부서들 (LEVEL_2)
      {
        name: '군선교부',
        englishName: 'Domestic Mission Committee Military Mission Department',
        code: 'MC-DM-MM',
        description: '국내선교위원회의 군 선교를 담당하는 부서입니다. LEVEL_2 부서입니다.',
        level: OrganizationLevel.LEVEL_2,
        parentCode: 'MC-DM'
      },
      {
        name: '경찰교정선교부',
        englishName: 'Domestic Mission Committee Police & Correctional Mission Department',
        code: 'MC-DM-PC',
        description: '국내선교위원회의 경찰 및 교정 시설 선교를 담당하는 부서입니다. LEVEL_2 부서입니다.',
        level: OrganizationLevel.LEVEL_2,
        parentCode: 'MC-DM'
      },
      {
        name: '병원선교부',
        englishName: 'Domestic Mission Committee Hospital Mission Department',
        code: 'MC-DM-HM',
        description: '국내선교위원회의 병원 선교를 담당하는 부서입니다. LEVEL_2 부서입니다.',
        level: OrganizationLevel.LEVEL_2,
        parentCode: 'MC-DM'
      },
      {
        name: '예사랑선교부',
        englishName: 'Domestic Mission Committee Yesarang Mission Department',
        code: 'MC-DM-YM',
        description: '국내선교위원회의 예사랑 선교를 담당하는 부서입니다. LEVEL_2 부서입니다.',
        level: OrganizationLevel.LEVEL_2,
        parentCode: 'MC-DM'
      },

      // 환경선교위원회 신설 (LEVEL_1)
      {
        name: '환경선교위원회',
        englishName: 'Environmental Mission Committee',
        code: 'MC-EM',
        description: '환경 선교를 위한 위원회입니다. LEVEL_1 조직입니다.',
        level: OrganizationLevel.LEVEL_1,
        parentCode: null
      },
      // 환경선교위원회 하위 부서들 (LEVEL_2)
      {
        name: '환경선교부',
        englishName: 'Environmental Mission Committee Environmental Mission Department',
        code: 'MC-EM-EM',
        description: '환경선교위원회의 환경 선교를 담당하는 부서입니다. LEVEL_2 부서입니다.',
        level: OrganizationLevel.LEVEL_2,
        parentCode: 'MC-EM'
      },
      {
        name: '생태영성훈련부',
        englishName: 'Environmental Mission Committee Eco-Spirituality Training Department',
        code: 'MC-EM-ES',
        description: '환경선교위원회의 생태 영성 훈련을 담당하는 부서입니다. LEVEL_2 부서입니다.',
        level: OrganizationLevel.LEVEL_2,
        parentCode: 'MC-EM'
      }
    ]

    // 4. 기존 조직 확인 (중복 방지)
    console.log('\n🔍 Checking for existing organizations and code conflicts...')
    
    const proposedCodes = additionalMissionOrganizations.map(org => org.code)
    const existingOrganizations = await prisma.organization.findMany({
      where: {
        code: { in: proposedCodes }
      },
      select: { id: true, code: true, name: true, englishName: true, level: true }
    })

    if (existingOrganizations.length > 0) {
      console.log(`Found ${existingOrganizations.length} potential conflicts:`)
      existingOrganizations.forEach(org => {
        console.log(`   - ${org.name} (${org.code}) - ${org.level}`)
      })
    }

    // 5. 중복이 없는 새 조직만 필터링
    const existingCodesSet = new Set(existingOrganizations.map(o => o.code))
    const newOrganizations = additionalMissionOrganizations.filter(org => !existingCodesSet.has(org.code))

    console.log(`\n📝 Will create ${newOrganizations.length} new organizations`)
    if (newOrganizations.length === 0) {
      console.log('✅ All organizations already exist - no new insertions needed')
      return
    }

    // 6. 조직을 레벨 순서대로 정렬하여 부모-자식 관계 보장
    const sortedOrganizations = newOrganizations.sort((a, b) => {
      const levelOrder = { 'LEVEL_1': 1, 'LEVEL_2': 2, 'LEVEL_3': 3, 'LEVEL_4': 4 }
      return levelOrder[a.level] - levelOrder[b.level]
    })

    // 7. 현재 최대 sortOrder 확인
    const maxSortOrder = await prisma.organization.findFirst({
      where: {
        churchId: church.id,
        OR: [
          { level: OrganizationLevel.LEVEL_1 },
          { parentId: { not: null } }
        ]
      },
      select: { sortOrder: true },
      orderBy: { sortOrder: 'desc' }
    })

    let currentSortOrder = (maxSortOrder?.sortOrder || 0) + 1

    // 8. 조직 생성 (계층 순서대로)
    console.log('\n🏗️  Creating additional Mission Committee departments and Environmental Mission Committee...')
    let createdCount = 0
    let skippedCount = 0
    const createdOrganizations: { [code: string]: any } = {}

    for (const orgData of sortedOrganizations) {
      try {
        // 부모 조직 ID 찾기
        let parentId = null
        if (orgData.parentCode) {
          // 먼저 새로 생성된 조직에서 찾기
          if (createdOrganizations[orgData.parentCode]) {
            parentId = createdOrganizations[orgData.parentCode].id
          } else {
            // 기존 데이터베이스에서 찾기
            const parentOrg = await prisma.organization.findFirst({
              where: { code: orgData.parentCode }
            })
            if (parentOrg) {
              parentId = parentOrg.id
            } else {
              console.log(`⚠️  Parent organization not found for ${orgData.code}: ${orgData.parentCode}`)
              continue
            }
          }
        }

        const created = await prisma.organization.create({
          data: {
            code: orgData.code,
            name: orgData.name,
            englishName: orgData.englishName,
            description: orgData.description,
            level: orgData.level,
            parentId: parentId,
            churchId: church.id,
            createdById: kimEunhyeUser.id,
            sortOrder: currentSortOrder++,
            isActive: true,
          },
          include: {
            createdBy: {
              select: { name: true, email: true }
            },
            parent: {
              select: { name: true, code: true }
            }
          }
        })

        // 생성된 조직을 맵에 저장 (자식 조직에서 참조할 수 있도록)
        createdOrganizations[orgData.code] = created
        
        const categoryEmoji = orgData.code.startsWith('MC-DM') ? '🇰🇷' : 
                             orgData.code.startsWith('MC-EM') ? '🌱' : '📋'
        
        console.log(`✅ Created ${orgData.level}: ${categoryEmoji} ${orgData.name} (${orgData.code})`)
        console.log(`   Parent: ${created.parent?.name || 'None'} (${created.parent?.code || 'N/A'})`)
        console.log(`   Sort Order: ${created.sortOrder}`)
        console.log(`   Created By: ${created.createdBy?.name}`)
        console.log(`   Created At: ${created.createdAt.toISOString()}`)
        createdCount++
        
      } catch (error: any) {
        if (error.code === 'P2002') {
          console.log(`⚠️  Organization already exists (unique constraint): ${orgData.name} (${orgData.code})`)
          skippedCount++
        } else {
          console.error(`❌ Error creating organization ${orgData.code}:`, error.message)
          skippedCount++
        }
      }
    }

    // 9. 업데이트된 위원회별 통계
    console.log(`\n📊 Additional Mission Departments Creation Summary:`)
    console.log(`   New organizations requested: ${additionalMissionOrganizations.length}`)
    console.log(`   Already existing: ${existingOrganizations.length}`)
    console.log(`   Successfully created: ${createdCount}`)
    console.log(`   Skipped (conflicts/errors): ${skippedCount}`)

    // 10. 업데이트된 위원회별 구성 현황
    console.log('\n🏛️ Updated Committee Structure Overview:')
    
    // 국내선교위원회 현황
    const domesticCommittee = await prisma.organization.findFirst({
      where: { code: 'MC-DM' }
    })
    
    if (domesticCommittee) {
      const domesticDepts = await prisma.organization.count({
        where: {
          parentId: domesticCommittee.id,
          level: 'LEVEL_2'
        }
      })
      
      console.log(`   🇰🇷 국내선교위원회 (MC-DM): ${domesticDepts}개 부서`)
    }

    // 환경선교위원회 현황
    const environmentalCommittee = createdOrganizations['MC-EM'] || 
      await prisma.organization.findFirst({ where: { code: 'MC-EM' } })
    
    if (environmentalCommittee) {
      const environmentalDepts = await prisma.organization.count({
        where: {
          parentId: environmentalCommittee.id,
          level: 'LEVEL_2'
        }
      })
      
      console.log(`   🌱 환경선교위원회 (MC-EM): ${environmentalDepts}개 부서`)
    }

    // 전체 선교위원회 현황
    const totalMissionCommittees = await prisma.organization.count({
      where: {
        code: { startsWith: 'MC-' },
        level: 'LEVEL_1'
      }
    })

    const totalMissionDepts = await prisma.organization.count({
      where: {
        code: { startsWith: 'MC-' },
        level: 'LEVEL_2'
      }
    })

    console.log(`\n📈 Overall Mission Committee Statistics:`)
    console.log(`   Total Mission Committees: ${totalMissionCommittees}`)
    console.log(`   Total Mission Departments: ${totalMissionDepts}`)

    if (createdCount > 0) {
      console.log('\n🎉 Additional Mission Committee departments and Environmental Mission Committee successfully inserted!')
    } else if (skippedCount === additionalMissionOrganizations.length) {
      console.log('\n✅ All requested organizations already exist')
    }

    return {
      requested: additionalMissionOrganizations.length,
      created: createdCount,
      existing: existingOrganizations.length,
      skipped: skippedCount,
      departments: {
        domestic: additionalMissionOrganizations.filter(o => o.code.startsWith('MC-DM')).length,
        environmental: additionalMissionOrganizations.filter(o => o.code.startsWith('MC-EM')).length
      }
    }

  } catch (error) {
    console.error('❌ Error inserting additional Mission Committee departments:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

insertAdditionalMissionDepartments().catch(console.error)