import { router, publicProcedure } from '@/lib/trpc/server'
import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { prisma } from '@/lib/db'
import { startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, subYears, subWeeks, format } from 'date-fns'
import { logger } from '@/lib/logger'

export const reportsRouter = router({
  // 대시보드 요약 통계
  getDashboardStats: publicProcedure
    .input(z.object({
      churchId: z.string(),
      year: z.number().optional(),
      month: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const { churchId, year = new Date().getFullYear(), month = new Date().getMonth() + 1 } = input

      const currentDate = new Date(year, month - 1, 1)
      const startOfCurrentMonth = startOfMonth(currentDate)
      const endOfCurrentMonth = endOfMonth(currentDate)
      const startOfPreviousMonth = startOfMonth(subMonths(currentDate, 1))
      const endOfPreviousMonth = endOfMonth(subMonths(currentDate, 1))

      // 총 교인 수
      const totalMembers = await prisma.member.count({
        where: { churchId, status: 'ACTIVE' }
      })

      // 이번 달 새 교인 수
      const newMembersThisMonth = await prisma.member.count({
        where: {
          churchId,
          registrationDate: {
            gte: startOfCurrentMonth,
            lte: endOfCurrentMonth
          }
        }
      })

      // 이번 달 총 헌금
      const currentMonthOfferings = await prisma.offering.aggregate({
        _sum: { amount: true },
        where: {
          churchId,
          offeringDate: {
            gte: startOfCurrentMonth,
            lte: endOfCurrentMonth
          }
        }
      })

      // 지난 달 총 헌금
      const previousMonthOfferings = await prisma.offering.aggregate({
        _sum: { amount: true },
        where: {
          churchId,
          offeringDate: {
            gte: startOfPreviousMonth,
            lte: endOfPreviousMonth
          }
        }
      })

      // 이번 달 평균 출석률
      const currentMonthAttendance = await prisma.attendance.groupBy({
        by: ['attendanceDate'],
        where: {
          churchId,
          attendanceDate: {
            gte: startOfCurrentMonth,
            lte: endOfCurrentMonth
          }
        },
        _count: {
          id: true
        }
      })

      const avgAttendanceThisMonth = currentMonthAttendance.length > 0
        ? Math.round(currentMonthAttendance.reduce((sum, day) => sum + day._count.id, 0) / currentMonthAttendance.length)
        : 0

      // 지난 달 평균 출석률
      const previousMonthAttendance = await prisma.attendance.groupBy({
        by: ['attendanceDate'],
        where: {
          churchId,
          attendanceDate: {
            gte: startOfPreviousMonth,
            lte: endOfPreviousMonth
          }
        },
        _count: {
          id: true
        }
      })

      const avgAttendancePreviousMonth = previousMonthAttendance.length > 0
        ? Math.round(previousMonthAttendance.reduce((sum, day) => sum + day._count.id, 0) / previousMonthAttendance.length)
        : 0

      return {
        totalMembers,
        newMembersThisMonth,
        currentMonthOfferings: Number(currentMonthOfferings._sum.amount || 0),
        previousMonthOfferings: Number(previousMonthOfferings._sum.amount || 0),
        avgAttendanceThisMonth,
        avgAttendancePreviousMonth,
        offeringGrowth: previousMonthOfferings._sum.amount 
          ? ((Number(currentMonthOfferings._sum.amount || 0) - Number(previousMonthOfferings._sum.amount)) / Number(previousMonthOfferings._sum.amount)) * 100
          : 0,
        attendanceGrowth: avgAttendancePreviousMonth > 0
          ? ((avgAttendanceThisMonth - avgAttendancePreviousMonth) / avgAttendancePreviousMonth) * 100
          : 0
      }
    }),

  // 월간/연간 헌금 추이
  getOfferingTrends: publicProcedure
    .input(z.object({
      churchId: z.string(),
      period: z.enum(['monthly', 'yearly']),
      year: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const { churchId, period, year = new Date().getFullYear() } = input

      if (period === 'monthly') {
        // 연간 월별 헌금 추이
        const monthlyData = await Promise.all(
          Array.from({ length: 12 }, async (_, index) => {
            const month = index + 1
            const startDate = new Date(year, index, 1)
            const endDate = endOfMonth(startDate)

            const offerings = await prisma.offering.groupBy({
              by: ['offeringType'],
              where: {
                churchId,
                offeringDate: {
                  gte: startDate,
                  lte: endDate
                }
              },
              _sum: {
                amount: true
              }
            })

            const total = offerings.reduce((sum, offering) => 
              sum + Number(offering._sum.amount || 0), 0
            )

            return {
              month: `${month}월`,
              monthNumber: month,
              total,
              details: offerings.map(o => ({
                type: o.offeringType,
                amount: Number(o._sum.amount || 0)
              }))
            }
          })
        )

        return monthlyData
      } else {
        // 연도별 헌금 추이 (최근 5년)
        const yearlyData = await Promise.all(
          Array.from({ length: 5 }, async (_, index) => {
            const targetYear = year - (4 - index)
            const startDate = startOfYear(new Date(targetYear, 0, 1))
            const endDate = endOfYear(new Date(targetYear, 0, 1))

            const offerings = await prisma.offering.groupBy({
              by: ['offeringType'],
              where: {
                churchId,
                offeringDate: {
                  gte: startDate,
                  lte: endDate
                }
              },
              _sum: {
                amount: true
              }
            })

            const total = offerings.reduce((sum, offering) => 
              sum + Number(offering._sum.amount || 0), 0
            )

            return {
              year: targetYear,
              total,
              details: offerings.map(o => ({
                type: o.offeringType,
                amount: Number(o._sum.amount || 0)
              }))
            }
          })
        )

        return yearlyData
      }
    }),

  // 출석률 트렌드 분석
  getAttendanceTrends: publicProcedure
    .input(z.object({
      churchId: z.string(),
      period: z.enum(['weekly', 'monthly']),
      year: z.number().optional(),
      month: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const { churchId, period, year = new Date().getFullYear(), month = new Date().getMonth() + 1 } = input

      if (period === 'weekly') {
        // 월간 주별 출석률
        const startDate = new Date(year, month - 1, 1)
        const endDate = endOfMonth(startDate)

        const attendanceData = await prisma.attendance.findMany({
          where: {
            churchId,
            attendanceDate: {
              gte: startDate,
              lte: endDate
            }
          },
          include: {
            member: true
          }
        })

        // 주별로 그룹화
        const weeklyData = attendanceData.reduce((acc, attendance) => {
          const week = Math.ceil(attendance.attendanceDate.getDate() / 7)
          const weekKey = `${month}월 ${week}주`

          if (!acc[weekKey]) {
            acc[weekKey] = {
              week: weekKey,
              weekNumber: week,
              attendances: []
            }
          }

          acc[weekKey].attendances.push(attendance)
          return acc
        }, {} as Record<string, any>)

        return Object.values(weeklyData).map(week => ({
          ...week,
          totalAttendance: week.attendances.length,
          serviceTypes: week.attendances.reduce((acc: any, att: any) => {
            acc[att.serviceType] = (acc[att.serviceType] || 0) + 1
            return acc
          }, {})
        }))

      } else {
        // 연간 월별 출석률
        const monthlyData = await Promise.all(
          Array.from({ length: 12 }, async (_, index) => {
            const month = index + 1
            const startDate = new Date(year, index, 1)
            const endDate = endOfMonth(startDate)

            const attendances = await prisma.attendance.groupBy({
              by: ['serviceType'],
              where: {
                churchId,
                attendanceDate: {
                  gte: startDate,
                  lte: endDate
                }
              },
              _count: {
                id: true
              }
            })

            const total = attendances.reduce((sum, att) => sum + att._count.id, 0)

            return {
              month: `${month}월`,
              monthNumber: month,
              total,
              serviceTypes: attendances.reduce((acc, att) => {
                acc[att.serviceType] = att._count.id
                return acc
              }, {} as Record<string, number>)
            }
          })
        )

        return monthlyData
      }
    }),

  // 교인 통계 (연령대, 성별, 직분별)
  getMemberStatistics: publicProcedure
    .input(z.object({
      churchId: z.string()
    }))
    .query(async ({ input }) => {
      const { churchId } = input

      // 성별 통계
      const genderStats = await prisma.member.groupBy({
        by: ['gender'],
        where: { churchId, status: 'ACTIVE' },
        _count: { id: true }
      })

      // 직분별 통계
      const positionStats = await prisma.member.findMany({
        where: { churchId, status: 'ACTIVE' },
        include: { position: true }
      })

      const positionGrouped = positionStats.reduce((acc, member) => {
        const positionName = member.position?.name || '직분 없음'
        acc[positionName] = (acc[positionName] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      // 연령대별 통계
      const currentYear = new Date().getFullYear()
      const ageStats = positionStats.reduce((acc, member) => {
        if (member.birthDate) {
          const age = currentYear - member.birthDate.getFullYear()
          let ageGroup = '미분류'
          
          if (age < 20) ageGroup = '10대'
          else if (age < 30) ageGroup = '20대'
          else if (age < 40) ageGroup = '30대'
          else if (age < 50) ageGroup = '40대'
          else if (age < 60) ageGroup = '50대'
          else if (age < 70) ageGroup = '60대'
          else ageGroup = '70대 이상'
          
          acc[ageGroup] = (acc[ageGroup] || 0) + 1
        } else {
          acc['미분류'] = (acc['미분류'] || 0) + 1
        }
        return acc
      }, {} as Record<string, number>)

      return {
        gender: genderStats.map(stat => ({
          name: stat.gender || '미분류',
          value: stat._count.id
        })),
        position: Object.entries(positionGrouped).map(([name, count]) => ({
          name,
          value: count
        })),
        age: Object.entries(ageStats).map(([name, count]) => ({
          name,
          value: count
        }))
      }
    }),

  // 헌금 타입별 통계
  getOfferingByType: publicProcedure
    .input(z.object({
      churchId: z.string(),
      year: z.number().optional(),
      month: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const { churchId, year = new Date().getFullYear(), month } = input

      let startDate: Date
      let endDate: Date

      if (month) {
        startDate = new Date(year, month - 1, 1)
        endDate = endOfMonth(startDate)
      } else {
        startDate = startOfYear(new Date(year, 0, 1))
        endDate = endOfYear(new Date(year, 0, 1))
      }

      const offeringTypes = await prisma.offering.groupBy({
        by: ['offeringType'],
        where: {
          churchId,
          offeringDate: {
            gte: startDate,
            lte: endDate
          }
        },
        _sum: {
          amount: true
        },
        _count: {
          id: true
        }
      })

      return offeringTypes.map(type => ({
        type: type.offeringType,
        amount: Number(type._sum.amount || 0),
        count: type._count.id,
        name: getOfferingTypeName(type.offeringType)
      }))
    }),

  // 심방 통계
  getVisitationStats: publicProcedure
    .input(z.object({
      churchId: z.string(),
      year: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const { churchId, year = new Date().getFullYear() } = input

      const startDate = startOfYear(new Date(year, 0, 1))
      const endDate = endOfYear(new Date(year, 0, 1))

      const visitations = await prisma.visitation.findMany({
        where: {
          member: { churchId },
          visitDate: {
            gte: startDate,
            lte: endDate
          }
        },
        include: {
          member: true
        }
      })

      // 월별 심방 통계
      const monthlyVisitations = visitations.reduce((acc, visit) => {
        const month = visit.visitDate.getMonth() + 1
        acc[month] = (acc[month] || 0) + 1
        return acc
      }, {} as Record<number, number>)

      // 후속 조치 필요한 심방
      const followUpNeeded = visitations.filter(v => v.followUpNeeded).length

      return {
        total: visitations.length,
        followUpNeeded,
        monthlyData: Array.from({ length: 12 }, (_, index) => ({
          month: `${index + 1}월`,
          count: monthlyVisitations[index + 1] || 0
        }))
      }
    }),

  // 🚀 ADVANCED STATISTICS - 고급 통계 쿼리들
  
  // 성장률 분석 (Growth Rate Analytics)
  getGrowthAnalytics: publicProcedure
    .input(z.object({
      churchId: z.string(),
      year: z.number().optional(),
      compareYear: z.number().optional()
    }))
    .query(async ({ input }) => {
      const { churchId, year = new Date().getFullYear(), compareYear = year - 1 } = input
      
      try {
        // 연도별 비교 데이터
        const [currentYearData, previousYearData] = await Promise.all([
          getYearlyAggregateData(churchId, year),
          getYearlyAggregateData(churchId, compareYear)
        ])

        // 성장률 계산
        const growthRates = {
          memberGrowth: calculateGrowthRate(previousYearData.totalMembers, currentYearData.totalMembers),
          offeringGrowth: calculateGrowthRate(previousYearData.totalOfferings, currentYearData.totalOfferings),
          attendanceGrowth: calculateGrowthRate(previousYearData.avgAttendance, currentYearData.avgAttendance),
          visitationGrowth: calculateGrowthRate(previousYearData.totalVisitations, currentYearData.totalVisitations)
        }

        // 월별 성장 추세
        const monthlyGrowthTrend = await getMonthlyGrowthTrend(churchId, year, compareYear)
        
        // 예측값 계산 (다음 연도 예상값)
        const projections = calculateProjections(currentYearData, growthRates)

        logger.info('Growth analytics calculated', {
          churchId,
          year,
          compareYear,
          growthRates
        })

        return {
          current: currentYearData,
          previous: previousYearData,
          growthRates,
          monthlyGrowthTrend,
          projections
        }
      } catch (error) {
        logger.error('Growth analytics calculation failed', { error, churchId, year })
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: '성장률 분석 중 오류가 발생했습니다'
        })
      }
    }),

  // 헌금 패턴 분석 (Advanced Financial Analytics)
  getFinancialPatternAnalysis: publicProcedure
    .input(z.object({
      churchId: z.string(),
      years: z.number().optional().default(3)
    }))
    .query(async ({ input }) => {
      const { churchId, years } = input
      const currentYear = new Date().getFullYear()

      try {
        // 최근 N년간 월별 헌금 데이터
        const monthlyPatterns = await getMonthlyOfferingPatterns(churchId, currentYear, years)
        
        // 계절별 패턴 분석
        const seasonalPatterns = calculateSeasonalPatterns(monthlyPatterns)
        
        // 헌금 타입별 트렌드
        const offeringTypeTrends = await getOfferingTypeTrends(churchId, currentYear, years)
        
        // 교인별 헌금 분석
        const memberContributionAnalysis = await getMemberContributionAnalysis(churchId, currentYear)
        
        // 헌금 집중도 분석 (상위 20% 교인이 총 헌금의 몇 %를 차지하는지)
        const concentrationAnalysis = calculateContributionConcentration(memberContributionAnalysis)

        logger.info('Financial pattern analysis completed', {
          churchId,
          years,
          totalMembers: memberContributionAnalysis.length
        })

        return {
          monthlyPatterns,
          seasonalPatterns,
          offeringTypeTrends,
          memberContributionAnalysis,
          concentrationAnalysis
        }
      } catch (error) {
        logger.error('Financial pattern analysis failed', { error, churchId, years })
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: '헌금 패턴 분석 중 오류가 발생했습니다'
        })
      }
    }),

  // 참여도 분석 (Engagement Analytics)
  getEngagementAnalytics: publicProcedure
    .input(z.object({
      churchId: z.string(),
      period: z.enum(['monthly', 'quarterly', 'yearly']).default('monthly'),
      months: z.number().optional().default(12)
    }))
    .query(async ({ input }) => {
      const { churchId, period, months } = input

      try {
        // 출석 패턴 분석
        const attendancePatterns = await getAttendancePatterns(churchId, months)
        
        // 교인 참여도 점수 계산
        const memberEngagementScores = await calculateMemberEngagementScores(churchId, months)
        
        // 예배별 참여도 분석
        const serviceEngagementAnalysis = await getServiceEngagementAnalysis(churchId, months)
        
        // 신규 교인 정착률
        const newMemberRetentionRate = await calculateNewMemberRetentionRate(churchId, months)
        
        // 비활성 교인 식별
        const inactiveMembers = await identifyInactiveMembers(churchId, months)

        logger.info('Engagement analytics completed', {
          churchId,
          period,
          months,
          totalEngagementScores: memberEngagementScores.length,
          inactiveMemberCount: inactiveMembers.length
        })

        return {
          attendancePatterns,
          memberEngagementScores,
          serviceEngagementAnalysis,
          newMemberRetentionRate,
          inactiveMembers
        }
      } catch (error) {
        logger.error('Engagement analytics failed', { error, churchId, period })
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: '참여도 분석 중 오류가 발생했습니다'
        })
      }
    }),

  // 비교 분석 (Comparative Analytics)
  getComparativeAnalytics: publicProcedure
    .input(z.object({
      churchId: z.string(),
      periodType: z.enum(['month', 'quarter', 'year']).default('month'),
      currentPeriod: z.object({
        year: z.number(),
        month: z.number().optional(),
        quarter: z.number().optional()
      }),
      comparePeriod: z.object({
        year: z.number(),
        month: z.number().optional(),
        quarter: z.number().optional()
      })
    }))
    .query(async ({ input }) => {
      const { churchId, periodType, currentPeriod, comparePeriod } = input

      try {
        // 기간별 비교 데이터
        const [currentData, compareData] = await Promise.all([
          getPeriodData(churchId, periodType, currentPeriod),
          getPeriodData(churchId, periodType, comparePeriod)
        ])
        
        // 비교 지표 계산
        const comparisons = {
          memberCount: {
            current: currentData.memberCount,
            previous: compareData.memberCount,
            change: currentData.memberCount - compareData.memberCount,
            changePercent: calculateGrowthRate(compareData.memberCount, currentData.memberCount)
          },
          totalOfferings: {
            current: currentData.totalOfferings,
            previous: compareData.totalOfferings,
            change: currentData.totalOfferings - compareData.totalOfferings,
            changePercent: calculateGrowthRate(compareData.totalOfferings, currentData.totalOfferings)
          },
          avgAttendance: {
            current: currentData.avgAttendance,
            previous: compareData.avgAttendance,
            change: currentData.avgAttendance - compareData.avgAttendance,
            changePercent: calculateGrowthRate(compareData.avgAttendance, currentData.avgAttendance)
          },
          visitations: {
            current: currentData.visitations,
            previous: compareData.visitations,
            change: currentData.visitations - compareData.visitations,
            changePercent: calculateGrowthRate(compareData.visitations, currentData.visitations)
          }
        }

        // 성과 지표 (KPIs)
        const kpis = calculateKPIs(currentData, compareData)

        logger.info('Comparative analytics completed', {
          churchId,
          periodType,
          currentPeriod,
          comparePeriod
        })

        return {
          currentPeriod: currentData,
          comparePeriod: compareData,
          comparisons,
          kpis,
          summary: generateComparisonSummary(comparisons)
        }
      } catch (error) {
        logger.error('Comparative analytics failed', { error, churchId, periodType })
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: '비교 분석 중 오류가 발생했습니다'
        })
      }
    }),

  // 예측 분석 (Predictive Analytics)
  getPredictiveAnalytics: publicProcedure
    .input(z.object({
      churchId: z.string(),
      forecastMonths: z.number().min(1).max(12).default(6),
      historicalMonths: z.number().min(6).max(24).default(12)
    }))
    .query(async ({ input }) => {
      const { churchId, forecastMonths, historicalMonths } = input

      try {
        // 과거 데이터 수집
        const historicalData = await getHistoricalData(churchId, historicalMonths)
        
        // 트렌드 분석
        const trends = analyzeTrends(historicalData)
        
        // 예측 계산
        const forecasts = generateForecasts(trends, forecastMonths)
        
        // 시나리오 분석 (낙관적/현실적/비관적)
        const scenarios = generateScenarios(forecasts, trends)
        
        // 예측 신뢰도 계산
        const confidence = calculateForecastConfidence(historicalData, trends)

        logger.info('Predictive analytics completed', {
          churchId,
          forecastMonths,
          historicalMonths,
          confidence: confidence.overall
        })

        return {
          historicalData,
          trends,
          forecasts,
          scenarios,
          confidence,
          recommendations: generateRecommendations(trends, scenarios)
        }
      } catch (error) {
        logger.error('Predictive analytics failed', { error, churchId, forecastMonths })
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: '예측 분석 중 오류가 발생했습니다'
        })
      }
    }),

  // 성과 지표 대시보드 (Performance Metrics Dashboard)
  getPerformanceMetrics: publicProcedure
    .input(z.object({
      churchId: z.string(),
      year: z.number().optional(),
      month: z.number().optional()
    }))
    .query(async ({ input }) => {
      const { churchId, year = new Date().getFullYear(), month } = input

      try {
        // 핵심 성과 지표 계산
        const metrics = await calculateCoreMetrics(churchId, year, month)
        
        // 벤치마킹 데이터 (동일 기간 대비)
        const benchmarks = await calculateBenchmarks(churchId, year, month)
        
        // 목표 대비 성과
        const goalComparisons = await calculateGoalComparisons(churchId, year, month)
        
        // 효율성 지표
        const efficiencyMetrics = calculateEfficiencyMetrics(metrics)
        
        // 건강도 점수 (종합 점수)
        const healthScore = calculateChurchHealthScore(metrics, benchmarks)

        logger.info('Performance metrics calculated', {
          churchId,
          year,
          month,
          healthScore: healthScore.total
        })

        return {
          coreMetrics: metrics,
          benchmarks,
          goalComparisons,
          efficiencyMetrics,
          healthScore,
          alerts: generatePerformanceAlerts(metrics, benchmarks)
        }
      } catch (error) {
        logger.error('Performance metrics calculation failed', { error, churchId, year })
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: '성과 지표 계산 중 오류가 발생했습니다'
        })
      }
    })
})

