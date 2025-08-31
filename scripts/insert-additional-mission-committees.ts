import { PrismaClient, OrganizationLevel } from '@prisma/client'

const prisma = new PrismaClient()

async function insertAdditionalMissionCommittees() {
  console.log('🏛️ Inserting additional Mission Committees (문화사역, 장애인사역, 관리위원회) with 김은혜 as creator...')

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

    // 3. 추가 선교위원회들 조직 데이터
    const additionalMissionOrganizations = [
      // 문화사역위원회 (LEVEL_1)
      {
        name: '문화사역위원회',
        englishName: 'Culture Ministry Committee',
        code: 'MC-CM',
        description: '문화 사역을 위한 위원회입니다. LEVEL_1 조직입니다.',
        level: OrganizationLevel.LEVEL_1,
        parentCode: null
      },
      
      // 문화사역위원회 하위 부서들 (LEVEL_2)
      {
        name: '문화사역부',
        englishName: 'Culture Ministry Committee Culture Ministry Department',
        code: 'MC-CM-CM',
        description: '문화사역위원회의 문화 사역을 담당하는 부서입니다. LEVEL_2 부서입니다.',
        level: OrganizationLevel.LEVEL_2,
        parentCode: 'MC-CM'
      },
      {
        name: '카페벳새다부',
        englishName: 'Culture Ministry Committee Cafe Bethesda Department',
        code: 'MC-CM-CB',
        description: '문화사역위원회의 카페 벳새다를 담당하는 부서입니다. LEVEL_2 부서입니다.',
        level: OrganizationLevel.LEVEL_2,
        parentCode: 'MC-CM'
      },
      {
        name: '동호회부',
        englishName: 'Culture Ministry Committee Club Department',
        code: 'MC-CM-CL',
        description: '문화사역위원회의 동호회를 담당하는 부서입니다. LEVEL_2 부서입니다.',
        level: OrganizationLevel.LEVEL_2,
        parentCode: 'MC-CM'
      },
      {
        name: '하늘행복소식지',
        englishName: 'Culture Ministry Committee Heaven\'s Happiness Newsletter',
        code: 'MC-CM-HN',
        description: '문화사역위원회의 하늘행복소식지를 담당하는 부서입니다. LEVEL_2 부서입니다.',
        level: OrganizationLevel.LEVEL_2,
        parentCode: 'MC-CM'
      },

      // 장애인사역위원회 (LEVEL_1)
      {
        name: '장애인사역위원회',
        englishName: 'Disability Ministry Committee',
        code: 'MC-DS',
        description: '장애인 사역을 위한 위원회입니다. LEVEL_1 조직입니다.',
        level: OrganizationLevel.LEVEL_1,
        parentCode: null
      },

      // 장애인사역위원회 하위 부서들 (LEVEL_2)
      {
        name: '에바다부',
        englishName: 'Disability Ministry Committee Ephphatha Department',
        code: 'MC-DS-EP',
        description: '장애인사역위원회의 에바다 사역을 담당하는 부서입니다. LEVEL_2 부서입니다.',
        level: OrganizationLevel.LEVEL_2,
        parentCode: 'MC-DS'
      },
      {
        name: '사랑부',
        englishName: 'Disability Ministry Committee Love Department',
        code: 'MC-DS-LV',
        description: '장애인사역위원회의 사랑 사역을 담당하는 부서입니다. LEVEL_2 부서입니다.',
        level: OrganizationLevel.LEVEL_2,
        parentCode: 'MC-DS'
      },

      // 관리위원회 (LEVEL_1)
      {
        name: '관리위원회',
        englishName: 'Management Committee',
        code: 'MC-MG',
        description: '교회 시설 및 전반적인 관리를 위한 위원회입니다. LEVEL_1 조직입니다.',
        level: OrganizationLevel.LEVEL_1,
        parentCode: null
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
    console.log('\n🏗️  Creating additional Mission Committees...')
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
        
        // 위원회별 이모지
        const committeeEmoji = orgData.code.includes('MC-CM') ? '🎨' : // 문화사역
                              orgData.code.includes('MC-DS') ? '♿' : // 장애인사역
                              orgData.code.includes('MC-MG') ? '🏢' : '📋' // 관리위원회
        
        console.log(`✅ Created ${orgData.level}: ${committeeEmoji} ${orgData.name} (${orgData.code})`)
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

    // 9. 업데이트된 선교위원회 현황
    console.log(`\n📊 Additional Mission Committees Creation Summary:`)
    console.log(`   New organizations requested: ${additionalMissionOrganizations.length}`)
    console.log(`   Already existing: ${existingOrganizations.length}`)
    console.log(`   Successfully created: ${createdCount}`)
    console.log(`   Skipped (conflicts/errors): ${skippedCount}`)

    // 10. 각 위원회별 구성 현황
    console.log('\n🏛️ Additional Mission Committees Structure:')
    
    // 문화사역위원회 현황
    const cultureCommittee = createdOrganizations['MC-CM'] || 
      await prisma.organization.findFirst({ where: { code: 'MC-CM' } })
    
    if (cultureCommittee) {
      const cultureDepts = await prisma.organization.count({
        where: {
          parentId: cultureCommittee.id,
          level: 'LEVEL_2'
        }
      })
      console.log(`   🎨 문화사역위원회 (MC-CM): ${cultureDepts}개 부서`)
    }

    // 장애인사역위원회 현황
    const disabilityCommittee = createdOrganizations['MC-DS'] || 
      await prisma.organization.findFirst({ where: { code: 'MC-DS' } })
    
    if (disabilityCommittee) {
      const disabilityDepts = await prisma.organization.count({
        where: {
          parentId: disabilityCommittee.id,
          level: 'LEVEL_2'
        }
      })
      console.log(`   ♿ 장애인사역위원회 (MC-DS): ${disabilityDepts}개 부서`)
    }

    // 관리위원회 현황
    const managementCommittee = createdOrganizations['MC-MG'] || 
      await prisma.organization.findFirst({ where: { code: 'MC-MG' } })
    
    if (managementCommittee) {
      console.log(`   🏢 관리위원회 (MC-MG): 단일 위원회`)
    }

    // 11. 위원회별 세부 부서 목록
    console.log('\n📋 Committee Department Details:')
    
    // 문화사역위원회 부서들
    if (cultureCommittee) {
      const cultureDepts = await prisma.organization.findMany({
        where: {
          parentId: cultureCommittee.id,
          level: 'LEVEL_2'
        },
        orderBy: { sortOrder: 'asc' }
      })

      console.log(`\n🎨 문화사역위원회 - ${cultureDepts.length}개 부서:`)
      cultureDepts.forEach((dept, index) => {
        const isNew = dept.createdAt > new Date(Date.now() - 30 * 60 * 1000)
        const newFlag = isNew ? ' 🆕' : ''
        const deptEmoji = dept.name.includes('카페') ? '☕' : 
                         dept.name.includes('동호회') ? '🎯' : 
                         dept.name.includes('소식지') ? '📰' : '🎨'
        
        console.log(`   ${index + 1}. ${deptEmoji} ${dept.name} (${dept.code})${newFlag}`)
      })
    }

    // 장애인사역위원회 부서들
    if (disabilityCommittee) {
      const disabilityDepts = await prisma.organization.findMany({
        where: {
          parentId: disabilityCommittee.id,
          level: 'LEVEL_2'
        },
        orderBy: { sortOrder: 'asc' }
      })

      console.log(`\n♿ 장애인사역위원회 - ${disabilityDepts.length}개 부서:`)
      disabilityDepts.forEach((dept, index) => {
        const isNew = dept.createdAt > new Date(Date.now() - 30 * 60 * 1000)
        const newFlag = isNew ? ' 🆕' : ''
        const deptEmoji = dept.name.includes('에바다') ? '🙏' : '💗'
        
        console.log(`   ${index + 1}. ${deptEmoji} ${dept.name} (${dept.code})${newFlag}`)
      })
    }

    if (createdCount > 0) {
      console.log('\n🎉 Additional Mission Committees successfully inserted!')
    } else if (skippedCount === additionalMissionOrganizations.length) {
      console.log('\n✅ All requested organizations already exist')
    }

    return {
      requested: additionalMissionOrganizations.length,
      created: createdCount,
      existing: existingOrganizations.length,
      skipped: skippedCount,
      committees: {
        culture: newOrganizations.filter(o => o.code.startsWith('MC-CM')).length,
        disability: newOrganizations.filter(o => o.code.startsWith('MC-DS')).length,
        management: newOrganizations.filter(o => o.code.startsWith('MC-MG')).length
      },
      levels: {
        level1: newOrganizations.filter(o => o.level === 'LEVEL_1').length,
        level2: newOrganizations.filter(o => o.level === 'LEVEL_2').length
      }
    }

  } catch (error) {
    console.error('❌ Error inserting additional Mission Committees:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

insertAdditionalMissionCommittees().catch(console.error)