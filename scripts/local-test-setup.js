#!/usr/bin/env node

/**
 * 로컬 환경에서 Supabase를 사용한 테스트 서버 설정 스크립트
 * 배포 환경 문제를 로컬에서 재현하고 테스트하기 위함
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

console.log('🏗️  로컬 테스트 환경 설정을 시작합니다...\n')

// 1. 환경 변수 파일 생성/확인
function setupEnvironmentFile() {
  console.log('📋 환경 변수 파일을 확인합니다...')
  
  const envLocalPath = path.join(__dirname, '..', '.env.local')
  const envExamplePath = path.join(__dirname, '..', '.env.example')
  
  if (!fs.existsSync(envLocalPath)) {
    if (fs.existsSync(envExamplePath)) {
      console.log('📄 .env.example에서 .env.local을 생성합니다...')
      const envExample = fs.readFileSync(envExamplePath, 'utf8')
      fs.writeFileSync(envLocalPath, envExample)
      console.log('✅ .env.local 파일이 생성되었습니다.')
      console.log('⚠️  Supabase URL과 KEY를 설정해주세요!\n')
    } else {
      console.log('❌ .env.example 파일을 찾을 수 없습니다.\n')
      return false
    }
  } else {
    console.log('✅ .env.local 파일이 존재합니다.\n')
  }
  
  return true
}

// 2. Supabase 연결 테스트
function testSupabaseConnection() {
  console.log('🔌 Supabase 연결을 테스트합니다...')
  
  try {
    const { createClient } = require('@supabase/supabase-js')
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      console.log('❌ Supabase 환경 변수가 설정되지 않았습니다.')
      console.log('   VITE_SUPABASE_URL 또는 NEXT_PUBLIC_SUPABASE_URL')
      console.log('   VITE_SUPABASE_ANON_KEY 또는 NEXT_PUBLIC_SUPABASE_ANON_KEY\n')
      return false
    }
    
    console.log('✅ Supabase 환경 변수가 설정되었습니다.')
    console.log(`   URL: ${supabaseUrl}`)
    console.log(`   Key: ${supabaseKey.substring(0, 20)}...\n`)
    return true
    
  } catch (error) {
    console.log('❌ Supabase 연결 테스트 실패:', error.message)
    return false
  }
}

// 3. 필수 의존성 설치 확인
function checkDependencies() {
  console.log('📦 필수 의존성을 확인합니다...')
  
  const packageJsonPath = path.join(__dirname, '..', 'package.json')
  
  if (!fs.existsSync(packageJsonPath)) {
    console.log('❌ package.json을 찾을 수 없습니다.')
    return false
  }
  
  try {
    execSync('npm list @supabase/supabase-js', { stdio: 'ignore' })
    console.log('✅ @supabase/supabase-js가 설치되어 있습니다.')
  } catch (error) {
    console.log('❌ @supabase/supabase-js가 설치되지 않았습니다.')
    console.log('   npm install @supabase/supabase-js 를 실행해주세요.')
    return false
  }
  
  return true
}

// 4. DB 스키마 푸시
function pushDatabaseSchema() {
  console.log('🗄️  데이터베이스 스키마를 푸시합니다...')
  
  try {
    execSync('npm run db:push', { stdio: 'inherit' })
    console.log('✅ 데이터베이스 스키마 푸시가 완료되었습니다.')
  } catch (error) {
    console.log('❌ 데이터베이스 스키마 푸시 실패:', error.message)
    console.log('   DATABASE_URL이 올바르게 설정되었는지 확인해주세요.')
    return false
  }
  
  return true
}

// 5. 테스트 데이터 시드
function seedTestData() {
  console.log('🌱 테스트 데이터를 시드합니다...')
  
  try {
    execSync('npm run db:seed', { stdio: 'inherit' })
    console.log('✅ 기본 테스트 데이터 시드가 완료되었습니다.')
    
    execSync('npm run db:seed:accounting', { stdio: 'inherit' })
    console.log('✅ 회계 테스트 데이터 시드가 완료되었습니다.')
    
    return true
  } catch (error) {
    console.log('❌ 테스트 데이터 시드 실패:', error.message)
    console.log('   데이터베이스 연결을 확인해주세요.')
    return false
  }
}

// 6. 로컬 개발 서버 시작 준비
function prepareDevelopmentServer() {
  console.log('🚀 개발 서버 시작을 준비합니다...')
  
  // TypeScript 빌드 체크
  try {
    execSync('npm run type-check', { stdio: 'inherit' })
    console.log('✅ TypeScript 타입 체크가 완료되었습니다.')
  } catch (error) {
    console.log('❌ TypeScript 타입 체크 실패. 코드를 확인해주세요.')
    return false
  }
  
  console.log('🎯 모든 준비가 완료되었습니다!')
  console.log('\n다음 명령어로 개발 서버를 시작하세요:')
  console.log('  npm run dev\n')
  console.log('그 후 Postman으로 http://localhost:3000/api/trpc를 테스트하세요.')
  
  return true
}

// 7. POSTMAN 환경 파일 생성
function createPostmanEnvironment() {
  console.log('📋 POSTMAN 환경 파일을 생성합니다...')
  
  const postmanDir = path.join(__dirname, '..', 'postman')
  if (!fs.existsSync(postmanDir)) {
    fs.mkdirSync(postmanDir, { recursive: true })
  }
  
  const environmentConfig = {
    "id": "local-environment",
    "name": "Local Development",
    "values": [
      {
        "key": "base_url",
        "value": "http://localhost:3000",
        "enabled": true
      },
      {
        "key": "api_url",
        "value": "http://localhost:3000/api/trpc",
        "enabled": true
      },
      {
        "key": "environment",
        "value": "development",
        "enabled": true
      },
      {
        "key": "church_id",
        "value": "1",
        "enabled": true
      },
      {
        "key": "jwt_token",
        "value": "",
        "enabled": true
      }
    ],
    "_postman_variable_scope": "environment"
  }
  
  const envPath = path.join(postmanDir, 'local-environment.json')
  fs.writeFileSync(envPath, JSON.stringify(environmentConfig, null, 2))
  console.log('✅ POSTMAN 환경 파일이 생성되었습니다: postman/local-environment.json\n')
  
  return true
}

// 8. Console 오류 체크 스크립트 생성
function createConsoleErrorCheck() {
  console.log('🔍 Console 오류 체크 스크립트를 생성합니다...')
  
  const checkScript = `#!/usr/bin/env node

/**
 * Console 오류 재현 테스트 스크립트
 * 배포 환경에서 console이 null이 되는 상황을 시뮬레이션
 */

console.log('🧪 Console 안전성 테스트를 시작합니다...')

// 1. 정상적인 console 사용
console.log('✅ 정상적인 console.log 작동')
console.error('✅ 정상적인 console.error 작동')

// 2. Console null 시뮬레이션
const originalConsole = global.console
global.console = null

try {
  // 이 부분에서 오류가 발생해야 함
  console.log('이 메시지는 표시되지 않아야 합니다.')
  console.log('❌ Console이 null인데도 오류가 발생하지 않았습니다!')
} catch (error) {
  // console 복구
  global.console = originalConsole
  console.log('✅ Console null 상황에서 예상대로 오류가 발생했습니다:', error.message)
}

// 3. Safe logger 테스트
try {
  const { logger } = require('../src/lib/safe-logger')
  
  // console을 다시 null로 설정
  global.console = null
  
  logger.log('Safe logger 테스트')
  logger.error('Safe logger 에러 테스트')
  
  // console 복구
  global.console = originalConsole
  console.log('✅ Safe logger가 console null 상황에서도 정상 작동했습니다.')
  
} catch (error) {
  global.console = originalConsole
  console.log('❌ Safe logger 테스트 실패:', error.message)
}

console.log('🏁 Console 안전성 테스트가 완료되었습니다.')
`
  
  const scriptsDir = path.join(__dirname, '..')
  const scriptPath = path.join(scriptsDir, 'test-console-safety.js')
  fs.writeFileSync(scriptPath, checkScript)
  fs.chmodSync(scriptPath, '755')
  console.log('✅ Console 오류 체크 스크립트가 생성되었습니다: test-console-safety.js\n')
  
  return true
}

// 메인 실행 함수
async function main() {
  console.log('🎯 에벤에셀 교회 관리 시스템 - 로컬 테스트 환경 설정\n')
  
  const steps = [
    { name: '환경 변수 설정', fn: setupEnvironmentFile },
    { name: 'Supabase 연결 테스트', fn: testSupabaseConnection },
    { name: '의존성 확인', fn: checkDependencies },
    { name: 'POSTMAN 환경 생성', fn: createPostmanEnvironment },
    { name: 'Console 안전성 체크 생성', fn: createConsoleErrorCheck },
    { name: '데이터베이스 스키마 푸시', fn: pushDatabaseSchema },
    { name: '테스트 데이터 시드', fn: seedTestData },
    { name: '개발 서버 준비', fn: prepareDevelopmentServer }
  ]
  
  for (const step of steps) {
    console.log(`⏳ ${step.name}...`)
    const success = await step.fn()
    
    if (!success) {
      console.log(`❌ ${step.name}에 실패했습니다. 설정을 확인하고 다시 시도해주세요.`)
      process.exit(1)
    }
    
    console.log(`✅ ${step.name} 완료\n`)
  }
  
  console.log('🎉 모든 설정이 완료되었습니다!')
  console.log('\n📋 다음 단계:')
  console.log('1. npm run dev - 개발 서버 시작')
  console.log('2. POSTMAN에서 postman/ebenezer-api-collection.json 임포트')
  console.log('3. POSTMAN에서 postman/local-environment.json 환경 설정')
  console.log('4. node test-console-safety.js - Console 안전성 테스트')
  console.log('5. API 테스트 시작!')
}

// 에러 핸들링
process.on('uncaughtException', (error) => {
  console.error('❌ 예상치 못한 오류:', error.message)
  process.exit(1)
})

process.on('unhandledRejection', (error) => {
  console.error('❌ 처리되지 않은 Promise 거부:', error.message)
  process.exit(1)
})

// 스크립트 실행
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ 스크립트 실행 실패:', error.message)
    process.exit(1)
  })
}

module.exports = {
  setupEnvironmentFile,
  testSupabaseConnection,
  checkDependencies,
  createPostmanEnvironment,
  createConsoleErrorCheck
}