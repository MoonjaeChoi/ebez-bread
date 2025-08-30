-- =====================================================
-- 과천교회 정보 업데이트 스크립트 (Supabase SQL 에디터용)
-- =====================================================

-- 1단계: 현재 교회 정보 확인
SELECT id, name, address, phone, "pastorName", email, description 
FROM churches 
ORDER BY "createdAt" DESC;

-- 2단계: 과천교회 정보 업데이트
UPDATE churches 
SET 
  name = '과천교회',
  address = '경기도 과천시 관악산길 103 과천교회',
  phone = '02-502-2357',
  "pastorName" = '주현신',
  "updatedAt" = NOW()
WHERE id = (SELECT id FROM churches LIMIT 1);

-- 3단계: 업데이트 결과 확인
SELECT id, name, address, phone, "pastorName", email, description, "updatedAt"
FROM churches 
WHERE name = '과천교회';

-- 4단계: 관련 환경변수도 업데이트하는 경우를 위한 추가 정보
-- (선택사항) 교회 설명도 업데이트
UPDATE churches 
SET 
  description = '과천에 위치한 하나님의 은혜와 사랑을 전하는 교회\n\n주일예배: 오전 9시, 11시\n수요예배: 오후 7시 30분\n새벽예배: 매일 오전 5시 30분\n\n담임목사: 주현신 목사\n주소: 경기도 과천시 관악산길 103\n연락처: 02-502-2357',
  "updatedAt" = NOW()
WHERE name = '과천교회';

-- 최종 확인
SELECT * FROM churches WHERE name = '과천교회';