import { PrismaClient, OrganizationLevel } from '@prisma/client'

const prisma = new PrismaClient()

async function insertFamilyFoundationCounselingYouthCenters() {
  console.log('🏛️ Inserting New Family Department, Foundation, Counseling & Youth Centers with 김은혜 as creator...')

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

    // 3. 새가족부, 하늘행복장학회, 상담센터, 청소년센터 조직 데이터
    const additionalOrganizations = [
      // 새가족위원회 하위 부서 (LEVEL_2)
      {
        name: '새가족부',
        englishName: 'New Family Committee New Family Department',
        code: 'FC-NF-NF',
        description: '새가족위원회의 새가족을 담당하는 부서입니다. LEVEL_2 부서입니다.',
        level: OrganizationLevel.LEVEL_2,
        parentCode: 'FC-NF'
      },

      // 하늘행복장학회 (LEVEL_1)
      {
        name: '하늘행복장학회',
        englishName: 'Heaven\'s Happiness Scholarship Foundation',
        code: 'SF-HH',
        description: '장학 사업을 위한 재단입니다. LEVEL_1 조직입니다.',
        level: OrganizationLevel.LEVEL_1,
        parentCode: null
      },

      // 하늘행복장학회 하위 부서 (LEVEL_2)
      {
        name: '장학부',
        englishName: 'Heaven\'s Happiness Scholarship Foundation Scholarship Department',
        code: 'SF-HH-SD',
        description: '하늘행복장학회의 장학 사업을 담당하는 부서입니다. LEVEL_2 부서입니다.',
        level: OrganizationLevel.LEVEL_2,
        parentCode: 'SF-HH'
      },

      // 시냇가 상담센터 (LEVEL_1)
      {
        name: '시냇가 상담센터',
        englishName: 'Brookside Counseling Center',
        code: 'CC-BC',
        description: '상담 서비스를 제공하는 센터입니다. LEVEL_1 조직입니다.',
        level: OrganizationLevel.LEVEL_1,
        parentCode: null
      },

      // 시냇가 상담센터 하위 조직들 (LEVEL_2)
      {
        name: '운영위원',
        englishName: 'Brookside Counseling Center Steering Committee',
        code: 'CC-BC-SC',
        description: '시냇가 상담센터의 운영을 위한 위원입니다. LEVEL_2 부서입니다.',
        level: OrganizationLevel.LEVEL_2,
        parentCode: 'CC-BC'
      },
      {
        name: '센터장',
        englishName: 'Brookside Counseling Center Director',
        code: 'CC-BC-DR',
        description: '시냇가 상담센터의 센터장입니다. LEVEL_2 부서입니다.',
        level: OrganizationLevel.LEVEL_2,
        parentCode: 'CC-BC'
      },
      {
        name: '총괄팀장',
        englishName: 'Brookside Counseling Center General Team Leader',
        code: 'CC-BC-GT',
        description: '시냇가 상담센터의 총괄 팀장입니다. LEVEL_2 부서입니다.',
        level: OrganizationLevel.LEVEL_2,
        parentCode: 'CC-BC'
      },
      {
        name: '사무간사',
        englishName: 'Brookside Counseling Center Office Secretary',
        code: 'CC-BC-OS',
        description: '시냇가 상담센터의 사무 간사입니다. LEVEL_2 부서입니다.',
        level: OrganizationLevel.LEVEL_2,
        parentCode: 'CC-BC'
      },

      // 시냇가 청소년센터 (LEVEL_1)
      {
        name: '시냇가 청소년센터',
        englishName: 'Brookside Youth Center',
        code: 'YC-BY',
        description: '청소년을 위한 센터입니다. LEVEL_1 조직입니다.',
        level: OrganizationLevel.LEVEL_1,
        parentCode: null
      },

      // 시냇가 청소년센터 하위 조직들 (LEVEL_2)
      {
        name: '운영위원',
        englishName: 'Brookside Youth Center Steering Committee',
        code: 'YC-BY-SC',
        description: '시냇가 청소년센터의 운영을 위한 위원입니다. LEVEL_2 부서입니다.',
        level: OrganizationLevel.LEVEL_2,
        parentCode: 'YC-BY'
      },
      {
        name: '지도교역자',
        englishName: 'Brookside Youth Center Supervising Pastor',
        code: 'YC-BY-SP',
        description: '시냇가 청소년센터의 지도 교역자입니다. LEVEL_2 부서입니다.',
        level: OrganizationLevel.LEVEL_2,
        parentCode: 'YC-BY'
      },
      {
        name: '총괄팀장',
        englishName: 'Brookside Youth Center General Team Leader',
        code: 'YC-BY-GT',
        description: '시냇가 청소년센터의 총괄 팀장입니다. LEVEL_2 부서입니다.',
        level: OrganizationLevel.LEVEL_2,
        parentCode: 'YC-BY'
      }
    ]

    // 4. 기존 조직 확인 (중복 방지)
    console.log('\n🔍 Checking for existing organizations and code conflicts...')
    
    const proposedCodes = additionalOrganizations.map(org => org.code)
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
    const newOrganizations = additionalOrganizations.filter(org => !existingCodesSet.has(org.code))

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
    console.log('\n🏗️  Creating Family, Foundation, Counseling & Youth Centers...')
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
        
        // 조직별 이모지
        const organizationEmoji = orgData.code.includes('FC-NF') ? '👨‍👩‍👧‍👦' : // 새가족
                                  orgData.code.includes('SF-HH') ? '🎓' : // 장학회
                                  orgData.code.includes('CC-BC') ? 
                                    (orgData.name.includes('센터장') ? '👨‍💼' :
                                     orgData.name.includes('운영위원') ? '👥' :
                                     orgData.name.includes('총괄') ? '👨‍💻' :
                                     orgData.name.includes('사무') ? '📋' : '💬') : // 상담센터
                                  orgData.code.includes('YC-BY') ? 
                                    (orgData.name.includes('지도교역자') ? '👨‍🏫' :
                                     orgData.name.includes('운영위원') ? '👥' :
                                     orgData.name.includes('총괄') ? '👨‍💻' : '👦') : '📋' // 청소년센터
        
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

    // 9. 업데이트된 조직 현황
    console.log(`\n📊 Family, Foundation, Counseling & Youth Centers Creation Summary:`)
    console.log(`   New organizations requested: ${additionalOrganizations.length}`)
    console.log(`   Already existing: ${existingOrganizations.length}`)
    console.log(`   Successfully created: ${createdCount}`)
    console.log(`   Skipped (conflicts/errors): ${skippedCount}`)

    // 10. 각 조직별 구성 현황
    console.log('\n🏛️ Organization Structure Overview:')
    
    // 새가족위원회 현황 (업데이트된)
    const newFamilyCommittee = await prisma.organization.findFirst({ where: { code: 'FC-NF' } })
    
    if (newFamilyCommittee) {
      const newFamilyDepts = await prisma.organization.count({
        where: {
          parentId: newFamilyCommittee.id,
          level: 'LEVEL_2'
        }
      })
      console.log(`   👨‍👩‍👧‍👦 새가족위원회 (FC-NF): ${newFamilyDepts}개 부서`)
    }

    // 하늘행복장학회 현황
    const scholarshipFoundation = createdOrganizations['SF-HH'] || 
      await prisma.organization.findFirst({ where: { code: 'SF-HH' } })
    
    if (scholarshipFoundation) {
      const scholarshipDepts = await prisma.organization.count({
        where: {
          parentId: scholarshipFoundation.id,
          level: 'LEVEL_2'
        }
      })
      console.log(`   🎓 하늘행복장학회 (SF-HH): ${scholarshipDepts}개 부서`)
    }

    // 시냇가 상담센터 현황
    const counselingCenter = createdOrganizations['CC-BC'] || 
      await prisma.organization.findFirst({ where: { code: 'CC-BC' } })
    
    if (counselingCenter) {
      const counselingDepts = await prisma.organization.count({
        where: {
          parentId: counselingCenter.id,
          level: 'LEVEL_2'
        }
      })
      console.log(`   💬 시냇가 상담센터 (CC-BC): ${counselingDepts}개 조직`)
    }

    // 시냇가 청소년센터 현황
    const youthCenter = createdOrganizations['YC-BY'] || 
      await prisma.organization.findFirst({ where: { code: 'YC-BY' } })
    
    if (youthCenter) {
      const youthDepts = await prisma.organization.count({
        where: {
          parentId: youthCenter.id,
          level: 'LEVEL_2'
        }
      })
      console.log(`   👦 시냇가 청소년센터 (YC-BY): ${youthDepts}개 조직`)
    }

    // 11. 조직별 세부 구성원 목록
    console.log('\n📋 Organization Details:')
    
    // 새가족위원회 부서들 (업데이트된)
    if (newFamilyCommittee) {
      const newFamilyDepts = await prisma.organization.findMany({
        where: {
          parentId: newFamilyCommittee.id,
          level: 'LEVEL_2'
        },
        orderBy: { sortOrder: 'asc' }
      })

      console.log(`\n👨‍👩‍👧‍👦 새가족위원회 - ${newFamilyDepts.length}개 부서:`)
      newFamilyDepts.forEach((dept, index) => {
        const isNew = dept.createdAt > new Date(Date.now() - 30 * 60 * 1000)
        const newFlag = isNew ? ' 🆕' : ''
        
        console.log(`   ${index + 1}. 👨‍👩‍👧‍👦 ${dept.name} (${dept.code})${newFlag}`)
      })
    }

    // 하늘행복장학회 부서들
    if (scholarshipFoundation) {
      const scholarshipDepts = await prisma.organization.findMany({
        where: {
          parentId: scholarshipFoundation.id,
          level: 'LEVEL_2'
        },
        orderBy: { sortOrder: 'asc' }
      })

      console.log(`\n🎓 하늘행복장학회 - ${scholarshipDepts.length}개 부서:`)
      scholarshipDepts.forEach((dept, index) => {
        const isNew = dept.createdAt > new Date(Date.now() - 30 * 60 * 1000)
        const newFlag = isNew ? ' 🆕' : ''
        
        console.log(`   ${index + 1}. 🎓 ${dept.name} (${dept.code})${newFlag}`)
      })
    }

    // 시냇가 상담센터 조직들
    if (counselingCenter) {
      const counselingDepts = await prisma.organization.findMany({
        where: {
          parentId: counselingCenter.id,
          level: 'LEVEL_2'
        },
        orderBy: { sortOrder: 'asc' }
      })

      console.log(`\n💬 시냇가 상담센터 - ${counselingDepts.length}개 조직:`)
      counselingDepts.forEach((dept, index) => {
        const isNew = dept.createdAt > new Date(Date.now() - 30 * 60 * 1000)
        const newFlag = isNew ? ' 🆕' : ''
        const deptEmoji = dept.name.includes('센터장') ? '👨‍💼' :
                         dept.name.includes('운영위원') ? '👥' :
                         dept.name.includes('총괄') ? '👨‍💻' :
                         dept.name.includes('사무') ? '📋' : '💬'
        
        console.log(`   ${index + 1}. ${deptEmoji} ${dept.name} (${dept.code})${newFlag}`)
      })
    }

    // 시냇가 청소년센터 조직들
    if (youthCenter) {
      const youthDepts = await prisma.organization.findMany({
        where: {
          parentId: youthCenter.id,
          level: 'LEVEL_2'
        },
        orderBy: { sortOrder: 'asc' }
      })

      console.log(`\n👦 시냇가 청소년센터 - ${youthDepts.length}개 조직:`)
      youthDepts.forEach((dept, index) => {
        const isNew = dept.createdAt > new Date(Date.now() - 30 * 60 * 1000)
        const newFlag = isNew ? ' 🆕' : ''
        const deptEmoji = dept.name.includes('지도교역자') ? '👨‍🏫' :
                         dept.name.includes('운영위원') ? '👥' :
                         dept.name.includes('총괄') ? '👨‍💻' : '👦'
        
        console.log(`   ${index + 1}. ${deptEmoji} ${dept.name} (${dept.code})${newFlag}`)
      })
    }

    // 12. 새로운 코드 패턴 정리
    console.log('\n🏷️ New Code Patterns Introduced:')
    console.log(`   SF-*: Scholarship Foundation (하늘행복장학회)`)
    console.log(`   CC-BC-*: Brookside Counseling Center (시냇가 상담센터)`)
    console.log(`   YC-BY-*: Brookside Youth Center (시냇가 청소년센터)`)

    if (createdCount > 0) {
      console.log('\n🎉 Family, Foundation, Counseling & Youth Centers successfully inserted!')
    } else if (skippedCount === additionalOrganizations.length) {
      console.log('\n✅ All requested organizations already exist')
    }

    return {
      requested: additionalOrganizations.length,
      created: createdCount,
      existing: existingOrganizations.length,
      skipped: skippedCount,
      organizations: {
        newFamily: newOrganizations.filter(o => o.code.startsWith('FC-NF')).length,
        scholarship: newOrganizations.filter(o => o.code.startsWith('SF-HH')).length,
        counseling: newOrganizations.filter(o => o.code.startsWith('CC-BC')).length,
        youth: newOrganizations.filter(o => o.code.startsWith('YC-BY')).length
      },
      levels: {
        level1: newOrganizations.filter(o => o.level === 'LEVEL_1').length,
        level2: newOrganizations.filter(o => o.level === 'LEVEL_2').length
      }
    }

  } catch (error) {
    console.error('❌ Error inserting Family, Foundation, Counseling & Youth Centers:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

insertFamilyFoundationCounselingYouthCenters().catch(console.error)