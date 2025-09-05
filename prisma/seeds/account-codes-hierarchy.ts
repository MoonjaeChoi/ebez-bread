import { PrismaClient, AccountType } from '@prisma/client'

const prisma = new PrismaClient()

interface AccountCodeData {
  code: string
  name: string
  englishName?: string
  type: AccountType
  level: number
  parentCode?: string
  order: number
  allowTransaction: boolean
  isSystem: boolean
  description?: string
}

const accountCodes: AccountCodeData[] = [
  // 1. 자산 (ASSET) - Level 1
  { code: '1', name: '자산', englishName: 'ASSET', type: 'ASSET', level: 1, order: 1, allowTransaction: false, isSystem: true },
  
  // 1.1. 유동자산 - Level 2  
  { code: '1.1', name: '유동자산', englishName: 'Current Assets', type: 'ASSET', level: 2, parentCode: '1', order: 1, allowTransaction: false, isSystem: true },
  
  // 1.1.1. 당좌자산 - Level 3
  { code: '1.1.1', name: '당좌자산', englishName: 'Cash & Cash Equivalents', type: 'ASSET', level: 3, parentCode: '1.1', order: 1, allowTransaction: false, isSystem: true },
  { code: '1.1.1.01', name: '현금', englishName: 'Cash', type: 'ASSET', level: 4, parentCode: '1.1.1', order: 1, allowTransaction: true, isSystem: false },
  { code: '1.1.1.02', name: '당좌예금', englishName: 'Checking Account', type: 'ASSET', level: 4, parentCode: '1.1.1', order: 2, allowTransaction: true, isSystem: false },
  { code: '1.1.1.03', name: '보통예금', englishName: 'Savings Account', type: 'ASSET', level: 4, parentCode: '1.1.1', order: 3, allowTransaction: true, isSystem: false },
  { code: '1.1.1.04', name: '기타예금', englishName: 'Other Deposits', type: 'ASSET', level: 4, parentCode: '1.1.1', order: 4, allowTransaction: true, isSystem: false, description: 'CMA, MMF 등' },
  { code: '1.1.1.05', name: '단기매매증권', englishName: 'Short-term Securities', type: 'ASSET', level: 4, parentCode: '1.1.1', order: 5, allowTransaction: true, isSystem: false, description: '주식, 채권 등' },
  { code: '1.1.1.06', name: '단기대여금', englishName: 'Short-term Loans', type: 'ASSET', level: 4, parentCode: '1.1.1', order: 6, allowTransaction: true, isSystem: false, description: '교인, 타교회 등' },
  { code: '1.1.1.07', name: '미수금', englishName: 'Accounts Receivable', type: 'ASSET', level: 4, parentCode: '1.1.1', order: 7, allowTransaction: true, isSystem: false, description: '정부 보조금 미수 등' },
  { code: '1.1.1.08', name: '선급금', englishName: 'Prepaid Expenses', type: 'ASSET', level: 4, parentCode: '1.1.1', order: 8, allowTransaction: true, isSystem: false, description: '임차료, 보험료 선급 등' },
  { code: '1.1.1.09', name: '선급비용', englishName: 'Prepaid Costs', type: 'ASSET', level: 4, parentCode: '1.1.1', order: 9, allowTransaction: true, isSystem: false, description: '선지급한 비용 중 차기 이후분' },
  { code: '1.1.1.10', name: '가지급금', englishName: 'Temporary Payments', type: 'ASSET', level: 4, parentCode: '1.1.1', order: 10, allowTransaction: true, isSystem: false, description: '용도 미확정 지출' },
  { code: '1.1.1.11', name: '예수금', englishName: 'Withholding Tax', type: 'ASSET', level: 4, parentCode: '1.1.1', order: 11, allowTransaction: true, isSystem: false, description: '원천징수세액, 사회보험료 등' },
  { code: '1.1.1.12', name: '부가세대급금', englishName: 'VAT Receivable', type: 'ASSET', level: 4, parentCode: '1.1.1', order: 12, allowTransaction: true, isSystem: false, description: '매입세액' },
  
  // 1.1.2. 재고자산 - Level 3
  { code: '1.1.2', name: '재고자산', englishName: 'Inventories', type: 'ASSET', level: 3, parentCode: '1.1', order: 2, allowTransaction: false, isSystem: true },
  { code: '1.1.2.01', name: '소모품', englishName: 'Office Supplies', type: 'ASSET', level: 4, parentCode: '1.1.2', order: 1, allowTransaction: true, isSystem: false, description: '사무용품, 청소용품 등 미사용분' },
  { code: '1.1.2.02', name: '판매용 도서/물품', englishName: 'Books/Items for Sale', type: 'ASSET', level: 4, parentCode: '1.1.2', order: 2, allowTransaction: true, isSystem: false, description: '교회 서점 등' },
  { code: '1.1.2.03', name: '식료품 재고', englishName: 'Food Inventory', type: 'ASSET', level: 4, parentCode: '1.1.2', order: 3, allowTransaction: true, isSystem: false, description: '식당 운영 시' },

  // 1.2. 비유동자산 - Level 2
  { code: '1.2', name: '비유동자산', englishName: 'Non-current Assets', type: 'ASSET', level: 2, parentCode: '1', order: 2, allowTransaction: false, isSystem: true },
  
  // 1.2.1. 투자자산 - Level 3
  { code: '1.2.1', name: '투자자산', englishName: 'Investment Assets', type: 'ASSET', level: 3, parentCode: '1.2', order: 1, allowTransaction: false, isSystem: true },
  { code: '1.2.1.01', name: '장기금융상품', englishName: 'Long-term Financial Products', type: 'ASSET', level: 4, parentCode: '1.2.1', order: 1, allowTransaction: true, isSystem: false, description: '정기예금, 적금 등' },
  { code: '1.2.1.02', name: '장기대여금', englishName: 'Long-term Loans', type: 'ASSET', level: 4, parentCode: '1.2.1', order: 2, allowTransaction: true, isSystem: false, description: '교인, 타교회 등 장기 회수 예정' },
  { code: '1.2.1.03', name: '장기투자증권', englishName: 'Long-term Investment Securities', type: 'ASSET', level: 4, parentCode: '1.2.1', order: 3, allowTransaction: true, isSystem: false, description: '만기보유증권, 매도가능증권' },
  { code: '1.2.1.04', name: '투자부동산', englishName: 'Investment Real Estate', type: 'ASSET', level: 4, parentCode: '1.2.1', order: 4, allowTransaction: true, isSystem: false, description: '임대수익 목적 부동산' },
  
  // 1.2.2. 유형자산 - Level 3
  { code: '1.2.2', name: '유형자산', englishName: 'Property, Plant & Equipment', type: 'ASSET', level: 3, parentCode: '1.2', order: 2, allowTransaction: false, isSystem: true },
  { code: '1.2.2.01', name: '토지', englishName: 'Land', type: 'ASSET', level: 4, parentCode: '1.2.2', order: 1, allowTransaction: true, isSystem: false, description: '교회 부지' },
  { code: '1.2.2.02', name: '건물', englishName: 'Buildings', type: 'ASSET', level: 4, parentCode: '1.2.2', order: 2, allowTransaction: true, isSystem: false, description: '예배당, 교육관, 사택 등' },
  { code: '1.2.2.03', name: '구축물', englishName: 'Structures', type: 'ASSET', level: 4, parentCode: '1.2.2', order: 3, allowTransaction: true, isSystem: false, description: '주차장, 담장, 조경시설 등' },
  { code: '1.2.2.04', name: '기계장치', englishName: 'Machinery', type: 'ASSET', level: 4, parentCode: '1.2.2', order: 4, allowTransaction: true, isSystem: false, description: '음향, 영상 장비, 발전기 등' },
  { code: '1.2.2.05', name: '차량운반구', englishName: 'Vehicles', type: 'ASSET', level: 4, parentCode: '1.2.2', order: 5, allowTransaction: true, isSystem: false, description: '승합차, 승용차 등' },
  { code: '1.2.2.06', name: '비품', englishName: 'Equipment', type: 'ASSET', level: 4, parentCode: '1.2.2', order: 6, allowTransaction: true, isSystem: false, description: '사무용 책상, 의자, 컴퓨터, 가전제품 등' },
  { code: '1.2.2.07', name: '건설중인자산', englishName: 'Construction in Progress', type: 'ASSET', level: 4, parentCode: '1.2.2', order: 7, allowTransaction: true, isSystem: false, description: '신축, 증축 중인 건물 등' },
  { code: '1.2.2.08', name: '감가상각누계액', englishName: 'Accumulated Depreciation', type: 'ASSET', level: 4, parentCode: '1.2.2', order: 8, allowTransaction: true, isSystem: false, description: '각 유형자산별 차감 계정' },

  // 1.2.3. 무형자산 - Level 3
  { code: '1.2.3', name: '무형자산', englishName: 'Intangible Assets', type: 'ASSET', level: 3, parentCode: '1.2', order: 3, allowTransaction: false, isSystem: true },
  { code: '1.2.3.01', name: '소프트웨어', englishName: 'Software', type: 'ASSET', level: 4, parentCode: '1.2.3', order: 1, allowTransaction: true, isSystem: false, description: '교회 관리 프로그램, 미디어 제작 프로그램' },
  { code: '1.2.3.02', name: '저작권', englishName: 'Copyright', type: 'ASSET', level: 4, parentCode: '1.2.3', order: 2, allowTransaction: true, isSystem: false, description: '찬양, 설교 콘텐츠 등' },
  { code: '1.2.3.03', name: '개발비', englishName: 'Development Costs', type: 'ASSET', level: 4, parentCode: '1.2.3', order: 3, allowTransaction: true, isSystem: false, description: '새로운 프로그램 또는 시스템 개발 비용' },
  { code: '1.2.3.04', name: '특허권', englishName: 'Patent Rights', type: 'ASSET', level: 4, parentCode: '1.2.3', order: 4, allowTransaction: true, isSystem: false, description: '보유 시' },
  { code: '1.2.3.05', name: '상표권', englishName: 'Trademark Rights', type: 'ASSET', level: 4, parentCode: '1.2.3', order: 5, allowTransaction: true, isSystem: false, description: '교회 고유 로고, 이름 등' },
  { code: '1.2.3.06', name: '권리금', englishName: 'Key Money', type: 'ASSET', level: 4, parentCode: '1.2.3', order: 6, allowTransaction: true, isSystem: false, description: '건물 임차 시 지급' },
  { code: '1.2.3.07', name: '감가상각누계액', englishName: 'Accumulated Amortization', type: 'ASSET', level: 4, parentCode: '1.2.3', order: 7, allowTransaction: true, isSystem: false, description: '각 무형자산별 차감 계정' },

  // 1.2.4. 기타비유동자산 - Level 3
  { code: '1.2.4', name: '기타비유동자산', englishName: 'Other Non-current Assets', type: 'ASSET', level: 3, parentCode: '1.2', order: 4, allowTransaction: false, isSystem: true },
  { code: '1.2.4.01', name: '임차보증금', englishName: 'Rental Deposits', type: 'ASSET', level: 4, parentCode: '1.2.4', order: 1, allowTransaction: true, isSystem: false, description: '건물 임차 시' },
  { code: '1.2.4.02', name: '전세권', englishName: 'Jeonse Rights', type: 'ASSET', level: 4, parentCode: '1.2.4', order: 2, allowTransaction: true, isSystem: false, description: '사택 등' },
  { code: '1.2.4.03', name: '장기선급비용', englishName: 'Long-term Prepaid Expenses', type: 'ASSET', level: 4, parentCode: '1.2.4', order: 3, allowTransaction: true, isSystem: false, description: '장기 보험료 등' },

  // 2. 부채 (LIABILITY) - Level 1
  { code: '2', name: '부채', englishName: 'LIABILITY', type: 'LIABILITY', level: 1, order: 2, allowTransaction: false, isSystem: true },

  // 2.1. 유동부채 - Level 2
  { code: '2.1', name: '유동부채', englishName: 'Current Liabilities', type: 'LIABILITY', level: 2, parentCode: '2', order: 1, allowTransaction: false, isSystem: true },

  // 2.1.1. 단기차입금 - Level 3
  { code: '2.1.1', name: '단기차입금', englishName: 'Short-term Borrowings', type: 'LIABILITY', level: 3, parentCode: '2.1', order: 1, allowTransaction: false, isSystem: true },
  { code: '2.1.1.01', name: '은행 단기차입금', englishName: 'Bank Short-term Loans', type: 'LIABILITY', level: 4, parentCode: '2.1.1', order: 1, allowTransaction: true, isSystem: false },
  { code: '2.1.1.02', name: '교인 단기차입금', englishName: 'Member Short-term Loans', type: 'LIABILITY', level: 4, parentCode: '2.1.1', order: 2, allowTransaction: true, isSystem: false },
  { code: '2.1.1.03', name: '기타 단기차입금', englishName: 'Other Short-term Loans', type: 'LIABILITY', level: 4, parentCode: '2.1.1', order: 3, allowTransaction: true, isSystem: false },

  // 2.1.2. 미지급금 - Level 3
  { code: '2.1.2', name: '미지급금', englishName: 'Accounts Payable', type: 'LIABILITY', level: 3, parentCode: '2.1', order: 2, allowTransaction: false, isSystem: true },
  { code: '2.1.2.01', name: '미지급 공과금', englishName: 'Unpaid Utilities', type: 'LIABILITY', level: 4, parentCode: '2.1.2', order: 1, allowTransaction: true, isSystem: false, description: '전기료, 수도료 등' },
  { code: '2.1.2.02', name: '미지급 관리비', englishName: 'Unpaid Management Fees', type: 'LIABILITY', level: 4, parentCode: '2.1.2', order: 2, allowTransaction: true, isSystem: false },
  { code: '2.1.2.03', name: '미지급 용역비', englishName: 'Unpaid Service Fees', type: 'LIABILITY', level: 4, parentCode: '2.1.2', order: 3, allowTransaction: true, isSystem: false, description: '강사료, 청소비 등' },
  { code: '2.1.2.04', name: '미지급 식비', englishName: 'Unpaid Meal Costs', type: 'LIABILITY', level: 4, parentCode: '2.1.2', order: 4, allowTransaction: true, isSystem: false, description: '식당 운영 시' },
  { code: '2.1.2.05', name: '미지급 통신비', englishName: 'Unpaid Communication Fees', type: 'LIABILITY', level: 4, parentCode: '2.1.2', order: 5, allowTransaction: true, isSystem: false },

  // 2.1.3. 선수금 - Level 3
  { code: '2.1.3', name: '선수금', englishName: 'Advances from Customers', type: 'LIABILITY', level: 3, parentCode: '2.1', order: 3, allowTransaction: false, isSystem: true },
  { code: '2.1.3.01', name: '선수 헌금', englishName: 'Advance Offerings', type: 'LIABILITY', level: 4, parentCode: '2.1.3', order: 1, allowTransaction: true, isSystem: false, description: '특정 사업 목적 선입금' },
  { code: '2.1.3.02', name: '선수 교육비', englishName: 'Advance Education Fees', type: 'LIABILITY', level: 4, parentCode: '2.1.3', order: 2, allowTransaction: true, isSystem: false, description: '수련회, 캠프 등' },
  { code: '2.1.3.03', name: '선수 임대료', englishName: 'Advance Rental Fees', type: 'LIABILITY', level: 4, parentCode: '2.1.3', order: 3, allowTransaction: true, isSystem: false, description: '교회 시설 임대 시' },

  // 2.1.4. 예수금 - Level 3
  { code: '2.1.4', name: '예수금', englishName: 'Withholdings', type: 'LIABILITY', level: 3, parentCode: '2.1', order: 4, allowTransaction: false, isSystem: true },
  { code: '2.1.4.01', name: '소득세 예수금', englishName: 'Income Tax Withheld', type: 'LIABILITY', level: 4, parentCode: '2.1.4', order: 1, allowTransaction: true, isSystem: false, description: '교역자, 직원 소득세' },
  { code: '2.1.4.02', name: '주민세 예수금', englishName: 'Resident Tax Withheld', type: 'LIABILITY', level: 4, parentCode: '2.1.4', order: 2, allowTransaction: true, isSystem: false },
  { code: '2.1.4.03', name: '국민연금 예수금', englishName: 'National Pension Withheld', type: 'LIABILITY', level: 4, parentCode: '2.1.4', order: 3, allowTransaction: true, isSystem: false },
  { code: '2.1.4.04', name: '건강보험 예수금', englishName: 'Health Insurance Withheld', type: 'LIABILITY', level: 4, parentCode: '2.1.4', order: 4, allowTransaction: true, isSystem: false },
  { code: '2.1.4.05', name: '고용보험 예수금', englishName: 'Employment Insurance Withheld', type: 'LIABILITY', level: 4, parentCode: '2.1.4', order: 5, allowTransaction: true, isSystem: false },
  { code: '2.1.4.06', name: '기타 예수금', englishName: 'Other Withholdings', type: 'LIABILITY', level: 4, parentCode: '2.1.4', order: 6, allowTransaction: true, isSystem: false, description: '특별 헌금 보관 등' },

  // 2.1.5. 미지급비용 - Level 3
  { code: '2.1.5', name: '미지급비용', englishName: 'Accrued Expenses', type: 'LIABILITY', level: 3, parentCode: '2.1', order: 5, allowTransaction: false, isSystem: true },
  { code: '2.1.5.01', name: '미지급 이자', englishName: 'Accrued Interest', type: 'LIABILITY', level: 4, parentCode: '2.1.5', order: 1, allowTransaction: true, isSystem: false, description: '단기차입금 이자' },
  { code: '2.1.5.02', name: '미지급 급여', englishName: 'Accrued Wages', type: 'LIABILITY', level: 4, parentCode: '2.1.5', order: 2, allowTransaction: true, isSystem: false, description: '월말 미지급분' },
  { code: '2.1.5.03', name: '미지급 퇴직급여', englishName: 'Accrued Severance Pay', type: 'LIABILITY', level: 4, parentCode: '2.1.5', order: 3, allowTransaction: true, isSystem: false, description: '단기 충당 부채' },

  // 2.1.6. 유동성장기부채 - Level 3
  { code: '2.1.6', name: '유동성장기부채', englishName: 'Current Portion of Long-term Liabilities', type: 'LIABILITY', level: 3, parentCode: '2.1', order: 6, allowTransaction: false, isSystem: true },
  { code: '2.1.6.01', name: '장기차입금 중 1년 내 상환분', englishName: 'Current Portion of Long-term Debt', type: 'LIABILITY', level: 4, parentCode: '2.1.6', order: 1, allowTransaction: true, isSystem: false },
  { code: '2.1.6.02', name: '장기차입부채 상환액', englishName: 'Long-term Debt Repayment', type: 'LIABILITY', level: 4, parentCode: '2.1.6', order: 2, allowTransaction: true, isSystem: false },

  // 2.2. 비유동부채 - Level 2
  { code: '2.2', name: '비유동부채', englishName: 'Non-current Liabilities', type: 'LIABILITY', level: 2, parentCode: '2', order: 2, allowTransaction: false, isSystem: true },

  // 2.2.1. 장기차입금 - Level 3
  { code: '2.2.1', name: '장기차입금', englishName: 'Long-term Borrowings', type: 'LIABILITY', level: 3, parentCode: '2.2', order: 1, allowTransaction: false, isSystem: true },
  { code: '2.2.1.01', name: '은행 장기차입금', englishName: 'Bank Long-term Loans', type: 'LIABILITY', level: 4, parentCode: '2.2.1', order: 1, allowTransaction: true, isSystem: false, description: '건축 융자 등' },
  { code: '2.2.1.02', name: '교인 장기차입금', englishName: 'Member Long-term Loans', type: 'LIABILITY', level: 4, parentCode: '2.2.1', order: 2, allowTransaction: true, isSystem: false },
  { code: '2.2.1.03', name: '기타 장기차입금', englishName: 'Other Long-term Loans', type: 'LIABILITY', level: 4, parentCode: '2.2.1', order: 3, allowTransaction: true, isSystem: false },

  // 2.2.2. 퇴직급여충당부채 - Level 3
  { code: '2.2.2', name: '퇴직급여충당부채', englishName: 'Accrued Severance Pay Liability', type: 'LIABILITY', level: 3, parentCode: '2.2', order: 2, allowTransaction: false, isSystem: true },
  { code: '2.2.2.01', name: '퇴직급여충당부채', englishName: 'Severance Pay Reserve', type: 'LIABILITY', level: 4, parentCode: '2.2.2', order: 1, allowTransaction: true, isSystem: false, description: '교역자 및 직원' },

  // 2.2.3. 임대보증금 - Level 3
  { code: '2.2.3', name: '임대보증금', englishName: 'Rental Deposits', type: 'LIABILITY', level: 3, parentCode: '2.2', order: 3, allowTransaction: false, isSystem: true },
  { code: '2.2.3.01', name: '임대보증금', englishName: 'Rental Security Deposits', type: 'LIABILITY', level: 4, parentCode: '2.2.3', order: 1, allowTransaction: true, isSystem: false, description: '교회 시설 임대 시' },

  // 2.2.4. 기타비유동부채 - Level 3
  { code: '2.2.4', name: '기타비유동부채', englishName: 'Other Non-current Liabilities', type: 'LIABILITY', level: 3, parentCode: '2.2', order: 4, allowTransaction: false, isSystem: true },
  { code: '2.2.4.01', name: '장기미지급금', englishName: 'Long-term Accounts Payable', type: 'LIABILITY', level: 4, parentCode: '2.2.4', order: 1, allowTransaction: true, isSystem: false },

  // 3. 자본 (EQUITY) - Level 1
  { code: '3', name: '자본', englishName: 'EQUITY', type: 'EQUITY', level: 1, order: 3, allowTransaction: false, isSystem: true },

  // 3.1. 기본재산 - Level 2
  { code: '3.1', name: '기본재산', englishName: 'Basic Assets', type: 'EQUITY', level: 2, parentCode: '3', order: 1, allowTransaction: false, isSystem: true },
  { code: '3.1.1.01', name: '기본재산', englishName: 'Foundation Assets', type: 'EQUITY', level: 3, parentCode: '3.1', order: 1, allowTransaction: true, isSystem: false, description: '설립 시 출연 재산, 처분 제한' },
  { code: '3.1.1.02', name: '목적사업준비금', englishName: 'Program Reserve Fund', type: 'EQUITY', level: 3, parentCode: '3.1', order: 2, allowTransaction: true, isSystem: false, description: '미래 특정 사업을 위한 적립금' },

  // 3.2. 보통재산 - Level 2
  { code: '3.2', name: '보통재산', englishName: 'General Assets', type: 'EQUITY', level: 2, parentCode: '3', order: 2, allowTransaction: false, isSystem: true },
  { code: '3.2.1.01', name: '이월이익잉여금', englishName: 'Retained Earnings', type: 'EQUITY', level: 3, parentCode: '3.2', order: 1, allowTransaction: true, isSystem: false, description: '전기말까지 누적된 잉여금' },
  { code: '3.2.1.02', name: '당기순이익/손실', englishName: 'Net Income/Loss', type: 'EQUITY', level: 3, parentCode: '3.2', order: 2, allowTransaction: true, isSystem: false, description: '당기 발생한 잉여금 또는 손실' },
  { code: '3.2.1.03', name: '적립금', englishName: 'Reserves', type: 'EQUITY', level: 3, parentCode: '3.2', order: 3, allowTransaction: true, isSystem: false, description: '목적에 따라 임의로 적립한 금액' },
  { code: '3.2.1.04', name: '기부금', englishName: 'Donations', type: 'EQUITY', level: 3, parentCode: '3.2', order: 4, allowTransaction: true, isSystem: false, description: '특정 목적 지정 없이 수령한 자본성 기부금' },

  // 3.3. 기타 자본 항목 - Level 2
  { code: '3.3', name: '기타 자본 항목', englishName: 'Other Capital Items', type: 'EQUITY', level: 2, parentCode: '3', order: 3, allowTransaction: false, isSystem: true },
  { code: '3.3.1.01', name: '자산재평가적립금', englishName: 'Asset Revaluation Reserve', type: 'EQUITY', level: 3, parentCode: '3.3', order: 1, allowTransaction: true, isSystem: false, description: '자산 재평가 시 발생하는 적립금' },
  { code: '3.3.1.02', name: '국고보조금', englishName: 'Government Grants', type: 'EQUITY', level: 3, parentCode: '3.3', order: 2, allowTransaction: true, isSystem: false, description: '자산 취득 목적의 보조금' },

  // 4. 수익 (REVENUE) - Level 1
  { code: '4', name: '수익', englishName: 'REVENUE', type: 'REVENUE', level: 1, order: 4, allowTransaction: false, isSystem: true },

  // 4.1. 교회 본연의 수익 - Level 2
  { code: '4.1', name: '교회 본연의 수익', englishName: 'Core Church Revenue', type: 'REVENUE', level: 2, parentCode: '4', order: 1, allowTransaction: false, isSystem: true },

  // 4.1.1. 헌금수익 - Level 3
  { code: '4.1.1', name: '헌금수익', englishName: 'Offering Revenue', type: 'REVENUE', level: 3, parentCode: '4.1', order: 1, allowTransaction: false, isSystem: true },
  { code: '4.1.1.01', name: '십일조 헌금', englishName: 'Tithe Offerings', type: 'REVENUE', level: 4, parentCode: '4.1.1', order: 1, allowTransaction: true, isSystem: false },
  { code: '4.1.1.02', name: '감사 헌금', englishName: 'Thanksgiving Offerings', type: 'REVENUE', level: 4, parentCode: '4.1.1', order: 2, allowTransaction: true, isSystem: false },
  { code: '4.1.1.03', name: '주정 헌금', englishName: 'Weekly Offerings', type: 'REVENUE', level: 4, parentCode: '4.1.1', order: 3, allowTransaction: true, isSystem: false },
  { code: '4.1.1.04', name: '건축 헌금', englishName: 'Building Fund Offerings', type: 'REVENUE', level: 4, parentCode: '4.1.1', order: 4, allowTransaction: true, isSystem: false },
  { code: '4.1.1.05', name: '선교 헌금', englishName: 'Mission Offerings', type: 'REVENUE', level: 4, parentCode: '4.1.1', order: 5, allowTransaction: true, isSystem: false },
  { code: '4.1.1.06', name: '구제 헌금', englishName: 'Relief Offerings', type: 'REVENUE', level: 4, parentCode: '4.1.1', order: 6, allowTransaction: true, isSystem: false },
  { code: '4.1.1.07', name: '교육 헌금', englishName: 'Education Offerings', type: 'REVENUE', level: 4, parentCode: '4.1.1', order: 7, allowTransaction: true, isSystem: false, description: '주일학교, 청년부 등' },
  { code: '4.1.1.08', name: '시설관리 헌금', englishName: 'Facility Management Offerings', type: 'REVENUE', level: 4, parentCode: '4.1.1', order: 8, allowTransaction: true, isSystem: false },
  { code: '4.1.1.09', name: '기타 목적 헌금', englishName: 'Other Purpose Offerings', type: 'REVENUE', level: 4, parentCode: '4.1.1', order: 9, allowTransaction: true, isSystem: false },

  // 4.1.2. 교육수익 - Level 3
  { code: '4.1.2', name: '교육수익', englishName: 'Education Revenue', type: 'REVENUE', level: 3, parentCode: '4.1', order: 2, allowTransaction: false, isSystem: true },
  { code: '4.1.2.01', name: '수련회 참가비', englishName: 'Retreat Fees', type: 'REVENUE', level: 4, parentCode: '4.1.2', order: 1, allowTransaction: true, isSystem: false },
  { code: '4.1.2.02', name: '세미나 등록비', englishName: 'Seminar Registration Fees', type: 'REVENUE', level: 4, parentCode: '4.1.2', order: 2, allowTransaction: true, isSystem: false },
  { code: '4.1.2.03', name: '성경공부 교재비', englishName: 'Bible Study Material Fees', type: 'REVENUE', level: 4, parentCode: '4.1.2', order: 3, allowTransaction: true, isSystem: false },

  // 4.1.3. 기타사업수익 - Level 3
  { code: '4.1.3', name: '기타사업수익', englishName: 'Other Program Revenue', type: 'REVENUE', level: 3, parentCode: '4.1', order: 3, allowTransaction: false, isSystem: true },
  { code: '4.1.3.01', name: '도서 판매 수입', englishName: 'Book Sales Revenue', type: 'REVENUE', level: 4, parentCode: '4.1.3', order: 1, allowTransaction: true, isSystem: false },
  { code: '4.1.3.02', name: '카페 운영 수입', englishName: 'Cafe Operation Revenue', type: 'REVENUE', level: 4, parentCode: '4.1.3', order: 2, allowTransaction: true, isSystem: false },
  { code: '4.1.3.03', name: '식당 운영 수입', englishName: 'Restaurant Operation Revenue', type: 'REVENUE', level: 4, parentCode: '4.1.3', order: 3, allowTransaction: true, isSystem: false },

  // 4.2. 재정 수익 - Level 2
  { code: '4.2', name: '재정 수익', englishName: 'Financial Revenue', type: 'REVENUE', level: 2, parentCode: '4', order: 2, allowTransaction: false, isSystem: true },

  // 4.2.1. 이자수익 - Level 3
  { code: '4.2.1', name: '이자수익', englishName: 'Interest Income', type: 'REVENUE', level: 3, parentCode: '4.2', order: 1, allowTransaction: false, isSystem: true },
  { code: '4.2.1.01', name: '예금 이자', englishName: 'Deposit Interest', type: 'REVENUE', level: 4, parentCode: '4.2.1', order: 1, allowTransaction: true, isSystem: false },
  { code: '4.2.1.02', name: '대여금 이자', englishName: 'Loan Interest Income', type: 'REVENUE', level: 4, parentCode: '4.2.1', order: 2, allowTransaction: true, isSystem: false },

  // 4.2.2. 배당금수익 - Level 3
  { code: '4.2.2', name: '배당금수익', englishName: 'Dividend Income', type: 'REVENUE', level: 3, parentCode: '4.2', order: 2, allowTransaction: false, isSystem: true },
  { code: '4.2.2.01', name: '주식 배당금', englishName: 'Stock Dividends', type: 'REVENUE', level: 4, parentCode: '4.2.2', order: 1, allowTransaction: true, isSystem: false },

  // 4.2.3. 임대료수익 - Level 3
  { code: '4.2.3', name: '임대료수익', englishName: 'Rental Income', type: 'REVENUE', level: 3, parentCode: '4.2', order: 3, allowTransaction: false, isSystem: true },
  { code: '4.2.3.01', name: '부동산 임대료', englishName: 'Real Estate Rental', type: 'REVENUE', level: 4, parentCode: '4.2.3', order: 1, allowTransaction: true, isSystem: false, description: '부속 건물, 유휴 공간' },
  { code: '4.2.3.02', name: '시설 대관료', englishName: 'Facility Rental', type: 'REVENUE', level: 4, parentCode: '4.2.3', order: 2, allowTransaction: true, isSystem: false },

  // 4.2.4. 자산처분이익 - Level 3
  { code: '4.2.4', name: '자산처분이익', englishName: 'Gain on Disposal of Assets', type: 'REVENUE', level: 3, parentCode: '4.2', order: 4, allowTransaction: false, isSystem: true },
  { code: '4.2.4.01', name: '토지 처분 이익', englishName: 'Gain on Land Disposal', type: 'REVENUE', level: 4, parentCode: '4.2.4', order: 1, allowTransaction: true, isSystem: false },
  { code: '4.2.4.02', name: '건물 처분 이익', englishName: 'Gain on Building Disposal', type: 'REVENUE', level: 4, parentCode: '4.2.4', order: 2, allowTransaction: true, isSystem: false },
  { code: '4.2.4.03', name: '비품 처분 이익', englishName: 'Gain on Equipment Disposal', type: 'REVENUE', level: 4, parentCode: '4.2.4', order: 3, allowTransaction: true, isSystem: false },

  // 4.2.5. 외환차익 - Level 3
  { code: '4.2.5', name: '외환차익', englishName: 'Foreign Exchange Gain', type: 'REVENUE', level: 3, parentCode: '4.2', order: 5, allowTransaction: false, isSystem: true },
  { code: '4.2.5.01', name: '외환차익', englishName: 'FX Gain', type: 'REVENUE', level: 4, parentCode: '4.2.5', order: 1, allowTransaction: true, isSystem: false, description: '해외 송금, 수금 관련 환율 변동 이익' },

  // 4.2.6. 잡수익 - Level 3
  { code: '4.2.6', name: '잡수익', englishName: 'Miscellaneous Income', type: 'REVENUE', level: 3, parentCode: '4.2', order: 6, allowTransaction: false, isSystem: true },
  { code: '4.2.6.01', name: '폐품 판매 수입', englishName: 'Scrap Sales Income', type: 'REVENUE', level: 4, parentCode: '4.2.6', order: 1, allowTransaction: true, isSystem: false },
  { code: '4.2.6.02', name: '주차장 수입', englishName: 'Parking Revenue', type: 'REVENUE', level: 4, parentCode: '4.2.6', order: 2, allowTransaction: true, isSystem: false },
  { code: '4.2.6.03', name: '기타 우발적 수익', englishName: 'Other Incidental Income', type: 'REVENUE', level: 4, parentCode: '4.2.6', order: 3, allowTransaction: true, isSystem: false },

  // 5. 비용 (EXPENSE) - Level 1
  { code: '5', name: '비용', englishName: 'EXPENSE', type: 'EXPENSE', level: 1, order: 5, allowTransaction: false, isSystem: true },

  // 5.1. 일반관리비 - Level 2
  { code: '5.1', name: '일반관리비', englishName: 'General & Administrative Expenses', type: 'EXPENSE', level: 2, parentCode: '5', order: 1, allowTransaction: false, isSystem: true },

  // 5.1.1. 인건비 - Level 3
  { code: '5.1.1', name: '인건비', englishName: 'Personnel Expenses', type: 'EXPENSE', level: 3, parentCode: '5.1', order: 1, allowTransaction: false, isSystem: true },
  { code: '5.1.1.01', name: '교역자 급여', englishName: 'Pastor Salaries', type: 'EXPENSE', level: 4, parentCode: '5.1.1', order: 1, allowTransaction: true, isSystem: false, description: '담임목사, 부목사, 전도사 등' },
  { code: '5.1.1.02', name: '직원 급여', englishName: 'Staff Salaries', type: 'EXPENSE', level: 4, parentCode: '5.1.1', order: 2, allowTransaction: true, isSystem: false, description: '행정직, 관리직 등' },
  { code: '5.1.1.03', name: '상여금', englishName: 'Bonuses', type: 'EXPENSE', level: 4, parentCode: '5.1.1', order: 3, allowTransaction: true, isSystem: false, description: '교역자, 직원' },
  { code: '5.1.1.04', name: '퇴직급여', englishName: 'Severance Pay', type: 'EXPENSE', level: 4, parentCode: '5.1.1', order: 4, allowTransaction: true, isSystem: false, description: '퇴직금 지급' },
  { code: '5.1.1.05', name: '사회보험료', englishName: 'Social Insurance', type: 'EXPENSE', level: 4, parentCode: '5.1.1', order: 5, allowTransaction: true, isSystem: false, description: '국민연금, 건강보험, 고용보험, 산재보험 등 교회 부담분' },
  { code: '5.1.1.06', name: '복리후생비', englishName: 'Employee Benefits', type: 'EXPENSE', level: 4, parentCode: '5.1.1', order: 6, allowTransaction: true, isSystem: false, description: '식대, 교통비, 경조사비, 선물 등' },
  { code: '5.1.1.07', name: '제수당', englishName: 'Allowances', type: 'EXPENSE', level: 4, parentCode: '5.1.1', order: 7, allowTransaction: true, isSystem: false, description: '시간 외 수당, 직책 수당 등' },

  // 5.1.2. 제세공과금 - Level 3
  { code: '5.1.2', name: '제세공과금', englishName: 'Taxes & Dues', type: 'EXPENSE', level: 3, parentCode: '5.1', order: 2, allowTransaction: false, isSystem: true },
  { code: '5.1.2.01', name: '재산세', englishName: 'Property Tax', type: 'EXPENSE', level: 4, parentCode: '5.1.2', order: 1, allowTransaction: true, isSystem: false },
  { code: '5.1.2.02', name: '자동차세', englishName: 'Automobile Tax', type: 'EXPENSE', level: 4, parentCode: '5.1.2', order: 2, allowTransaction: true, isSystem: false },
  { code: '5.1.2.03', name: '취득세, 등록면허세', englishName: 'Acquisition & Registration Tax', type: 'EXPENSE', level: 4, parentCode: '5.1.2', order: 3, allowTransaction: true, isSystem: false, description: '자산 취득 시' },
  { code: '5.1.2.04', name: '전기요금, 수도요금, 가스요금', englishName: 'Utilities', type: 'EXPENSE', level: 4, parentCode: '5.1.2', order: 4, allowTransaction: true, isSystem: false, description: '공과금' },
  { code: '5.1.2.05', name: '방송수신료', englishName: 'Broadcasting Fees', type: 'EXPENSE', level: 4, parentCode: '5.1.2', order: 5, allowTransaction: true, isSystem: false },
  { code: '5.1.2.06', name: '환경개선부담금', englishName: 'Environmental Improvement Charge', type: 'EXPENSE', level: 4, parentCode: '5.1.2', order: 6, allowTransaction: true, isSystem: false },

  // 5.1.3. 사무관리비 - Level 3
  { code: '5.1.3', name: '사무관리비', englishName: 'Office & Administrative Expenses', type: 'EXPENSE', level: 3, parentCode: '5.1', order: 3, allowTransaction: false, isSystem: true },
  { code: '5.1.3.01', name: '통신비', englishName: 'Communication Expenses', type: 'EXPENSE', level: 4, parentCode: '5.1.3', order: 1, allowTransaction: true, isSystem: false, description: '전화, 인터넷, 휴대폰' },
  { code: '5.1.3.02', name: '소모품비', englishName: 'Supplies Expenses', type: 'EXPENSE', level: 4, parentCode: '5.1.3', order: 2, allowTransaction: true, isSystem: false, description: '사무용품, 청소용품 등' },
  { code: '5.1.3.03', name: '도서인쇄비', englishName: 'Books & Printing', type: 'EXPENSE', level: 4, parentCode: '5.1.3', order: 3, allowTransaction: true, isSystem: false, description: '주보, 교재, 도서 구입' },
  { code: '5.1.3.04', name: '차량유지비', englishName: 'Vehicle Maintenance', type: 'EXPENSE', level: 4, parentCode: '5.1.3', order: 4, allowTransaction: true, isSystem: false, description: '유류비, 수리비, 보험료 등' },
  { code: '5.1.3.05', name: '보험료', englishName: 'Insurance Premiums', type: 'EXPENSE', level: 4, parentCode: '5.1.3', order: 5, allowTransaction: true, isSystem: false, description: '화재보험, 배상책임보험 등' },
  { code: '5.1.3.06', name: '수선비', englishName: 'Repair & Maintenance', type: 'EXPENSE', level: 4, parentCode: '5.1.3', order: 6, allowTransaction: true, isSystem: false, description: '건물, 비품 수리 유지' },
  { code: '5.1.3.07', name: '제수수료', englishName: 'Various Fees', type: 'EXPENSE', level: 4, parentCode: '5.1.3', order: 7, allowTransaction: true, isSystem: false, description: '은행 수수료, 법무 수수료 등' },
  { code: '5.1.3.08', name: '임차료', englishName: 'Rental Expenses', type: 'EXPENSE', level: 4, parentCode: '5.1.3', order: 8, allowTransaction: true, isSystem: false, description: '건물, 장비 임차' },
  { code: '5.1.3.09', name: '감가상각비', englishName: 'Depreciation Expenses', type: 'EXPENSE', level: 4, parentCode: '5.1.3', order: 9, allowTransaction: true, isSystem: false, description: '유형, 무형자산' },
  { code: '5.1.3.10', name: '여비교통비', englishName: 'Travel Expenses', type: 'EXPENSE', level: 4, parentCode: '5.1.3', order: 10, allowTransaction: true, isSystem: false, description: '출장비, 교통비' },
  { code: '5.1.3.11', name: '접대비', englishName: 'Entertainment Expenses', type: 'EXPENSE', level: 4, parentCode: '5.1.3', order: 11, allowTransaction: true, isSystem: false, description: '대외 관계 유지' },
  { code: '5.1.3.12', name: '광고선전비', englishName: 'Advertising Expenses', type: 'EXPENSE', level: 4, parentCode: '5.1.3', order: 12, allowTransaction: true, isSystem: false, description: '교회 홍보, 전도지' },
  { code: '5.1.3.13', name: '교육훈련비', englishName: 'Training Expenses', type: 'EXPENSE', level: 4, parentCode: '5.1.3', order: 13, allowTransaction: true, isSystem: false, description: '직원, 교역자 교육' },
  { code: '5.1.3.14', name: '연구개발비', englishName: 'R&D Expenses', type: 'EXPENSE', level: 4, parentCode: '5.1.3', order: 14, allowTransaction: true, isSystem: false, description: '새로운 프로그램 개발 등' },
  { code: '5.1.3.15', name: '세금과공과금', englishName: 'Taxes and Public Dues', type: 'EXPENSE', level: 4, parentCode: '5.1.3', order: 15, allowTransaction: true, isSystem: false, description: '재산세 등' },

  // 5.2. 고유목적사업비 - Level 2
  { code: '5.2', name: '고유목적사업비', englishName: 'Specific Program Expenses', type: 'EXPENSE', level: 2, parentCode: '5', order: 2, allowTransaction: false, isSystem: true },

  // 5.2.1. 예배 및 행사비 - Level 3
  { code: '5.2.1', name: '예배 및 행사비', englishName: 'Worship & Event Expenses', type: 'EXPENSE', level: 3, parentCode: '5.2', order: 1, allowTransaction: false, isSystem: true },
  { code: '5.2.1.01', name: '예배 준비비', englishName: 'Worship Preparation', type: 'EXPENSE', level: 4, parentCode: '5.2.1', order: 1, allowTransaction: true, isSystem: false, description: '성찬 용품, 꽃 등' },
  { code: '5.2.1.02', name: '특별 예배 초청 강사비', englishName: 'Special Service Speaker Fees', type: 'EXPENSE', level: 4, parentCode: '5.2.1', order: 2, allowTransaction: true, isSystem: false },
  { code: '5.2.1.03', name: '찬양대 지원비', englishName: 'Choir Support', type: 'EXPENSE', level: 4, parentCode: '5.2.1', order: 3, allowTransaction: true, isSystem: false, description: '악보, 의상 등' },
  { code: '5.2.1.04', name: '행사 진행비', englishName: 'Event Management', type: 'EXPENSE', level: 4, parentCode: '5.2.1', order: 4, allowTransaction: true, isSystem: false, description: '예배 외 행사' },
  { code: '5.2.1.05', name: '성탄절/부활절 행사비', englishName: 'Christmas/Easter Events', type: 'EXPENSE', level: 4, parentCode: '5.2.1', order: 5, allowTransaction: true, isSystem: false },

  // 5.2.2. 교육사업비 - Level 3
  { code: '5.2.2', name: '교육사업비', englishName: 'Educational Program Expenses', type: 'EXPENSE', level: 3, parentCode: '5.2', order: 2, allowTransaction: false, isSystem: true },
  { code: '5.2.2.01', name: '주일학교 운영비', englishName: 'Sunday School Operations', type: 'EXPENSE', level: 4, parentCode: '5.2.2', order: 1, allowTransaction: true, isSystem: false, description: '교사 수고비, 간식, 재료비' },
  { code: '5.2.2.02', name: '청년부/장년부 교육비', englishName: 'Youth/Adult Education', type: 'EXPENSE', level: 4, parentCode: '5.2.2', order: 2, allowTransaction: true, isSystem: false },
  { code: '5.2.2.03', name: '수련회/캠프 진행비', englishName: 'Retreat/Camp Expenses', type: 'EXPENSE', level: 4, parentCode: '5.2.2', order: 3, allowTransaction: true, isSystem: false },
  { code: '5.2.2.04', name: '제자훈련 교재비, 강사비', englishName: 'Discipleship Training', type: 'EXPENSE', level: 4, parentCode: '5.2.2', order: 4, allowTransaction: true, isSystem: false },

  // 5.2.3. 선교사업비 - Level 3
  { code: '5.2.3', name: '선교사업비', englishName: 'Missionary Program Expenses', type: 'EXPENSE', level: 3, parentCode: '5.2', order: 3, allowTransaction: false, isSystem: true },
  { code: '5.2.3.01', name: '국내 선교비', englishName: 'Domestic Mission', type: 'EXPENSE', level: 4, parentCode: '5.2.3', order: 1, allowTransaction: true, isSystem: false, description: '미자립 교회 지원, 농어촌 선교' },
  { code: '5.2.3.02', name: '해외 선교비', englishName: 'Overseas Mission', type: 'EXPENSE', level: 4, parentCode: '5.2.3', order: 2, allowTransaction: true, isSystem: false, description: '선교사 지원, 현지 사역비' },
  { code: '5.2.3.03', name: '단기 선교비', englishName: 'Short-term Mission', type: 'EXPENSE', level: 4, parentCode: '5.2.3', order: 3, allowTransaction: true, isSystem: false },

  // 5.2.4. 구제사업비 - Level 3
  { code: '5.2.4', name: '구제사업비', englishName: 'Relief Program Expenses', type: 'EXPENSE', level: 3, parentCode: '5.2', order: 4, allowTransaction: false, isSystem: true },
  { code: '5.2.4.01', name: '불우이웃돕기', englishName: 'Charity Support', type: 'EXPENSE', level: 4, parentCode: '5.2.4', order: 1, allowTransaction: true, isSystem: false, description: '교회 내, 외부' },
  { code: '5.2.4.02', name: '재난 구호 성금', englishName: 'Disaster Relief Fund', type: 'EXPENSE', level: 4, parentCode: '5.2.4', order: 2, allowTransaction: true, isSystem: false },
  { code: '5.2.4.03', name: '의료비 지원', englishName: 'Medical Support', type: 'EXPENSE', level: 4, parentCode: '5.2.4', order: 3, allowTransaction: true, isSystem: false },

  // 5.2.5. 봉사사업비 - Level 3
  { code: '5.2.5', name: '봉사사업비', englishName: 'Service Program Expenses', type: 'EXPENSE', level: 3, parentCode: '5.2', order: 5, allowTransaction: false, isSystem: true },
  { code: '5.2.5.01', name: '지역사회 봉사비', englishName: 'Community Service', type: 'EXPENSE', level: 4, parentCode: '5.2.5', order: 1, allowTransaction: true, isSystem: false, description: '환경 미화, 급식 봉사 등' },
  { code: '5.2.5.02', name: '양로원/고아원 방문', englishName: 'Care Home Visits', type: 'EXPENSE', level: 4, parentCode: '5.2.5', order: 2, allowTransaction: true, isSystem: false },

  // 5.2.6. 문화사업비 - Level 3
  { code: '5.2.6', name: '문화사업비', englishName: 'Cultural Program Expenses', type: 'EXPENSE', level: 3, parentCode: '5.2', order: 6, allowTransaction: false, isSystem: true },
  { code: '5.2.6.01', name: '문화 강좌 운영비', englishName: 'Cultural Class Operations', type: 'EXPENSE', level: 4, parentCode: '5.2.6', order: 1, allowTransaction: true, isSystem: false },
  { code: '5.2.6.02', name: '공연 개최 비용', englishName: 'Performance Hosting', type: 'EXPENSE', level: 4, parentCode: '5.2.6', order: 2, allowTransaction: true, isSystem: false },

  // 5.2.7. 미디어/온라인 사역비 - Level 3
  { code: '5.2.7', name: '미디어/온라인 사역비', englishName: 'Media/Online Ministry Expenses', type: 'EXPENSE', level: 3, parentCode: '5.2', order: 7, allowTransaction: false, isSystem: true },
  { code: '5.2.7.01', name: '영상 제작비', englishName: 'Video Production', type: 'EXPENSE', level: 4, parentCode: '5.2.7', order: 1, allowTransaction: true, isSystem: false },
  { code: '5.2.7.02', name: '온라인 플랫폼 사용료', englishName: 'Online Platform Fees', type: 'EXPENSE', level: 4, parentCode: '5.2.7', order: 2, allowTransaction: true, isSystem: false },
  { code: '5.2.7.03', name: '홈페이지 관리비', englishName: 'Website Maintenance', type: 'EXPENSE', level: 4, parentCode: '5.2.7', order: 3, allowTransaction: true, isSystem: false },

  // 5.3. 재정 비용 - Level 2
  { code: '5.3', name: '재정 비용', englishName: 'Financial Expenses', type: 'EXPENSE', level: 2, parentCode: '5', order: 3, allowTransaction: false, isSystem: true },

  // 5.3.1. 이자비용 - Level 3
  { code: '5.3.1', name: '이자비용', englishName: 'Interest Expense', type: 'EXPENSE', level: 3, parentCode: '5.3', order: 1, allowTransaction: false, isSystem: true },
  { code: '5.3.1.01', name: '차입금 이자', englishName: 'Borrowing Interest', type: 'EXPENSE', level: 4, parentCode: '5.3.1', order: 1, allowTransaction: true, isSystem: false, description: '은행, 개인' },

  // 5.3.2. 외환차손 - Level 3
  { code: '5.3.2', name: '외환차손', englishName: 'Foreign Exchange Loss', type: 'EXPENSE', level: 3, parentCode: '5.3', order: 2, allowTransaction: false, isSystem: true },
  { code: '5.3.2.01', name: '외환차손', englishName: 'FX Loss', type: 'EXPENSE', level: 4, parentCode: '5.3.2', order: 1, allowTransaction: true, isSystem: false, description: '해외 송금, 수금 관련 환율 변동 손실' },

  // 5.3.3. 자산처분손실 - Level 3
  { code: '5.3.3', name: '자산처분손실', englishName: 'Loss on Disposal of Assets', type: 'EXPENSE', level: 3, parentCode: '5.3', order: 3, allowTransaction: false, isSystem: true },
  { code: '5.3.3.01', name: '토지 처분 손실', englishName: 'Loss on Land Disposal', type: 'EXPENSE', level: 4, parentCode: '5.3.3', order: 1, allowTransaction: true, isSystem: false },
  { code: '5.3.3.02', name: '건물 처분 손실', englishName: 'Loss on Building Disposal', type: 'EXPENSE', level: 4, parentCode: '5.3.3', order: 2, allowTransaction: true, isSystem: false },
  { code: '5.3.3.03', name: '비품 처분 손실', englishName: 'Loss on Equipment Disposal', type: 'EXPENSE', level: 4, parentCode: '5.3.3', order: 3, allowTransaction: true, isSystem: false },

  // 5.3.4. 잡손실 - Level 3
  { code: '5.3.4', name: '잡손실', englishName: 'Miscellaneous Loss', type: 'EXPENSE', level: 3, parentCode: '5.3', order: 4, allowTransaction: false, isSystem: true },
  { code: '5.3.4.01', name: '재고 자산 감모 손실', englishName: 'Inventory Loss', type: 'EXPENSE', level: 4, parentCode: '5.3.4', order: 1, allowTransaction: true, isSystem: false },
  { code: '5.3.4.02', name: '기타 우발적 손실', englishName: 'Other Incidental Loss', type: 'EXPENSE', level: 4, parentCode: '5.3.4', order: 2, allowTransaction: true, isSystem: false },
]

