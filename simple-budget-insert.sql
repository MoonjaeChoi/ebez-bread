-- =====================================================
-- 간단한 부서별 예산 데이터 INSERT (Supabase SQL 에디터용)
-- 실행 전에 admin@gcchurch.kr 사용자가 존재하는지 확인하세요
-- =====================================================

-- 1단계: 현재 교회와 부서 확인
SELECT c.id as church_id, c.name as church_name, d.id as dept_id, d.name as dept_name 
FROM churches c, departments d 
WHERE c.id = d."churchId" 
ORDER BY d.name;

-- 2단계: admin 사용자 ID 확인
SELECT id, email, name, role FROM users WHERE email = 'admin@gcchurch.kr';

-- 3단계: 직접 예산 데이터 삽입 (교회 ID와 사용자 ID를 실제 값으로 교체)
-- 아래 스크립트에서 'YOUR_CHURCH_ID'와 'YOUR_ADMIN_USER_ID'를 실제 값으로 교체하세요

-- 남선교회 예산
WITH church_data AS (
  SELECT c.id as church_id, d.id as dept_id, u.id as user_id
  FROM churches c, departments d, users u
  WHERE d.name = '남선교회' 
    AND u.email = 'admin@gcchurch.kr'
    AND c.id = d."churchId"
    AND c.id = u."churchId"
  LIMIT 1
)
INSERT INTO budgets (id, name, description, year, "totalAmount", status, "startDate", "endDate", "createdAt", "updatedAt", "churchId", "departmentId", "createdById")
SELECT 
  'budget-2025-mens' as id,
  '남선교회 2025년 예산' as name,
  '남선교회 연간 운영 예산' as description,
  2025 as year,
  8000000 as "totalAmount",
  'ACTIVE' as status,
  '2025-01-01T00:00:00Z' as "startDate",
  '2025-12-31T23:59:59Z' as "endDate",
  NOW() as "createdAt",
  NOW() as "updatedAt",
  cd.church_id as "churchId",
  cd.dept_id as "departmentId", 
  cd.user_id as "createdById"
FROM church_data cd
ON CONFLICT (id) DO NOTHING;

