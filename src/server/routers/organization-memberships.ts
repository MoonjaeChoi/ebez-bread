import { z } from 'zod'
import { router, protectedProcedure, adminProcedure } from '@/lib/trpc/server'
import { TRPCError } from '@trpc/server'

// Input schemas
const membershipCreateSchema = z.object({
  memberId: z.string().min(1, '교인을 선택해주세요'),
  organizationId: z.string().min(1, '조직을 선택해주세요'),
  roleId: z.string().optional(),
  isPrimary: z.boolean().default(false),
  joinDate: z.date().optional(),
  notes: z.string().optional(),
})

const membershipUpdateSchema = z.object({
  id: z.string(),
  roleId: z.string().optional().nullable(),
  isPrimary: z.boolean().optional(),
  endDate: z.date().optional().nullable(),
  notes: z.string().optional(),
})

const membershipQuerySchema = z.object({
  organizationId: z.string().optional(),
  memberId: z.string().optional(),
  roleId: z.string().optional(),
  isActive: z.boolean().optional(),
  includeInactive: z.boolean().default(false),
})

export const organizationMembershipsRouter = router({
  // 조직별 멤버십 조회
  getByOrganization: protectedProcedure
    .input(z.object({ 
      organizationId: z.string(),
      includeInactive: z.boolean().default(false) 
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId, includeInactive } = input

      // 조직 접근 권한 확인
      const organization = await ctx.prisma.organization.findFirst({
        where: {
          id: organizationId,
          churchId: ctx.session.user.churchId,
        },
      })

      if (!organization) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '조직을 찾을 수 없습니다',
        })
      }

      return await ctx.prisma.organizationMembership.findMany({
        where: {
          organizationId,
          ...(includeInactive ? {} : { isActive: true }),
        },
        include: {
          member: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
              photoUrl: true,
              birthDate: true,
              gender: true,
              maritalStatus: true,
              position: {
                select: {
                  id: true,
                  name: true,
                }
              }
            },
          },
          role: {
            select: {
              id: true,
              name: true,
              englishName: true,
              level: true,
              isLeadership: true,
              description: true,
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
          { role: { level: 'desc' } },
          { isPrimary: 'desc' },
          { member: { name: 'asc' } },
        ],
      })
    }),

  // 교인별 멤버십 조회
  getByMember: protectedProcedure
    .input(z.object({ 
      memberId: z.string(),
      includeInactive: z.boolean().default(false) 
    }))
    .query(async ({ ctx, input }) => {
      const { memberId, includeInactive } = input

      // 교인 접근 권한 확인
      const member = await ctx.prisma.member.findFirst({
        where: {
          id: memberId,
          churchId: ctx.session.user.churchId,
        },
      })

      if (!member) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '교인을 찾을 수 없습니다',
        })
      }

      return await ctx.prisma.organizationMembership.findMany({
        where: {
          memberId,
          ...(includeInactive ? {} : { isActive: true }),
        },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              code: true,
              level: true,
              description: true,
              parent: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                }
              }
            },
          },
          role: {
            select: {
              id: true,
              name: true,
              englishName: true,
              level: true,
              isLeadership: true,
              description: true,
            },
          },
        },
        orderBy: [
          { isPrimary: 'desc' },
          { role: { level: 'desc' } },
          { organization: { name: 'asc' } },
        ],
      })
    }),

  // 조직별 리더십 조회
  getLeadersByOrganization: protectedProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = input

      return await ctx.prisma.organizationMembership.findMany({
        where: {
          organizationId,
          isActive: true,
          role: {
            isLeadership: true,
          },
        },
        include: {
          member: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
              photoUrl: true,
            },
          },
          role: {
            select: {
              id: true,
              name: true,
              englishName: true,
              level: true,
              isLeadership: true,
              description: true,
            },
          },
        },
        orderBy: [
          { role: { level: 'desc' } },
          { member: { name: 'asc' } },
        ],
      })
    }),

  // 멤버십 생성
  create: adminProcedure
    .input(membershipCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const { memberId, organizationId, roleId, isPrimary, joinDate, notes } = input

      // 중복 체크 - 같은 조직에서 활성 멤버십이 이미 있는지
      const existingMembership = await ctx.prisma.organizationMembership.findFirst({
        where: {
          memberId,
          organizationId,
          isActive: true,
        },
      })

      if (existingMembership) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: '해당 교인은 이미 이 조직의 멤버입니다',
        })
      }

      // 교인과 조직이 같은 교회에 속해있는지 확인
      const member = await ctx.prisma.member.findFirst({
        where: {
          id: memberId,
          churchId: ctx.session.user.churchId,
        },
      })

      const organization = await ctx.prisma.organization.findFirst({
        where: {
          id: organizationId,
          churchId: ctx.session.user.churchId,
        },
      })

      if (!member || !organization) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '교인 또는 조직을 찾을 수 없습니다',
        })
      }

      // 직책이 지정된 경우 유효성 확인
      if (roleId) {
        const role = await ctx.prisma.organizationRole.findFirst({
          where: {
            id: roleId,
            churchId: ctx.session.user.churchId,
          },
        })

        if (!role) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: '직책을 찾을 수 없습니다',
          })
        }
      }

      return await ctx.prisma.organizationMembership.create({
        data: {
          memberId,
          organizationId,
          roleId,
          isPrimary,
          joinDate: joinDate || new Date(),
          notes,
        },
        include: {
          member: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
            },
          },
          organization: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          role: {
            select: {
              id: true,
              name: true,
              englishName: true,
              level: true,
              isLeadership: true,
            },
          },
        },
      })
    }),

  // 멤버십 수정
  update: adminProcedure
    .input(membershipUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, roleId, isPrimary, endDate, notes } = input

      // 기존 멤버십 존재 여부 확인
      const existingMembership = await ctx.prisma.organizationMembership.findFirst({
        where: {
          id,
          organization: {
            churchId: ctx.session.user.churchId,
          },
        },
      })

      if (!existingMembership) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '멤버십을 찾을 수 없습니다',
        })
      }

      // 직책 변경의 경우 유효성 확인
      if (roleId !== undefined) {
        if (roleId) {
          const role = await ctx.prisma.organizationRole.findFirst({
            where: {
              id: roleId,
              churchId: ctx.session.user.churchId,
            },
          })

          if (!role) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: '직책을 찾을 수 없습니다',
            })
          }
        }
      }

      return await ctx.prisma.organizationMembership.update({
        where: { id },
        data: {
          ...(roleId !== undefined && { roleId }),
          ...(isPrimary !== undefined && { isPrimary }),
          ...(endDate !== undefined && { endDate }),
          ...(notes !== undefined && { notes }),
          // 종료일이 설정되면 비활성화
          ...(endDate && { isActive: false }),
        },
        include: {
          member: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
            },
          },
          organization: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          role: {
            select: {
              id: true,
              name: true,
              englishName: true,
              level: true,
              isLeadership: true,
            },
          },
        },
      })
    }),

  // 멤버십 종료 (비활성화)
  deactivate: adminProcedure
    .input(z.object({
      id: z.string(),
      endDate: z.date().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, endDate, notes } = input

      const existingMembership = await ctx.prisma.organizationMembership.findFirst({
        where: {
          id,
          organization: {
            churchId: ctx.session.user.churchId,
          },
        },
      })

      if (!existingMembership) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '멤버십을 찾을 수 없습니다',
        })
      }

      return await ctx.prisma.organizationMembership.update({
        where: { id },
        data: {
          isActive: false,
          endDate: endDate || new Date(),
          notes,
        },
      })
    }),

  // 멤버십 삭제
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { id } = input

      const existingMembership = await ctx.prisma.organizationMembership.findFirst({
        where: {
          id,
          organization: {
            churchId: ctx.session.user.churchId,
          },
        },
      })

      if (!existingMembership) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '멤버십을 찾을 수 없습니다',
        })
      }

      await ctx.prisma.organizationMembership.delete({
        where: { id },
      })

      return { success: true }
    }),

  // 조직별 멤버십 통계
  getStatsByOrganization: protectedProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = input

      // 전체 멤버 수
      const totalMembers = await ctx.prisma.organizationMembership.count({
        where: {
          organizationId,
          isActive: true,
        },
      })

      // 리더십 직책 보유자 수
      const leadershipMembers = await ctx.prisma.organizationMembership.count({
        where: {
          organizationId,
          isActive: true,
          role: {
            isLeadership: true,
          },
        },
      })

      // 직책별 통계
      const roleStats = await ctx.prisma.organizationMembership.groupBy({
        by: ['roleId'],
        where: {
          organizationId,
          isActive: true,
          roleId: { not: null },
        },
        _count: {
          id: true,
        },
      })

      // 직책 정보와 함께 결합
      const rolesWithCounts = await Promise.all(
        roleStats.map(async (stat) => {
          const role = await ctx.prisma.organizationRole.findUnique({
            where: { id: stat.roleId! },
            select: {
              id: true,
              name: true,
              englishName: true,
              level: true,
              isLeadership: true,
            },
          })
          return {
            role,
            count: stat._count.id,
          }
        })
      )

      return {
        totalMembers,
        leadershipMembers,
        roleStats: rolesWithCounts,
        noRoleMembers: totalMembers - roleStats.reduce((sum, stat) => sum + stat._count.id, 0),
      }
    }),
})