// 헌금 타입 한글명 변환 함수
function getOfferingTypeName(type: string): string {
  const typeMap: Record<string, string> = {
    TITHE: '십일조',
    THANKSGIVING: '감사헌금',
    SUNDAY_OFFERING: '주일헌금',
    SPECIAL: '특별헌금',
    MISSION: '선교헌금',
    BUILDING: '건축헌금',
    OTHER: '기타'
  }
  return typeMap[type] || type
}

// 🚀 ADVANCED ANALYTICS HELPER FUNCTIONS

// 성장률 계산 함수
function calculateGrowthRate(previous: number, current: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

// 연도별 집계 데이터 조회
async function getYearlyAggregateData(churchId: string, year: number) {
  const startDate = startOfYear(new Date(year, 0, 1))
  const endDate = endOfYear(new Date(year, 0, 1))

  const [memberCount, offeringSum, attendanceData, visitationCount] = await Promise.all([
    prisma.member.count({
      where: { 
        churchId, 
        status: 'ACTIVE',
        registrationDate: { lte: endDate }
      }
    }),
    prisma.offering.aggregate({
      _sum: { amount: true },
      where: {
        churchId,
        offeringDate: { gte: startDate, lte: endDate }
      }
    }),
    prisma.attendance.groupBy({
      by: ['attendanceDate'],
      where: {
        churchId,
        attendanceDate: { gte: startDate, lte: endDate }
      },
      _count: { id: true }
    }),
    prisma.visitation.count({
      where: {
        member: { churchId },
        visitDate: { gte: startDate, lte: endDate }
      }
    })
  ])

  const avgAttendance = attendanceData.length > 0 
    ? Math.round(attendanceData.reduce((sum, day) => sum + day._count.id, 0) / attendanceData.length)
    : 0

  return {
    totalMembers: memberCount,
    totalOfferings: Number(offeringSum._sum.amount || 0),
    avgAttendance,
    totalVisitations: visitationCount
  }
}

// 월별 성장 추세 계산
async function getMonthlyGrowthTrend(churchId: string, year: number, compareYear: number) {
  const monthlyData = await Promise.all(
    Array.from({ length: 12 }, async (_, index) => {
      const month = index + 1
      const [currentData, previousData] = await Promise.all([
        getMonthData(churchId, year, month),
        getMonthData(churchId, compareYear, month)
      ])

      return {
        month: `${month}월`,
        current: currentData,
        previous: previousData,
        growth: {
          members: calculateGrowthRate(previousData.members, currentData.members),
          offerings: calculateGrowthRate(previousData.offerings, currentData.offerings),
          attendance: calculateGrowthRate(previousData.attendance, currentData.attendance)
        }
      }
    })
  )

  return monthlyData
}

// 월별 데이터 조회
async function getMonthData(churchId: string, year: number, month: number) {
  const startDate = new Date(year, month - 1, 1)
  const endDate = endOfMonth(startDate)

  const [memberCount, offeringSum, attendanceAvg] = await Promise.all([
    prisma.member.count({
      where: { 
        churchId, 
        status: 'ACTIVE',
        registrationDate: { lte: endDate }
      }
    }),
    prisma.offering.aggregate({
      _sum: { amount: true },
      where: {
        churchId,
        offeringDate: { gte: startDate, lte: endDate }
      }
    }),
    getMonthlyAttendanceAverage(churchId, year, month)
  ])

  return {
    members: memberCount,
    offerings: Number(offeringSum._sum.amount || 0),
    attendance: attendanceAvg
  }
}

// 월별 평균 출석수 계산
async function getMonthlyAttendanceAverage(churchId: string, year: number, month: number) {
  const startDate = new Date(year, month - 1, 1)
  const endDate = endOfMonth(startDate)

  const attendanceData = await prisma.attendance.groupBy({
    by: ['attendanceDate'],
    where: {
      churchId,
      attendanceDate: { gte: startDate, lte: endDate }
    },
    _count: { id: true }
  })

  return attendanceData.length > 0
    ? Math.round(attendanceData.reduce((sum, day) => sum + day._count.id, 0) / attendanceData.length)
    : 0
}

// 예측값 계산
function calculateProjections(currentData: any, growthRates: any) {
  const avgGrowthRate = (
    growthRates.memberGrowth + 
    growthRates.offeringGrowth + 
    growthRates.attendanceGrowth
  ) / 3

  return {
    nextYearMembers: Math.round(currentData.totalMembers * (1 + growthRates.memberGrowth / 100)),
    nextYearOfferings: Math.round(currentData.totalOfferings * (1 + growthRates.offeringGrowth / 100)),
    nextYearAttendance: Math.round(currentData.avgAttendance * (1 + growthRates.attendanceGrowth / 100)),
    confidenceLevel: Math.max(50, 100 - Math.abs(avgGrowthRate))
  }
}

// 월별 헌금 패턴 분석
async function getMonthlyOfferingPatterns(churchId: string, currentYear: number, years: number) {
  const patterns = []
  
  for (let yearOffset = 0; yearOffset < years; yearOffset++) {
    const year = currentYear - yearOffset
    const yearData = []

    for (let month = 1; month <= 12; month++) {
      const startDate = new Date(year, month - 1, 1)
      const endDate = endOfMonth(startDate)

      const monthlySum = await prisma.offering.aggregate({
        _sum: { amount: true },
        where: {
          churchId,
          offeringDate: { gte: startDate, lte: endDate }
        }
      })

      yearData.push({
        year,
        month,
        amount: Number(monthlySum._sum.amount || 0)
      })
    }

    patterns.push({
      year,
      data: yearData,
      total: yearData.reduce((sum, month) => sum + month.amount, 0)
    })
  }

  return patterns
}

// 계절별 패턴 계산
function calculateSeasonalPatterns(monthlyPatterns: any[]) {
  const seasonData = {
    spring: [], // 3, 4, 5월
    summer: [], // 6, 7, 8월
    fall: [],   // 9, 10, 11월
    winter: []  // 12, 1, 2월
  }

  monthlyPatterns.forEach(yearPattern => {
    yearPattern.data.forEach((monthData: any) => {
      const season = getSeasonFromMonth(monthData.month)
      seasonData[season].push(monthData.amount)
    })
  })

  return {
    spring: {
      average: calculateAverage(seasonData.spring),
      total: seasonData.spring.reduce((sum, amount) => sum + amount, 0)
    },
    summer: {
      average: calculateAverage(seasonData.summer),
      total: seasonData.summer.reduce((sum, amount) => sum + amount, 0)
    },
    fall: {
      average: calculateAverage(seasonData.fall),
      total: seasonData.fall.reduce((sum, amount) => sum + amount, 0)
    },
    winter: {
      average: calculateAverage(seasonData.winter),
      total: seasonData.winter.reduce((sum, amount) => sum + amount, 0)
    }
  }
}

// 월에서 계절 계산
function getSeasonFromMonth(month: number): 'spring' | 'summer' | 'fall' | 'winter' {
  if (month >= 3 && month <= 5) return 'spring'
  if (month >= 6 && month <= 8) return 'summer'
  if (month >= 9 && month <= 11) return 'fall'
  return 'winter'
}

// 평균값 계산
function calculateAverage(numbers: number[]): number {
  return numbers.length > 0 ? numbers.reduce((sum, num) => sum + num, 0) / numbers.length : 0
}

// 헌금 타입별 트렌드 분석
async function getOfferingTypeTrends(churchId: string, currentYear: number, years: number) {
  const trends = {}
  
  for (let yearOffset = 0; yearOffset < years; yearOffset++) {
    const year = currentYear - yearOffset
    const startDate = startOfYear(new Date(year, 0, 1))
    const endDate = endOfYear(new Date(year, 0, 1))

    const typeData = await prisma.offering.groupBy({
      by: ['offeringType'],
      where: {
        churchId,
        offeringDate: { gte: startDate, lte: endDate }
      },
      _sum: { amount: true }
    })

    typeData.forEach(type => {
      const typeName = getOfferingTypeName(type.offeringType)
      if (!trends[typeName]) {
        trends[typeName] = []
      }
      trends[typeName].push({
        year,
        amount: Number(type._sum.amount || 0)
      })
    })
  }

  return trends
}

// 교인별 헌금 분석
async function getMemberContributionAnalysis(churchId: string, year: number) {
  const startDate = startOfYear(new Date(year, 0, 1))
  const endDate = endOfYear(new Date(year, 0, 1))

  const contributions = await prisma.member.findMany({
    where: { churchId, status: 'ACTIVE' },
    include: {
      offerings: {
        where: {
          offeringDate: { gte: startDate, lte: endDate }
        }
      }
    }
  })

  return contributions.map(member => {
    const totalContribution = member.offerings.reduce(
      (sum, offering) => sum + Number(offering.amount), 0
    )
    const offeringCount = member.offerings.length

    return {
      memberId: member.id,
      memberName: member.name,
      totalContribution,
      offeringCount,
      averageContribution: offeringCount > 0 ? totalContribution / offeringCount : 0
    }
  }).sort((a, b) => b.totalContribution - a.totalContribution)
}

// 헌금 집중도 분석
function calculateContributionConcentration(contributions: any[]) {
  const totalAmount = contributions.reduce((sum, contrib) => sum + contrib.totalContribution, 0)
  const totalMembers = contributions.length

  if (totalMembers === 0) return { top20Percent: 0, giniCoefficient: 0 }

  // 상위 20% 교인의 헌금 비율
  const top20Count = Math.ceil(totalMembers * 0.2)
  const top20Amount = contributions
    .slice(0, top20Count)
    .reduce((sum, contrib) => sum + contrib.totalContribution, 0)
  
  const top20Percent = totalAmount > 0 ? (top20Amount / totalAmount) * 100 : 0

  // 지니 계수 계산 (헌금 불평등도)
  let giniSum = 0
  for (let i = 0; i < totalMembers; i++) {
    for (let j = 0; j < totalMembers; j++) {
      giniSum += Math.abs(contributions[i].totalContribution - contributions[j].totalContribution)
    }
  }
  
  const meanContribution = totalAmount / totalMembers
  const giniCoefficient = totalMembers > 1 && meanContribution > 0 
    ? giniSum / (2 * totalMembers * totalMembers * meanContribution) 
    : 0

  return {
    top20Percent: Math.round(top20Percent * 100) / 100,
    giniCoefficient: Math.round(giniCoefficient * 1000) / 1000
  }
}

// 출석 패턴 분석
async function getAttendancePatterns(churchId: string, months: number) {
  const endDate = new Date()
  const startDate = subMonths(endDate, months)

  const attendanceData = await prisma.attendance.findMany({
    where: {
      churchId,
      attendanceDate: { gte: startDate, lte: endDate }
    },
    include: {
      member: true
    }
  })

  // 요일별 출석 패턴
  const dayOfWeekPattern = {}
  // 예배별 출석 패턴
  const serviceTypePattern = {}
  
  attendanceData.forEach(attendance => {
    const dayOfWeek = attendance.attendanceDate.getDay()
    const serviceType = attendance.serviceType

    dayOfWeekPattern[dayOfWeek] = (dayOfWeekPattern[dayOfWeek] || 0) + 1
    serviceTypePattern[serviceType] = (serviceTypePattern[serviceType] || 0) + 1
  })

  return {
    dayOfWeekPattern,
    serviceTypePattern,
    totalAttendances: attendanceData.length,
    uniqueMembers: new Set(attendanceData.map(a => a.memberId)).size
  }
}

// 교인 참여도 점수 계산
async function calculateMemberEngagementScores(churchId: string, months: number) {
  const endDate = new Date()
  const startDate = subMonths(endDate, months)

  const members = await prisma.member.findMany({
    where: { churchId, status: 'ACTIVE' },
    include: {
      attendances: {
        where: {
          attendanceDate: { gte: startDate, lte: endDate }
        }
      },
      offerings: {
        where: {
          offeringDate: { gte: startDate, lte: endDate }
        }
      },
      visitations: {
        where: {
          visitDate: { gte: startDate, lte: endDate }
        }
      }
    }
  })

  return members.map(member => {
    const attendanceScore = Math.min(member.attendances.length * 2, 100) // 출석 1회당 2점, 최대 100점
    const offeringScore = Math.min(member.offerings.length * 3, 100) // 헌금 1회당 3점, 최대 100점
    const visitationScore = member.visitations.length * 10 // 심방 1회당 10점

    const totalScore = (attendanceScore + offeringScore + visitationScore) / 3

    return {
      memberId: member.id,
      memberName: member.name,
      attendanceCount: member.attendances.length,
      offeringCount: member.offerings.length,
      visitationCount: member.visitations.length,
      engagementScore: Math.round(totalScore),
      level: getEngagementLevel(totalScore)
    }
  }).sort((a, b) => b.engagementScore - a.engagementScore)
}

// 참여도 레벨 계산
function getEngagementLevel(score: number): string {
  if (score >= 80) return '매우 활발'
  if (score >= 60) return '활발'
  if (score >= 40) return '보통'
  if (score >= 20) return '저조'
  return '매우 저조'
}

// 예배별 참여도 분석
async function getServiceEngagementAnalysis(churchId: string, months: number) {
  const endDate = new Date()
  const startDate = subMonths(endDate, months)

  const serviceData = await prisma.attendance.groupBy({
    by: ['serviceType'],
    where: {
      churchId,
      attendanceDate: { gte: startDate, lte: endDate }
    },
    _count: { id: true }
  })

  const totalAttendances = serviceData.reduce((sum, service) => sum + service._count.id, 0)

  return serviceData.map(service => ({
    serviceType: service.serviceType,
    serviceName: getServiceTypeName(service.serviceType),
    attendanceCount: service._count.id,
    percentage: totalAttendances > 0 ? (service._count.id / totalAttendances * 100) : 0
  }))
}

// 예배 타입 한글명 조회
function getServiceTypeName(serviceType: string): string {
  const typeMap: Record<string, string> = {
    SUNDAY_MORNING: '주일 오전예배',
    SUNDAY_EVENING: '주일 오후예배',
    WEDNESDAY: '수요예배',
    DAWN: '새벽기도회',
    FRIDAY: '금요기도회',
    SATURDAY: '토요집회',
    SPECIAL: '특별예배'
  }
  return typeMap[serviceType] || serviceType
}

// 신규 교인 정착률 계산
async function calculateNewMemberRetentionRate(churchId: string, months: number) {
  const endDate = new Date()
  const startDate = subMonths(endDate, months)

  // 기간 중 등록한 신규 교인
  const newMembers = await prisma.member.findMany({
    where: {
      churchId,
      registrationDate: { gte: startDate, lte: endDate }
    },
    include: {
      attendances: {
        where: {
          attendanceDate: { gte: startDate, lte: endDate }
        }
      }
    }
  })

  // 정착률 계산 (최소 3회 이상 출석한 경우를 정착으로 간주)
  const settledMembers = newMembers.filter(member => member.attendances.length >= 3)
  const retentionRate = newMembers.length > 0 
    ? (settledMembers.length / newMembers.length) * 100 
    : 0

  return {
    totalNewMembers: newMembers.length,
    settledMembers: settledMembers.length,
    retentionRate: Math.round(retentionRate * 100) / 100,
    details: newMembers.map(member => ({
      memberId: member.id,
      memberName: member.name,
      registrationDate: member.registrationDate,
      attendanceCount: member.attendances.length,
      isSettled: member.attendances.length >= 3
    }))
  }
}

// 비활성 교인 식별
async function identifyInactiveMembers(churchId: string, months: number) {
  const endDate = new Date()
  const startDate = subMonths(endDate, months)

  const members = await prisma.member.findMany({
    where: { churchId, status: 'ACTIVE' },
    include: {
      attendances: {
        where: {
          attendanceDate: { gte: startDate, lte: endDate }
        }
      },
      offerings: {
        where: {
          offeringDate: { gte: startDate, lte: endDate }
        }
      }
    }
  })

  // 비활성 기준: 출석 2회 이하 또는 헌금 없음
  const inactiveMembers = members.filter(member => 
    member.attendances.length <= 2 && member.offerings.length === 0
  )

  return inactiveMembers.map(member => ({
    memberId: member.id,
    memberName: member.name,
    lastAttendanceDate: member.attendances.length > 0 
      ? new Date(Math.max(...member.attendances.map(a => a.attendanceDate.getTime()))).toISOString()
      : null,
    attendanceCount: member.attendances.length,
    offeringCount: member.offerings.length,
    riskLevel: member.attendances.length === 0 && member.offerings.length === 0 
      ? '높음' : '중간'
  }))
}

// 기간별 데이터 조회
async function getPeriodData(churchId: string, periodType: string, period: any) {
  let startDate: Date
  let endDate: Date

  if (periodType === 'month') {
    startDate = new Date(period.year, period.month - 1, 1)
    endDate = endOfMonth(startDate)
  } else if (periodType === 'quarter') {
    const quarterStart = ((period.quarter - 1) * 3) + 1
    startDate = new Date(period.year, quarterStart - 1, 1)
    endDate = endOfMonth(new Date(period.year, quarterStart + 1, 0))
  } else {
    startDate = startOfYear(new Date(period.year, 0, 1))
    endDate = endOfYear(new Date(period.year, 0, 1))
  }

  const [memberCount, offeringSum, attendanceData, visitationCount] = await Promise.all([
    prisma.member.count({
      where: { 
        churchId, 
        status: 'ACTIVE',
        registrationDate: { lte: endDate }
      }
    }),
    prisma.offering.aggregate({
      _sum: { amount: true },
      where: {
        churchId,
        offeringDate: { gte: startDate, lte: endDate }
      }
    }),
    prisma.attendance.groupBy({
      by: ['attendanceDate'],
      where: {
        churchId,
        attendanceDate: { gte: startDate, lte: endDate }
      },
      _count: { id: true }
    }),
    prisma.visitation.count({
      where: {
        member: { churchId },
        visitDate: { gte: startDate, lte: endDate }
      }
    })
  ])

  const avgAttendance = attendanceData.length > 0
    ? Math.round(attendanceData.reduce((sum, day) => sum + day._count.id, 0) / attendanceData.length)
    : 0

  return {
    memberCount,
    totalOfferings: Number(offeringSum._sum.amount || 0),
    avgAttendance,
    visitations: visitationCount,
    period: `${period.year}${period.month ? `-${period.month}` : ''}${period.quarter ? `-Q${period.quarter}` : ''}`
  }
}

// KPI 계산
function calculateKPIs(currentData: any, compareData: any) {
  return {
    memberGrowthRate: calculateGrowthRate(compareData.memberCount, currentData.memberCount),
    offeringPerMember: currentData.memberCount > 0 ? currentData.totalOfferings / currentData.memberCount : 0,
    attendanceRate: currentData.memberCount > 0 ? (currentData.avgAttendance / currentData.memberCount) * 100 : 0,
    visitationEffectiveness: currentData.visitations > 0 ? (currentData.memberCount / currentData.visitations) : 0
  }
}

// 비교 요약 생성
function generateComparisonSummary(comparisons: any) {
  const improvements: string[] = []
  const concerns: string[] = []

  Object.entries(comparisons).forEach(([key, data]: [string, any]) => {
    if (data.changePercent > 5) {
      improvements.push(`${key}: ${data.changePercent.toFixed(1)}% 증가`)
    } else if (data.changePercent < -5) {
      concerns.push(`${key}: ${data.changePercent.toFixed(1)}% 감소`)
    }
  })

  return {
    improvements,
    concerns,
    overall: improvements.length > concerns.length ? '개선' : 
             improvements.length < concerns.length ? '우려' : '현상유지'
  }
}

// 과거 데이터 수집
async function getHistoricalData(churchId: string, months: number) {
  const data = []
  const currentDate = new Date()

  for (let i = 0; i < months; i++) {
    const date = subMonths(currentDate, i)
    const monthData = await getMonthData(churchId, date.getFullYear(), date.getMonth() + 1)
    
    data.unshift({
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      date: format(date, 'yyyy-MM'),
      ...monthData
    })
  }

  return data
}

// 트렌드 분석
function analyzeTrends(historicalData: any[]) {
  const memberTrend = calculateTrendSlope(historicalData.map(d => d.members))
  const offeringTrend = calculateTrendSlope(historicalData.map(d => d.offerings))
  const attendanceTrend = calculateTrendSlope(historicalData.map(d => d.attendance))

  return {
    members: {
      slope: memberTrend,
      direction: memberTrend > 0.1 ? '증가' : memberTrend < -0.1 ? '감소' : '안정'
    },
    offerings: {
      slope: offeringTrend,
      direction: offeringTrend > 0.1 ? '증가' : offeringTrend < -0.1 ? '감소' : '안정'
    },
    attendance: {
      slope: attendanceTrend,
      direction: attendanceTrend > 0.1 ? '증가' : attendanceTrend < -0.1 ? '감소' : '안정'
    }
  }
}

// 선형 회귀 기울기 계산
function calculateTrendSlope(values: number[]): number {
  const n = values.length
  if (n < 2) return 0

  const sumX = (n * (n - 1)) / 2
  const sumY = values.reduce((sum, val) => sum + val, 0)
  const sumXY = values.reduce((sum, val, index) => sum + val * index, 0)
  const sumXX = values.reduce((sum, _, index) => sum + index * index, 0)

  return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
}

// 예측 생성
function generateForecasts(trends: any, forecastMonths: number) {
  const forecasts = []
  const currentDate = new Date()

  for (let i = 1; i <= forecastMonths; i++) {
    const forecastDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1)
    
    forecasts.push({
      year: forecastDate.getFullYear(),
      month: forecastDate.getMonth() + 1,
      date: format(forecastDate, 'yyyy-MM'),
      predictedMembers: Math.max(0, Math.round(trends.members.slope * i)),
      predictedOfferings: Math.max(0, Math.round(trends.offerings.slope * i)),
      predictedAttendance: Math.max(0, Math.round(trends.attendance.slope * i))
    })
  }

  return forecasts
}

