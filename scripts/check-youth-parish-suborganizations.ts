import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkYouthParishSuborganizations() {
  console.log('👥 Checking Youth Parish (30+교구) sub-organizations...\n')

  try {
    const church = await prisma.church.findFirst()
    if (!church) {
      throw new Error('No church found in database')
    }

    // 청년부(30+교구) 조회
    const youthParish = await prisma.organization.findFirst({
      where: { 
        code: 'PR-30',
        churchId: church.id 
      }
    })

    if (!youthParish) {
      console.log('❌ Youth Parish (PR-30) not found')
      return
    }

    console.log(`✅ Found Youth Parish: ${youthParish.name} (${youthParish.code})`)

    // 모든 청년부 관련 조직들 조회
    const allYouthOrgs = await prisma.organization.findMany({
      where: {
        OR: [
          { id: youthParish.id },
          { parentId: youthParish.id },
          { parent: { parentId: youthParish.id } },
          { parent: { parent: { parentId: youthParish.id } } }
        ]
      },
      include: {
        parent: {
          select: { name: true, code: true }
        }
      },
      orderBy: [
        { level: 'asc' },
        { sortOrder: 'asc' }
      ]
    })

    console.log(`\n📋 All Youth Parish related organizations (${allYouthOrgs.length}개):`)
    console.log('='.repeat(60))

    allYouthOrgs.forEach((org, index) => {
      const levelEmoji = org.level === 'LEVEL_1' ? '📁' : 
                        org.level === 'LEVEL_2' ? '📂' : 
                        org.level === 'LEVEL_3' ? '📄' : '📝'
      
      const parentInfo = org.parent ? ` ← ${org.parent.name}` : ''
      
      console.log(`${index + 1}. ${levelEmoji} ${org.name} (${org.code})`)
      console.log(`   Level: ${org.level}${parentInfo}`)
      console.log(`   Description: ${org.description}`)
      console.log('')
    })

    // 청년부 하위 조직들만 따로 조회 (LEVEL_2 이하)
    const youthSubOrgs = await prisma.organization.findMany({
      where: {
        OR: [
          { parentId: youthParish.id },
          { parent: { parentId: youthParish.id } },
          { parent: { parent: { parentId: youthParish.id } } }
        ]
      },
      include: {
        parent: {
          select: { name: true, code: true }
        }
      },
      orderBy: [
        { level: 'asc' },
        { sortOrder: 'asc' }
      ]
    })

    console.log(`\n📂 Youth Parish Sub-organizations (${youthSubOrgs.length}개):`)
    console.log('='.repeat(40))

    if (youthSubOrgs.length === 0) {
      console.log('❌ No sub-organizations found under Youth Parish')
      console.log('💡 You may need to add sub-organizations like:')
      console.log('   - 청년1부, 청년2부')
      console.log('   - 대학청년부, 직장청년부')
      console.log('   - 청년찬양팀, 청년선교팀 등')
    } else {
      youthSubOrgs.forEach((org, index) => {
        const levelEmoji = org.level === 'LEVEL_2' ? '📂' : 
                          org.level === 'LEVEL_3' ? '📄' : '📝'
        
        console.log(`${index + 1}. ${levelEmoji} ${org.name} (${org.code}) - ${org.level}`)
        console.log(`   Parent: ${org.parent?.name || 'Unknown'}`)
        console.log('')
      })
    }

    // 청년부 직속 하위 조직들 (LEVEL_2)
    const directSubOrgs = await prisma.organization.findMany({
      where: {
        parentId: youthParish.id,
        level: 'LEVEL_2'
      },
      orderBy: { sortOrder: 'asc' }
    })

    console.log(`\n📂 Direct Sub-organizations (LEVEL_2): ${directSubOrgs.length}개`)
    directSubOrgs.forEach((org, index) => {
      console.log(`${index + 1}. ${org.name} (${org.code})`)
    })

    return {
      youthParish,
      totalRelatedOrgs: allYouthOrgs.length,
      subOrganizations: youthSubOrgs.length,
      directSubOrgs: directSubOrgs.length
    }

  } catch (error) {
    console.error('❌ Error checking Youth Parish sub-organizations:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

checkYouthParishSuborganizations().catch(console.error)