import { PrismaClient, OrganizationLevel } from '@prisma/client'

const prisma = new PrismaClient()

async function insertEducationCommittees() {
  console.log('🏛️ Inserting Education Committees with 김은혜 as creator...')

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

    // 3. 교육위원회들 조직 데이터 (3단계 계층 포함)
    const educationOrganizations = [
      // 장년교육위원회 (LEVEL_1)
      {
        name: '장년교육위원회',
        englishName: 'Adult Education Committee',
        code: 'EC-AE',
        description: '장년 교육을 위한 위원회입니다. LEVEL_1 조직입니다.',
        level: OrganizationLevel.LEVEL_1,
        parentCode: null
      },
      // 장년교육위원회 하위 부서들 (LEVEL_2)
      {
        name: '장년교육부',
        englishName: 'Adult Education Committee Adult Education Department',
        code: 'EC-AE-AE',
        description: '장년교육위원회의 장년 교육을 담당하는 부서입니다. LEVEL_2 부서입니다.',
        level: OrganizationLevel.LEVEL_2,
        parentCode: 'EC-AE'
      },
      {
        name: '행복지기세움터',
        englishName: 'Adult Education Committee Happiness Keeper Training Center',
        code: 'EC-AE-HK',
        description: '장년교육위원회의 행복지기세움터입니다. LEVEL_2 부서입니다.',
        level: OrganizationLevel.LEVEL_2,
        parentCode: 'EC-AE'
      },
      {
        name: '가정사역부',
        englishName: 'Adult Education Committee Family Ministry Department',
        code: 'EC-AE-FM',
        description: '장년교육위원회의 가정 사역을 담당하는 부서입니다. LEVEL_2 부서입니다.',
        level: OrganizationLevel.LEVEL_2,
        parentCode: 'EC-AE'
      },

      // 다음세대교육위원회 (LEVEL_1)
      {
        name: '다음세대교육위원회',
        englishName: 'Next Generation Education Committee',
        code: 'EC-NG',
        description: '다음 세대 교육을 위한 위원회입니다. LEVEL_1 조직입니다.',
        level: OrganizationLevel.LEVEL_1,
        parentCode: null
      },
      // 다음세대교육위원회 하위 부서들 (LEVEL_2)
      {
        name: '교육기획부',
        englishName: 'Next Generation Education Committee Education Planning Department',
        code: 'EC-NG-EP',
        description: '다음세대교육위원회의 교육 기획을 담당하는 부서입니다. LEVEL_2 부서입니다.',
        level: OrganizationLevel.LEVEL_2,
        parentCode: 'EC-NG'
      },
      {
        name: '하늘사랑',
        englishName: 'Next Generation Education Committee Heaven\'s Love',
        code: 'EC-NG-HL',
        description: '다음세대교육위원회의 유아/유치부 교육을 담당하는 부서입니다. LEVEL_2 부서입니다.',
        level: OrganizationLevel.LEVEL_2,
        parentCode: 'EC-NG'
      },

      // 하늘사랑 하위 세부 부서들 (LEVEL_3)
      {
        name: '영아부',
        englishName: 'Next Generation Education Committee Heaven\'s Love Infant Department',
        code: 'EC-NG-HL-IN',
        description: '하늘사랑 소속 영아부입니다. LEVEL_3 세부부서입니다.',
        level: OrganizationLevel.LEVEL_3,
        parentCode: 'EC-NG-HL'
      },
      {
        name: '유아부',
        englishName: 'Next Generation Education Committee Heaven\'s Love Toddler Department',
        code: 'EC-NG-HL-TD',
        description: '하늘사랑 소속 유아부입니다. LEVEL_3 세부부서입니다.',
        level: OrganizationLevel.LEVEL_3,
        parentCode: 'EC-NG-HL'
      },
      {
        name: '유치부',
        englishName: 'Next Generation Education Committee Heaven\'s Love Kindergarten Department',
        code: 'EC-NG-HL-KD',
        description: '하늘사랑 소속 유치부입니다. LEVEL_3 세부부서입니다.',
        level: OrganizationLevel.LEVEL_3,
        parentCode: 'EC-NG-HL'
      },
      {
        name: '아기학교',
        englishName: 'Next Generation Education Committee Heaven\'s Love Baby School',
        code: 'EC-NG-HL-BS',
        description: '하늘사랑 소속 아기학교입니다. LEVEL_3 세부부서입니다.',
        level: OrganizationLevel.LEVEL_3,
        parentCode: 'EC-NG-HL'
      }
    ]

    // 4. 기존 조직 확인 (중복 방지)
    console.log('\n🔍 Checking for existing organizations and code conflicts...')
    
    const proposedCodes = educationOrganizations.map(org => org.code)
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
    const newOrganizations = educationOrganizations.filter(org => !existingCodesSet.has(org.code))

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
    console.log('\n🏗️  Creating Education Committees...')
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
        
        const categoryEmoji = orgData.code.startsWith('EC-AE') ? '👨‍🎓' : 
                             orgData.code.startsWith('EC-NG') ? '👶' : '📋'
        
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
    console.log(`\n📊 Education Committees Creation Summary:`)
    console.log(`   New organizations requested: ${educationOrganizations.length}`)
    console.log(`   Already existing: ${existingOrganizations.length}`)
    console.log(`   Successfully created: ${createdCount}`)
    console.log(`   Skipped (conflicts/errors): ${skippedCount}`)

    // 10. 위원회별 구성 현황
    console.log('\n🏛️ Committee Structure Overview:')
    
    // 장년교육위원회 현황
    const adultEducCommittee = createdOrganizations['EC-AE'] || 
      await prisma.organization.findFirst({ where: { code: 'EC-AE' } })
    
    if (adultEducCommittee) {
      const adultDepts = await prisma.organization.count({
        where: {
          parentId: adultEducCommittee.id,
          level: 'LEVEL_2'
        }
      })
      
      console.log(`   👨‍🎓 장년교육위원회 (EC-AE): ${adultDepts}개 부서`)
    }

    // 다음세대교육위원회 현황
    const nextGenCommittee = createdOrganizations['EC-NG'] || 
      await prisma.organization.findFirst({ where: { code: 'EC-NG' } })
    
    if (nextGenCommittee) {
      const nextGenDepts = await prisma.organization.count({
        where: {
          parentId: nextGenCommittee.id,
          level: 'LEVEL_2'
        }
      })

      const heavenLoveDepts = await prisma.organization.count({
        where: {
          code: { startsWith: 'EC-NG-HL-' },
          level: 'LEVEL_3'
        }
      })
      
      console.log(`   👶 다음세대교육위원회 (EC-NG): ${nextGenDepts}개 부서`)
      console.log(`   └── 하늘사랑 하위: ${heavenLoveDepts}개 세부부서`)
    }

    // 11. 하늘사랑 세부 부서 현황
    console.log('\n👶 Heaven\'s Love (하늘사랑) Departments:')
    
    const heavenLove = createdOrganizations['EC-NG-HL'] || 
      await prisma.organization.findFirst({ where: { code: 'EC-NG-HL' } })
    
    if (heavenLove) {
      const heavenLoveSubDepts = await prisma.organization.findMany({
        where: {
          parentId: heavenLove.id,
          level: 'LEVEL_3'
        },
        orderBy: { sortOrder: 'asc' }
      })

      heavenLoveSubDepts.forEach((dept, index) => {
        const isNew = dept.createdAt > new Date(Date.now() - 30 * 60 * 1000)
        const newFlag = isNew ? ' 🆕' : ''
        const ageEmoji = dept.name.includes('영아') ? '🍼' : 
                        dept.name.includes('유아') ? '🧸' : 
                        dept.name.includes('유치') ? '🎨' : 
                        dept.name.includes('아기') ? '👶' : '📚'
        
        console.log(`   ${index + 1}. ${ageEmoji} ${dept.name} (${dept.code})${newFlag}`)
        console.log(`      English: ${dept.englishName}`)
      })
    }

    if (createdCount > 0) {
      console.log('\n🎉 Education Committees successfully inserted!')
    } else if (skippedCount === educationOrganizations.length) {
      console.log('\n✅ All requested organizations already exist')
    }

    return {
      requested: educationOrganizations.length,
      created: createdCount,
      existing: existingOrganizations.length,
      skipped: skippedCount,
      committees: {
        adult: newOrganizations.filter(o => o.code.startsWith('EC-AE')).length,
        nextGen: newOrganizations.filter(o => o.code.startsWith('EC-NG')).length
      },
      levels: {
        level1: newOrganizations.filter(o => o.level === 'LEVEL_1').length,
        level2: newOrganizations.filter(o => o.level === 'LEVEL_2').length,
        level3: newOrganizations.filter(o => o.level === 'LEVEL_3').length
      }
    }

  } catch (error) {
    console.error('❌ Error inserting Education Committees:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

insertEducationCommittees().catch(console.error)