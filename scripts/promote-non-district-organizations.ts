import { PrismaClient, OrganizationLevel } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * LEVEL_2 중 '교구'가 들어가지 않는 조직들을 LEVEL_1로 승격하고
 * 그 하위 조직들을 한 단계씩 올리는 스크립트
 */
export async function promoteNonDistrictOrganizations(churchId: string) {
  console.log('🔄 Starting non-district organizations promotion...')

  try {
    await prisma.$transaction(async (tx) => {
      // 1단계: 현재 LEVEL_2 조직들 중 '교구'가 들어가지 않는 조직 찾기
      console.log('📊 Finding LEVEL_2 organizations without "교구" in name...')
      
      const level2Organizations = await tx.organization.findMany({
        where: {
          churchId,
          level: OrganizationLevel.LEVEL_2,
          isActive: true,
          NOT: {
            name: { contains: '교구' }
          }
        },
        include: {
          children: {
            include: {
              children: {
                include: {
                  children: true
                }
              }
            }
          }
        },
        orderBy: { sortOrder: 'asc' }
      })

      console.log(`📋 Found ${level2Organizations.length} LEVEL_2 organizations to promote:`)
      level2Organizations.forEach(org => {
        console.log(`   - ${org.name} (${org.code})`)
      })

      if (level2Organizations.length === 0) {
        console.log('✅ No organizations to promote. Task completed.')
        return
      }

      // 2단계: 각 조직과 그 하위 조직들을 한 단계씩 승격
      for (const org of level2Organizations) {
        console.log(`\n🔧 Processing organization: ${org.name} (${org.code})`)
        
        // 현재 조직을 LEVEL_1로 승격
        await tx.organization.update({
          where: { id: org.id },
          data: {
            level: OrganizationLevel.LEVEL_1,
            parentId: null, // LEVEL_1은 부모가 없음
            sortOrder: await getNextSortOrder(tx, churchId, OrganizationLevel.LEVEL_1)
          }
        })
        console.log(`   ✅ Promoted ${org.name} to LEVEL_1`)

        // 하위 조직들을 재귀적으로 처리
        await promoteChildrenRecursively(tx, org.children, 2)
      }

      // 3단계: 검증
      console.log('\n🔍 Verifying promotion results...')
      const finalStructure = await tx.organization.findMany({
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

      const levelCounts = {
        LEVEL_1: finalStructure.filter(o => o.level === OrganizationLevel.LEVEL_1).length,
        LEVEL_2: finalStructure.filter(o => o.level === OrganizationLevel.LEVEL_2).length,
        LEVEL_3: finalStructure.filter(o => o.level === OrganizationLevel.LEVEL_3).length,
        LEVEL_4: finalStructure.filter(o => o.level === OrganizationLevel.LEVEL_4).length,
      }

      console.log('📊 Final organization structure:')
      console.log(`   LEVEL_1: ${levelCounts.LEVEL_1} organizations`)
      console.log(`   LEVEL_2: ${levelCounts.LEVEL_2} organizations`)
      console.log(`   LEVEL_3: ${levelCounts.LEVEL_3} organizations`)
      console.log(`   LEVEL_4: ${levelCounts.LEVEL_4} organizations`)

      // LEVEL_1 조직들 표시
      const level1Orgs = finalStructure.filter(o => o.level === OrganizationLevel.LEVEL_1)
      console.log('\n🏗️  LEVEL_1 organizations:')
      level1Orgs.forEach(org => {
        console.log(`   - ${org.name} (${org.code})`)
      })
    })

    console.log('✅ Non-district organizations promotion completed successfully!')

  } catch (error) {
    console.error('❌ Error during promotion:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

/**
 * 하위 조직들을 재귀적으로 한 단계씩 승격
 */
async function promoteChildrenRecursively(tx: any, children: any[], targetLevel: number) {
  if (!children || children.length === 0) return

  const levelMap: { [key: number]: OrganizationLevel } = {
    1: OrganizationLevel.LEVEL_1,
    2: OrganizationLevel.LEVEL_2,
    3: OrganizationLevel.LEVEL_3,
    4: OrganizationLevel.LEVEL_4,
  }

  const newLevel = levelMap[targetLevel]
  if (!newLevel) {
    console.log(`   ⚠️  Cannot promote to level ${targetLevel} - maximum level is 4`)
    return
  }

  for (const child of children) {
    await tx.organization.update({
      where: { id: child.id },
      data: {
        level: newLevel
      }
    })
    console.log(`   ✅ Promoted ${child.name} to ${newLevel}`)

    // 재귀적으로 하위 조직들도 처리
    if (child.children && child.children.length > 0) {
      await promoteChildrenRecursively(tx, child.children, targetLevel + 1)
    }
  }
}

/**
 * 특정 레벨에서 다음 sortOrder 값을 계산
 */
async function getNextSortOrder(tx: any, churchId: string, level: OrganizationLevel): Promise<number> {
  const maxSortOrder = await tx.organization.findFirst({
    where: {
      churchId,
      level
    },
    select: { sortOrder: true },
    orderBy: { sortOrder: 'desc' }
  })

  return (maxSortOrder?.sortOrder || 0) + 1
}

// 실행 함수
async function main() {
  const churchId = 'cmeuokvhs0000zotldrrd7748' // 과천교회 ID
  console.log(`🏛️  Using church: 과천교회 (${churchId})`)
  
  if (process.argv.includes('--execute')) {
    console.log('🚀 Executing non-district organizations promotion...')
    await promoteNonDistrictOrganizations(churchId)
  } else {
    console.log('📋 This script will promote non-district organizations:')
    console.log('   1. Find LEVEL_2 organizations without "교구" in their name')
    console.log('   2. Promote them to LEVEL_1 (remove parent relationship)')
    console.log('   3. Promote all their children organizations by one level each')
    console.log('')
    console.log('⚠️  WARNING: This will change your organization hierarchy!')
    console.log('   Make sure you have a database backup before proceeding.')
    console.log('')
    console.log('Run with --execute flag to perform the promotion:')
    console.log('npx tsx scripts/promote-non-district-organizations.ts --execute')
  }
}

if (require.main === module) {
  main().catch(console.error)
}