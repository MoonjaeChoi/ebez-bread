import { z } from 'zod'
import { router, protectedProcedure, managerProcedure } from '@/lib/trpc/server'
import { Gender, MaritalStatus, MemberStatus, FamilyRelation } from '@prisma/client'

// Input schemas
const memberCreateSchema = z.object({
  name: z.string().min(1, '이름을 입력해주세요'),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  birthDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
  address: z.string().optional(),
  gender: z.nativeEnum(Gender).optional(),
  maritalStatus: z.nativeEnum(MaritalStatus).optional(),
  baptismDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
  confirmationDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
  positionId: z.string().optional(),
  departmentId: z.string().optional(),
  familyId: z.string().optional(),
  relationship: z.nativeEnum(FamilyRelation).optional(),
  notes: z.string().optional(),
})

const memberUpdateSchema = memberCreateSchema.extend({
  id: z.string(),
  status: z.nativeEnum(MemberStatus).optional(),
})

const memberQuerySchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(10),
  search: z.string().optional(),
  status: z.nativeEnum(MemberStatus).optional(),
  positionId: z.string().optional(),
  departmentId: z.string().optional(),
})

export const membersRouter = router({
  // Get all members with pagination and filters
  getAll: protectedProcedure
    .input(memberQuerySchema)
    .query(async ({ ctx, input }) => {
      const { page, limit, search, status, positionId, departmentId } = input
      const skip = (page - 1) * limit

      const where = {
        churchId: ctx.session.user.churchId,
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
            { phone: { contains: search, mode: 'insensitive' as const } },
          ],
        }),
        ...(status && { status }),
        ...(positionId && { positionId }),
        ...(departmentId && { departmentId }),
      }

      const [members, total] = await Promise.all([
        ctx.prisma.member.findMany({
          where,
          skip,
          take: limit,
          include: {
            position: true,
            department: true,
          },
          orderBy: { name: 'asc' },
        }),
        ctx.prisma.member.count({ where }),
      ])

      return {
        members,
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
      }
    }),

  // Search members (simplified for dropdowns/autocomplete)
  search: protectedProcedure
    .input(z.object({
      query: z.string().min(1, '검색어를 입력해주세요'),
      limit: z.number().min(1).max(50).default(20)
    }))
    .query(async ({ ctx, input }) => {
      const { query, limit } = input

      const members = await ctx.prisma.member.findMany({
        where: {
          churchId: ctx.session.user.churchId,
          status: MemberStatus.ACTIVE,
          OR: [
            { name: { contains: query, mode: 'insensitive' as const } },
            { email: { contains: query, mode: 'insensitive' as const } },
            { phone: { contains: query, mode: 'insensitive' as const } },
          ],
        },
        take: limit,
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          position: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: { name: 'asc' },
      })

      return members
    }),

  // Get single member
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const member = await ctx.prisma.member.findFirst({
        where: {
          id: input.id,
          churchId: ctx.session.user.churchId,
        },
        include: {
          position: true,
          department: true,
          offerings: {
            orderBy: { offeringDate: 'desc' },
            take: 10,
          },
          attendances: {
            orderBy: { attendanceDate: 'desc' },
            take: 10,
          },
          visitations: {
            orderBy: { visitDate: 'desc' },
            take: 5,
          },
        },
      })

      if (!member) {
        throw new Error('교인을 찾을 수 없습니다')
      }

      return member
    }),

  // Create new member
  create: managerProcedure
    .input(memberCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const member = await ctx.prisma.member.create({
        data: {
          ...input,
          churchId: ctx.session.user.churchId,
          status: MemberStatus.ACTIVE,
        },
        include: {
          position: true,
          department: true,
        },
      })

      return member
    }),

  // Update member
  update: managerProcedure
    .input(memberUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input

      const member = await ctx.prisma.member.update({
        where: {
          id,
          churchId: ctx.session.user.churchId,
        },
        data,
        include: {
          position: true,
          department: true,
        },
      })

      return member
    }),

  // Delete member (soft delete by changing status)
  delete: managerProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const member = await ctx.prisma.member.update({
        where: {
          id: input.id,
          churchId: ctx.session.user.churchId,
        },
        data: {
          status: MemberStatus.INACTIVE,
        },
      })

      return member
    }),

  // Get member statistics
  getStats: protectedProcedure
    .query(async ({ ctx }) => {
      const churchId = ctx.session.user.churchId

      const [
        total,
        active,
        inactive,
        byGender,
        byMaritalStatus,
        byPosition,
        byDepartment,
      ] = await Promise.all([
        ctx.prisma.member.count({ where: { churchId } }),
        ctx.prisma.member.count({ where: { churchId, status: MemberStatus.ACTIVE } }),
        ctx.prisma.member.count({ where: { churchId, status: MemberStatus.INACTIVE } }),
        ctx.prisma.member.groupBy({
          by: ['gender'],
          where: { churchId, status: MemberStatus.ACTIVE },
          _count: true,
        }),
        ctx.prisma.member.groupBy({
          by: ['maritalStatus'],
          where: { churchId, status: MemberStatus.ACTIVE },
          _count: true,
        }),
        ctx.prisma.member.groupBy({
          by: ['positionId'],
          where: { churchId, status: MemberStatus.ACTIVE, positionId: { not: null } },
          _count: true,
        }),
        ctx.prisma.member.groupBy({
          by: ['departmentId'],
          where: { churchId, status: MemberStatus.ACTIVE, departmentId: { not: null } },
          _count: true,
        }),
      ])

      return {
        total,
        active,
        inactive,
        byGender,
        byMaritalStatus,
        byPosition,
        byDepartment,
      }
    }),

  // Get positions for dropdown
  getPositions: protectedProcedure
    .query(async ({ ctx }) => {
      const positions = await ctx.prisma.position.findMany({
        where: {
          churchId: ctx.session.user.churchId,
          isActive: true,
        },
        orderBy: { order: 'asc' },
      })
      return positions
    }),

  // Get departments for dropdown
  getDepartments: protectedProcedure
    .query(async ({ ctx }) => {
      const departments = await ctx.prisma.department.findMany({
        where: {
          churchId: ctx.session.user.churchId,
          isActive: true,
        },
        orderBy: { name: 'asc' },
      })
      return departments
    }),
})