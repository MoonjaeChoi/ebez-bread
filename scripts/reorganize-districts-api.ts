import { PrismaClient, OrganizationLevel } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    console.log('=== 조직도 재구성 시작 (API 방식) ===')
    
    // 1. 현재 조직 구조 확인
    console.log('\n1. 현재 조직 구조 확인...')
    const allOrganizations = await prisma.organization.findMany({
      orderBy: [
        { level: 'asc' },
        { sortOrder: 'asc' },
        { name: 'asc' }
      ],
      include: {
        parent: {
          select: { name: true, code: true }
        },
        children: {
          select: { id: true, name: true, code: true, level: true }
        }
      }
    })
    
    if (allOrganizations.length === 0) {
      console.log('조직이 없습니다. 먼저 기본 조직을 생성해주세요.')
      return
    }
    
    console.log(`총 ${allOrganizations.length}개 조직 발견`)
    
    // 교회 ID 가져오기 (첫 번째 조직의 교회 ID 사용)
    const churchId = allOrganizations[0].churchId
    console.log(`교회 ID: ${churchId}`)
    
    // 2. '교구' 포함 조직 찾기
    console.log('\n2. "교구" 포함 조직 찾기...')
    const districtOrgs = allOrganizations.filter(org => org.name.includes('교구'))
    console.log(`"교구" 포함 조직: ${districtOrgs.length}개`)
    
    if (districtOrgs.length === 0) {
      console.log('교구 관련 조직이 없습니다.')
      return
    }
    
    districtOrgs.forEach(org => {
      const parentInfo = org.parent ? ` (상위: ${org.parent.name})` : ' (최상위)'
      const childrenInfo = org.children.length > 0 ? ` [하위: ${org.children.length}개]` : ''
      console.log(`  - ${org.level}: ${org.code} - ${org.name}${parentInfo}${childrenInfo}`)
    })
    
    // 3. 이미 '교구'라는 이름의 LEVEL_1 조직이 있는지 확인
    console.log('\n3. 기존 "교구" LEVEL_1 조직 확인...')
    const existingDistrictRoot = allOrganizations.find(org => 
      org.level === OrganizationLevel.LEVEL_1 && org.name === '교구'
    )
    
    let districtRootOrg
    
    if (existingDistrictRoot) {
      console.log(`기존 "교구" LEVEL_1 조직 발견: ${existingDistrictRoot.name} (${existingDistrictRoot.code})`)
      districtRootOrg = existingDistrictRoot
    } else {
      // 4. LEVEL_1에 '교구' 조직 생성
      console.log('\n4. LEVEL_1에 "교구" 조직 생성...')
      
      // 적절한 코드 생성 (기존 코드와 중복되지 않도록)
      const existingCodes = allOrganizations.map(org => org.code)
      let newCode = 'DISTRICT'
      let counter = 1
      while (existingCodes.includes(newCode)) {
        newCode = `DISTRICT_${counter}`
        counter++
      }
      
      // 적절한 sortOrder 설정 (LEVEL_1 중 가장 큰 값 + 1)
      const level1Orgs = allOrganizations.filter(org => org.level === OrganizationLevel.LEVEL_1)
      const maxSortOrder = Math.max(...level1Orgs.map(org => org.sortOrder), 0)
      
      try {
        districtRootOrg = await prisma.organization.create({
          data: {
            code: newCode,
            name: '교구',
            level: OrganizationLevel.LEVEL_1,
            description: '교구 통합 조직',
            sortOrder: maxSortOrder + 1,
            churchId: churchId,
            isActive: true
          }
        })
        
        console.log(`새 "교구" LEVEL_1 조직 생성됨: ${districtRootOrg.name} (${districtRootOrg.code})`)
      } catch (error) {
        console.error('교구 조직 생성 실패:', error)
        return
      }
    }
    
    // 5. 기존 '교구' 포함 조직들을 새 '교구' 하위로 이동
    console.log('\n5. "교구" 포함 조직들을 새 교구 조직 하위로 이동...')
    
    for (const org of districtOrgs) {
      // 자기 자신이면 건너뛰기
      if (org.id === districtRootOrg.id) {
        console.log(`  - 건너뛰기 (자기 자신): ${org.name}`)
        continue
      }
      
      try {
        // 현재 LEVEL_1인 교구 조직들을 LEVEL_2로 변경
        if (org.level === OrganizationLevel.LEVEL_1) {
          console.log(`  - LEVEL_1 → LEVEL_2 이동: ${org.name}`)
          
          await prisma.organization.update({
            where: { id: org.id },
            data: {
              level: OrganizationLevel.LEVEL_2,
              parentId: districtRootOrg.id
            }
          })
          
          // 이 조직의 하위 조직들의 level도 한 단계씩 내려야 함
          await updateChildrenLevels(org.id, OrganizationLevel.LEVEL_3)
        }
        // 현재 LEVEL_2인 교구 조직들을 LEVEL_3으로 변경
        else if (org.level === OrganizationLevel.LEVEL_2) {
          console.log(`  - LEVEL_2 → LEVEL_3 이동: ${org.name}`)
          
          await prisma.organization.update({
            where: { id: org.id },
            data: {
              level: OrganizationLevel.LEVEL_3
            }
          })
          
          // 이 조직의 하위 조직들의 level도 한 단계씩 내려야 함
          await updateChildrenLevels(org.id, OrganizationLevel.LEVEL_4)
        }
        // LEVEL_3, LEVEL_4는 그대로 두거나 필요시 처리
        else {
          console.log(`  - 유지 (${org.level}): ${org.name}`)
        }
      } catch (error) {
        console.error(`조직 ${org.name} 이동 실패:`, error)
      }
    }
    
    console.log('\n=== 조직도 재구성 완료 ===')
    
    // 6. 결과 확인
    console.log('\n6. 재구성 결과 확인...')
    const updatedOrganizations = await prisma.organization.findMany({
      where: {
        OR: [
          { name: '교구' },
          { name: { contains: '교구' } }
        ]
      },
      orderBy: [
        { level: 'asc' },
        { sortOrder: 'asc' },
        { name: 'asc' }
      ],
      include: {
        parent: {
          select: { name: true, code: true }
        },
        children: {
          select: { id: true, name: true, code: true }
        }
      }
    })
    
    console.log('\n재구성 후 교구 관련 조직:')
    updatedOrganizations.forEach(org => {
      const parentInfo = org.parent ? ` (상위: ${org.parent.name})` : ' (최상위)'
      const childrenInfo = org.children.length > 0 ? ` [하위: ${org.children.length}개]` : ''
      console.log(`  - ${org.level}: ${org.code} - ${org.name}${parentInfo}${childrenInfo}`)
    })
    
  } catch (error) {
    console.error('Error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// 하위 조직들의 레벨을 재귀적으로 업데이트하는 함수
async function updateChildrenLevels(parentId: string, newLevel: OrganizationLevel) {
  const children = await prisma.organization.findMany({
    where: { parentId: parentId },
    select: { id: true, name: true, level: true }
  })
  
  const levelMap = {
    [OrganizationLevel.LEVEL_1]: 1,
    [OrganizationLevel.LEVEL_2]: 2,
    [OrganizationLevel.LEVEL_3]: 3,
    [OrganizationLevel.LEVEL_4]: 4
  }
  
  const reverseLevelMap = {
    1: OrganizationLevel.LEVEL_1,
    2: OrganizationLevel.LEVEL_2,
    3: OrganizationLevel.LEVEL_3,
    4: OrganizationLevel.LEVEL_4
  }
  
  for (const child of children) {
    const currentLevelNum = levelMap[child.level]
    const newLevelNum = levelMap[newLevel]
    
    if (currentLevelNum && newLevelNum && newLevelNum <= 4) {
      console.log(`    - 하위 조직 ${child.level} → ${newLevel}: ${child.name}`)
      
      try {
        await prisma.organization.update({
          where: { id: child.id },
          data: { level: newLevel }
        })
        
        // 재귀적으로 하위의 하위 조직도 업데이트
        const nextLevelNum = newLevelNum + 1
        if (nextLevelNum <= 4) {
          const nextLevel = reverseLevelMap[nextLevelNum as keyof typeof reverseLevelMap]
          if (nextLevel) {
            await updateChildrenLevels(child.id, nextLevel)
          }
        }
      } catch (error) {
        console.error(`하위 조직 ${child.name} 업데이트 실패:`, error)
      }
    }
  }
}

// 스크립트 실행
main().catch(console.error)