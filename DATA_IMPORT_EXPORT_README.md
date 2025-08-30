# 에벤에셀(eVeNeZeR) 교회 관리 시스템 - 데이터 가져오기/내보내기 기능

## 개요
SheetJS (xlsx) 라이브러리를 활용하여 Excel/CSV 파일로 교회 데이터를 가져오고 내보낼 수 있는 기능을 구현했습니다.

## 구현된 기능

### 1. 핵심 라이브러리 (`src/lib/data-import-export/`)
- **types.ts**: TypeScript 타입 정의
- **validators.ts**: 데이터 유효성 검증 로직
- **excel-processor.ts**: Excel/CSV 파일 처리 및 변환
- **backup-manager.ts**: 백업 파일 생성 관리
- **index.ts**: 라이브러리 진입점

### 2. tRPC API (`src/server/routers/import-export.ts`)
- 데이터 유효성 검증 API
- 교인/헌금/출석/심방 데이터 가져오기
- 데이터 내보내기 및 백업 생성
- 템플릿 다운로드

### 3. UI 컴포넌트 (`src/components/data-management/`)
- **ImportDialog.tsx**: 데이터 가져오기 대화상자
- **ExportDialog.tsx**: 데이터 내보내기 대화상자  
- **BackupDialog.tsx**: 백업 생성 대화상자
- **DataTypeCard.tsx**: 데이터 타입별 카드 컴포넌트

### 4. 메인 페이지 (`src/app/dashboard/data-management/page.tsx`)
- 통합 데이터 관리 인터페이스
- 탭 기반 사용자 인터페이스
- 실시간 진행상황 표시

## 지원되는 데이터 타입

### 1. 교인 정보 (Member)
- 이름, 전화번호, 이메일, 생년월일
- 주소, 성별, 결혼상태
- 세례일, 입교일, 직분, 부서
- 가족관계, 상태, 비고

### 2. 헌금 데이터 (Offering)
- 교인명, 금액, 헌금종류
- 설명, 헌금일

### 3. 출석 데이터 (Attendance)
- 교인명, 예배종류, 출석일
- 출석여부, 비고

### 4. 심방 기록 (Visitation)
- 교인명, 심방일, 목적
- 내용, 후속관리 여부, 후속관리일

### 5. 지출결의서 (ExpenseReport)
- 제목, 설명, 금액, 분류
- 상태, 신청일, 승인일, 거부일

## 주요 기능

### 데이터 가져오기
1. **템플릿 다운로드**: 데이터 타입별 Excel 템플릿 제공
2. **파일 업로드**: Excel (.xlsx, .xls) 및 CSV 파일 지원
3. **데이터 검증**: 실시간 유효성 검증 및 오류 리포트
4. **선택적 가져오기**: 오류 건너뛰기, 기존 데이터 업데이트 옵션

### 데이터 내보내기
1. **다양한 형식**: Excel (.xlsx) 및 CSV 파일 내보내기
2. **필터링**: 날짜 범위, 활성/비활성 데이터 선택
3. **사용자 정의**: 파일명 지정 가능
4. **자동 형식화**: 한글 컬럼명, 날짜/숫자 형식화

### 백업 관리
1. **전체 백업**: 모든 데이터 타입을 하나의 Excel 파일로 백업
2. **선택적 백업**: 필요한 데이터 타입만 선택하여 백업
3. **날짜 범위**: 특정 기간의 데이터만 백업 가능
4. **백업 정보**: 백업 생성 정보 및 레코드 수 포함

## 기술적 특징

### 1. 타입 안전성
- TypeScript를 통한 엄격한 타입 검사
- Prisma 모델과 완벽한 호환성
- Zod 스키마를 통한 런타임 검증

### 2. 사용자 경험
- 실시간 진행상황 표시
- 단계별 가이드 제공
- 직관적인 오류 메시지
- 반응형 디자인

### 3. 성능 최적화
- 대용량 데이터 처리 지원
- 비동기 처리를 통한 UI 블로킹 방지
- 메모리 효율적인 파일 처리

### 4. 보안
- 사용자 권한 검증 (Manager 이상 권한 필요)
- 교회별 데이터 격리 (Multi-tenancy)
- 파일 형식 검증

## 사용 방법

### 1. 데이터 가져오기
```
1. /dashboard/data-management 페이지 방문
2. "가져오기" 탭 선택
3. 데이터 타입 선택 및 템플릿 다운로드
4. 템플릿에 데이터 입력
5. 파일 업로드 및 검증
6. 데이터 가져오기 실행
```

### 2. 데이터 내보내기
```
1. "내보내기" 탭 선택
2. 데이터 타입 및 파일 형식 선택
3. 필터 옵션 설정 (선택사항)
4. 내보내기 실행
```

### 3. 백업 생성
```
1. "백업" 탭 선택
2. 포함할 데이터 타입 선택
3. 날짜 범위 및 파일명 설정 (선택사항)
4. 백업 생성 실행
```

## API 엔드포인트

### tRPC 라우터: `importExport`
- `validateData`: 데이터 유효성 검증
- `importMembers`: 교인 데이터 가져오기
- `importOfferings`: 헌금 데이터 가져오기
- `importAttendances`: 출석 데이터 가져오기
- `exportData`: 데이터 내보내기
- `createBackup`: 백업 생성
- `downloadTemplate`: 템플릿 다운로드

## 설치된 패키지
- `xlsx`: Excel 파일 처리
- `file-saver`: 파일 다운로드
- `@radix-ui/react-progress`: 진행률 표시
- `@radix-ui/react-popover`: 팝오버 UI
- `react-day-picker`: 날짜 선택

## 추가 UI 컴포넌트
- `src/components/ui/progress.tsx`
- `src/components/ui/alert.tsx`
- `src/components/ui/popover.tsx`
- `src/components/ui/calendar.tsx`

## 접근 방법
브라우저에서 `/dashboard/data-management` 경로로 접근하여 사용할 수 있습니다.

## 권한 요구사항
- 가져오기/백업: MANAGER 이상 권한 필요
- 내보내기: GENERAL_USER 이상 권한 필요

## 향후 개선 사항
- 실시간 가져오기 진행률 표시
- 가져오기 이력 관리
- 자동 백업 스케줄링
- 더 많은 파일 형식 지원
- 대용량 파일 처리 최적화