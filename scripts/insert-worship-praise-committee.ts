import { PrismaClient, OrganizationLevel } from '@prisma/client'

const prisma = new PrismaClient()

async function insertWorshipPraiseCommittee() {
  console.log('🏛️ Inserting Worship & Praise Committee organizations with 김은혜 as creator...')

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

    // 3. 예배찬양위원회 조직 데이터 (계층 구조 포함)
    const worshipOrganizations = [
      // LEVEL_1: 예배찬양위원회
      {
        name: '예배찬양위원회',
        englishName: 'Worship & Praise Committee',
        code: 'WC-WP',
        description: '예배와 찬양 관련 업무를 총괄하는 위원회입니다. LEVEL_1 조직입니다.',
        level: OrganizationLevel.LEVEL_1,
        parentCode: null
      },
      // LEVEL_2: 위원회 하위 부서들
      {
        name: '예배부',
        englishName: 'Worship & Praise Committee Worship Department',
        code: 'WC-WP-WB',
        description: '예배찬양위원회의 예배를 담당하는 부서입니다. LEVEL_2 부서입니다.',
        level: OrganizationLevel.LEVEL_2,
        parentCode: 'WC-WP'
      },
      {
        name: '성례부',
        englishName: 'Worship & Praise Committee Sacraments Department',
        code: 'WC-WP-SC',
        description: '예배찬양위원회의 성례를 담당하는 부서입니다. LEVEL_2 부서입니다.',
        level: OrganizationLevel.LEVEL_2,
        parentCode: 'WC-WP'
      },
      {
        name: '기도사역부',
        englishName: 'Worship & Praise Committee Prayer Ministry Department',
        code: 'WC-WP-PM',
        description: '예배찬양위원회의 기도 사역을 담당하는 부서입니다. LEVEL_2 부서입니다.',
        level: OrganizationLevel.LEVEL_2,
        parentCode: 'WC-WP'
      },
      {
        name: '어머니기도회부',
        englishName: 'Worship & Praise Committee Mothers\' Prayer Meeting Department',
        code: 'WC-WP-MP',
        description: '예배찬양위원회의 어머니 기도회를 담당하는 부서입니다. LEVEL_2 부서입니다.',
        level: OrganizationLevel.LEVEL_2,
        parentCode: 'WC-WP'
      },
      {
        name: '찬양1부',
        englishName: 'Worship & Praise Committee Praise 1 Department',
        code: 'WC-WP-P1',
        description: '예배찬양위원회의 찬양 1부를 담당하는 부서입니다. LEVEL_2 부서입니다.',
        level: OrganizationLevel.LEVEL_2,
        parentCode: 'WC-WP'
      },
      // LEVEL_3: 찬양1부 하위 찬양대들
      {
        name: '샬롬',
        englishName: 'Worship & Praise Committee Praise 1 Department Shalom Choir',
        code: 'WC-WP-P1-SL',
        description: '찬양 1부 소속 샬롬 찬양대입니다. LEVEL_3 세부부서입니다.',
        level: OrganizationLevel.LEVEL_3,
        parentCode: 'WC-WP-P1'
      },
      {
        name: '호산나',
        englishName: 'Worship & Praise Committee Praise 1 Department Hosanna Choir',
        code: 'WC-WP-P1-HS',
        description: '찬양 1부 소속 호산나 찬양대입니다. LEVEL_3 세부부서입니다.',
        level: OrganizationLevel.LEVEL_3,
        parentCode: 'WC-WP-P1'
      }
    ]

    // 4. 기존 조직 확인 (중복 방지)
    console.log('\n🔍 Checking for existing organizations and code conflicts...')
    
    const proposedCodes = worshipOrganizations.map(org => org.code)
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
    const newOrganizations = worshipOrganizations.filter(org => !existingCodesSet.has(org.code))

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
    console.log('\n🏗️  Creating new Worship & Praise Committee organizations...')
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

    // 9. 생성된 조직들의 계층구조 확인
    const worshipCommittee = createdOrganizations['WC-WP'] || 
      await prisma.organization.findFirst({ where: { code: 'WC-WP' } })

    if (worshipCommittee) {
      const totalSubOrgs = await prisma.organization.count({
        where: {
          OR: [
            { parentId: worshipCommittee.id },
            { 
              parent: {
                parentId: worshipCommittee.id
              }
            }
          ]
        }
      })

      console.log(`\n📊 Worship & Praise Committee Organization Summary:`)
      console.log(`   New organizations to create: ${worshipOrganizations.length}`)
      console.log(`   Already existing: ${existingOrganizations.length}`)
      console.log(`   Successfully created: ${createdCount}`)
      console.log(`   Skipped (conflicts/errors): ${skippedCount}`)
      console.log(`   Total sub-organizations under committee: ${totalSubOrgs}`)
    }

    if (createdCount > 0) {
      console.log('\n🎉 Worship & Praise Committee organizations successfully inserted!')
    } else if (skippedCount === worshipOrganizations.length) {
      console.log('\n✅ All requested organizations already exist')
    }

    return {
      requested: worshipOrganizations.length,
      created: createdCount,
      existing: existingOrganizations.length,
      skipped: skippedCount,
      levels: {
        level1: worshipOrganizations.filter(o => o.level === 'LEVEL_1').length,
        level2: worshipOrganizations.filter(o => o.level === 'LEVEL_2').length,
        level3: worshipOrganizations.filter(o => o.level === 'LEVEL_3').length
      }
    }

  } catch (error) {
    console.error('❌ Error inserting Worship & Praise Committee organizations:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

insertWorshipPraiseCommittee().catch(console.error)