import { z } from 'zod'
import { router, protectedProcedure } from '@/lib/trpc/server'
import { TRPCError } from '@trpc/server'
import { hashPassword, verifyPassword } from '@/lib/password'
import { markPasswordChangeCompleted } from '@/lib/auth/password-change-middleware'
import { logger } from '@/lib/logger'

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, '현재 비밀번호를 입력해주세요'),
  newPassword: z.string()
    .min(8, '새 비밀번호는 8자 이상이어야 합니다'),
  confirmPassword: z.string().min(1, '비밀번호 확인을 입력해주세요')
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: '새 비밀번호와 확인 비밀번호가 일치하지 않습니다',
  path: ['confirmPassword']
})

export const passwordRouter = router({
  // 비밀번호 변경
  change: protectedProcedure
    .input(changePasswordSchema)
    .mutation(async ({ ctx, input }) => {
      const { currentPassword, newPassword } = input
      const userId = ctx.session.user.id

      try {
        // 현재 사용자 정보 조회
        const user = await ctx.prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            email: true,
            password: true,
            passwordChangeRequired: true,
            lastPasswordChange: true
          }
        })

        if (!user) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: '사용자를 찾을 수 없습니다'
          })
        }

        // 현재 비밀번호 검증
        if (user.password) {
          const isCurrentPasswordValid = await verifyPassword(currentPassword, user.password)
          
          if (!isCurrentPasswordValid) {
            logger.warn('Password change attempt with invalid current password', {
              userId,
              email: user.email,
              action: 'password_change_invalid_current'
            })
            
            throw new TRPCError({
              code: 'UNAUTHORIZED',
              message: '현재 비밀번호가 올바르지 않습니다'
            })
          }
        }

        // 새 비밀번호 해싱
        const hashedNewPassword = await hashPassword(newPassword)

        // 비밀번호 업데이트
        await ctx.prisma.user.update({
          where: { id: userId },
          data: {
            password: hashedNewPassword,
            passwordChangeRequired: false,
            lastPasswordChange: new Date()
          }
        })

        logger.info('Password changed successfully', {
          userId,
          email: user.email,
          wasRequired: user.passwordChangeRequired,
          action: 'password_changed'
        })

        return {
          success: true,
          message: '비밀번호가 성공적으로 변경되었습니다'
        }

      } catch (error) {
        if (error instanceof TRPCError) {
          throw error
        }

        logger.error('Password change error', error as Error, {
          userId,
          action: 'password_change_error'
        })

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: '비밀번호 변경 중 오류가 발생했습니다'
        })
      }
    }),

  // 비밀번호 변경 필요 상태 확인
  checkChangeRequired: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id

      const user = await ctx.prisma.user.findUnique({
        where: { id: userId },
        select: {
          passwordChangeRequired: true,
          lastPasswordChange: true
        }
      })

      return {
        isRequired: user?.passwordChangeRequired ?? false,
        lastPasswordChange: user?.lastPasswordChange
      }
    }),

  // 첫 로그인용 비밀번호 설정 (현재 비밀번호 없이)
  setInitialPassword: protectedProcedure
    .input(z.object({
      newPassword: z.string()
        .min(8, '새 비밀번호는 8자 이상이어야 합니다'),
      confirmPassword: z.string().min(1, '비밀번호 확인을 입력해주세요')
    }).refine((data) => data.newPassword === data.confirmPassword, {
      message: '새 비밀번호와 확인 비밀번호가 일치하지 않습니다',
      path: ['confirmPassword']
    }))
    .mutation(async ({ ctx, input }) => {
      const { newPassword } = input
      const userId = ctx.session.user.id

      try {
        // 사용자 정보 조회
        const user = await ctx.prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            email: true,
            passwordChangeRequired: true,
            password: true
          }
        })

        if (!user) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: '사용자를 찾을 수 없습니다'
          })
        }

        // 비밀번호 변경이 필요한 상태가 아니면 거부
        if (!user.passwordChangeRequired) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: '초기 비밀번호 설정이 필요하지 않은 계정입니다'
          })
        }

        // 새 비밀번호 해싱
        const hashedNewPassword = await hashPassword(newPassword)

        // 비밀번호 설정
        await ctx.prisma.user.update({
          where: { id: userId },
          data: {
            password: hashedNewPassword,
            passwordChangeRequired: false,
            lastPasswordChange: new Date()
          }
        })

        logger.info('Initial password set successfully', {
          userId,
          email: user.email,
          action: 'initial_password_set'
        })

        return {
          success: true,
          message: '비밀번호가 성공적으로 설정되었습니다'
        }

      } catch (error) {
        if (error instanceof TRPCError) {
          throw error
        }

        logger.error('Initial password set error', error as Error, {
          userId,
          action: 'initial_password_set_error'
        })

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: '비밀번호 설정 중 오류가 발생했습니다'
        })
      }
    })
})