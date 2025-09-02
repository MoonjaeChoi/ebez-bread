const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkAccountCodes() {
  try {
    console.log('🔍 Checking account codes for format compliance...\n')
    
    // 모든 계정코드 조회
    const allAccounts = await prisma.accountCode.findMany({
      orderBy: { code: 'asc' },
      select: {
        id: true,
        code: true,
        name: true,
        englishName: true,
        type: true,
        level: true,
        isSystem: true,
        churchId: true,
        createdAt: true
      }
    })

    console.log(`📊 Total account codes found: ${allAccounts.length}\n`)
    
    // 표준 형식 패턴 정의
    const standardPatterns = [
      /^[1-5]$/,                    // Level 1: 1, 2, 3, 4, 5
      /^[1-5]-\d{2}$/,              // Level 2: 1-11, 2-21, etc.
      /^[1-5]-\d{2}-\d{2}$/,        // Level 3: 1-11-01, 2-21-01, etc.
      /^[1-5]-\d{2}-\d{2}-\d{2}$/   // Level 4: 1-11-01-01, 2-21-01-01, etc.
    ]
    
    // 비표준 코드들 분류
    const nonStandardCodes = []
    const standardCodes = []
    
    allAccounts.forEach(account => {
      const isStandard = standardPatterns.some(pattern => pattern.test(account.code))
      
      if (isStandard) {
        standardCodes.push(account)
      } else {
        nonStandardCodes.push(account)
      }
    })
    
    // 비표준 코드들 출력
    if (nonStandardCodes.length > 0) {
      console.log(`❌ NON-STANDARD ACCOUNT CODES (${nonStandardCodes.length}):\n`)
      
      nonStandardCodes.forEach(account => {
        console.log(`Code: ${account.code}`)
        console.log(`Name: ${account.name} (${account.englishName || 'N/A'})`)
        console.log(`Type: ${account.type}`)
        console.log(`Level: ${account.level}`)
        console.log(`System: ${account.isSystem}`)
        console.log(`Church: ${account.churchId || 'System'}`)
        console.log(`Created: ${account.createdAt.toISOString().split('T')[0]}`)
        console.log(`---`)
      })
    }
    
    // 표준 코드들도 간단히 출력
    console.log(`\n✅ STANDARD ACCOUNT CODES (${standardCodes.length}):\n`)
    
    // Level별로 그룹화
    const byLevel = {}
    standardCodes.forEach(account => {
      const level = account.level || 'Unknown'
      if (!byLevel[level]) byLevel[level] = []
      byLevel[level].push(account)
    })
    
    Object.keys(byLevel).sort().forEach(level => {
      console.log(`Level ${level}: ${byLevel[level].length} codes`)
      byLevel[level].forEach(account => {
        console.log(`  ${account.code} - ${account.name}`)
      })
      console.log('')
    })
    
    // 통계 요약
    console.log(`📈 SUMMARY:`)
    console.log(`   Total Codes: ${allAccounts.length}`)
    console.log(`   Standard Format: ${standardCodes.length}`)
    console.log(`   Non-Standard Format: ${nonStandardCodes.length}`)
    console.log(`   System Codes: ${allAccounts.filter(a => a.isSystem).length}`)
    console.log(`   Church Codes: ${allAccounts.filter(a => !a.isSystem).length}`)
    
  } catch (error) {
    console.error('❌ Error checking account codes:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkAccountCodes()