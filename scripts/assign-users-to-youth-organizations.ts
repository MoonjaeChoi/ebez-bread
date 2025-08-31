import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function assignUsersToYouthOrganizations() {
  console.log('👥 Assigning test users to Youth Parish organizations...\n')

  try {
    // 1. 교회 ID 조회
    const church = await prisma.church.findFirst()
    if (!church) {
      throw new Error('No church found in database')
    }

    console.log(`Using church: ${church.name} (${church.id})`)

    // 2. 청년교구(PR-YT) 및 하위 조직들 조회
    const youthParish = await prisma.organization.findFirst({
      where: { 
        code: 'PR-YT',
        churchId: church.id 
      }
    })

    if (!youthParish) {
      throw new Error('Youth Parish (PR-YT) not found')
    }

    // 청년교구 하위 조직들 조회
    const youthOrganizations = await prisma.organization.findMany({
      where: {
        OR: [
          { id: youthParish.id }, // 청년교구 자체
          { parentId: youthParish.id }, // 직접 하위 조직
          { 
            parent: { 
              parentId: youthParish.id 
            }
          } // 2단계 하위 조직
        ]
      },
      orderBy: [
        { level: 'asc' },
        { sortOrder: 'asc' }
      ]
    })

    console.log(`\n📋 Found ${youthOrganizations.length} Youth Parish organizations:`)
    youthOrganizations.forEach((org, index) => {
      console.log(`${index + 1}. ${org.name} (${org.code}) - ${org.level}`)
    })

    // 3. 조직 역할 확인 및 생성
    const requiredRoles = [
      { name: '교구장', description: '교구장 역할', isLeadership: true },
      { name: '부장', description: '부장 역할', isLeadership: true },
      { name: '회계', description: '회계 역할', isLeadership: false }
    ]

    let organizationRoles = await prisma.organizationRole.findMany({
      where: {
        churchId: church.id,
        name: { in: requiredRoles.map(r => r.name) }
      }
    })

    // 필요한 역할이 없으면 생성
    for (const roleData of requiredRoles) {
      const existingRole = organizationRoles.find(r => r.name === roleData.name)
      if (!existingRole) {
        console.log(`Creating organization role: ${roleData.name}`)
        const newRole = await prisma.organizationRole.create({
          data: {
            name: roleData.name,
            description: roleData.description,
            isLeadership: roleData.isLeadership,
            churchId: church.id,
            isActive: true,
            level: roleData.isLeadership ? 1 : 0,
            sortOrder: organizationRoles.length + 1
          }
        })
        organizationRoles.push(newRole)
      }
    }

    const chairRole = organizationRoles.find(r => r.name === '교구장')
    const managerRole = organizationRoles.find(r => r.name === '부장')
    const accountantRole = organizationRoles.find(r => r.name === '회계')

    if (!chairRole || !managerRole || !accountantRole) {
      throw new Error('Required organization roles not found')
    }

    // 4. 권한별 사용자들 조회
    const committeeChairs = await prisma.user.findMany({
      where: {
        role: 'COMMITTEE_CHAIR',
        churchId: church.id,
        isActive: true
      },
      select: {
        id: true,
        name: true,
        email: true
      },
      take: 50
    })

    const departmentHeads = await prisma.user.findMany({
      where: {
        role: 'DEPARTMENT_HEAD',
        churchId: church.id,
        isActive: true
      },
      select: {
        id: true,
        name: true,
        email: true
      },
      take: 50
    })

    const departmentAccountants = await prisma.user.findMany({
      where: {
        role: 'DEPARTMENT_ACCOUNTANT',
        churchId: church.id,
        isActive: true
      },
      select: {
        id: true,
        name: true,
        email: true
      },
      take: 50
    })

    console.log(`\n👥 Available users:`)
    console.log(`🏛️ Committee Chairs: ${committeeChairs.length}명`)
    console.log(`👥 Department Heads: ${departmentHeads.length}명`)
    console.log(`📊 Department Accountants: ${departmentAccountants.length}명`)

    // 5. 기존 조직 멤버십 확인
    const existingMemberships = await prisma.organizationMembership.findMany({
      where: {
        organizationId: { in: youthOrganizations.map(org => org.id) }
      },
      select: {
        id: true,
        organizationId: true,
        memberId: true,
        roleId: true
      }
    })

    console.log(`\n🔍 Existing memberships: ${existingMemberships.length}개`)

    // 6. 사용자-멤버 매칭 함수
    const findMemberForUser = async (user: any) => {
      const member = await prisma.member.findFirst({
        where: {
          email: user.email,
          churchId: church.id
        },
        select: {
          id: true,
          name: true,
          email: true
        }
      })
      return member
    }

    // 7. 각 조직에 사용자 배정
    console.log('\n🏗️ Assigning users to organizations...')
    
    let chairIndex = 0
    let headIndex = 0  
    let accountantIndex = 0
    let totalAssigned = 0
    const assignments = []

    for (const org of youthOrganizations) {
      console.log(`\n📂 Processing ${org.name} (${org.code})...`)
      
      const orgExistingMemberships = existingMemberships.filter(m => m.organizationId === org.id)
      console.log(`   Existing memberships: ${orgExistingMemberships.length}개`)

      const orgAssignments = []

      // 교구장 배정 (3명)
      for (let i = 0; i < 3; i++) {
        if (chairIndex >= committeeChairs.length) {
          console.log(`   ⚠️ No more Committee Chairs available`)
          break
        }

        const user = committeeChairs[chairIndex]
        const member = await findMemberForUser(user)
        
        if (!member) {
          console.log(`   ⚠️ No member found for user ${user.name} (${user.email})`)
          chairIndex++
          continue
        }

        // 중복 체크
        const existingMembership = orgExistingMemberships.find(m => m.memberId === member.id)
        if (existingMembership) {
          console.log(`   ⚠️ ${member.name} already assigned to this organization`)
          chairIndex++
          continue
        }

        try {
          const membership = await prisma.organizationMembership.create({
            data: {
              organizationId: org.id,
              memberId: member.id,
              roleId: chairRole.id,
              isActive: true,
              isPrimary: i === 0,
              joinDate: new Date()
            },
            include: {
              member: {
                select: { name: true, email: true }
              },
              role: {
                select: { name: true }
              }
            }
          })

          orgAssignments.push(membership)
          console.log(`   ✅ 🏛️ ${chairRole.name}: ${member.name} (${member.email}) ${i === 0 ? '(주담당)' : ''}`)
          totalAssigned++
        } catch (error: any) {
          console.log(`   ❌ Error assigning ${member.name}: ${error.message}`)
        }

        chairIndex++
      }

      // 부장 배정 (3명)
      for (let i = 0; i < 3; i++) {
        if (headIndex >= departmentHeads.length) {
          console.log(`   ⚠️ No more Department Heads available`)
          break
        }

        const user = departmentHeads[headIndex]
        const member = await findMemberForUser(user)
        
        if (!member) {
          console.log(`   ⚠️ No member found for user ${user.name} (${user.email})`)
          headIndex++
          continue
        }

        // 중복 체크
        const existingMembership = orgExistingMemberships.find(m => m.memberId === member.id)
        if (existingMembership) {
          console.log(`   ⚠️ ${member.name} already assigned to this organization`)
          headIndex++
          continue
        }

        try {
          const membership = await prisma.organizationMembership.create({
            data: {
              organizationId: org.id,
              memberId: member.id,
              roleId: managerRole.id,
              isActive: true,
              isPrimary: i === 0,
              joinDate: new Date()
            },
            include: {
              member: {
                select: { name: true, email: true }
              },
              role: {
                select: { name: true }
              }
            }
          })

          orgAssignments.push(membership)
          console.log(`   ✅ 👥 ${managerRole.name}: ${member.name} (${member.email}) ${i === 0 ? '(주담당)' : ''}`)
          totalAssigned++
        } catch (error: any) {
          console.log(`   ❌ Error assigning ${member.name}: ${error.message}`)
        }

        headIndex++
      }

      // 회계 배정 (3명)
      for (let i = 0; i < 3; i++) {
        if (accountantIndex >= departmentAccountants.length) {
          console.log(`   ⚠️ No more Department Accountants available`)
          break
        }

        const user = departmentAccountants[accountantIndex]
        const member = await findMemberForUser(user)
        
        if (!member) {
          console.log(`   ⚠️ No member found for user ${user.name} (${user.email})`)
          accountantIndex++
          continue
        }

        // 중복 체크
        const existingMembership = orgExistingMemberships.find(m => m.memberId === member.id)
        if (existingMembership) {
          console.log(`   ⚠️ ${member.name} already assigned to this organization`)
          accountantIndex++
          continue
        }

        try {
          const membership = await prisma.organizationMembership.create({
            data: {
              organizationId: org.id,
              memberId: member.id,
              roleId: accountantRole.id,
              isActive: true,
              isPrimary: i === 0,
              joinDate: new Date()
            },
            include: {
              member: {
                select: { name: true, email: true }
              },
              role: {
                select: { name: true }
              }
            }
          })

          orgAssignments.push(membership)
          console.log(`   ✅ 📊 ${accountantRole.name}: ${member.name} (${member.email}) ${i === 0 ? '(주담당)' : ''}`)
          totalAssigned++
        } catch (error: any) {
          console.log(`   ❌ Error assigning ${member.name}: ${error.message}`)
        }

        accountantIndex++
      }

      assignments.push({
        organization: org,
        assignments: orgAssignments
      })
    }

    // 8. 배정 결과 요약
    console.log(`\n📊 Assignment Summary:`)
    console.log('====================')
    console.log(`Total organizations processed: ${youthOrganizations.length}개`)
    console.log(`Total users assigned: ${totalAssigned}명`)
    console.log(`Committee Chairs used: ${chairIndex}명`)
    console.log(`Department Heads used: ${headIndex}명`)
    console.log(`Department Accountants used: ${accountantIndex}명`)

    // 9. 조직별 배정 결과 상세
    console.log('\n📋 Detailed Assignment Results:')
    console.log('===============================')

    for (const assignment of assignments) {
      const org = assignment.organization
      const members = assignment.assignments
      
      if (members.length === 0) {
        console.log(`📂 ${org.name} (${org.code}): 배정된 사용자 없음`)
        continue
      }

      console.log(`\n📂 ${org.name} (${org.code}) - ${members.length}명 배정:`)
      
      const roleGroups = {
        교구장: members.filter(m => m.role?.name === '교구장'),
        부장: members.filter(m => m.role?.name === '부장'),
        회계: members.filter(m => m.role?.name === '회계')
      }

      Object.entries(roleGroups).forEach(([roleName, roleMembers]) => {
        if (roleMembers.length === 0) return
        
        const roleEmoji = roleName === '교구장' ? '🏛️' :
                         roleName === '부장' ? '👥' : '📊'
        
        console.log(`   ${roleEmoji} ${roleName}:`)
        roleMembers.forEach((member, index) => {
          const primaryFlag = member.isPrimary ? ' (주담당)' : ''
          console.log(`     ${index + 1}. ${member.member.name} (${member.member.email})${primaryFlag}`)
        })
      })
    }

    // 10. 전체 조직 멤버십 현황
    const totalMemberships = await prisma.organizationMembership.count({
      where: {
        organizationId: { in: youthOrganizations.map(org => org.id) }
      }
    })

    console.log(`\n📈 Total Youth Parish Memberships: ${totalMemberships}개`)

    // 11. Supabase 배포 확인 메시지
    console.log('\n🔗 Supabase Deployment Status:')
    console.log('=============================')
    console.log(`환경: ${process.env.NODE_ENV || 'development'}`)
    console.log(`데이터베이스 URL: ${process.env.DATABASE_URL ? '설정됨' : '미설정'}`)
    console.log(`Supabase 연결: ${process.env.DATABASE_URL?.includes('supabase') ? '✅ 온라인 배포됨' : '로컬'}`)
    
    if (process.env.DATABASE_URL?.includes('supabase')) {
      console.log('✅ All assignments have been deployed to Supabase!')
      console.log('🌐 Changes are now available in the production environment')
    }

    return {
      organizationsProcessed: youthOrganizations.length,
      totalAssigned,
      usersUsed: {
        committeeChairs: chairIndex,
        departmentHeads: headIndex,
        departmentAccountants: accountantIndex
      },
      totalMemberships,
      assignments: assignments.map(a => ({
        organizationName: a.organization.name,
        organizationCode: a.organization.code,
        assignedCount: a.assignments.length
      }))
    }

  } catch (error) {
    console.error('❌ Error assigning users to Youth Parish organizations:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

assignUsersToYouthOrganizations().catch(console.error)