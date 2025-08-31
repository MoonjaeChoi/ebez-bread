import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function assignMembersToYouthParishOrganizations() {
  console.log('👥 Assigning test users to Youth Parish (청년교구) organizations...\n')

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
      console.log('❌ Youth Parish (PR-YT) not found. Checking if it needs to be created...')
      
      // PR-YT가 없으면 먼저 청년교구 하위 조직들을 생성해야 함
      console.log('💡 Please run the youth parish sub-organizations insert script first')
      return
    }

    console.log(`✅ Found Youth Parish: ${youthParish.name} (${youthParish.code})`)

    // 청년교구 하위 조직들 조회 (모든 레벨 포함)
    const youthOrganizations = await prisma.organization.findMany({
      where: {
        OR: [
          { id: youthParish.id }, // 청년교구 자체
          { parentId: youthParish.id }, // 직접 하위 조직
          { 
            parent: { 
              parentId: youthParish.id 
            }
          }, // 2단계 하위 조직
          {
            parent: {
              parent: {
                parentId: youthParish.id
              }
            }
          } // 3단계 하위 조직
        ]
      },
      include: {
        parent: {
          select: { name: true, code: true }
        }
      },
      orderBy: [
        { level: 'asc' },
        { sortOrder: 'asc' }
      ]
    })

    console.log(`\n📋 Found ${youthOrganizations.length} Youth Parish organizations:`)
    youthOrganizations.forEach((org, index) => {
      const levelEmoji = org.level === 'LEVEL_1' ? '📁' : 
                        org.level === 'LEVEL_2' ? '📂' : 
                        org.level === 'LEVEL_3' ? '📄' : '📝'
      const parentInfo = org.parent ? ` ← ${org.parent.name}` : ''
      console.log(`${index + 1}. ${levelEmoji} ${org.name} (${org.code}) - ${org.level}${parentInfo}`)
    })

    // 3. 조직 역할 확인 (없으면 생성)
    const organizationRoles = await prisma.organizationRole.findMany({
      where: {
        churchId: church.id
      }
    })

    console.log(`\n🏷️ Available organization roles: ${organizationRoles.length}개`)

    // 필요한 역할들이 없으면 생성
    const requiredRoles = [
      { name: '교구장', description: '교구장 역할', isLeadership: true },
      { name: '부장', description: '부장 역할', isLeadership: true },
      { name: '회계', description: '회계 역할', isLeadership: false }
    ]

    for (const roleData of requiredRoles) {
      const existingRole = organizationRoles.find(r => r.name === roleData.name)
      if (!existingRole) {
        console.log(`Creating role: ${roleData.name}`)
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
    const committeeChairUsers = await prisma.user.findMany({
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

    const departmentHeadUsers = await prisma.user.findMany({
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

    const departmentAccountantUsers = await prisma.user.findMany({
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

    console.log(`\n👥 Available users by role:`)
    console.log(`🏛️ Committee Chair users: ${committeeChairUsers.length}명`)
    console.log(`👥 Department Head users: ${departmentHeadUsers.length}명`)
    console.log(`📊 Department Accountant users: ${departmentAccountantUsers.length}명`)

    // 5. 사용자들의 이메일로 Member 찾기 또는 일반 멤버 사용
    const findMembersForUsers = async (users: any[]) => {
      const members = []
      for (const user of users) {
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
        if (member) {
          members.push({ ...member, userId: user.id, userRole: user.role })
        }
      }
      return members
    }

    let chairMembers = await findMembersForUsers(committeeChairUsers)
    let managerMembers = await findMembersForUsers(departmentHeadUsers)
    let accountantMembers = await findMembersForUsers(departmentAccountantUsers)

    console.log(`\n👥 Found corresponding members:`)
    console.log(`🏛️ Chair members: ${chairMembers.length}명`)
    console.log(`👥 Manager members: ${managerMembers.length}명`)
    console.log(`📊 Accountant members: ${accountantMembers.length}명`)

    // 6. 부족한 경우 일반 멤버들로 보충
    if (chairMembers.length < 30 || managerMembers.length < 30 || accountantMembers.length < 30) {
      console.log('\n📝 Getting additional members from general member pool...')
      
      const additionalMembers = await prisma.member.findMany({
        where: {
          churchId: church.id,
          email: { not: null }
        },
        select: {
          id: true,
          name: true,
          email: true
        },
        take: 100,
        orderBy: { name: 'asc' }
      })

      console.log(`Found ${additionalMembers.length} additional members`)
      
      // 기존 멤버 ID 셋 생성
      const existingMemberIds = new Set([
        ...chairMembers.map(m => m.id),
        ...managerMembers.map(m => m.id),
        ...accountantMembers.map(m => m.id)
      ])

      // 부족한 만큼 추가 (중복 제거)
      const availableAdditionalMembers = additionalMembers.filter(m => !existingMemberIds.has(m.id))
      
      while (chairMembers.length < 30 && availableAdditionalMembers.length > 0) {
        const member = availableAdditionalMembers.shift()
        if (member) {
          chairMembers.push({ ...member, userId: null, userRole: 'COMMITTEE_CHAIR' })
          existingMemberIds.add(member.id)
        }
      }

      while (managerMembers.length < 30 && availableAdditionalMembers.length > 0) {
        const member = availableAdditionalMembers.shift()
        if (member) {
          managerMembers.push({ ...member, userId: null, userRole: 'DEPARTMENT_HEAD' })
          existingMemberIds.add(member.id)
        }
      }

      while (accountantMembers.length < 30 && availableAdditionalMembers.length > 0) {
        const member = availableAdditionalMembers.shift()
        if (member) {
          accountantMembers.push({ ...member, userId: null, userRole: 'DEPARTMENT_ACCOUNTANT' })
          existingMemberIds.add(member.id)
        }
      }

      console.log(`\n👥 Updated member counts:`)
      console.log(`🏛️ Chair members: ${chairMembers.length}명`)
      console.log(`👥 Manager members: ${managerMembers.length}명`)
      console.log(`📊 Accountant members: ${accountantMembers.length}명`)
    }

    // 7. 기존 멤버십 확인
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

    // 8. 각 조직에 멤버 배정
    console.log('\n🏗️ Assigning members to Youth Parish organizations...')
    
    let chairIndex = 0
    let managerIndex = 0
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
        if (chairIndex >= chairMembers.length) {
          console.log(`   ⚠️ No more chair members available`)
          break
        }

        const member = chairMembers[chairIndex]

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
              isPrimary: i === 0, // 첫 번째를 주 담당자로
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
        if (managerIndex >= managerMembers.length) {
          console.log(`   ⚠️ No more manager members available`)
          break
        }

        const member = managerMembers[managerIndex]

        // 중복 체크
        const existingMembership = orgExistingMemberships.find(m => m.memberId === member.id)
        if (existingMembership) {
          console.log(`   ⚠️ ${member.name} already assigned to this organization`)
          managerIndex++
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

        managerIndex++
      }

      // 회계 배정 (3명)
      for (let i = 0; i < 3; i++) {
        if (accountantIndex >= accountantMembers.length) {
          console.log(`   ⚠️ No more accountant members available`)
          break
        }

        const member = accountantMembers[accountantIndex]

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

    // 9. 배정 결과 요약
    console.log(`\n📊 Youth Parish Assignment Summary:`)
    console.log('==================================')
    console.log(`Total organizations processed: ${youthOrganizations.length}개`)
    console.log(`Total members assigned: ${totalAssigned}명`)
    console.log(`Chair members used: ${chairIndex}명`)
    console.log(`Manager members used: ${managerIndex}명`)
    console.log(`Accountant members used: ${accountantIndex}명`)

    // 10. 조직별 배정 결과 상세
    console.log('\n📋 Detailed Assignment Results:')
    console.log('===============================')

    for (const assignment of assignments) {
      const org = assignment.organization
      const members = assignment.assignments
      
      if (members.length === 0) {
        console.log(`📂 ${org.name} (${org.code}): 배정된 멤버 없음`)
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

    // 11. 전체 청년교구 멤버십 현황
    const totalMemberships = await prisma.organizationMembership.count({
      where: {
        organizationId: { in: youthOrganizations.map(org => org.id) }
      }
    })

    console.log(`\n📈 Total Youth Parish Memberships: ${totalMemberships}개`)

    // 12. Supabase 배포 확인 메시지
    console.log('\n🔗 Supabase Deployment Status:')
    console.log('=============================')
    console.log(`환경: ${process.env.NODE_ENV || 'development'}`)
    console.log(`데이터베이스 URL: ${process.env.DATABASE_URL ? '설정됨' : '미설정'}`)
    console.log(`Supabase 연결: ${process.env.DATABASE_URL?.includes('supabase') ? '✅ 온라인 배포됨' : '로컬'}`)
    
    if (process.env.DATABASE_URL?.includes('supabase')) {
      console.log('✅ All Youth Parish member assignments have been deployed to Supabase!')
      console.log('🌐 Changes are now available in the production environment')
    }

    return {
      organizationsProcessed: youthOrganizations.length,
      totalAssigned,
      membersUsed: {
        chairs: chairIndex,
        managers: managerIndex,
        accountants: accountantIndex
      },
      totalMemberships,
      assignments: assignments.map(a => ({
        organizationName: a.organization.name,
        organizationCode: a.organization.code,
        assignedCount: a.assignments.length
      }))
    }

  } catch (error) {
    console.error('❌ Error assigning members to Youth Parish organizations:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

assignMembersToYouthParishOrganizations().catch(console.error)