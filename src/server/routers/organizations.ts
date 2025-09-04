import { z } from 'zod'
import { router, protectedProcedure, adminProcedure } from '@/lib/trpc/server'
import { OrganizationLevel } from '@prisma/client'
import { TRPCError } from '@trpc/server'

// Input schemas
const organizationCreateSchema = z.object({
  code: z.string().min(1, '조직코드를 입력해주세요').max(20, '조직코드는 20자 이내로 입력해주세요'),
  name: z.string().min(1, '조직명을 입력해주세요').max(100, '조직명은 100자 이내로 입력해주세요'),
  englishName: z.string().optional(),
  level: z.nativeEnum(OrganizationLevel),
  description: z.string().optional(),
  parentId: z.string().optional(),
  sortOrder: z.number().int().min(0).default(0),
})

const organizationUpdateSchema = organizationCreateSchema.extend({
  id: z.string(),
  isActive: z.boolean().optional(),
})

const organizationQuerySchema = z.object({
  level: z.nativeEnum(OrganizationLevel).optional(),
  parentId: z.string().optional(),
  includeInactive: z.boolean().default(false),
  includeStats: z.boolean().default(false),
})

export const organizationsRouter = router({
  // 조직구조 전체 조회 (트리 형태)
  getHierarchy: protectedProcedure
    .input(organizationQuerySchema)
    .query(async ({ ctx, input }) => {
      const { level, parentId, includeInactive, includeStats } = input

      const where = {
        churchId: ctx.session.user.churchId,
        ...(level && { level }),
        ...(parentId !== undefined ? { parentId } : { parentId: null }), // Only root organizations
        ...(!includeInactive && { isActive: true }),
      }

      const organizations = await ctx.prisma.organization.findMany({
        where,
        include: {
          parent: true,
          createdBy: {
            select: { id: true, name: true, email: true }
          },
          updatedBy: {
            select: { id: true, name: true, email: true }
          },
          children: {
            where: includeInactive ? {} : { isActive: true },
            include: {
              createdBy: {
                select: { id: true, name: true, email: true }
              },
              updatedBy: {
                select: { id: true, name: true, email: true }
              },
              children: {
                where: includeInactive ? {} : { isActive: true },
                include: {
                  createdBy: {
                    select: { id: true, name: true, email: true }
                  },
                  updatedBy: {
                    select: { id: true, name: true, email: true }
                  },
                  children: {
                    where: includeInactive ? {} : { isActive: true },
                    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }]
                  },
                  ...(includeStats && {
                    _count: {
                      select: {
                        budgets: true,
                        budgetItems: true,
                        expenseReports: true,
                        responsibleUsers: true,
                        organizationMemberships: true,
                      }
                    }
                  })
                },
                orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }]
              },
              ...(includeStats && {
                _count: {
                  select: {
                    budgets: true,
                    budgetItems: true,
                    expenseReports: true,
                    responsibleUsers: true,
                    organizationMemberships: true,
                  }
                }
              })
            },
            orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }]
          },
          ...(includeStats && {
            _count: {
              select: {
                budgets: true,
                budgetItems: true,
                expenseReports: true,
                responsibleUsers: true,
                organizationMemberships: true,
              }
            }
          })
        },
        orderBy: [
          { level: 'asc' },
          { sortOrder: 'asc' },
          { name: 'asc' }
        ]
      })

      return organizations
    }),

  // 특정 레벨의 조직 목록 조회
  getByLevel: protectedProcedure
    .input(z.object({
      level: z.nativeEnum(OrganizationLevel),
      parentId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const organizations = await ctx.prisma.organization.findMany({
        where: {
          churchId: ctx.session.user.churchId,
          level: input.level,
          isActive: true,
          ...(input.parentId && { parentId: input.parentId }),
        },
        include: {
          parent: true,
          createdBy: {
            select: { id: true, name: true, email: true }
          },
          updatedBy: {
            select: { id: true, name: true, email: true }
          },
          _count: {
            select: {
              children: true,
              budgets: true,
              budgetItems: true,
              expenseReports: true,
              responsibleUsers: true,
              organizationMemberships: true,
            }
          }
        },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }]
      })

      return organizations
    }),

  // 단일 조직 상세 조회
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const organization = await ctx.prisma.organization.findFirst({
        where: {
          id: input.id,
          churchId: ctx.session.user.churchId,
        },
        include: {
          parent: true,
          createdBy: {
            select: { id: true, name: true, email: true }
          },
          updatedBy: {
            select: { id: true, name: true, email: true }
          },
          children: {
            where: { isActive: true },
            orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }]
          },
          budgets: {
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: {
              department: true,
              _count: {
                select: { budgetItems: true }
              }
            }
          },
          budgetItems: {
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: {
              budget: {
                select: {
                  name: true,
                  year: true,
                }
              },
              budgetExecution: true,
            }
          },
          expenseReports: {
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: {
              requester: {
                select: { name: true }
              }
            }
          },
          responsibleUsers: {
            select: {
              id: true,
              name: true,
              role: true,
              email: true,
            }
          },
          _count: {
            select: {
              children: true,
              budgets: true,
              budgetItems: true,
              expenseReports: true,
              responsibleUsers: true,
              organizationMemberships: true,
            }
          }
        },
      })

      if (!organization) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '조직을 찾을 수 없습니다'
        })
      }

      return organization
    }),

  // 조직 경로 조회 (breadcrumb용)
  getPath: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const path = []
      let currentId: string | null = input.id

      while (currentId) {
        const organization: any = await ctx.prisma.organization.findFirst({
          where: {
            id: currentId,
            churchId: ctx.session.user.churchId,
          },
          select: {
            id: true,
            name: true,
            code: true,
            level: true,
            parentId: true,
          }
        })

        if (!organization) break

        path.unshift(organization)
        currentId = organization.parentId || null
      }

      return path
    }),

  // 조직 생성
  create: adminProcedure
    .input(organizationCreateSchema)
    .mutation(async ({ ctx, input }) => {
      // 코드 중복 확인
      const existingOrg = await ctx.prisma.organization.findFirst({
        where: {
          churchId: ctx.session.user.churchId,
          code: input.code,
        }
      })

      if (existingOrg) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: '이미 사용 중인 조직코드입니다'
        })
      }

      // 부모 조직 확인 (있는 경우)
      if (input.parentId) {
        const parentOrg = await ctx.prisma.organization.findFirst({
          where: {
            id: input.parentId,
            churchId: ctx.session.user.churchId,
          }
        })

        if (!parentOrg) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: '상위 조직을 찾을 수 없습니다'
          })
        }

        // 레벨 검증 (부모보다 1 높아야 함)
        const levelMap = {
          LEVEL_1: 1,
          LEVEL_2: 2,
          LEVEL_3: 3,
          LEVEL_4: 4,
          LEVEL_5: 5,
        }

        if (levelMap[input.level] !== levelMap[parentOrg.level] + 1) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: '조직 레벨이 올바르지 않습니다'
          })
        }
      } else if (input.level !== OrganizationLevel.LEVEL_1) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '최상위 조직은 LEVEL_1이어야 합니다'
        })
      }

      const organization = await ctx.prisma.organization.create({
        data: {
          ...input,
          churchId: ctx.session.user.churchId,
          createdById: ctx.session.user.id,
        },
        include: {
          parent: true,
          createdBy: {
            select: { id: true, name: true, email: true }
          },
          updatedBy: {
            select: { id: true, name: true, email: true }
          },
          _count: {
            select: {
              children: true,
              budgets: true,
              budgetItems: true,
              expenseReports: true,
              responsibleUsers: true,
              organizationMemberships: true,
            }
          }
        }
      })

      return organization
    }),

  // 조직 수정
  update: adminProcedure
    .input(organizationUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input

      const existingOrg = await ctx.prisma.organization.findFirst({
        where: {
          id,
          churchId: ctx.session.user.churchId,
        }
      })

      if (!existingOrg) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '조직을 찾을 수 없습니다'
        })
      }

      // 코드 중복 확인 (자기 자신 제외)
      if (updateData.code && updateData.code !== existingOrg.code) {
        const duplicateOrg = await ctx.prisma.organization.findFirst({
          where: {
            churchId: ctx.session.user.churchId,
            code: updateData.code,
            id: { not: id },
          }
        })

        if (duplicateOrg) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: '이미 사용 중인 조직코드입니다'
          })
        }
      }

      const organization = await ctx.prisma.organization.update({
        where: { id },
        data: {
          ...updateData,
          updatedById: ctx.session.user.id,
        },
        include: {
          parent: true,
          createdBy: {
            select: { id: true, name: true, email: true }
          },
          updatedBy: {
            select: { id: true, name: true, email: true }
          },
          children: {
            where: { isActive: true },
            orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }]
          },
          _count: {
            select: {
              children: true,
              budgets: true,
              budgetItems: true,
              expenseReports: true,
              responsibleUsers: true,
              organizationMemberships: true,
            }
          }
        }
      })

      return organization
    }),

  // 조직 삭제 (soft delete)
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const organization = await ctx.prisma.organization.findFirst({
        where: {
          id: input.id,
          churchId: ctx.session.user.churchId,
        },
        include: {
          children: { where: { isActive: true } },
          budgets: true,
          budgetItems: true,
          expenseReports: true,
        }
      })

      if (!organization) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '조직을 찾을 수 없습니다'
        })
      }

      // 하위 조직이나 연관 데이터가 있는지 확인
      if (organization.children.length > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '하위 조직이 있는 조직은 삭제할 수 없습니다'
        })
      }

      if (organization.budgets.length > 0 || 
          organization.budgetItems.length > 0 || 
          organization.expenseReports.length > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '관련 데이터가 있는 조직은 삭제할 수 없습니다'
        })
      }

      // Soft delete
      await ctx.prisma.organization.update({
        where: { id: input.id },
        data: { isActive: false }
      })

      return { success: true }
    }),

  // 조직 담당자 지정/해제
  assignResponsible: adminProcedure
    .input(z.object({
      organizationId: z.string(),
      userIds: z.array(z.string()),
    }))
    .mutation(async ({ ctx, input }) => {
      const organization = await ctx.prisma.organization.findFirst({
        where: {
          id: input.organizationId,
          churchId: ctx.session.user.churchId,
        }
      })

      if (!organization) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '조직을 찾을 수 없습니다'
        })
      }

      // 사용자들이 같은 교회 소속인지 확인
      const users = await ctx.prisma.user.findMany({
        where: {
          id: { in: input.userIds },
          churchId: ctx.session.user.churchId,
          isActive: true,
        }
      })

      if (users.length !== input.userIds.length) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '일부 사용자를 찾을 수 없습니다'
        })
      }

      // 기존 담당자 관계 모두 삭제 후 새로 추가
      await ctx.prisma.organization.update({
        where: { id: input.organizationId },
        data: {
          responsibleUsers: {
            set: input.userIds.map(id => ({ id }))
          }
        }
      })

      return { success: true }
    }),

  // 조직별 통계 조회
  getStats: protectedProcedure
    .input(z.object({
      organizationId: z.string().optional(),
      includeChildren: z.boolean().default(true),
    }))
    .query(async ({ ctx, input }) => {
      const baseWhere = {
        churchId: ctx.session.user.churchId,
        ...(input.organizationId && { 
          organizationId: input.includeChildren 
            ? undefined // 하위 조직 포함 로직은 별도 구현 필요
            : input.organizationId
        }),
      }

      const [
        totalBudgets,
        activeBudgets,
        totalBudgetAmount,
        totalExpenseReports,
        pendingExpenseReports,
        approvedExpenseReports,
        totalExpenseAmount,
        organizationCount,
      ] = await Promise.all([
        ctx.prisma.budget.count({ 
          where: baseWhere 
        }),
        ctx.prisma.budget.count({ 
          where: { ...baseWhere, status: 'ACTIVE' } 
        }),
        ctx.prisma.budget.aggregate({
          where: baseWhere,
          _sum: { totalAmount: true }
        }),
        ctx.prisma.expenseReport.count({ 
          where: baseWhere 
        }),
        ctx.prisma.expenseReport.count({ 
          where: { ...baseWhere, status: 'PENDING' } 
        }),
        ctx.prisma.expenseReport.count({ 
          where: { ...baseWhere, status: 'APPROVED' } 
        }),
        ctx.prisma.expenseReport.aggregate({
          where: baseWhere,
          _sum: { amount: true }
        }),
        ctx.prisma.organization.count({
          where: {
            churchId: ctx.session.user.churchId,
            isActive: true,
            ...(input.organizationId && { parentId: input.organizationId }),
          }
        }),
      ])

      return {
        budgets: {
          total: totalBudgets,
          active: activeBudgets,
          totalAmount: Number(totalBudgetAmount._sum.totalAmount) || 0,
        },
        expenseReports: {
          total: totalExpenseReports,
          pending: pendingExpenseReports,
          approved: approvedExpenseReports,
          totalAmount: Number(totalExpenseAmount._sum.amount) || 0,
        },
        organizations: {
          total: organizationCount,
        }
      }
    }),
})