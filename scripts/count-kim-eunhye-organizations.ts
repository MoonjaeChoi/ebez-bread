import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function countKimEunhyeOrganizations() {
  console.log('📊 Counting organizations created by 김은혜...\n')

  try {
    // 1. 김은혜 사용자 조회
    const kimEunhyeUser = await prisma.user.findFirst({
      where: { 
        name: '김은혜'
      },
      select: {
        id: true,
        name: true,
        email: true,
        churchId: true,
        createdAt: true
      }
    })

    if (!kimEunhyeUser) {
      console.log('❌ 김은혜 사용자를 찾을 수 없습니다.')
      return
    }

    console.log('👤 사용자 정보:')
    console.log(`   이름: ${kimEunhyeUser.name}`)
    console.log(`   ID: ${kimEunhyeUser.id}`)
    console.log(`   이메일: ${kimEunhyeUser.email || 'N/A'}`)
    console.log(`   교회 ID: ${kimEunhyeUser.churchId}`)
    console.log(`   가입일: ${kimEunhyeUser.createdAt.toISOString()}`)

    // 2. 김은혜가 생성한 전체 조직 수 조회
    const totalCount = await prisma.organization.count({
      where: {
        createdById: kimEunhyeUser.id
      }
    })

    console.log(`\n🏛️ 김은혜가 생성한 총 조직 수: ${totalCount}개`)

    // 3. 레벨별 조직 수 조회
    const levelCounts = await Promise.all([
      prisma.organization.count({
        where: {
          createdById: kimEunhyeUser.id,
          level: 'LEVEL_1'
        }
      }),
      prisma.organization.count({
        where: {
          createdById: kimEunhyeUser.id,
          level: 'LEVEL_2'
        }
      }),
      prisma.organization.count({
        where: {
          createdById: kimEunhyeUser.id,
          level: 'LEVEL_3'
        }
      }),
      prisma.organization.count({
        where: {
          createdById: kimEunhyeUser.id,
          level: 'LEVEL_4'
        }
      })
    ])

    console.log('\n📋 레벨별 조직 수:')
    console.log(`   LEVEL_1 (위원회): ${levelCounts[0]}개`)
    console.log(`   LEVEL_2 (부서): ${levelCounts[1]}개`)
    console.log(`   LEVEL_3 (세부부서): ${levelCounts[2]}개`)
    console.log(`   LEVEL_4 (하위부서): ${levelCounts[3]}개`)

    // 4. 코드 패턴별 조직 수 조회
    const codePatternCounts = await Promise.all([
      prisma.organization.count({
        where: {
          createdById: kimEunhyeUser.id,
          code: { startsWith: 'PR-' }
        }
      }),
      prisma.organization.count({
        where: {
          createdById: kimEunhyeUser.id,
          code: { startsWith: 'DC-' }
        }
      }),
      prisma.organization.count({
        where: {
          createdById: kimEunhyeUser.id,
          code: { startsWith: 'EC-' }
        }
      }),
      prisma.organization.count({
        where: {
          createdById: kimEunhyeUser.id,
          code: { startsWith: 'MC-' }
        }
      }),
      prisma.organization.count({
        where: {
          createdById: kimEunhyeUser.id,
          code: { startsWith: 'WC-' }
        }
      }),
      prisma.organization.count({
        where: {
          createdById: kimEunhyeUser.id,
          code: { startsWith: 'SC-' }
        }
      })
    ])

    console.log('\n🏷️ 코드 패턴별 조직 수:')
    console.log(`   PR-* (교구): ${codePatternCounts[0]}개`)
    console.log(`   DC-* (소속조직): ${codePatternCounts[1]}개`)
    console.log(`   EC-* (교육위원회): ${codePatternCounts[2]}개`)
    console.log(`   MC-* (선교위원회): ${codePatternCounts[3]}개`)
    console.log(`   WC-* (예배찬양위원회): ${codePatternCounts[4]}개`)
    console.log(`   SC-* (봉사위원회): ${codePatternCounts[5]}개`)

    // 5. 최근 생성된 조직들 (최근 30일)
    const recentDate = new Date()
    recentDate.setDate(recentDate.getDate() - 30)

    const recentCount = await prisma.organization.count({
      where: {
        createdById: kimEunhyeUser.id,
        createdAt: {
          gte: recentDate
        }
      }
    })

    console.log(`\n📅 최근 30일 내 생성된 조직: ${recentCount}개`)

    // 6. 가장 최근 생성된 5개 조직
    const recentOrganizations = await prisma.organization.findMany({
      where: {
        createdById: kimEunhyeUser.id
      },
      select: {
        code: true,
        name: true,
        englishName: true,
        level: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    })

    console.log('\n🆕 가장 최근 생성된 5개 조직:')
    recentOrganizations.forEach((org, index) => {
      const levelEmoji = org.level === 'LEVEL_1' ? '📁' : 
                        org.level === 'LEVEL_2' ? '📂' : 
                        org.level === 'LEVEL_3' ? '📄' : '📝'
      
      console.log(`   ${index + 1}. ${levelEmoji} ${org.name} (${org.code})`)
      console.log(`      English: ${org.englishName}`)
      console.log(`      Level: ${org.level}`)
      console.log(`      Created: ${org.createdAt.toISOString()}`)
    })

    // 7. 총계 검증
    const verificationSum = levelCounts.reduce((sum, count) => sum + count, 0)
    const codePatternSum = codePatternCounts.reduce((sum, count) => sum + count, 0)

    console.log('\n✅ 검증 결과:')
    console.log(`   레벨별 합계: ${verificationSum}개`)
    console.log(`   코드패턴별 합계: ${codePatternSum}개`)
    console.log(`   전체 조직 수: ${totalCount}개`)
    console.log(`   일치 여부: ${verificationSum === totalCount ? '✅ 일치' : '❌ 불일치'}`)

    // 8. 데이터베이스 연결 정보
    console.log('\n🔗 데이터베이스 연결 정보:')
    console.log(`   환경: ${process.env.NODE_ENV || 'development'}`)
    console.log(`   데이터베이스 URL: ${process.env.DATABASE_URL ? '설정됨' : '미설정'}`)
    console.log(`   Supabase 연결: ${process.env.DATABASE_URL?.includes('supabase') ? '✅ 온라인' : '로컬'}`)

    return {
      user: kimEunhyeUser,
      totalCount,
      levelCounts: {
        level1: levelCounts[0],
        level2: levelCounts[1],
        level3: levelCounts[2],
        level4: levelCounts[3]
      },
      codePatternCounts: {
        parishes: codePatternCounts[0],
        departments: codePatternCounts[1],
        education: codePatternCounts[2],
        mission: codePatternCounts[3],
        worship: codePatternCounts[4],
        service: codePatternCounts[5]
      },
      recentCount,
      recentOrganizations,
      isValid: verificationSum === totalCount
    }

  } catch (error) {
    console.error('❌ Error counting organizations:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

countKimEunhyeOrganizations().catch(console.error)