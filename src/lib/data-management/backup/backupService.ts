import { PrismaClient } from '@prisma/client'
import {
  BackupOptions,
  BackupResult,
  DataType,
  ExportOptions,
  FileFormat,
  ProgressCallback
} from '../types'
import { ExcelExporter } from '../export/excelExporter'
import { DataFormatter } from '../export/formatter'
import { logger, LogContext } from '@/lib/logger'

export class BackupService {
  private prisma: PrismaClient
  private churchId: string
  private excelExporter: ExcelExporter
  private formatter: DataFormatter

  constructor(prisma: PrismaClient, churchId: string) {
    this.prisma = prisma
    this.churchId = churchId
    this.excelExporter = new ExcelExporter(prisma, churchId)
    this.formatter = new DataFormatter()
  }

  /**
   * 전체 백업 생성
   */
  async createBackup(
    options: BackupOptions = {},
    progressCallback?: ProgressCallback
  ): Promise<BackupResult> {
    try {
      progressCallback?.(5, '백업 시작...')

      // 기본 옵션 설정
      const backupOptions: BackupOptions = {
        includeMembers: true,
        includeOfferings: true,
        includeAttendances: true,
        includeVisitations: true,
        includeExpenseReports: true,
        includeOrganizations: true,
        ...options
      }

      progressCallback?.(10, '백업할 데이터 조회 중...')

      // 각 데이터 타입별로 데이터 조회
      const dataMap = new Map<DataType, any[]>()
      const recordCounts: Record<string, number> = {}
      const includedTables: string[] = []

      let currentStep = 10
      const totalSteps = this.countIncludedTypes(backupOptions)
      const stepIncrement = 60 / totalSteps

      // 교인 데이터
      if (backupOptions.includeMembers) {
        progressCallback?.(currentStep, '교인 데이터 조회 중...')
        const members = await this.fetchMembersData(backupOptions.dateRange)
        dataMap.set(DataType.MEMBERS, this.formatter.formatMembersData(members))
        recordCounts[DataType.MEMBERS] = members.length
        includedTables.push('교인명부')
        currentStep += stepIncrement
      }

      // 헌금 데이터
      if (backupOptions.includeOfferings) {
        progressCallback?.(currentStep, '헌금 데이터 조회 중...')
        const offerings = await this.fetchOfferingsData(backupOptions.dateRange)
        dataMap.set(DataType.OFFERINGS, this.formatter.formatOfferingsData(offerings))
        recordCounts[DataType.OFFERINGS] = offerings.length
        includedTables.push('헌금내역')
        currentStep += stepIncrement
      }

      // 출석 데이터
      if (backupOptions.includeAttendances) {
        progressCallback?.(currentStep, '출석 데이터 조회 중...')
        const attendances = await this.fetchAttendancesData(backupOptions.dateRange)
        dataMap.set(DataType.ATTENDANCES, this.formatter.formatAttendancesData(attendances))
        recordCounts[DataType.ATTENDANCES] = attendances.length
        includedTables.push('출석현황')
        currentStep += stepIncrement
      }

      // 심방 데이터
      if (backupOptions.includeVisitations) {
        progressCallback?.(currentStep, '심방 데이터 조회 중...')
        const visitations = await this.fetchVisitationsData(backupOptions.dateRange)
        dataMap.set(DataType.VISITATIONS, this.formatter.formatVisitationsData(visitations))
        recordCounts[DataType.VISITATIONS] = visitations.length
        includedTables.push('심방기록')
        currentStep += stepIncrement
      }

      // 지출결의서 데이터
      if (backupOptions.includeExpenseReports) {
        progressCallback?.(currentStep, '지출결의서 데이터 조회 중...')
        const expenseReports = await this.fetchExpenseReportsData(backupOptions.dateRange)
        dataMap.set(DataType.EXPENSE_REPORTS, this.formatter.formatExpenseReportsData(expenseReports))
        recordCounts[DataType.EXPENSE_REPORTS] = expenseReports.length
        includedTables.push('지출결의서')
        currentStep += stepIncrement
      }

      // 조직 데이터
      if (backupOptions.includeOrganizations) {
        progressCallback?.(currentStep, '조직도 데이터 조회 중...')
        const organizations = await this.fetchOrganizationsData()
        dataMap.set(DataType.ORGANIZATIONS, this.formatter.formatOrganizationsData(organizations))
        recordCounts[DataType.ORGANIZATIONS] = organizations.length
        includedTables.push('조직도')
        currentStep += stepIncrement
      }

      progressCallback?.(80, '백업 파일 생성 중...')

      // 다중 시트 Excel 파일 생성
      const filename = backupOptions.filename || this.generateBackupFilename()
      const exportResult = await this.excelExporter.exportMultipleSheets(
        dataMap,
        filename,
        (progress, message) => {
          const adjustedProgress = 80 + Math.floor(progress * 0.15)
          progressCallback?.(adjustedProgress, message)
        }
      )

      if (!exportResult.success) {
        throw new Error(exportResult.error || '백업 파일 생성에 실패했습니다')
      }

      progressCallback?.(100, '백업 완료')

      const result: BackupResult = {
        success: true,
        filename: exportResult.filename!,
        data: exportResult.data!,
        includedTables,
        recordCounts
      }

      logger.info('Backup created successfully', {
        churchId: this.churchId,
        action: 'create_backup',
        metadata: {
          filename: result.filename,
          includedTables,
          recordCounts,
          totalRecords: Object.values(recordCounts).reduce((sum, count) => sum + count, 0)
        }
      })

      return result
    } catch (error) {
      const logContext: LogContext = {
        churchId: this.churchId,
        action: 'create_backup',
        metadata: {
          options
        }
      }
      logger.error('Backup creation failed', error instanceof Error ? error : new Error(String(error)), logContext)

      return {
        success: false,
        includedTables: [],
        recordCounts: {},
        error: error instanceof Error ? error.message : '백업 생성 중 알 수 없는 오류가 발생했습니다'
      }
    }
  }

