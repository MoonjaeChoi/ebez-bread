# Vercel 배포 가이드

## 1. 사전 준비

### 필수 요구사항
- Node.js 18+ 설치
- npm 또는 yarn 패키지 매니저
- GitHub 계정
- Vercel 계정
- PostgreSQL 데이터베이스 (Supabase 또는 다른 제공업체)

### 데이터베이스 설정
프로덕션용 PostgreSQL 데이터베이스가 필요합니다:

**Supabase 사용하는 경우:**
1. [Supabase](https://supabase.com)에서 새 프로젝트 생성
2. Settings > Database에서 연결 문자열 복사
3. `postgresql://[user]:[password]@[host]:[port]/[database]` 형식

**다른 PostgreSQL 제공업체:**
- Railway, PlanetScale, Neon, Amazon RDS 등 사용 가능

## 2. GitHub 저장소 준비

### 코드 푸시
```bash
# 모든 파일을 스테이징에 추가
git add .

# 커밋 메시지와 함께 커밋
git commit -m "feat: prepare for Vercel deployment

🚀 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# GitHub에 푸시
git push origin main
```

## 3. Vercel 배포 설정

### 3.1 Vercel 프로젝트 생성
1. [Vercel 대시보드](https://vercel.com/dashboard)에 로그인
2. "New Project" 클릭
3. GitHub 저장소 선택 및 Import
4. Framework Preset: "Next.js" 자동 감지됨

### 3.2 환경 변수 설정
Vercel 프로젝트 Settings > Environment Variables에서 설정:

#### 필수 환경 변수
```bash
# 데이터베이스
DATABASE_URL=postgresql://[user]:[password]@[host]:[port]/[database]

# NextAuth.js 인증
NEXTAUTH_SECRET=your-super-secret-key-here
NEXTAUTH_URL=https://your-app.vercel.app
```

#### 선택적 환경 변수
```bash
# PWA 푸시 알림 (선택사항)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_private_KEY=your-vapid-private-key

# 외부 서비스 (선택사항)
REDIS_URL=redis://your-redis-url
EMAIL_SERVER_HOST=smtp.gmail.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=your-email@gmail.com
EMAIL_SERVER_PASSWORD=your-app-password
EMAIL_FROM=your-email@gmail.com

# 모니터링 (선택사항)
SENTRY_DSN=your-sentry-dsn
SENTRY_ORG=your-org
SENTRY_PROJECT=your-project
SENTRY_AUTH_TOKEN=your-auth-token

# AWS S3 (선택사항)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=your-bucket-name
```

### 3.3 빌드 설정
Vercel은 자동으로 다음을 감지합니다:
- Build Command: `npm run vercel-build`
- Output Directory: `.next`
- Install Command: `npm install`
- Development Command: `npm run dev`

## 4. 배포 과정

### 자동 배포
1. GitHub에 코드를 푸시하면 Vercel이 자동으로 배포 시작
2. 빌드 과정에서 다음이 실행됩니다:
   - `npm install` - 의존성 설치
   - `prisma generate` - Prisma 클라이언트 생성
   - `npm run build` - Next.js 애플리케이션 빌드
   - `npm run type-check` - TypeScript 타입 체크

### 데이터베이스 초기화
첫 배포 후 데이터베이스 스키마를 설정해야 합니다:

```bash
# Vercel CLI 설치 (로컬에서)
npm i -g vercel

# 프로젝트와 연결
vercel link

# 환경 변수를 로컬로 가져오기
vercel env pull

# 데이터베이스 스키마 푸시
npx prisma db push

# 기본 데이터 시드 (선택사항)
npx prisma db seed
```

## 5. 배포 후 확인

### 5.1 헬스체크
배포된 애플리케이션의 상태 확인:
```
GET https://your-app.vercel.app/healthz
```

### 5.2 기본 기능 테스트
1. 메인 페이지 접속
2. 로그인 기능 확인
3. 데이터베이스 연결 확인
4. API 엔드포인트 동작 확인

## 6. 도메인 설정 (선택사항)

### 커스텀 도메인 추가
1. Vercel 프로젝트 Settings > Domains
2. 도메인 추가 및 DNS 설정
3. SSL 인증서 자동 발급

## 7. 모니터링 및 로그

### 로그 확인
```bash
# Vercel CLI로 실시간 로그 확인
vercel logs

# 특정 함수의 로그 확인
vercel logs --follow
```

### 성능 모니터링
- Vercel Analytics 활성화
- Sentry 연동 (환경 변수 설정 시)

## 8. 자주 발생하는 문제

### 빌드 에러
- TypeScript 타입 에러: `npm run type-check`로 로컬에서 확인
- ESLint 에러: `npm run lint`로 로컬에서 확인
- 환경 변수 누락: Vercel 대시보드에서 설정 확인

### 데이터베이스 연결 에러
- `DATABASE_URL` 환경 변수 확인
- 데이터베이스 서버 상태 확인
- 네트워크/방화벽 설정 확인

### 인증 에러
- `NEXTAUTH_SECRET` 설정 확인
- `NEXTAUTH_URL`이 배포된 도메인과 일치하는지 확인

## 9. 업데이트 및 재배포

### 코드 업데이트
```bash
git add .
git commit -m "your update message"
git push origin main
```

### 환경 변수 업데이트
Vercel 대시보드에서 환경 변수 변경 후 재배포 필요

### 데이터베이스 스키마 변경
```bash
# 로컬에서 스키마 변경 후
npx prisma db push

# 또는 마이그레이션 사용
npx prisma migrate dev
npx prisma migrate deploy
```

## 10. 백업 및 보안

### 환경 변수 백업
중요한 환경 변수들을 안전한 곳에 백업 보관

### 보안 설정
- CORS 설정 확인
- API 엔드포인트 인증 확인
- 데이터베이스 접근 권한 최소화

---

## 지원 및 문의

배포 과정에서 문제가 발생하면:
1. Vercel 공식 문서 참조
2. 프로젝트 이슈 트래커에 문의
3. 로그 파일과 함께 상세한 오류 내용 제공

Happy Deploying! 🚀