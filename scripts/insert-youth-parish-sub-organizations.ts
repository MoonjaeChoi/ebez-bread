import { PrismaClient, OrganizationLevel } from '@prisma/client'

const prisma = new PrismaClient()

async function insertYouthParishSubOrganizations() {
  console.log('🏛️ Inserting Youth Parish (청년교구) sub-organizations with 김은혜 as creator...')

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

    // 3. 청년교구(PR-YT) 조회
    const youthParish = await prisma.organization.findFirst({
      where: {
        code: 'PR-YT',
        churchId: church.id
      }
    })

    if (!youthParish) {
      throw new Error('청년교구(PR-YT) not found. Please create the parent organization first.')
    }

    console.log(`Using church: ${church.name} (${church.id})`)
    console.log(`Using creator: ${kimEunhyeUser.name} (${kimEunhyeUser.id})`)
    console.log(`Parent organization: ${youthParish.name} (${youthParish.code})`)

    // 4. 청년교구 하위 조직 데이터
    const youthParishSubOrganizations = [
      {
        name: '행정사역부',
        englishName: 'Youth Parish Administration Ministry Department',
        code: 'PR-YT-AM',
        description: '청년교구의 행정 업무를 담당합니다. LEVEL_2 부서입니다.',
      },
      {
        name: '1청년부',
        englishName: 'Youth Parish 1st Youth Department',
        code: 'PR-YT-Y1',
        description: '청년교구의 1청년 모임을 담당합니다. LEVEL_2 부서입니다.',
      },
      {
        name: '2청년부',
        englishName: 'Youth Parish 2nd Youth Department',
        code: 'PR-YT-Y2',
        description: '청년교구의 2청년 모임을 담당합니다. LEVEL_2 부서입니다.',
      },
      {
        name: '기드온찬양대',
        englishName: 'Youth Parish Gideon Choir',
        code: 'PR-YT-GC',
        description: '청년교구의 기드온 찬양대를 담당합니다. LEVEL_2 부서입니다.',
      },
      {
        name: '히스피플찬양단',
        englishName: 'Youth Parish His People Worship Team',
        code: 'PR-YT-HP',
        description: '청년교구의 히스피플 찬양단을 담당합니다. LEVEL_2 부서입니다.',
      },
      {
        name: '새가족부',
        englishName: 'Youth Parish New Family Department',
        code: 'PR-YT-NF',
        description: '청년교구의 새가족을 돌보는 부서입니다. LEVEL_2 부서입니다.',
      },
      {
        name: '예배부',
        englishName: 'Youth Parish Worship Department',
        code: 'PR-YT-WB',
        description: '청년교구의 예배를 담당하는 부서입니다. LEVEL_2 부서입니다.',
      },
      {
        name: '사회봉사부',
        englishName: 'Youth Parish Social Service Department',
        code: 'PR-YT-SS',
        description: '청년교구의 사회봉사를 담당하는 부서입니다. LEVEL_2 부서입니다.',
      },
      {
        name: '미디어부',
        englishName: 'Youth Parish Media Department',
        code: 'PR-YT-MD',
        description: '청년교구의 미디어 관련 업무를 담당하는 부서입니다. LEVEL_2 부서입니다.',
      },
      {
        name: '방송부',
        englishName: 'Youth Parish Broadcasting Department',
        code: 'PR-YT-BC',
        description: '청년교구의 방송 관련 업무를 담당하는 부서입니다. LEVEL_2 부서입니다.',
      }
    ]

    // 5. 기존 조직 확인 (중복 방지)
    console.log('\n🔍 Checking for existing sub-organizations and code conflicts...')
    
    const proposedCodes = youthParishSubOrganizations.map(org => org.code)
    const existingOrganizations = await prisma.organization.findMany({
      where: {
        OR: [
          { code: { in: proposedCodes } },
          { 
            AND: [
              { parentId: youthParish.id },
              { churchId: church.id }
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
    }

    // 6. 중복이 없는 새 조직만 필터링
    const existingCodesSet = new Set(existingOrganizations.map(o => o.code))
    const newOrganizations = youthParishSubOrganizations.filter(org => !existingCodesSet.has(org.code))

    console.log(`\n📝 Will create ${newOrganizations.length} new sub-organizations`)
    if (newOrganizations.length === 0) {
      console.log('✅ All sub-organizations already exist - no new insertions needed')
      return
    }

    // 7. 현재 최대 sortOrder 확인
    const maxSortOrder = await prisma.organization.findFirst({
      where: {
        parentId: youthParish.id,
        level: OrganizationLevel.LEVEL_2
      },
      select: { sortOrder: true },
      orderBy: { sortOrder: 'desc' }
    })

    let currentSortOrder = (maxSortOrder?.sortOrder || 0) + 1
    console.log(`Starting sortOrder: ${currentSortOrder}`)

    // 8. 새 하위 조직 생성
    console.log('\n🏗️  Creating new Youth Parish sub-organizations...')
    let createdCount = 0
    let skippedCount = 0

    for (const subOrg of newOrganizations) {
      try {
        const created = await prisma.organization.create({
          data: {
            code: subOrg.code,
            name: subOrg.name,
            englishName: subOrg.englishName,
            description: subOrg.description,
            level: OrganizationLevel.LEVEL_2,
            parentId: youthParish.id,
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
        
        console.log(`✅ Created sub-organization: ${subOrg.name} (${subOrg.code})`)
        console.log(`   Parent: ${created.parent?.name} (${created.parent?.code})`)
        console.log(`   Sort Order: ${created.sortOrder}`)
        console.log(`   Created By: ${created.createdBy?.name}`)
        console.log(`   Created At: ${created.createdAt.toISOString()}`)
        createdCount++
        
      } catch (error: any) {
        if (error.code === 'P2002') {
          console.log(`⚠️  Sub-organization already exists (unique constraint): ${subOrg.name} (${subOrg.code})`)
          skippedCount++
        } else {
          console.error(`❌ Error creating sub-organization ${subOrg.code}:`, error.message)
          skippedCount++
        }
      }
    }

    // 9. 청년교구 하위 조직 현황 확인
    const totalSubOrgs = await prisma.organization.count({
      where: {
        parentId: youthParish.id,
        level: OrganizationLevel.LEVEL_2,
        createdById: kimEunhyeUser.id
      }
    })

    // 10. 결과 요약
    console.log(`\n📊 Youth Parish Sub-Organizations Insert Summary:`)
    console.log(`   New sub-organizations to create: ${youthParishSubOrganizations.length}`)
    console.log(`   Already existing: ${existingOrganizations.length}`)
    console.log(`   Successfully created: ${createdCount}`)
    console.log(`   Skipped (conflicts/errors): ${skippedCount}`)
    console.log(`   Total sub-organizations created by 김은혜: ${totalSubOrgs}`)

    if (createdCount > 0) {
      console.log('\n🎉 Youth Parish sub-organizations successfully inserted!')
    } else if (skippedCount === youthParishSubOrganizations.length) {
      console.log('\n✅ All requested sub-organizations already exist')
    }

    return {
      requested: youthParishSubOrganizations.length,
      created: createdCount,
      existing: existingOrganizations.length,
      skipped: skippedCount,
      total: totalSubOrgs
    }

  } catch (error) {
    console.error('❌ Error inserting Youth Parish sub-organizations:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

insertYouthParishSubOrganizations().catch(console.error)