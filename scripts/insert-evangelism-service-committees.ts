import { PrismaClient, OrganizationLevel } from '@prisma/client'

const prisma = new PrismaClient()

async function insertEvangelismServiceCommittees() {
  console.log('🏛️ Inserting Evangelism and Service Committees with 김은혜 as creator...')

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

    // 3. 전도위원회와 봉사위원회 조직 데이터
    const evangelismServiceOrganizations = [
      // 전도위원회 (LEVEL_1)
      {
        name: '전도위원회',
        englishName: 'Evangelism Committee',
        code: 'EC-EV',
        description: '전도 사역을 위한 위원회입니다. LEVEL_1 조직입니다.',
        level: OrganizationLevel.LEVEL_1,
        parentCode: null
      },
      // 전도위원회 하위 부서 (LEVEL_2)
      {
        name: '하늘행복전도대',
        englishName: 'Evangelism Committee Heaven\'s Happiness Evangelism Team',
        code: 'EC-EV-HE',
        description: '전도위원회의 하늘행복전도대입니다. LEVEL_2 부서입니다.',
        level: OrganizationLevel.LEVEL_2,
        parentCode: 'EC-EV'
      },

      // 봉사위원회 (LEVEL_1)
      {
        name: '봉사위원회',
        englishName: 'Service Committee',
        code: 'SC-SV',
        description: '봉사 사역을 위한 위원회입니다. LEVEL_1 조직입니다.',
        level: OrganizationLevel.LEVEL_1,
        parentCode: null
      },
      // 봉사위원회 하위 부서들 (LEVEL_2)
      {
        name: '봉사부',
        englishName: 'Service Committee Service Department',
        code: 'SC-SV-SD',
        description: '봉사위원회의 봉사 활동을 담당하는 부서입니다. LEVEL_2 부서입니다.',
        level: OrganizationLevel.LEVEL_2,
        parentCode: 'SC-SV'
      },
      {
        name: '희망봉사단',
        englishName: 'Service Committee Hope Volunteer Group',
        code: 'SC-SV-HV',
        description: '봉사위원회의 희망봉사단입니다. LEVEL_2 부서입니다.',
        level: OrganizationLevel.LEVEL_2,
        parentCode: 'SC-SV'
      },
      {
        name: '결혼예식부',
        englishName: 'Service Committee Wedding Ceremony Department',
        code: 'SC-SV-WC',
        description: '봉사위원회의 결혼 예식을 담당하는 부서입니다. LEVEL_2 부서입니다.',
        level: OrganizationLevel.LEVEL_2,
        parentCode: 'SC-SV'
      },
      {
        name: '장례예식부',
        englishName: 'Service Committee Funeral Service Department',
        code: 'SC-SV-FS',
        description: '봉사위원회의 장례 예식을 담당하는 부서입니다. LEVEL_2 부서입니다.',
        level: OrganizationLevel.LEVEL_2,
        parentCode: 'SC-SV'
      },
      {
        name: '노숙인사역팀',
        englishName: 'Service Committee Homeless Ministry Team',
        code: 'SC-SV-HM',
        description: '봉사위원회의 노숙인 사역 팀입니다. LEVEL_2 부서입니다.',
        level: OrganizationLevel.LEVEL_2,
        parentCode: 'SC-SV'
      },
      {
        name: '이미용사역팀',
        englishName: 'Service Committee Hair & Beauty Ministry Team',
        code: 'SC-SV-HB',
        description: '봉사위원회의 이미용 사역 팀입니다. LEVEL_2 부서입니다.',
        level: OrganizationLevel.LEVEL_2,
        parentCode: 'SC-SV'
      },
      {
        name: '노인복지배식사역팀',
        englishName: 'Service Committee Senior Welfare Meal Service Team',
        code: 'SC-SV-SW',
        description: '봉사위원회의 노인 복지 배식 사역 팀입니다. LEVEL_2 부서입니다.',
        level: OrganizationLevel.LEVEL_2,
        parentCode: 'SC-SV'
      },
      {
        name: '호스피스사역팀',
        englishName: 'Service Committee Hospice Ministry Team',
        code: 'SC-SV-HS',
        description: '봉사위원회의 호스피스 사역 팀입니다. LEVEL_2 부서입니다.',
        level: OrganizationLevel.LEVEL_2,
        parentCode: 'SC-SV'
      }
    ]

    // 4. 기존 조직 확인 (중복 방지)
    console.log('\n🔍 Checking for existing organizations and code conflicts...')
    
    const proposedCodes = evangelismServiceOrganizations.map(org => org.code)
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
    const newOrganizations = evangelismServiceOrganizations.filter(org => !existingCodesSet.has(org.code))

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
    console.log('\n🏗️  Creating Evangelism and Service Committees...')
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
        
        const categoryEmoji = orgData.code.startsWith('EC-') ? '📢' : 
                             orgData.code.startsWith('SC-') ? '🤝' : '📋'
        
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
    console.log(`\n📊 Evangelism & Service Committees Creation Summary:`)
    console.log(`   New organizations requested: ${evangelismServiceOrganizations.length}`)
    console.log(`   Already existing: ${existingOrganizations.length}`)
    console.log(`   Successfully created: ${createdCount}`)
    console.log(`   Skipped (conflicts/errors): ${skippedCount}`)

    // 10. 위원회별 구성 현황
    console.log('\n🏛️ Committee Structure Overview:')
    
    // 전도위원회 현황
    const evangelismCommittee = createdOrganizations['EC-EV'] || 
      await prisma.organization.findFirst({ where: { code: 'EC-EV' } })
    
    if (evangelismCommittee) {
      const evangelismDepts = await prisma.organization.count({
        where: {
          parentId: evangelismCommittee.id,
          level: 'LEVEL_2'
        }
      })
      
      console.log(`   📢 전도위원회 (EC-EV): ${evangelismDepts}개 부서`)
    }

    // 봉사위원회 현황
    const serviceCommittee = createdOrganizations['SC-SV'] || 
      await prisma.organization.findFirst({ where: { code: 'SC-SV' } })
    
    if (serviceCommittee) {
      const serviceDepts = await prisma.organization.count({
        where: {
          parentId: serviceCommittee.id,
          level: 'LEVEL_2'
        }
      })
      
      console.log(`   🤝 봉사위원회 (SC-SV): ${serviceDepts}개 부서`)
    }

    // 11. 봉사위원회 세부 부서 현황
    console.log('\n🤝 Service Committee Departments:')
    
    if (serviceCommittee) {
      const serviceDepartments = await prisma.organization.findMany({
        where: {
          parentId: serviceCommittee.id,
          level: 'LEVEL_2'
        },
        orderBy: { sortOrder: 'asc' }
      })

      serviceDepartments.forEach((dept, index) => {
        const isNew = dept.createdAt > new Date(Date.now() - 30 * 60 * 1000)
        const newFlag = isNew ? ' 🆕' : ''
        const serviceType = dept.name.includes('예식') ? '⛪' : 
                           dept.name.includes('사역') ? '💙' : 
                           dept.name.includes('봉사') ? '🤝' : '📋'
        
        console.log(`   ${index + 1}. ${serviceType} ${dept.name} (${dept.code})${newFlag}`)
      })
    }

    if (createdCount > 0) {
      console.log('\n🎉 Evangelism and Service Committees successfully inserted!')
    } else if (skippedCount === evangelismServiceOrganizations.length) {
      console.log('\n✅ All requested organizations already exist')
    }

    return {
      requested: evangelismServiceOrganizations.length,
      created: createdCount,
      existing: existingOrganizations.length,
      skipped: skippedCount,
      committees: {
        evangelism: newOrganizations.filter(o => o.code.startsWith('EC-')).length,
        service: newOrganizations.filter(o => o.code.startsWith('SC-')).length
      }
    }

  } catch (error) {
    console.error('❌ Error inserting Evangelism and Service Committees:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

insertEvangelismServiceCommittees().catch(console.error)