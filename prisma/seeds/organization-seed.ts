import { PrismaClient, OrganizationLevel } from '@prisma/client'

const prisma = new PrismaClient()

export async function seedOrganizations(churchId: string) {
  console.log('🏢 Seeding organization structure...')

  try {
    // 1단계: 위원회 생성
    const committees = [
      { code: 'PW', name: '예배찬양위원회', description: '예배와 찬양 관련 업무' },
      { code: 'ED', name: '교육위원회', description: '교육 프로그램 관련 업무' },
      { code: 'MI', name: '선교위원회', description: '선교 사업 관련 업무' },
      { code: 'WF', name: '복지위원회', description: '복지 및 구제 업무' },
      { code: 'AD', name: '행정위원회', description: '행정 및 관리 업무' },
    ]

    const createdCommittees: any[] = []
    for (const committee of committees) {
      const created: any = await prisma.organization.create({
        data: {
          code: committee.code,
          name: committee.name,
          description: committee.description,
          level: OrganizationLevel.LEVEL_1,
          churchId,
          sortOrder: createdCommittees.length + 1,
        },
      })
      createdCommittees.push(created)
      console.log(`✅ Created committee: ${committee.name} (${committee.code})`)
    }

    // 2단계: 부서 생성 (예배찬양위원회 하위)
    const praiseCommittee = createdCommittees.find(c => c.code === 'PW')
    if (praiseCommittee) {
      const departments = [
        { code: 'PW-C1', name: '찬양1부', description: '1부 예배 찬양팀' },
        { code: 'PW-C2', name: '찬양2부', description: '2부 예배 찬양팀' },
        { code: 'PW-YC', name: '청년찬양부', description: '청년 예배 찬양팀' },
        { code: 'PW-US', name: '어셔부', description: '예배 안내 및 질서 유지' },
      ]

      const createdDepartments: any[] = []
      for (const dept of departments) {
        const created: any = await prisma.organization.create({
          data: {
            code: dept.code,
            name: dept.name,
            description: dept.description,
            level: OrganizationLevel.LEVEL_2,
            parentId: praiseCommittee.id,
            churchId,
            sortOrder: createdDepartments.length + 1,
          },
        })
        createdDepartments.push(created)
        console.log(`✅ Created department: ${dept.name} (${dept.code})`)
      }

      // 3단계: 팀 생성 (찬양1부 하위)
      const praise1Dept = createdDepartments.find(d => d.code === 'PW-C1')
      if (praise1Dept) {
        const teams = [
          { code: 'PW-C1-HO', name: '호산나찬양대', description: '메인 찬양팀' },
          { code: 'PW-C1-AL', name: '알렐루야찬양대', description: '서브 찬양팀' },
          { code: 'PW-C1-GO', name: '복음성가대', description: '복음성가 전문팀' },
        ]

        const createdTeams: any[] = []
        for (const team of teams) {
          const created: any = await prisma.organization.create({
            data: {
              code: team.code,
              name: team.name,
              description: team.description,
              level: OrganizationLevel.LEVEL_3,
              parentId: praise1Dept.id,
              churchId,
              sortOrder: createdTeams.length + 1,
            },
          })
          createdTeams.push(created)
          console.log(`✅ Created team: ${team.name} (${team.code})`)
        }

        // 4단계: 세부조직 생성 (호산나찬양대 하위)
        const hosannaTeam = createdTeams.find(t => t.code === 'PW-C1-HO')
        if (hosannaTeam) {
          const subOrganizations = [
            { code: 'PW-C1-HO-OR', name: '오케스트라팀', description: '관악기 및 현악기 연주팀' },
            { code: 'PW-C1-HO-DR', name: '드럼팀', description: '타악기 연주팀' },
            { code: 'PW-C1-HO-PI', name: '피아노팀', description: '건반 연주팀' },
            { code: 'PW-C1-HO-VO', name: '보컬팀', description: '보컬 리더 팀' },
          ]

          for (const subOrg of subOrganizations) {
            await prisma.organization.create({
              data: {
                code: subOrg.code,
                name: subOrg.name,
                description: subOrg.description,
                level: OrganizationLevel.LEVEL_4,
                parentId: hosannaTeam.id,
                churchId,
                sortOrder: subOrganizations.indexOf(subOrg) + 1,
              },
            })
            console.log(`✅ Created sub-organization: ${subOrg.name} (${subOrg.code})`)
          }
        }
      }
    }

    // 교육위원회 하위 조직 예시
    const educationCommittee = createdCommittees.find(c => c.code === 'ED')
    if (educationCommittee) {
      const educationDepts = [
        { code: 'ED-SS', name: '주일학교부', description: '주일학교 교육' },
        { code: 'ED-YO', name: '청년부', description: '청년 교육 및 모임' },
        { code: 'ED-AD', name: '성인부', description: '성인 교육 프로그램' },
      ]

      for (const dept of educationDepts) {
        await prisma.organization.create({
          data: {
            code: dept.code,
            name: dept.name,
            description: dept.description,
            level: OrganizationLevel.LEVEL_2,
            parentId: educationCommittee.id,
            churchId,
            sortOrder: educationDepts.indexOf(dept) + 1,
          },
        })
        console.log(`✅ Created education department: ${dept.name} (${dept.code})`)
      }
    }

    console.log('🏢 Organization structure seeding completed!')

  } catch (error) {
    console.error('❌ Error seeding organizations:', error)
    throw error
  }
}

// 조직구조 조회 헬퍼 함수들
export async function getOrganizationHierarchy(churchId: string) {
  return await prisma.organization.findMany({
    where: { 
      churchId,
      isActive: true 
    },
    include: {
      parent: true,
      children: {
        include: {
          children: {
            include: {
              children: true
            }
          }
        }
      },
      _count: {
        select: {
          budgets: true,
          budgetItems: true,
          expenseReports: true,
          responsibleUsers: true,
          organizationMemberships: true,
        }
      }
    },
    orderBy: [
      { level: 'asc' },
      { sortOrder: 'asc' },
      { name: 'asc' }
    ]
  })
}

export async function getOrganizationPath(organizationId: string): Promise<string[]> {
  const path: string[] = []
  let currentOrg = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: { parent: true }
  })

  while (currentOrg) {
    path.unshift(currentOrg.name)
    if (currentOrg.parentId) {
      currentOrg = await prisma.organization.findUnique({
        where: { id: currentOrg.parentId },
        include: { parent: true }
      })
    } else {
      break
    }
  }

  return path
}

export async function generateOrganizationCode(
  churchId: string,
  parentId?: string,
  baseName?: string
): Promise<string> {
  if (!parentId) {
    // 1단계 조직 코드 생성 (2자리 약어)
    const name = baseName || 'NEW'
    return name.toUpperCase().substring(0, 2)
  }

  const parent = await prisma.organization.findUnique({
    where: { id: parentId }
  })

  if (!parent) {
    throw new Error('Parent organization not found')
  }

  // 기존 하위 조직 개수 확인
  const siblingCount = await prisma.organization.count({
    where: {
      churchId,
      parentId,
      isActive: true
    }
  })

  // 부모 코드 + 순번으로 코드 생성
  const suffix = (siblingCount + 1).toString().padStart(2, '0')
  return `${parent.code}-${suffix}`
}