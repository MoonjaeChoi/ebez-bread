import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting budget category account codes seed...')

  // 1. 교회 조회
  const church = await prisma.church.findFirst({
    where: { name: '과천교회' }
  })

  if (!church) {
    throw new Error('교회 데이터를 찾을 수 없습니다. 먼저 기본 시드를 실행해주세요.')
  }

  console.log('✅ Church found:', church.name)

  // 2. 기존 상위 계정들 조회
  const expenseRoot = await prisma.accountCode.findFirst({
    where: { code: '5', churchId: null }
  })

  if (!expenseRoot) {
    throw new Error('기존 회계 계정을 찾을 수 없습니다. 먼저 accounting-seed를 실행해주세요.')
  }

  // 3. 예산 카테고리별 세부 회계 계정 추가
  console.log('📊 Creating budget category specific account codes...')
  
  const budgetCategoryAccounts = [
    // ===== PERSONNEL (인건비) 카테고리 =====
    // 기존 5-51 (인건비) 하위에 추가
    { code: '5-51-04', name: '강사료', englishName: 'Instructor Fees', type: 'EXPENSE', level: 3, parentCode: '5-51', isSystem: false, order: 5104, category: 'PERSONNEL' },
    { code: '5-51-05', name: '상여금', englishName: 'Bonuses', type: 'EXPENSE', level: 3, parentCode: '5-51', isSystem: false, order: 5105, category: 'PERSONNEL' },
    { code: '5-51-06', name: '퇴직금', englishName: 'Severance Pay', type: 'EXPENSE', level: 3, parentCode: '5-51', isSystem: false, order: 5106, category: 'PERSONNEL' },
    
    // 세세목들
    { code: '5-51-04-01', name: '주일학교강사료', englishName: 'Sunday School Instructor', type: 'EXPENSE', level: 4, parentCode: '5-51-04', isSystem: false, order: 510401, category: 'PERSONNEL' },
    { code: '5-51-04-02', name: '성경공부강사료', englishName: 'Bible Study Instructor', type: 'EXPENSE', level: 4, parentCode: '5-51-04', isSystem: false, order: 510402, category: 'PERSONNEL' },
    { code: '5-51-04-03', name: '찬양지도강사료', englishName: 'Worship Leader Fee', type: 'EXPENSE', level: 4, parentCode: '5-51-04', isSystem: false, order: 510403, category: 'PERSONNEL' },
    { code: '5-51-05-01', name: '명절상여금', englishName: 'Holiday Bonus', type: 'EXPENSE', level: 4, parentCode: '5-51-05', isSystem: false, order: 510501, category: 'PERSONNEL' },
    { code: '5-51-05-02', name: '성과상여금', englishName: 'Performance Bonus', type: 'EXPENSE', level: 4, parentCode: '5-51-05', isSystem: false, order: 510502, category: 'PERSONNEL' },

    // ===== OPERATIONS (운영비) 카테고리 =====
    // 새로운 운영비 항목 추가
    { code: '5-55', name: '운영비', englishName: 'Operations Expenses', type: 'EXPENSE', level: 2, parentCode: '5', isSystem: false, order: 5500, category: 'OPERATIONS' },
    
    // 세목들
    { code: '5-55-01', name: '소모품비', englishName: 'Supplies', type: 'EXPENSE', level: 3, parentCode: '5-55', isSystem: false, order: 5501, category: 'OPERATIONS' },
    { code: '5-55-02', name: '식음료비', englishName: 'Food & Beverages', type: 'EXPENSE', level: 3, parentCode: '5-55', isSystem: false, order: 5502, category: 'OPERATIONS' },
    { code: '5-55-03', name: '청소용품비', englishName: 'Cleaning Supplies', type: 'EXPENSE', level: 3, parentCode: '5-55', isSystem: false, order: 5503, category: 'OPERATIONS' },
    { code: '5-55-04', name: '연료비', englishName: 'Fuel Expenses', type: 'EXPENSE', level: 3, parentCode: '5-55', isSystem: false, order: 5504, category: 'OPERATIONS' },
    
    // 세세목들
    { code: '5-55-01-01', name: '복사용지', englishName: 'Copy Paper', type: 'EXPENSE', level: 4, parentCode: '5-55-01', isSystem: false, order: 550101, category: 'OPERATIONS' },
    { code: '5-55-01-02', name: '프린터잉크', englishName: 'Printer Ink', type: 'EXPENSE', level: 4, parentCode: '5-55-01', isSystem: false, order: 550102, category: 'OPERATIONS' },
    { code: '5-55-01-03', name: '문구용품', englishName: 'Stationery', type: 'EXPENSE', level: 4, parentCode: '5-55-01', isSystem: false, order: 550103, category: 'OPERATIONS' },
    { code: '5-55-02-01', name: '예배간식비', englishName: 'Service Refreshments', type: 'EXPENSE', level: 4, parentCode: '5-55-02', isSystem: false, order: 550201, category: 'OPERATIONS' },
    { code: '5-55-02-02', name: '모임식사비', englishName: 'Meeting Meals', type: 'EXPENSE', level: 4, parentCode: '5-55-02', isSystem: false, order: 550202, category: 'OPERATIONS' },

    // ===== MANAGEMENT (관리비) 카테고리 =====
    // 기존 5-52 하위에 추가
    { code: '5-52-05', name: '보험료', englishName: 'Insurance', type: 'EXPENSE', level: 3, parentCode: '5-52', isSystem: false, order: 5205, category: 'MANAGEMENT' },
    { code: '5-52-06', name: '세금공과', englishName: 'Taxes & Dues', type: 'EXPENSE', level: 3, parentCode: '5-52', isSystem: false, order: 5206, category: 'MANAGEMENT' },
    { code: '5-52-07', name: '수수료', englishName: 'Service Fees', type: 'EXPENSE', level: 3, parentCode: '5-52', isSystem: false, order: 5207, category: 'MANAGEMENT' },
    
    // 세세목들
    { code: '5-52-05-01', name: '화재보험', englishName: 'Fire Insurance', type: 'EXPENSE', level: 4, parentCode: '5-52-05', isSystem: false, order: 520501, category: 'MANAGEMENT' },
    { code: '5-52-05-02', name: '배상책임보험', englishName: 'Liability Insurance', type: 'EXPENSE', level: 4, parentCode: '5-52-05', isSystem: false, order: 520502, category: 'MANAGEMENT' },
    { code: '5-52-06-01', name: '재산세', englishName: 'Property Tax', type: 'EXPENSE', level: 4, parentCode: '5-52-06', isSystem: false, order: 520601, category: 'MANAGEMENT' },
    { code: '5-52-07-01', name: '은행수수료', englishName: 'Bank Fees', type: 'EXPENSE', level: 4, parentCode: '5-52-07', isSystem: false, order: 520701, category: 'MANAGEMENT' },
    { code: '5-52-07-02', name: '카드수수료', englishName: 'Card Processing Fees', type: 'EXPENSE', level: 4, parentCode: '5-52-07', isSystem: false, order: 520702, category: 'MANAGEMENT' },

    // ===== FACILITIES (시설비) 카테고리 =====
    // 새로운 시설비 항목 추가
    { code: '5-56', name: '시설비', englishName: 'Facility Expenses', type: 'EXPENSE', level: 2, parentCode: '5', isSystem: false, order: 5600, category: 'FACILITIES' },
    
    // 세목들
    { code: '5-56-01', name: '건물수선비', englishName: 'Building Repairs', type: 'EXPENSE', level: 3, parentCode: '5-56', isSystem: false, order: 5601, category: 'FACILITIES' },
    { code: '5-56-02', name: '장비구입비', englishName: 'Equipment Purchase', type: 'EXPENSE', level: 3, parentCode: '5-56', isSystem: false, order: 5602, category: 'FACILITIES' },
    { code: '5-56-03', name: '인테리어비', englishName: 'Interior Design', type: 'EXPENSE', level: 3, parentCode: '5-56', isSystem: false, order: 5603, category: 'FACILITIES' },
    { code: '5-56-04', name: '조경비', englishName: 'Landscaping', type: 'EXPENSE', level: 3, parentCode: '5-56', isSystem: false, order: 5604, category: 'FACILITIES' },
    
    // 세세목들
    { code: '5-56-01-01', name: '외벽수선', englishName: 'Exterior Wall Repair', type: 'EXPENSE', level: 4, parentCode: '5-56-01', isSystem: false, order: 560101, category: 'FACILITIES' },
    { code: '5-56-01-02', name: '배관수선', englishName: 'Plumbing Repair', type: 'EXPENSE', level: 4, parentCode: '5-56-01', isSystem: false, order: 560102, category: 'FACILITIES' },
    { code: '5-56-01-03', name: '전기시설수선', englishName: 'Electrical Repair', type: 'EXPENSE', level: 4, parentCode: '5-56-01', isSystem: false, order: 560103, category: 'FACILITIES' },
    { code: '5-56-02-01', name: '음향장비', englishName: 'Audio Equipment', type: 'EXPENSE', level: 4, parentCode: '5-56-02', isSystem: false, order: 560201, category: 'FACILITIES' },
    { code: '5-56-02-02', name: '영상장비', englishName: 'Video Equipment', type: 'EXPENSE', level: 4, parentCode: '5-56-02', isSystem: false, order: 560202, category: 'FACILITIES' },
    { code: '5-56-02-03', name: '가구구입', englishName: 'Furniture Purchase', type: 'EXPENSE', level: 4, parentCode: '5-56-02', isSystem: false, order: 560203, category: 'FACILITIES' },

    // ===== EDUCATION (교육비) 카테고리 =====
    // 기존 5-53-02 하위에 추가하고 새로운 항목들 생성
    { code: '5-53-02-04', name: '교육여행비', englishName: 'Educational Travel', type: 'EXPENSE', level: 4, parentCode: '5-53-02', isSystem: false, order: 530204, category: 'EDUCATION' },
    { code: '5-53-02-05', name: '교육프로그램비', englishName: 'Educational Programs', type: 'EXPENSE', level: 4, parentCode: '5-53-02', isSystem: false, order: 530205, category: 'EDUCATION' },
    
    // 새로운 교육비 세목
    { code: '5-53-06', name: '도서비', englishName: 'Books & Literature', type: 'EXPENSE', level: 3, parentCode: '5-53', isSystem: false, order: 5306, category: 'EDUCATION' },
    { code: '5-53-07', name: '세미나비', englishName: 'Seminar Expenses', type: 'EXPENSE', level: 3, parentCode: '5-53', isSystem: false, order: 5307, category: 'EDUCATION' },
    
    // 세세목들
    { code: '5-53-06-01', name: '성경교재', englishName: 'Bible Study Materials', type: 'EXPENSE', level: 4, parentCode: '5-53-06', isSystem: false, order: 530601, category: 'EDUCATION' },
    { code: '5-53-06-02', name: '주일학교교재', englishName: 'Sunday School Materials', type: 'EXPENSE', level: 4, parentCode: '5-53-06', isSystem: false, order: 530602, category: 'EDUCATION' },
    { code: '5-53-06-03', name: '참고도서', englishName: 'Reference Books', type: 'EXPENSE', level: 4, parentCode: '5-53-06', isSystem: false, order: 530603, category: 'EDUCATION' },
    { code: '5-53-07-01', name: '목회자세미나', englishName: 'Pastor Seminars', type: 'EXPENSE', level: 4, parentCode: '5-53-07', isSystem: false, order: 530701, category: 'EDUCATION' },
    { code: '5-53-07-02', name: '리더십세미나', englishName: 'Leadership Seminars', type: 'EXPENSE', level: 4, parentCode: '5-53-07', isSystem: false, order: 530702, category: 'EDUCATION' },

    // ===== MINISTRY (사역비) 카테고리 =====
    // 새로운 사역비 항목 추가
    { code: '5-57', name: '사역비', englishName: 'Ministry Expenses', type: 'EXPENSE', level: 2, parentCode: '5', isSystem: false, order: 5700, category: 'MINISTRY' },
    
    // 세목들
    { code: '5-57-01', name: '목회사역비', englishName: 'Pastoral Ministry', type: 'EXPENSE', level: 3, parentCode: '5-57', isSystem: false, order: 5701, category: 'MINISTRY' },
    { code: '5-57-02', name: '예배사역비', englishName: 'Worship Ministry', type: 'EXPENSE', level: 3, parentCode: '5-57', isSystem: false, order: 5702, category: 'MINISTRY' },
    { code: '5-57-03', name: '심방사역비', englishName: 'Visitation Ministry', type: 'EXPENSE', level: 3, parentCode: '5-57', isSystem: false, order: 5703, category: 'MINISTRY' },
    { code: '5-57-04', name: '상담사역비', englishName: 'Counseling Ministry', type: 'EXPENSE', level: 3, parentCode: '5-57', isSystem: false, order: 5704, category: 'MINISTRY' },
    
    // 세세목들
    { code: '5-57-01-01', name: '목회자교통비', englishName: 'Pastor Transportation', type: 'EXPENSE', level: 4, parentCode: '5-57-01', isSystem: false, order: 570101, category: 'MINISTRY' },
    { code: '5-57-01-02', name: '목회자료비', englishName: 'Pastoral Resources', type: 'EXPENSE', level: 4, parentCode: '5-57-01', isSystem: false, order: 570102, category: 'MINISTRY' },
    { code: '5-57-02-01', name: '찬양대운영비', englishName: 'Choir Operations', type: 'EXPENSE', level: 4, parentCode: '5-57-02', isSystem: false, order: 570201, category: 'MINISTRY' },
    { code: '5-57-02-02', name: '악보구입비', englishName: 'Sheet Music Purchase', type: 'EXPENSE', level: 4, parentCode: '5-57-02', isSystem: false, order: 570202, category: 'MINISTRY' },
    { code: '5-57-03-01', name: '심방선물비', englishName: 'Visitation Gifts', type: 'EXPENSE', level: 4, parentCode: '5-57-03', isSystem: false, order: 570301, category: 'MINISTRY' },
    { code: '5-57-03-02', name: '심방교통비', englishName: 'Visitation Transportation', type: 'EXPENSE', level: 4, parentCode: '5-57-03', isSystem: false, order: 570302, category: 'MINISTRY' },

    // ===== MISSION (선교비) 카테고리 =====
    // 기존 5-53-01 하위에 추가
    { code: '5-53-01-04', name: '단기선교비', englishName: 'Short-term Mission', type: 'EXPENSE', level: 4, parentCode: '5-53-01', isSystem: false, order: 530104, category: 'MISSION' },
    { code: '5-53-01-05', name: '선교지원물품', englishName: 'Mission Supply Support', type: 'EXPENSE', level: 4, parentCode: '5-53-01', isSystem: false, order: 530105, category: 'MISSION' },
    { code: '5-53-01-06', name: '선교교육비', englishName: 'Mission Education', type: 'EXPENSE', level: 4, parentCode: '5-53-01', isSystem: false, order: 530106, category: 'MISSION' },

    // ===== WELFARE (복지비) 카테고리 =====
    // 기존 5-53-03 하위에 추가하고 새로운 항목들 생성
    { code: '5-53-03-01', name: '장학금', englishName: 'Scholarships', type: 'EXPENSE', level: 4, parentCode: '5-53-03', isSystem: false, order: 530301, category: 'WELFARE' },
    { code: '5-53-03-02', name: '의료비지원', englishName: 'Medical Support', type: 'EXPENSE', level: 4, parentCode: '5-53-03', isSystem: false, order: 530302, category: 'WELFARE' },
    { code: '5-53-03-03', name: '생활비지원', englishName: 'Living Support', type: 'EXPENSE', level: 4, parentCode: '5-53-03', isSystem: false, order: 530303, category: 'WELFARE' },
    { code: '5-53-03-04', name: '경조사비', englishName: 'Celebration & Condolence', type: 'EXPENSE', level: 4, parentCode: '5-53-03', isSystem: false, order: 530304, category: 'WELFARE' },
    
    // 새로운 복지비 세목
    { code: '5-53-08', name: '노인복지비', englishName: 'Senior Welfare', type: 'EXPENSE', level: 3, parentCode: '5-53', isSystem: false, order: 5308, category: 'WELFARE' },
    { code: '5-53-09', name: '청년복지비', englishName: 'Youth Welfare', type: 'EXPENSE', level: 3, parentCode: '5-53', isSystem: false, order: 5309, category: 'WELFARE' },
    
    // 세세목들
    { code: '5-53-08-01', name: '경로잔치비', englishName: 'Senior Feast', type: 'EXPENSE', level: 4, parentCode: '5-53-08', isSystem: false, order: 530801, category: 'WELFARE' },
    { code: '5-53-08-02', name: '노인건강관리비', englishName: 'Senior Health Care', type: 'EXPENSE', level: 4, parentCode: '5-53-08', isSystem: false, order: 530802, category: 'WELFARE' },
    { code: '5-53-09-01', name: '청년장학금', englishName: 'Youth Scholarships', type: 'EXPENSE', level: 4, parentCode: '5-53-09', isSystem: false, order: 530901, category: 'WELFARE' },
    { code: '5-53-09-02', name: '청년취업지원', englishName: 'Youth Job Support', type: 'EXPENSE', level: 4, parentCode: '5-53-09', isSystem: false, order: 530902, category: 'WELFARE' },

    // ===== EVENT (행사비) 카테고리 =====
    // 기존 5-53-05 하위에 추가하고 새로운 항목들 생성
    { code: '5-53-05-01', name: '부활절행사비', englishName: 'Easter Events', type: 'EXPENSE', level: 4, parentCode: '5-53-05', isSystem: false, order: 530501, category: 'EVENT' },
    { code: '5-53-05-02', name: '성탄절행사비', englishName: 'Christmas Events', type: 'EXPENSE', level: 4, parentCode: '5-53-05', isSystem: false, order: 530502, category: 'EVENT' },
    { code: '5-53-05-03', name: '수련회비', englishName: 'Retreat Expenses', type: 'EXPENSE', level: 4, parentCode: '5-53-05', isSystem: false, order: 530503, category: 'EVENT' },
    { code: '5-53-05-04', name: '체육행사비', englishName: 'Sports Events', type: 'EXPENSE', level: 4, parentCode: '5-53-05', isSystem: false, order: 530504, category: 'EVENT' },
    
    // 새로운 행사비 세목
    { code: '5-53-10', name: '특별행사비', englishName: 'Special Events', type: 'EXPENSE', level: 3, parentCode: '5-53', isSystem: false, order: 5310, category: 'EVENT' },
    { code: '5-53-11', name: '집회비', englishName: 'Revival Meetings', type: 'EXPENSE', level: 3, parentCode: '5-53', isSystem: false, order: 5311, category: 'EVENT' },
    
    // 세세목들
    { code: '5-53-10-01', name: '창립기념행사', englishName: 'Anniversary Events', type: 'EXPENSE', level: 4, parentCode: '5-53-10', isSystem: false, order: 531001, category: 'EVENT' },
    { code: '5-53-10-02', name: '감사잔치', englishName: 'Thanksgiving Feast', type: 'EXPENSE', level: 4, parentCode: '5-53-10', isSystem: false, order: 531002, category: 'EVENT' },
    { code: '5-53-11-01', name: '부흥회비', englishName: 'Revival Meeting', type: 'EXPENSE', level: 4, parentCode: '5-53-11', isSystem: false, order: 531101, category: 'EVENT' },
    { code: '5-53-11-02', name: '전도집회비', englishName: 'Evangelistic Meeting', type: 'EXPENSE', level: 4, parentCode: '5-53-11', isSystem: false, order: 531102, category: 'EVENT' },

    // ===== OTHER (기타) 카테고리 =====
    // 기존 5-54 하위에 추가
    { code: '5-54-01', name: '기타잡비', englishName: 'Miscellaneous', type: 'EXPENSE', level: 3, parentCode: '5-54', isSystem: false, order: 5401, category: 'OTHER' },
    { code: '5-54-02', name: '예비비', englishName: 'Reserve Fund', type: 'EXPENSE', level: 3, parentCode: '5-54', isSystem: false, order: 5402, category: 'OTHER' },
    { code: '5-54-03', name: '일시차입금이자', englishName: 'Temporary Loan Interest', type: 'EXPENSE', level: 3, parentCode: '5-54', isSystem: false, order: 5403, category: 'OTHER' },
    
    // 세세목들
    { code: '5-54-01-01', name: '소액잡비', englishName: 'Petty Miscellaneous', type: 'EXPENSE', level: 4, parentCode: '5-54-01', isSystem: false, order: 540101, category: 'OTHER' },
    { code: '5-54-01-02', name: '긴급지출', englishName: 'Emergency Expenses', type: 'EXPENSE', level: 4, parentCode: '5-54-01', isSystem: false, order: 540102, category: 'OTHER' },
    { code: '5-54-02-01', name: '일반예비비', englishName: 'General Reserve', type: 'EXPENSE', level: 4, parentCode: '5-54-02', isSystem: false, order: 540201, category: 'OTHER' },
    { code: '5-54-02-02', name: '특별예비비', englishName: 'Special Reserve', type: 'EXPENSE', level: 4, parentCode: '5-54-02', isSystem: false, order: 540202, category: 'OTHER' },
  ]

  // 4. 계정코드 생성 및 계층구조 설정
  const accountCodeMap = new Map<string, string>() // code -> id 매핑
  
  // 기존 계정들의 ID 매핑 구축
  const existingCodes = await prisma.accountCode.findMany({
    where: { churchId: null }
  })
  
  existingCodes.forEach(code => {
    accountCodeMap.set(code.code, code.id)
  })

  // Level 2 먼저 생성 (새로운 항목들만)
  const level2Accounts = budgetCategoryAccounts.filter(a => a.level === 2)
  for (const account of level2Accounts) {
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
          description: `${account.category} 예산 카테고리 관련 계정`
        }
      })
      accountCodeMap.set(account.code, created.id)
      console.log(`  ✓ Created Level 2: ${account.code} - ${account.name} [${account.category}]`)
    } else {
      accountCodeMap.set(account.code, existing.id)
    }
  }

  // Level 3-4 순차적으로 생성
  for (let level = 3; level <= 4; level++) {
    const levelAccounts = budgetCategoryAccounts.filter(a => a.level === level)
    for (const account of levelAccounts) {
      const existing = await prisma.accountCode.findFirst({
        where: { code: account.code, churchId: null }
      })

      if (!existing) {
        const parentId = account.parentCode ? accountCodeMap.get(account.parentCode) : null
        
        if (!parentId && account.parentCode) {
          console.warn(`⚠️ Parent code ${account.parentCode} not found for ${account.code}`)
          continue
        }
        
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
            description: `${account.category} 예산 카테고리 관련 계정`
          }
        })
        accountCodeMap.set(account.code, created.id)
        console.log(`  ✓ Created Level ${level}: ${account.code} - ${account.name} [${account.category}]`)
      } else {
        accountCodeMap.set(account.code, existing.id)
      }
    }
  }

  console.log('✅ Budget category account codes created successfully!')
  console.log(`📊 Summary:`)
  console.log(`   - PERSONNEL accounts: ${budgetCategoryAccounts.filter(a => a.category === 'PERSONNEL').length}`)
  console.log(`   - OPERATIONS accounts: ${budgetCategoryAccounts.filter(a => a.category === 'OPERATIONS').length}`)
  console.log(`   - MANAGEMENT accounts: ${budgetCategoryAccounts.filter(a => a.category === 'MANAGEMENT').length}`)
  console.log(`   - FACILITIES accounts: ${budgetCategoryAccounts.filter(a => a.category === 'FACILITIES').length}`)
  console.log(`   - EDUCATION accounts: ${budgetCategoryAccounts.filter(a => a.category === 'EDUCATION').length}`)
  console.log(`   - MINISTRY accounts: ${budgetCategoryAccounts.filter(a => a.category === 'MINISTRY').length}`)
  console.log(`   - MISSION accounts: ${budgetCategoryAccounts.filter(a => a.category === 'MISSION').length}`)
  console.log(`   - WELFARE accounts: ${budgetCategoryAccounts.filter(a => a.category === 'WELFARE').length}`)
  console.log(`   - EVENT accounts: ${budgetCategoryAccounts.filter(a => a.category === 'EVENT').length}`)
  console.log(`   - OTHER accounts: ${budgetCategoryAccounts.filter(a => a.category === 'OTHER').length}`)
  console.log(`   - Total new accounts: ${budgetCategoryAccounts.length}`)

}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Budget category account codes seed failed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })