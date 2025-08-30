-- =====================================================
-- Supabase 부서별 예산 배정 샘플 데이터 INSERT 스크립트
-- 온라인 Supabase SQL 에디터에서 실행하세요
-- =====================================================

-- 1. 기존 데이터 확인 (먼저 실행해서 데이터 현황 파악)
-- SELECT c.name as church_name, d.name as dept_name FROM churches c, departments d WHERE c.id = d."churchId" LIMIT 10;

-- 2. 2025년 부서별 예산 데이터 생성
-- 먼저 교회 ID와 사용자 ID를 변수로 설정 (실제 값으로 교체 필요)

-- 남선교회 2025년 예산
INSERT INTO budgets (
  id, 
  name, 
  description, 
  year, 
  "totalAmount", 
  status, 
  "startDate", 
  "endDate", 
  "createdAt", 
  "updatedAt", 
  "churchId", 
  "departmentId", 
  "createdById"
)
SELECT 
  'budget-2025-mens-ministry' as id,
  '남선교회 2025년 예산' as name,
  '남선교회 2025년 연간 운영 예산' as description,
  2025 as year,
  8000000 as "totalAmount",
  'ACTIVE' as status,
  '2025-01-01T00:00:00Z' as "startDate",
  '2025-12-31T23:59:59Z' as "endDate",
  NOW() as "createdAt",
  NOW() as "updatedAt",
  c.id as "churchId",
  d.id as "departmentId",
  u.id as "createdById"
FROM churches c
CROSS JOIN departments d
CROSS JOIN users u
WHERE d.name = '남선교회' 
  AND u.email = 'admin@gcchurch.kr'
  AND c.id = d."churchId"
  AND c.id = u."churchId"
LIMIT 1
ON CONFLICT (id) DO NOTHING;

-- 여전도회 2025년 예산  
INSERT INTO budgets (
  id, 
  name, 
  description, 
  year, 
  "totalAmount", 
  status, 
  "startDate", 
  "endDate", 
  "createdAt", 
  "updatedAt", 
  "churchId", 
  "departmentId", 
  "createdById"
)
SELECT 
  'budget-2025-womens-ministry' as id,
  '여전도회 2025년 예산' as name,
  '여전도회 2025년 연간 운영 예산' as description,
  2025 as year,
  6500000 as "totalAmount",
  'ACTIVE' as status,
  '2025-01-01T00:00:00Z' as "startDate",
  '2025-12-31T23:59:59Z' as "endDate",
  NOW() as "createdAt",
  NOW() as "updatedAt",
  c.id as "churchId",
  d.id as "departmentId",
  u.id as "createdById"
FROM churches c
CROSS JOIN departments d  
CROSS JOIN users u
WHERE d.name = '여전도회'
  AND u.email = 'admin@gcchurch.kr'
  AND c.id = d."churchId"
  AND c.id = u."churchId"
LIMIT 1
ON CONFLICT (id) DO NOTHING;

-- 청년부 2025년 예산
INSERT INTO budgets (
  id, 
  name, 
  description, 
  year, 
  "totalAmount", 
  status, 
  "startDate", 
  "endDate", 
  "createdAt", 
  "updatedAt", 
  "churchId", 
  "departmentId", 
  "createdById"
)
SELECT 
  'budget-2025-youth-ministry' as id,
  '청년부 2025년 예산' as name,
  '청년부 2025년 연간 운영 예산' as description,
  2025 as year,
  4500000 as "totalAmount",
  'ACTIVE' as status,
  '2025-01-01T00:00:00Z' as "startDate",
  '2025-12-31T23:59:59Z' as "endDate",
  NOW() as "createdAt",
  NOW() as "updatedAt",
  c.id as "churchId",
  d.id as "departmentId",
  u.id as "createdById"
FROM churches c
CROSS JOIN departments d
CROSS JOIN users u  
WHERE d.name = '청년부'
  AND u.email = 'admin@gcchurch.kr'
  AND c.id = d."churchId"
  AND c.id = u."churchId"
LIMIT 1
ON CONFLICT (id) DO NOTHING;

