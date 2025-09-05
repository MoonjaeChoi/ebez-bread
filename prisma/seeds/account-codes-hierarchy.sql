-- Account Codes Hierarchical Structure
-- Generated from ACCT_CODE.md file
-- Maintains parent-child relationships for proper accounting structure

-- 1. 자산 (ASSET) - Level 1
INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('asset-root', '1', '자산', 'ASSET', 'ASSET', 1, NULL, 1, false, true, true, NULL, NOW(), NOW());

-- 1.1. 유동자산 - Level 2
INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('current-assets', '1.1', '유동자산', 'Current Assets', 'ASSET', 2, 'asset-root', 1, false, true, true, NULL, NOW(), NOW());

-- 1.1.1. 당좌자산 - Level 3
INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('cash-equivalents', '1.1.1', '당좌자산', 'Cash & Cash Equivalents', 'ASSET', 3, 'current-assets', 1, false, true, true, NULL, NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('cash-01', '1.1.1.01', '현금', 'Cash', 'ASSET', 4, 'cash-equivalents', 1, true, false, true, NULL, NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('checking-02', '1.1.1.02', '당좌예금', 'Checking Account', 'ASSET', 4, 'cash-equivalents', 2, true, false, true, NULL, NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('savings-03', '1.1.1.03', '보통예금', 'Savings Account', 'ASSET', 4, 'cash-equivalents', 3, true, false, true, NULL, NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('other-deposits-04', '1.1.1.04', '기타예금', 'Other Deposits', 'ASSET', 4, 'cash-equivalents', 4, true, false, true, 'CMA, MMF 등', NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('short-securities-05', '1.1.1.05', '단기매매증권', 'Short-term Securities', 'ASSET', 4, 'cash-equivalents', 5, true, false, true, '주식, 채권 등', NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('short-loans-06', '1.1.1.06', '단기대여금', 'Short-term Loans', 'ASSET', 4, 'cash-equivalents', 6, true, false, true, '교인, 타교회 등', NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('accounts-receivable-07', '1.1.1.07', '미수금', 'Accounts Receivable', 'ASSET', 4, 'cash-equivalents', 7, true, false, true, '정부 보조금 미수 등', NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('prepaid-expenses-08', '1.1.1.08', '선급금', 'Prepaid Expenses', 'ASSET', 4, 'cash-equivalents', 8, true, false, true, '임차료, 보험료 선급 등', NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('prepaid-costs-09', '1.1.1.09', '선급비용', 'Prepaid Costs', 'ASSET', 4, 'cash-equivalents', 9, true, false, true, '선지급한 비용 중 차기 이후분', NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('temp-payments-10', '1.1.1.10', '가지급금', 'Temporary Payments', 'ASSET', 4, 'cash-equivalents', 10, true, false, true, '용도 미확정 지출', NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('withholding-tax-11', '1.1.1.11', '예수금', 'Withholding Tax', 'ASSET', 4, 'cash-equivalents', 11, true, false, true, '원천징수세액, 사회보험료 등', NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('vat-receivable-12', '1.1.1.12', '부가세대급금', 'VAT Receivable', 'ASSET', 4, 'cash-equivalents', 12, true, false, true, '매입세액', NOW(), NOW());

-- 1.1.2. 재고자산 - Level 3
INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('inventories', '1.1.2', '재고자산', 'Inventories', 'ASSET', 3, 'current-assets', 2, false, true, true, NULL, NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('office-supplies-01', '1.1.2.01', '소모품', 'Office Supplies', 'ASSET', 4, 'inventories', 1, true, false, true, '사무용품, 청소용품 등 미사용분', NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('books-for-sale-02', '1.1.2.02', '판매용 도서/물품', 'Books/Items for Sale', 'ASSET', 4, 'inventories', 2, true, false, true, '교회 서점 등', NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('food-inventory-03', '1.1.2.03', '식료품 재고', 'Food Inventory', 'ASSET', 4, 'inventories', 3, true, false, true, '식당 운영 시', NOW(), NOW());

-- 1.2. 비유동자산 - Level 2
INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('non-current-assets', '1.2', '비유동자산', 'Non-current Assets', 'ASSET', 2, 'asset-root', 2, false, true, true, NULL, NOW(), NOW());

-- 1.2.1. 투자자산 - Level 3
INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('investment-assets', '1.2.1', '투자자산', 'Investment Assets', 'ASSET', 3, 'non-current-assets', 1, false, true, true, NULL, NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('long-financial-01', '1.2.1.01', '장기금융상품', 'Long-term Financial Products', 'ASSET', 4, 'investment-assets', 1, true, false, true, '정기예금, 적금 등', NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('long-loans-02', '1.2.1.02', '장기대여금', 'Long-term Loans', 'ASSET', 4, 'investment-assets', 2, true, false, true, '교인, 타교회 등 장기 회수 예정', NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('long-securities-03', '1.2.1.03', '장기투자증권', 'Long-term Investment Securities', 'ASSET', 4, 'investment-assets', 3, true, false, true, '만기보유증권, 매도가능증권', NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('investment-realestate-04', '1.2.1.04', '투자부동산', 'Investment Real Estate', 'ASSET', 4, 'investment-assets', 4, true, false, true, '임대수익 목적 부동산', NOW(), NOW());

-- 1.2.2. 유형자산 - Level 3
INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('property-plant-equipment', '1.2.2', '유형자산', 'Property, Plant & Equipment', 'ASSET', 3, 'non-current-assets', 2, false, true, true, NULL, NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('land-01', '1.2.2.01', '토지', 'Land', 'ASSET', 4, 'property-plant-equipment', 1, true, false, true, '교회 부지', NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('buildings-02', '1.2.2.02', '건물', 'Buildings', 'ASSET', 4, 'property-plant-equipment', 2, true, false, true, '예배당, 교육관, 사택 등', NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('structures-03', '1.2.2.03', '구축물', 'Structures', 'ASSET', 4, 'property-plant-equipment', 3, true, false, true, '주차장, 담장, 조경시설 등', NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('machinery-04', '1.2.2.04', '기계장치', 'Machinery', 'ASSET', 4, 'property-plant-equipment', 4, true, false, true, '음향, 영상 장비, 발전기 등', NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('vehicles-05', '1.2.2.05', '차량운반구', 'Vehicles', 'ASSET', 4, 'property-plant-equipment', 5, true, false, true, '승합차, 승용차 등', NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('equipment-06', '1.2.2.06', '비품', 'Equipment', 'ASSET', 4, 'property-plant-equipment', 6, true, false, true, '사무용 책상, 의자, 컴퓨터, 가전제품 등', NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('construction-progress-07', '1.2.2.07', '건설중인자산', 'Construction in Progress', 'ASSET', 4, 'property-plant-equipment', 7, true, false, true, '신축, 증축 중인 건물 등', NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('accumulated-depreciation-08', '1.2.2.08', '감가상각누계액', 'Accumulated Depreciation', 'ASSET', 4, 'property-plant-equipment', 8, true, false, true, '각 유형자산별 차감 계정', NOW(), NOW());

-- 1.2.3. 무형자산 - Level 3
INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('intangible-assets', '1.2.3', '무형자산', 'Intangible Assets', 'ASSET', 3, 'non-current-assets', 3, false, true, true, NULL, NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('software-01', '1.2.3.01', '소프트웨어', 'Software', 'ASSET', 4, 'intangible-assets', 1, true, false, true, '교회 관리 프로그램, 미디어 제작 프로그램', NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('copyright-02', '1.2.3.02', '저작권', 'Copyright', 'ASSET', 4, 'intangible-assets', 2, true, false, true, '찬양, 설교 콘텐츠 등', NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('development-costs-03', '1.2.3.03', '개발비', 'Development Costs', 'ASSET', 4, 'intangible-assets', 3, true, false, true, '새로운 프로그램 또는 시스템 개발 비용', NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('patent-rights-04', '1.2.3.04', '특허권', 'Patent Rights', 'ASSET', 4, 'intangible-assets', 4, true, false, true, '보유 시', NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('trademark-rights-05', '1.2.3.05', '상표권', 'Trademark Rights', 'ASSET', 4, 'intangible-assets', 5, true, false, true, '교회 고유 로고, 이름 등', NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('key-money-06', '1.2.3.06', '권리금', 'Key Money', 'ASSET', 4, 'intangible-assets', 6, true, false, true, '건물 임차 시 지급', NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('accumulated-amortization-07', '1.2.3.07', '감가상각누계액', 'Accumulated Amortization', 'ASSET', 4, 'intangible-assets', 7, true, false, true, '각 무형자산별 차감 계정', NOW(), NOW());

-- 1.2.4. 기타비유동자산 - Level 3
INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('other-non-current-assets', '1.2.4', '기타비유동자산', 'Other Non-current Assets', 'ASSET', 3, 'non-current-assets', 4, false, true, true, NULL, NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('rental-deposits-01', '1.2.4.01', '임차보증금', 'Rental Deposits', 'ASSET', 4, 'other-non-current-assets', 1, true, false, true, '건물 임차 시', NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('jeonse-rights-02', '1.2.4.02', '전세권', 'Jeonse Rights', 'ASSET', 4, 'other-non-current-assets', 2, true, false, true, '사택 등', NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('long-prepaid-expenses-03', '1.2.4.03', '장기선급비용', 'Long-term Prepaid Expenses', 'ASSET', 4, 'other-non-current-assets', 3, true, false, true, '장기 보험료 등', NOW(), NOW());

-- 2. 부채 (LIABILITY) - Level 1
INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('liability-root', '2', '부채', 'LIABILITY', 'LIABILITY', 1, NULL, 2, false, true, true, NULL, NOW(), NOW());

-- 2.1. 유동부채 - Level 2
INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('current-liabilities', '2.1', '유동부채', 'Current Liabilities', 'LIABILITY', 2, 'liability-root', 1, false, true, true, NULL, NOW(), NOW());

-- 2.1.1. 단기차입금 - Level 3
INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('short-term-borrowings', '2.1.1', '단기차입금', 'Short-term Borrowings', 'LIABILITY', 3, 'current-liabilities', 1, false, true, true, NULL, NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('bank-short-loans-01', '2.1.1.01', '은행 단기차입금', 'Bank Short-term Loans', 'LIABILITY', 4, 'short-term-borrowings', 1, true, false, true, NULL, NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('member-short-loans-02', '2.1.1.02', '교인 단기차입금', 'Member Short-term Loans', 'LIABILITY', 4, 'short-term-borrowings', 2, true, false, true, NULL, NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('other-short-loans-03', '2.1.1.03', '기타 단기차입금', 'Other Short-term Loans', 'LIABILITY', 4, 'short-term-borrowings', 3, true, false, true, NULL, NOW(), NOW());

-- Continue with LIABILITY accounts...
-- 2.1.2. 미지급금 - Level 3
INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('accounts-payable', '2.1.2', '미지급금', 'Accounts Payable', 'LIABILITY', 3, 'current-liabilities', 2, false, true, true, NULL, NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('unpaid-utilities-01', '2.1.2.01', '미지급 공과금', 'Unpaid Utilities', 'LIABILITY', 4, 'accounts-payable', 1, true, false, true, '전기료, 수도료 등', NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('unpaid-management-02', '2.1.2.02', '미지급 관리비', 'Unpaid Management Fees', 'LIABILITY', 4, 'accounts-payable', 2, true, false, true, NULL, NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('unpaid-service-03', '2.1.2.03', '미지급 용역비', 'Unpaid Service Fees', 'LIABILITY', 4, 'accounts-payable', 3, true, false, true, '강사료, 청소비 등', NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('unpaid-meal-04', '2.1.2.04', '미지급 식비', 'Unpaid Meal Costs', 'LIABILITY', 4, 'accounts-payable', 4, true, false, true, '식당 운영 시', NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('unpaid-communication-05', '2.1.2.05', '미지급 통신비', 'Unpaid Communication Fees', 'LIABILITY', 4, 'accounts-payable', 5, true, false, true, NULL, NOW(), NOW());

-- 3. 자본 (EQUITY) - Level 1
INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('equity-root', '3', '자본', 'EQUITY', 'EQUITY', 1, NULL, 3, false, true, true, NULL, NOW(), NOW());

-- 3.1. 기본재산 - Level 2
INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('basic-assets', '3.1', '기본재산', 'Basic Assets', 'EQUITY', 2, 'equity-root', 1, false, true, true, NULL, NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('foundation-assets-01', '3.1.1.01', '기본재산', 'Foundation Assets', 'EQUITY', 3, 'basic-assets', 1, true, false, true, '설립 시 출연 재산, 처분 제한', NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('program-reserve-02', '3.1.1.02', '목적사업준비금', 'Program Reserve Fund', 'EQUITY', 3, 'basic-assets', 2, true, false, true, '미래 특정 사업을 위한 적립금', NOW(), NOW());

-- 3.2. 보통재산 - Level 2
INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('general-assets', '3.2', '보통재산', 'General Assets', 'EQUITY', 2, 'equity-root', 2, false, true, true, NULL, NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('retained-earnings-01', '3.2.1.01', '이월이익잉여금', 'Retained Earnings', 'EQUITY', 3, 'general-assets', 1, true, false, true, '전기말까지 누적된 잉여금', NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('net-income-02', '3.2.1.02', '당기순이익/손실', 'Net Income/Loss', 'EQUITY', 3, 'general-assets', 2, true, false, true, '당기 발생한 잉여금 또는 손실', NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('reserves-03', '3.2.1.03', '적립금', 'Reserves', 'EQUITY', 3, 'general-assets', 3, true, false, true, '목적에 따라 임의로 적립한 금액', NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('donations-04', '3.2.1.04', '기부금', 'Donations', 'EQUITY', 3, 'general-assets', 4, true, false, true, '특정 목적 지정 없이 수령한 자본성 기부금', NOW(), NOW());

-- 4. 수익 (REVENUE) - Level 1
INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('revenue-root', '4', '수익', 'REVENUE', 'REVENUE', 1, NULL, 4, false, true, true, NULL, NOW(), NOW());

-- 4.1. 교회 본연의 수익 - Level 2
INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('core-revenue', '4.1', '교회 본연의 수익', 'Core Church Revenue', 'REVENUE', 2, 'revenue-root', 1, false, true, true, NULL, NOW(), NOW());

-- 4.1.1. 헌금수익 - Level 3
INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('offering-revenue', '4.1.1', '헌금수익', 'Offering Revenue', 'REVENUE', 3, 'core-revenue', 1, false, true, true, NULL, NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('tithe-offerings-01', '4.1.1.01', '십일조 헌금', 'Tithe Offerings', 'REVENUE', 4, 'offering-revenue', 1, true, false, true, NULL, NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('thanksgiving-offerings-02', '4.1.1.02', '감사 헌금', 'Thanksgiving Offerings', 'REVENUE', 4, 'offering-revenue', 2, true, false, true, NULL, NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('weekly-offerings-03', '4.1.1.03', '주정 헌금', 'Weekly Offerings', 'REVENUE', 4, 'offering-revenue', 3, true, false, true, NULL, NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('building-fund-04', '4.1.1.04', '건축 헌금', 'Building Fund Offerings', 'REVENUE', 4, 'offering-revenue', 4, true, false, true, NULL, NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('mission-offerings-05', '4.1.1.05', '선교 헌금', 'Mission Offerings', 'REVENUE', 4, 'offering-revenue', 5, true, false, true, NULL, NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('relief-offerings-06', '4.1.1.06', '구제 헌금', 'Relief Offerings', 'REVENUE', 4, 'offering-revenue', 6, true, false, true, NULL, NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('education-offerings-07', '4.1.1.07', '교육 헌금', 'Education Offerings', 'REVENUE', 4, 'offering-revenue', 7, true, false, true, '주일학교, 청년부 등', NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('facility-offerings-08', '4.1.1.08', '시설관리 헌금', 'Facility Management Offerings', 'REVENUE', 4, 'offering-revenue', 8, true, false, true, NULL, NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('other-offerings-09', '4.1.1.09', '기타 목적 헌금', 'Other Purpose Offerings', 'REVENUE', 4, 'offering-revenue', 9, true, false, true, NULL, NOW(), NOW());

-- 5. 비용 (EXPENSE) - Level 1
INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('expense-root', '5', '비용', 'EXPENSE', 'EXPENSE', 1, NULL, 5, false, true, true, NULL, NOW(), NOW());

-- 5.1. 일반관리비 - Level 2
INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('general-admin-expenses', '5.1', '일반관리비', 'General & Administrative Expenses', 'EXPENSE', 2, 'expense-root', 1, false, true, true, NULL, NOW(), NOW());

-- 5.1.1. 인건비 - Level 3
INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('personnel-expenses', '5.1.1', '인건비', 'Personnel Expenses', 'EXPENSE', 3, 'general-admin-expenses', 1, false, true, true, NULL, NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('pastor-salaries-01', '5.1.1.01', '교역자 급여', 'Pastor Salaries', 'EXPENSE', 4, 'personnel-expenses', 1, true, false, true, '담임목사, 부목사, 전도사 등', NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('staff-salaries-02', '5.1.1.02', '직원 급여', 'Staff Salaries', 'EXPENSE', 4, 'personnel-expenses', 2, true, false, true, '행정직, 관리직 등', NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('bonuses-03', '5.1.1.03', '상여금', 'Bonuses', 'EXPENSE', 4, 'personnel-expenses', 3, true, false, true, '교역자, 직원', NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('severance-pay-04', '5.1.1.04', '퇴직급여', 'Severance Pay', 'EXPENSE', 4, 'personnel-expenses', 4, true, false, true, '퇴직금 지급', NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('social-insurance-05', '5.1.1.05', '사회보험료', 'Social Insurance', 'EXPENSE', 4, 'personnel-expenses', 5, true, false, true, '국민연금, 건강보험, 고용보험, 산재보험 등 교회 부담분', NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('employee-benefits-06', '5.1.1.06', '복리후생비', 'Employee Benefits', 'EXPENSE', 4, 'personnel-expenses', 6, true, false, true, '식대, 교통비, 경조사비, 선물 등', NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('allowances-07', '5.1.1.07', '제수당', 'Allowances', 'EXPENSE', 4, 'personnel-expenses', 7, true, false, true, '시간 외 수당, 직책 수당 등', NOW(), NOW());

-- 5.1.3. 사무관리비 - Level 3 (가장 많이 사용될 계정들)
INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('office-admin-expenses', '5.1.3', '사무관리비', 'Office & Administrative Expenses', 'EXPENSE', 3, 'general-admin-expenses', 3, false, true, true, NULL, NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('communication-01', '5.1.3.01', '통신비', 'Communication Expenses', 'EXPENSE', 4, 'office-admin-expenses', 1, true, false, true, '전화, 인터넷, 휴대폰', NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('supplies-02', '5.1.3.02', '소모품비', 'Supplies Expenses', 'EXPENSE', 4, 'office-admin-expenses', 2, true, false, true, '사무용품, 청소용품 등', NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('books-printing-03', '5.1.3.03', '도서인쇄비', 'Books & Printing', 'EXPENSE', 4, 'office-admin-expenses', 3, true, false, true, '주보, 교재, 도서 구입', NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('vehicle-maintenance-04', '5.1.3.04', '차량유지비', 'Vehicle Maintenance', 'EXPENSE', 4, 'office-admin-expenses', 4, true, false, true, '유류비, 수리비, 보험료 등', NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('insurance-premiums-05', '5.1.3.05', '보험료', 'Insurance Premiums', 'EXPENSE', 4, 'office-admin-expenses', 5, true, false, true, '화재보험, 배상책임보험 등', NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('repair-maintenance-06', '5.1.3.06', '수선비', 'Repair & Maintenance', 'EXPENSE', 4, 'office-admin-expenses', 6, true, false, true, '건물, 비품 수리 유지', NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('various-fees-07', '5.1.3.07', '제수수료', 'Various Fees', 'EXPENSE', 4, 'office-admin-expenses', 7, true, false, true, '은행 수수료, 법무 수수료 등', NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('rental-expenses-08', '5.1.3.08', '임차료', 'Rental Expenses', 'EXPENSE', 4, 'office-admin-expenses', 8, true, false, true, '건물, 장비 임차', NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('depreciation-09', '5.1.3.09', '감가상각비', 'Depreciation Expenses', 'EXPENSE', 4, 'office-admin-expenses', 9, true, false, true, '유형, 무형자산', NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('travel-expenses-10', '5.1.3.10', '여비교통비', 'Travel Expenses', 'EXPENSE', 4, 'office-admin-expenses', 10, true, false, true, '출장비, 교통비', NOW(), NOW());

-- 5.2. 고유목적사업비 - Level 2 (교회 특화 비용들)
INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('specific-program-expenses', '5.2', '고유목적사업비', 'Specific Program Expenses', 'EXPENSE', 2, 'expense-root', 2, false, true, true, NULL, NOW(), NOW());

-- 5.2.1. 예배 및 행사비 - Level 3
INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('worship-event-expenses', '5.2.1', '예배 및 행사비', 'Worship & Event Expenses', 'EXPENSE', 3, 'specific-program-expenses', 1, false, true, true, NULL, NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('worship-preparation-01', '5.2.1.01', '예배 준비비', 'Worship Preparation', 'EXPENSE', 4, 'worship-event-expenses', 1, true, false, true, '성찬 용품, 꽃 등', NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('speaker-fees-02', '5.2.1.02', '특별 예배 초청 강사비', 'Special Service Speaker Fees', 'EXPENSE', 4, 'worship-event-expenses', 2, true, false, true, NULL, NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('choir-support-03', '5.2.1.03', '찬양대 지원비', 'Choir Support', 'EXPENSE', 4, 'worship-event-expenses', 3, true, false, true, '악보, 의상 등', NOW(), NOW());

-- 5.2.2. 교육사업비 - Level 3
INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('education-program-expenses', '5.2.2', '교육사업비', 'Educational Program Expenses', 'EXPENSE', 3, 'specific-program-expenses', 2, false, true, true, NULL, NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('sunday-school-01', '5.2.2.01', '주일학교 운영비', 'Sunday School Operations', 'EXPENSE', 4, 'education-program-expenses', 1, true, false, true, '교사 수고비, 간식, 재료비', NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('youth-adult-education-02', '5.2.2.02', '청년부/장년부 교육비', 'Youth/Adult Education', 'EXPENSE', 4, 'education-program-expenses', 2, true, false, true, NULL, NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('retreat-camp-03', '5.2.2.03', '수련회/캠프 진행비', 'Retreat/Camp Expenses', 'EXPENSE', 4, 'education-program-expenses', 3, true, false, true, NULL, NOW(), NOW());

-- 5.2.3. 선교사업비 - Level 3
INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('mission-program-expenses', '5.2.3', '선교사업비', 'Missionary Program Expenses', 'EXPENSE', 3, 'specific-program-expenses', 3, false, true, true, NULL, NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('domestic-mission-01', '5.2.3.01', '국내 선교비', 'Domestic Mission', 'EXPENSE', 4, 'mission-program-expenses', 1, true, false, true, '미자립 교회 지원, 농어촌 선교', NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('overseas-mission-02', '5.2.3.02', '해외 선교비', 'Overseas Mission', 'EXPENSE', 4, 'mission-program-expenses', 2, true, false, true, '선교사 지원, 현지 사역비', NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('short-term-mission-03', '5.2.3.03', '단기 선교비', 'Short-term Mission', 'EXPENSE', 4, 'mission-program-expenses', 3, true, false, true, NULL, NOW(), NOW());

-- 5.2.4. 구제사업비 - Level 3
INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('relief-program-expenses', '5.2.4', '구제사업비', 'Relief Program Expenses', 'EXPENSE', 3, 'specific-program-expenses', 4, false, true, true, NULL, NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('charity-support-01', '5.2.4.01', '불우이웃돕기', 'Charity Support', 'EXPENSE', 4, 'relief-program-expenses', 1, true, false, true, '교회 내, 외부', NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('disaster-relief-02', '5.2.4.02', '재난 구호 성금', 'Disaster Relief Fund', 'EXPENSE', 4, 'relief-program-expenses', 2, true, false, true, NULL, NOW(), NOW());

INSERT INTO account_codes (id, code, name, "englishName", type, level, "parentId", "order", "allowTransaction", "isSystem", "isActive", description, "createdAt", "updatedAt") 
VALUES ('medical-support-03', '5.2.4.03', '의료비 지원', 'Medical Support', 'EXPENSE', 4, 'relief-program-expenses', 3, true, false, true, NULL, NOW(), NOW());

COMMIT;