import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkYouthParishAccountants() {
  console.log('📊 Checking Youth Parish accountant assignments...\n')

  try {
    // 1. 교회 ID 조회
    const church = await prisma.church.findFirst()
    if (!church) {
      throw new Error('No church found in database')
    }

    // 2. 청년교구 조직들 조회
    const youthParish = await prisma.organization.findFirst({
      where: { 
        code: 'PR-YT',
        churchId: church.id 
      }
    })

    if (!youthParish) {
      throw new Error('Youth Parish (PR-YT) not found')
    }

    const youthOrganizations = await prisma.organization.findMany({
      where: {
        OR: [
          { id: youthParish.id },
          { parentId: youthParish.id },
          { parent: { parentId: youthParish.id } }
        ]
      },
      orderBy: [
        { level: 'asc' },
        { sortOrder: 'asc' }
      ]
    })

    // 3. 회계 역할 조회
    const accountantRole = await prisma.organizationRole.findFirst({
      where: {
        name: '회계',
        churchId: church.id
      }
    })

    if (!accountantRole) {
      console.log('❌ 회계 역할을 찾을 수 없습니다.')
      return
    }

    console.log(`✅ Found accountant role: ${accountantRole.name} (${accountantRole.id})`)

    // 4. 청년교구의 모든 회계 담당자들 조회
    const accountantMemberships = await prisma.organizationMembership.findMany({
      where: {
        organizationId: { in: youthOrganizations.map(org => org.id) },
        roleId: accountantRole.id,
        isActive: true
      },
      include: {
        member: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        organization: {
          select: {
            id: true,
            name: true,
            code: true
          }
        }
      },
      orderBy: [
        { organization: { sortOrder: 'asc' } },
        { isPrimary: 'desc' },
        { joinDate: 'asc' }
      ]
    })

    console.log(`\n📊 청년교구 부서회계 계정 목록 (총 ${accountantMemberships.length}명):`)
    console.log('='.repeat(60))

    if (accountantMemberships.length === 0) {
      console.log('❌ 청년교구에 배정된 부서회계가 없습니다.')
      return
    }

    // 5. 조직별로 그룹화하여 표시
    const membershipsByOrg = youthOrganizations.map(org => ({
      organization: org,
      accountants: accountantMemberships.filter(m => m.organizationId === org.id)
    })).filter(item => item.accountants.length > 0)

    membershipsByOrg.forEach((item, index) => {
      const org = item.organization
      const accountants = item.accountants

      console.log(`\n${index + 1}. 📂 ${org.name} (${org.code}) - ${accountants.length}명:`)
      
      accountants.forEach((membership, accountantIndex) => {
        const member = membership.member
        const primaryFlag = membership.isPrimary ? ' 👑 주담당' : ''
        const joinDate = membership.joinDate.toISOString().split('T')[0]
        
        console.log(`   ${accountantIndex + 1}. 📊 ${member.name}${primaryFlag}`)
        console.log(`      이메일: ${member.email}`)
        console.log(`      전화번호: ${member.phone || 'N/A'}`)
        console.log(`      배정일: ${joinDate}`)
        console.log(`      멤버 ID: ${member.id}`)
        console.log('')
      })
    })

    // 6. 회계 계정들의 로그인 가능 여부 확인
    console.log('\n🔐 부서회계 계정의 로그인 가능 여부:')
    console.log('='.repeat(40))

    const accountantEmails = accountantMemberships.map(m => m.member.email).filter((email): email is string => email !== null)
    
    if (accountantEmails.length === 0) {
      console.log('❌ 이메일이 등록된 부서회계가 없습니다.')
      return
    }

    const userAccounts = await prisma.user.findMany({
      where: {
        email: { in: accountantEmails },
        churchId: church.id,
        isActive: true
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      }
    })

    console.log(`이메일 보유 부서회계: ${accountantEmails.length}명`)
    console.log(`로그인 가능한 계정: ${userAccounts.length}명`)

    if (userAccounts.length > 0) {
      console.log('\n✅ 로그인 가능한 부서회계 계정들:')
      userAccounts.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name} (${user.email})`)
        console.log(`   권한: ${user.role}`)
        console.log(`   계정 생성일: ${user.createdAt.toISOString().split('T')[0]}`)
        console.log('')
      })
    }

    const accountantsWithoutLogin = accountantEmails.filter(email => 
      !userAccounts.some(user => user.email === email)
    )

    if (accountantsWithoutLogin.length > 0) {
      console.log('\n⚠️ 로그인 계정이 없는 부서회계들:')
      accountantsWithoutLogin.forEach((email, index) => {
        const membership = accountantMemberships.find(m => m.member.email === email)
        if (membership) {
          console.log(`${index + 1}. ${membership.member.name} (${email})`)
          console.log(`   소속: ${membership.organization.name}`)
        }
      })
    }

    // 7. 부서회계 권한을 가진 실제 사용자 계정들 조회
    console.log('\n👥 DEPARTMENT_ACCOUNTANT 권한 사용자들:')
    console.log('='.repeat(40))

    const departmentAccountantUsers = await prisma.user.findMany({
      where: {
        role: 'DEPARTMENT_ACCOUNTANT',
        churchId: church.id,
        isActive: true
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true
      },
      orderBy: { name: 'asc' }
    })

    if (departmentAccountantUsers.length > 0) {
      console.log(`총 ${departmentAccountantUsers.length}명의 DEPARTMENT_ACCOUNTANT 권한 사용자:`)
      departmentAccountantUsers.forEach((user, index) => {
        const hasYouthAssignment = accountantMemberships.some(m => m.member.email === user.email)
        const assignmentFlag = hasYouthAssignment ? ' 🏛️ 청년교구 배정됨' : ''
        
        console.log(`${index + 1}. ${user.name} (${user.email})${assignmentFlag}`)
        console.log(`   생성일: ${user.createdAt.toISOString().split('T')[0]}`)
        console.log('')
      })
    } else {
      console.log('❌ DEPARTMENT_ACCOUNTANT 권한 사용자가 없습니다.')
    }

    return {
      totalAccountants: accountantMemberships.length,
      organizationsWithAccountants: membershipsByOrg.length,
      accountantsWithEmail: accountantEmails.length,
      accountantsWithLogin: userAccounts.length,
      departmentAccountantUsers: departmentAccountantUsers.length
    }

  } catch (error) {
    console.error('❌ Error checking Youth Parish accountants:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

checkYouthParishAccountants().catch(console.error)