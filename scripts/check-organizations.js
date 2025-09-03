const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  try {
    console.log('=== 현재 조직 구조 ===')
    
    // 모든 조직 조회
    const organizations = await prisma.organization.findMany({
      orderBy: [
        { level: 'asc' },
        { sortOrder: 'asc' },
        { name: 'asc' }
      ],
      select: {
        id: true,
        code: true,
        name: true,
        level: true,
        parentId: true,
        sortOrder: true,
        isActive: true,
        parent: {
          select: {
            name: true,
            code: true
          }
        }
      }
    })
    
    console.log('\n총 조직 수:', organizations.length)
    
    // 레벨별 조직 출력
    const levels = ['LEVEL_1', 'LEVEL_2', 'LEVEL_3', 'LEVEL_4']
    
    for (const level of levels) {
      const orgsAtLevel = organizations.filter(org => org.level === level)
      if (orgsAtLevel.length > 0) {
        console.log(`\n=== ${level} 조직 (${orgsAtLevel.length}개) ===`)
        
        orgsAtLevel.forEach(org => {
          const parentInfo = org.parent ? ` (상위: ${org.parent.name})` : ''
          const statusInfo = org.isActive ? '' : ' [비활성]'
          console.log(`  ${org.code} - ${org.name}${parentInfo}${statusInfo}`)
        })
      }
    }
    
    // '교구' 포함 조직 찾기
    console.log('\n=== "교구" 포함 조직 ===')
    const districtOrgs = organizations.filter(org => org.name.includes('교구'))
    
    if (districtOrgs.length > 0) {
      districtOrgs.forEach(org => {
        const parentInfo = org.parent ? ` (상위: ${org.parent.name})` : ''
        console.log(`  ${org.level}: ${org.code} - ${org.name}${parentInfo}`)
      })
    } else {
      console.log('  "교구" 포함 조직 없음')
    }
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()