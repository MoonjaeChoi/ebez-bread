import { z } from 'zod'
import { router, protectedProcedure, adminProcedure } from '@/lib/trpc/server'
import { UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { logger } from '@/lib/logger'
import { TRPCError } from '@trpc/server'

// 사용자 관리를 위한 스키마
const userCreateSchema = z.object({
  email: z.string().email('유효한 이메일 주소를 입력해주세요'),
  name: z.string().min(1, '이름을 입력해주세요'),
  phone: z.string().optional(),
  role: z.nativeEnum(UserRole),
  password: z.string().min(8, '비밀번호는 최소 8자 이상이어야 합니다'),
})

const userUpdateSchema = z.object({
  id: z.string(),
  email: z.string().email().optional(),
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  role: z.nativeEnum(UserRole).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8).optional(),
})

const userQuerySchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(10),
  search: z.string().optional(),
  role: z.nativeEnum(UserRole).optional(),
  isActive: z.boolean().optional(),
})

// 권한 설정을 위한 스키마
const permissionMenuSchema = z.object({
  role: z.nativeEnum(UserRole),
  menuItems: z.array(z.string()),
})

// 시스템 설정을 위한 스키마
const systemSettingSchema = z.object({
  key: z.string(),
  value: z.string(),
  description: z.string().optional(),
})

// 백업 설정을 위한 스키마
const backupConfigSchema = z.object({
  autoBackupEnabled: z.boolean(),
  backupSchedule: z.string(), // cron expression
  retentionDays: z.number().min(1),
  includeFiles: z.boolean(),
})

// 교회 정보 수정을 위한 스키마
const churchUpdateSchema = z.object({
  name: z.string().min(1, '교회명을 입력해주세요'),
  email: z.string().email('유효한 이메일을 입력해주세요').optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  website: z.string().url('유효한 웹사이트 URL을 입력해주세요').optional().or(z.literal('')),
  pastorName: z.string().optional(),
  description: z.string().optional(),
})