// 시나리오 생성
function generateScenarios(forecasts: any[], trends: any) {
  const scenarios = {
    optimistic: forecasts.map(forecast => ({
      ...forecast,
      predictedMembers: Math.round(forecast.predictedMembers * 1.2),
      predictedOfferings: Math.round(forecast.predictedOfferings * 1.3),
      predictedAttendance: Math.round(forecast.predictedAttendance * 1.15)
    })),
    realistic: forecasts,
    pessimistic: forecasts.map(forecast => ({
      ...forecast,
      predictedMembers: Math.round(forecast.predictedMembers * 0.8),
      predictedOfferings: Math.round(forecast.predictedOfferings * 0.7),
      predictedAttendance: Math.round(forecast.predictedAttendance * 0.85)
    }))
  }

  return scenarios
}

// 예측 신뢰도 계산
function calculateForecastConfidence(historicalData: any[], trends: any) {
  const memberVariance = calculateVariance(historicalData.map(d => d.members))
  const offeringVariance = calculateVariance(historicalData.map(d => d.offerings))
  const attendanceVariance = calculateVariance(historicalData.map(d => d.attendance))

  // 변동성이 낮을수록 신뢰도 높음
  const memberConfidence = Math.max(20, 100 - (memberVariance / 100))
  const offeringConfidence = Math.max(20, 100 - (offeringVariance / 10000))
  const attendanceConfidence = Math.max(20, 100 - (attendanceVariance / 100))

  return {
    members: Math.round(memberConfidence),
    offerings: Math.round(offeringConfidence),
    attendance: Math.round(attendanceConfidence),
    overall: Math.round((memberConfidence + offeringConfidence + attendanceConfidence) / 3)
  }
}

