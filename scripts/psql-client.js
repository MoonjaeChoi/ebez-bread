#!/usr/bin/env node

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function executeSQLFile(sqlFilePath) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('✅ PostgreSQL에 연결되었습니다.');

    if (sqlFilePath && fs.existsSync(sqlFilePath)) {
      const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
      console.log(`📄 SQL 파일 실행: ${sqlFilePath}`);
      
      const result = await client.query(sqlContent);
      console.log('✅ SQL 파일 실행 완료');
      
      if (result.rows && result.rows.length > 0) {
        console.log('📊 결과:');
        console.table(result.rows);
      }
    } else {
      console.log('💡 대화형 모드입니다. SQL 쿼리를 입력하세요:');
    }
  } catch (error) {
    console.error('❌ 오류:', error.message);
  } finally {
    await client.end();
  }
}

// 명령줄 인수 처리
const sqlFile = process.argv[2];
if (sqlFile) {
  executeSQLFile(sqlFile);
} else {
  console.log('사용법: node psql-client.js [SQL파일경로]');
  console.log('예시: node psql-client.js ../supabase-budget-insert.sql');
}