-- 장년부 2025년 예산
INSERT INTO budgets (
  id, 
  name, 
  description, 
  year, 
  "totalAmount", 
  status, 
  "startDate", 
  "endDate", 
  "createdAt", 
  "updatedAt", 
  "churchId", 
  "departmentId", 
  "createdById"
)
SELECT 
  'budget-2025-adult-ministry' as id,
  '장년부 2025년 예산' as name,
  '장년부 2025년 연간 운영 예산' as description,
  2025 as year,
  3500000 as "totalAmount",
  'ACTIVE' as status,
  '2025-01-01T00:00:00Z' as "startDate",
  '2025-12-31T23:59:59Z' as "endDate",
  NOW() as "createdAt",
  NOW() as "updatedAt",
  c.id as "churchId",
  d.id as "departmentId",
  u.id as "createdById"
FROM churches c
CROSS JOIN departments d
CROSS JOIN users u
WHERE d.name = '장년부'
  AND u.email = 'admin@gcchurch.kr'
  AND c.id = d."churchId"
  AND c.id = u."churchId"
LIMIT 1
ON CONFLICT (id) DO NOTHING;

-- 찬양팀 2025년 예산
INSERT INTO budgets (
  id, 
  name, 
  description, 
  year, 
  "totalAmount", 
  status, 
  "startDate", 
  "endDate", 
  "createdAt", 
  "updatedAt", 
  "churchId", 
  "departmentId", 
  "createdById"
)
SELECT 
  'budget-2025-worship-team' as id,
  '찬양팀 2025년 예산' as name,
  '찬양팀 2025년 연간 운영 예산' as description,
  2025 as year,
  5000000 as "totalAmount",
  'ACTIVE' as status,
  '2025-01-01T00:00:00Z' as "startDate",
  '2025-12-31T23:59:59Z' as "endDate",
  NOW() as "createdAt",
  NOW() as "updatedAt",
  c.id as "churchId",
  d.id as "departmentId",
  u.id as "createdById"
FROM churches c
CROSS JOIN departments d
CROSS JOIN users u
WHERE d.name = '찬양팀'
  AND u.email = 'admin@gcchurch.kr'
  AND c.id = d."churchId"
  AND c.id = u."churchId"
LIMIT 1
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 3. 예산 항목들 (Budget Items) 생성
-- =====================================================

-- 남선교회 예산 항목들
INSERT INTO budget_items (id, name, code, amount, category, description, "createdAt", "updatedAt", "budgetId")
VALUES 
  ('mens-personnel', '인건비', 'MENS_PERSONNEL', 2000000, 'PERSONNEL', '남선교회 인건비', NOW(), NOW(), 'budget-2025-mens-ministry'),
  ('mens-operations', '운영비', 'MENS_OPERATIONS', 2500000, 'OPERATIONS', '남선교회 일반 운영비', NOW(), NOW(), 'budget-2025-mens-ministry'),
  ('mens-events', '행사비', 'MENS_EVENTS', 2000000, 'EVENT', '남선교회 행사 및 모임비', NOW(), NOW(), 'budget-2025-mens-ministry'),
  ('mens-mission', '선교비', 'MENS_MISSION', 1000000, 'MISSION', '남선교회 선교사역비', NOW(), NOW(), 'budget-2025-mens-ministry'),
  ('mens-other', '기타', 'MENS_OTHER', 500000, 'OTHER', '남선교회 기타 예산', NOW(), NOW(), 'budget-2025-mens-ministry')
ON CONFLICT (id) DO NOTHING;

-- 여전도회 예산 항목들
INSERT INTO budget_items (id, name, code, amount, category, description, "createdAt", "updatedAt", "budgetId")
VALUES 
  ('womens-operations', '운영비', 'WOMENS_OPERATIONS', 2000000, 'OPERATIONS', '여전도회 일반 운영비', NOW(), NOW(), 'budget-2025-womens-ministry'),
  ('womens-events', '행사비', 'WOMENS_EVENTS', 1800000, 'EVENT', '여전도회 행사 및 모임비', NOW(), NOW(), 'budget-2025-womens-ministry'),
  ('womens-education', '교육비', 'WOMENS_EDUCATION', 1500000, 'EDUCATION', '여전도회 교육사역비', NOW(), NOW(), 'budget-2025-womens-ministry'),
  ('womens-welfare', '복지비', 'WOMENS_WELFARE', 800000, 'WELFARE', '여전도회 복지사역비', NOW(), NOW(), 'budget-2025-womens-ministry'),
  ('womens-other', '기타', 'WOMENS_OTHER', 400000, 'OTHER', '여전도회 기타 예산', NOW(), NOW(), 'budget-2025-womens-ministry')
