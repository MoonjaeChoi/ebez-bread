import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function simpleSeed() {
  console.log('🌱 Starting simple seed...')

  try {
    // 1. 교회 확인/생성
    let church = await prisma.church.findFirst({
      where: { name: '에벤에셀교회' }
    })

    if (!church) {
      church = await prisma.church.create({
        data: {
          name: '에벤에셀교회',
          address: '서울특별시 종로구 세종대로 175',
          phone: '02-1588-1234',
          email: 'info@ebenezer.org',
          pastorName: '김은혜',
          description: '하나님의 은혜로 세상을 변화시키는 교회',
        },
      })
      console.log('✅ Church created:', church.name)
    } else {
      console.log('✅ Church found:', church.name)
    }

    // 2. 계정 코드 데이터만 추가
    console.log('📊 Adding account codes...')
    
    const accountCodes = [
      { code: '1000', name: '헌금수입', type: 'REVENUE' as const },
      { code: '1010', name: '십일조', type: 'REVENUE' as const },
      { code: '1020', name: '주일헌금', type: 'REVENUE' as const },
      { code: '2000', name: '사역비', type: 'EXPENSE' as const },
      { code: '3000', name: '운영비', type: 'EXPENSE' as const },
      { code: '4000', name: '시설비', type: 'EXPENSE' as const },
    ]

    let accountCodeCount = 0
    for (const accountCode of accountCodes) {
      const existing = await prisma.accountCode.findFirst({
        where: { code: accountCode.code }
      })

      if (!existing) {
        await prisma.accountCode.create({
          data: {
            code: accountCode.code,
            name: accountCode.name,
            type: accountCode.type,
            parentId: null,
            level: 1,
            order: parseInt(accountCode.code.padEnd(6, '0')),
            allowTransaction: true,
            isActive: true,
            isSystem: true,
            churchId: null
          }
        })
        accountCodeCount++
      }
    }

    console.log('✅ Account codes added:', accountCodeCount)

    // 3. 추가 교인 5명만 생성
    const users = await prisma.user.findMany({
      where: { churchId: church.id },
      take: 1
    })

    if (users.length === 0) {
      console.log('ℹ️  No users found - basic users needed first')
      return
    }

    const positions = await prisma.position.findMany({
      where: { churchId: church.id }
    })

    const departments = await prisma.department.findMany({
      where: { churchId: church.id }
    })

    if (positions.length === 0 || departments.length === 0) {
      console.log('ℹ️  No positions/departments found - basic data needed first')
      return
    }

    // 추가 교인 5명
    const newMembers = [
      {
        name: '김신규',
        phone: '010-9999-0001',
        email: 'new1@example.com',
        birthDate: new Date('1990-01-01'),
        gender: 'MALE' as const,
        maritalStatus: 'SINGLE' as const,
      },
      {
        name: '이신규',
        phone: '010-9999-0002', 
        email: 'new2@example.com',
        birthDate: new Date('1985-05-15'),
        gender: 'FEMALE' as const,
        maritalStatus: 'MARRIED' as const,
      },
      {
        name: '박신규',
        phone: '010-9999-0003',
        email: 'new3@example.com', 
        birthDate: new Date('1992-08-20'),
        gender: 'MALE' as const,
        maritalStatus: 'SINGLE' as const,
      },
      {
        name: '정신규',
        phone: '010-9999-0004',
        email: 'new4@example.com',
        birthDate: new Date('1988-12-10'),
        gender: 'FEMALE' as const,
        maritalStatus: 'MARRIED' as const,
      },
      {
        name: '최신규',
        phone: '010-9999-0005',
        email: 'new5@example.com',
        birthDate: new Date('1995-03-25'),
        gender: 'MALE' as const,
        maritalStatus: 'SINGLE' as const,
      },
    ]

    let newMemberCount = 0
    for (const memberData of newMembers) {
      const existing = await prisma.member.findFirst({
        where: { 
          email: memberData.email,
          churchId: church.id 
        }
      })

      if (!existing) {
        await prisma.member.create({
          data: {
            ...memberData,
            churchId: church.id,
            positionId: positions[Math.floor(Math.random() * positions.length)].id,
            departmentId: departments[Math.floor(Math.random() * departments.length)].id,
            registrationDate: new Date(),
            status: 'ACTIVE',
          },
        })
        newMemberCount++
      }
    }

    console.log('✅ New members added:', newMemberCount)
    console.log('🎉 Simple seed completed!')

  } catch (error) {
    console.error('❌ Seed failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

simpleSeed()
  .then(() => {
    console.log('✅ Simple seed finished successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Simple seed failed:', error)
    process.exit(1)
  })