import { z } from 'zod'
import { router, protectedProcedure, managerProcedure } from '@/lib/trpc/server'
import { VisitationPurpose } from '@prisma/client'

// Input schemas
const visitationCreateSchema = z.object({
  memberId: z.string(),
  visitDate: z.string().transform((val) => new Date(val)),
  purpose: z.nativeEnum(VisitationPurpose),
  content: z.string().optional(),
  needsFollowUp: z.boolean().default(false),
  followUpDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
})

const visitationUpdateSchema = visitationCreateSchema.extend({
  id: z.string(),
})

const visitationQuerySchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  search: z.string().optional(),
  memberId: z.string().optional(),
  startDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
  endDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
  needsFollowUp: z.boolean().optional(),
  purpose: z.nativeEnum(VisitationPurpose).optional(),
})

const visitationStatsSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
}).optional()

export const visitationsRouter = router({
  // Get all visitations with pagination and filters
  getAll: protectedProcedure
    .input(visitationQuerySchema)
    .query(async ({ ctx, input }) => {
      const { page, limit, search, memberId, startDate, endDate, needsFollowUp, purpose } = input
      const skip = (page - 1) * limit

      const where = {
        member: {
          churchId: ctx.session.user.churchId,
          ...(search && {
            name: { contains: search, mode: 'insensitive' as const },
          }),
        },
        ...(memberId && { memberId }),
        ...(startDate && endDate && {
          visitDate: {
            gte: startDate,
            lte: endDate,
          },
        }),
        ...(needsFollowUp !== undefined && { needsFollowUp }),
        ...(purpose && { purpose }),
      }

      const [visitations, total] = await Promise.all([
        ctx.prisma.visitation.findMany({
          where,
          skip,
          take: limit,
          include: {
            member: {
              select: {
                id: true,
                name: true,
                phone: true,
                address: true,
              },
            },
          },
          orderBy: { visitDate: 'desc' },
        }),
        ctx.prisma.visitation.count({ where }),
      ])

      return {
        visitations,
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
      }
    }),

  // Get single visitation
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const visitation = await ctx.prisma.visitation.findFirst({
        where: {
          id: input.id,
          member: {
            churchId: ctx.session.user.churchId,
          },
        },
        include: {
          member: {
            select: {
              id: true,
              name: true,
              phone: true,
              address: true,
              birthDate: true,
              gender: true,
              maritalStatus: true,
              position: {
                select: {
                  name: true,
                },
              },
              department: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      })

      if (!visitation) {
        throw new Error('심방 기록을 찾을 수 없습니다')
      }

      return visitation
    }),

  // Get visitations by member
  getByMember: protectedProcedure
    .input(z.object({ 
      memberId: z.string(),
      limit: z.number().default(10),
    }))
    .query(async ({ ctx, input }) => {
      const visitations = await ctx.prisma.visitation.findMany({
        where: {
          memberId: input.memberId,
          member: {
            churchId: ctx.session.user.churchId,
          },
        },
        take: input.limit,
        orderBy: { visitDate: 'desc' },
        include: {
          member: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
        },
      })

      return visitations
    }),

  // Get upcoming follow-ups
  getUpcomingFollowUps: protectedProcedure
    .input(z.object({
      days: z.number().default(7), // Next 7 days
    }))
    .query(async ({ ctx, input }) => {
      const today = new Date()
      const futureDate = new Date()
      futureDate.setDate(today.getDate() + input.days)

      const followUps = await ctx.prisma.visitation.findMany({
        where: {
          member: {
            churchId: ctx.session.user.churchId,
          },
          needsFollowUp: true,
          followUpDate: {
            gte: today,
            lte: futureDate,
          },
        },
        include: {
          member: {
            select: {
              id: true,
              name: true,
              phone: true,
              address: true,
            },
          },
        },
        orderBy: { followUpDate: 'asc' },
      })

      return followUps
    }),

  // Get monthly calendar data
  getCalendarData: protectedProcedure
    .input(z.object({
      year: z.number(),
      month: z.number(), // 1-12
    }))
    .query(async ({ ctx, input }) => {
      const startOfMonth = new Date(input.year, input.month - 1, 1)
      const endOfMonth = new Date(input.year, input.month, 0)
      endOfMonth.setHours(23, 59, 59, 999)

      const [visitations, followUps] = await Promise.all([
        // Past visitations
        ctx.prisma.visitation.findMany({
          where: {
            member: {
              churchId: ctx.session.user.churchId,
            },
            visitDate: {
              gte: startOfMonth,
              lte: endOfMonth,
            },
          },
          include: {
            member: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
          },
          orderBy: { visitDate: 'asc' },
        }),
        // Upcoming follow-ups
        ctx.prisma.visitation.findMany({
          where: {
            member: {
              churchId: ctx.session.user.churchId,
            },
            needsFollowUp: true,
            followUpDate: {
              gte: startOfMonth,
              lte: endOfMonth,
            },
          },
          include: {
            member: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
          },
          orderBy: { followUpDate: 'asc' },
        }),
      ])

      return {
        visitations,
        followUps,
        year: input.year,
        month: input.month,
      }
    }),

  // Create new visitation
  create: managerProcedure
    .input(visitationCreateSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify member belongs to the same church
      const member = await ctx.prisma.member.findFirst({
        where: {
          id: input.memberId,
          churchId: ctx.session.user.churchId,
        },
      })

      if (!member) {
        throw new Error('교인을 찾을 수 없습니다')
      }

      const visitation = await ctx.prisma.visitation.create({
        data: {
          ...input,
          churchId: ctx.session.user.churchId,
        },
        include: {
          member: {
            select: {
              id: true,
              name: true,
              phone: true,
              address: true,
            },
          },
        },
      })

      return visitation
    }),

  // Update visitation
  update: managerProcedure
    .input(visitationUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input

      const visitation = await ctx.prisma.visitation.update({
        where: {
          id,
          member: {
            churchId: ctx.session.user.churchId,
          },
        },
        data,
        include: {
          member: {
            select: {
              id: true,
              name: true,
              phone: true,
              address: true,
            },
          },
        },
      })

      return visitation
    }),

  // Delete visitation
  delete: managerProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const visitation = await ctx.prisma.visitation.delete({
        where: {
          id: input.id,
          member: {
            churchId: ctx.session.user.churchId,
          },
        },
      })

      return visitation
    }),

  // Mark follow-up as completed
  completeFollowUp: managerProcedure
    .input(z.object({ 
      id: z.string(),
      completionNotes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const visitation = await ctx.prisma.visitation.update({
        where: {
          id: input.id,
          member: {
            churchId: ctx.session.user.churchId,
          },
        },
        data: {
          needsFollowUp: false,
          ...(input.completionNotes && {
            content: `[후속조치 완료] ${input.completionNotes}`
          }),
        },
        include: {
          member: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
        },
      })

      return visitation
    }),

  // Get visitation statistics
  getStats: protectedProcedure
    .input(visitationStatsSchema)
    .query(async ({ ctx, input }) => {
      const churchId = ctx.session.user.churchId
      const startDate = input?.startDate ? new Date(input.startDate) : undefined
      const endDate = input?.endDate ? new Date(input.endDate) : undefined

      const where = {
        member: { churchId },
        ...(startDate && endDate && {
          visitDate: {
            gte: startDate,
            lte: endDate,
          },
        }),
      }

      const [
        totalVisitations,
        followUpNeeded,
        completedFollowUps,
        membersCovered,
        recentVisitations,
        purposeStats,
        monthlyStats,
      ] = await Promise.all([
        ctx.prisma.visitation.count({ where }),
        ctx.prisma.visitation.count({ 
          where: { 
            ...where, 
            needsFollowUp: true,
            followUpDate: { gte: new Date() } // Future follow-ups only
          } 
        }),
        ctx.prisma.visitation.count({ 
          where: { 
            ...where, 
            needsFollowUp: false 
          } 
        }),
        ctx.prisma.visitation.groupBy({
          by: ['memberId'],
          where,
          _count: true,
        }),
        ctx.prisma.visitation.findMany({
          where: {
            member: { churchId },
            visitDate: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
            },
          },
          take: 10,
          include: {
            member: {
              select: { name: true },
            },
          },
          orderBy: { visitDate: 'desc' },
        }),
        ctx.prisma.visitation.groupBy({
          by: ['purpose'],
          where,
          _count: true,
        }),
        // Monthly statistics for the current year
        ctx.prisma.visitation.groupBy({
          by: ['visitDate'],
          where: {
            member: { churchId },
            visitDate: {
              gte: new Date(new Date().getFullYear(), 0, 1),
              lte: new Date(new Date().getFullYear(), 11, 31),
            },
          },
          _count: true,
        }),
      ])

      // Process monthly stats
      const monthlyData = Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        count: 0,
      }))

      monthlyStats.forEach(stat => {
        const month = new Date(stat.visitDate).getMonth()
        monthlyData[month].count += stat._count
      })

      return {
        totalVisitations,
        followUpNeeded,
        completedFollowUps,
        membersCovered: membersCovered.length,
        averageVisitsPerMember: membersCovered.length > 0 ? 
          totalVisitations / membersCovered.length : 0,
        recentVisitations,
        purposeStats: purposeStats.filter(p => p.purpose), // Filter out null purposes
        monthlyData,
      }
    }),

  // Get active members for visitation assignment
  getAvailableMembers: protectedProcedure
    .query(async ({ ctx }) => {
      const members = await ctx.prisma.member.findMany({
        where: {
          churchId: ctx.session.user.churchId,
          status: 'ACTIVE',
        },
        select: {
          id: true,
          name: true,
          phone: true,
          address: true,
          birthDate: true,
          position: {
            select: { name: true },
          },
          department: {
            select: { name: true },
          },
          // Get latest visitation date
          visitations: {
            select: { visitDate: true },
            orderBy: { visitDate: 'desc' },
            take: 1,
          },
        },
        orderBy: { name: 'asc' },
      })

      return members.map(member => ({
        ...member,
        lastVisitDate: member.visitations[0]?.visitDate || null,
        visitations: undefined, // Remove from response
      }))
    }),
})