async function seedAccountCodes() {
  console.log('Starting account codes seeding...')

  // Create a map to store created account IDs by code
  const accountMap = new Map<string, string>()

  try {
    // Sort account codes by level to ensure parents are created before children
    const sortedAccountCodes = accountCodes.sort((a, b) => a.level - b.level || a.order - b.order)

    for (const account of sortedAccountCodes) {
      let parentId: string | undefined

      // Find parent ID if parentCode exists
      if (account.parentCode) {
        parentId = accountMap.get(account.parentCode)
        if (!parentId) {
          throw new Error(`Parent account code ${account.parentCode} not found for ${account.code}`)
        }
      }

      // Create the account code
      const createdAccount = await prisma.accountCode.create({
        data: {
          code: account.code,
          name: account.name,
          englishName: account.englishName,
          type: account.type,
          level: account.level,
          parentId,
          order: account.order,
          allowTransaction: account.allowTransaction,
          isSystem: account.isSystem,
          description: account.description,
          isActive: true,
          // churchId: null for system-wide account codes
        },
      })

      // Store the created account ID in the map
      accountMap.set(account.code, createdAccount.id)

      console.log(`✅ Created account code: ${account.code} - ${account.name}`)
    }

    console.log(`\n🎉 Successfully seeded ${accountCodes.length} account codes with hierarchical structure!`)

  } catch (error) {
    console.error('Error seeding account codes:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

export { seedAccountCodes, accountCodes }

// Run the seeding if this file is executed directly
if (require.main === module) {
  seedAccountCodes()
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
}