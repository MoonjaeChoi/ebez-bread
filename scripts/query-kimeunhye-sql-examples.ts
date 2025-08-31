import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function queryKimEunhyeOrganizationsSQL() {
  console.log('🔍 Testing various SQL-style queries for 김은혜 organizations...\n')

  try {
    // 1. Raw SQL 쿼리 - 기본 조회
    console.log('1️⃣ Raw SQL Query: 김은혜가 생성한 조직 목록')
    console.log('===============================================')
    
    const rawSQLQuery = `
      SELECT 
        o.id,
        o.code,
        o.name,
        o."englishName",
        o.level,
        o.description,
        o."sortOrder",
        o."isActive",
        o."createdAt",
        o."updatedAt",
        creator.name as "createdByName",
        creator.email as "createdByEmail",
        updater.name as "updatedByName",
        updater.email as "updatedByEmail",
        c.name as "churchName"
      FROM organizations o
      LEFT JOIN users creator ON o."createdById" = creator.id
      LEFT JOIN users updater ON o."updatedById" = updater.id
      LEFT JOIN churches c ON o."churchId" = c.id
      WHERE creator.name = '김은혜'
      ORDER BY o."sortOrder" ASC, o."createdAt" ASC
    `

    const rawResults: any[] = await prisma.$queryRawUnsafe(rawSQLQuery)
    
    console.log(`Found ${rawResults.length} organizations via raw SQL:\n`)
    
    rawResults.slice(0, 5).forEach((org, index) => {
      console.log(`${index + 1}. ${org.name} (${org.code})`)
      console.log(`   Created By: ${org.createdByName} (${org.createdByEmail})`)
      console.log(`   Updated By: ${org.updatedByName || 'NULL'}`)
      console.log(`   Level: ${org.level}`)
      console.log(`   Created: ${new Date(org.createdAt).toISOString()}`)
      console.log('')
    })

    if (rawResults.length > 5) {
      console.log(`... and ${rawResults.length - 5} more organizations\n`)
    }

    // 2. Aggregation 쿼리 - 통계
    console.log('2️⃣ Aggregation Query: 김은혜 조직 생성 통계')
    console.log('===============================================')
    
    const aggregationQuery = `
      SELECT 
        COUNT(*) as total_organizations,
        COUNT(CASE WHEN o."isActive" = true THEN 1 END) as active_count,
        COUNT(CASE WHEN o."isActive" = false THEN 1 END) as inactive_count,
        MIN(o."createdAt") as first_created,
        MAX(o."createdAt") as last_created,
        COUNT(CASE WHEN o.code LIKE 'PR-%' THEN 1 END) as parish_count
      FROM organizations o
      LEFT JOIN users creator ON o."createdById" = creator.id
      WHERE creator.name = '김은혜'
    `

    const aggregationResults: any[] = await prisma.$queryRawUnsafe(aggregationQuery)
    const stats = aggregationResults[0]
    
    console.log(`Total Organizations: ${stats.total_organizations}`)
    console.log(`Active: ${stats.active_count}`)
    console.log(`Inactive: ${stats.inactive_count}`)
    console.log(`Parish Organizations (PR-*): ${stats.parish_count}`)
    console.log(`First Created: ${new Date(stats.first_created).toISOString()}`)
    console.log(`Last Created: ${new Date(stats.last_created).toISOString()}`)

    // 3. 복합 조건 쿼리
    console.log('\n3️⃣ Complex Conditional Query: 특정 조건의 조직들')
    console.log('===============================================')
    
    const complexResults = await prisma.organization.findMany({
      where: {
        AND: [
          {
            createdBy: {
              name: '김은혜'
            }
          },
          {
            OR: [
              {
                code: {
                  startsWith: 'PR-'
                }
              },
              {
                level: 'LEVEL_1'
              }
            ]
          },
          {
            isActive: true
          },
          {
            createdAt: {
              gte: new Date('2025-08-30')
            }
          }
        ]
      },
      include: {
        createdBy: {
          select: { name: true, email: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    })

    console.log(`Found ${complexResults.length} organizations matching complex conditions:\n`)
    
    complexResults.forEach((org, index) => {
      console.log(`${index + 1}. ${org.name} (${org.code})`)
      console.log(`   Level: ${org.level}`)
      console.log(`   Created: ${org.createdAt.toISOString()}`)
      console.log('')
    })

    // 4. Group By 쿼리 - 레벨별, 월별 통계
    console.log('4️⃣ Group By Query: 레벨별 및 날짜별 분포')
    console.log('===============================================')
    
    const groupByQuery = `
      SELECT 
        o.level,
        DATE_TRUNC('day', o."createdAt") as creation_date,
        COUNT(*) as count
      FROM organizations o
      LEFT JOIN users creator ON o."createdById" = creator.id
      WHERE creator.name = '김은혜'
      GROUP BY o.level, DATE_TRUNC('day', o."createdAt")
      ORDER BY creation_date DESC, o.level ASC
    `

    const groupByResults: any[] = await prisma.$queryRawUnsafe(groupByQuery)
    
    console.log('Level and Date Distribution:')
    groupByResults.forEach(row => {
      const date = new Date(row.creation_date).toISOString().split('T')[0]
      console.log(`${date} - ${row.level}: ${row.count} organizations`)
    })

    // 5. 김은혜와 다른 사용자 비교
    console.log('\n5️⃣ Comparison Query: 김은혜 vs 다른 사용자들')
    console.log('===============================================')
    
    const comparisonQuery = `
      SELECT 
        COALESCE(creator.name, 'NULL') as creator_name,
        COUNT(*) as organization_count,
        COUNT(CASE WHEN o.code LIKE 'PR-%' THEN 1 END) as parish_count
      FROM organizations o
      LEFT JOIN users creator ON o."createdById" = creator.id
      WHERE o."isActive" = true
      GROUP BY creator.name
      ORDER BY organization_count DESC
      LIMIT 10
    `

    const comparisonResults: any[] = await prisma.$queryRawUnsafe(comparisonQuery)
    
    console.log('Top Organization Creators:')
    comparisonResults.forEach((row, index) => {
      console.log(`${index + 1}. ${row.creator_name}: ${row.organization_count} total (${row.parish_count} parishes)`)
    })

    // 6. 시간대별 생성 패턴
    console.log('\n6️⃣ Time Pattern Query: 김은혜의 조직 생성 시간 패턴')
    console.log('===============================================')
    
    const timePatternQuery = `
      SELECT 
        EXTRACT(HOUR FROM o."createdAt") as creation_hour,
        COUNT(*) as count
      FROM organizations o
      LEFT JOIN users creator ON o."createdById" = creator.id
      WHERE creator.name = '김은혜'
      GROUP BY EXTRACT(HOUR FROM o."createdAt")
      ORDER BY creation_hour ASC
    `

    const timePatternResults: any[] = await prisma.$queryRawUnsafe(timePatternQuery)
    
    console.log('Hourly Creation Pattern:')
    timePatternResults.forEach(row => {
      const hour = parseInt(row.creation_hour.toString())
      const timeStr = hour.toString().padStart(2, '0') + ':00'
      console.log(`${timeStr} - ${row.count} organizations`)
    })

    // 7. 최근 활동 조회
    console.log('\n7️⃣ Recent Activity Query: 김은혜의 최근 조직 관련 활동')
    console.log('===============================================')
    
    const recentActivityResults = await prisma.organization.findMany({
      where: {
        OR: [
          {
            createdBy: { name: '김은혜' }
          },
          {
            updatedBy: { name: '김은혜' }
          }
        ]
      },
      include: {
        createdBy: {
          select: { name: true }
        },
        updatedBy: {
          select: { name: true }
        }
      },
      orderBy: [
        { updatedAt: 'desc' },
        { createdAt: 'desc' }
      ],
      take: 10
    })

    console.log('Recent Activity (Create/Update):')
    recentActivityResults.forEach((org, index) => {
      const isCreatedByKim = org.createdBy?.name === '김은혜'
      const isUpdatedByKim = org.updatedBy?.name === '김은혜'
      const action = isUpdatedByKim && org.createdAt.getTime() !== org.updatedAt.getTime() ? 'UPDATED' : 'CREATED'
      
      console.log(`${index + 1}. [${action}] ${org.name} (${org.code})`)
      console.log(`   Time: ${org.updatedAt.toISOString()}`)
      console.log(`   Created By: ${org.createdBy?.name || 'NULL'}`)
      console.log(`   Updated By: ${org.updatedBy?.name || 'NULL'}`)
      console.log('')
    })

    return {
      rawSQLCount: rawResults.length,
      statistics: stats,
      complexConditionCount: complexResults.length,
      recentActivityCount: recentActivityResults.length
    }

  } catch (error) {
    console.error('❌ Error executing SQL queries:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

queryKimEunhyeOrganizationsSQL().catch(console.error)