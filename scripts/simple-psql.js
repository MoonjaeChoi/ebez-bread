#!/usr/bin/env node

const { Client } = require('pg');

async function simpleQuery(query) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('✅ PostgreSQL 연결 성공');

    const result = await client.query(query);
    
    if (result.rows && result.rows.length > 0) {
      console.log('📊 쿼리 결과:');
      console.table(result.rows);
    } else {
      console.log('✅ 쿼리 실행 완료 (결과 없음)');
    }
    
    return result;
  } catch (error) {
    console.error('❌ 오류:', error.message);
  } finally {
    await client.end();
  }
}

// 명령줄 인수로 쿼리 실행
const query = process.argv.slice(2).join(' ');

if (query) {
  simpleQuery(query);
} else {
  console.log('사용법: node simple-psql.js "SELECT * FROM users LIMIT 5;"');
  console.log('예시: node simple-psql.js "SELECT name, total_amount FROM budgets WHERE year = 2025;"');
}