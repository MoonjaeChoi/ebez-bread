import { PrismaClient, OrganizationLevel } from '@prisma/client'

const prisma = new PrismaClient()

async function insertAdditionalWorshipOrganizations() {
  console.log('🏛️ Inserting additional Worship & Praise Committee organizations with 김은혜 as creator...')

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

    // 3. 추가 예배찬양위원회 조직 데이터 (계층 구조 포함)
    const additionalWorshipOrganizations = [
      // 찬양1부 하위 추가 찬양대들 (LEVEL_3)
      {
        name: '할렐루야',
        englishName: 'Worship & Praise Committee Praise 1 Department Hallelujah Choir',
        code: 'WC-WP-P1-HL',
        description: '찬양 1부 소속 할렐루야 찬양대입니다. LEVEL_3 세부부서입니다.',
        level: OrganizationLevel.LEVEL_3,
        parentCode: 'WC-WP-P1'
      },
      {
        name: '임마누엘',
        englishName: 'Worship & Praise Committee Praise 1 Department Immanuel Choir',
        code: 'WC-WP-P1-IM',
        description: '찬양 1부 소속 임마누엘 찬양대입니다. LEVEL_3 세부부서입니다.',
        level: OrganizationLevel.LEVEL_3,
        parentCode: 'WC-WP-P1'
      },
      // 찬양2부 신설 (LEVEL_2)
      {
        name: '찬양2부',
        englishName: 'Worship & Praise Committee Praise 2 Department',
        code: 'WC-WP-P2',
        description: '예배찬양위원회의 찬양 2부를 담당하는 부서입니다. LEVEL_2 부서입니다.',
        level: OrganizationLevel.LEVEL_2,
        parentCode: 'WC-WP'
      },
      // 찬양2부 하위 조직들 (LEVEL_3)
      {
        name: '하늘울림 오케스트라',
        englishName: 'Worship & Praise Committee Praise 2 Department Heaven\'s Echo Orchestra',
        code: 'WC-WP-P2-HE',
        description: '찬양 2부 소속 하늘울림 오케스트라입니다. LEVEL_3 세부부서입니다.',
        level: OrganizationLevel.LEVEL_3,
        parentCode: 'WC-WP-P2'
      },
      {
        name: '하늘종소리 핸드벨',
        englishName: 'Worship & Praise Committee Praise 2 Department Heaven\'s Bell Handbell',
        code: 'WC-WP-P2-HB',
        description: '찬양 2부 소속 하늘종소리 핸드벨입니다. LEVEL_3 세부부서입니다.',
        level: OrganizationLevel.LEVEL_3,
        parentCode: 'WC-WP-P2'
      },
      {
        name: '많은물소리 합창단',
        englishName: 'Worship & Praise Committee Praise 2 Department Many Waters Choir',
        code: 'WC-WP-P2-MW',
        description: '찬양 2부 소속 많은물소리 합창단입니다. LEVEL_3 세부부서입니다.',
        level: OrganizationLevel.LEVEL_3,
        parentCode: 'WC-WP-P2'
      },
      {
        name: '하늘향기 찬양단',
        englishName: 'Worship & Praise Committee Praise 2 Department Heaven\'s Scent Worship Team',
        code: 'WC-WP-P2-HS',
        description: '찬양 2부 소속 하늘향기 찬양단입니다. LEVEL_3 세부부서입니다.',
        level: OrganizationLevel.LEVEL_3,
        parentCode: 'WC-WP-P2'
      }
    ]

    // 4. 기존 조직 확인 (중복 방지)
    console.log('\n🔍 Checking for existing organizations and code conflicts...')
    
    const proposedCodes = additionalWorshipOrganizations.map(org => org.code)
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
    const newOrganizations = additionalWorshipOrganizations.filter(org => !existingCodesSet.has(org.code))

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
    console.log('\n🏗️  Creating additional Worship & Praise Committee organizations...')
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
        
        console.log(`✅ Created ${orgData.level}: ${orgData.name} (${orgData.code})`)
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

    // 9. 예배찬양위원회 전체 하위 조직 현황 확인
    const worshipCommittee = await prisma.organization.findFirst({
      where: { code: 'WC-WP' }
    })

    if (worshipCommittee) {
      const totalLevel2 = await prisma.organization.count({
        where: {
          parentId: worshipCommittee.id,
          level: 'LEVEL_2'
        }
      })

      const totalLevel3 = await prisma.organization.count({
        where: {
          level: 'LEVEL_3',
          parent: {
            parentId: worshipCommittee.id
          }
        }
      })

      console.log(`\n📊 Updated Worship & Praise Committee Summary:`)
      console.log(`   New organizations requested: ${additionalWorshipOrganizations.length}`)
      console.log(`   Already existing: ${existingOrganizations.length}`)
      console.log(`   Successfully created: ${createdCount}`)
      console.log(`   Skipped (conflicts/errors): ${skippedCount}`)
      console.log(`   Total LEVEL_2 departments: ${totalLevel2}`)
      console.log(`   Total LEVEL_3 sub-organizations: ${totalLevel3}`)
    }

    // 10. 찬양 부서별 현황
    console.log('\n🎵 Praise Departments Status:')
    
    const praise1Dept = await prisma.organization.findFirst({
      where: { code: 'WC-WP-P1' },
      include: {
        _count: {
          select: { children: true }
        }
      }
    })

    const praise2Dept = await prisma.organization.findFirst({
      where: { code: 'WC-WP-P2' },
      include: {
        _count: {
          select: { children: true }
        }
      }
    })

    if (praise1Dept) {
      console.log(`   찬양1부 (WC-WP-P1): ${praise1Dept._count.children} sub-organizations`)
    }

    if (praise2Dept) {
      console.log(`   찬양2부 (WC-WP-P2): ${praise2Dept._count.children} sub-organizations`)
    }

    if (createdCount > 0) {
      console.log('\n🎉 Additional Worship & Praise Committee organizations successfully inserted!')
    } else if (skippedCount === additionalWorshipOrganizations.length) {
      console.log('\n✅ All requested organizations already exist')
    }

    return {
      requested: additionalWorshipOrganizations.length,
      created: createdCount,
      existing: existingOrganizations.length,
      skipped: skippedCount,
      levels: {
        level2: additionalWorshipOrganizations.filter(o => o.level === 'LEVEL_2').length,
        level3: additionalWorshipOrganizations.filter(o => o.level === 'LEVEL_3').length
      }
    }

  } catch (error) {
    console.error('❌ Error inserting additional Worship & Praise Committee organizations:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

insertAdditionalWorshipOrganizations().catch(console.error)