ON CONFLICT (id) DO NOTHING;

-- 청년부 예산 항목들
INSERT INTO budget_items (id, name, code, amount, category, description, "createdAt", "updatedAt", "budgetId")
VALUES 
  ('youth-operations', '운영비', 'YOUTH_OPERATIONS', 1500000, 'OPERATIONS', '청년부 일반 운영비', NOW(), NOW(), 'budget-2025-youth-ministry'),
  ('youth-events', '행사비', 'YOUTH_EVENTS', 1800000, 'EVENT', '청년부 행사 및 수련회비', NOW(), NOW(), 'budget-2025-youth-ministry'),
  ('youth-education', '교육비', 'YOUTH_EDUCATION', 800000, 'EDUCATION', '청년부 교육사역비', NOW(), NOW(), 'budget-2025-youth-ministry'),
  ('youth-ministry', '사역비', 'YOUTH_MINISTRY', 400000, 'MINISTRY', '청년부 특별사역비', NOW(), NOW(), 'budget-2025-youth-ministry')
ON CONFLICT (id) DO NOTHING;

-- 장년부 예산 항목들
INSERT INTO budget_items (id, name, code, amount, category, description, "createdAt", "updatedAt", "budgetId")
VALUES 
  ('adult-operations', '운영비', 'ADULT_OPERATIONS', 1200000, 'OPERATIONS', '장년부 일반 운영비', NOW(), NOW(), 'budget-2025-adult-ministry'),
  ('adult-events', '행사비', 'ADULT_EVENTS', 1000000, 'EVENT', '장년부 행사비', NOW(), NOW(), 'budget-2025-adult-ministry'),
  ('adult-education', '교육비', 'ADULT_EDUCATION', 800000, 'EDUCATION', '장년부 교육사역비', NOW(), NOW(), 'budget-2025-adult-ministry'),
  ('adult-welfare', '복지비', 'ADULT_WELFARE', 500000, 'WELFARE', '장년부 복지사역비', NOW(), NOW(), 'budget-2025-adult-ministry')
ON CONFLICT (id) DO NOTHING;

-- 찬양팀 예산 항목들
INSERT INTO budget_items (id, name, code, amount, category, description, "createdAt", "updatedAt", "budgetId")
VALUES 
  ('worship-equipment', '시설비', 'WORSHIP_FACILITIES', 2000000, 'FACILITIES', '찬양팀 장비 및 시설비', NOW(), NOW(), 'budget-2025-worship-team'),
  ('worship-operations', '운영비', 'WORSHIP_OPERATIONS', 1500000, 'OPERATIONS', '찬양팀 일반 운영비', NOW(), NOW(), 'budget-2025-worship-team'),
  ('worship-events', '행사비', 'WORSHIP_EVENTS', 1000000, 'EVENT', '찬양팀 특별행사비', NOW(), NOW(), 'budget-2025-worship-team'),
  ('worship-education', '교육비', 'WORSHIP_EDUCATION', 500000, 'EDUCATION', '찬양팀 교육훈련비', NOW(), NOW(), 'budget-2025-worship-team')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 4. 예산 집행 현황 (Budget Executions) 초기화
-- =====================================================

-- 남선교회 예산 집행 현황 (lastUpdated 필수)
INSERT INTO budget_executions (
  id, 
  "totalBudget", 
  "usedAmount", 
  "pendingAmount", 
  "remainingAmount", 
  "executionRate", 
  "lastUpdated", 
  "createdAt", 
  "updatedAt", 
  "budgetItemId"
)
SELECT 
  'exec-' || bi.id as id,
  bi.amount as "totalBudget",
  FLOOR(bi.amount * 0.15) as "usedAmount", -- 15% 사용
  FLOOR(bi.amount * 0.10) as "pendingAmount", -- 10% 보류
  bi.amount - FLOOR(bi.amount * 0.15) - FLOOR(bi.amount * 0.10) as "remainingAmount", -- 75% 잔여
  15.0 as "executionRate", -- 15% 집행률
  NOW() as "lastUpdated",
  NOW() as "createdAt",
  NOW() as "updatedAt",
  bi.id as "budgetItemId"
