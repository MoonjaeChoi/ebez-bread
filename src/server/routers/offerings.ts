import { z } from 'zod'
import { router, protectedProcedure, managerProcedure } from '@/lib/trpc/server'
import { OfferingType } from '@prisma/client'

// Input schemas
const offeringCreateSchema = z.object({
  memberId: z.string(),
  amount: z.number().positive('헌금액은 0보다 커야 합니다'),
  offeringType: z.nativeEnum(OfferingType),
  description: z.string().optional(),
  offeringDate: z.string().transform((val) => new Date(val)),
})

const offeringUpdateSchema = offeringCreateSchema.extend({
  id: z.string(),
})

const offeringQuerySchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  search: z.string().optional(),
  offeringType: z.nativeEnum(OfferingType).optional(),
  memberId: z.string().optional(),
  startDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
  endDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
})

export const offeringsRouter = router({
  // Get all offerings with pagination and filters
  getAll: protectedProcedure
    .input(offeringQuerySchema)
    .query(async ({ ctx, input }) => {
      const { page, limit, search, offeringType, memberId, startDate, endDate } = input
      const skip = (page - 1) * limit

      const where = {
        churchId: ctx.session.user.churchId,
        ...(search && {
          OR: [
            { member: { name: { contains: search, mode: 'insensitive' as const } } },
            { description: { contains: search, mode: 'insensitive' as const } },
          ],
        }),
        ...(offeringType && { offeringType }),
        ...(memberId && { memberId }),
        ...(startDate && endDate && {
          offeringDate: {
            gte: startDate,
            lte: endDate,
          },
        }),
      }

      const [offerings, total] = await Promise.all([
        ctx.prisma.offering.findMany({
          where,
          skip,
          take: limit,
          include: {
            member: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
          },
          orderBy: { offeringDate: 'desc' },
        }),
        ctx.prisma.offering.count({ where }),
      ])

      return {
        offerings,
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
      }
    }),

  // Get single offering
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const offering = await ctx.prisma.offering.findFirst({
        where: {
          id: input.id,
          churchId: ctx.session.user.churchId,
        },
        include: {
          member: true,
        },
      })

      if (!offering) {
        throw new Error('헌금 기록을 찾을 수 없습니다')
      }

      return offering
    }),

  // Create new offering
  create: managerProcedure
    .input(offeringCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const offering = await ctx.prisma.offering.create({
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
            },
          },
        },
      })

      return offering
    }),

  // Update offering
  update: managerProcedure
    .input(offeringUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input

      const offering = await ctx.prisma.offering.update({
        where: {
          id,
          churchId: ctx.session.user.churchId,
        },
        data,
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

      return offering
    }),

  // Delete offering
  delete: managerProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const offering = await ctx.prisma.offering.delete({
        where: {
          id: input.id,
          churchId: ctx.session.user.churchId,
        },
      })

      return offering
    }),

  // Get offering statistics
  getStats: protectedProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const churchId = ctx.session.user.churchId
      const startDate = input?.startDate ? new Date(input.startDate) : undefined
      const endDate = input?.endDate ? new Date(input.endDate) : undefined

      const where = {
        churchId,
        ...(startDate && endDate && {
          offeringDate: {
            gte: startDate,
            lte: endDate,
          },
        }),
      }

      const [
        totalAmount,
        totalCount,
        byType,
        monthlyStats,
      ] = await Promise.all([
        ctx.prisma.offering.aggregate({
          where,
          _sum: { amount: true },
        }),
        ctx.prisma.offering.count({ where }),
        ctx.prisma.offering.groupBy({
          by: ['offeringType'],
          where,
          _sum: { amount: true },
          _count: true,
        }),
        // Get monthly statistics for the current year
        ctx.prisma.offering.groupBy({
          by: ['offeringDate'],
          where: {
            churchId,
            offeringDate: {
              gte: new Date(new Date().getFullYear(), 0, 1),
              lte: new Date(new Date().getFullYear(), 11, 31),
            },
          },
          _sum: { amount: true },
          _count: true,
        }),
      ])

      // Process monthly stats
      const monthlyData = Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        amount: 0,
        count: 0,
      }))

      monthlyStats.forEach(stat => {
        const month = new Date(stat.offeringDate).getMonth()
        monthlyData[month].amount += Number(stat._sum.amount) || 0
        monthlyData[month].count += stat._count
      })

      return {
        totalAmount: Number(totalAmount._sum.amount) || 0,
        totalCount,
        byType,
        monthlyData,
      }
    }),

  // Get active members for dropdown
  getMembers: protectedProcedure
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
        },
        orderBy: { name: 'asc' },
      })
      return members
    }),
})