// 분산 계산
function calculateVariance(values: number[]): number {
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
  return variance
}

// 추천사항 생성
function generateRecommendations(trends: any, scenarios: any) {
  const recommendations = []

  if (trends.members.direction === '감소') {
    recommendations.push({
      category: '교인관리',
      priority: '높음',
      message: '교인수 감소 추세입니다. 새 교인 전도와 기존 교인 관리에 집중하세요.'
    })
  }

  if (trends.offerings.direction === '감소') {
    recommendations.push({
      category: '재정관리',
      priority: '높음',
      message: '헌금 감소 추세입니다. 재정 교육과 투명한 재정 보고를 강화하세요.'
    })
  }

  if (trends.attendance.direction === '감소') {
    recommendations.push({
      category: '예배관리',
      priority: '중간',
      message: '출석률 감소 추세입니다. 예배 프로그램 개선을 고려하세요.'
    })
  }

  if (recommendations.length === 0) {
    recommendations.push({
      category: '일반',
      priority: '낮음',
      message: '전반적으로 안정적인 상태입니다. 현재 수준을 유지하세요.'
    })
  }

  return recommendations
}

// 핵심 성과 지표 계산
async function calculateCoreMetrics(churchId: string, year: number, month?: number) {
  let startDate: Date
  let endDate: Date

  if (month) {
    startDate = new Date(year, month - 1, 1)
    endDate = endOfMonth(startDate)
  } else {
    startDate = startOfYear(new Date(year, 0, 1))
    endDate = endOfYear(new Date(year, 0, 1))
  }

  const [
    totalMembers,
    activeMembers,
    totalOfferings,
    avgAttendance,
    totalVisitations,
    newMembers
  ] = await Promise.all([
    prisma.member.count({ where: { churchId } }),
    prisma.member.count({ where: { churchId, status: 'ACTIVE' } }),
    prisma.offering.aggregate({
      _sum: { amount: true },
      where: { churchId, offeringDate: { gte: startDate, lte: endDate } }
    }),
    getAverageAttendance(churchId, startDate, endDate),
    prisma.visitation.count({
      where: {
        member: { churchId },
        visitDate: { gte: startDate, lte: endDate }
      }
    }),
    prisma.member.count({
      where: {
        churchId,
        registrationDate: { gte: startDate, lte: endDate }
      }
    })
  ])

  return {
    totalMembers,
    activeMembers,
    totalOfferings: Number(totalOfferings._sum.amount || 0),
    avgAttendance,
    totalVisitations,
    newMembers,
    memberRetentionRate: totalMembers > 0 ? (activeMembers / totalMembers) * 100 : 0,
    avgOfferingPerMember: activeMembers > 0 ? Number(totalOfferings._sum.amount || 0) / activeMembers : 0
  }
}

