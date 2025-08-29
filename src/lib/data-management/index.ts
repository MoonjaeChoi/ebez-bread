import { PrismaClient } from '@prisma/client'
import { logger } from '@/lib/logger'
import {
  DataType,
  FileFormat,
  ImportOptions,
  ExportOptions,
  BackupOptions,
  ImportResult,
  ExportResult,
  BackupResult,
  ProgressCallback
} from './types'
import { ExcelParser } from './import/excelParser'
import { CSVParser } from './import/csvParser'
import { DataValidator } from './import/validator'
import { DataProcessor } from './import/processor'
import { ExcelExporter } from './export/excelExporter'
import { CSVExporter } from './export/csvExporter'
import { DataFormatter } from './export/formatter'
import { BackupService } from './backup/backupService'
import { RestoreService } from './backup/restoreService'

export class DataManagementService {
  private prisma: PrismaClient
  private churchId: string
  private excelParser: ExcelParser
  private csvParser: CSVParser
  private validator: DataValidator
  private processor: DataProcessor
  private excelExporter: ExcelExporter
  private csvExporter: CSVExporter
  private formatter: DataFormatter
  private backupService: BackupService
  private restoreService: RestoreService

  constructor(prisma: PrismaClient, churchId: string) {
    this.prisma = prisma
    this.churchId = churchId
    this.excelParser = new ExcelParser()
    this.csvParser = new CSVParser()
    this.validator = new DataValidator(prisma, churchId)
    this.processor = new DataProcessor(prisma, churchId)
    this.excelExporter = new ExcelExporter(prisma, churchId)
    this.csvExporter = new CSVExporter(prisma, churchId)
    this.formatter = new DataFormatter()
    this.backupService = new BackupService(prisma, churchId)
    this.restoreService = new RestoreService(prisma, churchId)
  }

  /**
   * 파일 업로드 및 파싱
   */
  async uploadFile(
    fileBuffer: Buffer,
    filename: string,
    dataType: DataType,
    progressCallback?: ProgressCallback
  ): Promise<{ data: any[]; errors: any[] }> {
    try {
      progressCallback?.(10, '파일 형식 확인 중...')

      const isExcel = filename.toLowerCase().endsWith('.xlsx') || filename.toLowerCase().endsWith('.xls')
      const isCsv = filename.toLowerCase().endsWith('.csv')

      if (!isExcel && !isCsv) {
        throw new Error('지원하지 않는 파일 형식입니다. Excel(.xlsx) 또는 CSV 파일만 업로드 가능합니다.')
      }

      progressCallback?.(30, '파일 파싱 중...')

      let data: any[]
      let errors: any[] = []

      if (isExcel) {
        const result = await this.excelParser.parseFile(fileBuffer, dataType)
        data = result.data
        errors = result.errors
      } else {
        const result = await this.csvParser.parseFile(fileBuffer, dataType)
        data = result.data
        errors = result.errors
      }

      progressCallback?.(80, '데이터 정리 중...')

      // 빈 행 제거
      data = data.filter(row => 
        Object.values(row).some(value => 
          value !== null && value !== undefined && value !== ''
        )
      )

      progressCallback?.(100, '파일 업로드 완료')

      logger.info('File uploaded and parsed', {
        churchId: this.churchId,
        action: 'file_upload_parse',
        metadata: {
          filename,
          dataType,
          rowCount: data.length,
          errorCount: errors.length
        }
      })

      return { data, errors }
    } catch (error) {
      logger.error('File upload failed', error instanceof Error ? error : new Error(String(error)), {
        churchId: this.churchId,
        action: 'file_upload_parse',
        metadata: {
          filename,
          dataType
        }
      })
      throw error
    }
  }

  /**
   * 데이터 유효성 검증
   */
  async validateData(
    data: any[],
    dataType: DataType,
    options: Partial<ImportOptions> = {},
    progressCallback?: ProgressCallback
  ): Promise<ImportResult> {
    try {
      progressCallback?.(10, '유효성 검증 시작...')

      const result = await this.validator.validateData(data, dataType, options, progressCallback)

      progressCallback?.(100, '유효성 검증 완료')

      logger.info('Data validation completed', {
        churchId: this.churchId,
        action: 'validate_data',
        metadata: {
          dataType,
          total: result.summary.total,
          successful: result.summary.successful,
          failed: result.summary.failed
        }
      })

      return result
    } catch (error) {
      logger.error('Data validation failed', error instanceof Error ? error : new Error(String(error)), {
        churchId: this.churchId,
        action: 'validate_data',
        metadata: {
          dataType
        }
      })
      throw error
    }
  }

