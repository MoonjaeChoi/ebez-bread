import { z } from 'zod'
import { router, protectedProcedure, managerProcedure } from '@/lib/trpc/server'
import { TRPCError } from '@trpc/server'
import { Prisma } from '@prisma/client'

// Input schemas
const transactionCreateSchema = z.object({
  transactionDate: z.date(),
  description: z.string().min(1, '거래 설명을 입력해주세요').max(500, '설명은 500자 이내로 입력해주세요'),
  debitAccountId: z.string().min(1, '차변 계정을 선택해주세요'),
  creditAccountId: z.string().min(1, '대변 계정을 선택해주세요'),
  amount: z.number().positive('거래 금액은 0보다 커야 합니다'),
  reference: z.string().optional(), // 참조번호
  voucherNumber: z.string().optional(), // 전표번호
})

const transactionQuerySchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  accountId: z.string().optional(), // 특정 계정 거래 내역
  search: z.string().optional(),
  reference: z.string().optional(),
})

const trialBalanceSchema = z.object({
  startDate: z.date(),
  endDate: z.date(),
  accountLevel: z.number().min(1).max(4).optional(), // 조회할 계정 레벨
})

export const transactionsRouter = router({
  // 거래 생성 (복식부기)
  create: managerProcedure
    .input(transactionCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const { debitAccountId, creditAccountId, amount, ...transactionData } = input

      // 같은 계정으로 차변/대변 설정 방지
      if (debitAccountId === creditAccountId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '차변과 대변 계정이 같을 수 없습니다',
        })
      }

      // 계정 유효성 확인
      const [debitAccount, creditAccount] = await Promise.all([
        ctx.prisma.accountCode.findFirst({
          where: {
            id: debitAccountId,
            allowTransaction: true,
            isActive: true,
            OR: [
              { churchId: null },
              { churchId: ctx.session.user.churchId },
            ],
          },
        }),
        ctx.prisma.accountCode.findFirst({
          where: {
            id: creditAccountId,
            allowTransaction: true,
            isActive: true,
            OR: [
              { churchId: null },
              { churchId: ctx.session.user.churchId },
            ],
          },
        }),
      ])

      if (!debitAccount) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '차변 계정을 찾을 수 없거나 거래가 허용되지 않은 계정입니다',
        })
      }

      if (!creditAccount) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '대변 계정을 찾을 수 없거나 거래가 허용되지 않은 계정입니다',
        })
      }

      // 거래 생성 (복식부기: 차변 + 대변)
      const transaction = await ctx.prisma.transaction.create({
        data: {
          ...transactionData,
          debitAccountId,
          creditAccountId,
          amount,
          churchId: ctx.session.user.churchId,
          createdById: ctx.session.user.id,
        },
        include: {
          debitAccount: {
            select: {
              id: true,
              code: true,
              name: true,
              type: true,
            },
          },
          creditAccount: {
            select: {
              id: true,
              code: true,
              name: true,
              type: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      })

      return transaction
    }),

  // 거래 목록 조회
  getAll: protectedProcedure
    .input(transactionQuerySchema)
    .query(async ({ ctx, input }) => {
      const { page, limit, startDate, endDate, accountId, search, reference } = input
      const skip = (page - 1) * limit

      const where: Prisma.TransactionWhereInput = {
        churchId: ctx.session.user.churchId,
        ...(startDate && endDate && {
          transactionDate: {
            gte: startDate,
            lte: endDate,
          },
        }),
        ...(accountId && {
          OR: [
            { debitAccountId: accountId },
            { creditAccountId: accountId },
          ],
        }),
        ...(search && {
          description: {
            contains: search,
            mode: 'insensitive',
          },
        }),
        ...(reference && { reference }),
      }

      const [transactions, total] = await Promise.all([
        ctx.prisma.transaction.findMany({
          where,
          skip,
          take: limit,
          include: {
            debitAccount: {
              select: {
                id: true,
                code: true,
                name: true,
                type: true,
              },
            },
            creditAccount: {
              select: {
                id: true,
                code: true,
                name: true,
                type: true,
              },
            },
            createdBy: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: [
            { transactionDate: 'desc' },
            { createdAt: 'desc' },
          ],
        }),
        ctx.prisma.transaction.count({ where }),
      ])

      return {
        transactions,
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
      }
    }),

  // 특정 계정의 거래 내역 (원장)
  getByAccount: protectedProcedure
    .input(z.object({
      accountId: z.string(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ ctx, input }) => {
      const { accountId, startDate, endDate, page, limit } = input
      const skip = (page - 1) * limit

      // 계정 유효성 확인
      const account = await ctx.prisma.accountCode.findFirst({
        where: {
          id: accountId,
          OR: [
            { churchId: null },
            { churchId: ctx.session.user.churchId },
          ],
        },
      })

      if (!account) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '계정을 찾을 수 없습니다',
        })
      }

      const where: Prisma.TransactionWhereInput = {
        churchId: ctx.session.user.churchId,
        OR: [
          { debitAccountId: accountId },
          { creditAccountId: accountId },
        ],
        ...(startDate && endDate && {
          transactionDate: {
            gte: startDate,
            lte: endDate,
          },
        }),
      }

      const [transactions, total] = await Promise.all([
        ctx.prisma.transaction.findMany({
          where,
          skip,
          take: limit,
          include: {
            debitAccount: {
              select: {
                id: true,
                code: true,
                name: true,
                type: true,
              },
            },
            creditAccount: {
              select: {
                id: true,
                code: true,
                name: true,
                type: true,
              },
            },
          },
          orderBy: [
            { transactionDate: 'asc' },
            { createdAt: 'asc' },
          ],
        }),
        ctx.prisma.transaction.count({ where }),
      ])

      // 계정별 잔액 계산
      let runningBalance = 0
      const transactionsWithBalance = transactions.map((transaction) => {
        const isDebit = transaction.debitAccountId === accountId
        const isCredit = transaction.creditAccountId === accountId

        // 자산, 비용 계정: 차변(+), 대변(-)
        // 부채, 자본, 수익 계정: 차변(-), 대변(+)
        if (account.type === 'ASSET' || account.type === 'EXPENSE') {
          runningBalance += isDebit ? Number(transaction.amount) : -Number(transaction.amount)
        } else {
          runningBalance += isCredit ? Number(transaction.amount) : -Number(transaction.amount)
        }

        return {
          ...transaction,
          balance: runningBalance,
          direction: isDebit ? 'DEBIT' : 'CREDIT',
        }
      })

      return {
        account,
        transactions: transactionsWithBalance,
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
        currentBalance: runningBalance,
      }
    }),

  // 시산표 조회
  getTrialBalance: protectedProcedure
    .input(trialBalanceSchema)
    .query(async ({ ctx, input }) => {
      const { startDate, endDate, accountLevel } = input

      // 계정과목 조회 (거래 가능한 계정만)
      const accounts = await ctx.prisma.accountCode.findMany({
        where: {
          OR: [
            { churchId: null },
            { churchId: ctx.session.user.churchId },
          ],
          isActive: true,
          ...(accountLevel && { level: accountLevel }),
        },
        orderBy: { code: 'asc' },
      })

      // 각 계정의 거래 집계
      const accountBalances = await Promise.all(
        accounts.map(async (account) => {
          const debitSum = await ctx.prisma.transaction.aggregate({
            where: {
              churchId: ctx.session.user.churchId,
              debitAccountId: account.id,
              transactionDate: {
                gte: startDate,
                lte: endDate,
              },
            },
            _sum: {
              amount: true,
            },
          })

          const creditSum = await ctx.prisma.transaction.aggregate({
            where: {
              churchId: ctx.session.user.churchId,
              creditAccountId: account.id,
              transactionDate: {
                gte: startDate,
                lte: endDate,
              },
            },
            _sum: {
              amount: true,
            },
          })

          const debitTotal = Number(debitSum._sum?.amount || 0)
          const creditTotal = Number(creditSum._sum?.amount || 0)
          
          // 계정 유형별 잔액 계산
          let balance = 0
          if (account.type === 'ASSET' || account.type === 'EXPENSE') {
            balance = debitTotal - creditTotal // 자산, 비용: 차변 잔액
          } else {
            balance = creditTotal - debitTotal // 부채, 자본, 수익: 대변 잔액
          }

          return {
            account,
            debitTotal,
            creditTotal,
            balance,
          }
        })
      )

      // 잔액이 0이 아닌 계정만 필터링
      const nonZeroBalances = accountBalances.filter((item) => 
        item.debitTotal !== 0 || item.creditTotal !== 0
      )

      // 계정 유형별 합계
      const summary = {
        assets: nonZeroBalances
          .filter((item) => item.account.type === 'ASSET')
          .reduce((sum, item) => sum + Math.max(0, item.balance), 0),
        liabilities: nonZeroBalances
          .filter((item) => item.account.type === 'LIABILITY')
          .reduce((sum, item) => sum + Math.max(0, item.balance), 0),
        equity: nonZeroBalances
          .filter((item) => item.account.type === 'EQUITY')
          .reduce((sum, item) => sum + Math.max(0, item.balance), 0),
        revenue: nonZeroBalances
          .filter((item) => item.account.type === 'REVENUE')
          .reduce((sum, item) => sum + Math.max(0, item.balance), 0),
        expense: nonZeroBalances
          .filter((item) => item.account.type === 'EXPENSE')
          .reduce((sum, item) => sum + Math.max(0, item.balance), 0),
      }

      // 차대평형 확인
      const totalDebit = nonZeroBalances.reduce((sum, item) => sum + item.debitTotal, 0)
      const totalCredit = nonZeroBalances.reduce((sum, item) => sum + item.creditTotal, 0)
      const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 // 부동소수점 오차 고려

      return {
        balances: nonZeroBalances,
        summary,
        totalDebit,
        totalCredit,
        isBalanced,
        period: {
          startDate,
          endDate,
        },
      }
    }),

  // 총계정원장 조회 (전체 계정)
  getLedger: protectedProcedure
    .input(z.object({
      startDate: z.date(),
      endDate: z.date(),
      accountIds: z.array(z.string()).optional(), // 특정 계정들만 조회
    }))
    .query(async ({ ctx, input }) => {
      const { startDate, endDate, accountIds } = input

      const accountWhere: Prisma.AccountCodeWhereInput = {
        OR: [
          { churchId: null },
          { churchId: ctx.session.user.churchId },
        ],
        isActive: true,
        ...(accountIds && { id: { in: accountIds } }),
      }

      const accounts = await ctx.prisma.accountCode.findMany({
        where: accountWhere,
        orderBy: { code: 'asc' },
      })

      const ledgerData = await Promise.all(
        accounts.map(async (account) => {
          const transactions = await ctx.prisma.transaction.findMany({
            where: {
              churchId: ctx.session.user.churchId,
              OR: [
                { debitAccountId: account.id },
                { creditAccountId: account.id },
              ],
              transactionDate: {
                gte: startDate,
                lte: endDate,
              },
            },
            include: {
              debitAccount: {
                select: {
                  code: true,
                  name: true,
                },
              },
              creditAccount: {
                select: {
                  code: true,
                  name: true,
                },
              },
            },
            orderBy: [
              { transactionDate: 'asc' },
              { createdAt: 'asc' },
            ],
          })

          // 기초 잔액 계산 (시작일 이전)
          const [previousDebitSum, previousCreditSum] = await Promise.all([
            ctx.prisma.transaction.aggregate({
              where: {
                churchId: ctx.session.user.churchId,
                debitAccountId: account.id,
                transactionDate: { lt: startDate },
              },
              _sum: { amount: true },
            }),
            ctx.prisma.transaction.aggregate({
              where: {
                churchId: ctx.session.user.churchId,
                creditAccountId: account.id,
                transactionDate: { lt: startDate },
              },
              _sum: { amount: true },
            }),
          ])

          const previousDebit = Number(previousDebitSum._sum?.amount || 0)
          const previousCredit = Number(previousCreditSum._sum?.amount || 0)
          
          let beginningBalance = 0
          if (account.type === 'ASSET' || account.type === 'EXPENSE') {
            beginningBalance = previousDebit - previousCredit
          } else {
            beginningBalance = previousCredit - previousDebit
          }

          // 거래별 잔액 계산
          let runningBalance = beginningBalance
          const transactionsWithBalance = transactions.map((transaction) => {
            const isDebit = transaction.debitAccountId === account.id
            
            if (account.type === 'ASSET' || account.type === 'EXPENSE') {
              runningBalance += isDebit ? Number(transaction.amount) : -Number(transaction.amount)
            } else {
              runningBalance += isDebit ? -Number(transaction.amount) : Number(transaction.amount)
            }

            return {
              ...transaction,
              direction: isDebit ? 'DEBIT' : 'CREDIT',
              balance: runningBalance,
            }
          })

          return {
            account,
            beginningBalance,
            endingBalance: runningBalance,
            transactions: transactionsWithBalance,
          }
        })
      )

      return {
        ledger: ledgerData.filter((item) => 
          item.transactions.length > 0 || item.beginningBalance !== 0
        ),
        period: {
          startDate,
          endDate,
        },
      }
    }),

  // 거래 상세 조회
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const transaction = await ctx.prisma.transaction.findFirst({
        where: {
          id: input.id,
          churchId: ctx.session.user.churchId,
        },
        include: {
          debitAccount: true,
          creditAccount: true,
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      })

      if (!transaction) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '거래를 찾을 수 없습니다',
        })
      }

      return transaction
    }),

  // 거래 삭제 (관리자만)
  delete: managerProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const transaction = await ctx.prisma.transaction.findFirst({
        where: {
          id: input.id,
          churchId: ctx.session.user.churchId,
        },
      })

      if (!transaction) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '거래를 찾을 수 없습니다',
        })
      }

      await ctx.prisma.transaction.delete({
        where: { id: input.id },
      })

      return { success: true }
    }),
})