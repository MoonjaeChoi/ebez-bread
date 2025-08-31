import { PrismaClient, OrganizationLevel } from '@prisma/client'

const prisma = new PrismaClient()

async function insertFinanceAuditVehicleNewfamilyCommittees() {
  console.log('🏛️ Inserting Finance, Audit, Vehicle Management & New Family committees with 김은혜 as creator...')

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

    // 3. 재정, 감사, 차량관리, 새가족 위원회 조직 데이터
    const additionalCommitteeOrganizations = [
      // 재정위원회 (LEVEL_1)
      {
        name: '재정위원회',
        englishName: 'Finance Committee',
        code: 'FC-FI',
        description: '재정 관리를 위한 위원회입니다. LEVEL_1 조직입니다.',
        level: OrganizationLevel.LEVEL_1,
        parentCode: null
      },

      // 재정위원회 하위 부서들 (LEVEL_2)
      {
        name: '회계1부',
        englishName: 'Finance Committee Accounting Department 1',
        code: 'FC-FI-A1',
        description: '재정위원회의 회계 1부를 담당하는 부서입니다. LEVEL_2 부서입니다.',
        level: OrganizationLevel.LEVEL_2,
        parentCode: 'FC-FI'
      },
      {
        name: '회계2부',
        englishName: 'Finance Committee Accounting Department 2',
        code: 'FC-FI-A2',
        description: '재정위원회의 회계 2부를 담당하는 부서입니다. LEVEL_2 부서입니다.',
        level: OrganizationLevel.LEVEL_2,
        parentCode: 'FC-FI'
      },

      // 감사위원회 (LEVEL_1)
      {
        name: '감사위원회',
        englishName: 'Audit Committee',
        code: 'AC-AU',
        description: '감사 업무를 위한 위원회입니다. LEVEL_1 조직입니다.',
        level: OrganizationLevel.LEVEL_1,
        parentCode: null
      },

      // 감사위원회 하위 부서들 (LEVEL_2)
      {
        name: '감사부',
        englishName: 'Audit Committee Audit Department',
        code: 'AC-AU-AD',
        description: '감사위원회의 감사 업무를 담당하는 부서입니다. LEVEL_2 부서입니다.',
        level: OrganizationLevel.LEVEL_2,
        parentCode: 'AC-AU'
      },

      // 차량관리위원회 (LEVEL_1)
      {
        name: '차량관리위원회',
        englishName: 'Vehicle Management Committee',
        code: 'MC-VM',
        description: '차량 관리를 위한 위원회입니다. LEVEL_1 조직입니다.',
        level: OrganizationLevel.LEVEL_1,
        parentCode: null
      },

      // 차량관리위원회 하위 부서들 (LEVEL_2)
      {
        name: '차량관리부',
        englishName: 'Vehicle Management Committee Vehicle Management Department',
        code: 'MC-VM-VM',
        description: '차량관리위원회의 차량 관리를 담당하는 부서입니다. LEVEL_2 부서입니다.',
        level: OrganizationLevel.LEVEL_2,
        parentCode: 'MC-VM'
      },
      {
        name: '주차관리부',
        englishName: 'Vehicle Management Committee Parking Management Department',
        code: 'MC-VM-PM',
        description: '차량관리위원회의 주차 관리를 담당하는 부서입니다. LEVEL_2 부서입니다.',
        level: OrganizationLevel.LEVEL_2,
        parentCode: 'MC-VM'
      },

      // 새가족위원회 (LEVEL_1)
      {
        name: '새가족위원회',
        englishName: 'New Family Committee',
        code: 'FC-NF',
        description: '새가족을 위한 위원회입니다. LEVEL_1 조직입니다.',
        level: OrganizationLevel.LEVEL_1,
        parentCode: null
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
    console.log('\n🏗️  Creating Finance, Audit, Vehicle Management & New Family committees...')
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
        const organizationEmoji = orgData.code.includes('FC-FI') ? '💰' : // 재정위원회
                                  orgData.code.includes('AC-AU') ? '🔍' : // 감사위원회
                                  orgData.code.includes('MC-VM') ? '🚗' : // 차량관리위원회
                                  orgData.code.includes('FC-NF') ? '👨‍👩‍👧‍👦' : '📋' // 새가족위원회
        
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
    console.log(`\n📊 Finance, Audit, Vehicle Management & New Family Creation Summary:`)
    console.log(`   New organizations requested: ${additionalCommitteeOrganizations.length}`)
    console.log(`   Already existing: ${existingOrganizations.length}`)
    console.log(`   Successfully created: ${createdCount}`)
    console.log(`   Skipped (conflicts/errors): ${skippedCount}`)

    // 10. 각 위원회별 구성 현황
    console.log('\n🏛️ Committee Structure Overview:')
    
    // 재정위원회 현황
    const financeCommittee = createdOrganizations['FC-FI'] || 
      await prisma.organization.findFirst({ where: { code: 'FC-FI' } })
    
    if (financeCommittee) {
      const financeDepts = await prisma.organization.count({
        where: {
          parentId: financeCommittee.id,
          level: 'LEVEL_2'
        }
      })
      console.log(`   💰 재정위원회 (FC-FI): ${financeDepts}개 부서`)
    }

    // 감사위원회 현황
    const auditCommittee = createdOrganizations['AC-AU'] || 
      await prisma.organization.findFirst({ where: { code: 'AC-AU' } })
    
    if (auditCommittee) {
      const auditDepts = await prisma.organization.count({
        where: {
          parentId: auditCommittee.id,
          level: 'LEVEL_2'
        }
      })
      console.log(`   🔍 감사위원회 (AC-AU): ${auditDepts}개 부서`)
    }

    // 차량관리위원회 현황
    const vehicleCommittee = createdOrganizations['MC-VM'] || 
      await prisma.organization.findFirst({ where: { code: 'MC-VM' } })
    
    if (vehicleCommittee) {
      const vehicleDepts = await prisma.organization.count({
        where: {
          parentId: vehicleCommittee.id,
          level: 'LEVEL_2'
        }
      })
      console.log(`   🚗 차량관리위원회 (MC-VM): ${vehicleDepts}개 부서`)
    }

    // 새가족위원회 현황
    const newFamilyCommittee = createdOrganizations['FC-NF'] || 
      await prisma.organization.findFirst({ where: { code: 'FC-NF' } })
    
    if (newFamilyCommittee) {
      console.log(`   👨‍👩‍👧‍👦 새가족위원회 (FC-NF): 단일 위원회`)
    }

    // 11. 위원회별 세부 부서 목록
    console.log('\n📋 Committee Department Details:')
    
    // 재정위원회 부서들
    if (financeCommittee) {
      const financeDepts = await prisma.organization.findMany({
        where: {
          parentId: financeCommittee.id,
          level: 'LEVEL_2'
        },
        orderBy: { sortOrder: 'asc' }
      })

      console.log(`\n💰 재정위원회 - ${financeDepts.length}개 부서:`)
      financeDepts.forEach((dept, index) => {
        const isNew = dept.createdAt > new Date(Date.now() - 30 * 60 * 1000)
        const newFlag = isNew ? ' 🆕' : ''
        
        console.log(`   ${index + 1}. 💰 ${dept.name} (${dept.code})${newFlag}`)
      })
    }

    // 감사위원회 부서들
    if (auditCommittee) {
      const auditDepts = await prisma.organization.findMany({
        where: {
          parentId: auditCommittee.id,
          level: 'LEVEL_2'
        },
        orderBy: { sortOrder: 'asc' }
      })

      console.log(`\n🔍 감사위원회 - ${auditDepts.length}개 부서:`)
      auditDepts.forEach((dept, index) => {
        const isNew = dept.createdAt > new Date(Date.now() - 30 * 60 * 1000)
        const newFlag = isNew ? ' 🆕' : ''
        
        console.log(`   ${index + 1}. 🔍 ${dept.name} (${dept.code})${newFlag}`)
      })
    }

    // 차량관리위원회 부서들
    if (vehicleCommittee) {
      const vehicleDepts = await prisma.organization.findMany({
        where: {
          parentId: vehicleCommittee.id,
          level: 'LEVEL_2'
        },
        orderBy: { sortOrder: 'asc' }
      })

      console.log(`\n🚗 차량관리위원회 - ${vehicleDepts.length}개 부서:`)
      vehicleDepts.forEach((dept, index) => {
        const isNew = dept.createdAt > new Date(Date.now() - 30 * 60 * 1000)
        const newFlag = isNew ? ' 🆕' : ''
        const deptEmoji = dept.name.includes('주차') ? '🅿️' : '🚗'
        
        console.log(`   ${index + 1}. ${deptEmoji} ${dept.name} (${dept.code})${newFlag}`)
      })
    }

    // 12. 새로운 코드 패턴 정리
    console.log('\n🏷️ New Code Patterns Introduced:')
    console.log(`   FC-*: Finance/Family Committees (재정위원회, 새가족위원회)`)
    console.log(`   AC-*: Audit Committee (감사위원회)`)
    console.log(`   MC-VM-*: Vehicle Management under Mission Committee (차량관리위원회)`)

    if (createdCount > 0) {
      console.log('\n🎉 Finance, Audit, Vehicle Management & New Family committees successfully inserted!')
    } else if (skippedCount === additionalCommitteeOrganizations.length) {
      console.log('\n✅ All requested organizations already exist')
    }

    return {
      requested: additionalCommitteeOrganizations.length,
      created: createdCount,
      existing: existingOrganizations.length,
      skipped: skippedCount,
      committees: {
        finance: newOrganizations.filter(o => o.code.startsWith('FC-FI')).length,
        audit: newOrganizations.filter(o => o.code.startsWith('AC-AU')).length,
        vehicle: newOrganizations.filter(o => o.code.startsWith('MC-VM')).length,
        newFamily: newOrganizations.filter(o => o.code.startsWith('FC-NF')).length
      },
      levels: {
        level1: newOrganizations.filter(o => o.level === 'LEVEL_1').length,
        level2: newOrganizations.filter(o => o.level === 'LEVEL_2').length
      }
    }

  } catch (error) {
    console.error('❌ Error inserting Finance, Audit, Vehicle Management & New Family committees:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

insertFinanceAuditVehicleNewfamilyCommittees().catch(console.error)