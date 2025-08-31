import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting accounting and budget system seed...')

  // 1. 교회 조회
  const church = await prisma.church.findFirst({
    where: { name: '과천교회' }
  })

  if (!church) {
    throw new Error('교회 데이터를 찾을 수 없습니다. 먼저 기본 시드를 실행해주세요.')
  }

  console.log('✅ Church found:', church.name)

  // 2. 한국 표준 회계계정 (4단계 계층구조)
  console.log('📊 Creating Korean standard account codes...')
  
  const standardAccountCodes = [
    // 1. 자산 (ASSET)
    // 관 (Level 1)
    { code: '1', name: '자산', englishName: 'Assets', type: 'ASSET', level: 1, parentId: null, isSystem: true, order: 1000 },
    
    // 항목 (Level 2)  
    { code: '1-11', name: '유동자산', englishName: 'Current Assets', type: 'ASSET', level: 2, parentCode: '1', isSystem: true, order: 1100 },
    { code: '1-12', name: '고정자산', englishName: 'Fixed Assets', type: 'ASSET', level: 2, parentCode: '1', isSystem: true, order: 1200 },
    { code: '1-13', name: '기타자산', englishName: 'Other Assets', type: 'ASSET', level: 2, parentCode: '1', isSystem: true, order: 1300 },
    
    // 세목 (Level 3) - 유동자산
    { code: '1-11-01', name: '현금', englishName: 'Cash', type: 'ASSET', level: 3, parentCode: '1-11', isSystem: true, order: 1101 },
    { code: '1-11-02', name: '예금', englishName: 'Bank Deposits', type: 'ASSET', level: 3, parentCode: '1-11', isSystem: true, order: 1102 },
    { code: '1-11-03', name: '미수금', englishName: 'Accounts Receivable', type: 'ASSET', level: 3, parentCode: '1-11', isSystem: true, order: 1103 },
    { code: '1-11-04', name: '선급금', englishName: 'Prepaid Expenses', type: 'ASSET', level: 3, parentCode: '1-11', isSystem: true, order: 1104 },
    
    // 세세목 (Level 4) - 현금
    { code: '1-11-01-01', name: '현금', englishName: 'Cash on Hand', type: 'ASSET', level: 4, parentCode: '1-11-01', isSystem: true, order: 110101 },
    { code: '1-11-01-02', name: '소액현금', englishName: 'Petty Cash', type: 'ASSET', level: 4, parentCode: '1-11-01', isSystem: true, order: 110102 },
    
    // 세세목 (Level 4) - 예금
    { code: '1-11-02-01', name: '보통예금', englishName: 'Savings Account', type: 'ASSET', level: 4, parentCode: '1-11-02', isSystem: true, order: 110201 },
    { code: '1-11-02-02', name: '정기예금', englishName: 'Time Deposit', type: 'ASSET', level: 4, parentCode: '1-11-02', isSystem: true, order: 110202 },
    { code: '1-11-02-03', name: '적금', englishName: 'Installment Savings', type: 'ASSET', level: 4, parentCode: '1-11-02', isSystem: true, order: 110203 },
    
    // 세목 (Level 3) - 고정자산
    { code: '1-12-01', name: '토지', englishName: 'Land', type: 'ASSET', level: 3, parentCode: '1-12', isSystem: true, order: 1201 },
    { code: '1-12-02', name: '건물', englishName: 'Buildings', type: 'ASSET', level: 3, parentCode: '1-12', isSystem: true, order: 1202 },
    { code: '1-12-03', name: '집기비품', englishName: 'Furniture & Fixtures', type: 'ASSET', level: 3, parentCode: '1-12', isSystem: true, order: 1203 },
    
    // 세세목 (Level 4) - 토지
    { code: '1-12-01-01', name: '교회부지', englishName: 'Church Land', type: 'ASSET', level: 4, parentCode: '1-12-01', isSystem: true, order: 120101 },
    { code: '1-12-01-02', name: '기타토지', englishName: 'Other Land', type: 'ASSET', level: 4, parentCode: '1-12-01', isSystem: true, order: 120102 },
    
    // 세세목 (Level 4) - 건물
    { code: '1-12-02-01', name: '교회건물', englishName: 'Church Building', type: 'ASSET', level: 4, parentCode: '1-12-02', isSystem: true, order: 120201 },
    { code: '1-12-02-02', name: '부속건물', englishName: 'Auxiliary Buildings', type: 'ASSET', level: 4, parentCode: '1-12-02', isSystem: true, order: 120202 },
    
    // 2. 부채 (LIABILITY)
    // 관 (Level 1)
    { code: '2', name: '부채', englishName: 'Liabilities', type: 'LIABILITY', level: 1, parentId: null, isSystem: true, order: 2000 },
    
    // 항목 (Level 2)
    { code: '2-21', name: '유동부채', englishName: 'Current Liabilities', type: 'LIABILITY', level: 2, parentCode: '2', isSystem: true, order: 2100 },
    { code: '2-22', name: '고정부채', englishName: 'Long-term Liabilities', type: 'LIABILITY', level: 2, parentCode: '2', isSystem: true, order: 2200 },
    
    // 세목 (Level 3) - 유동부채
    { code: '2-21-01', name: '미지급금', englishName: 'Accounts Payable', type: 'LIABILITY', level: 3, parentCode: '2-21', isSystem: true, order: 2101 },
    { code: '2-21-02', name: '예수금', englishName: 'Deposits Received', type: 'LIABILITY', level: 3, parentCode: '2-21', isSystem: true, order: 2102 },
    
    // 세세목 (Level 4) - 미지급금
    { code: '2-21-01-01', name: '미지급비용', englishName: 'Accrued Expenses', type: 'LIABILITY', level: 4, parentCode: '2-21-01', isSystem: true, order: 210101 },
    { code: '2-21-01-02', name: '미지급금', englishName: 'Accounts Payable', type: 'LIABILITY', level: 4, parentCode: '2-21-01', isSystem: true, order: 210102 },
    
    // 3. 자본 (EQUITY)
    // 관 (Level 1)
    { code: '3', name: '자본', englishName: 'Equity', type: 'EQUITY', level: 1, parentId: null, isSystem: true, order: 3000 },
    
    // 항목 (Level 2)
    { code: '3-31', name: '기본재산', englishName: 'Basic Property', type: 'EQUITY', level: 2, parentCode: '3', isSystem: true, order: 3100 },
    { code: '3-32', name: '보통재산', englishName: 'General Property', type: 'EQUITY', level: 2, parentCode: '3', isSystem: true, order: 3200 },
    { code: '3-33', name: '목적사업준비금', englishName: 'Purpose Project Reserve', type: 'EQUITY', level: 2, parentCode: '3', isSystem: true, order: 3300 },
    
    // 세목 (Level 3) - 기본재산
    { code: '3-31-01', name: '설립기금', englishName: 'Foundation Fund', type: 'EQUITY', level: 3, parentCode: '3-31', isSystem: true, order: 3101 },
    { code: '3-31-02', name: '건축기금', englishName: 'Building Fund', type: 'EQUITY', level: 3, parentCode: '3-31', isSystem: true, order: 3102 },
    
    // 4. 수익 (REVENUE)
    // 관 (Level 1)
    { code: '4', name: '수익', englishName: 'Revenue', type: 'REVENUE', level: 1, parentId: null, isSystem: true, order: 4000 },
    
    // 항목 (Level 2)
    { code: '4-41', name: '헌금수익', englishName: 'Offering Revenue', type: 'REVENUE', level: 2, parentCode: '4', isSystem: true, order: 4100 },
    { code: '4-42', name: '사업수익', englishName: 'Business Revenue', type: 'REVENUE', level: 2, parentCode: '4', isSystem: true, order: 4200 },
    { code: '4-43', name: '기타수익', englishName: 'Other Revenue', type: 'REVENUE', level: 2, parentCode: '4', isSystem: true, order: 4300 },
    
    // 세목 (Level 3) - 헌금수익
    { code: '4-41-01', name: '십일조', englishName: 'Tithe', type: 'REVENUE', level: 3, parentCode: '4-41', isSystem: true, order: 4101 },
    { code: '4-41-02', name: '주일헌금', englishName: 'Sunday Offering', type: 'REVENUE', level: 3, parentCode: '4-41', isSystem: true, order: 4102 },
    { code: '4-41-03', name: '감사헌금', englishName: 'Thanksgiving Offering', type: 'REVENUE', level: 3, parentCode: '4-41', isSystem: true, order: 4103 },
    { code: '4-41-04', name: '특별헌금', englishName: 'Special Offering', type: 'REVENUE', level: 3, parentCode: '4-41', isSystem: true, order: 4104 },
    { code: '4-41-05', name: '선교헌금', englishName: 'Mission Offering', type: 'REVENUE', level: 3, parentCode: '4-41', isSystem: true, order: 4105 },
    { code: '4-41-06', name: '건축헌금', englishName: 'Building Offering', type: 'REVENUE', level: 3, parentCode: '4-41', isSystem: true, order: 4106 },
    
    // 세세목 (Level 4) - 십일조
    { code: '4-41-01-01', name: '개인십일조', englishName: 'Individual Tithe', type: 'REVENUE', level: 4, parentCode: '4-41-01', isSystem: true, order: 410101 },
    { code: '4-41-01-02', name: '가족십일조', englishName: 'Family Tithe', type: 'REVENUE', level: 4, parentCode: '4-41-01', isSystem: true, order: 410102 },
    
    // 세세목 (Level 4) - 주일헌금
    { code: '4-41-02-01', name: '대예배헌금', englishName: 'Main Service Offering', type: 'REVENUE', level: 4, parentCode: '4-41-02', isSystem: true, order: 410201 },
    { code: '4-41-02-02', name: '저녁예배헌금', englishName: 'Evening Service Offering', type: 'REVENUE', level: 4, parentCode: '4-41-02', isSystem: true, order: 410202 },
    
    // 세목 (Level 3) - 사업수익
    { code: '4-42-01', name: '임대료수익', englishName: 'Rental Income', type: 'REVENUE', level: 3, parentCode: '4-42', isSystem: true, order: 4201 },
    { code: '4-42-02', name: '교육비수익', englishName: 'Education Fee Income', type: 'REVENUE', level: 3, parentCode: '4-42', isSystem: true, order: 4202 },
    
    // 세목 (Level 3) - 기타수익
    { code: '4-43-01', name: '이자수익', englishName: 'Interest Income', type: 'REVENUE', level: 3, parentCode: '4-43', isSystem: true, order: 4301 },
    { code: '4-43-02', name: '기부금수익', englishName: 'Donation Income', type: 'REVENUE', level: 3, parentCode: '4-43', isSystem: true, order: 4302 },
    
    // 5. 비용 (EXPENSE)
    // 관 (Level 1)
    { code: '5', name: '비용', englishName: 'Expenses', type: 'EXPENSE', level: 1, parentId: null, isSystem: true, order: 5000 },
    
    // 항목 (Level 2)
    { code: '5-51', name: '인건비', englishName: 'Personnel Expenses', type: 'EXPENSE', level: 2, parentCode: '5', isSystem: true, order: 5100 },
    { code: '5-52', name: '관리비', englishName: 'Administrative Expenses', type: 'EXPENSE', level: 2, parentCode: '5', isSystem: true, order: 5200 },
    { code: '5-53', name: '사업비', englishName: 'Program Expenses', type: 'EXPENSE', level: 2, parentCode: '5', isSystem: true, order: 5300 },
    { code: '5-54', name: '기타비용', englishName: 'Other Expenses', type: 'EXPENSE', level: 2, parentCode: '5', isSystem: true, order: 5400 },
    
    // 세목 (Level 3) - 인건비
    { code: '5-51-01', name: '목회자사례비', englishName: 'Pastor Salary', type: 'EXPENSE', level: 3, parentCode: '5-51', isSystem: true, order: 5101 },
    { code: '5-51-02', name: '직원급여', englishName: 'Staff Salary', type: 'EXPENSE', level: 3, parentCode: '5-51', isSystem: true, order: 5102 },
    { code: '5-51-03', name: '사회보험료', englishName: 'Social Insurance', type: 'EXPENSE', level: 3, parentCode: '5-51', isSystem: true, order: 5103 },
    
    // 세세목 (Level 4) - 목회자사례비
    { code: '5-51-01-01', name: '담임목사사례비', englishName: 'Senior Pastor Salary', type: 'EXPENSE', level: 4, parentCode: '5-51-01', isSystem: true, order: 510101 },
    { code: '5-51-01-02', name: '부목사사례비', englishName: 'Associate Pastor Salary', type: 'EXPENSE', level: 4, parentCode: '5-51-01', isSystem: true, order: 510102 },
    { code: '5-51-01-03', name: '전도사사례비', englishName: 'Evangelist Salary', type: 'EXPENSE', level: 4, parentCode: '5-51-01', isSystem: true, order: 510103 },
    
    // 세목 (Level 3) - 관리비
    { code: '5-52-01', name: '공과금', englishName: 'Utilities', type: 'EXPENSE', level: 3, parentCode: '5-52', isSystem: true, order: 5201 },
    { code: '5-52-02', name: '통신비', englishName: 'Communication Expenses', type: 'EXPENSE', level: 3, parentCode: '5-52', isSystem: true, order: 5202 },
    { code: '5-52-03', name: '사무용품비', englishName: 'Office Supplies', type: 'EXPENSE', level: 3, parentCode: '5-52', isSystem: true, order: 5203 },
    { code: '5-52-04', name: '수선비', englishName: 'Repair & Maintenance', type: 'EXPENSE', level: 3, parentCode: '5-52', isSystem: true, order: 5204 },
    
    // 세세목 (Level 4) - 공과금
    { code: '5-52-01-01', name: '전기료', englishName: 'Electricity', type: 'EXPENSE', level: 4, parentCode: '5-52-01', isSystem: true, order: 520101 },
    { code: '5-52-01-02', name: '가스료', englishName: 'Gas', type: 'EXPENSE', level: 4, parentCode: '5-52-01', isSystem: true, order: 520102 },
    { code: '5-52-01-03', name: '수도료', englishName: 'Water', type: 'EXPENSE', level: 4, parentCode: '5-52-01', isSystem: true, order: 520103 },
    
    // 세목 (Level 3) - 사업비
    { code: '5-53-01', name: '선교비', englishName: 'Mission Expenses', type: 'EXPENSE', level: 3, parentCode: '5-53', isSystem: true, order: 5301 },
    { code: '5-53-02', name: '교육비', englishName: 'Education Expenses', type: 'EXPENSE', level: 3, parentCode: '5-53', isSystem: true, order: 5302 },
    { code: '5-53-03', name: '복지비', englishName: 'Welfare Expenses', type: 'EXPENSE', level: 3, parentCode: '5-53', isSystem: true, order: 5303 },
    { code: '5-53-04', name: '전도비', englishName: 'Evangelism Expenses', type: 'EXPENSE', level: 3, parentCode: '5-53', isSystem: true, order: 5304 },
    { code: '5-53-05', name: '행사비', englishName: 'Event Expenses', type: 'EXPENSE', level: 3, parentCode: '5-53', isSystem: true, order: 5305 },
    
    // 세세목 (Level 4) - 선교비
    { code: '5-53-01-01', name: '해외선교비', englishName: 'Overseas Mission', type: 'EXPENSE', level: 4, parentCode: '5-53-01', isSystem: true, order: 530101 },
    { code: '5-53-01-02', name: '국내선교비', englishName: 'Domestic Mission', type: 'EXPENSE', level: 4, parentCode: '5-53-01', isSystem: true, order: 530102 },
    { code: '5-53-01-03', name: '선교사후원비', englishName: 'Missionary Support', type: 'EXPENSE', level: 4, parentCode: '5-53-01', isSystem: true, order: 530103 },
    
    // 세세목 (Level 4) - 교육비
    { code: '5-53-02-01', name: '교재비', englishName: 'Educational Materials', type: 'EXPENSE', level: 4, parentCode: '5-53-02', isSystem: true, order: 530201 },
    { code: '5-53-02-02', name: '강사비', englishName: 'Instructor Fees', type: 'EXPENSE', level: 4, parentCode: '5-53-02', isSystem: true, order: 530202 },
    { code: '5-53-02-03', name: '교육교통비', englishName: 'Education Transportation', type: 'EXPENSE', level: 4, parentCode: '5-53-02', isSystem: true, order: 530203 },
  ]

  // 계정코드 생성 및 계층구조 설정
  const accountCodeMap = new Map<string, string>() // code -> id 매핑
  
  // Level 1 (관) 먼저 생성
  for (const account of standardAccountCodes.filter(a => a.level === 1)) {
    const existing = await prisma.accountCode.findFirst({
      where: { code: account.code, churchId: null }
    })

    if (!existing) {
      const created = await prisma.accountCode.create({
        data: {
          code: account.code,
          name: account.name,
          englishName: account.englishName,
          type: account.type as any,
          level: account.level,
          parentId: null,
          isActive: true,
          isSystem: account.isSystem,
          allowTransaction: account.level === 4, // 세세목만 거래 입력 가능
          order: account.order,
          churchId: null, // 시스템 기본계정
        }
      })
      accountCodeMap.set(account.code, created.id)
      console.log(`  ✓ Created Level 1: ${account.code} - ${account.name}`)
    } else {
      accountCodeMap.set(account.code, existing.id)
    }
  }

  // Level 2-4 순차적으로 생성
  for (let level = 2; level <= 4; level++) {
    for (const account of standardAccountCodes.filter(a => a.level === level)) {
      const existing = await prisma.accountCode.findFirst({
        where: { code: account.code, churchId: null }
      })

      if (!existing) {
        const parentId = account.parentCode ? accountCodeMap.get(account.parentCode) : null
        
        const created = await prisma.accountCode.create({
          data: {
            code: account.code,
            name: account.name,
            englishName: account.englishName,
            type: account.type as any,
            level: account.level,
            parentId,
            isActive: true,
            isSystem: account.isSystem,
            allowTransaction: account.level === 4, // 세세목만 거래 입력 가능
            order: account.order,
            churchId: null, // 시스템 기본계정
          }
        })
        accountCodeMap.set(account.code, created.id)
        console.log(`  ✓ Created Level ${level}: ${account.code} - ${account.name}`)
      } else {
        accountCodeMap.set(account.code, existing.id)
      }
    }
  }

  console.log('✅ Korean standard account codes created:', accountCodeMap.size)

  // 3. 예산 관리자 및 부서 예산 담당자 역할 추가
  console.log('📊 Creating budget managers...')
  
  const budgetUsers = [
    {
      email: 'budget@ebenezer.org',
      name: '예산관리자',
      phone: '010-7890-1234',
      role: 'BUDGET_MANAGER' as const,
    },
    {
      email: 'dept.budget@ebenezer.org',
      name: '부서예산담당',
      phone: '010-8901-2345',
      role: 'DEPARTMENT_BUDGET' as const,
    }
  ]

  const createdBudgetUsers = []
  for (const userData of budgetUsers) {
    let user = await prisma.user.findUnique({
      where: { email: userData.email }
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          ...userData,
          churchId: church.id,
        }
      })
      createdBudgetUsers.push(user)
      console.log(`  ✓ Created budget user: ${user.name} (${user.role})`)
    } else {
      createdBudgetUsers.push(user)
    }
  }

  // 4. 부서별 예산 담당자 설정
  const departments = await prisma.department.findMany({
    where: { churchId: church.id }
  })

  if (departments.length > 0) {
    const budgetManager = createdBudgetUsers.find(u => u.role === 'DEPARTMENT_BUDGET')
    
    // 몇 개 부서에 예산 담당자 배정
    const targetDepartments = departments.slice(0, 3) // 처음 3개 부서
    
    for (const dept of targetDepartments) {
      await prisma.department.update({
        where: { id: dept.id },
        data: { budgetManagerId: budgetManager?.id }
      })
      console.log(`  ✓ Assigned budget manager to: ${dept.name}`)
    }
  }

  // 5. 테스트용 예산 데이터 생성
  console.log('📊 Creating sample budget data...')
  
  if (departments.length > 0) {
    const mainBudgetManager = createdBudgetUsers.find(u => u.role === 'BUDGET_MANAGER')
    
    // 2025년 부서별 예산 생성
    const sampleBudgets = [
      {
        name: '2025년 교육부 예산',
        year: 2025,
        departmentId: departments[0].id,
        totalAmount: 50000000, // 5천만원
        description: '2025년 교육부 운영 및 사업 예산',
        items: [
          { name: '교재구입비', amount: 15000000, category: 'EDUCATION', description: '각종 교육 교재 및 자료 구입' },
          { name: '강사비', amount: 20000000, category: 'EDUCATION', description: '외부 강사 초청 및 강의료' },
          { name: '교육행사비', amount: 10000000, category: 'EVENT', description: '교육 관련 행사 및 체험활동' },
          { name: '사무용품비', amount: 3000000, category: 'MANAGEMENT', description: '교육부 사무용품 및 소모품' },
          { name: '교통비', amount: 2000000, category: 'MANAGEMENT', description: '교육 관련 교통비 및 차량비' },
        ]
      },
      {
        name: '2025년 선교부 예산',
        year: 2025,
        departmentId: departments[1].id,
        totalAmount: 80000000, // 8천만원
        description: '2025년 선교부 국내외 선교 사역 예산',
        items: [
          { name: '해외선교비', amount: 40000000, category: 'MISSION', description: '해외 선교사 후원 및 파송' },
          { name: '국내선교비', amount: 25000000, category: 'MISSION', description: '국내 선교 활동 및 전도' },
          { name: '선교행사비', amount: 10000000, category: 'EVENT', description: '선교 관련 행사 및 집회' },
          { name: '선교자료비', amount: 3000000, category: 'EDUCATION', description: '선교 교육 자료 및 홍보물' },
          { name: '기타선교비', amount: 2000000, category: 'OTHER', description: '기타 선교 관련 경비' },
        ]
      },
      {
        name: '2025년 청년부 예산',
        year: 2025,
        departmentId: departments[2].id,
        totalAmount: 30000000, // 3천만원
        description: '2025년 청년부 활동 및 사역 예산',
        items: [
          { name: '청년수련회비', amount: 15000000, category: 'EVENT', description: '연간 청년 수련회 및 캠프' },
          { name: '소그룹활동비', amount: 8000000, category: 'WELFARE', description: '소그룹 모임 및 활동비' },
          { name: '청년선교비', amount: 4000000, category: 'MISSION', description: '청년 전도 및 선교 활동' },
          { name: '교제비', amount: 2000000, category: 'WELFARE', description: '청년 교제 및 친교 활동' },
          { name: '사무비', amount: 1000000, category: 'MANAGEMENT', description: '청년부 사무 용품 및 기타' },
        ]
      }
    ]

    for (const budgetData of sampleBudgets) {
      // 예산 생성
      const budget = await prisma.budget.create({
        data: {
          name: budgetData.name,
          year: budgetData.year,
          startDate: new Date(budgetData.year, 0, 1),
          endDate: new Date(budgetData.year, 11, 31),
          totalAmount: budgetData.totalAmount,
          status: 'ACTIVE',
          description: budgetData.description,
          churchId: church.id,
          departmentId: budgetData.departmentId,
          createdById: mainBudgetManager?.id || createdBudgetUsers[0].id,
          approvedById: mainBudgetManager?.id || createdBudgetUsers[0].id,
          approvedAt: new Date(),
        }
      })

      // 예산 항목들 생성
      for (const item of budgetData.items) {
        const budgetItem = await prisma.budgetItem.create({
          data: {
            name: item.name,
            amount: item.amount,
            category: item.category as any,
            description: item.description,
            budgetId: budget.id,
          }
        })

        // 예산 집행 현황 초기화
        await prisma.budgetExecution.create({
          data: {
            budgetItemId: budgetItem.id,
            totalBudget: item.amount,
            usedAmount: 0,
            pendingAmount: 0,
            remainingAmount: item.amount,
            executionRate: 0,
          }
        })
      }

      console.log(`  ✓ Created budget: ${budgetData.name} (${budgetData.items.length} items)`)
    }
  }

  // 6. 샘플 거래 데이터 생성 (복식부기)
  console.log('📊 Creating sample transaction data...')
  
  const cashAccountId = accountCodeMap.get('1-11-01-01') // 현금
  const depositAccountId = accountCodeMap.get('1-11-02-01') // 보통예금
  const titheRevenueId = accountCodeMap.get('4-41-01-01') // 개인십일조
  const offeringRevenueId = accountCodeMap.get('4-41-02-01') // 대예배헌금
  const electricityExpenseId = accountCodeMap.get('5-52-01-01') // 전기료
  const officeSuppliesId = accountCodeMap.get('5-52-03') // 사무용품비
  
  if (cashAccountId && titheRevenueId && offeringRevenueId && createdBudgetUsers.length > 0) {
    const sampleTransactions = [
      {
        description: '2025년 1월 십일조 헌금',
        debitAccountId: cashAccountId,
        creditAccountId: titheRevenueId,
        amount: 5000000,
        transactionDate: new Date('2025-01-07'),
        reference: 'offering',
      },
      {
        description: '2025년 1월 주일헌금',
        debitAccountId: cashAccountId,
        creditAccountId: offeringRevenueId,
        amount: 2000000,
        transactionDate: new Date('2025-01-07'),
        reference: 'offering',
      }
    ]

    if (depositAccountId) {
      sampleTransactions.push({
        description: '현금 은행 입금',
        debitAccountId: depositAccountId,
        creditAccountId: cashAccountId,
        amount: 6000000,
        transactionDate: new Date('2025-01-08'),
        reference: 'transfer',
      })
    }

    if (electricityExpenseId) {
      sampleTransactions.push({
        description: '2025년 1월 전기료 지출',
        debitAccountId: electricityExpenseId,
        creditAccountId: depositAccountId || cashAccountId,
        amount: 800000,
        transactionDate: new Date('2025-01-15'),
        reference: 'expense',
      })
    }

    if (officeSuppliesId) {
      sampleTransactions.push({
        description: '사무용품 구입',
        debitAccountId: officeSuppliesId,
        creditAccountId: cashAccountId,
        amount: 150000,
        transactionDate: new Date('2025-01-20'),
        reference: 'expense',
      })
    }

    for (const txData of sampleTransactions) {
      await prisma.transaction.create({
        data: {
          ...txData,
          churchId: church.id,
          createdById: createdBudgetUsers[0].id,
        }
      })
    }

    console.log(`  ✓ Created ${sampleTransactions.length} sample transactions`)
  }

  console.log('🎉 Accounting and budget system seed completed!')
  console.log(`📊 Summary:`)
  console.log(`   - Account Codes: ${accountCodeMap.size}`)
  console.log(`   - Budget Users: ${createdBudgetUsers.length}`)
  console.log(`   - Sample Budgets: 3`)
  console.log(`   - Sample Transactions: Created`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Accounting seed failed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })