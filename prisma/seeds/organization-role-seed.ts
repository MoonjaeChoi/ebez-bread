import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function seedOrganizationRoles(churchId: string) {
  console.log('🎭 Seeding organization roles...')

  try {
    // 조직 직책 정의 - 레벨과 리더십 여부에 따라 분류
    const roles = [
      // 최고위급 리더십 직책 (Level 90-100)
      { name: '회장', englishName: 'Chairman', level: 100, isLeadership: true, description: '조직의 최고 책임자' },
      { name: '위원장', englishName: 'Committee Chair', level: 95, isLeadership: true, description: '위원회 책임자' },
      { name: '부위원장', englishName: 'Vice Chair', level: 90, isLeadership: true, description: '위원장 보좌' },
      
      // 고위급 리더십 직책 (Level 70-89)
      { name: '부장', englishName: 'Director', level: 85, isLeadership: true, description: '부서 책임자' },
      { name: '차장', englishName: 'Deputy Director', level: 80, isLeadership: true, description: '부장 보좌' },
      { name: '교구목사', englishName: 'District Pastor', level: 75, isLeadership: true, description: '교구 담당 목회자' },
      { name: '단장', englishName: 'Leader', level: 70, isLeadership: true, description: '단체 책임자' },
      
      // 중급 리더십 직책 (Level 50-69)
      { name: '교구장', englishName: 'District Head', level: 65, isLeadership: true, description: '교구 담당자' },
      { name: '부교구장', englishName: 'Deputy District Head', level: 60, isLeadership: true, description: '교구장 보좌' },
      { name: '구역장', englishName: 'Zone Leader', level: 55, isLeadership: true, description: '구역 담당자' },
      { name: '부구역장', englishName: 'Deputy Zone Leader', level: 50, isLeadership: true, description: '구역장 보좌' },
      { name: '리더', englishName: 'Team Leader', level: 50, isLeadership: true, description: '팀 리더' },
      
      // 관리직 (Level 40-49)
      { name: '총무', englishName: 'General Manager', level: 45, isLeadership: false, description: '총무 업무 담당' },
      { name: '부총무', englishName: 'Deputy General Manager', level: 40, isLeadership: false, description: '총무 보좌' },
      { name: '서기', englishName: 'Secretary', level: 40, isLeadership: false, description: '회의록 및 문서 관리' },
      { name: '부서기', englishName: 'Deputy Secretary', level: 35, isLeadership: false, description: '서기 보좌' },
      
      // 재정 관리직 (Level 30-39)
      { name: '회계', englishName: 'Treasurer', level: 35, isLeadership: false, description: '재정 관리 담당' },
      { name: '부회계', englishName: 'Deputy Treasurer', level: 30, isLeadership: false, description: '회계 보좌' },
      
      // 전문직/특수직 (Level 25-35)
      { name: '교역자', englishName: 'Minister', level: 80, isLeadership: true, description: '목회자 또는 전도사' },
      { name: '교사', englishName: 'Teacher', level: 30, isLeadership: false, description: '교육 담당' },
      { name: '대장', englishName: 'Captain', level: 35, isLeadership: true, description: '팀 대장' },
      { name: '지휘자', englishName: 'Conductor', level: 40, isLeadership: true, description: '찬양대 지휘자' },
      { name: '반주자', englishName: 'Accompanist', level: 25, isLeadership: false, description: '반주 담당' },
      
      // 대표직 (Level 60-70)
      { name: '남선교회대표', englishName: 'Men\'s Mission Representative', level: 60, isLeadership: true, description: '남선교회 대표' },
      { name: '여전도회대표', englishName: 'Women\'s Mission Representative', level: 60, isLeadership: true, description: '여전도회 대표' },
      { name: '안수집사대표', englishName: 'Elder Deacon Representative', level: 65, isLeadership: true, description: '안수집사 대표' },
      { name: '권사회대표', englishName: 'Deaconess Representative', level: 65, isLeadership: true, description: '권사회 대표' },
      
      // 교회 특수직분 (Level 70-80)
      { name: '교구권사', englishName: 'District Deaconess', level: 70, isLeadership: true, description: '교구 담당 권사' },
      { name: '엘더', englishName: 'Elder', level: 75, isLeadership: true, description: '장로' },
      { name: '임원', englishName: 'Executive Member', level: 45, isLeadership: true, description: '임원진' },
      
      // 찬양대 특수직 (Level 15-25)
      { name: '솔리스트', englishName: 'Soloist', level: 25, isLeadership: false, description: '독창자' },
      { name: '소프라노', englishName: 'Soprano', level: 15, isLeadership: false, description: '소프라노 파트' },
      { name: '알토', englishName: 'Alto', level: 15, isLeadership: false, description: '알토 파트' },
      { name: '테너', englishName: 'Tenor', level: 15, isLeadership: false, description: '테너 파트' },
      { name: '베이스', englishName: 'Bass', level: 15, isLeadership: false, description: '베이스 파트' },
      
      // 운영진 (Level 20-30)
      { name: '운영위원', englishName: 'Operating Committee Member', level: 25, isLeadership: false, description: '운영위원회 위원' },
      { name: '부감', englishName: 'Assistant Supervisor', level: 30, isLeadership: false, description: '감독관 보좌' },
    ]

    const createdRoles = []
    for (const role of roles) {
      try {
        const created = await prisma.organizationRole.create({
          data: {
            name: role.name,
            englishName: role.englishName,
            level: role.level,
            isLeadership: role.isLeadership,
            description: role.description,
            churchId,
            sortOrder: role.level, // 레벨 순으로 정렬
          },
        })
        createdRoles.push(created)
        console.log(`✅ Created role: ${role.name} (Level: ${role.level}, Leadership: ${role.isLeadership})`)
      } catch (error: any) {
        if (error.code === 'P2002' && error.meta?.target?.includes('name')) {
          console.log(`⚠️  Role already exists: ${role.name}`)
        } else {
          throw error
        }
      }
    }

    console.log(`🎭 Organization roles seeding completed! Created ${createdRoles.length} roles.`)
    return createdRoles

  } catch (error) {
    console.error('❌ Error seeding organization roles:', error)
    throw error
  }
}