// 평균 출석수 계산
async function getAverageAttendance(churchId: string, startDate: Date, endDate: Date) {
  const attendanceData = await prisma.attendance.groupBy({
    by: ['attendanceDate'],
    where: {
      churchId,
      attendanceDate: { gte: startDate, lte: endDate }
    },
    _count: { id: true }
  })

  return attendanceData.length > 0
    ? Math.round(attendanceData.reduce((sum, day) => sum + day._count.id, 0) / attendanceData.length)
    : 0
}

// 벤치마킹 계산
async function calculateBenchmarks(churchId: string, year: number, month?: number) {
  const previousYear = year - 1
  const previousMetrics = await calculateCoreMetrics(churchId, previousYear, month)
  const currentMetrics = await calculateCoreMetrics(churchId, year, month)

  return {
    memberGrowth: calculateGrowthRate(previousMetrics.totalMembers, currentMetrics.totalMembers),
    offeringGrowth: calculateGrowthRate(previousMetrics.totalOfferings, currentMetrics.totalOfferings),
    attendanceGrowth: calculateGrowthRate(previousMetrics.avgAttendance, currentMetrics.avgAttendance),
    visitationGrowth: calculateGrowthRate(previousMetrics.totalVisitations, currentMetrics.totalVisitations)
  }
}

