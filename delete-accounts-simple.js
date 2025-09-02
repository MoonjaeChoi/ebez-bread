const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function deleteAccounts() {
  try {
    // 비표준 계정코드 목록
    const nonStandardCodes = [
      '1000', '1100', '6000', '6100', '6200', '6300', 
      '6400', '6500', '6600', '6700', '6800', '6900'
    ]

    console.log('🗑️ Deleting non-standard account codes...\n')

    // 직접 삭제 실행
    const result = await prisma.accountCode.deleteMany({
      where: {
        code: { in: nonStandardCodes }
      }
    })

    console.log(`✅ Successfully deleted ${result.count} non-standard account codes.\n`)

    // 삭제 후 확인
    const remaining = await prisma.accountCode.findMany({
      where: {
        code: { in: nonStandardCodes }
      }
    })

    if (remaining.length === 0) {
      console.log('✅ Verification: All non-standard accounts have been deleted.')
    } else {
      console.log(`⚠️ Warning: ${remaining.length} accounts still exist:`)
      remaining.forEach(account => {
        console.log(`  - ${account.code}: ${account.name}`)
      })
    }

    // 최종 계정 수 확인
    const totalAccounts = await prisma.accountCode.count()
    console.log(`\n📊 Total remaining account codes: ${totalAccounts}`)

  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

deleteAccounts()