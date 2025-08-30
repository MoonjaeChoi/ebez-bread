import { PrismaClient, OrganizationLevel } from '@prisma/client'

const prisma = new PrismaClient()

export async function seedRealOrganizations(churchId: string) {
  console.log('🏢 Seeding real organization structure...')

  try {
    // 1단계: 위원회/교구 생성
    const level1Organizations = [
      // 교구
      { code: 'DC', name: '교구', description: '지역별 교구 조직으로 목장 및 구역 관리' },
      
      // 행정 및 관리
      { code: 'AD', name: '행정사역부', description: '교회 운영과 행정 업무 총괄' },
      { code: 'MA', name: '관리위원회', description: '시설 및 운영 관리' },
      { code: 'FI', name: '재정위원회', description: '재정 관리 및 회계 업무' },
      { code: 'AU', name: '감사위원회', description: '내부 감사 업무' },
      { code: 'VE', name: '차량관리위원회', description: '차량 및 주차 관리' },
      
      // 청년 및 교육
      { code: 'YO', name: '청년부', description: '청년 사역 전담' },
      { code: 'AE', name: '장년교육위원회', description: '성인 교육 프로그램' },
      { code: 'NE', name: '다음세대교육위원회', description: '아동청소년 교육' },
      
      // 예배 및 찬양
      { code: 'WO', name: '예배찬양위원회', description: '예배와 찬양 전반 관리' },
      { code: 'PR', name: '찬양사역위원회', description: '찬양단 운영 및 관리' },
      
      // 선교
      { code: 'WM', name: '세계선교위원회', description: '해외 선교 사역' },
      { code: 'NK', name: '북한선교위원회', description: '북한 및 탈북민 선교' },
      { code: 'DM', name: '국내선교위원회', description: '국내 선교 사역' },
      { code: 'EM', name: '환경선교위원회', description: '환경 보전 및 생태 선교' },
      { code: 'EV', name: '전도위원회', description: '전도 사역' },
      
      // 봉사 및 사회사역
      { code: 'SE', name: '봉사위원회', description: '봉사 및 사회복지 활동' },
      { code: 'DI', name: '장애인사역위원회', description: '장애인 대상 사역' },
      
      // 문화 및 미디어
      { code: 'CU', name: '문화사역위원회', description: '문화 사역 및 동호회 운영' },
      { code: 'ME', name: '미디어사역위원회', description: '영상, 음향 등 미디어 사역' },
      
      // 기타
      { code: 'EX', name: '대외협력위원회', description: '대외 협력 및 이단 대책' },
      { code: 'NF', name: '새가족위원회', description: '새가족 환영 및 정착 지원' },
      { code: 'SC', name: '하늘행복장학회', description: '장학 사업 운영' },
      { code: 'CC', name: '시냇가 상담센터', description: '심리 상담 및 치료' },
      { code: 'YC', name: '시냇가 청소년센터', description: '청소년 복지 및 교육' },
    ]

    const createdLevel1: any[] = []
    for (const org of level1Organizations) {
      const created: any = await prisma.organization.create({
        data: {
          code: org.code,
          name: org.name,
          description: org.description,
          level: OrganizationLevel.LEVEL_1,
          churchId,
          sortOrder: createdLevel1.length + 1,
        },
      })
      createdLevel1.push(created)
      console.log(`✅ Created Level 1: ${org.name} (${org.code})`)
    }

    // 2단계: 교구별 부서 생성
    const dcCommittee = createdLevel1.find(org => org.code === 'DC')
    if (dcCommittee) {
      const districts = [
        { code: 'DC-01', name: '1교구', description: '1단지 지역' },
        { code: 'DC-02', name: '2교구', description: '2단지 지역' },
        { code: 'DC-03', name: '3교구', description: '3단지 지역' },
        { code: 'DC-04', name: '갈현교구', description: '갈현동 지역' },
        { code: 'DC-05', name: '4·5교구', description: '4·5단지 지역' },
        { code: 'DC-06', name: '6교구', description: '6단지 지역' },
        { code: 'DC-07', name: '7·9교구', description: '7·9단지 지역' },
        { code: 'DC-08', name: '8교구', description: '8단지 지역' },
        { code: 'DC-09', name: '부림교구', description: '부림동 지역' },
        { code: 'DC-10', name: '10교구', description: '10단지 지역' },
        { code: 'DC-11', name: '11교구', description: '11단지 지역' },
        { code: 'DC-12', name: '문원교구', description: '문원동 지역' },
        { code: 'DC-13', name: '별양교구', description: '별양동 지역' },
        { code: 'DC-14', name: '서울교구', description: '서울 지역' },
        { code: 'DC-15', name: '수산교구', description: '수원·산본·안산 지역' },
        { code: 'DC-16', name: '분수교구', description: '분당·수지 지역' },
        { code: 'DC-17', name: '안양교구', description: '안양 지역' },
        { code: 'DC-18', name: '우면·관문교구', description: '우면·과천·관문·주암 지역' },
        { code: 'DC-19', name: '의왕교구', description: '의왕 지역' },
        { code: 'DC-20', name: '중앙교구', description: '중앙동 지역' },
        { code: 'DC-21', name: '평촌교구', description: '평촌 지역' },
        { code: 'DC-22', name: '은빛교구', description: '은퇴자 및 시니어 대상' },
        { code: 'DC-23', name: '30+교구', description: '30대 이상 청년 대상' },
        { code: 'DC-24', name: '청년교구', description: '청년층 전담' },
      ]

      const createdDistricts: any[] = []
      for (const district of districts) {
        const created: any = await prisma.organization.create({
          data: {
            code: district.code,
            name: district.name,
            description: district.description,
            level: OrganizationLevel.LEVEL_2,
            parentId: dcCommittee.id,
            churchId,
            sortOrder: createdDistricts.length + 1,
          },
        })
        createdDistricts.push(created)
        console.log(`✅ Created District: ${district.name} (${district.code})`)
      }

      // 3단계: 교구 내 목장부/구역부 생성 (예시: 1교구)
      const district01 = createdDistricts.find(d => d.code === 'DC-01')
      if (district01) {
        const mokjangDept = await prisma.organization.create({
          data: {
            code: 'DC-01-MO',
            name: '목장부',
            description: '1교구 목장 운영 및 관리',
            level: OrganizationLevel.LEVEL_3,
            parentId: district01.id,
            churchId,
            sortOrder: 1,
          },
        })

        const zoneDept = await prisma.organization.create({
          data: {
            code: 'DC-01-ZO',
            name: '구역부',
            description: '1교구 구역 관리',
            level: OrganizationLevel.LEVEL_3,
            parentId: district01.id,
            churchId,
            sortOrder: 2,
          },
        })

        // 4단계: 개별 목장/구역 생성
        for (let i = 1; i <= 3; i++) {
          await prisma.organization.create({
            data: {
              code: `DC-01-MO-${i.toString().padStart(2, '0')}`,
              name: `${i}목장`,
              description: `1교구 ${i}목장`,
              level: OrganizationLevel.LEVEL_4,
              parentId: mokjangDept.id,
              churchId,
              sortOrder: i,
            },
          })
        }

        for (let i = 1; i <= 2; i++) {
          await prisma.organization.create({
            data: {
              code: `DC-01-ZO-${i.toString().padStart(2, '0')}`,
              name: `${i}구역`,
              description: `1교구 ${i}구역`,
              level: OrganizationLevel.LEVEL_4,
              parentId: zoneDept.id,
              churchId,
              sortOrder: i,
            },
          })
        }
      }
    }

    // 예배찬양위원회 조직 생성
    const woCommittee = createdLevel1.find(org => org.code === 'WO')
    if (woCommittee) {
      const woDepartments = [
        { code: 'WO-WO', name: '예배부', description: '예배 준비 및 진행 총괄' },
        { code: 'WO-SA', name: '성례부', description: '성례전 준비 및 관리' },
        { code: 'WO-PR', name: '기도사역부', description: '기도 사역 전담' },
        { code: 'WO-MO', name: '어머니기도회부', description: '어머니들의 기도모임' },
        { code: 'WO-C1', name: '찬양1부', description: '1부 예배 찬양 담당' },
        { code: 'WO-C2', name: '찬양2부', description: '2부 예배 찬양 담당' },
      ]

      const createdWODepts: any[] = []
      for (const dept of woDepartments) {
        const created: any = await prisma.organization.create({
          data: {
            code: dept.code,
            name: dept.name,
            description: dept.description,
            level: OrganizationLevel.LEVEL_2,
            parentId: woCommittee.id,
            churchId,
            sortOrder: createdWODepts.length + 1,
          },
        })
        createdWODepts.push(created)
        console.log(`✅ Created WO Dept: ${dept.name} (${dept.code})`)
      }

      // 찬양1부 세부 조직
      const praise1Dept = createdWODepts.find(d => d.code === 'WO-C1')
      if (praise1Dept) {
        const praise1Teams = [
          { code: 'WO-C1-SH', name: '샬롬', description: '샬롬 찬양팀' },
          { code: 'WO-C1-HO', name: '호산나', description: '호산나 찬양팀' },
          { code: 'WO-C1-HA', name: '할렐루야', description: '할렐루야 찬양팀' },
          { code: 'WO-C1-IM', name: '임마누엘', description: '임마누엘 찬양팀' },
        ]

        const createdPraise1Teams: any[] = []
        for (const team of praise1Teams) {
          const created: any = await prisma.organization.create({
            data: {
              code: team.code,
              name: team.name,
              description: team.description,
              level: OrganizationLevel.LEVEL_3,
              parentId: praise1Dept.id,
              churchId,
              sortOrder: createdPraise1Teams.length + 1,
            },
          })
          createdPraise1Teams.push(created)
        }

        // 호산나 찬양팀 세부 조직
        const hosannaTeam = createdPraise1Teams.find(t => t.code === 'WO-C1-HO')
        if (hosannaTeam) {
          const hosannaSubTeams = [
            { code: 'WO-C1-HO-VO', name: '보컬팀', description: '호산나 보컬 담당' },
            { code: 'WO-C1-HO-IN', name: '악기팀', description: '호산나 반주 담당' },
          ]

          for (const subTeam of hosannaSubTeams) {
            await prisma.organization.create({
              data: {
                code: subTeam.code,
                name: subTeam.name,
                description: subTeam.description,
                level: OrganizationLevel.LEVEL_4,
                parentId: hosannaTeam.id,
                churchId,
                sortOrder: hosannaSubTeams.indexOf(subTeam) + 1,
              },
            })
          }
        }
      }

      // 찬양2부 세부 조직
      const praise2Dept = createdWODepts.find(d => d.code === 'WO-C2')
      if (praise2Dept) {
        const praise2Teams = [
          { code: 'WO-C2-OR', name: '하늘울림 오케스트라', description: '오케스트라 연주팀' },
          { code: 'WO-C2-HB', name: '하늘종소리 핸드벨', description: '핸드벨 연주팀' },
          { code: 'WO-C2-CH', name: '많은물소리 합창단', description: '합창팀' },
          { code: 'WO-C2-HF', name: '하늘향기 찬양단', description: '찬양팀' },
          { code: 'WO-C2-DR', name: '드림찬양단', description: '드림 찬양팀' },
        ]

        for (const team of praise2Teams) {
          await prisma.organization.create({
            data: {
              code: team.code,
              name: team.name,
              description: team.description,
              level: OrganizationLevel.LEVEL_3,
              parentId: praise2Dept.id,
              churchId,
              sortOrder: praise2Teams.indexOf(team) + 1,
            },
          })
        }
      }
    }

    // 다음세대교육위원회 조직 생성
    const neCommittee = createdLevel1.find(org => org.code === 'NE')
    if (neCommittee) {
      const neDepartments = [
        { code: 'NE-PL', name: '교육기획부', description: '교육 프로그램 기획 및 운영' },
        { code: 'NE-HL', name: '하늘사랑', description: '영유아 교육 부서' },
        { code: 'NE-HI', name: '하늘생명', description: '초등 교육 부서' },
        { code: 'NE-HP', name: '하늘평화', description: '중고등 교육 부서' },
      ]

      const createdNEDepts: any[] = []
      for (const dept of neDepartments) {
        const created: any = await prisma.organization.create({
          data: {
            code: dept.code,
            name: dept.name,
            description: dept.description,
            level: OrganizationLevel.LEVEL_2,
            parentId: neCommittee.id,
            churchId,
            sortOrder: createdNEDepts.length + 1,
          },
        })
        createdNEDepts.push(created)
      }

      // 하늘사랑 (영유아) 세부 부서
      const hlDept = createdNEDepts.find(d => d.code === 'NE-HL')
      if (hlDept) {
        const hlTeams = [
          { code: 'NE-HL-IN', name: '영아부', description: '0-2세 영아 교육' },
          { code: 'NE-HL-TO', name: '유아부', description: '3-4세 유아 교육' },
          { code: 'NE-HL-KI', name: '유치부', description: '5-7세 유치 교육' },
          { code: 'NE-HL-BA', name: '아기학교', description: '특별 프로그램' },
        ]

        const createdHLTeams: any[] = []
        for (const team of hlTeams) {
          const created: any = await prisma.organization.create({
            data: {
              code: team.code,
              name: team.name,
              description: team.description,
              level: OrganizationLevel.LEVEL_3,
              parentId: hlDept.id,
              churchId,
              sortOrder: createdHLTeams.length + 1,
            },
          })
          createdHLTeams.push(created)
        }

        // 영아부 반별 조직
        const infantDept = createdHLTeams.find(t => t.code === 'NE-HL-IN')
        if (infantDept) {
          for (let i = 1; i <= 2; i++) {
            await prisma.organization.create({
              data: {
                code: `NE-HL-IN-${i.toString().padStart(2, '0')}`,
                name: `영아${i}반`,
                description: `영아부 ${i}반`,
                level: OrganizationLevel.LEVEL_4,
                parentId: infantDept.id,
                churchId,
                sortOrder: i,
              },
            })
          }
        }
      }

      // 하늘생명 (초등) 세부 부서
      const hiDept = createdNEDepts.find(d => d.code === 'NE-HI')
      if (hiDept) {
        const hiTeams = [
          { code: 'NE-HI-SA', name: '토요학교', description: '토요일 특별 교육' },
          { code: 'NE-HI-E1', name: '어린이1부', description: '초등 저학년' },
          { code: 'NE-HI-E2', name: '어린이2부', description: '초등 중학년' },
          { code: 'NE-HI-E3', name: '어린이3부', description: '초등 고학년' },
          { code: 'NE-HI-DR', name: '꿈둥이부', description: '특별활동부' },
        ]

        for (const team of hiTeams) {
          await prisma.organization.create({
            data: {
              code: team.code,
              name: team.name,
              description: team.description,
              level: OrganizationLevel.LEVEL_3,
              parentId: hiDept.id,
              churchId,
              sortOrder: hiTeams.indexOf(team) + 1,
            },
          })
        }
      }

      // 하늘평화 (중고등) 세부 부서
      const hpDept = createdNEDepts.find(d => d.code === 'NE-HP')
      if (hpDept) {
        const hpTeams = [
          { code: 'NE-HP-MI', name: '중등부', description: '중학생 교육' },
          { code: 'NE-HP-HI', name: '고등부', description: '고등학생 교육' },
        ]

        const createdHPTeams: any[] = []
        for (const team of hpTeams) {
          const created: any = await prisma.organization.create({
            data: {
              code: team.code,
              name: team.name,
              description: team.description,
              level: OrganizationLevel.LEVEL_3,
              parentId: hpDept.id,
              churchId,
              sortOrder: createdHPTeams.length + 1,
            },
          })
          createdHPTeams.push(created)
        }

        // 중등부 학년별 반
        const middleDept = createdHPTeams.find(t => t.code === 'NE-HP-MI')
        if (middleDept) {
          for (let i = 1; i <= 3; i++) {
            await prisma.organization.create({
              data: {
                code: `NE-HP-MI-${(i + 6).toString().padStart(2, '0')}`,
                name: `중${i}반`,
                description: `중학교 ${i}학년`,
                level: OrganizationLevel.LEVEL_4,
                parentId: middleDept.id,
                churchId,
                sortOrder: i,
              },
            })
          }
        }

        // 고등부 학년별 반
        const highDept = createdHPTeams.find(t => t.code === 'NE-HP-HI')
        if (highDept) {
          for (let i = 1; i <= 3; i++) {
            await prisma.organization.create({
              data: {
                code: `NE-HP-HI-${(i + 9).toString().padStart(2, '0')}`,
                name: `고${i}반`,
                description: `고등학교 ${i}학년`,
                level: OrganizationLevel.LEVEL_4,
                parentId: highDept.id,
                churchId,
                sortOrder: i,
              },
            })
          }
        }
      }
    }

    // 재정위원회 조직 생성
    const fiCommittee = createdLevel1.find(org => org.code === 'FI')
    if (fiCommittee) {
      const fiDepartments = [
        { code: 'FI-AC1', name: '회계1부', description: '일반회계 및 헌금관리' },
        { code: 'FI-AC2', name: '회계2부', description: '예산관리 및 지출관리' },
      ]

      const createdFIDepts: any[] = []
      for (const dept of fiDepartments) {
        const created: any = await prisma.organization.create({
          data: {
            code: dept.code,
            name: dept.name,
            description: dept.description,
            level: OrganizationLevel.LEVEL_2,
            parentId: fiCommittee.id,
            churchId,
            sortOrder: createdFIDepts.length + 1,
          },
        })
        createdFIDepts.push(created)
      }

      // 회계1부 세부 팀
      const ac1Dept = createdFIDepts.find(d => d.code === 'FI-AC1')
      if (ac1Dept) {
        const ac1Teams = [
          { code: 'FI-AC1-GE', name: '일반회계팀', description: '일반적인 수입/지출 관리' },
          { code: 'FI-AC1-OF', name: '헌금관리팀', description: '헌금 수납 및 관리' },
        ]

        for (const team of ac1Teams) {
          await prisma.organization.create({
            data: {
              code: team.code,
              name: team.name,
              description: team.description,
              level: OrganizationLevel.LEVEL_3,
              parentId: ac1Dept.id,
              churchId,
              sortOrder: ac1Teams.indexOf(team) + 1,
            },
          })
        }
      }
    }

    console.log('🏢 Real organization structure seeding completed!')

  } catch (error) {
    console.error('❌ Error seeding real organizations:', error)
    throw error
  }
}

