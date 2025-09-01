#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function executeQuery(query: string) {
  try {
    console.log('📋 실행할 쿼리:', query)
    console.log('=' * 50)
    
    const result = await prisma.$queryRawUnsafe(query)
    
    if (Array.isArray(result) && result.length > 0) {
      console.log('📊 쿼리 결과:')
      console.table(result)
      console.log(`\n✅ 총 ${result.length}개 행`)
    } else {
      console.log('✅ 쿼리 실행 완료 (결과 없음)')
    }
    
    return result
  } catch (error: any) {
    console.error('❌ 쿼리 실행 오류:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

// 명령줄 인수 처리
const query = process.argv.slice(2).join(' ')

if (query) {
  executeQuery(query)
} else {
  console.log('사용법: npx tsx scripts/postgres-query.ts "YOUR_SQL_QUERY"')
  console.log('')
  console.log('예시:')
  console.log('  npx tsx scripts/postgres-query.ts "SELECT COUNT(*) FROM budgets"')
  console.log('  npx tsx scripts/postgres-query.ts "SELECT name, total_amount FROM budgets WHERE year = 2025"')
}