import { z } from 'zod'
import { router, protectedProcedure, managerProcedure } from '@/lib/trpc/server'
import { TRPCError } from '@trpc/server'
import { DataManagementService } from '@/lib/data-management'
import {
  DataType,
  FileFormat,
  ImportOptions,
  ExportOptions,
  BackupOptions
} from '@/lib/data-management/types'
import { logger } from '@/lib/logger'

// Input schemas
const uploadFileSchema = z.object({
  fileBuffer: z.string(), // Base64 encoded file
  filename: z.string(),
  dataType: z.nativeEnum(DataType)
})

const validateDataSchema = z.object({
  data: z.array(z.record(z.any())),
  dataType: z.nativeEnum(DataType),
  options: z.object({
    skipErrors: z.boolean().default(true),
    updateExisting: z.boolean().default(false),
    validateOnly: z.boolean().default(false)
  }).optional()
})

const importDataSchema = z.object({
  validatedData: z.array(z.record(z.any())),
  dataType: z.nativeEnum(DataType),
  options: z.object({
    skipErrors: z.boolean().default(true),
    updateExisting: z.boolean().default(false),
    validateOnly: z.boolean().default(false)
  }).optional()
})

const exportOptionsSchema = z.object({
  dataType: z.nativeEnum(DataType),
  format: z.nativeEnum(FileFormat).default(FileFormat.EXCEL),
  dateRange: z.object({
    start: z.string().transform(str => new Date(str)),
    end: z.string().transform(str => new Date(str))
  }).optional(),
  filters: z.record(z.any()).optional(),
  includeInactive: z.boolean().default(false),
  filename: z.string().optional()
})

const backupOptionsSchema = z.object({
  includeMembers: z.boolean().default(true),
  includeOfferings: z.boolean().default(true),
  includeAttendances: z.boolean().default(true),
  includeVisitations: z.boolean().default(true),
  includeExpenseReports: z.boolean().default(true),
  includeOrganizations: z.boolean().default(true),
  dateRange: z.object({
    start: z.string().transform(str => new Date(str)),
    end: z.string().transform(str => new Date(str))
  }).optional(),
  filename: z.string().optional()
})

const restoreBackupSchema = z.object({
  fileBuffer: z.string(), // Base64 encoded file
  filename: z.string(),
  selectedDataTypes: z.array(z.nativeEnum(DataType)).optional()
})

