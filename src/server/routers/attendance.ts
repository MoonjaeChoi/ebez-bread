import { z } from 'zod'
import { router, protectedProcedure, managerProcedure } from '@/lib/trpc/server'
import { ServiceType } from '@prisma/client'

// Input schemas
const attendanceCreateSchema = z.object({
  memberId: z.string(),
  serviceType: z.nativeEnum(ServiceType),
  attendanceDate: z.string().transform((val) => new Date(val)),
  isPresent: z.boolean().default(true),
  notes: z.string().optional(),
})

const attendanceUpdateSchema = attendanceCreateSchema.extend({
  id: z.string(),
})

const attendanceQuerySchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  search: z.string().optional(),
  serviceType: z.nativeEnum(ServiceType).optional(),
  memberId: z.string().optional(),
  startDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
  endDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
  isPresent: z.boolean().optional(),
})

const bulkAttendanceSchema = z.object({
  serviceType: z.nativeEnum(ServiceType),
  attendanceDate: z.string().transform((val) => new Date(val)),
  attendances: z.array(z.object({
    memberId: z.string(),
    isPresent: z.boolean(),
    notes: z.string().optional(),
  })),
})

export const attendanceRouter = router({
  // Get all attendance records with pagination and filters
  getAll: protectedProcedure
    .input(attendanceQuerySchema)
    .query(async ({ ctx, input }) => {
      const { page, limit, search, serviceType, memberId, startDate, endDate, isPresent } = input
      const skip = (page - 1) * limit

      const where = {
        churchId: ctx.session.user.churchId,
        ...(search && {
          member: { name: { contains: search, mode: 'insensitive' as const } },
        }),
        ...(serviceType && { serviceType }),
        ...(memberId && { memberId }),
        ...(isPresent !== undefined && { isPresent }),
        ...(startDate && endDate && {
          attendanceDate: {
            gte: startDate,
            lte: endDate,
          },
        }),
      }

      const [attendances, total] = await Promise.all([
        ctx.prisma.attendance.findMany({
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
          orderBy: { attendanceDate: 'desc' },
        }),
        ctx.prisma.attendance.count({ where }),
      ])

      return {
        attendances,
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
      }
    }),

  // Get attendance by service date and type
  getByService: protectedProcedure
    .input(z.object({
      serviceType: z.nativeEnum(ServiceType),
      attendanceDate: z.string().transform((val) => new Date(val)),
    }))
    .query(async ({ ctx, input }) => {
      const startOfDay = new Date(input.attendanceDate)
      startOfDay.setHours(0, 0, 0, 0)
      
      const endOfDay = new Date(input.attendanceDate)
      endOfDay.setHours(23, 59, 59, 999)

      const attendances = await ctx.prisma.attendance.findMany({
        where: {
          churchId: ctx.session.user.churchId,
          serviceType: input.serviceType,
          attendanceDate: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        include: {
          member: true,
        },
        orderBy: { member: { name: 'asc' } },
      })

      // Also get all active members for comparison
      const allMembers = await ctx.prisma.member.findMany({
        where: {
          churchId: ctx.session.user.churchId,
          status: 'ACTIVE',
        },
        orderBy: { name: 'asc' },
      })

      return {
        attendances,
        allMembers,
        date: input.attendanceDate,
        serviceType: input.serviceType,
      }
    }),

  // Create single attendance record
  create: managerProcedure
    .input(attendanceCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const attendance = await ctx.prisma.attendance.create({
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

      return attendance
    }),

  // Bulk create/update attendance for a service
  bulkUpsert: managerProcedure
    .input(bulkAttendanceSchema)
    .mutation(async ({ ctx, input }) => {
      const { serviceType, attendanceDate, attendances } = input
      
      // Delete existing records for this service and date
      const startOfDay = new Date(attendanceDate)
      startOfDay.setHours(0, 0, 0, 0)
      
      const endOfDay = new Date(attendanceDate)
      endOfDay.setHours(23, 59, 59, 999)

      await ctx.prisma.attendance.deleteMany({
        where: {
          churchId: ctx.session.user.churchId,
          serviceType,
          attendanceDate: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      })

      // Create new records
      const newAttendances = await ctx.prisma.attendance.createMany({
        data: attendances.map(att => ({
          ...att,
          serviceType,
          attendanceDate,
          churchId: ctx.session.user.churchId,
        })),
      })

      return newAttendances
    }),

  // Update attendance
  update: managerProcedure
    .input(attendanceUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input

      const attendance = await ctx.prisma.attendance.update({
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

      return attendance
    }),

  // Delete attendance
  delete: managerProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const attendance = await ctx.prisma.attendance.delete({
        where: {
          id: input.id,
          churchId: ctx.session.user.churchId,
        },
      })

      return attendance
    }),

  // Get attendance statistics
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
          attendanceDate: {
            gte: startDate,
            lte: endDate,
          },
        }),
      }

      const [
        totalAttendances,
        presentCount,
        absentCount,
        byServiceType,
        weeklyStats,
        topAttenders,
      ] = await Promise.all([
        ctx.prisma.attendance.count({ where }),
        ctx.prisma.attendance.count({ where: { ...where, isPresent: true } }),
        ctx.prisma.attendance.count({ where: { ...where, isPresent: false } }),
        ctx.prisma.attendance.groupBy({
          by: ['serviceType'],
          where,
          _count: { _all: true },
        }),
        // Get recent weekly attendance
        ctx.prisma.attendance.groupBy({
          by: ['attendanceDate'],
          where: {
            churchId,
            attendanceDate: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
            },
          },
          _count: { _all: true },
        }),
        // Members with highest attendance rate
        ctx.prisma.attendance.groupBy({
          by: ['memberId'],
          where: {
            churchId,
            ...(startDate && endDate && {
              attendanceDate: { gte: startDate, lte: endDate },
            }),
          },
          _count: { _all: true },
        }),
      ])

      return {
        totalAttendances,
        presentCount,
        absentCount,
        attendanceRate: totalAttendances > 0 ? (presentCount / totalAttendances * 100) : 0,
        byServiceType,
        weeklyStats,
        topAttenders: topAttenders.slice(0, 10),
      }
    }),
})