// 조직별 적합한 직책 조회 함수
export async function getAvailableRolesForOrganization(organizationId: string, churchId: string) {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
  })

  if (!organization) {
    throw new Error('Organization not found')
  }

  // 조직 레벨과 성격에 따라 적합한 직책들을 필터링
  let levelFilter: { gte?: number; lte?: number } = {}
  
  switch (organization.level) {
    case 'LEVEL_1': // 위원회
      levelFilter = { gte: 40 } // 중급 이상 직책
      break
    case 'LEVEL_2': // 부서
      levelFilter = { gte: 30, lte: 90 }
      break
    case 'LEVEL_3': // 팀
      levelFilter = { gte: 15, lte: 70 }
      break
    case 'LEVEL_4': // 세부조직
      levelFilter = { gte: 10, lte: 50 }
      break
  }

  return await prisma.organizationRole.findMany({
    where: {
      churchId,
      isActive: true,
      level: levelFilter,
    },
    orderBy: [
      { level: 'desc' },
      { name: 'asc' }
    ]
  })
}

// 직책별 멤버 조회
export async function getMembersByRole(roleId: string, organizationId?: string) {
  const whereClause: any = {
    roleId,
    isActive: true,
  }

  if (organizationId) {
    whereClause.organizationId = organizationId
  }

  return await prisma.organizationMembership.findMany({
    where: whereClause,
    include: {
      member: {
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          photoUrl: true,
        }
      },
      organization: {
        select: {
          id: true,
          name: true,
          code: true,
          level: true,
        }
      },
      role: {
        select: {
          id: true,
          name: true,
          englishName: true,
          level: true,
          isLeadership: true,
        }
      }
    },
    orderBy: [
      { role: { level: 'desc' } },
      { member: { name: 'asc' } }
    ]
  })
}

// 리더십 직책 보유자 조회
export async function getOrganizationLeaders(organizationId: string) {
  return await prisma.organizationMembership.findMany({
    where: {
      organizationId,
      isActive: true,
      role: {
        isLeadership: true
      }
    },
    include: {
      member: {
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          photoUrl: true,
        }
      },
      role: {
        select: {
          id: true,
          name: true,
          englishName: true,
          level: true,
          isLeadership: true,
        }
      }
    },
    orderBy: [
      { role: { level: 'desc' } },
      { member: { name: 'asc' } }
    ]
  })
}