// 목표 대비 성과 계산 (임시로 고정값 사용)
async function calculateGoalComparisons(churchId: string, year: number, month?: number) {
  const currentMetrics = await calculateCoreMetrics(churchId, year, month)
  
  // 실제 구현시에는 목표값을 데이터베이스에서 조회해야 함
  const goals = {
    targetMembers: currentMetrics.totalMembers * 1.1, // 10% 증가 목표
    targetOfferings: currentMetrics.totalOfferings * 1.15, // 15% 증가 목표
    targetAttendance: currentMetrics.avgAttendance * 1.05, // 5% 증가 목표
    targetVisitations: Math.max(currentMetrics.totalMembers * 0.5, 50) // 교인의 50% 또는 최소 50회
  }

  return {
    memberAchievement: (currentMetrics.totalMembers / goals.targetMembers) * 100,
    offeringAchievement: (currentMetrics.totalOfferings / goals.targetOfferings) * 100,
    attendanceAchievement: (currentMetrics.avgAttendance / goals.targetAttendance) * 100,
    visitationAchievement: (currentMetrics.totalVisitations / goals.targetVisitations) * 100
  }
}

// 효율성 지표 계산
function calculateEfficiencyMetrics(metrics: any) {
  return {
    costPerMember: metrics.totalOfferings > 0 && metrics.totalMembers > 0 
      ? metrics.totalOfferings / metrics.totalMembers : 0,
    visitationEfficiency: metrics.totalVisitations > 0 && metrics.newMembers > 0
      ? metrics.totalVisitations / metrics.newMembers : 0,
    attendanceEfficiency: metrics.avgAttendance > 0 && metrics.activeMembers > 0
      ? (metrics.avgAttendance / metrics.activeMembers) * 100 : 0,
    offeringGrowthEfficiency: metrics.avgOfferingPerMember || 0
  }
}

