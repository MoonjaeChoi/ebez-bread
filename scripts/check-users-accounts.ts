import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkUsersAccounts() {
  console.log('👥 Checking users table for available accounts...\n')

  try {
    // 1. users 테이블의 모든 계정 조회
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        church: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log(`🔐 총 등록된 사용자 계정 수: ${allUsers.length}개\n`)

    if (allUsers.length === 0) {
      console.log('❌ users 테이블에 등록된 계정이 없습니다.')
      console.log('💡 새로운 사용자 계정을 생성해야 합니다.')
      return
    }

    // 2. 활성화된 계정들
    const activeUsers = allUsers.filter(user => user.isActive)
    console.log(`✅ 활성화된 계정 수: ${activeUsers.length}개`)
    console.log(`❌ 비활성화된 계정 수: ${allUsers.length - activeUsers.length}개\n`)

    // 3. 계정별 상세 정보
    console.log('📋 등록된 사용자 계정 목록:')
    console.log('========================')

    allUsers.forEach((user, index) => {
      const statusIcon = user.isActive ? '✅' : '❌'
      const roleEmoji = user.role === 'SUPER_ADMIN' ? '👑' :
                       user.role === 'FINANCIAL_MANAGER' ? '💰' :
                       user.role === 'MINISTER' ? '⛪' :
                       user.role === 'COMMITTEE_CHAIR' ? '👨‍💼' :
                       user.role === 'DEPARTMENT_HEAD' ? '👨‍💻' :
                       user.role === 'DEPARTMENT_ACCOUNTANT' ? '📊' :
                       user.role === 'BUDGET_MANAGER' ? '💼' :
                       user.role === 'GENERAL_USER' ? '👤' : '🔹'

      console.log(`${index + 1}. ${statusIcon} ${user.name} (${user.email})`)
      console.log(`   역할: ${roleEmoji} ${user.role}`)
      console.log(`   교회: ${user.church.name}`)
      console.log(`   생성일: ${user.createdAt.toISOString()}`)
      console.log(`   ID: ${user.id}`)
      console.log('')
    })

    // 4. 역할별 분포
    console.log('👤 역할별 계정 분포:')
    console.log('==================')
    
    const roleDistribution: { [key: string]: number } = {}
    allUsers.forEach(user => {
      roleDistribution[user.role] = (roleDistribution[user.role] || 0) + 1
    })

    Object.entries(roleDistribution).forEach(([role, count]) => {
      const roleEmoji = role === 'SUPER_ADMIN' ? '👑' :
                       role === 'ADMIN' ? '👨‍💼' :
                       role === 'MANAGER' ? '👨‍💻' :
                       role === 'STAFF' ? '👨‍🔧' :
                       role === 'LEADER' ? '👥' :
                       role === 'MEMBER' ? '👤' : '🔹'
      
      console.log(`${roleEmoji} ${role}: ${count}개`)
    })

    // 5. 로그인 테스트용 계정 정보
    console.log('\n🔐 로그인 테스트용 계정:')
    console.log('======================')
    console.log('⚠️  주의: 실제 비밀번호는 별도 확인 필요')
    
    activeUsers.slice(0, 5).forEach((user, index) => {
      console.log(`${index + 1}. 이메일: ${user.email}`)
      console.log(`   이름: ${user.name}`)
      console.log(`   역할: ${user.role}`)
      console.log(`   상태: ${user.isActive ? '활성' : '비활성'}`)
      console.log('')
    })

    // 6. members와 users 연결 상태 확인
    console.log('🔗 Members-Users 연결 상태:')
    console.log('==========================')
    
    const usersWithMemberConnection = await Promise.all(
      allUsers.map(async (user) => {
        const member = await prisma.member.findFirst({
          where: {
            email: user.email,
            churchId: user.church.id
          },
          select: {
            id: true,
            name: true,
            email: true
          }
        })
        
        return {
          user,
          member,
          hasConnection: !!member
        }
      })
    )

    const connectedUsers = usersWithMemberConnection.filter(item => item.hasConnection)
    const unconnectedUsers = usersWithMemberConnection.filter(item => !item.hasConnection)

    console.log(`✅ Members 테이블과 연결된 계정: ${connectedUsers.length}개`)
    console.log(`❌ Members 테이블과 연결되지 않은 계정: ${unconnectedUsers.length}개`)

    if (unconnectedUsers.length > 0) {
      console.log('\n📋 Members 테이블과 연결되지 않은 계정들:')
      unconnectedUsers.forEach((item, index) => {
        console.log(`${index + 1}. ${item.user.name} (${item.user.email})`)
      })
    }

    // 7. 기본 테스트 계정 확인
    console.log('\n🧪 기본 테스트 계정 확인:')
    console.log('========================')
    
    const testAccount = await prisma.user.findFirst({
      where: {
        email: 'admin@gcchurch.kr'
      }
    })

    if (testAccount) {
      console.log('✅ 기본 테스트 계정 존재: admin@gcchurch.kr')
      console.log(`   이름: ${testAccount.name}`)
      console.log(`   역할: ${testAccount.role}`)
      console.log(`   활성상태: ${testAccount.isActive ? '활성' : '비활성'}`)
      console.log('💡 이 계정으로 로그인 테스트 가능 (비밀번호: password)')
    } else {
      console.log('❌ 기본 테스트 계정 없음')
    }

    return {
      totalUsers: allUsers.length,
      activeUsers: activeUsers.length,
      roleDistribution,
      connectedToMembers: connectedUsers.length,
      hasTestAccount: !!testAccount
    }

  } catch (error) {
    console.error('❌ Error checking users accounts:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

checkUsersAccounts().catch(console.error)