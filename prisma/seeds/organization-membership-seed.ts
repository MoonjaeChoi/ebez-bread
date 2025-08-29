import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function seedOrganizationMemberships(churchId: string) {
  console.log('👥 Seeding organization memberships...')

  try {
    // 기본 데이터 조회
    const members = await prisma.member.findMany({
      where: { churchId },
      take: 10, // 처음 10명만 사용
    })

    const organizations = await prisma.organization.findMany({
      where: { churchId },
      take: 5, // 처음 5개 조직만 사용
    })

    const roles = await prisma.organizationRole.findMany({
      where: { churchId, isActive: true },
      orderBy: { level: 'desc' },
    })

    if (members.length === 0 || organizations.length === 0 || roles.length === 0) {
      console.log('⚠️  Insufficient data for membership seeding. Skipping...')
      return
    }

    console.log(`📊 Found ${members.length} members, ${organizations.length} organizations, ${roles.length} roles`)

    // 샘플 멤버십 생성
    const sampleMemberships = [
      // 첫 번째 조직의 리더십
      {
        memberId: members[0]?.id,
        organizationId: organizations[0]?.id,
        roleId: roles.find(r => r.name === '회장')?.id || roles[0]?.id,
        isPrimary: true,
        joinDate: new Date('2020-01-01'),
        notes: '조직 창립 멤버',
      },
      {
        memberId: members[1]?.id,
        organizationId: organizations[0]?.id,
        roleId: roles.find(r => r.name === '서기')?.id || roles[1]?.id,
        isPrimary: false,
        joinDate: new Date('2020-02-01'),
        notes: '회의록 작성 담당',
      },
      {
        memberId: members[2]?.id,
        organizationId: organizations[0]?.id,
        roleId: roles.find(r => r.name === '회계')?.id,
        isPrimary: false,
        joinDate: new Date('2020-03-01'),
        notes: '재정 관리 담당',
      },

      // 두 번째 조직
      {
        memberId: members[3]?.id,
        organizationId: organizations[1]?.id,
        roleId: roles.find(r => r.name === '부장')?.id,
        isPrimary: true,
        joinDate: new Date('2019-06-01'),
        notes: '부서 책임자',
      },
      {
        memberId: members[4]?.id,
        organizationId: organizations[1]?.id,
        roleId: roles.find(r => r.name === '총무')?.id,
        isPrimary: false,
        joinDate: new Date('2019-08-01'),
      },

      // 다중 조직 소속 예시
      {
        memberId: members[0]?.id, // 첫 번째 멤버가 두 번째 조직에도 소속
        organizationId: organizations[1]?.id,
        roleId: roles.find(r => r.name === '임원')?.id,
        isPrimary: false,
        joinDate: new Date('2021-01-01'),
        notes: '겸직',
      },
      {
        memberId: members[5]?.id,
        organizationId: organizations[2]?.id,
        roleId: roles.find(r => r.name === '리더')?.id,
        isPrimary: true,
        joinDate: new Date('2022-03-01'),
      },

      // 일반 멤버들 (직책 없음)
      {
        memberId: members[6]?.id,
        organizationId: organizations[0]?.id,
        roleId: null,
        isPrimary: false,
        joinDate: new Date('2023-01-01'),
        notes: '일반 멤버',
      },
      {
        memberId: members[7]?.id,
        organizationId: organizations[1]?.id,
        roleId: null,
        isPrimary: false,
        joinDate: new Date('2023-06-01'),
        notes: '신규 가입',
      },
    ]

    const createdMemberships = []
    for (const membership of sampleMemberships) {
      if (!membership.memberId || !membership.organizationId) {
        console.log('⚠️  Skipping invalid membership data')
        continue
      }

      try {
        // 중복 체크
        const existing = await prisma.organizationMembership.findFirst({
          where: {
            memberId: membership.memberId,
            organizationId: membership.organizationId,
            isActive: true,
          },
        })

        if (existing) {
          console.log(`⚠️  Membership already exists: ${membership.memberId} -> ${membership.organizationId}`)
          continue
        }

        const created = await prisma.organizationMembership.create({
          data: membership,
          include: {
            member: {
              select: {
                name: true,
              },
            },
            organization: {
              select: {
                name: true,
              },
            },
            role: {
              select: {
                name: true,
              },
            },
          },
        })

        createdMemberships.push(created)
        console.log(`✅ Created membership: ${created.member.name} -> ${created.organization.name} (${created.role?.name || '일반 멤버'})`)
      } catch (error: any) {
        if (error.code === 'P2002') {
          console.log(`⚠️  Unique constraint violation for membership`)
        } else {
          console.error(`❌ Error creating membership:`, error.message)
        }
      }
    }

    // 통계 정보 출력
    const totalMemberships = await prisma.organizationMembership.count({
      where: {
        organization: {
          churchId,
        },
        isActive: true,
      },
    })

    const membershipsWithRoles = await prisma.organizationMembership.count({
      where: {
        organization: {
          churchId,
        },
        isActive: true,
        roleId: { not: null },
      },
    })

    const leadershipMemberships = await prisma.organizationMembership.count({
      where: {
        organization: {
          churchId,
        },
        isActive: true,
        role: {
          isLeadership: true,
        },
      },
    })

    console.log(`👥 Organization memberships seeding completed!`)
    console.log(`📊 Statistics:`)
    console.log(`   - Total active memberships: ${totalMemberships}`)
    console.log(`   - Memberships with roles: ${membershipsWithRoles}`)
    console.log(`   - Leadership positions: ${leadershipMemberships}`)
    console.log(`   - General members: ${totalMemberships - membershipsWithRoles}`)

    return createdMemberships

  } catch (error) {
    console.error('❌ Error seeding organization memberships:', error)
    throw error
  }
}

// 조직별 멤버십 현황 조회 함수
export async function getOrganizationMembershipSummary(churchId: string) {
  const organizations = await prisma.organization.findMany({
    where: { churchId, isActive: true },
    include: {
      organizationMemberships: {
        where: { isActive: true },
        include: {
          member: {
            select: {
              id: true,
              name: true,
            },
          },
          role: {
            select: {
              name: true,
              isLeadership: true,
            },
          },
        },
      },
      _count: {
        select: {
          organizationMemberships: {
            where: { isActive: true },
          },
        },
      },
    },
    orderBy: [
      { level: 'asc' },
      { sortOrder: 'asc' },
      { name: 'asc' },
    ],
  })

  return organizations.map(org => ({
    id: org.id,
    name: org.name,
    code: org.code,
    level: org.level,
    totalMembers: org._count.organizationMemberships,
    leadershipMembers: org.organizationMemberships.filter(m => m.role?.isLeadership).length,
    generalMembers: org.organizationMemberships.filter(m => !m.role || !m.role.isLeadership).length,
    members: org.organizationMemberships.map(m => ({
      id: m.member.id,
      name: m.member.name,
      roleName: m.role?.name || '일반 멤버',
      isLeadership: m.role?.isLeadership || false,
      isPrimary: m.isPrimary,
      joinDate: m.joinDate,
    })),
  }))
}

// 다중 소속 멤버 조회 함수
export async function getMultiMembershipMembers(churchId: string) {
  const members = await prisma.member.findMany({
    where: { churchId },
    include: {
      organizationMemberships: {
        where: { isActive: true },
        include: {
          organization: {
            select: {
              name: true,
              code: true,
            },
          },
          role: {
            select: {
              name: true,
              isLeadership: true,
            },
          },
        },
      },
    },
  })

  return members
    .filter(member => member.organizationMemberships.length > 1)
    .map(member => ({
      id: member.id,
      name: member.name,
      totalMemberships: member.organizationMemberships.length,
      organizations: member.organizationMemberships.map(m => ({
        name: m.organization.name,
        code: m.organization.code,
        roleName: m.role?.name || '일반 멤버',
        isLeadership: m.role?.isLeadership || false,
        isPrimary: m.isPrimary,
      })),
    }))
}