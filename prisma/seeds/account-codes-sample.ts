import { PrismaClient, AccountType } from '@prisma/client'

const prisma = new PrismaClient()

// K-GAAP 기반 한국 교회 표준 계정과목 샘플 데이터 50개
const sampleAccountCodes = [
  // 1. 자산 (ASSET) - Level 1
  { code: '1000', name: '자산', englishName: 'Assets', type: AccountType.ASSET, level: 1, parentId: null, order: 1, allowTransaction: false },
  
  // 1-1. 유동자산 - Level 2
  { code: '1100', name: '유동자산', englishName: 'Current Assets', type: AccountType.ASSET, level: 2, order: 1, allowTransaction: false },
  { code: '1110', name: '현금및현금성자산', englishName: 'Cash and Cash Equivalents', type: AccountType.ASSET, level: 3, order: 1, allowTransaction: false },
  { code: '1111', name: '현금', englishName: 'Cash', type: AccountType.ASSET, level: 4, order: 1, allowTransaction: true },
  { code: '1112', name: '보통예금', englishName: 'Bank Deposits', type: AccountType.ASSET, level: 4, order: 2, allowTransaction: true },
  { code: '1113', name: '정기예금', englishName: 'Time Deposits', type: AccountType.ASSET, level: 4, order: 3, allowTransaction: true },
  { code: '1114', name: '소액현금', englishName: 'Petty Cash', type: AccountType.ASSET, level: 4, order: 4, allowTransaction: true },
  
  { code: '1120', name: '단기투자자산', englishName: 'Short-term Investments', type: AccountType.ASSET, level: 3, order: 2, allowTransaction: false },
  { code: '1121', name: '단기금융상품', englishName: 'Short-term Financial Products', type: AccountType.ASSET, level: 4, order: 1, allowTransaction: true },
  { code: '1122', name: '주식투자', englishName: 'Stock Investments', type: AccountType.ASSET, level: 4, order: 2, allowTransaction: true },
  
  { code: '1130', name: '미수금', englishName: 'Accounts Receivable', type: AccountType.ASSET, level: 3, order: 3, allowTransaction: false },
  { code: '1131', name: '헌금미수금', englishName: 'Offering Receivables', type: AccountType.ASSET, level: 4, order: 1, allowTransaction: true },
  { code: '1132', name: '기타미수금', englishName: 'Other Receivables', type: AccountType.ASSET, level: 4, order: 2, allowTransaction: true },
  
  // 1-2. 비유동자산 - Level 2
  { code: '1200', name: '비유동자산', englishName: 'Non-current Assets', type: AccountType.ASSET, level: 2, order: 2, allowTransaction: false },
  { code: '1210', name: '유형자산', englishName: 'Property, Plant and Equipment', type: AccountType.ASSET, level: 3, order: 1, allowTransaction: false },
  { code: '1211', name: '토지', englishName: 'Land', type: AccountType.ASSET, level: 4, order: 1, allowTransaction: true },
  { code: '1212', name: '건물', englishName: 'Buildings', type: AccountType.ASSET, level: 4, order: 2, allowTransaction: true },
  { code: '1213', name: '차량운반구', englishName: 'Vehicles', type: AccountType.ASSET, level: 4, order: 3, allowTransaction: true },
  { code: '1214', name: '비품', englishName: 'Furniture and Equipment', type: AccountType.ASSET, level: 4, order: 4, allowTransaction: true },
  { code: '1215', name: '감가상각누계액', englishName: 'Accumulated Depreciation', type: AccountType.ASSET, level: 4, order: 5, allowTransaction: true },
  
  // 2. 부채 (LIABILITY) - Level 1
  { code: '2000', name: '부채', englishName: 'Liabilities', type: AccountType.LIABILITY, level: 1, parentId: null, order: 2, allowTransaction: false },
  
  // 2-1. 유동부채 - Level 2
  { code: '2100', name: '유동부채', englishName: 'Current Liabilities', type: AccountType.LIABILITY, level: 2, order: 1, allowTransaction: false },
  { code: '2110', name: '미지급금', englishName: 'Accounts Payable', type: AccountType.LIABILITY, level: 3, order: 1, allowTransaction: false },
  { code: '2111', name: '매입미지급금', englishName: 'Trade Payables', type: AccountType.LIABILITY, level: 4, order: 1, allowTransaction: true },
  { code: '2112', name: '급여미지급금', englishName: 'Accrued Salaries', type: AccountType.LIABILITY, level: 4, order: 2, allowTransaction: true },
  { code: '2113', name: '기타미지급금', englishName: 'Other Payables', type: AccountType.LIABILITY, level: 4, order: 3, allowTransaction: true },
  
  { code: '2120', name: '예수금', englishName: 'Deposits Received', type: AccountType.LIABILITY, level: 3, order: 2, allowTransaction: false },
  { code: '2121', name: '헌금예수금', englishName: 'Offering Deposits', type: AccountType.LIABILITY, level: 4, order: 1, allowTransaction: true },
  { code: '2122', name: '기타예수금', englishName: 'Other Deposits', type: AccountType.LIABILITY, level: 4, order: 2, allowTransaction: true },
  
  // 3. 자본 (EQUITY) - Level 1
  { code: '3000', name: '자본', englishName: 'Equity', type: AccountType.EQUITY, level: 1, parentId: null, order: 3, allowTransaction: false },
  { code: '3100', name: '기본재산', englishName: 'Basic Property', type: AccountType.EQUITY, level: 2, order: 1, allowTransaction: false },
  { code: '3110', name: '기본재산금', englishName: 'Basic Property Fund', type: AccountType.EQUITY, level: 3, order: 1, allowTransaction: true },
  { code: '3200', name: '적립금', englishName: 'Reserves', type: AccountType.EQUITY, level: 2, order: 2, allowTransaction: false },
  { code: '3210', name: '건축적립금', englishName: 'Building Reserve', type: AccountType.EQUITY, level: 3, order: 1, allowTransaction: true },
  { code: '3220', name: '선교적립금', englishName: 'Mission Reserve', type: AccountType.EQUITY, level: 3, order: 2, allowTransaction: true },
  
  // 4. 수익 (REVENUE) - Level 1
  { code: '4000', name: '수익', englishName: 'Revenue', type: AccountType.REVENUE, level: 1, parentId: null, order: 4, allowTransaction: false },
  { code: '4100', name: '헌금수입', englishName: 'Offering Income', type: AccountType.REVENUE, level: 2, order: 1, allowTransaction: false },
  { code: '4110', name: '십일조', englishName: 'Tithe', type: AccountType.REVENUE, level: 3, order: 1, allowTransaction: true },
  { code: '4120', name: '주일헌금', englishName: 'Sunday Offering', type: AccountType.REVENUE, level: 3, order: 2, allowTransaction: true },
  { code: '4130', name: '감사헌금', englishName: 'Thanksgiving Offering', type: AccountType.REVENUE, level: 3, order: 3, allowTransaction: true },
  { code: '4140', name: '건축헌금', englishName: 'Building Fund', type: AccountType.REVENUE, level: 3, order: 4, allowTransaction: true },
  { code: '4150', name: '선교헌금', englishName: 'Mission Fund', type: AccountType.REVENUE, level: 3, order: 5, allowTransaction: true },
  
  { code: '4200', name: '기타수익', englishName: 'Other Revenue', type: AccountType.REVENUE, level: 2, order: 2, allowTransaction: false },
  { code: '4210', name: '이자수익', englishName: 'Interest Income', type: AccountType.REVENUE, level: 3, order: 1, allowTransaction: true },
  { code: '4220', name: '임대수익', englishName: 'Rental Income', type: AccountType.REVENUE, level: 3, order: 2, allowTransaction: true },
  
  // 5. 비용 (EXPENSE) - Level 1
  { code: '5000', name: '비용', englishName: 'Expenses', type: AccountType.EXPENSE, level: 1, parentId: null, order: 5, allowTransaction: false },
  { code: '5100', name: '사역비', englishName: 'Ministry Expenses', type: AccountType.EXPENSE, level: 2, order: 1, allowTransaction: false },
  { code: '5110', name: '목회비', englishName: 'Pastoral Expenses', type: AccountType.EXPENSE, level: 3, order: 1, allowTransaction: true },
  { code: '5120', name: '교육비', englishName: 'Education Expenses', type: AccountType.EXPENSE, level: 3, order: 2, allowTransaction: true },
  { code: '5130', name: '선교비', englishName: 'Mission Expenses', type: AccountType.EXPENSE, level: 3, order: 3, allowTransaction: true },
  { code: '5140', name: '전도비', englishName: 'Evangelism Expenses', type: AccountType.EXPENSE, level: 3, order: 4, allowTransaction: true },
  
  { code: '5200', name: '운영비', englishName: 'Operating Expenses', type: AccountType.EXPENSE, level: 2, order: 2, allowTransaction: false },
  { code: '5210', name: '급여', englishName: 'Salaries', type: AccountType.EXPENSE, level: 3, order: 1, allowTransaction: true },
  { code: '5220', name: '복리후생비', englishName: 'Employee Benefits', type: AccountType.EXPENSE, level: 3, order: 2, allowTransaction: true }
]

