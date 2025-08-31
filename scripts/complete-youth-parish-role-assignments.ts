import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function completeYouthParishRoleAssignments() {
  console.log('👥 Completing Youth Parish role assignments (adding managers & accountants)...\n')

  try {
    // 1. 교회 ID 조회
    const church = await prisma.church.findFirst()
    if (!church) {
      throw new Error('No church found in database')
    }

    console.log(`Using church: ${church.name} (${church.id})`)

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

    console.log(`Found ${youthOrganizations.length} Youth Parish organizations`)

    // 3. 조직 역할 조회
    const organizationRoles = await prisma.organizationRole.findMany({
      where: {
        churchId: church.id
      }
    })

    const managerRole = organizationRoles.find(r => r.name === '부장')
    const accountantRole = organizationRoles.find(r => r.name === '회계')

    if (!managerRole || !accountantRole) {
      throw new Error('Required organization roles (부장, 회계) not found')
    }

    // 4. 부장과 회계를 위한 추가 멤버들 조회
    const availableMembers = await prisma.member.findMany({
      where: {
        churchId: church.id,
        email: { not: null }
      },
      select: {
        id: true,
        name: true,
        email: true
      },
      orderBy: { name: 'asc' }
    })

    console.log(`Available members for assignment: ${availableMembers.length}명`)

    // 5. 기존 멤버십 확인
    const existingMemberships = await prisma.organizationMembership.findMany({
      where: {
        organizationId: { in: youthOrganizations.map(org => org.id) }
      },
      select: {
        organizationId: true,
        memberId: true,
        roleId: true
      }
    })

    console.log(`Existing memberships: ${existingMemberships.length}개`)

    // 6. 각 조직에 부족한 역할 보충
    let totalAdded = 0
    let memberIndex = 0

    console.log('\n🏗️ Adding missing managers and accountants...')

    for (const org of youthOrganizations) {
      console.log(`\n📂 Processing ${org.name} (${org.code})...`)

      const orgMemberships = existingMemberships.filter(m => m.organizationId === org.id)
      const managerCount = orgMemberships.filter(m => m.roleId === managerRole.id).length
      const accountantCount = orgMemberships.filter(m => m.roleId === accountantRole.id).length

      console.log(`   Current: Managers=${managerCount}, Accountants=${accountantCount}`)

      // 부장 3명 추가 (현재 0명이므로)
      const managersNeeded = 3 - managerCount
      for (let i = 0; i < managersNeeded; i++) {
        if (memberIndex >= availableMembers.length) {
          console.log(`   ⚠️ No more available members`)
          break
        }

        const member = availableMembers[memberIndex]

        // 중복 체크
        const existingMembership = orgMemberships.find(m => m.memberId === member.id)
        if (existingMembership) {
          memberIndex++
          i-- // 다시 시도
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
            }
          })

          console.log(`   ✅ 👥 부장 추가: ${member.name} (${member.email}) ${i === 0 ? '(주담당)' : ''}`)
          totalAdded++
        } catch (error: any) {
          if (error.code === 'P2002') {
            console.log(`   ⚠️ ${member.name} already has membership in this organization`)
          } else {
            console.log(`   ❌ Error adding ${member.name}: ${error.message}`)
          }
        }

        memberIndex++
      }

      // 회계 3명 추가 (현재 0명이므로)
      const accountantsNeeded = 3 - accountantCount
      for (let i = 0; i < accountantsNeeded; i++) {
        if (memberIndex >= availableMembers.length) {
          console.log(`   ⚠️ No more available members`)
          break
        }

        const member = availableMembers[memberIndex]

        // 중복 체크
        const existingMembership = orgMemberships.find(m => m.memberId === member.id)
        if (existingMembership) {
          memberIndex++
          i-- // 다시 시도
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
            }
          })

          console.log(`   ✅ 📊 회계 추가: ${member.name} (${member.email}) ${i === 0 ? '(주담당)' : ''}`)
          totalAdded++
        } catch (error: any) {
          if (error.code === 'P2002') {
            console.log(`   ⚠️ ${member.name} already has membership in this organization`)
          } else {
            console.log(`   ❌ Error adding ${member.name}: ${error.message}`)
          }
        }

        memberIndex++
      }
    }

    // 7. 최종 결과 확인
    const finalMemberships = await prisma.organizationMembership.count({
      where: {
        organizationId: { in: youthOrganizations.map(org => org.id) }
      }
    })

    // 8. 역할별 멤버십 통계
    const roleStats = await Promise.all([
      prisma.organizationMembership.count({
        where: {
          organizationId: { in: youthOrganizations.map(org => org.id) },
          role: { name: '교구장' }
        }
      }),
      prisma.organizationMembership.count({
        where: {
          organizationId: { in: youthOrganizations.map(org => org.id) },
          role: { name: '부장' }
        }
      }),
      prisma.organizationMembership.count({
        where: {
          organizationId: { in: youthOrganizations.map(org => org.id) },
          role: { name: '회계' }
        }
      })
    ])

    console.log(`\n📊 Role Assignment Completion Summary:`)
    console.log('=====================================')
    console.log(`Organizations processed: ${youthOrganizations.length}개`)
    console.log(`Total new assignments added: ${totalAdded}명`)
    console.log(`Total Youth Parish memberships: ${finalMemberships}개`)
    console.log('')
    console.log(`Role distribution:`)
    console.log(`🏛️ 교구장: ${roleStats[0]}명`)
    console.log(`👥 부장: ${roleStats[1]}명`)
    console.log(`📊 회계: ${roleStats[2]}명`)

    // 9. 각 조직별 완전한 멤버십 현황
    console.log('\n📋 Complete Organization Memberships:')
    console.log('====================================')

    for (const org of youthOrganizations) {
      const orgMemberships = await prisma.organizationMembership.findMany({
        where: {
          organizationId: org.id
        },
        include: {
          member: {
            select: { name: true, email: true }
          },
          role: {
            select: { name: true }
          }
        },
        orderBy: [
          { role: { name: 'asc' } },
          { isPrimary: 'desc' }
        ]
      })

      console.log(`\n📂 ${org.name} (${org.code}) - ${orgMemberships.length}명:`)

      const roleGroups = {
        교구장: orgMemberships.filter(m => m.role?.name === '교구장'),
        부장: orgMemberships.filter(m => m.role?.name === '부장'),
        회계: orgMemberships.filter(m => m.role?.name === '회계')
      }

      Object.entries(roleGroups).forEach(([roleName, roleMembers]) => {
        if (roleMembers.length === 0) return
        
        const roleEmoji = roleName === '교구장' ? '🏛️' :
                         roleName === '부장' ? '👥' : '📊'
        
        console.log(`   ${roleEmoji} ${roleName} (${roleMembers.length}명):`)
        roleMembers.forEach((member, index) => {
          const primaryFlag = member.isPrimary ? ' (주담당)' : ''
          console.log(`     ${index + 1}. ${member.member.name} (${member.member.email})${primaryFlag}`)
        })
      })
    }

    // 10. Supabase 배포 확인
    console.log('\n🔗 Supabase Deployment Status:')
    console.log('=============================')
    console.log(`Supabase 연결: ${process.env.DATABASE_URL?.includes('supabase') ? '✅ 온라인 배포됨' : '로컬'}`)
    
    if (process.env.DATABASE_URL?.includes('supabase')) {
      console.log('✅ All completed role assignments have been deployed to Supabase!')
      console.log('🌐 Youth Parish is now fully staffed with all required roles')
    }

    return {
      organizationsProcessed: youthOrganizations.length,
      newAssignmentsAdded: totalAdded,
      totalMemberships: finalMemberships,
      roleDistribution: {
        chairs: roleStats[0],
        managers: roleStats[1],
        accountants: roleStats[2]
      }
    }

  } catch (error) {
    console.error('❌ Error completing Youth Parish role assignments:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

completeYouthParishRoleAssignments().catch(console.error)