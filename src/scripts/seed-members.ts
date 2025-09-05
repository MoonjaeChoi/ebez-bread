import { PrismaClient, OrganizationLevel } from '@prisma/client'

const prisma = new PrismaClient()

async function seedMembers() {
  try {
    console.log('시드 데이터 생성 시작...')

    // 기본 교회 정보 확인
    let church = await prisma.church.findFirst({
      where: { name: '은혜교회' }
    })

    if (!church) {
      // 교회가 없으면 생성
      church = await prisma.church.create({
        data: {
          name: '은혜교회',
          address: '서울시 강남구',
          phone: '02-1234-5678',
          email: 'info@gracechurch.kr',
          website: 'https://gracechurch.kr'
        }
      })
      console.log('교회 생성 완료:', church.name)
    }

    // 기본 관리자 사용자 확인 (이미 존재할 가능성이 있으므로 먼저 전체 사용자 목록에서 찾아봄)
    let adminUser = await prisma.user.findFirst({
      where: { 
        email: 'admin@gcchurch.kr'
      }
    })

    if (!adminUser) {
      adminUser = await prisma.user.create({
        data: {
          name: '시스템 관리자',
          email: 'admin@gcchurch.kr',
          phone: '010-1234-5678',
          role: 'SUPER_ADMIN',
          isActive: true,
          churchId: church.id,
          password: '$2a$10$N9qo8uLOickgx2ZMRZoMye1n0XfRBdAQLOF9PU.3kV0BM1R8D.' // 'password' 해시
        }
      })
      console.log('관리자 사용자 생성 완료:', adminUser.email)
    } else if (adminUser.churchId !== church.id) {
      // 관리자가 다른 교회에 속해 있다면 교회 ID 업데이트
      adminUser = await prisma.user.update({
        where: { id: adminUser.id },
        data: { churchId: church.id }
      })
      console.log('관리자 사용자 교회 정보 업데이트:', adminUser.email)
    }

    // 기본 조직 확인 및 생성
    let rootOrg = await prisma.organization.findFirst({
      where: { 
        churchId: church.id,
        parentId: null
      }
    })

    if (!rootOrg) {
      rootOrg = await prisma.organization.create({
        data: {
          name: '은혜교회',
          code: 'ROOT',
          level: OrganizationLevel.LEVEL_1,
          churchId: church.id,
          createdById: adminUser.id,
          updatedById: adminUser.id
        }
      })
      console.log('루트 조직 생성 완료:', rootOrg.name)
    }

    // 부서 조직들 생성
    const departments = [
      { name: '목회부', code: 'MINISTRY' },
      { name: '총무부', code: 'ADMIN' },
      { name: '재정부', code: 'FINANCE' },
      { name: '교육부', code: 'EDUCATION' }
    ]

    for (const dept of departments) {
      const existingDept = await prisma.organization.findFirst({
        where: { 
          churchId: church.id,
          code: dept.code 
        }
      })

      if (!existingDept) {
        await prisma.organization.create({
          data: {
            name: dept.name,
            code: dept.code,
            level: OrganizationLevel.LEVEL_2,
            parentId: rootOrg.id,
            churchId: church.id,
            createdById: adminUser.id,
            updatedById: adminUser.id
          }
        })
        console.log(`부서 생성 완료: ${dept.name}`)
      }
    }

    // 기본 역할들 생성
    const roles = [
      { name: '목사', level: 1, isLeadership: true },
      { name: '장로', level: 2, isLeadership: true },
      { name: '집사', level: 3, isLeadership: true },
      { name: '권사', level: 4, isLeadership: true },
      { name: '성도', level: 5, isLeadership: false }
    ]

    for (const role of roles) {
      const existingRole = await prisma.organizationRole.findFirst({
        where: { 
          name: role.name,
          churchId: church.id 
        }
      })

      if (!existingRole) {
        await prisma.organizationRole.create({
          data: {
            name: role.name,
            level: role.level,
            isLeadership: role.isLeadership,
            isActive: true,
            churchId: church.id
          }
        })
        console.log(`역할 생성 완료: ${role.name}`)
      }
    }

    // 테스트용 교인들 생성
    const testMembers = [
      {
        name: '김철수',
        email: 'kim@example.com',
        phone: '010-1111-2222',
        gender: 'MALE',
        status: 'ACTIVE',
        role: '장로'
      },
      {
        name: '이영희',
        email: 'lee@example.com', 
        phone: '010-3333-4444',
        gender: 'FEMALE',
        status: 'ACTIVE',
        role: '권사'
      },
      {
        name: '박민수',
        email: 'park@example.com',
        phone: '010-5555-6666', 
        gender: 'MALE',
        status: 'ACTIVE',
        role: '집사'
      },
      {
        name: '최지은',
        email: 'choi@example.com',
        phone: '010-7777-8888',
        gender: 'FEMALE', 
        status: 'ACTIVE',
        role: '성도'
      },
      {
        name: '정대호',
        email: 'jung@example.com',
        phone: '010-9999-0000',
        gender: 'MALE',
        status: 'ACTIVE', 
        role: '성도'
      }
    ]

    for (const memberData of testMembers) {
      // 교인이 이미 존재하는지 확인
      const existingMember = await prisma.member.findFirst({
        where: { 
          email: memberData.email,
          churchId: church.id 
        }
      })

      if (!existingMember) {
        // 교인 생성
        const member = await prisma.member.create({
          data: {
            name: memberData.name,
            email: memberData.email,
            phone: memberData.phone,
            gender: memberData.gender as any,
            status: memberData.status as any,
            churchId: church.id
          }
        })

        // 사용자 계정도 함께 생성
        await prisma.user.create({
          data: {
            name: memberData.name,
            email: memberData.email,
            phone: memberData.phone,
            role: 'GENERAL_USER',
            isActive: true,
            churchId: church.id,
            password: '$2a$10$N9qo8uLOickgx2ZMRZoMye1n0XfRBdAQLOF9PU.3kV0BM1R8D.' // 'password' 해시
          }
        })

        // 해당 역할 찾기
        const role = await prisma.organizationRole.findFirst({
          where: { 
            name: memberData.role,
            churchId: church.id 
          }
        })

        // 적절한 부서에 배정
        const targetDept = memberData.role === '목사' ? '목회부' : 
                          memberData.role === '장로' ? '총무부' :
                          memberData.role === '집사' ? '재정부' : '교육부'

        const department = await prisma.organization.findFirst({
          where: { 
            name: targetDept,
            churchId: church.id 
          }
        })

        if (role && department) {
          // 조직 멤버십 생성
          await prisma.organizationMembership.create({
            data: {
              memberId: member.id,
              organizationId: department.id,
              roleId: role.id,
              isActive: true,
              joinDate: new Date()
            }
          })
        }

        console.log(`교인 생성 완료: ${member.name} (${memberData.role})`)
      } else {
        console.log(`교인 이미 존재: ${memberData.name}`)
      }
    }

    console.log('시드 데이터 생성 완료!')

  } catch (error) {
    console.error('시드 데이터 생성 실패:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// 직접 실행할 때만 실행
if (require.main === module) {
  seedMembers()
    .then(() => {
      console.log('시드 실행 완료')
      process.exit(0)
    })
    .catch((error) => {
      console.error('시드 실행 실패:', error)
      process.exit(1)
    })
}

export { seedMembers }