export const dataManagementRouter = router({
  /**
   * 파일 업로드 및 파싱
   */
  uploadFile: managerProcedure
    .input(uploadFileSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const churchId = ctx.session.user.churchId
        const dataService = new DataManagementService(ctx.prisma, churchId)

        // Base64 디코딩
        const fileBuffer = Buffer.from(input.fileBuffer, 'base64')

        const result = await dataService.uploadFile(
          fileBuffer,
          input.filename,
          input.dataType
        )

        logger.info('File uploaded successfully', {
          churchId,
          action: 'file_upload',
          metadata: {
            filename: input.filename,
            dataType: input.dataType,
            rowCount: result.data.length,
            errorCount: result.errors.length
          }
        })

        return result
      } catch (error) {
        logger.error('File upload failed', error as Error, {
          churchId: ctx.session.user.churchId,
          action: 'file_upload',
          metadata: {
            filename: input.filename
          }
        })
        
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error instanceof Error ? error.message : '파일 업로드 중 오류가 발생했습니다'
        })
      }
    }),

  /**
   * 데이터 유효성 검증
   */
  validateData: managerProcedure
    .input(validateDataSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const churchId = ctx.session.user.churchId
        const dataService = new DataManagementService(ctx.prisma, churchId)

        const result = await dataService.validateData(
          input.data,
          input.dataType,
          input.options
        )

        logger.info('Data validation completed', {
          churchId,
          action: 'data_validation',
          metadata: {
            dataType: input.dataType,
            total: result.summary.total,
            successful: result.summary.successful,
            failed: result.summary.failed
          }
        })

        return result
      } catch (error) {
        logger.error('Data validation failed', error as Error, {
          churchId: ctx.session.user.churchId,
          action: 'data_validation',
          metadata: {
            dataType: input.dataType
          }
        })
        
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error instanceof Error ? error.message : '데이터 검증 중 오류가 발생했습니다'
        })
      }
    }),

  /**
   * 데이터 가져오기
   */
  importData: managerProcedure
    .input(importDataSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const churchId = ctx.session.user.churchId
        const dataService = new DataManagementService(ctx.prisma, churchId)

        const result = await dataService.importData(
          input.validatedData,
          input.dataType,
          input.options
        )

        logger.info('Data import completed', {
          churchId,
          action: 'data_import',
          metadata: {
            dataType: input.dataType,
            total: result.summary.total,
            successful: result.summary.successful,
            failed: result.summary.failed
          }
        })

        return result
      } catch (error) {
        logger.error('Data import failed', error as Error, {
          churchId: ctx.session.user.churchId,
          action: 'data_import',
          metadata: {
            dataType: input.dataType
          }
        })
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : '데이터 가져오기 중 오류가 발생했습니다'
        })
      }
    }),

  /**
   * 가져오기 이력 조회
   */
  getImportHistory: protectedProcedure
    .input(z.object({
      page: z.number().default(1),
      limit: z.number().default(20)
    }))
    .query(async ({ ctx, input }) => {
      try {
        const churchId = ctx.session.user.churchId

        // 실제로는 별도 테이블에서 이력을 조회해야 함
        // 여기서는 기본적인 구조만 제공
        return {
          items: [],
          total: 0,
          page: input.page,
          pages: 0,
          hasMore: false
        }
      } catch (error) {
        logger.error('Failed to get import history', error as Error, {
          churchId: ctx.session.user.churchId,
          action: 'import_history'
        })
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: '가져오기 이력 조회 중 오류가 발생했습니다'
        })
      }
    }),

  /**
   * 데이터 내보내기
   */
  exportData: protectedProcedure
    .input(exportOptionsSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const churchId = ctx.session.user.churchId
        const dataService = new DataManagementService(ctx.prisma, churchId)

        const result = await dataService.exportData(input)

        if (!result.success) {
          throw new Error(result.error)
        }

        // ArrayBuffer를 Base64로 변환하여 전송
        const base64Data = Buffer.from(result.data as ArrayBuffer).toString('base64')

        logger.info('Data export completed', {
          churchId,
          action: 'data_export',
          metadata: {
            dataType: input.dataType,
            format: input.format,
            filename: result.filename
          }
        })

        return {
          success: true,
          filename: result.filename,
          data: base64Data
        }
      } catch (error) {
        logger.error('Data export failed', error as Error, {
          churchId: ctx.session.user.churchId,
          action: 'data_export',
          metadata: {
            options: input
          }
        })
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : '데이터 내보내기 중 오류가 발생했습니다'
        })
      }
    }),

  /**
   * 전체 백업 생성
   */
  createBackup: managerProcedure
    .input(backupOptionsSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const churchId = ctx.session.user.churchId
        const dataService = new DataManagementService(ctx.prisma, churchId)

        const result = await dataService.createBackup(input)

        if (!result.success) {
          throw new Error(result.error)
        }

        // ArrayBuffer를 Base64로 변환하여 전송
        const base64Data = Buffer.from(result.data as ArrayBuffer).toString('base64')

        logger.info('Backup created successfully', {
          churchId,
          action: 'backup_create',
          metadata: {
            filename: result.filename,
            includedTables: result.includedTables,
            recordCounts: result.recordCounts
          }
        })

        return {
          success: true,
          filename: result.filename,
          data: base64Data,
          includedTables: result.includedTables,
          recordCounts: result.recordCounts
        }
      } catch (error) {
        logger.error('Backup creation failed', error as Error, {
          churchId: ctx.session.user.churchId,
          action: 'backup_create',
          metadata: {
            options: input
          }
        })
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : '백업 생성 중 오류가 발생했습니다'
        })
      }
    }),

  /**
   * 백업 이력 조회
   */
  getBackupHistory: protectedProcedure
    .input(z.object({
      page: z.number().default(1),
      limit: z.number().default(20)
    }))
    .query(async ({ ctx, input }) => {
      try {
        const churchId = ctx.session.user.churchId

        // 실제로는 별도 테이블에서 백업 이력을 조회해야 함
        // 여기서는 기본적인 구조만 제공
        return {
          items: [],
          total: 0,
          page: input.page,
          pages: 0,
          hasMore: false
        }
      } catch (error) {
        logger.error('Failed to get backup history', error as Error, {
          churchId: ctx.session.user.churchId,
          action: 'backup_history'
        })
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: '백업 이력 조회 중 오류가 발생했습니다'
        })
      }
    }),

  /**
   * 백업 파일 다운로드
   */
  downloadBackup: protectedProcedure
    .input(z.object({
      backupId: z.string()
    }))
    .query(async ({ ctx, input }) => {
      try {
        const churchId = ctx.session.user.churchId

        // 실제로는 백업 파일을 조회해서 반환해야 함
        // 여기서는 기본적인 구조만 제공
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '백업 파일을 찾을 수 없습니다'
        })
      } catch (error) {
        logger.error('Backup download failed', error as Error, {
          churchId: ctx.session.user.churchId,
          action: 'backup_download',
          metadata: {
            backupId: input.backupId
          }
        })
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: '백업 다운로드 중 오류가 발생했습니다'
        })
      }
    }),

  /**
   * 백업 복원
   */
  restoreBackup: managerProcedure
    .input(restoreBackupSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const churchId = ctx.session.user.churchId
        const dataService = new DataManagementService(ctx.prisma, churchId)

        // Base64 디코딩
        const fileBuffer = Buffer.from(input.fileBuffer, 'base64')

        const result = await dataService.restoreBackup(
          fileBuffer,
          input.filename
        )

        logger.info('Backup restore completed', {
          churchId,
          action: 'backup_restore',
          metadata: {
            filename: input.filename,
            total: result.summary.total,
            successful: result.summary.successful,
            failed: result.summary.failed
          }
        })

        return result
      } catch (error) {
        logger.error('Backup restore failed', error as Error, {
          churchId: ctx.session.user.churchId,
          action: 'backup_restore',
          metadata: {
            filename: input.filename
          }
        })
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : '백업 복원 중 오류가 발생했습니다'
        })
      }
    }),

  /**
   * 템플릿 다운로드
   */
  getTemplate: protectedProcedure
    .input(z.object({
      dataType: z.nativeEnum(DataType)
    }))
    .query(async ({ ctx, input }) => {
      try {
        const churchId = ctx.session.user.churchId
        const dataService = new DataManagementService(ctx.prisma, churchId)

        const result = await dataService.generateTemplate(input.dataType)

        if (!result.success) {
          throw new Error(result.error)
        }

        // ArrayBuffer를 Base64로 변환하여 전송
        const base64Data = Buffer.from(result.data as ArrayBuffer).toString('base64')

        logger.info('Template generated', {
          churchId,
          action: 'template_generate',
          metadata: {
            dataType: input.dataType,
            filename: result.filename
          }
        })

        return {
          success: true,
          filename: result.filename,
          data: base64Data
        }
      } catch (error) {
        logger.error('Template generation failed', error as Error, {
          churchId: ctx.session.user.churchId,
          action: 'template_generate',
          metadata: {
            dataType: input.dataType
          }
        })
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : '템플릿 생성 중 오류가 발생했습니다'
        })
      }
    }),

  /**
   * 데이터 통계 조회
   */
  getDataStats: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const churchId = ctx.session.user.churchId
        const dataService = new DataManagementService(ctx.prisma, churchId)

        const stats = await dataService.getDataStats()

        logger.info('Data stats retrieved', {
          churchId,
          action: 'data_stats',
          metadata: {
            stats
          }
        })

        return stats
      } catch (error) {
        logger.error('Failed to get data stats', error as Error, {
          churchId: ctx.session.user.churchId,
          action: 'data_stats'
        })
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: '데이터 통계 조회 중 오류가 발생했습니다'
        })
      }
    }),

  /**
   * 백업 미리보기
   */
  previewRestore: managerProcedure
    .input(z.object({
      fileBuffer: z.string(), // Base64 encoded file
      filename: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const churchId = ctx.session.user.churchId
        const dataService = new DataManagementService(ctx.prisma, churchId)

        // Base64 디코딩
        const fileBuffer = Buffer.from(input.fileBuffer, 'base64')

        // RestoreService를 통해 미리보기 생성
        const restoreService = dataService['restoreService'] as any
        if (!restoreService || typeof restoreService.previewRestore !== 'function') {
          throw new Error('복원 서비스를 사용할 수 없습니다')
        }

        const result = await restoreService.previewRestore(
          fileBuffer,
          input.filename
        )

        logger.info('Restore preview completed', {
          churchId,
          action: 'restore_preview',
          metadata: {
            filename: input.filename,
            totalRecords: result.totalRecords,
            validRecords: result.totalValidRecords,
            invalidRecords: result.totalInvalidRecords
          }
        })

        return result
      } catch (error) {
        logger.error('Restore preview failed', error as Error, {
          churchId: ctx.session.user.churchId,
          action: 'restore_preview',
          metadata: {
            filename: input.filename
          }
        })
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : '복원 미리보기 중 오류가 발생했습니다'
        })
      }
    }),

  /**
   * 백업 파일 검증
   */
  validateBackupFile: protectedProcedure
    .input(z.object({
      fileBuffer: z.string(), // Base64 encoded file
      filename: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const churchId = ctx.session.user.churchId
        const dataService = new DataManagementService(ctx.prisma, churchId)

        // Base64 디코딩
        const fileBuffer = Buffer.from(input.fileBuffer, 'base64')

        // RestoreService를 통해 파일 검증
        const restoreService = dataService['restoreService'] as any
        if (!restoreService || typeof restoreService.validateBackupFile !== 'function') {
          throw new Error('복원 서비스를 사용할 수 없습니다')
        }

        const result = await restoreService.validateBackupFile(fileBuffer)

        logger.info('Backup file validation completed', {
          churchId,
          action: 'backup_validation',
          metadata: {
            filename: input.filename,
            isValid: result.isValid,
            sheetsCount: result.sheets.length,
            estimatedRecords: result.estimatedRecords
          }
        })

        return result
      } catch (error) {
        logger.error('Backup file validation failed', error as Error, {
          churchId: ctx.session.user.churchId,
          action: 'backup_validation',
          metadata: {
            filename: input.filename
          }
        })
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : '백업 파일 검증 중 오류가 발생했습니다'
        })
      }
    })
})