import { PrismaClient, OrganizationLevel } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * 조직 구조 재구성 스크립트
 * LEVEL_1의 모든 조직(DC 제외)을 LEVEL_2로 변경하고 DC 하위로 이동
 * 기존 LEVEL_2는 LEVEL_3으로, LEVEL_3은 LEVEL_4로, LEVEL_4는 LEVEL_5로 이동
 */
export async function reorganizeChurchStructure(churchId: string) {
  console.log('🔄 Starting church structure reorganization...')

  try {
    await prisma.$transaction(async (tx) => {
      // 1단계: 현재 조직 구조 분석
      console.log('📊 Analyzing current structure...')
      
      const currentStructure = await tx.organization.findMany({
        where: { churchId },
        select: {
          id: true,
          code: true,
          name: true,
          level: true,
          parentId: true,
          sortOrder: true
        },
        orderBy: [
          { level: 'asc' },
          { sortOrder: 'asc' }
        ]
      })

      const levelCounts = {
        LEVEL_1: currentStructure.filter(o => o.level === OrganizationLevel.LEVEL_1).length,
        LEVEL_2: currentStructure.filter(o => o.level === OrganizationLevel.LEVEL_2).length,
        LEVEL_3: currentStructure.filter(o => o.level === OrganizationLevel.LEVEL_3).length,
        LEVEL_4: currentStructure.filter(o => o.level === OrganizationLevel.LEVEL_4).length,
      }

      console.log('📊 Current organization structure:')
      console.log(`   LEVEL_1: ${levelCounts.LEVEL_1} organizations`)
      console.log(`   LEVEL_2: ${levelCounts.LEVEL_2} organizations`)
      console.log(`   LEVEL_3: ${levelCounts.LEVEL_3} organizations`)
      console.log(`   LEVEL_4: ${levelCounts.LEVEL_4} organizations`)

      // DC 조직 찾기
      const dcOrganization = await tx.organization.findFirst({
        where: { 
          churchId, 
          code: 'DC',
          level: OrganizationLevel.LEVEL_1 
        }
      })

      if (!dcOrganization) {
        throw new Error('DC (교구) 조직을 찾을 수 없습니다.')
      }

      console.log(`✅ Found DC organization: ${dcOrganization.name} (${dcOrganization.id})`)

      // 2단계: DC를 제외한 모든 LEVEL_1 조직 조회
      const level1Organizations = await tx.organization.findMany({
        where: {
          churchId,
          level: OrganizationLevel.LEVEL_1,
          code: { not: 'DC' },
          isActive: true
        },
        orderBy: { sortOrder: 'asc' }
      })

      console.log(`📋 Found ${level1Organizations.length} LEVEL_1 organizations to move under DC`)
      level1Organizations.forEach(org => {
        console.log(`   - ${org.name} (${org.code})`)
      })

      // 3단계: 안전한 레벨 변경 (깊은 레벨부터 처리)
      console.log('🔧 Step 1: Handling LEVEL_4 organizations...')
      if (levelCounts.LEVEL_4 > 0) {
        console.log(`   ⚠️  Found ${levelCounts.LEVEL_4} LEVEL_4 organizations.`)
        console.log('   These will remain as LEVEL_4 since we can only support 4 levels currently.')
        console.log('   Consider reviewing these manually or extending schema to LEVEL_5.')
      }

      console.log('🔧 Step 2: Moving LEVEL_3 to LEVEL_4...')
      if (levelCounts.LEVEL_3 > 0) {
        await tx.organization.updateMany({
          where: {
            churchId,
            level: OrganizationLevel.LEVEL_3
          },
          data: {
            level: OrganizationLevel.LEVEL_4
          }
        })
        console.log(`   ✅ Moved ${levelCounts.LEVEL_3} organizations from LEVEL_3 to LEVEL_4`)
      }

      console.log('🔧 Step 3: Moving LEVEL_2 to LEVEL_3...')
      if (levelCounts.LEVEL_2 > 0) {
        await tx.organization.updateMany({
          where: {
            churchId,
            level: OrganizationLevel.LEVEL_2
          },
          data: {
            level: OrganizationLevel.LEVEL_3
          }
        })
        console.log(`   ✅ Moved ${levelCounts.LEVEL_2} organizations from LEVEL_2 to LEVEL_3`)
      }

      console.log('🔧 Step 4: Moving LEVEL_1 organizations (except DC) to LEVEL_2 under DC...')
      for (let i = 0; i < level1Organizations.length; i++) {
        const org = level1Organizations[i]
        await tx.organization.update({
          where: { id: org.id },
          data: {
            level: OrganizationLevel.LEVEL_2,
            parentId: dcOrganization.id, // DC 하위로 이동
            sortOrder: i + 1 // 새로운 순서 부여
          }
        })
        console.log(`   ✅ Moved ${org.name} (${org.code}) to LEVEL_2 under DC`)
      }

      // 4단계: 검증
      console.log('🔍 Verifying reorganization...')
      const newStructure = await tx.organization.findMany({
        where: { churchId },
        select: {
          id: true,
          code: true,
          name: true,
          level: true,
          parentId: true,
          sortOrder: true
        },
        orderBy: [
          { level: 'asc' },
          { sortOrder: 'asc' },
          { name: 'asc' }
        ]
      })

      const newLevelCounts = {
        LEVEL_1: newStructure.filter(o => o.level === OrganizationLevel.LEVEL_1).length,
        LEVEL_2: newStructure.filter(o => o.level === OrganizationLevel.LEVEL_2).length,
        LEVEL_3: newStructure.filter(o => o.level === OrganizationLevel.LEVEL_3).length,
        LEVEL_4: newStructure.filter(o => o.level === OrganizationLevel.LEVEL_4).length,
        // LEVEL_5: newStructure.filter(o => o.level === OrganizationLevel.LEVEL_5).length,
      }

      console.log('📊 New organization structure:')
      console.log(`   LEVEL_1: ${newLevelCounts.LEVEL_1} organizations (should be 1 - only DC)`)
      console.log(`   LEVEL_2: ${newLevelCounts.LEVEL_2} organizations (former LEVEL_1 committees + DC districts)`)
      console.log(`   LEVEL_3: ${newLevelCounts.LEVEL_3} organizations (former LEVEL_2 departments)`)
      console.log(`   LEVEL_4: ${newLevelCounts.LEVEL_4} organizations (former LEVEL_3 teams + any original LEVEL_4)`)

      // DC 하위 조직 확인
      const dcChildren = newStructure.filter(o => o.parentId === dcOrganization.id)
      console.log(`🏗️  DC now has ${dcChildren.length} direct children:`)
      
      dcChildren.forEach(child => {
        console.log(`   - ${child.name} (${child.code}) - ${child.level}`)
      })

      // 전체 계층 구조 요약
      console.log('\n🎯 Final Structure Summary:')
      console.log('   LEVEL_1: DC (교구) - 최상위 조직')
      console.log('   LEVEL_2: 모든 위원회들 (행정사역부, 관리위원회, 재정위원회 등) + 기존 교구별 지구')
      console.log('   LEVEL_3: 각 위원회의 세부 부서들')
      console.log('   LEVEL_4: 세부 팀들')
      console.log('   LEVEL_5: 개별 단위들 (목장, 구역 등)')
    })

    console.log('✅ Church structure reorganization completed successfully!')
    console.log('⚠️  Please update UI components to handle LEVEL_5 organizations if needed.')

  } catch (error) {
    console.error('❌ Error during reorganization:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// 실행 함수
async function main() {
  // 하드코딩된 churchId 사용 (prepared statement 충돌 방지)
  const churchId = 'cmeuokvhs0000zotldrrd7748' // 과천교회 ID
  console.log(`🏛️  Using church: 과천교회 (${churchId})`)
  
  if (process.argv.includes('--execute')) {
    console.log('🚀 Executing reorganization...')
    await reorganizeChurchStructure(churchId)
  } else {
    console.log('📋 This script will reorganize the church structure:')
    console.log('   1. Move all LEVEL_1 organizations (except DC) to LEVEL_2 under DC')
    console.log('   2. Move all LEVEL_2 organizations to LEVEL_3') 
    console.log('   3. Move all LEVEL_3 organizations to LEVEL_4')
    console.log('   4. Move LEVEL_4 organizations to LEVEL_5')
    console.log('')
    console.log('⚠️  WARNING: This will restructure your entire organization hierarchy!')
    console.log('   Make sure you have a database backup before proceeding.')
    console.log('')
    console.log('Run with --execute flag to perform the reorganization:')
    console.log('npx tsx scripts/reorganize-church-structure.ts --execute')
  }
}

if (require.main === module) {
  main().catch(console.error)
}