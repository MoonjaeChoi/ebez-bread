import { z } from 'zod'
import { router, protectedProcedure, managerProcedure } from '@/lib/trpc/server'
import { TRPCError } from '@trpc/server'

// Input schemas
const departmentQuerySchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  search: z.string().optional(),
  includeInactive: z.boolean().default(false),
  parentId: z.string().optional(),
})

const departmentCreateSchema = z.object({
  name: z.string().min(1, '부서명을 입력해주세요').max(100, '부서명은 100자 이내로 입력해주세요'),
  description: z.string().max(500, '설명은 500자 이내로 입력해주세요').optional(),
  parentId: z.string().optional(),
  budgetManagerId: z.string().optional(),
})

const departmentUpdateSchema = z.object({
  id: z.string(),
  name: z.string().min(1, '부서명을 입력해주세요').max(100, '부서명은 100자 이내로 입력해주세요').optional(),
  description: z.string().max(500, '설명은 500자 이내로 입력해주세요').optional(),
  parentId: z.string().optional(),
  budgetManagerId: z.string().optional(),
  isActive: z.boolean().optional(),
})

export const departmentsRouter = router({
  // 부서 목록 조회
  getAll: protectedProcedure
    .input(departmentQuerySchema)
    .query(async ({ ctx, input }) => {
      try {
        const { page, limit, search, includeInactive, parentId } = input
        const skip = (page - 1) * limit

        const where: any = {
          churchId: ctx.session.user.churchId,
          ...(search && {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ],
          }),
          ...(parentId && { parentId }),
          ...(!includeInactive && { isActive: true }),
        }

      const [departments, total] = await Promise.all([
        ctx.prisma.department.findMany({
          where,
          skip,
          take: limit,
          include: {
            parent: {
              select: {
                id: true,
                name: true,
              },
            },
            children: {
              select: {
                id: true,
                name: true,
                isActive: true,
              },
            },
            budgetManager: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            _count: {
              select: {
                members: true,
                budgets: true,
              },
            },
          },
          orderBy: [
            { name: 'asc' },
          ],
        }),
        ctx.prisma.department.count({ where }),
      ])

      return {
        departments,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      }
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch departments',
          cause: error
        })
      }
    }),

  // 특정 부서 상세 조회
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const department = await ctx.prisma.department.findFirst({
        where: {
          id: input.id,
          churchId: ctx.session.user.churchId,
        },
        include: {
          parent: {
            select: {
              id: true,
              name: true,
            },
          },
          children: {
            select: {
              id: true,
              name: true,
              isActive: true,
            },
            where: {
              isActive: true,
            },
          },
          budgetManager: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          members: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
            },
            where: {
              status: 'ACTIVE',
            },
            take: 10, // 최대 10명만
          },
          budgets: {
            select: {
              id: true,
              name: true,
              year: true,
              totalAmount: true,
              status: true,
            },
            orderBy: {
              year: 'desc',
            },
            take: 5, // 최근 5개 예산만
          },
          _count: {
            select: {
              members: true,
              budgets: true,
            },
          },
        },
      })

      if (!department) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '부서를 찾을 수 없습니다',
        })
      }

      return department
    }),

  // 부서 생성
  create: managerProcedure
    .input(departmentCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const churchId = ctx.session.user.churchId

      // 부서명 중복 확인
      const existingDepartment = await ctx.prisma.department.findFirst({
        where: {
          churchId,
          name: input.name,
          isActive: true,
        },
      })

      if (existingDepartment) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: '같은 이름의 부서가 이미 존재합니다',
        })
      }

      // 상위 부서가 지정된 경우 존재 여부 확인
      if (input.parentId) {
        const parentDepartment = await ctx.prisma.department.findFirst({
          where: {
            id: input.parentId,
            churchId,
            isActive: true,
          },
        })

        if (!parentDepartment) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: '상위 부서를 찾을 수 없습니다',
          })
        }
      }

      // 예산 담당자가 지정된 경우 존재 여부 확인
      if (input.budgetManagerId) {
        const budgetManager = await ctx.prisma.user.findFirst({
          where: {
            id: input.budgetManagerId,
            churchId,
            isActive: true,
          },
        })

        if (!budgetManager) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: '예산 담당자를 찾을 수 없습니다',
          })
        }
      }

      const department = await ctx.prisma.department.create({
        data: {
          ...input,
          churchId,
        },
        include: {
          parent: {
            select: {
              id: true,
              name: true,
            },
          },
          budgetManager: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      })

      return department
    }),

  // 부서 수정
  update: managerProcedure
    .input(departmentUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input
      const churchId = ctx.session.user.churchId

      // 부서 존재 여부 확인
      const existingDepartment = await ctx.prisma.department.findFirst({
        where: {
          id,
          churchId,
        },
      })

      if (!existingDepartment) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '부서를 찾을 수 없습니다',
        })
      }

      // 부서명 중복 확인 (본인 제외)
      if (updateData.name) {
        const duplicateDepartment = await ctx.prisma.department.findFirst({
          where: {
            churchId,
            name: updateData.name,
            isActive: true,
            id: { not: id },
          },
        })

        if (duplicateDepartment) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: '같은 이름의 부서가 이미 존재합니다',
          })
        }
      }

      // 상위 부서 변경 시 순환 참조 방지
      if (updateData.parentId) {
        const isCircular = await checkCircularReference(
          ctx.prisma,
          id,
          updateData.parentId,
          churchId
        )

        if (isCircular) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: '순환 참조가 발생합니다. 상위 부서를 다시 선택해주세요',
          })
        }
      }

      const department = await ctx.prisma.department.update({
        where: { id },
        data: updateData,
        include: {
          parent: {
            select: {
              id: true,
              name: true,
            },
          },
          budgetManager: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      })

      return department
    }),

  // 부서 삭제 (소프트 삭제)
  delete: managerProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const churchId = ctx.session.user.churchId

      // 부서 존재 여부 확인
      const department = await ctx.prisma.department.findFirst({
        where: {
          id: input.id,
          churchId,
        },
        include: {
          children: true,
          members: {
            where: {
              status: 'ACTIVE',
            },
          },
          budgets: {
            where: {
              status: {
                in: ['ACTIVE', 'APPROVED'],
              },
            },
          },
        },
      })

      if (!department) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '부서를 찾을 수 없습니다',
        })
      }

      // 하위 부서가 있는 경우 삭제 불가
      if (department.children.some(child => child.isActive)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '하위 부서가 있는 부서는 삭제할 수 없습니다',
        })
      }

      // 활성 교인이 있는 경우 삭제 불가
      if (department.members.length > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '소속 교인이 있는 부서는 삭제할 수 없습니다',
        })
      }

      // 활성 예산이 있는 경우 삭제 불가
      if (department.budgets.length > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '활성 예산이 있는 부서는 삭제할 수 없습니다',
        })
      }

      await ctx.prisma.department.update({
        where: { id: input.id },
        data: {
          isActive: false,
        },
      })

      return { success: true }
    }),

  // 부서 트리 구조 조회
  getTree: protectedProcedure
    .input(z.object({
      includeInactive: z.boolean().default(false),
    }))
    .query(async ({ ctx, input }) => {
      const departments = await ctx.prisma.department.findMany({
        where: {
          churchId: ctx.session.user.churchId,
          ...(!input.includeInactive && { isActive: true }),
        },
        include: {
          _count: {
            select: {
              members: true,
              budgets: true,
            },
          },
        },
        orderBy: [
          { name: 'asc' },
        ],
      })

      // 트리 구조로 변환
      const buildTree = (parentId: string | null): any[] => {
        return departments
          .filter(dept => dept.parentId === parentId)
          .map(dept => ({
            ...dept,
            children: buildTree(dept.id),
          }))
      }

      return buildTree(null)
    }),
})

// 순환 참조 확인 함수
async function checkCircularReference(
  prisma: any,
  currentId: string,
  newParentId: string,
  churchId: string
): Promise<boolean> {
  if (currentId === newParentId) {
    return true
  }

  let parentId = newParentId
  const visited = new Set<string>([currentId])

  while (parentId) {
    if (visited.has(parentId)) {
      return true
    }

    visited.add(parentId)

    const parent = await prisma.department.findFirst({
      where: {
        id: parentId,
        churchId,
      },
      select: {
        parentId: true,
      },
    })

    if (!parent) {
      break
    }

    parentId = parent.parentId
  }

  return false
}