-- 남선교회 예산 항목
INSERT INTO budget_items (id, name, amount, category, "budgetId", "createdAt", "updatedAt")
VALUES 
  ('mens-ops-2025', '운영비', 3000000, 'OPERATIONS', 'budget-2025-mens', NOW(), NOW()),
  ('mens-events-2025', '행사비', 2500000, 'EVENT', 'budget-2025-mens', NOW(), NOW()),
  ('mens-personnel-2025', '인건비', 2000000, 'PERSONNEL', 'budget-2025-mens', NOW(), NOW()),
  ('mens-mission-2025', '선교비', 500000, 'MISSION', 'budget-2025-mens', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 여전도회 예산
WITH church_data AS (
  SELECT c.id as church_id, d.id as dept_id, u.id as user_id
  FROM churches c, departments d, users u
  WHERE d.name = '여전도회'
    AND u.email = 'admin@gcchurch.kr' 
    AND c.id = d."churchId"
    AND c.id = u."churchId"
  LIMIT 1
)
INSERT INTO budgets (id, name, description, year, "totalAmount", status, "startDate", "endDate", "createdAt", "updatedAt", "churchId", "departmentId", "createdById")
SELECT 
  'budget-2025-womens' as id,
  '여전도회 2025년 예산' as name,
  '여전도회 연간 운영 예산' as description,
  2025 as year,
  6500000 as "totalAmount",
  'ACTIVE' as status,
  '2025-01-01T00:00:00Z' as "startDate",
  '2025-12-31T23:59:59Z' as "endDate",
  NOW() as "createdAt",
  NOW() as "updatedAt",
  cd.church_id as "churchId",
  cd.dept_id as "departmentId",
  cd.user_id as "createdById"
FROM church_data cd  
ON CONFLICT (id) DO NOTHING;

-- 여전도회 예산 항목
INSERT INTO budget_items (id, name, amount, category, "budgetId", "createdAt", "updatedAt")
VALUES 
  ('womens-ops-2025', '운영비', 2500000, 'OPERATIONS', 'budget-2025-womens', NOW(), NOW()),
  ('womens-events-2025', '행사비', 2000000, 'EVENT', 'budget-2025-womens', NOW(), NOW()),
  ('womens-edu-2025', '교육비', 1500000, 'EDUCATION', 'budget-2025-womens', NOW(), NOW()),
  ('womens-welfare-2025', '복지비', 500000, 'WELFARE', 'budget-2025-womens', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 청년부 예산
WITH church_data AS (
  SELECT c.id as church_id, d.id as dept_id, u.id as user_id
  FROM churches c, departments d, users u
  WHERE d.name = '청년부'
    AND u.email = 'admin@gcchurch.kr'
    AND c.id = d."churchId" 
    AND c.id = u."churchId"
  LIMIT 1
)
INSERT INTO budgets (id, name, description, year, "totalAmount", status, "startDate", "endDate", "createdAt", "updatedAt", "churchId", "departmentId", "createdById")
SELECT 
  'budget-2025-youth' as id,
  '청년부 2025년 예산' as name,
  '청년부 연간 운영 예산' as description,
  2025 as year,
  4500000 as "totalAmount",
  'ACTIVE' as status,
  '2025-01-01T00:00:00Z' as "startDate",
  '2025-12-31T23:59:59Z' as "endDate",
  NOW() as "createdAt",
  NOW() as "updatedAt",
  cd.church_id as "churchId",
  cd.dept_id as "departmentId",
  cd.user_id as "createdById"
FROM church_data cd
ON CONFLICT (id) DO NOTHING;

-- 청년부 예산 항목
INSERT INTO budget_items (id, name, amount, category, "budgetId", "createdAt", "updatedAt")
VALUES 
  ('youth-ops-2025', '운영비', 1500000, 'OPERATIONS', 'budget-2025-youth', NOW(), NOW()),
  ('youth-events-2025', '행사비', 2000000, 'EVENT', 'budget-2025-youth', NOW(), NOW()),
  ('youth-edu-2025', '교육비', 800000, 'EDUCATION', 'budget-2025-youth', NOW(), NOW()),
  ('youth-ministry-2025', '사역비', 200000, 'MINISTRY', 'budget-2025-youth', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 예산 집행 현황 초기화 (lastUpdated 컬럼 포함)
INSERT INTO budget_executions (id, "totalBudget", "usedAmount", "pendingAmount", "remainingAmount", "executionRate", "lastUpdated", "createdAt", "updatedAt", "budgetItemId")
SELECT 
  'exec-' || bi.id as id,
  bi.amount as "totalBudget",
  FLOOR(bi.amount * 0.1) as "usedAmount", -- 10% 사용
  FLOOR(bi.amount * 0.05) as "pendingAmount", -- 5% 보류
  bi.amount - FLOOR(bi.amount * 0.1) - FLOOR(bi.amount * 0.05) as "remainingAmount", -- 85% 잔여
  10.0 as "executionRate",
  NOW() as "lastUpdated", -- lastUpdated 컬럼 추가
  NOW() as "createdAt",
  NOW() as "updatedAt",
  bi.id as "budgetItemId"
FROM budget_items bi
WHERE bi."budgetId" IN ('budget-2025-mens', 'budget-2025-womens', 'budget-2025-youth')
ON CONFLICT (id) DO NOTHING;

-- 최종 확인 쿼리
SELECT 
  b.name as budget_name,
  b."totalAmount" as total_amount,
  d.name as department_name,
  COUNT(bi.id) as item_count
FROM budgets b
JOIN departments d ON b."departmentId" = d.id  
LEFT JOIN budget_items bi ON bi."budgetId" = b.id
WHERE b.year = 2025
GROUP BY b.id, b.name, b."totalAmount", d.name
ORDER BY b.name;