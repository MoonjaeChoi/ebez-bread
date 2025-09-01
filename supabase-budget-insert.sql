-- 10억원 부서별 예산 배정 데이터 INSERT
-- 과천교회 부서별 예산 데이터 삽입

-- 1. 총 10억원 예산을 주요 부서에 배정
-- 주요 부서별 예산 배정 (총 10억원)

-- 예배부 (2억원)
INSERT INTO budgets (
    id, name, description, year, quarter, month, 
    total_amount, status, start_date, end_date, 
    church_id, department_id, created_by_id, 
    created_at, updated_at
) VALUES (
    gen_random_uuid(),
    '예배부 2025년 예산',
    '2025년 예배부 부서별 예산 배정 - 예배 및 음향/영상 장비, 예배용품, 성가대 운영 등',
    2025, NULL, NULL,
    200000000.00,
    'ACTIVE',
    '2025-01-01'::timestamp,
    '2025-12-31'::timestamp,
    (SELECT id FROM churches WHERE name = '과천교회' LIMIT 1),
    (SELECT id FROM departments WHERE name = '예배부' AND church_id = (SELECT id FROM churches WHERE name = '과천교회' LIMIT 1) LIMIT 1),
    (SELECT id FROM users WHERE email = 'admin@gcchurch.kr' LIMIT 1),
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- 교육부 (1.5억원)
INSERT INTO budgets (
    id, name, description, year, quarter, month, 
    total_amount, status, start_date, end_date, 
    church_id, department_id, created_by_id, 
    created_at, updated_at
) VALUES (
    gen_random_uuid(),
    '교육부 2025년 예산',
    '2025년 교육부 부서별 예산 배정 - 주일학교, 성인교육, 교육자료, 교사 연수 등',
    2025, NULL, NULL,
    150000000.00,
    'ACTIVE',
    '2025-01-01'::timestamp,
    '2025-12-31'::timestamp,
    (SELECT id FROM churches WHERE name = '과천교회' LIMIT 1),
    (SELECT id FROM departments WHERE name = '교육부' AND church_id = (SELECT id FROM churches WHERE name = '과천교회' LIMIT 1) LIMIT 1),
    (SELECT id FROM users WHERE email = 'admin@gcchurch.kr' LIMIT 1),
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- 선교부 (1.2억원)
INSERT INTO budgets (
    id, name, description, year, quarter, month, 
    total_amount, status, start_date, end_date, 
    church_id, department_id, created_by_id, 
    created_at, updated_at
) VALUES (
    gen_random_uuid(),
    '선교부 2025년 예산',
    '2025년 선교부 부서별 예산 배정 - 국내외 선교 지원, 선교사 후원, 선교 프로그램 등',
    2025, NULL, NULL,
    120000000.00,
    'ACTIVE',
    '2025-01-01'::timestamp,
    '2025-12-31'::timestamp,
    (SELECT id FROM churches WHERE name = '과천교회' LIMIT 1),
    (SELECT id FROM departments WHERE name = '선교부' AND church_id = (SELECT id FROM churches WHERE name = '과천교회' LIMIT 1) LIMIT 1),
    (SELECT id FROM users WHERE email = 'admin@gcchurch.kr' LIMIT 1),
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- 행정부 (1억원)
INSERT INTO budgets (
    id, name, description, year, quarter, month, 
    total_amount, status, start_date, end_date, 
    church_id, department_id, created_by_id, 
    created_at, updated_at
) VALUES (
    gen_random_uuid(),
    '행정부 2025년 예산',
    '2025년 행정부 부서별 예산 배정 - 사무용품, 통신비, 시설 관리, 보험료 등',
    2025, NULL, NULL,
    100000000.00,
    'ACTIVE',
    '2025-01-01'::timestamp,
    '2025-12-31'::timestamp,
    (SELECT id FROM churches WHERE name = '과천교회' LIMIT 1),
    (SELECT id FROM departments WHERE name = '행정부' AND church_id = (SELECT id FROM churches WHERE name = '과천교회' LIMIT 1) LIMIT 1),
    (SELECT id FROM users WHERE email = 'admin@gcchurch.kr' LIMIT 1),
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- 전도부 (8000만원)
INSERT INTO budgets (
    id, name, description, year, quarter, month, 
    total_amount, status, start_date, end_date, 
    church_id, department_id, created_by_id, 
    created_at, updated_at
) VALUES (
    gen_random_uuid(),
    '전도부 2025년 예산',
    '2025년 전도부 부서별 예산 배정 - 전도 이벤트, 새가족 환영회, 전도 자료 제작 등',
    2025, NULL, NULL,
    80000000.00,
    'ACTIVE',
    '2025-01-01'::timestamp,
    '2025-12-31'::timestamp,
    (SELECT id FROM churches WHERE name = '과천교회' LIMIT 1),
    (SELECT id FROM departments WHERE name = '전도부' AND church_id = (SELECT id FROM churches WHERE name = '과천교회' LIMIT 1) LIMIT 1),
    (SELECT id FROM users WHERE email = 'admin@gcchurch.kr' LIMIT 1),
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- 봉사부 (6000만원)
INSERT INTO budgets (
    id, name, description, year, quarter, month, 
    total_amount, status, start_date, end_date, 
    church_id, department_id, created_by_id, 
    created_at, updated_at
) VALUES (
    gen_random_uuid(),
    '봉사부 2025년 예산',
    '2025년 봉사부 부서별 예산 배정 - 사회봉사, 구제사업, 봉사 활동 지원 등',
    2025, NULL, NULL,
    60000000.00,
    'ACTIVE',
    '2025-01-01'::timestamp,
    '2025-12-31'::timestamp,
    (SELECT id FROM churches WHERE name = '과천교회' LIMIT 1),
    (SELECT id FROM departments WHERE name = '봉사부' AND church_id = (SELECT id FROM churches WHERE name = '과천교회' LIMIT 1) LIMIT 1),
    (SELECT id FROM users WHERE email = 'admin@gcchurch.kr' LIMIT 1),
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- 청년부 (8000만원)
INSERT INTO budgets (
    id, name, description, year, quarter, month, 
    total_amount, status, start_date, end_date, 
    church_id, department_id, created_by_id, 
    created_at, updated_at
) VALUES (
    gen_random_uuid(),
    '청년부 2025년 예산',
    '2025년 청년부 부서별 예산 배정 - 청년 모임, 수련회, 청년 사역 프로그램 등',
    2025, NULL, NULL,
    80000000.00,
    'ACTIVE',
    '2025-01-01'::timestamp,
    '2025-12-31'::timestamp,
    (SELECT id FROM churches WHERE name = '과천교회' LIMIT 1),
    (SELECT id FROM departments WHERE name = '청년부' AND church_id = (SELECT id FROM churches WHERE name = '과천교회' LIMIT 1) LIMIT 1),
    (SELECT id FROM users WHERE email = 'admin@gcchurch.kr' LIMIT 1),
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- 기타 부서들 (총 10억원에서 남은 금액을 기타 부서에 배정)
-- 총 배정액: 2억 + 1.5억 + 1.2억 + 1억 + 8000만 + 6000만 + 8000만 = 8.3억원
-- 남은 금액: 1.7억원을 기타 부서들에 배정

-- 모든 부서별 예산 항목 생성 (Budget Items)
-- 예배부 예산 항목들
INSERT INTO budget_items (
    id, name, description, amount, category, code,
    budget_id, created_at, updated_at
)
SELECT 
    gen_random_uuid(),
    '음향/영상 장비',
    '예배 음향 및 영상 장비 구입 및 유지보수',
    80000000.00,
    'FACILITIES',
    'WORSHIP_AV',
    b.id,
    NOW(),
    NOW()
FROM budgets b 
WHERE b.name = '예배부 2025년 예산'
ON CONFLICT (id) DO NOTHING;

INSERT INTO budget_items (
    id, name, description, amount, category, code,
    budget_id, created_at, updated_at
)
SELECT 
    gen_random_uuid(),
    '예배용품',
    '성찬용품, 꽃꽂이, 예배 소모품 등',
    60000000.00,
    'OPERATIONS',
    'WORSHIP_SUPPLIES',
    b.id,
    NOW(),
    NOW()
FROM budgets b 
WHERE b.name = '예배부 2025년 예산'
ON CONFLICT (id) DO NOTHING;

INSERT INTO budget_items (
    id, name, description, amount, category, code,
    budget_id, created_at, updated_at
)
SELECT 
    gen_random_uuid(),
    '성가대 운영',
    '성가대 의상, 악보, 연습실 운영 등',
    60000000.00,
    'MINISTRY',
    'CHOIR_OPERATION',
    b.id,
    NOW(),
    NOW()
FROM budgets b 
WHERE b.name = '예배부 2025년 예산'
ON CONFLICT (id) DO NOTHING;

-- 교육부 예산 항목들
INSERT INTO budget_items (
    id, name, description, amount, category, code,
    budget_id, created_at, updated_at
)
SELECT 
    gen_random_uuid(),
    '교육 프로그램',
    '주일학교, 성인 성경공부, 신앙교육 프로그램',
    80000000.00,
    'EDUCATION',
    'EDU_PROGRAMS',
    b.id,
    NOW(),
    NOW()
FROM budgets b 
WHERE b.name = '교육부 2025년 예산'
ON CONFLICT (id) DO NOTHING;

INSERT INTO budget_items (
    id, name, description, amount, category, code,
    budget_id, created_at, updated_at
)
SELECT 
    gen_random_uuid(),
    '교육자료',
    '교재, 교구, 도서, 멀티미디어 자료',
    40000000.00,
    'EDUCATION',
    'EDU_MATERIALS',
    b.id,
    NOW(),
    NOW()
FROM budgets b 
WHERE b.name = '교육부 2025년 예산'
ON CONFLICT (id) DO NOTHING;

INSERT INTO budget_items (
    id, name, description, amount, category, code,
    budget_id, created_at, updated_at
)
SELECT 
    gen_random_uuid(),
    '교사 연수',
    '교사 훈련, 세미나, 워크숍',
    30000000.00,
    'EDUCATION',
    'TEACHER_TRAINING',
    b.id,
    NOW(),
    NOW()
FROM budgets b 
WHERE b.name = '교육부 2025년 예산'
ON CONFLICT (id) DO NOTHING;

-- 선교부 예산 항목들  
INSERT INTO budget_items (
    id, name, description, amount, category, code,
    budget_id, created_at, updated_at
)
SELECT 
    gen_random_uuid(),
    '선교사 후원',
    '국내외 파송 선교사 생활비 지원',
    70000000.00,
    'MISSION',
    'MISSIONARY_SUPPORT',
    b.id,
    NOW(),
    NOW()
FROM budgets b 
WHERE b.name = '선교부 2025년 예산'
ON CONFLICT (id) DO NOTHING;

INSERT INTO budget_items (
    id, name, description, amount, category, code,
    budget_id, created_at, updated_at
)
SELECT 
    gen_random_uuid(),
    '선교 프로그램',
    '단기선교, 국내선교, 선교 이벤트',
    30000000.00,
    'MISSION',
    'MISSION_PROGRAMS',
    b.id,
    NOW(),
    NOW()
FROM budgets b 
WHERE b.name = '선교부 2025년 예산'
ON CONFLICT (id) DO NOTHING;

INSERT INTO budget_items (
    id, name, description, amount, category, code,
    budget_id, created_at, updated_at
)
SELECT 
    gen_random_uuid(),
    '선교 자료',
    '선교 홍보물, 선교 교육 자료',
    20000000.00,
    'MISSION',
    'MISSION_MATERIALS',
    b.id,
    NOW(),
    NOW()
FROM budgets b 
WHERE b.name = '선교부 2025년 예산'
ON CONFLICT (id) DO NOTHING;

-- 각 예산 항목별 집행 현황 초기화
INSERT INTO budget_executions (
    id, total_budget, used_amount, pending_amount, remaining_amount,
    execution_rate, budget_item_id, created_at, updated_at, last_updated
)
SELECT 
    gen_random_uuid(),
    bi.amount,
    0.00,
    0.00,
    bi.amount,
    0.0,
    bi.id,
    NOW(),
    NOW(),
    NOW()
FROM budget_items bi
WHERE bi.budget_id IN (
    SELECT id FROM budgets 
    WHERE year = 2025 AND church_id = (SELECT id FROM churches WHERE name = '과천교회' LIMIT 1)
)
ON CONFLICT (budget_item_id) DO NOTHING;

-- 데이터 확인 쿼리
SELECT 
    d.name as department_name,
    b.name as budget_name,
    b.total_amount,
    COUNT(bi.id) as budget_items_count,
    SUM(bi.amount) as total_items_amount
FROM budgets b
JOIN departments d ON b.department_id = d.id
LEFT JOIN budget_items bi ON b.id = bi.budget_id
WHERE b.year = 2025 
  AND b.church_id = (SELECT id FROM churches WHERE name = '과천교회' LIMIT 1)
GROUP BY d.name, b.name, b.total_amount
ORDER BY b.total_amount DESC;