// 실제 조직구조 조회 함수
export async function getRealOrganizationHierarchy(churchId: string) {
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

// 교구별 통계 조회
export async function getDistrictStats(churchId: string) {
  const districts = await prisma.organization.findMany({
    where: {
      churchId,
      code: { startsWith: 'DC-' },
      level: OrganizationLevel.LEVEL_2,
      isActive: true,
    },
    include: {
      children: {
        include: {
          children: true
        }
      },
      organizationMemberships: {
        include: {
          member: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true
            }
          },
          role: true
        }
      },
      _count: {
        select: {
          organizationMemberships: true,
          expenseReports: true,
          budgets: true,
        }
      }
    },
    orderBy: { sortOrder: 'asc' }
  })

  return districts.map(district => ({
    id: district.id,
    name: district.name,
    code: district.code,
    description: district.description,
    mokjangCount: district.children.filter(c => c.code.includes('-MO')).length,
    zoneCount: district.children.filter(c => c.code.includes('-ZO')).length,
    memberCount: 0, // district._count.members,
    expenseReportCount: district._count.expenseReports,
    budgetCount: district._count.budgets,
  }))
}

// 부서별 예산 현황 조회
export async function getDepartmentBudgetStatus(churchId: string) {
  const departments = await prisma.organization.findMany({
    where: {
      churchId,
      level: OrganizationLevel.LEVEL_2,
      isActive: true,
    },
    include: {
      parent: {
        select: { name: true }
      },
      budgets: {
        where: { status: 'ACTIVE' },
        include: {
          budgetItems: {
            include: {
              budgetExecution: true
            }
          }
        }
      }
    },
    orderBy: [
      { parent: { name: 'asc' } },
      { sortOrder: 'asc' }
    ]
  })

  return departments.map(dept => {
    const totalBudget = dept.budgets.reduce((sum, budget) => 
      sum + budget.budgetItems.reduce((itemSum, item) => 
        itemSum + Number(item.amount), 0), 0)
    
    const usedBudget = dept.budgets.reduce((sum, budget) => 
      sum + budget.budgetItems.reduce((itemSum, item) => 
        itemSum + Number(item.budgetExecution?.usedAmount || 0), 0), 0)

    return {
      id: dept.id,
      name: dept.name,
      code: dept.code,
      parentName: dept.parent?.name,
      totalBudget,
      usedBudget,
      remainingBudget: totalBudget - usedBudget,
      executionRate: totalBudget > 0 ? (usedBudget / totalBudget) * 100 : 0,
    }
  })
}