  /**
   * 데이터 가져오기
   */
  async importData(
    validatedData: any[],
    dataType: DataType,
    options: Partial<ImportOptions> = {},
    progressCallback?: ProgressCallback
  ): Promise<ImportResult> {
    try {
      progressCallback?.(10, '데이터 가져오기 시작...')

      const result = await this.processor.processData(validatedData, dataType, options, progressCallback)

      progressCallback?.(100, '데이터 가져오기 완료')

      logger.info('Data import completed', {
        churchId: this.churchId,
        action: 'import_data',
        metadata: {
          dataType,
          total: result.summary.total,
          successful: result.summary.successful,
          failed: result.summary.failed
        }
      })

      return result
    } catch (error) {
      logger.error('Data import failed', error instanceof Error ? error : new Error(String(error)), {
        churchId: this.churchId,
        action: 'import_data',
        metadata: {
          dataType
        }
      })
      throw error
    }
  }

  /**
   * 데이터 내보내기
   */
  async exportData(
    options: ExportOptions,
    progressCallback?: ProgressCallback
  ): Promise<ExportResult> {
    try {
      progressCallback?.(10, '데이터 조회 중...')

      // 데이터 포매팅
      const formattedData = await this.formatter.formatData(options, progressCallback)

      progressCallback?.(70, '파일 생성 중...')

      let result: ExportResult
      if (options.format === FileFormat.EXCEL) {
        result = await this.excelExporter.exportData(formattedData, options)
      } else {
        result = await this.csvExporter.exportData(formattedData, options)
      }

      progressCallback?.(100, '내보내기 완료')

      logger.info('Data export completed', {
        churchId: this.churchId,
        action: 'export_data',
        metadata: {
          dataType: options.dataType,
          format: options.format,
          filename: result.filename
        }
      })

      return result
    } catch (error) {
      logger.error('Data export failed', error instanceof Error ? error : new Error(String(error)), {
        churchId: this.churchId,
        action: 'export_data',
        metadata: {
          options
        }
      })
      throw error
    }
  }

  /**
   * 백업 생성
   */
  async createBackup(
    options: BackupOptions = {},
    progressCallback?: ProgressCallback
  ): Promise<BackupResult> {
    try {
      progressCallback?.(10, '백업 시작...')

      const result = await this.backupService.createBackup(options, progressCallback)

      progressCallback?.(100, '백업 완료')

      logger.info('Backup created', {
        churchId: this.churchId,
        action: 'create_backup',
        metadata: {
          filename: result.filename,
          includedTables: result.includedTables,
          recordCounts: result.recordCounts
        }
      })

      return result
    } catch (error) {
      logger.error('Backup creation failed', error instanceof Error ? error : new Error(String(error)), {
        churchId: this.churchId,
        action: 'create_backup',
        metadata: {
          options
        }
      })
      throw error
    }
  }

  /**
   * 백업 복원
   */
  async restoreBackup(
    fileBuffer: Buffer,
    filename: string,
    progressCallback?: ProgressCallback
  ): Promise<ImportResult> {
    try {
      progressCallback?.(10, '백업 파일 분석 중...')

      const result = await this.restoreService.restoreBackup(fileBuffer, filename, progressCallback)

      progressCallback?.(100, '백업 복원 완료')

      logger.info('Backup restored', {
        churchId: this.churchId,
        action: 'restore_backup',
        metadata: {
          filename,
          total: result.summary.total,
          successful: result.summary.successful,
          failed: result.summary.failed
        }
      })

      return result
    } catch (error) {
      logger.error('Backup restoration failed', error instanceof Error ? error : new Error(String(error)), {
        churchId: this.churchId,
        action: 'restore_backup',
        metadata: {
          filename
        }
      })
      throw error
    }
  }

