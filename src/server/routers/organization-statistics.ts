import { z } from 'zod'
import { router, protectedProcedure } from '@/lib/trpc/server'

// 통계 조회 공통 스키마
const statisticsQuerySchema = z.object({
  organizationId: z.string().optional(), // 특정 조직으로 필터링
  includeInactive: z.boolean().default(false),
  dateFrom: z.date().optional(), // 기간 필터
  dateTo: z.date().optional(),
})

const timeRangeSchema = z.object({
  period: z.enum(['month', 'year']).default('month'),
  months: z.number().int().min(1).max(60).default(12), // 최대 5년
})

export const organizationStatisticsRouter = router({
  // 조직별 구성원 수 통계
  getOrganizationMemberCount: protectedProcedure
    .input(statisticsQuerySchema)
    .query(async ({ ctx, input }) => {
      const { organizationId, includeInactive, dateFrom, dateTo } = input
      const churchId = ctx.session.user.churchId

      // 날짜 필터 조건 구성
      const dateFilter = dateFrom && dateTo ? {
        joinDate: {
          gte: dateFrom,
          lte: dateTo,
        },
      } : {}

      const organizations = await ctx.prisma.organization.findMany({
        where: {
          churchId,
          isActive: true,
          ...(organizationId && { id: organizationId }),
        },
        include: {
          _count: {
            select: {
              organizationMemberships: {
                where: {
                  ...(!includeInactive && { isActive: true }),
                  ...dateFilter,
                },
              },
            },
          },
          // 활성 및 비활성 멤버십을 별도로 카운트
          organizationMemberships: {
            where: dateFilter,
            select: {
              isActive: true,
            },
          },
        },
        orderBy: [
          { level: 'asc' },
          { sortOrder: 'asc' },
          { name: 'asc' },
        ],
      })

      return organizations.map((org) => {
        const activeMemberships = org.organizationMemberships.filter(m => m.isActive).length
        const inactiveMemberships = org.organizationMemberships.length - activeMemberships

        return {
          organizationId: org.id,
          organizationName: org.name,
          organizationCode: org.code,
          level: org.level,
          totalMembers: org.organizationMemberships.length,
          activeMembers: activeMemberships,
          inactiveMembers: inactiveMemberships,
          parentId: org.parentId,
        }
      })
    }),

  // 직책별 인원 현황 통계
  getRoleDistribution: protectedProcedure
    .input(statisticsQuerySchema)
    .query(async ({ ctx, input }) => {
      const { organizationId, includeInactive } = input
      const churchId = ctx.session.user.churchId

      const roles = await ctx.prisma.organizationRole.findMany({
        where: {
          churchId,
          isActive: true,
        },
        include: {
          _count: {
            select: {
              memberships: {
                where: {
                  ...(!includeInactive && { isActive: true }),
                  ...(organizationId && { organizationId }),
                },
              },
            },
          },
        },
        orderBy: [
          { level: 'desc' },
          { name: 'asc' },
        ],
      })

      // 직책 없는 구성원 수 계산
      const noRoleMemberships = await ctx.prisma.organizationMembership.count({
        where: {
          roleId: null,
          organization: { churchId },
          ...(!includeInactive && { isActive: true }),
          ...(organizationId && { organizationId }),
        },
      })

      const roleStats = roles.map((role) => ({
        roleId: role.id,
        roleName: role.name,
        englishName: role.englishName || null,
        level: role.level,
        isLeadership: role.isLeadership,
        memberCount: role._count.memberships,
      }))

      // 직책 없는 구성원 추가
      if (noRoleMemberships > 0) {
        roleStats.push({
          roleId: 'no-role', // null 대신 문자열 사용
          roleName: '직책 없음',
          englishName: 'No Role',
          level: 0,
          isLeadership: false,
          memberCount: noRoleMemberships,
        })
      }

      const totalMembers = roleStats.reduce((sum, role) => sum + role.memberCount, 0)

      return {
        roles: roleStats.map((role) => ({
          ...role,
          percentage: totalMembers > 0 ? (role.memberCount / totalMembers) * 100 : 0,
        })),
        totalMembers,
        leadershipMembers: roleStats
          .filter(role => role.isLeadership)
          .reduce((sum, role) => sum + role.memberCount, 0),
      }
    }),

  // 참여 기간별 분포 통계
  getTenureDistribution: protectedProcedure
    .input(statisticsQuerySchema)
    .query(async ({ ctx, input }) => {
      const { organizationId, includeInactive } = input
      const churchId = ctx.session.user.churchId
      const currentDate = new Date()

      const memberships = await ctx.prisma.organizationMembership.findMany({
        where: {
          organization: { churchId },
          ...(!includeInactive && { isActive: true }),
          ...(organizationId && { organizationId }),
        },
        select: {
          joinDate: true,
          endDate: true,
          isActive: true,
        },
      })

      // 기간 구간 정의 (개월 단위)
      const tenureRanges = [
        { label: '0-6개월', min: 0, max: 6 },
        { label: '6개월-1년', min: 6, max: 12 },
        { label: '1-2년', min: 12, max: 24 },
        { label: '2-5년', min: 24, max: 60 },
        { label: '5-10년', min: 60, max: 120 },
        { label: '10년 이상', min: 120, max: Infinity },
      ]

      const distribution = tenureRanges.map((range) => {
        const membersInRange = memberships.filter((membership) => {
          const endDate = membership.isActive ? currentDate : membership.endDate || currentDate
          const tenureMonths = Math.floor(
            (endDate.getTime() - membership.joinDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
          )
          
          return tenureMonths >= range.min && tenureMonths < range.max
        })

        const totalTenureMonths = membersInRange.reduce((sum, membership) => {
          const endDate = membership.isActive ? currentDate : membership.endDate || currentDate
          const tenureMonths = Math.floor(
            (endDate.getTime() - membership.joinDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
          )
          return sum + tenureMonths
        }, 0)

        return {
          periodRange: range.label,
          memberCount: membersInRange.length,
          averageTenure: membersInRange.length > 0 ? totalTenureMonths / membersInRange.length : 0,
        }
      })

      return {
        distribution,
        totalMembers: memberships.length,
      }
    }),

  // 조직 계층별 리더십 현황
  getLeadershipByLevel: protectedProcedure
    .input(statisticsQuerySchema)
    .query(async ({ ctx, input }) => {
      const { includeInactive } = input
      const churchId = ctx.session.user.churchId

      const levelStats = await Promise.all([
        'LEVEL_1', 'LEVEL_2', 'LEVEL_3', 'LEVEL_4', 'LEVEL_5'
      ].map(async (level) => {
        // 해당 레벨의 조직들
        const organizations = await ctx.prisma.organization.findMany({
          where: {
            churchId,
            level: level as any,
            isActive: true,
          },
        })

        if (organizations.length === 0) {
          return {
            organizationLevel: level,
            totalOrganizations: 0,
            totalPositions: 0,
            filledPositions: 0,
            vacantPositions: 0,
            leadershipRatio: 0,
          }
        }

        const organizationIds = organizations.map(org => org.id)

        // 리더십 직책을 가진 멤버십 수
        const leadershipMemberships = await ctx.prisma.organizationMembership.count({
          where: {
            organizationId: { in: organizationIds },
            role: { isLeadership: true },
            ...(!includeInactive && { isActive: true }),
          },
        })

        // 전체 멤버십 수
        const totalMemberships = await ctx.prisma.organizationMembership.count({
          where: {
            organizationId: { in: organizationIds },
            ...(!includeInactive && { isActive: true }),
          },
        })

        return {
          organizationLevel: level,
          totalOrganizations: organizations.length,
          totalMemberships,
          leadershipMemberships,
          leadershipRatio: totalMemberships > 0 ? (leadershipMemberships / totalMemberships) * 100 : 0,
        }
      }))

      return levelStats.filter(stat => stat.totalOrganizations > 0)
    }),

  // 월별/연도별 구성원 변화 추이
  getMembershipTrends: protectedProcedure
    .input(statisticsQuerySchema.merge(timeRangeSchema))
    .query(async ({ ctx, input }) => {
      const { organizationId, period, months } = input
      const churchId = ctx.session.user.churchId
      const endDate = new Date()
      const startDate = new Date()
      
      if (period === 'month') {
        startDate.setMonth(startDate.getMonth() - months)
      } else {
        startDate.setFullYear(startDate.getFullYear() - Math.ceil(months / 12))
      }

      // 변경 이력에서 기간별 추이 데이터 추출
      const historyRecords = await ctx.prisma.organizationMembershipHistory.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          membership: {
            organization: {
              churchId,
              ...(organizationId && { id: organizationId }),
            },
          },
        },
        include: {
          membership: {
            select: {
              organizationId: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      })

      // 기간별 그룹화
      const periodGroups = new Map<string, {
        newJoins: number
        departures: number
        transfers: number
        activations: number
        deactivations: number
      }>()

      historyRecords.forEach((record) => {
        const date = new Date(record.createdAt)
        const periodKey = period === 'month' 
          ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          : `${date.getFullYear()}`

        if (!periodGroups.has(periodKey)) {
          periodGroups.set(periodKey, {
            newJoins: 0,
            departures: 0,
            transfers: 0,
            activations: 0,
            deactivations: 0,
          })
        }

        const group = periodGroups.get(periodKey)!
        
        switch (record.changeType) {
          case 'ACTIVATED':
            group.activations++
            break
          case 'DEACTIVATED':
            group.deactivations++
            break
          case 'TRANSFERRED_IN':
            group.transfers++
            break
          case 'TRANSFERRED_OUT':
            group.transfers++
            break
        }
      })

      // 현재 전체 멤버십 수 계산
      const currentTotal = await ctx.prisma.organizationMembership.count({
        where: {
          organization: { churchId },
          isActive: true,
          ...(organizationId && { organizationId }),
        },
      })

      // 결과 정렬 및 포맷팅
      const trends = Array.from(periodGroups.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([periodKey, data]) => ({
          period: periodKey,
          newJoins: data.activations,
          departures: data.deactivations,
          transfers: data.transfers,
          netChange: data.activations - data.deactivations,
        }))

      return {
        trends,
        currentTotal,
        period,
      }
    }),

  // 대시보드 요약 통계
  getDashboardSummary: protectedProcedure
    .input(statisticsQuerySchema)
    .query(async ({ ctx, input }) => {
      const { organizationId, includeInactive } = input
      const churchId = ctx.session.user.churchId

      const [
        totalOrganizations,
        totalMembers,
        totalRoles,
        leadershipMembers
      ] = await Promise.all([
        // 활성 조직 수
        ctx.prisma.organization.count({
          where: {
            churchId,
            isActive: true,
            ...(organizationId && { id: organizationId }),
          },
        }),
        // 전체 멤버 수
        ctx.prisma.organizationMembership.count({
          where: {
            organization: { 
              churchId,
              ...(organizationId && { id: organizationId }),
            },
            ...(!includeInactive && { isActive: true }),
          },
        }),
        // 활성 직책 수
        ctx.prisma.organizationRole.count({
          where: {
            churchId,
            isActive: true,
          },
        }),
        // 리더십 직책을 가진 멤버 수
        ctx.prisma.organizationMembership.count({
          where: {
            organization: { 
              churchId,
              ...(organizationId && { id: organizationId }),
            },
            role: { isLeadership: true },
            ...(!includeInactive && { isActive: true }),
          },
        }),
      ])

      return {
        totalOrganizations,
        totalMembers,
        totalRoles,
        leadershipMembers,
        leadershipRatio: totalMembers > 0 ? (leadershipMembers / totalMembers) * 100 : 0,
      }
    }),
})