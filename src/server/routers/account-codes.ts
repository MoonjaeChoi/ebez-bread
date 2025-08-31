import { z } from 'zod'
import { router, protectedProcedure, managerProcedure } from '@/lib/trpc/server'
import { AccountType } from '@prisma/client'
import { TRPCError } from '@trpc/server'

// Input schemas
const accountCodeCreateSchema = z.object({
  code: z.string().min(1, '계정 코드를 입력해주세요').regex(/^[1-5](-\d{2}){0,3}$/, '올바른 계정 코드 형식이 아닙니다 (예: 1-11-01-01)'),
  name: z.string().min(1, '계정명을 입력해주세요').max(100, '계정명은 100자 이내로 입력해주세요'),
  englishName: z.string().max(100, '영문명은 100자 이내로 입력해주세요').optional(),
  type: z.nativeEnum(AccountType, { errorMap: () => ({ message: '올바른 계정 유형을 선택해주세요' }) }),
  parentId: z.string().optional(),
  description: z.string().max(500, '설명은 500자 이내로 입력해주세요').optional(),
  allowTransaction: z.boolean().default(true),
})

const accountCodeUpdateSchema = accountCodeCreateSchema.extend({
  id: z.string(),
}).partial().extend({
  id: z.string(), // id는 필수
})

const accountCodeQuerySchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(50),
  search: z.string().optional(),
  type: z.nativeEnum(AccountType).optional(),
  level: z.number().min(1).max(4).optional(),
  parentId: z.string().optional(),
  includeInactive: z.boolean().default(false),
  churchOnly: z.boolean().default(false), // true면 교회별 계정만, false면 시스템 계정 포함
})