FROM budget_items bi
WHERE bi."budgetId" = 'budget-2025-mens-ministry'
ON CONFLICT (id) DO NOTHING;

-- 여전도회 예산 집행 현황
INSERT INTO budget_executions (
  id, 
  "totalBudget", 
  "usedAmount", 
  "pendingAmount", 
  "remainingAmount", 
  "executionRate", 
  "lastUpdated", 
  "createdAt", 
  "updatedAt", 
  "budgetItemId"
)
SELECT 
  'exec-' || bi.id as id,
  bi.amount as "totalBudget",
  FLOOR(bi.amount * 0.12) as "usedAmount", -- 12% 사용
  FLOOR(bi.amount * 0.08) as "pendingAmount", -- 8% 보류  
  bi.amount - FLOOR(bi.amount * 0.12) - FLOOR(bi.amount * 0.08) as "remainingAmount", -- 80% 잔여
  12.0 as "executionRate", -- 12% 집행률
  NOW() as "lastUpdated",
  NOW() as "createdAt", 
  NOW() as "updatedAt",
  bi.id as "budgetItemId"
FROM budget_items bi
WHERE bi."budgetId" = 'budget-2025-womens-ministry'
ON CONFLICT (id) DO NOTHING;

-- 청년부 예산 집행 현황
INSERT INTO budget_executions (
  id, 
  "totalBudget", 
  "usedAmount", 
  "pendingAmount", 
  "remainingAmount", 
  "executionRate", 
  "lastUpdated", 
  "createdAt", 
  "updatedAt", 
  "budgetItemId"
)
SELECT 
  'exec-' || bi.id as id,
  bi.amount as "totalBudget",
  FLOOR(bi.amount * 0.20) as "usedAmount", -- 20% 사용
  FLOOR(bi.amount * 0.05) as "pendingAmount", -- 5% 보류
  bi.amount - FLOOR(bi.amount * 0.20) - FLOOR(bi.amount * 0.05) as "remainingAmount", -- 75% 잔여
  20.0 as "executionRate", -- 20% 집행률
  NOW() as "lastUpdated",
  NOW() as "createdAt",
  NOW() as "updatedAt", 
  bi.id as "budgetItemId"
FROM budget_items bi
WHERE bi."budgetId" = 'budget-2025-youth-ministry'
ON CONFLICT (id) DO NOTHING;

-- 장년부 예산 집행 현황
INSERT INTO budget_executions (
  id, 
  "totalBudget", 
  "usedAmount", 
  "pendingAmount", 
  "remainingAmount", 
  "executionRate", 
  "lastUpdated", 
  "createdAt", 
  "updatedAt", 
  "budgetItemId"
)
SELECT 
  'exec-' || bi.id as id,
  bi.amount as "totalBudget",
  FLOOR(bi.amount * 0.10) as "usedAmount", -- 10% 사용
  FLOOR(bi.amount * 0.15) as "pendingAmount", -- 15% 보류
  bi.amount - FLOOR(bi.amount * 0.10) - FLOOR(bi.amount * 0.15) as "remainingAmount", -- 75% 잔여
  10.0 as "executionRate", -- 10% 집행률
  NOW() as "lastUpdated",
  NOW() as "createdAt",
  NOW() as "updatedAt",
  bi.id as "budgetItemId"
FROM budget_items bi
WHERE bi."budgetId" = 'budget-2025-adult-ministry'
ON CONFLICT (id) DO NOTHING;

-- 찬양팀 예산 집행 현황
INSERT INTO budget_executions (
  id, 
  "totalBudget", 
  "usedAmount", 
  "pendingAmount", 
  "remainingAmount", 
  "executionRate", 
  "lastUpdated", 
  "createdAt", 
  "updatedAt", 
  "budgetItemId"
)
SELECT 
  'exec-' || bi.id as id,
  bi.amount as "totalBudget",
  FLOOR(bi.amount * 0.25) as "usedAmount", -- 25% 사용
  FLOOR(bi.amount * 0.10) as "pendingAmount", -- 10% 보류
  bi.amount - FLOOR(bi.amount * 0.25) - FLOOR(bi.amount * 0.10) as "remainingAmount", -- 65% 잔여
  25.0 as "executionRate", -- 25% 집행률
  NOW() as "lastUpdated",
  NOW() as "createdAt",
  NOW() as "updatedAt",
  bi.id as "budgetItemId"