  /**
   * 증분 백업 생성 (특정 날짜 이후 변경된 데이터만)
   */
  async createIncrementalBackup(
    lastBackupDate: Date,
    options: Omit<BackupOptions, 'dateRange'> = {},
    progressCallback?: ProgressCallback
  ): Promise<BackupResult> {
    const incrementalOptions: BackupOptions = {
      ...options,
      dateRange: {
        start: lastBackupDate,
        end: new Date()
      },
      filename: options.filename || this.generateIncrementalBackupFilename(lastBackupDate)
    }

    return this.createBackup(incrementalOptions, progressCallback)
  }

  /**
   * 압축 백업 생성 (향후 구현)
   */
  async createCompressedBackup(
    options: BackupOptions = {},
    progressCallback?: ProgressCallback
  ): Promise<BackupResult> {
    // TODO: ZIP 압축 기능 구현
    // 현재는 일반 백업과 동일하게 처리
    return this.createBackup(options, progressCallback)
  }

  /**
   * 교인 데이터 조회
   */
  private async fetchMembersData(dateRange?: { start: Date; end: Date }): Promise<any[]> {
    const where: any = { churchId: this.churchId }

    if (dateRange) {
      where.createdAt = {
        gte: dateRange.start,
        lte: dateRange.end
      }
    }

    return await this.prisma.member.findMany({
      where,
      include: {
        position: { select: { name: true } },
        department: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    })
  }

  /**
   * 헌금 데이터 조회
   */
  private async fetchOfferingsData(dateRange?: { start: Date; end: Date }): Promise<any[]> {
    const where: any = { churchId: this.churchId }

    if (dateRange) {
      where.offeringDate = {
        gte: dateRange.start,
        lte: dateRange.end
      }
    }

    return await this.prisma.offering.findMany({
      where,
      include: {
        member: { select: { name: true } }
      },
      orderBy: { offeringDate: 'desc' }
    })
  }

  /**
   * 출석 데이터 조회
   */
  private async fetchAttendancesData(dateRange?: { start: Date; end: Date }): Promise<any[]> {
    const where: any = { churchId: this.churchId }

    if (dateRange) {
      where.attendanceDate = {
        gte: dateRange.start,
        lte: dateRange.end
      }
    }

    return await this.prisma.attendance.findMany({
      where,
      include: {
        member: { select: { name: true } }
      },
      orderBy: { attendanceDate: 'desc' }
    })
  }

  /**
   * 심방 데이터 조회
   */
  private async fetchVisitationsData(dateRange?: { start: Date; end: Date }): Promise<any[]> {
    const where: any = {
      member: { churchId: this.churchId }
    }

    if (dateRange) {
      where.visitDate = {
        gte: dateRange.start,
        lte: dateRange.end
      }
    }

    return await this.prisma.visitation.findMany({
      where,
      include: {
        member: { select: { name: true } }
      },
      orderBy: { visitDate: 'desc' }
    })
  }

  /**
   * 지출결의서 데이터 조회
   */
  private async fetchExpenseReportsData(dateRange?: { start: Date; end: Date }): Promise<any[]> {
    const where: any = { churchId: this.churchId }

    if (dateRange) {
      where.requestDate = {
        gte: dateRange.start,
        lte: dateRange.end
      }
    }

    return await this.prisma.expenseReport.findMany({
      where,
      include: {
        requester: { select: { name: true } }
      },
      orderBy: { requestDate: 'desc' }
    })
  }

  /**
   * 조직 데이터 조회
   */
  private async fetchOrganizationsData(): Promise<any[]> {
    return await this.prisma.organization.findMany({
      where: { churchId: this.churchId },
      include: {
        parent: { select: { code: true } }
      },
      orderBy: [
        { level: 'asc' },
        { sortOrder: 'asc' },
        { name: 'asc' }
      ]
    })
  }

  /**
   * 데이터 타입별 백업 생성
   */
  async createDataTypeBackup(
    dataType: DataType,
    options: ExportOptions = { dataType, format: FileFormat.EXCEL },
    progressCallback?: ProgressCallback
  ): Promise<BackupResult> {
    try {
      progressCallback?.(10, `${this.getDataTypeName(dataType)} 데이터 조회 중...`)

      let data: any[] = []
      let formattedData: any[] = []

      switch (dataType) {
        case DataType.MEMBERS:
          data = await this.fetchMembersData(options.dateRange)
          formattedData = this.formatter.formatMembersData(data)
          break
        case DataType.OFFERINGS:
          data = await this.fetchOfferingsData(options.dateRange)
          formattedData = this.formatter.formatOfferingsData(data)
          break
        case DataType.ATTENDANCES:
          data = await this.fetchAttendancesData(options.dateRange)
          formattedData = this.formatter.formatAttendancesData(data)
          break
        case DataType.VISITATIONS:
          data = await this.fetchVisitationsData(options.dateRange)
          formattedData = this.formatter.formatVisitationsData(data)
          break
        case DataType.EXPENSE_REPORTS:
          data = await this.fetchExpenseReportsData(options.dateRange)
          formattedData = this.formatter.formatExpenseReportsData(data)
          break
        case DataType.ORGANIZATIONS:
          data = await this.fetchOrganizationsData()
          formattedData = this.formatter.formatOrganizationsData(data)
          break
      }

      progressCallback?.(60, '백업 파일 생성 중...')

      const exportResult = await this.excelExporter.exportData(formattedData, options, progressCallback)

      if (!exportResult.success) {
        throw new Error(exportResult.error || '백업 파일 생성에 실패했습니다')
      }

      const result: BackupResult = {
        success: true,
        filename: exportResult.filename!,
        data: exportResult.data!,
        includedTables: [this.getDataTypeName(dataType)],
        recordCounts: { [dataType]: data.length }
      }

      logger.info('Data type backup created', {
        churchId: this.churchId,
        action: 'export_data_by_type',
        metadata: {
          dataType,
          recordCount: data.length,
          filename: result.filename
        }
      })

      return result
    } catch (error) {
      logger.error('Data type backup failed', error instanceof Error ? error : new Error(String(error)), {
        churchId: this.churchId,
        action: 'export_data_by_type',
        metadata: {
          dataType
        }
      })

      return {
        success: false,
        includedTables: [],
        recordCounts: {},
        error: error instanceof Error ? error.message : '백업 생성 중 알 수 없는 오류가 발생했습니다'
      }
    }
  }

  /**
   * 백업 메타데이터 조회
   */
  async getBackupMetadata(): Promise<{
    totalRecords: Record<string, number>;
    lastUpdated: Record<string, Date | null>;
    estimatedSize: number;
  }> {
    try {
      const [
        membersCount,
        offeringsCount,
        attendancesCount,
        visitationsCount,
        expenseReportsCount,
        organizationsCount
      ] = await Promise.all([
        this.prisma.member.count({ where: { churchId: this.churchId } }),
        this.prisma.offering.count({ where: { churchId: this.churchId } }),
        this.prisma.attendance.count({ where: { churchId: this.churchId } }),
        this.prisma.visitation.count({
          where: { member: { churchId: this.churchId } }
        }),
        this.prisma.expenseReport.count({ where: { churchId: this.churchId } }),
        this.prisma.organization.count({ where: { churchId: this.churchId } })
      ])

      const totalRecords = {
        [DataType.MEMBERS]: membersCount,
        [DataType.OFFERINGS]: offeringsCount,
        [DataType.ATTENDANCES]: attendancesCount,
        [DataType.VISITATIONS]: visitationsCount,
        [DataType.EXPENSE_REPORTS]: expenseReportsCount,
        [DataType.ORGANIZATIONS]: organizationsCount
      }

      // 최근 업데이트 날짜 조회
      const [
        lastMemberUpdate,
        lastOfferingUpdate,
        lastAttendanceUpdate,
        lastVisitationUpdate,
        lastExpenseUpdate,
        lastOrganizationUpdate
      ] = await Promise.all([
        this.prisma.member.findFirst({
          where: { churchId: this.churchId },
          orderBy: { updatedAt: 'desc' },
          select: { updatedAt: true }
        }),
        this.prisma.offering.findFirst({
          where: { churchId: this.churchId },
          orderBy: { updatedAt: 'desc' },
          select: { updatedAt: true }
        }),
        this.prisma.attendance.findFirst({
          where: { churchId: this.churchId },
          orderBy: { updatedAt: 'desc' },
          select: { updatedAt: true }
        }),
        this.prisma.visitation.findFirst({
          where: { member: { churchId: this.churchId } },
          orderBy: { updatedAt: 'desc' },
          select: { updatedAt: true }
        }),
        this.prisma.expenseReport.findFirst({
          where: { churchId: this.churchId },
          orderBy: { updatedAt: 'desc' },
          select: { updatedAt: true }
        }),
        this.prisma.organization.findFirst({
          where: { churchId: this.churchId },
          orderBy: { updatedAt: 'desc' },
          select: { updatedAt: true }
        })
      ])

      const lastUpdated = {
        [DataType.MEMBERS]: lastMemberUpdate?.updatedAt || null,
        [DataType.OFFERINGS]: lastOfferingUpdate?.updatedAt || null,
        [DataType.ATTENDANCES]: lastAttendanceUpdate?.updatedAt || null,
        [DataType.VISITATIONS]: lastVisitationUpdate?.updatedAt || null,
        [DataType.EXPENSE_REPORTS]: lastExpenseUpdate?.updatedAt || null,
        [DataType.ORGANIZATIONS]: lastOrganizationUpdate?.updatedAt || null
      }

      // 예상 파일 크기 계산 (대략적)
      const totalRecordCount = Object.values(totalRecords).reduce((sum, count) => sum + count, 0)
      const estimatedSize = Math.max(totalRecordCount * 200, 1024) // 레코드당 약 200바이트 가정

      return {
        totalRecords,
        lastUpdated,
        estimatedSize
      }
    } catch (error) {
      logger.error('Failed to get backup metadata', error instanceof Error ? error : new Error(String(error)), {
        churchId: this.churchId,
        action: 'get_backup_metadata'
      })

      return {
        totalRecords: {},
        lastUpdated: {},
        estimatedSize: 0
      }
    }
  }

  /**
   * 포함된 데이터 타입 수 계산
   */
  private countIncludedTypes(options: BackupOptions): number {
    let count = 0
    if (options.includeMembers) count++
    if (options.includeOfferings) count++
    if (options.includeAttendances) count++
    if (options.includeVisitations) count++
    if (options.includeExpenseReports) count++
    if (options.includeOrganizations) count++
    return count
  }

  /**
   * 백업 파일명 생성
   */
  private generateBackupFilename(): string {
    const now = new Date()
    const dateStr = now.toISOString().split('T')[0]
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '')
    return `교회데이터_전체백업_${dateStr}_${timeStr}.xlsx`
  }

  /**
   * 증분 백업 파일명 생성
   */
  private generateIncrementalBackupFilename(lastBackupDate: Date): string {
    const now = new Date()
    const dateStr = now.toISOString().split('T')[0]
    const lastDateStr = lastBackupDate.toISOString().split('T')[0]
    return `교회데이터_증분백업_${lastDateStr}_${dateStr}.xlsx`
  }

  /**
   * 데이터 타입명 조회
   */
  private getDataTypeName(dataType: DataType): string {
    switch (dataType) {
      case DataType.MEMBERS: return '교인명부'
      case DataType.OFFERINGS: return '헌금내역'
      case DataType.ATTENDANCES: return '출석현황'
      case DataType.VISITATIONS: return '심방기록'
      case DataType.EXPENSE_REPORTS: return '지출결의서'
      case DataType.ORGANIZATIONS: return '조직도'
      default: return '데이터'
    }
  }
}