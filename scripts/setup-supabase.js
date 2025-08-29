#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 Supabase 설정 스크립트');
console.log('========================\n');

// 환경 변수 파일 경로
const envPath = path.join(__dirname, '..', '.env');
const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');

function setupSupabase() {
  console.log('📋 Supabase 설정을 위한 단계별 가이드:\n');
  
  console.log('1️⃣  Supabase 프로젝트 생성');
  console.log('   - https://supabase.com 접속');
  console.log('   - "Start your project" → "New Project" 클릭');
  console.log('   - 프로젝트 이름: ebenezer-church-app');
  console.log('   - 강력한 데이터베이스 비밀번호 설정\n');
  
  console.log('2️⃣  데이터베이스 연결 정보 복사');
  console.log('   - Settings → Database → Connection string');
  console.log('   - URI 형식 선택하여 복사\n');
  
  console.log('3️⃣  환경 변수 업데이트');
  console.log('   - .env 파일에서 DATABASE_URL 수정');
  console.log('   - SQLite → PostgreSQL로 전환\n');
  
  console.log('4️⃣  자동 전환 실행');
  console.log('   아래 명령어들을 순서대로 실행하세요:\n');
  console.log('   📦 npm run setup:supabase-schema');
  console.log('   🔄 npx prisma generate');
  console.log('   🗄️  npx prisma db push');
  console.log('   🌱 npm run db:seed\n');
  
  console.log('💡 자세한 가이드는 SUPABASE_SETUP.md 파일을 참조하세요.');
}

function switchToPostgreSQL() {
  console.log('🔄 PostgreSQL 스키마로 전환 중...\n');
  
  try {
    // schema.prisma 파일 읽기
    let schemaContent = fs.readFileSync(schemaPath, 'utf8');
    
    // SQLite → PostgreSQL 전환
    schemaContent = schemaContent.replace(
      /provider = "sqlite"/g,
      'provider = "postgresql"'
    );
    
    // Decimal 타입 추가
    schemaContent = schemaContent.replace(
      /amount\s+Decimal(?!\s+@db\.Decimal)/g,
      'amount       Decimal     @db.Decimal(10, 2)'
    );
    
    // 파일 저장
    fs.writeFileSync(schemaPath, schemaContent);
    
    console.log('✅ Prisma 스키마가 PostgreSQL용으로 전환되었습니다.');
    console.log('✅ Decimal 타입 정밀도가 추가되었습니다.\n');
    console.log('🔔 다음 단계:');
    console.log('   1. .env 파일에서 DATABASE_URL을 Supabase URL로 변경');
    console.log('   2. npx prisma generate 실행');
    console.log('   3. npx prisma db push 실행');
    
  } catch (error) {
    console.error('❌ 스키마 전환 중 오류:', error.message);
  }
}

// 명령줄 인수 확인
const command = process.argv[2];

if (command === 'schema') {
  switchToPostgreSQL();
} else {
  setupSupabase();
}