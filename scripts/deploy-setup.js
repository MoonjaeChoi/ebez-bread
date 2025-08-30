#!/usr/bin/env node

/**
 * Vercel 배포를 위한 설정 스크립트
 * 프로덕션 환경에서 필요한 설정을 확인하고 설정합니다.
 */

const fs = require('fs')
const path = require('path')

console.log('🚀 Vercel 배포 설정을 확인하는 중...')

// 필수 환경 변수 체크
const requiredEnvVars = [
  'DATABASE_URL',
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL'
]

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar])

if (missingEnvVars.length > 0) {
  console.warn('⚠️  다음 필수 환경 변수가 설정되지 않았습니다:')
  missingEnvVars.forEach(envVar => console.warn(`   - ${envVar}`))
  console.warn('   Vercel 대시보드에서 Environment Variables를 설정해주세요.')
}

// Prisma 클라이언트 생성
console.log('📦 Prisma 클라이언트 생성 중...')
try {
  require('child_process').execSync('npx prisma generate', { stdio: 'inherit' })
  console.log('✅ Prisma 클라이언트 생성 완료')
} catch (error) {
  console.error('❌ Prisma 클라이언트 생성 실패:', error.message)
  process.exit(1)
}

// 데이터베이스 스키마 동기화 (프로덕션에서는 주의)
if (process.env.NODE_ENV === 'production' && process.env.DATABASE_URL) {
  console.log('🗄️  데이터베이스 스키마 동기화 중...')
  try {
    require('child_process').execSync('npx prisma db push', { stdio: 'inherit' })
    console.log('✅ 데이터베이스 스키마 동기화 완료')
  } catch (error) {
    console.warn('⚠️  데이터베이스 스키마 동기화 실패:', error.message)
    console.warn('   수동으로 데이터베이스를 설정해야 할 수 있습니다.')
  }
}

console.log('✅ 배포 설정 완료!')
console.log('📋 다음 단계를 진행해주세요:')
console.log('   1. GitHub 저장소에 코드를 푸시')
console.log('   2. Vercel에 프로젝트 연결')
console.log('   3. 환경 변수 설정')
console.log('   4. 배포 확인')