async function main() {
  console.log('🌱 회계 계정과목 샘플 데이터 시드 시작...')
  
  // 교회 찾기
  const church = await prisma.church.findFirst({
    where: { name: '에벤에셀교회' }
  })
  
  if (!church) {
    console.error('❌ 에벤에셀교회를 찾을 수 없습니다.')
    return
  }
  
  console.log(`🏛️  교회 ID: ${church.id} - ${church.name}`)
  
  // 기존 계정과목 데이터 삭제 (선택사항)
  await prisma.accountCode.deleteMany({
    where: { churchId: church.id }
  })
  console.log('🗑️  기존 계정과목 데이터 삭제 완료')
  
  // 부모-자식 관계를 올바르게 설정하기 위해 레벨별로 생성
  const createdAccounts: { [key: string]: string } = {}
  let totalCreated = 0
  
  // Level 1 계정 먼저 생성
  console.log('📊 Level 1 계정과목 생성 중...')
  for (const accountData of sampleAccountCodes.filter(acc => acc.level === 1)) {
    try {
      const account = await prisma.accountCode.create({
        data: {
          ...accountData,
          churchId: church.id
        }
      })
      createdAccounts[account.code] = account.id
      console.log(`  ✅ ${account.code}: ${account.name}`)
      totalCreated++
    } catch (error) {
      console.error(`  ❌ ${accountData.code} 생성 실패:`, error)
    }
  }
  
  // Level 2 계정 생성 (부모 관계 설정)
  console.log('📊 Level 2 계정과목 생성 중...')
  for (const accountData of sampleAccountCodes.filter(acc => acc.level === 2)) {
    try {
      const parentCode = accountData.code.substring(0, 1) + '000'
      const parentId = createdAccounts[parentCode]
      
      const account = await prisma.accountCode.create({
        data: {
          ...accountData,
          parentId,
          churchId: church.id
        }
      })
      createdAccounts[account.code] = account.id
      console.log(`  ✅ ${account.code}: ${account.name}`)
      totalCreated++
    } catch (error) {
      console.error(`  ❌ ${accountData.code} 생성 실패:`, error)
    }
  }
  
  // Level 3 계정 생성
  console.log('📊 Level 3 계정과목 생성 중...')
  for (const accountData of sampleAccountCodes.filter(acc => acc.level === 3)) {
    try {
      const parentCode = accountData.code.substring(0, 2) + '00'
      const parentId = createdAccounts[parentCode]
      
      const account = await prisma.accountCode.create({
        data: {
          ...accountData,
          parentId,
          churchId: church.id
        }
      })
      createdAccounts[account.code] = account.id
      console.log(`  ✅ ${account.code}: ${account.name}`)
      totalCreated++
    } catch (error) {
      console.error(`  ❌ ${accountData.code} 생성 실패:`, error)
    }
  }
  
  // Level 4 계정 생성
  console.log('📊 Level 4 계정과목 생성 중...')
  for (const accountData of sampleAccountCodes.filter(acc => acc.level === 4)) {
    try {
      const parentCode = accountData.code.substring(0, 3) + '0'
      const parentId = createdAccounts[parentCode]
      
      const account = await prisma.accountCode.create({
        data: {
          ...accountData,
          parentId,
          churchId: church.id
        }
      })
      createdAccounts[account.code] = account.id
      console.log(`  ✅ ${account.code}: ${account.name}`)
      totalCreated++
    } catch (error) {
      console.error(`  ❌ ${accountData.code} 생성 실패:`, error)
    }
  }
  
  console.log(`\n📈 계정과목 생성 완료!`)
  console.log(`레벨별 생성 현황:`)
  console.log(`  LEVEL_1: ${sampleAccountCodes.filter(acc => acc.level === 1).length}개`)
  console.log(`  LEVEL_2: ${sampleAccountCodes.filter(acc => acc.level === 2).length}개`)
  console.log(`  LEVEL_3: ${sampleAccountCodes.filter(acc => acc.level === 3).length}개`)
  console.log(`  LEVEL_4: ${sampleAccountCodes.filter(acc => acc.level === 4).length}개`)
  console.log(`\n🎉 총 ${totalCreated}개 계정과목이 성공적으로 생성되었습니다!`)
}

main()
  .catch((e) => {
    console.error('❌ 시드 실행 중 오류:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })