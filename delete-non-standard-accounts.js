const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// 비표준 계정코드 목록
const nonStandardCodes = [
  '1000', '1100', '6000', '6100', '6200', '6300', 
  '6400', '6500', '6600', '6700', '6800', '6900'
]

async function deleteNonStandardAccounts() {
  try {
    console.log('🔍 Checking for transactions referencing non-standard accounts...\n')
    
    // 1. 비표준 계정코드들의 ID 조회
    const accountsToDelete = await prisma.accountCode.findMany({
      where: {
        code: { in: nonStandardCodes }
      },
      select: {
        id: true,
        code: true,
        name: true
      }
    })

    console.log(`Found ${accountsToDelete.length} non-standard accounts to delete:`)
    accountsToDelete.forEach(account => {
      console.log(`  - ${account.code}: ${account.name}`)
    })
    console.log('')

    if (accountsToDelete.length === 0) {
      console.log('❌ No non-standard accounts found to delete.')
      return
    }

    const accountIds = accountsToDelete.map(a => a.id)

    // 2. 이 계정들을 참조하는 거래 확인
    const referencingTransactions = await prisma.transaction.findMany({
      where: {
        OR: [
          { debitAccountId: { in: accountIds } },
          { creditAccountId: { in: accountIds } }
        ]
      },
      select: {
        id: true,
        description: true,
        amount: true,
        debitAccountId: true,
        creditAccountId: true,
        debitAccount: {
          select: { code: true, name: true }
        },
        creditAccount: {
          select: { code: true, name: true }
        }
      }
    })

    if (referencingTransactions.length > 0) {
      console.log(`❌ WARNING: Found ${referencingTransactions.length} transactions referencing these accounts:`)
      referencingTransactions.forEach(tx => {
        console.log(`  Transaction: ${tx.description} (₩${tx.amount.toLocaleString()})`)
        console.log(`    Debit: ${tx.debitAccount.code} - ${tx.debitAccount.name}`)
        console.log(`    Credit: ${tx.creditAccount.code} - ${tx.creditAccount.name}`)
      })
      console.log('\n⚠️  Cannot safely delete accounts with existing transactions.')
      console.log('Please handle these transactions first or contact admin.')
      return
    }

    // 3. BudgetItem에는 accountCodeId 필드가 없으므로 스킵
    console.log('ℹ️  BudgetItem does not reference account codes directly. Skipping budget check.')

    // 4. 안전하게 삭제 진행
    console.log('✅ No transactions or budget items reference these accounts. Safe to delete.\n')
    
    // 트랜잭션으로 일괄 삭제
    const deleteResult = await prisma.$transaction(async (tx) => {
      const deleted = await tx.accountCode.deleteMany({
        where: {
          code: { in: nonStandardCodes }
        }
      })
      return deleted
    })

    console.log(`🗑️  Successfully deleted ${deleteResult.count} non-standard account codes.\n`)

    // 5. 삭제 후 확인
    const remainingNonStandard = await prisma.accountCode.findMany({
      where: {
        code: { in: nonStandardCodes }
      }
    })

    if (remainingNonStandard.length === 0) {
      console.log('✅ Verification: All non-standard accounts have been successfully deleted.')
    } else {
      console.log(`❌ Warning: ${remainingNonStandard.length} accounts were not deleted:`)
      remainingNonStandard.forEach(account => {
        console.log(`  - ${account.code}: ${account.name}`)
      })
    }

    // 6. 최종 통계
    const totalAccounts = await prisma.accountCode.count()
    console.log(`\n📊 Final Statistics:`)
    console.log(`   Total remaining account codes: ${totalAccounts}`)
    
  } catch (error) {
    console.error('❌ Error during deletion process:', error)
  } finally {
    await prisma.$disconnect()
  }
}

deleteNonStandardAccounts()