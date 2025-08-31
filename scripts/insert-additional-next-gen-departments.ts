import { PrismaClient, OrganizationLevel } from '@prisma/client'

const prisma = new PrismaClient()

async function insertAdditionalNextGenDepartments() {
  console.log('🏛️ Inserting additional Next Generation Education departments with 김은혜 as creator...')

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

    // 3. 추가 다음세대교육위원회 부서들과 세부부서 데이터
    const additionalNextGenOrganizations = [
      // 하늘생명 (LEVEL_2) - 초등부 담당
      {
        name: '하늘생명',
        englishName: 'Next Generation Education Committee Heaven\'s Life',
        code: 'EC-NG-HF',
        description: '다음세대교육위원회의 초등부 교육을 담당하는 부서입니다. LEVEL_2 부서입니다.',
        level: OrganizationLevel.LEVEL_2,
        parentCode: 'EC-NG'
      },
      
      // 하늘생명 하위 세부부서들 (LEVEL_3)
      {
        name: '토요학교',
        englishName: 'Next Generation Education Committee Heaven\'s Life Saturday School',
        code: 'EC-NG-HF-SS',
        description: '하늘생명 소속 토요학교입니다. LEVEL_3 세부부서입니다.',
        level: OrganizationLevel.LEVEL_3,
        parentCode: 'EC-NG-HF'
      },
      {
        name: '어린이1부',
        englishName: 'Next Generation Education Committee Heaven\'s Life Children\'s Department 1',
        code: 'EC-NG-HF-C1',
        description: '하늘생명 소속 어린이 1부입니다. LEVEL_3 세부부서입니다.',
        level: OrganizationLevel.LEVEL_3,
        parentCode: 'EC-NG-HF'
      },
      {
        name: '어린이2부',
        englishName: 'Next Generation Education Committee Heaven\'s Life Children\'s Department 2',
        code: 'EC-NG-HF-C2',
        description: '하늘생명 소속 어린이 2부입니다. LEVEL_3 세부부서입니다.',
        level: OrganizationLevel.LEVEL_3,
        parentCode: 'EC-NG-HF'
      },
      {
        name: '어린이3부',
        englishName: 'Next Generation Education Committee Heaven\'s Life Children\'s Department 3',
        code: 'EC-NG-HF-C3',
        description: '하늘생명 소속 어린이 3부입니다. LEVEL_3 세부부서입니다.',
        level: OrganizationLevel.LEVEL_3,
        parentCode: 'EC-NG-HF'
      },
      {
        name: '꿈둥이부',
        englishName: 'Next Generation Education Committee Heaven\'s Life Dreamers Department',
        code: 'EC-NG-HF-DR',
        description: '하늘생명 소속 꿈둥이부입니다. LEVEL_3 세부부서입니다.',
        level: OrganizationLevel.LEVEL_3,
        parentCode: 'EC-NG-HF'
      },

      // 하늘평화 (LEVEL_2) - 중고등부 담당
      {
        name: '하늘평화',
        englishName: 'Next Generation Education Committee Heaven\'s Peace',
        code: 'EC-NG-HP',
        description: '다음세대교육위원회의 중고등부 교육을 담당하는 부서입니다. LEVEL_2 부서입니다.',
        level: OrganizationLevel.LEVEL_2,
        parentCode: 'EC-NG'
      },

      // 하늘평화 하위 세부부서들 (LEVEL_3)
      {
        name: '중등부',
        englishName: 'Next Generation Education Committee Heaven\'s Peace Middle School Department',
        code: 'EC-NG-HP-MS',
        description: '하늘평화 소속 중등부입니다. LEVEL_3 세부부서입니다.',
        level: OrganizationLevel.LEVEL_3,
        parentCode: 'EC-NG-HP'
      },
      {
        name: '고등부',
        englishName: 'Next Generation Education Committee Heaven\'s Peace High School Department',
        code: 'EC-NG-HP-HS',
        description: '하늘평화 소속 고등부입니다. LEVEL_3 세부부서입니다.',
        level: OrganizationLevel.LEVEL_3,
        parentCode: 'EC-NG-HP'
      }
    ]

    // 4. 기존 조직 확인 (중복 방지)
    console.log('\n🔍 Checking for existing organizations and code conflicts...')
    
    const proposedCodes = additionalNextGenOrganizations.map(org => org.code)
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
    const newOrganizations = additionalNextGenOrganizations.filter(org => !existingCodesSet.has(org.code))

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
    console.log('\n🏗️  Creating additional Next Generation Education departments...')
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
        
        // 연령/학교급별 이모지
        const ageEmoji = orgData.code.includes('-HF') && orgData.level === 'LEVEL_2' ? '🏫' : // 하늘생명 (초등)
                         orgData.code.includes('-HP') && orgData.level === 'LEVEL_2' ? '🎓' : // 하늘평화 (중고등)
                         orgData.name.includes('토요') ? '📅' : 
                         orgData.name.includes('어린이') ? '👧' : 
                         orgData.name.includes('꿈둥이') ? '🌟' : 
                         orgData.name.includes('중등') ? '📚' : 
                         orgData.name.includes('고등') ? '🎓' : '👶'
        
        console.log(`✅ Created ${orgData.level}: ${ageEmoji} ${orgData.name} (${orgData.code})`)
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

    // 9. 업데이트된 다음세대교육위원회 현황
    console.log(`\n📊 Additional Next Generation Departments Creation Summary:`)
    console.log(`   New organizations requested: ${additionalNextGenOrganizations.length}`)
    console.log(`   Already existing: ${existingOrganizations.length}`)
    console.log(`   Successfully created: ${createdCount}`)
    console.log(`   Skipped (conflicts/errors): ${skippedCount}`)

    // 10. 다음세대교육위원회 전체 구조 현황
    console.log('\n🏛️ Updated Next Generation Education Committee Structure:')
    
    const nextGenCommittee = await prisma.organization.findFirst({
      where: { code: 'EC-NG' }
    })

    if (nextGenCommittee) {
      const allLevel2Depts = await prisma.organization.count({
        where: {
          parentId: nextGenCommittee.id,
          level: 'LEVEL_2'
        }
      })

      console.log(`   👶 다음세대교육위원회 (EC-NG): ${allLevel2Depts}개 부서`)

      // 각 부서별 하위 조직 수
      const departments = [
        { name: '하늘사랑', code: 'EC-NG-HL', emoji: '👶', desc: '유아/유치부' },
        { name: '하늘생명', code: 'EC-NG-HF', emoji: '🏫', desc: '초등부' },
        { name: '하늘평화', code: 'EC-NG-HP', emoji: '🎓', desc: '중고등부' }
      ]

      for (const dept of departments) {
        const deptOrg = await prisma.organization.findFirst({
          where: { code: dept.code }
        })

        if (deptOrg) {
          const subDeptCount = await prisma.organization.count({
            where: {
              parentId: deptOrg.id,
              level: 'LEVEL_3'
            }
          })

          console.log(`   └── ${dept.emoji} ${dept.name} (${dept.desc}): ${subDeptCount}개 세부부서`)
        }
      }
    }

    // 11. 연령대별 교육 구조 현황
    console.log('\n📚 Age-Based Education Structure:')
    
    // 하늘생명 (초등부) 세부부서들
    const heavenLife = createdOrganizations['EC-NG-HF'] || 
      await prisma.organization.findFirst({ where: { code: 'EC-NG-HF' } })
    
    if (heavenLife) {
      const heavenLifeSubDepts = await prisma.organization.findMany({
        where: {
          parentId: heavenLife.id,
          level: 'LEVEL_3'
        },
        orderBy: { sortOrder: 'asc' }
      })

      console.log(`🏫 하늘생명 (초등부) - ${heavenLifeSubDepts.length}개 세부부서:`)
      heavenLifeSubDepts.forEach((dept, index) => {
        const isNew = dept.createdAt > new Date(Date.now() - 30 * 60 * 60 * 1000)
        const newFlag = isNew ? ' 🆕' : ''
        const deptEmoji = dept.name.includes('토요') ? '📅' : 
                         dept.name.includes('꿈둥이') ? '🌟' : '👧'
        
        console.log(`   ${index + 1}. ${deptEmoji} ${dept.name} (${dept.code})${newFlag}`)
      })
    }

    // 하늘평화 (중고등부) 세부부서들
    const heavenPeace = createdOrganizations['EC-NG-HP'] || 
      await prisma.organization.findFirst({ where: { code: 'EC-NG-HP' } })
    
    if (heavenPeace) {
      const heavenPeaceSubDepts = await prisma.organization.findMany({
        where: {
          parentId: heavenPeace.id,
          level: 'LEVEL_3'
        },
        orderBy: { sortOrder: 'asc' }
      })

      console.log(`\n🎓 하늘평화 (중고등부) - ${heavenPeaceSubDepts.length}개 세부부서:`)
      heavenPeaceSubDepts.forEach((dept, index) => {
        const isNew = dept.createdAt > new Date(Date.now() - 30 * 60 * 60 * 1000)
        const newFlag = isNew ? ' 🆕' : ''
        const deptEmoji = dept.name.includes('중등') ? '📚' : '🎓'
        
        console.log(`   ${index + 1}. ${deptEmoji} ${dept.name} (${dept.code})${newFlag}`)
      })
    }

    if (createdCount > 0) {
      console.log('\n🎉 Additional Next Generation Education departments successfully inserted!')
    } else if (skippedCount === additionalNextGenOrganizations.length) {
      console.log('\n✅ All requested organizations already exist')
    }

    return {
      requested: additionalNextGenOrganizations.length,
      created: createdCount,
      existing: existingOrganizations.length,
      skipped: skippedCount,
      departments: {
        heavenLife: newOrganizations.filter(o => o.code.startsWith('EC-NG-HF')).length,
        heavenPeace: newOrganizations.filter(o => o.code.startsWith('EC-NG-HP')).length
      },
      levels: {
        level2: newOrganizations.filter(o => o.level === 'LEVEL_2').length,
        level3: newOrganizations.filter(o => o.level === 'LEVEL_3').length
      }
    }

  } catch (error) {
    console.error('❌ Error inserting additional Next Generation Education departments:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

insertAdditionalNextGenDepartments().catch(console.error)