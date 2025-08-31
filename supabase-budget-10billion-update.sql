-- =====================================================
-- Supabase 부서별 예산 총액 10억원 업데이트 스크립트
-- 온라인 Supabase SQL 에디터에서 실행하세요
-- =====================================================

-- 1. 기존 예산 데이터 확인
-- SELECT b.name, b.year, b."totalAmount", d.name as department_name 
-- FROM budgets b 
-- JOIN departments d ON b."departmentId" = d.id 
-- WHERE b.year = 2025 
-- ORDER BY b.name;

-- 2. 2025년 부서별 예산을 10억원 총액에 맞게 업데이트
-- 총 10억원(1,000,000,000원)을 5개 부서에 배분

-- 남선교회: 2억 5천만원 (25%)
UPDATE budgets 
SET "totalAmount" = 250000000,
    "updatedAt" = NOW()
WHERE id = 'budget-2025-mens-ministry';

-- 여전도회: 2억원 (20%)  
UPDATE budgets 
SET "totalAmount" = 200000000,
    "updatedAt" = NOW()
WHERE id = 'budget-2025-womens-ministry';

-- 청년부: 1억 5천만원 (15%)
UPDATE budgets 
SET "totalAmount" = 150000000,
    "updatedAt" = NOW()
WHERE id = 'budget-2025-youth-ministry';

-- 장년부: 1억 5천만원 (15%)
UPDATE budgets 
SET "totalAmount" = 150000000,
    "updatedAt" = NOW()
WHERE id = 'budget-2025-adult-ministry';

-- 찬양팀: 2억 5천만원 (25%)
UPDATE budgets 
SET "totalAmount" = 250000000,
    "updatedAt" = NOW()
WHERE id = 'budget-2025-worship-team';

-- =====================================================
-- 3. 예산 항목들도 비례적으로 업데이트
-- =====================================================

-- 남선교회 예산 항목들 업데이트 (총 2.5억원)
UPDATE budget_items SET amount = 62500000, "updatedAt" = NOW() WHERE id = 'mens-personnel';   -- 인건비 25%
UPDATE budget_items SET amount = 75000000, "updatedAt" = NOW() WHERE id = 'mens-operations';  -- 운영비 30%
UPDATE budget_items SET amount = 62500000, "updatedAt" = NOW() WHERE id = 'mens-events';     -- 행사비 25%
UPDATE budget_items SET amount = 37500000, "updatedAt" = NOW() WHERE id = 'mens-mission';    -- 선교비 15%
UPDATE budget_items SET amount = 12500000, "updatedAt" = NOW() WHERE id = 'mens-other';      -- 기타 5%

-- 여전도회 예산 항목들 업데이트 (총 2억원)
UPDATE budget_items SET amount = 60000000, "updatedAt" = NOW() WHERE id = 'womens-operations'; -- 운영비 30%
UPDATE budget_items SET amount = 60000000, "updatedAt" = NOW() WHERE id = 'womens-events';     -- 행사비 30%
UPDATE budget_items SET amount = 50000000, "updatedAt" = NOW() WHERE id = 'womens-education';  -- 교육비 25%
UPDATE budget_items SET amount = 20000000, "updatedAt" = NOW() WHERE id = 'womens-welfare';    -- 복지비 10%
UPDATE budget_items SET amount = 10000000, "updatedAt" = NOW() WHERE id = 'womens-other';      -- 기타 5%

-- 청년부 예산 항목들 업데이트 (총 1.5억원)
UPDATE budget_items SET amount = 45000000, "updatedAt" = NOW() WHERE id = 'youth-operations'; -- 운영비 30%
UPDATE budget_items SET amount = 60000000, "updatedAt" = NOW() WHERE id = 'youth-events';     -- 행사비 40%
UPDATE budget_items SET amount = 30000000, "updatedAt" = NOW() WHERE id = 'youth-education';  -- 교육비 20%
UPDATE budget_items SET amount = 15000000, "updatedAt" = NOW() WHERE id = 'youth-ministry';   -- 사역비 10%

-- 장년부 예산 항목들 업데이트 (총 1.5억원)
UPDATE budget_items SET amount = 45000000, "updatedAt" = NOW() WHERE id = 'adult-operations'; -- 운영비 30%
UPDATE budget_items SET amount = 45000000, "updatedAt" = NOW() WHERE id = 'adult-events';     -- 행사비 30%
UPDATE budget_items SET amount = 37500000, "updatedAt" = NOW() WHERE id = 'adult-education';  -- 교육비 25%
UPDATE budget_items SET amount = 22500000, "updatedAt" = NOW() WHERE id = 'adult-welfare';    -- 복지비 15%

-- 찬양팀 예산 항목들 업데이트 (총 2.5억원)
UPDATE budget_items SET amount = 100000000, "updatedAt" = NOW() WHERE id = 'worship-equipment'; -- 시설비 40%
UPDATE budget_items SET amount = 75000000, "updatedAt" = NOW() WHERE id = 'worship-operations'; -- 운영비 30%
UPDATE budget_items SET amount = 50000000, "updatedAt" = NOW() WHERE id = 'worship-events';     -- 행사비 20%
UPDATE budget_items SET amount = 25000000, "updatedAt" = NOW() WHERE id = 'worship-education';  -- 교육비 10%

