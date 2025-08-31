import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkMemberLoginCapability() {
  console.log('🔐 Checking member login capability...\n')

  try {
    // 1. 전체 멤버 수 조회
    const totalMembers = await prisma.member.count()
    console.log(`👥 총 등록된 멤버 수: ${totalMembers}명`)

    // 2. 이메일이 있는 멤버들 조회
    const membersWithEmail = await prisma.member.findMany({
      where: {
        email: {
          not: null
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        church: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    console.log(`📧 이메일이 등록된 멤버 수: ${membersWithEmail.length}명\n`)

    // 3. users 테이블과 비교하여 로그인 계정이 있는 멤버들 확인
    console.log('🔍 멤버별 로그인 계정 현황:')
    console.log('================================')

    let loginCapableCount = 0
    let noLoginAccountCount = 0
    const loginResults = []

    for (const member of membersWithEmail) {
      // 해당 이메일로 users 테이블에 계정이 있는지 확인
      const userAccount = await prisma.user.findFirst({
        where: {
          email: member.email!,
          churchId: member.church.id
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true
        }
      })

      const result = {
        member,
        userAccount,
        canLogin: !!userAccount && userAccount.isActive
      }

      loginResults.push(result)

      if (result.canLogin) {
        loginCapableCount++
        console.log(`✅ ${member.name} (${member.email})`)
        console.log(`   User Account: ${userAccount!.name} - ${userAccount!.role}`)
        console.log(`   Active: ${userAccount!.isActive ? 'Yes' : 'No'}`)
        console.log(`   Created: ${userAccount!.createdAt.toISOString()}`)
      } else {
        noLoginAccountCount++
        console.log(`❌ ${member.name} (${member.email})`)
        console.log(`   User Account: 없음`)
      }
      console.log('')
    }

    // 4. 통계 요약
    console.log('📊 로그인 계정 현황 요약:')
    console.log('=======================')
    console.log(`총 멤버 수: ${totalMembers}명`)
    console.log(`이메일 보유 멤버: ${membersWithEmail.length}명`)
    console.log(`로그인 가능 멤버: ${loginCapableCount}명 ✅`)
    console.log(`로그인 불가 멤버: ${noLoginAccountCount}명 ❌`)

    const loginPercentage = membersWithEmail.length > 0 ? 
      ((loginCapableCount / membersWithEmail.length) * 100).toFixed(1) : '0'
    
    console.log(`로그인 가능 비율: ${loginPercentage}%`)

    // 5. 로그인 가능한 사용자들의 역할별 분포
    console.log('\n👤 로그인 가능 사용자 역할별 분포:')
    console.log('=================================')
    
    const roleDistribution: { [key: string]: number } = {}
    loginResults.filter(r => r.canLogin).forEach(result => {
      const role = result.userAccount!.role
      roleDistribution[role] = (roleDistribution[role] || 0) + 1
    })

    Object.entries(roleDistribution).forEach(([role, count]) => {
      const roleEmoji = role === 'SUPER_ADMIN' ? '👑' :
                       role === 'ADMIN' ? '👨‍💼' :
                       role === 'MANAGER' ? '👨‍💻' :
                       role === 'STAFF' ? '👨‍🔧' :
                       role === 'LEADER' ? '👥' :
                       role === 'MEMBER' ? '👤' : '🔹'
      
      console.log(`${roleEmoji} ${role}: ${count}명`)
    })

    // 6. 이메일은 있지만 로그인 계정이 없는 멤버들
    const membersWithoutLogin = loginResults.filter(r => !r.canLogin)
    
    if (membersWithoutLogin.length > 0) {
      console.log('\n⚠️  로그인 계정이 없는 멤버들 (이메일 보유):')
      console.log('============================================')
      
      membersWithoutLogin.slice(0, 10).forEach((result, index) => {
        console.log(`${index + 1}. ${result.member.name} (${result.member.email})`)
        console.log(`   전화번호: ${result.member.phone || 'N/A'}`)
        console.log(`   교회: ${result.member.church.name}`)
      })

      if (membersWithoutLogin.length > 10) {
        console.log(`   ... 그외 ${membersWithoutLogin.length - 10}명 더`)
      }
    }

    // 7. 실제 로그인 테스트 안내
    console.log('\n🔐 로그인 테스트 방법:')
    console.log('=====================')
    console.log('1. 개발 서버 실행: npm run dev')
    console.log('2. 브라우저에서 http://localhost:3000 접속')
    console.log('3. 아래 계정들로 로그인 테스트 가능:')
    
    const testAccounts = loginResults.filter(r => r.canLogin).slice(0, 3)
    testAccounts.forEach((result, index) => {
      console.log(`   ${index + 1}. ${result.userAccount!.email}`)
      console.log(`      이름: ${result.userAccount!.name}`)
      console.log(`      역할: ${result.userAccount!.role}`)
    })

    // 8. 데이터베이스 연결 정보
    console.log('\n🔗 데이터베이스 연결 정보:')
    console.log('=========================')
    console.log(`환경: ${process.env.NODE_ENV || 'development'}`)
    console.log(`데이터베이스 URL: ${process.env.DATABASE_URL ? '설정됨' : '미설정'}`)
    console.log(`Supabase 연결: ${process.env.DATABASE_URL?.includes('supabase') ? '✅ 온라인' : '로컬'}`)

    return {
      totalMembers,
      membersWithEmail: membersWithEmail.length,
      loginCapableCount,
      noLoginAccountCount,
      loginPercentage: parseFloat(loginPercentage),
      roleDistribution,
      membersWithoutLogin: membersWithoutLogin.length,
      testAccounts: testAccounts.map(r => ({
        email: r.userAccount!.email,
        name: r.userAccount!.name,
        role: r.userAccount!.role
      }))
    }

  } catch (error) {
    console.error('❌ Error checking member login capability:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

checkMemberLoginCapability().catch(console.error)