import { PrismaClient, OrganizationLevel } from '@prisma/client'

const prisma = new PrismaClient()

async function insertManagementMediaExternalCommittees() {
  console.log('🏛️ Inserting Management, Media & External Cooperation departments with 김은혜 as creator...')

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

    // 3. 관리위원회 하위부서, 미디어사역위원회, 대외협력위원회 조직 데이터
    const additionalCommitteeOrganizations = [
      // 관리위원회 하위 부서들 (LEVEL_2)
      {
        name: '행정관리부',
        englishName: 'Management Committee Administration Management Department',
        code: 'MC-MG-AM',
        description: '관리위원회의 행정 관리를 담당하는 부서입니다. LEVEL_2 부서입니다.',
        level: OrganizationLevel.LEVEL_2,
        parentCode: 'MC-MG'
      },
      {
        name: '건물관리부',
        englishName: 'Management Committee Building Management Department',
        code: 'MC-MG-BM',
        description: '관리위원회의 건물 관리를 담당하는 부서입니다. LEVEL_2 부서입니다.',
        level: OrganizationLevel.LEVEL_2,
        parentCode: 'MC-MG'
      },
      {
        name: '식당관리부',
        englishName: 'Management Committee Cafeteria Management Department',
        code: 'MC-MG-CA',
        description: '관리위원회의 식당 관리를 담당하는 부서입니다. LEVEL_2 부서입니다.',
        level: OrganizationLevel.LEVEL_2,
        parentCode: 'MC-MG'
      },
      {
        name: '안전관리부',
        englishName: 'Management Committee Safety Management Department',
        code: 'MC-MG-SM',
        description: '관리위원회의 안전 관리를 담당하는 부서입니다. LEVEL_2 부서입니다.',
        level: OrganizationLevel.LEVEL_2,
        parentCode: 'MC-MG'
      },

      // 미디어사역위원회 (LEVEL_1)
      {
        name: '미디어사역위원회',
        englishName: 'Media Ministry Committee',
        code: 'MC-ME',
        description: '미디어 사역을 위한 위원회입니다. LEVEL_1 조직입니다.',
        level: OrganizationLevel.LEVEL_1,
        parentCode: null
      },

      // 미디어사역위원회 하위 부서들 (LEVEL_2)
      {
        name: '미디어사역부',
        englishName: 'Media Ministry Committee Media Ministry Department',
        code: 'MC-ME-MM',
        description: '미디어사역위원회의 미디어 사역을 담당하는 부서입니다. LEVEL_2 부서입니다.',
        level: OrganizationLevel.LEVEL_2,
        parentCode: 'MC-ME'
      },

      // 대외협력위원회 (LEVEL_1)
      {
        name: '대외협력위원회',
        englishName: 'External Cooperation Committee',
        code: 'CC-EC',
        description: '대외 협력 및 교류를 위한 위원회입니다. LEVEL_1 조직입니다.',
        level: OrganizationLevel.LEVEL_1,
        parentCode: null
      },

      // 대외협력위원회 하위 부서들 (LEVEL_2)
      {
        name: '대외협력부',
        englishName: 'External Cooperation Committee External Cooperation Department',
        code: 'CC-EC-EC',
        description: '대외협력위원회의 대외 협력을 담당하는 부서입니다. LEVEL_2 부서입니다.',
        level: OrganizationLevel.LEVEL_2,
        parentCode: 'CC-EC'
      },
      {
        name: '이단대책부',
        englishName: 'External Cooperation Committee Heresy Countermeasures Department',
        code: 'CC-EC-HC',
        description: '대외협력위원회의 이단 대책을 담당하는 부서입니다. LEVEL_2 부서입니다.',
        level: OrganizationLevel.LEVEL_2,
        parentCode: 'CC-EC'
      }
    ]

    // 4. 기존 조직 확인 (중복 방지)
    console.log('\n🔍 Checking for existing organizations and code conflicts...')
    
    const proposedCodes = additionalCommitteeOrganizations.map(org => org.code)
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
    const newOrganizations = additionalCommitteeOrganizations.filter(org => !existingCodesSet.has(org.code))

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
    console.log('\n🏗️  Creating Management, Media & External Cooperation committees...')
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
        
        // 위원회/부서별 이모지
        const organizationEmoji = orgData.code.includes('MC-MG') && orgData.level === 'LEVEL_2' ? 
                                  (orgData.name.includes('행정') ? '📄' : 
                                   orgData.name.includes('건물') ? '🏢' :
                                   orgData.name.includes('식당') ? '🍽️' : 
                                   orgData.name.includes('안전') ? '🛡️' : '🏢') :
                                  orgData.code.includes('MC-ME') ? '📺' : // 미디어사역
                                  orgData.code.includes('CC-EC') ? '🤝' : '📋' // 대외협력
        
        console.log(`✅ Created ${orgData.level}: ${organizationEmoji} ${orgData.name} (${orgData.code})`)
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

    // 9. 업데이트된 위원회 현황
    console.log(`\n📊 Management, Media & External Cooperation Creation Summary:`)
    console.log(`   New organizations requested: ${additionalCommitteeOrganizations.length}`)
    console.log(`   Already existing: ${existingOrganizations.length}`)
    console.log(`   Successfully created: ${createdCount}`)
    console.log(`   Skipped (conflicts/errors): ${skippedCount}`)

    // 10. 각 위원회별 구성 현황
    console.log('\n🏛️ Committee Structure Overview:')
    
    // 관리위원회 현황 (하위 부서 포함)
    const managementCommittee = await prisma.organization.findFirst({ where: { code: 'MC-MG' } })
    
    if (managementCommittee) {
      const managementDepts = await prisma.organization.count({
        where: {
          parentId: managementCommittee.id,
          level: 'LEVEL_2'
        }
      })
      console.log(`   🏢 관리위원회 (MC-MG): ${managementDepts}개 부서`)
    }

    // 미디어사역위원회 현황
    const mediaCommittee = createdOrganizations['MC-ME'] || 
      await prisma.organization.findFirst({ where: { code: 'MC-ME' } })
    
    if (mediaCommittee) {
      const mediaDepts = await prisma.organization.count({
        where: {
          parentId: mediaCommittee.id,
          level: 'LEVEL_2'
        }
      })
      console.log(`   📺 미디어사역위원회 (MC-ME): ${mediaDepts}개 부서`)
    }

    // 대외협력위원회 현황
    const externalCommittee = createdOrganizations['CC-EC'] || 
      await prisma.organization.findFirst({ where: { code: 'CC-EC' } })
    
    if (externalCommittee) {
      const externalDepts = await prisma.organization.count({
        where: {
          parentId: externalCommittee.id,
          level: 'LEVEL_2'
        }
      })
      console.log(`   🤝 대외협력위원회 (CC-EC): ${externalDepts}개 부서`)
    }

    // 11. 위원회별 세부 부서 목록
    console.log('\n📋 Committee Department Details:')
    
    // 관리위원회 부서들 (업데이트된 목록)
    if (managementCommittee) {
      const managementDepts = await prisma.organization.findMany({
        where: {
          parentId: managementCommittee.id,
          level: 'LEVEL_2'
        },
        orderBy: { sortOrder: 'asc' }
      })

      console.log(`\n🏢 관리위원회 - ${managementDepts.length}개 부서:`)
      managementDepts.forEach((dept, index) => {
        const isNew = dept.createdAt > new Date(Date.now() - 30 * 60 * 1000)
        const newFlag = isNew ? ' 🆕' : ''
        const deptEmoji = dept.name.includes('행정') ? '📄' : 
                         dept.name.includes('건물') ? '🏢' :
                         dept.name.includes('식당') ? '🍽️' : 
                         dept.name.includes('안전') ? '🛡️' : '🏢'
        
        console.log(`   ${index + 1}. ${deptEmoji} ${dept.name} (${dept.code})${newFlag}`)
      })
    }

    // 미디어사역위원회 부서들
    if (mediaCommittee) {
      const mediaDepts = await prisma.organization.findMany({
        where: {
          parentId: mediaCommittee.id,
          level: 'LEVEL_2'
        },
        orderBy: { sortOrder: 'asc' }
      })

      console.log(`\n📺 미디어사역위원회 - ${mediaDepts.length}개 부서:`)
      mediaDepts.forEach((dept, index) => {
        const isNew = dept.createdAt > new Date(Date.now() - 30 * 60 * 1000)
        const newFlag = isNew ? ' 🆕' : ''
        
        console.log(`   ${index + 1}. 📺 ${dept.name} (${dept.code})${newFlag}`)
      })
    }

    // 대외협력위원회 부서들
    if (externalCommittee) {
      const externalDepts = await prisma.organization.findMany({
        where: {
          parentId: externalCommittee.id,
          level: 'LEVEL_2'
        },
        orderBy: { sortOrder: 'asc' }
      })

      console.log(`\n🤝 대외협력위원회 - ${externalDepts.length}개 부서:`)
      externalDepts.forEach((dept, index) => {
        const isNew = dept.createdAt > new Date(Date.now() - 30 * 60 * 1000)
        const newFlag = isNew ? ' 🆕' : ''
        const deptEmoji = dept.name.includes('이단') ? '⚡' : '🤝'
        
        console.log(`   ${index + 1}. ${deptEmoji} ${dept.name} (${dept.code})${newFlag}`)
      })
    }

    if (createdCount > 0) {
      console.log('\n🎉 Management, Media & External Cooperation committees successfully inserted!')
    } else if (skippedCount === additionalCommitteeOrganizations.length) {
      console.log('\n✅ All requested organizations already exist')
    }

    return {
      requested: additionalCommitteeOrganizations.length,
      created: createdCount,
      existing: existingOrganizations.length,
      skipped: skippedCount,
      committees: {
        management: newOrganizations.filter(o => o.code.startsWith('MC-MG')).length,
        media: newOrganizations.filter(o => o.code.startsWith('MC-ME')).length,
        external: newOrganizations.filter(o => o.code.startsWith('CC-EC')).length
      },
      levels: {
        level1: newOrganizations.filter(o => o.level === 'LEVEL_1').length,
        level2: newOrganizations.filter(o => o.level === 'LEVEL_2').length
      }
    }

  } catch (error) {
    console.error('❌ Error inserting Management, Media & External Cooperation committees:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

insertManagementMediaExternalCommittees().catch(console.error)