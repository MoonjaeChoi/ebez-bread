import { PrismaClient, ApprovalMatrixCategory } from '@prisma/client'

const prisma = new PrismaClient()

export async function seedApprovalMatrix() {
  console.log('🔄 Seeding approval matrices...')

  // 교회별로 기본 결재 매트릭스 생성
  const churches = await prisma.church.findMany()
  
  for (const church of churches) {
    // 슈퍼 어드민 사용자 찾기
    const adminUser = await prisma.user.findFirst({
      where: {
        churchId: church.id,
        role: 'SUPER_ADMIN'
      }
    })

    if (!adminUser) {
      console.log(`⚠️  No admin user found for church ${church.name}`)
      continue
    }

    // 1. 일반 사역비 매트릭스 (10만원 이하)
    await prisma.approvalMatrix.upsert({
      where: {
        id: `${church.id}-ministry-small`
      },
      update: {},
      create: {
        id: `${church.id}-ministry-small`,
        name: '일반 사역비 (10만원 이하)',
        description: '부서별 일반적인 사역비 및 소모품 지출',
        churchId: church.id,
        category: ApprovalMatrixCategory.MINISTRY,
        maxAmount: 100000,
        isActive: true,
        priority: 50,
        createdById: adminUser.id,
        approvalLevels: {
          create: [
            {
              levelOrder: 1,
              requiredRoles: ['부장', '차장'],
              organizationLevel: 'SAME',
              isRequired: true,
              timeoutHours: 24
            }
          ]
        }
      }
    })

    // 2. 중간 사역비 매트릭스 (10~50만원)
    await prisma.approvalMatrix.upsert({
      where: {
        id: `${church.id}-ministry-medium`
      },
      update: {},
      create: {
        id: `${church.id}-ministry-medium`,
        name: '중간 사역비 (10~50만원)',
        description: '부서 장비 구입 및 중간 규모 사역비',
        churchId: church.id,
        category: ApprovalMatrixCategory.EQUIPMENT,
        minAmount: 100001,
        maxAmount: 500000,
        isActive: true,
        priority: 70,
        createdById: adminUser.id,
        approvalLevels: {
          create: [
            {
              levelOrder: 1,
              requiredRoles: ['부장'],
              organizationLevel: 'SAME',
              isRequired: true,
              timeoutHours: 24
            },
            {
              levelOrder: 2,
              requiredRoles: ['교구장', '단장'],
              organizationLevel: 'PARENT',
              isRequired: true,
              timeoutHours: 48
            }
          ]
        }
      }
    })

    // 3. 대형 사역비 매트릭스 (50만원 이상)
    await prisma.approvalMatrix.upsert({
      where: {
        id: `${church.id}-ministry-large`
      },
      update: {},
      create: {
        id: `${church.id}-ministry-large`,
        name: '대형 사역비 (50만원 이상)',
        description: '대형 행사 및 고액 장비 구입',
        churchId: church.id,
        category: ApprovalMatrixCategory.EVENT,
        minAmount: 500001,
        isActive: true,
        priority: 80,
        createdById: adminUser.id,
        approvalLevels: {
          create: [
            {
              levelOrder: 1,
              requiredRoles: ['부장'],
              organizationLevel: 'SAME',
              isRequired: true,
              timeoutHours: 24
            },
            {
              levelOrder: 2,
              requiredRoles: ['교구장', '단장'],
              organizationLevel: 'PARENT',
              isRequired: true,
              timeoutHours: 48
            },
            {
              levelOrder: 3,
              requiredRoles: ['위원장', '회장'],
              organizationLevel: 'ROOT',
              isRequired: true,
              timeoutHours: 72
            }
          ]
        }
      }
    })

    // 4. 건축/시설비 매트릭스
    await prisma.approvalMatrix.upsert({
      where: {
        id: `${church.id}-construction`
      },
      update: {},
      create: {
        id: `${church.id}-construction`,
        name: '건축/시설비',
        description: '건축, 시설 개보수 관련 지출',
        churchId: church.id,
        category: ApprovalMatrixCategory.CONSTRUCTION,
        minAmount: 1,
        isActive: true,
        priority: 90,
        createdById: adminUser.id,
        approvalLevels: {
          create: [
            {
              levelOrder: 1,
              requiredRoles: ['부장'],
              organizationLevel: 'SAME',
              isRequired: true,
              timeoutHours: 24
            },
            {
              levelOrder: 2,
              requiredRoles: ['교구장'],
              organizationLevel: 'PARENT',
              isRequired: true,
              timeoutHours: 48
            },
            {
              levelOrder: 3,
              requiredRoles: ['시설위원장'],
              organizationLevel: 'ROOT',
              isRequired: true,
              timeoutHours: 72
            },
            {
              levelOrder: 4,
              requiredRoles: ['담임목사'],
              organizationLevel: 'ROOT',
              isRequired: true,
              timeoutHours: 72
            }
          ]
        }
      }
    })

    // 5. 인건비 매트릭스
    await prisma.approvalMatrix.upsert({
      where: {
        id: `${church.id}-personnel`
      },
      update: {},
      create: {
        id: `${church.id}-personnel`,
        name: '인건비',
        description: '급여, 상여금, 복리후생비',
        churchId: church.id,
        category: ApprovalMatrixCategory.SALARY,
        minAmount: 1,
        isActive: true,
        priority: 100,
        createdById: adminUser.id,
        approvalLevels: {
          create: [
            {
              levelOrder: 1,
              requiredRoles: ['총무'],
              organizationLevel: 'ROOT',
              isRequired: true,
              timeoutHours: 48
            },
            {
              levelOrder: 2,
              requiredRoles: ['담임목사'],
              organizationLevel: 'ROOT',
              isRequired: true,
              timeoutHours: 72
            }
          ]
        }
      }
    })

    // 6. 공과금/유지보수비 매트릭스
    await prisma.approvalMatrix.upsert({
      where: {
        id: `${church.id}-utilities`
      },
      update: {},
      create: {
        id: `${church.id}-utilities`,
        name: '공과금/유지보수비',
        description: '전기, 가스, 수도, 통신비 및 일반 유지보수',
        churchId: church.id,
        category: ApprovalMatrixCategory.UTILITIES,
        maxAmount: 1000000,
        isActive: true,
        priority: 60,
        createdById: adminUser.id,
        approvalLevels: {
          create: [
            {
              levelOrder: 1,
              requiredRoles: ['총무'],
              organizationLevel: 'ROOT',
              isRequired: true,
              timeoutHours: 24
            }
          ]
        }
      }
    })

    console.log(`✅ Created approval matrices for church: ${church.name}`)
  }

  console.log('✅ Approval matrix seeding completed!')
}

// 직접 실행 시
if (require.main === module) {
  seedApprovalMatrix()
    .catch((e) => {
      console.error('❌ Error seeding approval matrices:', e)
      process.exit(1)
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}