  /**
   * 템플릿 생성
   */
  async generateTemplate(dataType: DataType): Promise<ExportResult> {
    try {
      const templateData = this.getTemplateData(dataType)
      const options: ExportOptions = {
        dataType,
        format: FileFormat.EXCEL,
        filename: `${this.getTemplateName(dataType)}_템플릿.xlsx`
      }

      const result = await this.excelExporter.exportData(templateData, options)

      logger.info('Template generated', {
        churchId: this.churchId,
        action: 'template_generated',
        metadata: {
          dataType,
          filename: result.filename
        }
      })

      return result
    } catch (error) {
      logger.error('Template generation failed', error instanceof Error ? error : new Error(String(error)), {
        churchId: this.churchId,
        action: 'template_generation',
        metadata: {
          dataType
        }
      })
      throw error
    }
  }

  /**
   * 데이터 통계 조회
   */
  async getDataStats(): Promise<Record<string, number>> {
    try {
      const [
        membersCount,
        offeringsCount,
        attendancesCount,
        visitationsCount,
        expenseReportsCount
      ] = await Promise.all([
        this.prisma.member.count({ where: { churchId: this.churchId } }),
        this.prisma.offering.count({ where: { churchId: this.churchId } }),
        this.prisma.attendance.count({ where: { churchId: this.churchId } }),
        this.prisma.visitation.count({ where: { churchId: this.churchId } }),
        this.prisma.expenseReport.count({ where: { churchId: this.churchId } })
      ])

      return {
        [DataType.MEMBERS]: membersCount,
        [DataType.OFFERINGS]: offeringsCount,
        [DataType.ATTENDANCES]: attendancesCount,
        [DataType.VISITATIONS]: visitationsCount,
        [DataType.EXPENSE_REPORTS]: expenseReportsCount
      }
    } catch (error) {
      logger.error('Failed to get data stats', error instanceof Error ? error : new Error(String(error)), {
        churchId: this.churchId,
        action: 'get_data_stats'
      })
      throw error
    }
  }

  private getTemplateData(dataType: DataType): any[] {
    switch (dataType) {
      case DataType.MEMBERS:
        return [{
          이름: '홍길동',
          전화번호: '010-1234-5678',
          이메일: 'hong@example.com',
          생년월일: '1990-01-01',
          주소: '서울시 강남구',
          성별: '남',
          결혼상태: '기혼',
          세례일: '2020-01-01',
          입교일: '2020-06-01',
          직분: '집사',
          부서: '남선교회',
          가족ID: 'FAM001',
          가족관계: '가장',
          상태: '활동',
          비고: '특이사항 없음'
        }]
      case DataType.OFFERINGS:
        return [{
          교인명: '홍길동',
          금액: '100000',
          헌금종류: '십일조',
          설명: '2024년 1월 십일조',
          헌금일: '2024-01-07'
        }]
      case DataType.ATTENDANCES:
        return [{
          교인명: '홍길동',
          예배종류: '주일오전예배',
          출석일: '2024-01-07',
          출석여부: '예',
          비고: ''
        }]
      case DataType.VISITATIONS:
        return [{
          교인명: '홍길동',
          심방일: '2024-01-15',
          목적: '안부 확인',
          내용: '건강하게 지내고 계심',
          후속관리: '아니오',
          후속관리일: ''
        }]
      case DataType.EXPENSE_REPORTS:
        return [{
          제목: '교회 전기요금',
          설명: '2024년 1월 전기요금 납부',
          금액: '150000',
          분류: '공과금',
          상태: '대기중',
          신청일: '2024-01-15',
          승인일: '',
          거부일: '',
          거부사유: ''
        }]
      default:
        return []
    }
  }

  private getTemplateName(dataType: DataType): string {
    switch (dataType) {
      case DataType.MEMBERS: return '교인명부'
      case DataType.OFFERINGS: return '헌금내역'
      case DataType.ATTENDANCES: return '출석현황'
      case DataType.VISITATIONS: return '심방기록'
      case DataType.EXPENSE_REPORTS: return '지출결의서'
      default: return '데이터'
    }
  }
}