-- =====================================================
-- 4. 예산 집행 현황도 새로운 금액에 맞게 업데이트
-- =====================================================

-- 남선교회 예산 집행 현황 업데이트
UPDATE budget_executions 
SET "totalBudget" = bi.amount,
    "usedAmount" = FLOOR(bi.amount * 0.15),
    "pendingAmount" = FLOOR(bi.amount * 0.10),
    "remainingAmount" = bi.amount - FLOOR(bi.amount * 0.15) - FLOOR(bi.amount * 0.10),
    "lastUpdated" = NOW(),
    "updatedAt" = NOW()
FROM budget_items bi
WHERE budget_executions."budgetItemId" = bi.id
  AND bi."budgetId" = 'budget-2025-mens-ministry';

-- 여전도회 예산 집행 현황 업데이트  
UPDATE budget_executions 
SET "totalBudget" = bi.amount,
    "usedAmount" = FLOOR(bi.amount * 0.12),
    "pendingAmount" = FLOOR(bi.amount * 0.08),
    "remainingAmount" = bi.amount - FLOOR(bi.amount * 0.12) - FLOOR(bi.amount * 0.08),
    "lastUpdated" = NOW(),
    "updatedAt" = NOW()
FROM budget_items bi
WHERE budget_executions."budgetItemId" = bi.id
  AND bi."budgetId" = 'budget-2025-womens-ministry';

-- 청년부 예산 집행 현황 업데이트
UPDATE budget_executions 
SET "totalBudget" = bi.amount,
    "usedAmount" = FLOOR(bi.amount * 0.20),
    "pendingAmount" = FLOOR(bi.amount * 0.05),
    "remainingAmount" = bi.amount - FLOOR(bi.amount * 0.20) - FLOOR(bi.amount * 0.05),
    "lastUpdated" = NOW(),
    "updatedAt" = NOW()
FROM budget_items bi
WHERE budget_executions."budgetItemId" = bi.id
  AND bi."budgetId" = 'budget-2025-youth-ministry';

-- 장년부 예산 집행 현황 업데이트
UPDATE budget_executions 
SET "totalBudget" = bi.amount,
    "usedAmount" = FLOOR(bi.amount * 0.10),
    "pendingAmount" = FLOOR(bi.amount * 0.15),
    "remainingAmount" = bi.amount - FLOOR(bi.amount * 0.10) - FLOOR(bi.amount * 0.15),
    "lastUpdated" = NOW(),
    "updatedAt" = NOW()
FROM budget_items bi
WHERE budget_executions."budgetItemId" = bi.id
  AND bi."budgetId" = 'budget-2025-adult-ministry';

-- 찬양팀 예산 집행 현황 업데이트
UPDATE budget_executions 
SET "totalBudget" = bi.amount,
    "usedAmount" = FLOOR(bi.amount * 0.25),
    "pendingAmount" = FLOOR(bi.amount * 0.10),
    "remainingAmount" = bi.amount - FLOOR(bi.amount * 0.25) - FLOOR(bi.amount * 0.10),
    "lastUpdated" = NOW(),
    "updatedAt" = NOW()
FROM budget_items bi
WHERE budget_executions."budgetItemId" = bi.id
  AND bi."budgetId" = 'budget-2025-worship-team';

-- =====================================================
-- 5. 데이터 확인 쿼리
-- =====================================================

-- 업데이트된 예산 총액 확인 (총합이 10억원인지 확인)
SELECT 
  SUM(b."totalAmount") as total_budget,
  COUNT(*) as department_count,
  CASE 
    WHEN SUM(b."totalAmount") = 1000000000 THEN '✅ 정확히 10억원'
    ELSE '❌ ' || TO_CHAR(SUM(b."totalAmount"), 'FM999,999,999,999') || '원'
  END as status
FROM budgets b 
WHERE b.year = 2025;

-- 부서별 예산 현황 확인
SELECT 
  b.name as budget_name,
  TO_CHAR(b."totalAmount", 'FM999,999,999,999') || '원' as budget_amount,
  ROUND((b."totalAmount"::NUMERIC / 1000000000::NUMERIC * 100), 1) || '%' as percentage,
  d.name as department_name
FROM budgets b 
JOIN departments d ON b."departmentId" = d.id 
WHERE b.year = 2025 
ORDER BY b."totalAmount" DESC;

-- 예산 항목별 상세 확인
SELECT 
  b.name as budget_name,
  bi.name as item_name,
  bi.category,
  TO_CHAR(bi.amount, 'FM999,999,999,999') || '원' as item_amount,
  ROUND((bi.amount::NUMERIC / b."totalAmount"::NUMERIC * 100), 1) || '%' as item_percentage
FROM budget_items bi
JOIN budgets b ON bi."budgetId" = b.id
WHERE b.year = 2025
ORDER BY b.name, bi.amount DESC;