// 교회 건강도 점수 계산
function calculateChurchHealthScore(metrics: any, benchmarks: any) {
  const scores = {
    memberHealth: Math.min(100, Math.max(0, 50 + benchmarks.memberGrowth)),
    financialHealth: Math.min(100, Math.max(0, 50 + benchmarks.offeringGrowth / 2)),
    attendanceHealth: Math.min(100, Math.max(0, 50 + benchmarks.attendanceGrowth)),
    engagementHealth: metrics.memberRetentionRate || 50
  }

  const total = (scores.memberHealth + scores.financialHealth + scores.attendanceHealth + scores.engagementHealth) / 4

  return {
    ...scores,
    total: Math.round(total),
    grade: total >= 80 ? 'A' : total >= 70 ? 'B' : total >= 60 ? 'C' : total >= 50 ? 'D' : 'F'
  }
}

// 성과 알림 생성
function generatePerformanceAlerts(metrics: any, benchmarks: any) {
  const alerts = []

  if (benchmarks.memberGrowth < -10) {
    alerts.push({
      type: 'warning',
      category: '교인관리',
      message: '교인수가 10% 이상 감소했습니다.'
    })
  }

  if (benchmarks.offeringGrowth < -15) {
    alerts.push({
      type: 'error',
      category: '재정관리',
      message: '헌금이 15% 이상 감소했습니다.'
    })
  }

  if (metrics.memberRetentionRate < 80) {
    alerts.push({
      type: 'warning',
      category: '교인관리',
      message: '교인 유지율이 80% 미만입니다.'
    })
  }

  if (benchmarks.attendanceGrowth < -5) {
    alerts.push({
      type: 'info',
      category: '예배관리',
      message: '출석률이 감소하고 있습니다.'
    })
  }

  return alerts
}