FROM budget_items bi
WHERE bi."budgetId" = 'budget-2025-worship-team'
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 5. 기본 회계 계정코드 추가 (Account Codes)
-- =====================================================

-- 수입 관련 계정코드
INSERT INTO account_codes (id, code, name, type, level, "parentId", "order", "allowTransaction", "isActive", "isSystem", description, "churchId", "createdAt", "updatedAt")
VALUES 
  ('acc-revenue-1000', '1000', '헌금수입', 'REVENUE', 1, NULL, 1000, true, true, true, '각종 헌금 수입', NULL, NOW(), NOW()),
  ('acc-revenue-1100', '1100', '기타수입', 'REVENUE', 1, NULL, 1100, true, true, true, '헌금 외 기타 수입', NULL, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 지출 관련 계정코드  
INSERT INTO account_codes (id, code, name, type, level, "parentId", "order", "allowTransaction", "isActive", "isSystem", description, "churchId", "createdAt", "updatedAt")
VALUES 
  ('acc-expense-6000', '6000', '인건비', 'EXPENSE', 1, NULL, 6000, true, true, true, '직원 급여 및 수당', NULL, NOW(), NOW()),
  ('acc-expense-6100', '6100', '운영비', 'EXPENSE', 1, NULL, 6100, true, true, true, '일반 운영비용', NULL, NOW(), NOW()),
  ('acc-expense-6200', '6200', '사역비', 'EXPENSE', 1, NULL, 6200, true, true, true, '각종 사역비용', NULL, NOW(), NOW()),
  ('acc-expense-6300', '6300', '시설비', 'EXPENSE', 1, NULL, 6300, true, true, true, '시설 관련 비용', NULL, NOW(), NOW()),
  ('acc-expense-6400', '6400', '교육비', 'EXPENSE', 1, NULL, 6400, true, true, true, '교육 관련 비용', NULL, NOW(), NOW()),
  ('acc-expense-6500', '6500', '복지비', 'EXPENSE', 1, NULL, 6500, true, true, true, '복지 관련 비용', NULL, NOW(), NOW()),
  ('acc-expense-6600', '6600', '선교비', 'EXPENSE', 1, NULL, 6600, true, true, true, '선교 관련 비용', NULL, NOW(), NOW()),
  ('acc-expense-6700', '6700', '행사비', 'EXPENSE', 1, NULL, 6700, true, true, true, '각종 행사 비용', NULL, NOW(), NOW()),
  ('acc-expense-6800', '6800', '관리비', 'EXPENSE', 1, NULL, 6800, true, true, true, '관리 운영 비용', NULL, NOW(), NOW()),
  ('acc-expense-6900', '6900', '기타비용', 'EXPENSE', 1, NULL, 6900, true, true, true, '기타 비용', NULL, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 6. 데이터 확인 쿼리 (실행 후 결과 확인용)
-- =====================================================

-- 생성된 예산 확인
-- SELECT b.name, b.year, b."totalAmount", d.name as department_name 
-- FROM budgets b 
-- JOIN departments d ON b."departmentId" = d.id 
-- WHERE b.year = 2025 
-- ORDER BY b.name;

-- 예산 항목 확인  
-- SELECT bi.name, bi.amount, bi.category, b.name as budget_name
-- FROM budget_items bi
-- JOIN budgets b ON bi."budgetId" = b.id
-- WHERE b.year = 2025
-- ORDER BY b.name, bi.name;

-- 집행 현황 확인
-- SELECT be."totalBudget", be."usedAmount", be."remainingAmount", be."executionRate", 
--        bi.name as item_name, b.name as budget_name
-- FROM budget_executions be
-- JOIN budget_items bi ON be."budgetItemId" = bi.id  
-- JOIN budgets b ON bi."budgetId" = b.id
-- WHERE b.year = 2025
-- ORDER BY b.name, bi.name;