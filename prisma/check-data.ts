import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkData() {
  console.log('📊 Checking database data...')

  try {
    const church = await prisma.church.findFirst()
    console.log('Church:', church?.name)

    const userCount = await prisma.user.count()
    console.log('Users:', userCount)

    const memberCount = await prisma.member.count()
    console.log('Members:', memberCount)

    const positionCount = await prisma.position.count()
    console.log('Positions:', positionCount)

    const departmentCount = await prisma.department.count()
    console.log('Departments:', departmentCount)

    const offeringCount = await prisma.offering.count()
    console.log('Offerings:', offeringCount)

    const attendanceCount = await prisma.attendance.count()
    console.log('Attendances:', attendanceCount)

    const visitationCount = await prisma.visitation.count()
    console.log('Visitations:', visitationCount)

    const expenseCount = await prisma.expenseReport.count()
    console.log('Expense Reports:', expenseCount)

    const accountCodeCount = await prisma.accountCode.count()
    console.log('Account Codes:', accountCodeCount)

    console.log('\n📈 Recent members:')
    const recentMembers = await prisma.member.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { name: true, email: true, createdAt: true }
    })
    recentMembers.forEach(member => {
      console.log(`  - ${member.name} (${member.email}) - ${member.createdAt.toISOString().split('T')[0]}`)
    })

  } catch (error) {
    console.error('❌ Check failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkData()