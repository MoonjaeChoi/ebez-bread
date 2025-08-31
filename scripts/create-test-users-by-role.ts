import { PrismaClient, UserRole } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function createTestUsersByRole() {
  console.log('👥 Creating test users by role with login capability...\n')

  try {
    // 1. 교회 ID 조회
    const church = await prisma.church.findFirst()
    if (!church) {
      throw new Error('No church found in database')
    }

    console.log(`Using church: ${church.name} (${church.id})`)

    // 2. 비밀번호 해시 생성
    const passwordHash = await bcrypt.hash('pass', 12)
    console.log('🔐 Password hash generated for "pass"')

    // 3. 권한별 테스트 사용자 데이터
    const userRoles = [
      'SUPER_ADMIN',
      'ADMIN', 
      'FINANCIAL_MANAGER',
      'MINISTER',
      'COMMITTEE_CHAIR',
      'DEPARTMENT_HEAD',
      'DEPARTMENT_ACCOUNTANT',
      'BUDGET_MANAGER',
      'DEPARTMENT_BUDGET',
      'GENERAL_USER'
    ] as UserRole[]

    // 4. 각 권한별로 10명씩 사용자 생성
    const testUsers = []

    for (const role of userRoles) {
      for (let i = 1; i <= 10; i++) {
        const rolePrefix = role.toLowerCase().replace('_', '')
        const userData = {
          name: `${getRoleDisplayName(role)}${i}`,
          email: `${rolePrefix}${i}@test.gcchurch.kr`,
          password: passwordHash,
          role: role,
          churchId: church.id,
          isActive: true
        }
        testUsers.push(userData)
      }
    }

    console.log(`\n📝 Will create ${testUsers.length} test users (${userRoles.length} roles × 10 users each)`)

    // 5. 기존 사용자 확인 (중복 방지)
    console.log('\n🔍 Checking for existing test users...')
    
    const existingEmails = testUsers.map(user => user.email)
    const existingUsers = await prisma.user.findMany({
      where: {
        email: { in: existingEmails }
      },
      select: { id: true, email: true, name: true, role: true }
    })

    if (existingUsers.length > 0) {
      console.log(`Found ${existingUsers.length} existing test users:`)
      existingUsers.forEach(user => {
        console.log(`   - ${user.name} (${user.email}) - ${user.role}`)
      })
    }

    // 6. 중복이 없는 새 사용자만 필터링
    const existingEmailsSet = new Set(existingUsers.map(u => u.email))
    const newUsers = testUsers.filter(user => !existingEmailsSet.has(user.email))

    console.log(`\n📝 Will create ${newUsers.length} new test users`)
    if (newUsers.length === 0) {
      console.log('✅ All test users already exist - no new insertions needed')
      return
    }

    // 7. 사용자 생성
    console.log('\n🏗️  Creating test users...')
    let createdCount = 0
    let skippedCount = 0
    const createdUsers: any[] = []

    // 권한별로 그룹화하여 생성
    const usersByRole = groupBy(newUsers, 'role')

    for (const [role, users] of Object.entries(usersByRole)) {
      console.log(`\n${getRoleEmoji(role as UserRole)} Creating ${role} users (${users.length}명):`)
      
      for (const userData of users) {
        try {
          const created = await prisma.user.create({
            data: userData,
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              isActive: true,
              createdAt: true
            }
          })

          createdUsers.push(created)
          console.log(`✅ ${created.name} (${created.email})`)
          createdCount++
          
        } catch (error: any) {
          if (error.code === 'P2002') {
            console.log(`⚠️  User already exists: ${userData.email}`)
            skippedCount++
          } else {
            console.error(`❌ Error creating user ${userData.email}:`, error.message)
            skippedCount++
          }
        }
      }
    }

    // 8. 생성 결과 요약
    console.log(`\n📊 Test Users Creation Summary:`)
    console.log('==============================')
    console.log(`Total users requested: ${testUsers.length}`)
    console.log(`Already existing: ${existingUsers.length}`)
    console.log(`Successfully created: ${createdCount}`)
    console.log(`Skipped (conflicts/errors): ${skippedCount}`)

    // 9. 권한별 생성 결과
    console.log('\n👥 Created Users by Role:')
    console.log('========================')
    
    const createdByRole = groupBy(createdUsers, 'role')
    userRoles.forEach(role => {
      const count = createdByRole[role]?.length || 0
      const emoji = getRoleEmoji(role)
      console.log(`${emoji} ${role}: ${count}명 생성`)
    })

    // 10. 로그인 테스트 샘플 계정들
    console.log('\n🔐 Sample Login Test Accounts:')
    console.log('=============================')
    console.log('비밀번호: pass (모든 계정 공통)')
    console.log('')

    // 각 권한별로 첫 번째 계정 표시
    userRoles.forEach(role => {
      const user = createdUsers.find(u => u.role === role)
      if (user) {
        const emoji = getRoleEmoji(role)
        console.log(`${emoji} ${role}:`)
        console.log(`   이메일: ${user.email}`)
        console.log(`   이름: ${user.name}`)
        console.log('')
      }
    })

    // 11. 전체 users 테이블 현황
    const totalUsers = await prisma.user.count({ where: { churchId: church.id } })
    console.log(`📊 Total users in database: ${totalUsers}명`)

    // 12. 로그인 테스트 안내
    console.log('\n🚀 Login Test Instructions:')
    console.log('===========================')
    console.log('1. Start development server: npm run dev')
    console.log('2. Open browser: http://localhost:3000')
    console.log('3. Login with any of the created accounts')
    console.log('4. Password for all accounts: pass')
    console.log('5. Each role has different permissions to test')

    return {
      totalRequested: testUsers.length,
      totalCreated: createdCount,
      totalExisting: existingUsers.length,
      totalSkipped: skippedCount,
      createdByRole: Object.fromEntries(
        userRoles.map(role => [role, createdByRole[role]?.length || 0])
      ),
      totalUsersInDB: totalUsers
    }

  } catch (error) {
    console.error('❌ Error creating test users:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// 헬퍼 함수들
function getRoleDisplayName(role: UserRole): string {
  const roleNames: { [key in UserRole]: string } = {
    SUPER_ADMIN: '슈퍼관리자',
    FINANCIAL_MANAGER: '재정관리자',
    MINISTER: '목회자',
    COMMITTEE_CHAIR: '위원장',
    DEPARTMENT_HEAD: '부서장',
    DEPARTMENT_ACCOUNTANT: '부서회계',
    BUDGET_MANAGER: '예산관리자',
    DEPARTMENT_BUDGET: '부서예산',
    GENERAL_USER: '일반사용자'
  }
  return roleNames[role]
}

function getRoleEmoji(role: string): string {
  const emojiMap: { [key: string]: string } = {
    SUPER_ADMIN: '👑',
    ADMIN: '👨‍💼',
    FINANCIAL_MANAGER: '💰',
    MINISTER: '⛪',
    COMMITTEE_CHAIR: '🏛️',
    DEPARTMENT_HEAD: '👥',
    DEPARTMENT_ACCOUNTANT: '📊',
    BUDGET_MANAGER: '📈',
    DEPARTMENT_BUDGET: '💳',
    GENERAL_USER: '👤'
  }
  return emojiMap[role] || '🔹'
}

function groupBy<T>(array: T[], key: keyof T): { [key: string]: T[] } {
  return array.reduce((result, item) => {
    const group = String(item[key])
    if (!result[group]) {
      result[group] = []
    }
    result[group].push(item)
    return result
  }, {} as { [key: string]: T[] })
}

createTestUsersByRole().catch(console.error)