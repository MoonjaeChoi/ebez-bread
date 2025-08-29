import { z } from 'zod'
import { router, protectedProcedure, adminProcedure } from '@/lib/trpc/server'
import { TRPCError } from '@trpc/server'

// Input schemas
const roleCreateSchema = z.object({
  name: z.string().min(1, '직책명을 입력해주세요').max(50, '직책명은 50자 이내로 입력해주세요'),
  englishName: z.string().max(100, '영문명은 100자 이내로 입력해주세요').optional(),
  description: z.string().max(200, '설명은 200자 이내로 입력해주세요').optional(),
  level: z.number().int().min(0).max(100).default(0),
  isLeadership: z.boolean().default(false),
  sortOrder: z.number().int().min(0).default(0),
})

const roleUpdateSchema = roleCreateSchema.extend({
  id: z.string(),
  isActive: z.boolean().optional(),
})

const roleQuerySchema = z.object({
  isLeadership: z.boolean().optional(),
  isActive: z.boolean().default(true),
  minLevel: z.number().int().min(0).max(100).optional(),
  maxLevel: z.number().int().min(0).max(100).optional(),
  includeStats: z.boolean().default(false),
})

export const organizationRolesRouter = router({
  // 전체 직책 조회
  getAll: protectedProcedure
    .input(roleQuerySchema)
    .query(async ({ ctx, input }) => {
      const { isLeadership, isActive, minLevel, maxLevel, includeStats } = input

      const where = {
        churchId: ctx.session.user.churchId,
        ...(isLeadership !== undefined && { isLeadership }),
        ...(isActive !== undefined && { isActive }),
        ...(minLevel !== undefined && { level: { gte: minLevel } }),
        ...(maxLevel !== undefined && { 
          level: { 
            ...(minLevel !== undefined && { gte: minLevel }), 
            lte: maxLevel 
          } 
        }),
      }

      const roles = await ctx.prisma.organizationRole.findMany({
        where,
        ...(includeStats && {
          include: {
            _count: {
              select: {
                memberships: true,
              },
            },
          },
        }),
        orderBy: [
          { level: 'desc' },
          { sortOrder: 'asc' },
          { name: 'asc' },
        ],
      })

      return roles
    }),

  // 리더십 직책만 조회
  getLeadershipRoles: protectedProcedure
    .query(async ({ ctx }) => {
      return await ctx.prisma.organizationRole.findMany({
        where: {
          churchId: ctx.session.user.churchId,
          isActive: true,
          isLeadership: true,
        },
        orderBy: [
          { level: 'desc' },
          { name: 'asc' },
        ],
      })
    }),

  // 직책별 멤버 조회
  getMembersByRole: protectedProcedure
    .input(z.object({
      roleId: z.string(),
      organizationId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { roleId, organizationId } = input

      const where = {
        roleId,
        isActive: true,
        ...(organizationId && { organizationId }),
      }

      return await ctx.prisma.organizationMembership.findMany({
        where,
        include: {
          member: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
              photoUrl: true,
              position: {
                select: {
                  id: true,
                  name: true,
                }
              }
            },
          },
          organization: {
            select: {
              id: true,
              name: true,
              code: true,
              level: true,
            },
          },
        },
        orderBy: [
          { organization: { name: 'asc' } },
          { member: { name: 'asc' } },
        ],
      })
    }),

  // 직책 생성
  create: adminProcedure
    .input(roleCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const { name, englishName, description, level, isLeadership, sortOrder } = input

      // 중복 체크
      const existingRole = await ctx.prisma.organizationRole.findFirst({
        where: {
          churchId: ctx.session.user.churchId,
          name,
        },
      })

      if (existingRole) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: '같은 이름의 직책이 이미 존재합니다',
        })
      }

      return await ctx.prisma.organizationRole.create({
        data: {
          name,
          englishName,
          description,
          level,
          isLeadership,
          sortOrder,
          churchId: ctx.session.user.churchId,
        },
      })
    }),

  // 직책 수정
  update: adminProcedure
    .input(roleUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, name, englishName, description, level, isLeadership, sortOrder, isActive } = input

      // 기존 직책 존재 여부 확인
      const existingRole = await ctx.prisma.organizationRole.findFirst({
        where: {
          id,
          churchId: ctx.session.user.churchId,
        },
      })

      if (!existingRole) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '직책을 찾을 수 없습니다',
        })
      }

      // 다른 직책과 이름 중복 체크
      if (name !== existingRole.name) {
        const duplicateRole = await ctx.prisma.organizationRole.findFirst({
          where: {
            churchId: ctx.session.user.churchId,
            name,
            id: { not: id },
          },
        })

        if (duplicateRole) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: '같은 이름의 직책이 이미 존재합니다',
          })
        }
      }

      return await ctx.prisma.organizationRole.update({
        where: { id },
        data: {
          name,
          englishName,
          description,
          level,
          isLeadership,
          sortOrder,
          ...(isActive !== undefined && { isActive }),
        },
      })
    }),

  // 직책 비활성화
  deactivate: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { id } = input

      // 기존 직책 존재 여부 확인
      const existingRole = await ctx.prisma.organizationRole.findFirst({
        where: {
          id,
          churchId: ctx.session.user.churchId,
        },
      })

      if (!existingRole) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '직책을 찾을 수 없습니다',
        })
      }

      // 해당 직책을 사용 중인 멤버십이 있는지 확인
      const activeMembers = await ctx.prisma.organizationMembership.count({
        where: {
          roleId: id,
          isActive: true,
        },
      })

      if (activeMembers > 0) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: `이 직책을 사용 중인 ${activeMembers}명의 활성 멤버가 있습니다. 먼저 해당 멤버들의 직책을 변경해주세요.`,
        })
      }

      return await ctx.prisma.organizationRole.update({
        where: { id },
        data: { isActive: false },
      })
    }),

  // 직책 삭제
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { id } = input

      // 기존 직책 존재 여부 확인
      const existingRole = await ctx.prisma.organizationRole.findFirst({
        where: {
          id,
          churchId: ctx.session.user.churchId,
        },
      })

      if (!existingRole) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '직책을 찾을 수 없습니다',
        })
      }

      // 해당 직책을 사용 중인 멤버십이 있는지 확인 (비활성 포함)
      const membersWithRole = await ctx.prisma.organizationMembership.count({
        where: {
          roleId: id,
        },
      })

      if (membersWithRole > 0) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: '이 직책을 사용한 이력이 있어 삭제할 수 없습니다. 대신 비활성화해주세요.',
        })
      }

      await ctx.prisma.organizationRole.delete({
        where: { id },
      })

      return { success: true }
    }),

  // 직책 통계
  getStats: protectedProcedure
    .query(async ({ ctx }) => {
      const churchId = ctx.session.user.churchId

      // 전체 직책 수
      const totalRoles = await ctx.prisma.organizationRole.count({
        where: { churchId, isActive: true },
      })

      // 리더십 직책 수
      const leadershipRoles = await ctx.prisma.organizationRole.count({
        where: { 
          churchId, 
          isActive: true, 
          isLeadership: true 
        },
      })

      // 직책별 멤버 수 통계
      const roleUsageStats = await ctx.prisma.organizationRole.findMany({
        where: { churchId, isActive: true },
        select: {
          id: true,
          name: true,
          level: true,
          isLeadership: true,
          _count: {
            select: {
              memberships: {
                where: { isActive: true },
              },
            },
          },
        },
        orderBy: [
          { level: 'desc' },
          { name: 'asc' },
        ],
      })

      // 가장 많이 사용되는 직책 TOP 5
      const topUsedRoles = roleUsageStats
        .sort((a, b) => b._count.memberships - a._count.memberships)
        .slice(0, 5)

      // 사용되지 않는 직책
      const unusedRoles = roleUsageStats.filter(
        role => role._count.memberships === 0
      )

      return {
        totalRoles,
        leadershipRoles,
        nonLeadershipRoles: totalRoles - leadershipRoles,
        roleUsageStats,
        topUsedRoles,
        unusedRoles,
        totalMembersWithRoles: roleUsageStats.reduce(
          (sum, role) => sum + role._count.memberships, 
          0
        ),
      }
    }),

  // 레벨별 직책 분포
  getLevelDistribution: protectedProcedure
    .query(async ({ ctx }) => {
      const levelRanges = [
        { min: 90, max: 100, label: '최고위급 (90-100)' },
        { min: 70, max: 89, label: '고위급 (70-89)' },
        { min: 50, max: 69, label: '중급 (50-69)' },
        { min: 30, max: 49, label: '하위 관리직 (30-49)' },
        { min: 10, max: 29, label: '일반직 (10-29)' },
        { min: 0, max: 9, label: '보조직 (0-9)' },
      ]

      const distribution = await Promise.all(
        levelRanges.map(async (range) => {
          const count = await ctx.prisma.organizationRole.count({
            where: {
              churchId: ctx.session.user.churchId,
              isActive: true,
              level: {
                gte: range.min,
                lte: range.max,
              },
            },
          })

          const leadershipCount = await ctx.prisma.organizationRole.count({
            where: {
              churchId: ctx.session.user.churchId,
              isActive: true,
              isLeadership: true,
              level: {
                gte: range.min,
                lte: range.max,
              },
            },
          })

          return {
            range: range.label,
            total: count,
            leadership: leadershipCount,
            nonLeadership: count - leadershipCount,
          }
        })
      )

      return distribution
    }),
})