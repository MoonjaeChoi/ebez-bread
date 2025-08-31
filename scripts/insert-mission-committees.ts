import { PrismaClient, OrganizationLevel } from '@prisma/client'

const prisma = new PrismaClient()

async function insertMissionCommittees() {
  console.log('🏛️ Inserting Mission Committees and additional organizations with 김은혜 as creator...')

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

    // 3. 선교위원회들과 추가 조직 데이터
    const missionOrganizations = [
      // 찬양2부 추가 찬양단 (LEVEL_3)
      {
        name: '드림찬양단',
        englishName: 'Worship & Praise Committee Praise 2 Department Dream Worship Team',
        code: 'WC-WP-P2-DR',
        description: '찬양 2부 소속 드림찬양단입니다. LEVEL_3 세부부서입니다.',
        level: OrganizationLevel.LEVEL_3,
        parentCode: 'WC-WP-P2'
      },

      // 세계선교위원회 (LEVEL_1)
      {
        name: '세계선교위원회',
        englishName: 'World Mission Committee',
        code: 'MC-WM',
        description: '세계 선교를 위한 위원회입니다. LEVEL_1 조직입니다.',
        level: OrganizationLevel.LEVEL_1,
        parentCode: null
      },
      // 세계선교위원회 하위 부서들 (LEVEL_2)
      {
        name: '세계선교부',
        englishName: 'World Mission Committee World Mission Department',
        code: 'MC-WM-WM',
        description: '세계선교위원회의 세계 선교를 담당하는 부서입니다. LEVEL_2 부서입니다.',
        level: OrganizationLevel.LEVEL_2,
        parentCode: 'MC-WM'
      },
      {
        name: '선교훈련부',
        englishName: 'World Mission Committee Mission Training Department',
        code: 'MC-WM-MT',
        description: '세계선교위원회의 선교 훈련을 담당하는 부서입니다. LEVEL_2 부서입니다.',
        level: OrganizationLevel.LEVEL_2,
        parentCode: 'MC-WM'
      },
      {
        name: '선교협력부',
        englishName: 'World Mission Committee Mission Cooperation Department',
        code: 'MC-WM-MC',
        description: '세계선교위원회의 선교 협력을 담당하는 부서입니다. LEVEL_2 부서입니다.',
        level: OrganizationLevel.LEVEL_2,
        parentCode: 'MC-WM'
      },

      // 북한선교위원회 (LEVEL_1)
      {
        name: '북한선교위원회',
        englishName: 'North Korea Mission Committee',
        code: 'MC-NK',
        description: '북한 선교를 위한 위원회입니다. LEVEL_1 조직입니다.',
        level: OrganizationLevel.LEVEL_1,
        parentCode: null
      },
      // 북한선교위원회 하위 부서들 (LEVEL_2)
      {
        name: '북한선교부',
        englishName: 'North Korea Mission Committee North Korea Mission Department',
        code: 'MC-NK-NM',
        description: '북한선교위원회의 북한 선교를 담당하는 부서입니다. LEVEL_2 부서입니다.',
        level: OrganizationLevel.LEVEL_2,
        parentCode: 'MC-NK'
      },
      {
        name: '탈북민선교부',
        englishName: 'North Korea Mission Committee Defector Mission Department',
        code: 'MC-NK-DM',
        description: '북한선교위원회의 탈북민 선교를 담당하는 부서입니다. LEVEL_2 부서입니다.',
        level: OrganizationLevel.LEVEL_2,
        parentCode: 'MC-NK'
      },
      {
        name: '통일선교부',
        englishName: 'North Korea Mission Committee Unification Mission Department',
        code: 'MC-NK-UM',
        description: '북한선교위원회의 통일 선교를 담당하는 부서입니다. LEVEL_2 부서입니다.',
        level: OrganizationLevel.LEVEL_2,
        parentCode: 'MC-NK'
      },

      // 국내선교위원회 (LEVEL_1)
      {
        name: '국내선교위원회',
        englishName: 'Domestic Mission Committee',
        code: 'MC-DM',
        description: '국내 선교를 위한 위원회입니다. LEVEL_1 조직입니다.',
        level: OrganizationLevel.LEVEL_1,
        parentCode: null
      },
      // 국내선교위원회 하위 부서 (LEVEL_2)
      {
        name: '국내선교부',
        englishName: 'Domestic Mission Committee Domestic Mission Department',
        code: 'MC-DM-DM',
        description: '국내선교위원회의 국내 선교를 담당하는 부서입니다. LEVEL_2 부서입니다.',
        level: OrganizationLevel.LEVEL_2,
        parentCode: 'MC-DM'
      }
    ]

    // 4. 기존 조직 확인 (중복 방지)
    console.log('\n🔍 Checking for existing organizations and code conflicts...')
    
    const proposedCodes = missionOrganizations.map(org => org.code)
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
    const newOrganizations = missionOrganizations.filter(org => !existingCodesSet.has(org.code))

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
    console.log('\n🏗️  Creating Mission Committees and additional organizations...')
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
        
        const categoryEmoji = orgData.code.startsWith('WC-WP') ? '🎵' : 
                             orgData.code.startsWith('MC-WM') ? '🌍' : 
                             orgData.code.startsWith('MC-NK') ? '🇰🇵' : 
                             orgData.code.startsWith('MC-DM') ? '🇰🇷' : '📋'
        
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

    // 9. 생성된 위원회별 통계
    console.log(`\n📊 Mission Committees Creation Summary:`)
    console.log(`   New organizations requested: ${missionOrganizations.length}`)
    console.log(`   Already existing: ${existingOrganizations.length}`)
    console.log(`   Successfully created: ${createdCount}`)
    console.log(`   Skipped (conflicts/errors): ${skippedCount}`)

    // 10. 위원회별 구성 현황
    console.log('\n🏛️ Committee Structure Overview:')
    
    const committees = [
      { name: '세계선교위원회', code: 'MC-WM', emoji: '🌍' },
      { name: '북한선교위원회', code: 'MC-NK', emoji: '🇰🇵' },
      { name: '국내선교위원회', code: 'MC-DM', emoji: '🇰🇷' }
    ]

    for (const committee of committees) {
      const committeeOrg = createdOrganizations[committee.code] || 
        await prisma.organization.findFirst({ where: { code: committee.code } })
      
      if (committeeOrg) {
        const subDepts = await prisma.organization.count({
          where: {
            parentId: committeeOrg.id,
            level: 'LEVEL_2'
          }
        })
        
        console.log(`   ${committee.emoji} ${committee.name} (${committee.code}): ${subDepts}개 부서`)
      }
    }

    // 찬양2부 현황도 확인
    const praise2Dept = await prisma.organization.findFirst({
      where: { code: 'WC-WP-P2' },
      include: {
        _count: {
          select: { children: true }
        }
      }
    })

    if (praise2Dept) {
      console.log(`   🎵 찬양2부 (WC-WP-P2): ${praise2Dept._count.children}개 찬양팀`)
    }

    if (createdCount > 0) {
      console.log('\n🎉 Mission Committees and additional organizations successfully inserted!')
    } else if (skippedCount === missionOrganizations.length) {
      console.log('\n✅ All requested organizations already exist')
    }

    return {
      requested: missionOrganizations.length,
      created: createdCount,
      existing: existingOrganizations.length,
      skipped: skippedCount,
      committees: {
        world: newOrganizations.filter(o => o.code.startsWith('MC-WM')).length,
        northKorea: newOrganizations.filter(o => o.code.startsWith('MC-NK')).length,
        domestic: newOrganizations.filter(o => o.code.startsWith('MC-DM')).length,
        worship: newOrganizations.filter(o => o.code.startsWith('WC-WP')).length
      }
    }

  } catch (error) {
    console.error('❌ Error inserting Mission Committees:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

insertMissionCommittees().catch(console.error)