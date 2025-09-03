# 조직도 재구성 매뉴얼 가이드

## 현재 상황
- 개발 서버가 http://localhost:3001에서 실행 중
- 조직 관리 UI 기능이 추가됨
- 데이터베이스 직접 접근에 prepared statement 충돌 문제 발생

## 웹 인터페이스를 통한 조직 재구성 절차

### 1. 브라우저에서 접속
```
http://localhost:3001/dashboard/data-management/organization-tree
```

### 2. 현재 조직 구조 확인
- 조직도 트리에서 현재 '교구' 포함 조직들 확인
- 각 조직의 레벨과 위계 구조 파악

### 3. LEVEL_1에 '교구' 조직 생성
- 페이지 상단의 "조직 추가" 버튼 클릭
- 새 조직 생성 폼에서 다음 정보 입력:
  ```
  조직코드: DISTRICT
  조직명: 교구
  조직 레벨: LEVEL_1 (본부/교구)
  상위 조직: (선택 안함)
  정렬 순서: 0
  설명: 교구 통합 조직
  ```

### 4. 기존 교구 조직들 재구성
현재 LEVEL_1에 있는 '교구' 포함 조직들을:
- 각 조직의 레벨을 LEVEL_2로 변경
- 상위 조직을 새로 생성한 '교구'로 설정

### 5. 하위 조직들 레벨 조정
- LEVEL_2였던 조직들은 LEVEL_3으로
- LEVEL_3이었던 조직들은 LEVEL_4로

## 예상 결과 구조
```
LEVEL_1: 교구 (새로 생성)
├── LEVEL_2: XX교구 (기존 LEVEL_1에서 이동)
│   ├── LEVEL_3: XX부서 (기존 LEVEL_2에서 이동)
│   └── LEVEL_3: XX팀 (기존 LEVEL_2에서 이동)
└── LEVEL_2: YY교구 (기존 LEVEL_1에서 이동)
    ├── LEVEL_3: YY부서 (기존 LEVEL_2에서 이동)
    └── LEVEL_3: YY팀 (기존 LEVEL_2에서 이동)
```

## 주의사항
1. 조직 변경 시 기존 조직의 구성원, 예산, 지출 정보가 연결되어 있으므로 신중히 진행
2. 각 단계마다 변경 결과를 확인한 후 다음 단계 진행
3. 문제 발생 시 데이터베이스 백업에서 복구 가능

## 대안: 수동 데이터베이스 조작
데이터베이스 연결 문제가 해결되면 다음 SQL로 직접 실행 가능:

```sql
-- 1. 새 교구 조직 생성
INSERT INTO organizations (id, code, name, level, church_id, is_active, sort_order, description, created_at, updated_at)
VALUES (gen_random_uuid(), 'DISTRICT', '교구', 'LEVEL_1', '[CHURCH_ID]', true, 0, '교구 통합 조직', NOW(), NOW());

-- 2. 기존 교구 조직들을 LEVEL_2로 이동하고 새 교구의 하위로 설정
UPDATE organizations 
SET level = 'LEVEL_2', parent_id = (SELECT id FROM organizations WHERE code = 'DISTRICT' AND level = 'LEVEL_1')
WHERE name LIKE '%교구%' AND level = 'LEVEL_1' AND code != 'DISTRICT';

-- 3. 하위 조직들 레벨 조정 (재귀적으로 필요)
```

## 현재 진행 상황
- ✅ 조직도 테이블 구조 파악 완료
- ✅ 조직 관리 UI 컴포넌트 추가 완료  
- ⏳ 웹 인터페이스를 통한 실제 조직 재구성 작업 필요
- ⏳ 변경사항 테스트 및 확인 필요