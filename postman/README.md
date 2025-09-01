# POSTMAN API 테스트 가이드

## 배포 오류 분석

배포 환경에서 발생한 오류는 **JavaScript 최적화 또는 보안 설정으로 인해 `console` 객체가 `null`이 되는 경우**입니다.

### 원인
- 프로덕션 환경에서 JavaScript 압축/최적화 과정에서 `console` 객체가 제거됨
- CSP(Content Security Policy) 또는 보안 설정으로 인한 `console` 접근 제한
- Netlify, Vercel 등 배포 플랫폼의 런타임 최적화

### 해결책
`src/lib/safe-logger.ts` 파일에서 안전한 로깅 유틸리티를 구현했습니다:
- console이 null인지 체크 후 사용
- 로깅 실패 시에도 에러를 발생시키지 않음
- 기존 console API와 동일한 인터페이스 제공

## POSTMAN 테스트 설정

### 1. 컬렉션 임포트
1. POSTMAN 실행
2. Import → File → `ebenezer-api-collection.json` 선택
3. Import 완료

### 2. 환경 설정
1. Environments → Import → `local-environment.json` 선택
2. 환경 활성화: Local Development 선택

### 3. 로컬 서버 시작
```bash
# 설정 스크립트 실행
node scripts/local-test-setup.js

# 개발 서버 시작
npm run dev
```

## API 테스트 시나리오

### 인증 테스트
1. **Login**: POST `/api/auth/signin`
   - 기본 계정: `admin@gcchurch.kr` / `password`
   - 성공 시 JWT 토큰 자동 저장

2. **Session**: GET `/api/auth/session`
   - 현재 세션 정보 확인

### 회원 관리 테스트
1. **전체 회원 조회**: `members.getAll`
2. **회원 생성**: `members.create`
3. **회원 수정**: `members.update`

### 회계 시스템 테스트
1. **계정 과목 조회**: `accountCodes.getAll`
2. **예산 조회**: `budgets.getAll`
3. **거래 내역 조회**: `transactions.getAll`
4. **거래 생성**: `transactions.create`

### 조직 관리 테스트
1. **조직 조회**: `organizations.getAll`
2. **조직 생성**: `organizations.create`

### 헌금 관리 테스트
1. **헌금 조회**: `offerings.getAll`
2. **헌금 등록**: `offerings.create`

### 보고서 테스트
1. **회원 통계**: `reports.memberStatistics`
2. **재정 보고서**: `reports.financialSummary`

## tRPC 배치 요청 형식

tRPC는 배치 요청을 위해 특별한 URL 형식을 사용합니다:

```
GET /api/trpc/[procedure]?batch=1&input={"0":{"json":{...params}}}
POST /api/trpc/[procedure] 
Body: {"0":{"json":{...params}}}
```

### 예시
```bash
# GET 요청
GET /api/trpc/members.getAll?batch=1&input={"0":{"json":{"churchId":1}}}

# POST 요청
POST /api/trpc/members.create
{
  "0": {
    "json": {
      "churchId": 1,
      "name": "홍길동",
      "email": "hong@example.com"
    }
  }
}
```

## 환경별 설정

### Local Development
- Base URL: `http://localhost:3000`
- Database: Supabase (production)
- 인증: NextAuth.js

### Production Testing
1. Collection Variables에서 `base_url` 변경
2. 환경 변수에서 `environment` 값을 `production`으로 설정

## 공통 테스트 패턴

### 응답 시간 체크
모든 요청에 대해 5초 이내 응답 확인

### 상태 코드 체크
200 또는 201 상태 코드 확인

### 인증 토큰 자동 관리
로그인 성공 시 JWT 토큰 자동으로 collection variables에 저장

## 문제 해결

### 1. 연결 실패
- `.env.local` 파일 확인
- Supabase 연결 정보 확인
- 개발 서버 실행 상태 확인

### 2. 인증 실패
- 테스트 계정 존재 여부 확인
- JWT 토큰 유효성 확인
- 세션 만료 확인

### 3. 권한 오류
- churchId 파라미터 확인
- 사용자 권한 수준 확인
- 멀티테넌트 필터 적용 여부 확인

## 추가 도구

### Console 안전성 테스트
```bash
node test-console-safety.js
```

### 수동 curl 테스트
```bash
# Health check
curl http://localhost:3000/api/health

# 회원 조회
curl "http://localhost:3000/api/trpc/members.getAll?batch=1&input=%7B%220%22%3A%7B%22json%22%3A%7B%22churchId%22%3A1%7D%7D%7D"
```

## 성능 모니터링

- 응답 시간 모니터링 (< 5초)
- 메모리 사용량 체크
- 데이터베이스 연결 풀 상태
- 에러율 모니터링