export const adminRouter = router({
  // === 사용자 계정 관리 ===
  users: router({
    // 사용자 목록 조회
    getAll: adminProcedure
      .input(userQuerySchema)
      .query(async ({ ctx, input }) => {
        const { page, limit, search, role, isActive } = input
        const skip = (page - 1) * limit

        try {
          const where = {
            churchId: ctx.session.user.churchId,
            ...(search && {
              OR: [
                { name: { contains: search, mode: 'insensitive' as const } },
                { email: { contains: search, mode: 'insensitive' as const } },
                { phone: { contains: search, mode: 'insensitive' as const } },
              ],
            }),
            ...(role && { role }),
            ...(isActive !== undefined && { isActive }),
          }

          const [users, total] = await Promise.all([
            ctx.prisma.user.findMany({
              where,
              skip,
              take: limit,
              select: {
                id: true,
                email: true,
                name: true,
                phone: true,
                role: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
              },
              orderBy: { createdAt: 'desc' },
            }),
            ctx.prisma.user.count({ where }),
          ])

          logger.info('Users fetched for admin', {
            userId: ctx.session.user.id,
            churchId: ctx.session.user.churchId,
            action: 'admin_users_fetch',
            metadata: { total, page, search, role, isActive }
          })

          return {
            users,
            total,
            pages: Math.ceil(total / limit),
            currentPage: page,
          }
        } catch (error) {
          logger.error('Failed to fetch users for admin', error as Error, {
            userId: ctx.session.user.id,
            churchId: ctx.session.user.churchId,
            action: 'admin_users_fetch_error'
          })
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: '사용자 목록을 불러오는데 실패했습니다',
          })
        }
      }),

    // 단일 사용자 조회
    getById: adminProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ ctx, input }) => {
        try {
          const user = await ctx.prisma.user.findFirst({
            where: {
              id: input.id,
              churchId: ctx.session.user.churchId,
            },
            select: {
              id: true,
              email: true,
              name: true,
              phone: true,
              role: true,
              isActive: true,
              createdAt: true,
              updatedAt: true,
              notificationSettings: true,
            },
          })

          if (!user) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: '사용자를 찾을 수 없습니다',
            })
          }

          return user
        } catch (error) {
          if (error instanceof TRPCError) throw error
          
          logger.error('Failed to fetch user by ID', error as Error, {
            userId: ctx.session.user.id,
            action: 'admin_user_fetch_by_id_error',
            metadata: {
              targetUserId: input.id,
            }
          })
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: '사용자 정보를 불러오는데 실패했습니다',
          })
        }
      }),

    // 사용자 생성
    create: adminProcedure
      .input(userCreateSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          // 이메일 중복 확인
          const existingUser = await ctx.prisma.user.findFirst({
            where: {
              email: input.email,
              churchId: ctx.session.user.churchId,
            },
          })

          if (existingUser) {
            throw new TRPCError({
              code: 'CONFLICT',
              message: '이미 존재하는 이메일 주소입니다',
            })
          }

          // 비밀번호 해싱 (임시로 간단히 구현, 실제로는 bcrypt 사용)
          // const hashedPassword = await bcrypt.hash(input.password, 12)
          const hashedPassword = input.password // 개발용 임시

          const user = await ctx.prisma.user.create({
            data: {
              ...input,
              password: hashedPassword,
              churchId: ctx.session.user.churchId,
            },
            select: {
              id: true,
              email: true,
              name: true,
              phone: true,
              role: true,
              isActive: true,
              createdAt: true,
            },
          })

          // 기본 알림 설정 생성
          await ctx.prisma.notificationSetting.create({
            data: {
              userId: user.id,
            },
          })

          logger.info('New user created by admin', {
            userId: ctx.session.user.id,
            churchId: ctx.session.user.churchId,
            action: 'admin_user_create',
            metadata: {
              newUserId: user.id,
              newUserEmail: user.email,
              newUserRole: user.role,
            }
          })

          return user
        } catch (error) {
          if (error instanceof TRPCError) throw error
          
          logger.error('Failed to create user', error as Error, {
            userId: ctx.session.user.id,
            churchId: ctx.session.user.churchId,
            action: 'admin_user_create_error',
            metadata: { email: input.email, role: input.role }
          })
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: '사용자 생성에 실패했습니다',
          })
        }
      }),

    // 사용자 수정
    update: adminProcedure
      .input(userUpdateSchema)
      .mutation(async ({ ctx, input }) => {
        const { id, password, ...data } = input

        try {
          // 자기 자신의 역할 변경 방지
          if (id === ctx.session.user.id && data.role && data.role !== ctx.session.user.role) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: '자신의 역할을 변경할 수 없습니다',
            })
          }

          // 비밀번호가 제공된 경우 해싱
          let updateData = { ...data }
          if (password) {
            // const hashedPassword = await bcrypt.hash(password, 12)
            updateData = { ...updateData, password } as any // 개발용 임시
          }

          const user = await ctx.prisma.user.update({
            where: {
              id,
              churchId: ctx.session.user.churchId,
            },
            data: updateData,
            select: {
              id: true,
              email: true,
              name: true,
              phone: true,
              role: true,
              isActive: true,
              updatedAt: true,
            },
          })

          logger.info('User updated by admin', {
            userId: ctx.session.user.id,
            churchId: ctx.session.user.churchId,
            action: 'admin_user_update',
            metadata: {
              targetUserId: id,
              updatedFields: Object.keys(data),
            }
          })

          return user
        } catch (error) {
          if (error instanceof TRPCError) throw error
          
          logger.error('Failed to update user', error as Error, {
            userId: ctx.session.user.id,
            churchId: ctx.session.user.churchId,
            action: 'admin_user_update_error',
            metadata: { targetUserId: id }
          })
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: '사용자 정보 수정에 실패했습니다',
          })
        }
      }),

    // 사용자 삭제 (비활성화)
    delete: adminProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        try {
          // 자기 자신 삭제 방지
          if (input.id === ctx.session.user.id) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: '자신의 계정을 삭제할 수 없습니다',
            })
          }

          const user = await ctx.prisma.user.update({
            where: {
              id: input.id,
              churchId: ctx.session.user.churchId,
            },
            data: {
              isActive: false,
            },
            select: {
              id: true,
              email: true,
              name: true,
            },
          })

          logger.info('User deactivated by admin', {
            userId: ctx.session.user.id,
            churchId: ctx.session.user.churchId,
            action: 'admin_user_delete',
            metadata: {
              targetUserId: input.id,
              targetUserEmail: user.email,
            }
          })

          return user
        } catch (error) {
          if (error instanceof TRPCError) throw error
          
          logger.error('Failed to delete user', error as Error, {
            userId: ctx.session.user.id,
            churchId: ctx.session.user.churchId,
            action: 'admin_user_delete_error',
            metadata: { targetUserId: input.id }
          })
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: '사용자 삭제에 실패했습니다',
          })
        }
      }),

    // 사용자 통계
    getStats: adminProcedure
      .query(async ({ ctx }) => {
        try {
          const churchId = ctx.session.user.churchId

          const [
            total,
            active,
            inactive,
            byRole,
            recentUsers,
          ] = await Promise.all([
            ctx.prisma.user.count({ where: { churchId } }),
            ctx.prisma.user.count({ where: { churchId, isActive: true } }),
            ctx.prisma.user.count({ where: { churchId, isActive: false } }),
            ctx.prisma.user.groupBy({
              by: ['role'],
              where: { churchId, isActive: true },
              _count: true,
            }),
            ctx.prisma.user.findMany({
              where: { churchId },
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
              },
              orderBy: { createdAt: 'desc' },
              take: 5,
            }),
          ])

          return {
            total,
            active,
            inactive,
            byRole,
            recentUsers,
          }
        } catch (error) {
          logger.error('Failed to fetch user statistics', error as Error, {
            userId: ctx.session.user.id,
            churchId: ctx.session.user.churchId,
            action: 'admin_user_stats_error'
          })
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: '사용자 통계를 불러오는데 실패했습니다',
          })
        }
      }),
  }),

  // === 권한 설정 관리 ===
  permissions: router({
    // 역할별 메뉴 권한 조회
    getMenuPermissions: adminProcedure
      .query(async ({ ctx }) => {
        // 기본 메뉴 권한 설정 (실제로는 DB에서 관리)
        const menuPermissions = {
          [UserRole.SUPER_ADMIN]: [
            'dashboard',
            'members',
            'offerings',
            'attendance',
            'visitations',
            'expense-reports',
            'reports',
            'admin',
            'admin.users',
            'admin.permissions',
            'admin.settings',
            'admin.backup',
            'data-management',
          ],
          [UserRole.FINANCIAL_MANAGER]: [
            'dashboard',
            'members',
            'offerings',
            'expense-reports',
            'reports',
          ],
          [UserRole.MINISTER]: [
            'dashboard',
            'members',
            'attendance',
            'visitations',
            'reports',
          ],
          [UserRole.COMMITTEE_CHAIR]: [
            'dashboard',
            'members',
            'reports',
          ],
          [UserRole.DEPARTMENT_HEAD]: [
            'dashboard',
            'members',
            'attendance',
            'reports',
          ],
          [UserRole.DEPARTMENT_ACCOUNTANT]: [
            'dashboard',
            'expense-reports',
          ],
          [UserRole.GENERAL_USER]: [
            'dashboard',
          ],
        }

        return menuPermissions
      }),

    // 메뉴 권한 업데이트 (향후 DB 기반으로 확장)
    updateMenuPermissions: adminProcedure
      .input(permissionMenuSchema)
      .mutation(async ({ ctx, input }) => {
        // 현재는 하드코딩된 권한을 사용하므로 로깅만 수행
        logger.info('Menu permissions update requested', {
          userId: ctx.session.user.id,
          churchId: ctx.session.user.churchId,
          action: 'admin_permissions_update',
          metadata: {
            role: input.role,
            menuItems: input.menuItems,
          }
        })

        // TODO: 실제 DB에 권한 정보 저장하는 로직 구현
        return { success: true, message: '권한이 업데이트되었습니다' }
      }),
  }),

  // === 시스템 설정 관리 ===
  settings: router({
    // 시스템 설정 조회
    getAll: adminProcedure
      .query(async ({ ctx }) => {
        try {
          // 기본 시스템 설정들 (실제로는 별도 SystemSetting 테이블에서 관리)
          const settings = [
            {
              key: 'church_name',
              value: ctx.session.user.churchName,
              description: '교회 이름',
              category: 'general',
            },
            {
              key: 'email_notifications_enabled',
              value: 'true',
              description: '이메일 알림 활성화',
              category: 'notifications',
            },
            {
              key: 'sms_notifications_enabled',
              value: 'false',
              description: 'SMS 알림 활성화',
              category: 'notifications',
            },
            {
              key: 'auto_backup_enabled',
              value: 'true',
              description: '자동 백업 활성화',
              category: 'backup',
            },
            {
              key: 'backup_retention_days',
              value: '30',
              description: '백업 보관 기간 (일)',
              category: 'backup',
            },
            {
              key: 'session_timeout_hours',
              value: '8',
              description: '세션 만료 시간 (시간)',
              category: 'security',
            },
          ]

          return settings
        } catch (error) {
          logger.error('Failed to fetch system settings', error as Error, {
            userId: ctx.session.user.id,
            churchId: ctx.session.user.churchId,
            action: 'admin_settings_fetch_error'
          })
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: '시스템 설정을 불러오는데 실패했습니다',
          })
        }
      }),

    // 시스템 설정 업데이트
    update: adminProcedure
      .input(systemSettingSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          // TODO: 실제 SystemSetting 테이블에 저장하는 로직 구현
          logger.info('System setting updated', {
            userId: ctx.session.user.id,
            churchId: ctx.session.user.churchId,
            action: 'admin_setting_update',
            metadata: {
              key: input.key,
              value: input.value,
            }
          })

          return { success: true, message: '설정이 업데이트되었습니다' }
        } catch (error) {
          logger.error('Failed to update system setting', error as Error, {
            userId: ctx.session.user.id,
            churchId: ctx.session.user.churchId,
            action: 'admin_setting_update_error',
            metadata: { key: input.key }
          })
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: '설정 업데이트에 실패했습니다',
          })
        }
      }),
  }),

  // === 데이터 백업/복원 ===
  backup: router({
    // 백업 목록 조회
    getBackupList: adminProcedure
      .query(async ({ ctx }) => {
        try {
          // TODO: 실제 백업 파일 목록을 스토리지에서 조회하는 로직 구현
          const backups = [
            {
              id: '1',
              filename: 'backup_2024-01-15_10-30.sql',
              size: 2048576, // bytes
              createdAt: new Date('2024-01-15T10:30:00Z'),
              type: 'manual',
              status: 'completed',
            },
            {
              id: '2',
              filename: 'backup_2024-01-14_02-00.sql',
              size: 1987654,
              createdAt: new Date('2024-01-14T02:00:00Z'),
              type: 'automatic',
              status: 'completed',
            },
          ]

          return backups
        } catch (error) {
          logger.error('Failed to fetch backup list', error as Error, {
            userId: ctx.session.user.id,
            churchId: ctx.session.user.churchId,
            action: 'admin_backup_list_error'
          })
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: '백업 목록을 불러오는데 실패했습니다',
          })
        }
      }),

    // 수동 백업 생성
    createBackup: adminProcedure
      .input(z.object({ 
        description: z.string().optional(),
        includeFiles: z.boolean().default(false) 
      }))
      .mutation(async ({ ctx, input }) => {
        try {
          // TODO: 실제 백업 생성 로직 구현
          const backupId = `backup_${Date.now()}`
          
          logger.info('Manual backup created', {
            userId: ctx.session.user.id,
            churchId: ctx.session.user.churchId,
            action: 'admin_backup_create',
            metadata: {
              backupId,
              description: input.description,
              includeFiles: input.includeFiles,
            }
          })

          return {
            id: backupId,
            message: '백업이 생성되었습니다',
            estimatedTime: 300, // seconds
          }
        } catch (error) {
          logger.error('Failed to create backup', error as Error, {
            userId: ctx.session.user.id,
            churchId: ctx.session.user.churchId,
            action: 'admin_backup_create_error'
          })
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: '백업 생성에 실패했습니다',
          })
        }
      }),

    // 백업에서 복원
    restoreBackup: adminProcedure
      .input(z.object({ backupId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        try {
          // TODO: 실제 복원 로직 구현 (매우 위험한 작업이므로 추가 확인 필요)
          logger.warn('Backup restoration initiated', {
            userId: ctx.session.user.id,
            churchId: ctx.session.user.churchId,
            action: 'admin_backup_restore',
            metadata: { backupId: input.backupId }
          })

          return {
            message: '복원이 시작되었습니다. 시스템이 잠시 중단될 수 있습니다.',
            estimatedTime: 600, // seconds
          }
        } catch (error) {
          logger.error('Failed to restore backup', error as Error, {
            userId: ctx.session.user.id,
            churchId: ctx.session.user.churchId,
            action: 'admin_backup_restore_error',
            metadata: { backupId: input.backupId }
          })
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: '백업 복원에 실패했습니다',
          })
        }
      }),

    // 백업 설정 조회/수정
    getConfig: adminProcedure
      .query(async ({ ctx }) => {
        // TODO: 실제 백업 설정을 DB에서 조회
        return {
          autoBackupEnabled: true,
          backupSchedule: '0 2 * * *', // 매일 오전 2시
          retentionDays: 30,
          includeFiles: false,
        }
      }),

    updateConfig: adminProcedure
      .input(backupConfigSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          // TODO: 실제 백업 설정을 DB에 저장
          logger.info('Backup configuration updated', {
            userId: ctx.session.user.id,
            churchId: ctx.session.user.churchId,
            action: 'admin_backup_config_update',
            metadata: input
          })

          return { success: true, message: '백업 설정이 업데이트되었습니다' }
        } catch (error) {
          logger.error('Failed to update backup configuration', error as Error, {
            userId: ctx.session.user.id,
            churchId: ctx.session.user.churchId,
            action: 'admin_backup_config_error'
          })
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: '백업 설정 업데이트에 실패했습니다',
          })
        }
      }),
  }),

  // === 교회 정보 관리 ===
  church: router({
    // 교회 정보 조회
    getInfo: adminProcedure
      .query(async ({ ctx }) => {
        try {
          const church = await ctx.prisma.church.findUnique({
            where: {
              id: ctx.session.user.churchId,
            },
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              address: true,
              website: true,
              pastorName: true,
              description: true,
              logoUrl: true,
              createdAt: true,
              updatedAt: true,
            },
          })

          if (!church) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: '교회 정보를 찾을 수 없습니다',
            })
          }

          return church
        } catch (error) {
          if (error instanceof TRPCError) throw error
          
          logger.error('Failed to fetch church info', error as Error, {
            userId: ctx.session.user.id,
            churchId: ctx.session.user.churchId,
            action: 'admin_church_info_fetch_error'
          })
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: '교회 정보를 불러오는데 실패했습니다',
          })
        }
      }),

    // 교회 정보 수정 (SUPER_ADMIN만 가능)
    updateInfo: adminProcedure
      .input(churchUpdateSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          // SUPER_ADMIN 권한 확인
          if (ctx.session.user.role !== UserRole.SUPER_ADMIN) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: '교회 정보 수정 권한이 없습니다. 시스템 관리자만 수정할 수 있습니다.',
            })
          }

          const church = await ctx.prisma.church.update({
            where: {
              id: ctx.session.user.churchId,
            },
            data: input,
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              address: true,
              website: true,
              pastorName: true,
              description: true,
              updatedAt: true,
            },
          })

          logger.info('Church information updated', {
            userId: ctx.session.user.id,
            churchId: ctx.session.user.churchId,
            action: 'admin_church_info_update',
            metadata: {
              updatedFields: Object.keys(input),
            }
          })

          return church
        } catch (error) {
          if (error instanceof TRPCError) throw error
          
          logger.error('Failed to update church info', error as Error, {
            userId: ctx.session.user.id,
            churchId: ctx.session.user.churchId,
            action: 'admin_church_info_update_error'
          })
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: '교회 정보 수정에 실패했습니다',
          })
        }
      }),
  }),

  // === 시스템 상태 모니터링 ===
  system: router({
    // 시스템 상태 조회
    getStatus: adminProcedure
      .query(async ({ ctx }) => {
        try {
          const [
            userCount,
            memberCount,
            totalOfferings,
            systemHealth,
          ] = await Promise.all([
            ctx.prisma.user.count({ where: { churchId: ctx.session.user.churchId, isActive: true } }),
            ctx.prisma.member.count({ where: { churchId: ctx.session.user.churchId } }),
            ctx.prisma.offering.aggregate({
              where: { churchId: ctx.session.user.churchId },
              _sum: { amount: true },
            }),
            // TODO: 실제 시스템 헬스 체크 로직
            Promise.resolve({
              database: 'healthy',
              storage: 'healthy',
              memory: 'healthy',
              cpu: 'normal',
            }),
          ])

          return {
            users: userCount,
            members: memberCount,
            totalOfferings: totalOfferings._sum.amount || 0,
            systemHealth,
            uptime: process.uptime(),
            version: '1.0.0', // TODO: package.json에서 가져오기
            lastBackup: new Date('2024-01-15T02:00:00Z'), // TODO: 실제 백업 시간
          }
        } catch (error) {
          logger.error('Failed to fetch system status', error as Error, {
            userId: ctx.session.user.id,
            churchId: ctx.session.user.churchId,
            action: 'admin_system_status_error'
          })
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: '시스템 상태를 불러오는데 실패했습니다',
          })
        }
      }),
  }),
})