export const accountCodesRouter = router({
  // 계정과목 목록 조회 (페이지네이션, 필터링)
  getAll: protectedProcedure
    .input(accountCodeQuerySchema)
    .query(async ({ ctx, input }) => {
      try {
        const { page, limit, search, type, level, parentId, includeInactive, churchOnly } = input
        const skip = (page - 1) * limit

        const where: any = {
        ...(search && {
          OR: [
            { code: { contains: search, mode: 'insensitive' } },
            { name: { contains: search, mode: 'insensitive' } },
            { englishName: { contains: search, mode: 'insensitive' } },
          ],
        }),
        ...(type && { type }),
        ...(level && { level }),
        ...(parentId && { parentId }),
        ...(includeInactive ? {} : { isActive: true }),
      }

      // 교회 필터링: churchOnly가 true면 해당 교회 계정만, false면 시스템 계정 포함
      if (churchOnly) {
        where.churchId = ctx.session.user.churchId
      } else {
        where.OR = [
          { churchId: null }, // 시스템 계정
          { churchId: ctx.session.user.churchId }, // 교회별 계정
        ]
      }

      const [accountCodes, total] = await Promise.all([
        ctx.prisma.accountCode.findMany({
          where,
          skip,
          take: limit,
          include: {
            parent: {
              select: {
                id: true,
                code: true,
                name: true,
                level: true,
              },
            },
            _count: {
              select: {
                children: true,
              },
            },
          },
          orderBy: [
            { order: 'asc' },
            { code: 'asc' },
          ],
        }),
        ctx.prisma.accountCode.count({ where }),
      ])

        return {
          accountCodes,
          total,
          pages: Math.ceil(total / limit),
          currentPage: page,
        }
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch account codes',
          cause: error
        })
      }
    }),

  // 트리 구조로 계정과목 조회
  getTree: protectedProcedure
    .input(z.object({
      type: z.nativeEnum(AccountType).optional(),
      churchOnly: z.boolean().default(false),
      maxLevel: z.number().min(1).max(4).default(4),
    }))
    .query(async ({ ctx, input }) => {
      const { type, churchOnly, maxLevel } = input

      const where: any = {
        level: 1, // 관(Level 1)부터 시작
        isActive: true,
        ...(type && { type }),
      }

      if (churchOnly) {
        where.churchId = ctx.session.user.churchId
      } else {
        where.OR = [
          { churchId: null },
          { churchId: ctx.session.user.churchId },
        ]
      }

      // 재귀적으로 하위 계정 포함
      const includeChildren = (level: number): any => {
        if (level >= maxLevel) return true
        
        return {
          include: {
            children: {
              where: { isActive: true },
              include: includeChildren(level + 1),
              orderBy: { order: 'asc' },
            },
          },
        }
      }

      const accountCodes = await ctx.prisma.accountCode.findMany({
        where,
        include: includeChildren(1),
        orderBy: { order: 'asc' },
      })

      return accountCodes
    }),

  // 특정 계정과목 상세 조회
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const accountCode = await ctx.prisma.accountCode.findFirst({
        where: {
          id: input.id,
          OR: [
            { churchId: null }, // 시스템 계정
            { churchId: ctx.session.user.churchId }, // 교회 계정
          ],
        },
        include: {
          parent: {
            select: {
              id: true,
              code: true,
              name: true,
              level: true,
            },
          },
          children: {
            where: { isActive: true },
            select: {
              id: true,
              code: true,
              name: true,
              level: true,
              type: true,
              isSystem: true,
              allowTransaction: true,
            },
            orderBy: { order: 'asc' },
          },
          church: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      })

      if (!accountCode) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '계정과목을 찾을 수 없습니다',
        })
      }

      return accountCode
    }),

  // 새 계정과목 생성
  create: managerProcedure
    .input(accountCodeCreateSchema)
    .mutation(async ({ ctx, input }) => {
      // 계정 코드 중복 체크
      const existingCode = await ctx.prisma.accountCode.findFirst({
        where: {
          code: input.code,
          OR: [
            { churchId: null },
            { churchId: ctx.session.user.churchId },
          ],
        },
      })

      if (existingCode) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: '이미 존재하는 계정 코드입니다',
        })
      }

      // 상위 계정 확인
      if (input.parentId) {
        const parent = await ctx.prisma.accountCode.findFirst({
          where: {
            id: input.parentId,
            OR: [
              { churchId: null },
              { churchId: ctx.session.user.churchId },
            ],
          },
        })

        if (!parent) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: '상위 계정을 찾을 수 없습니다',
          })
        }

        // 계정 유형 일치 확인
        if (parent.type !== input.type) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: '상위 계정과 계정 유형이 일치해야 합니다',
          })
        }

        // 레벨 검증 (상위 + 1이어야 함)
        const expectedLevel = parent.level + 1
        const actualLevel = input.code.split('-').length

        if (actualLevel !== expectedLevel || actualLevel > 4) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `계정 레벨이 올바르지 않습니다. 예상 레벨: ${expectedLevel}`,
          })
        }
      }

      // 자동으로 레벨 및 순서 계산
      const level = input.code.split('-').length
      const order = parseInt(input.code.replace(/-/g, '').padEnd(6, '0'))

      const accountCode = await ctx.prisma.accountCode.create({
        data: {
          code: input.code,
          name: input.name,
          englishName: input.englishName,
          type: input.type,
          level,
          parentId: input.parentId,
          description: input.description,
          allowTransaction: input.allowTransaction,
          order,
          churchId: ctx.session.user.churchId, // 교회별 계정으로 생성
          isSystem: false, // 사용자 생성 계정
        },
        include: {
          parent: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
      })

      return accountCode
    }),

  // 계정과목 수정
  update: managerProcedure
    .input(accountCodeUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, code, ...restData } = input
      let updateData = restData

      // 기존 계정 확인
      const existingAccount = await ctx.prisma.accountCode.findFirst({
        where: {
          id,
          churchId: ctx.session.user.churchId, // 교회 계정만 수정 가능
          isSystem: false, // 시스템 계정은 수정 불가
        },
      })

      if (!existingAccount) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '계정과목을 찾을 수 없거나 수정할 권한이 없습니다',
        })
      }

      // 코드 변경 시 중복 체크
      if (code && code !== existingAccount.code) {
        const codeExists = await ctx.prisma.accountCode.findFirst({
          where: {
            code,
            id: { not: id },
            OR: [
              { churchId: null },
              { churchId: ctx.session.user.churchId },
            ],
          },
        })

        if (codeExists) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: '이미 존재하는 계정 코드입니다',
          })
        }

        // 코드 변경 시 레벨과 순서 재계산
        if (code) {
          const newUpdateData = {
            ...updateData,
            level: code.split('-').length,
            order: parseInt(code.replace(/-/g, '').padEnd(6, '0'))
          }
          updateData = newUpdateData
        }
      }

      const accountCode = await ctx.prisma.accountCode.update({
        where: { id },
        data: {
          ...(code && { code }),
          ...updateData,
        },
        include: {
          parent: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
      })

      return accountCode
    }),

  // 계정과목 삭제 (Soft Delete)
  delete: managerProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // 기존 계정 확인
      const existingAccount = await ctx.prisma.accountCode.findFirst({
        where: {
          id: input.id,
          churchId: ctx.session.user.churchId,
          isSystem: false, // 시스템 계정은 삭제 불가
        },
        include: {
          _count: {
            select: {
              children: { where: { isActive: true } },
              debitTransactions: true,
              creditTransactions: true,
            },
          },
        },
      })

      if (!existingAccount) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '계정과목을 찾을 수 없거나 삭제할 권한이 없습니다',
        })
      }

      // 하위 계정이 있으면 삭제 불가
      if (existingAccount._count.children > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '하위 계정이 있어 삭제할 수 없습니다',
        })
      }

      // 거래 내역이 있으면 삭제 불가
      if (existingAccount._count.debitTransactions > 0 || existingAccount._count.creditTransactions > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '거래 내역이 있어 삭제할 수 없습니다',
        })
      }

      // Soft delete
      const accountCode = await ctx.prisma.accountCode.update({
        where: { id: input.id },
        data: { isActive: false },
      })

      return accountCode
    }),

  // 계정 코드 유효성 검증
  validateCode: protectedProcedure
    .input(z.object({
      code: z.string(),
      excludeId: z.string().optional(), // 수정 시 자기 자신 제외
    }))
    .query(async ({ ctx, input }) => {
      const { code, excludeId } = input

      // 코드 형식 검증
      const codePattern = /^[1-5](-\d{2}){0,3}$/
      if (!codePattern.test(code)) {
        return {
          isValid: false,
          error: '올바른 계정 코드 형식이 아닙니다 (예: 1-11-01-01)',
        }
      }

      // 중복 확인
      const existingCode = await ctx.prisma.accountCode.findFirst({
        where: {
          code,
          ...(excludeId && { id: { not: excludeId } }),
          OR: [
            { churchId: null },
            { churchId: ctx.session.user.churchId },
          ],
        },
      })

      if (existingCode) {
        return {
          isValid: false,
          error: '이미 존재하는 계정 코드입니다',
        }
      }

      // 레벨별 유효성 확인
      const level = code.split('-').length
      const parts = code.split('-')

      // 레벨 1 (관): 1-5만 허용
      if (level === 1) {
        const mainCode = parseInt(parts[0])
        if (mainCode < 1 || mainCode > 5) {
          return {
            isValid: false,
            error: '관 코드는 1-5 사이여야 합니다',
          }
        }
      }

      // 레벨 2-4: 상위 계정 존재 확인
      if (level > 1) {
        const parentCode = parts.slice(0, -1).join('-')
        const parentExists = await ctx.prisma.accountCode.findFirst({
          where: {
            code: parentCode,
            isActive: true,
            OR: [
              { churchId: null },
              { churchId: ctx.session.user.churchId },
            ],
          },
        })

        if (!parentExists) {
          return {
            isValid: false,
            error: `상위 계정 (${parentCode})이 존재하지 않습니다`,
          }
        }
      }

      return {
        isValid: true,
        level,
        accountType: getAccountTypeByCode(parts[0]),
      }
    }),

  // 거래 가능한 계정 목록 (세세목만)
  getTransactionAccounts: protectedProcedure
    .input(z.object({
      type: z.nativeEnum(AccountType).optional(),
      search: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { type, search } = input

      const where: any = {
        level: 4, // 세세목만
        allowTransaction: true,
        isActive: true,
        OR: [
          { churchId: null },
          { churchId: ctx.session.user.churchId },
        ],
        ...(type && { type }),
        ...(search && {
          OR: [
            { code: { contains: search, mode: 'insensitive' } },
            { name: { contains: search, mode: 'insensitive' } },
          ],
        }),
      }

      const accounts = await ctx.prisma.accountCode.findMany({
        where,
        select: {
          id: true,
          code: true,
          name: true,
          type: true,
          englishName: true,
        },
        orderBy: { code: 'asc' },
        take: 100, // 최대 100개
      })

      return accounts
    }),
})

// 계정 코드로 계정 유형 결정
function getAccountTypeByCode(mainCode: string): AccountType {
  switch (mainCode) {
    case '1':
      return AccountType.ASSET
    case '2':
      return AccountType.LIABILITY
    case '3':
      return AccountType.EQUITY
    case '4':
      return AccountType.REVENUE
    case '5':
      return AccountType.EXPENSE
    default:
      return AccountType.ASSET
  }
}