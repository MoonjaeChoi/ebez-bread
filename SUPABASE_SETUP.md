# Supabase 데이터베이스 설정 가이드

## 1. Supabase 프로젝트 생성

1. [Supabase 홈페이지](https://supabase.com) 접속
2. **"Start your project"** 클릭
3. **"New Project"** 클릭
4. 프로젝트 정보 입력:
   - **Name**: `ebenezer-church-app` (또는 원하는 이름)
   - **Database Password**: 강력한 비밀번호 설정 (기록 필수!)
   - **Region**: `Northeast Asia (ap-northeast-1)` 선택
5. **"Create new project"** 클릭

## 2. 데이터베이스 연결 정보 확인

프로젝트가 생성되면 (약 2분 소요):

1. 대시보드에서 **"Settings"** → **"Database"** 이동
2. **"Connection string"** 섹션에서 **"URI"** 선택
3. 연결 문자열이 다음과 같은 형식으로 나타남:
   ```
   postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres
   ```

## 3. 환경 변수 설정

`.env` 파일에서 다음 값들을 실제 Supabase 정보로 교체:

```env
# Database (Supabase PostgreSQL)
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres"

# Supabase 설정 (선택사항)
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT-REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY=""
```

### 값 찾기:
- **[PROJECT-REF]**: 프로젝트 대시보드 URL에서 확인 가능
- **[YOUR-PASSWORD]**: 프로젝트 생성 시 설정한 데이터베이스 비밀번호
- **[YOUR-ANON-KEY]**: Settings → API → anon public 키

## 4. 데이터베이스 마이그레이션 실행

환경 변수 설정 후 터미널에서 실행:

 # Prisma 클라이언트 생성
  npx prisma generate

  # 데이터베이스 푸시 (스키마 적용)
  npx prisma db push

  # 샘플 데이터 시드
  npx prisma db seed


```bash
# Prisma 클라이언트 재생성
npx prisma generate

# 데이터베이스 마이그레이션
npx prisma db push

# 시드 데이터 생성
npm run db:seed
```

## 5. 연결 테스트

```bash
# 개발 서버 시작
npm run dev

# 로그인 테스트
# http://localhost:3000 접속
# 이메일: admin@ebenezer.church
# 비밀번호: password
```

## 6. Supabase 대시보드에서 확인

1. Supabase 대시보드 → **"Table Editor"** 이동
2. 생성된 테이블들 확인:
   - churches
   - users
   - members
   - positions
   - departments
   - offerings
   - attendances
   - 등...

## 트러블슈팅

### 연결 오류 시:
1. **DATABASE_URL**이 정확한지 확인
2. 비밀번호에 특수문자가 있다면 URL 인코딩 필요
3. 프로젝트가 완전히 생성되었는지 확인 (Status가 "Active"인지)

### IP 제한 오류 시:
1. Supabase 대시보드 → **"Settings"** → **"Database"**
2. **"Network Restrictions"**에서 현재 IP 추가 또는 모든 IP 허용 설정

## 보안 참고사항

- 프로덕션 환경에서는 IP 제한 설정 권장
- 데이터베이스 비밀번호는 강력하게 설정
- `.env` 파일은 절대 Git에 커밋하지 않도록 주의