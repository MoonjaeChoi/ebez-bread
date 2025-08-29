import { PrismaClient } from '@prisma/client'
import * as XLSX from 'xlsx'
import {
  ImportResult,
  ImportError,
  DataType,
  ImportOptions,
  ProgressCallback
} from '../types'
import { ExcelParser } from '../import/excelParser'
import { DataValidator } from '../import/validator'
import { DataProcessor } from '../import/processor'
import { logger } from '@/lib/logger'

export class RestoreService {
  private prisma: PrismaClient
  private churchId: string
  private excelParser: ExcelParser
  private validator: DataValidator
  private processor: DataProcessor

  constructor(prisma: PrismaClient, churchId: string) {
    this.prisma = prisma
    this.churchId = churchId
    this.excelParser = new ExcelParser()
    this.validator = new DataValidator(prisma, churchId)
    this.processor = new DataProcessor(prisma, churchId)
  }

  /**
   * 백업 파일 복원
   */
  async restoreBackup(
    fileBuffer: Buffer,
    filename: string,
    progressCallback?: ProgressCallback
  ): Promise<ImportResult> {
    try {
      progressCallback?.(5, '백업 파일 분석 중...')

      // Excel 파일 유효성 검사
      const validation = this.excelParser.validateExcelFile(fileBuffer)
      if (!validation.isValid) {
        throw new Error(validation.error || '유효하지 않은 백업 파일입니다')
      }

      progressCallback?.(10, '워크시트 분석 중...')

      // 워크북 읽기
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' })
      const sheetNames = workbook.SheetNames

      // 메타데이터 시트 제외
      const dataSheets = sheetNames.filter(name => 
        !['요약', '내보내기정보', 'Summary', 'Metadata'].includes(name)
      )

      if (dataSheets.length === 0) {
        throw new Error('복원할 데이터 시트를 찾을 수 없습니다')
      }

      progressCallback?.(20, '복원 옵션 설정 중...')

      // 복원 옵션 (기존 데이터 업데이트 허용)
      const restoreOptions: ImportOptions = {
        dataType: DataType.MEMBERS, // 동적으로 변경됨
        skipErrors: true,
        updateExisting: true,
        validateOnly: false
      }

      let totalProcessed = 0
      let totalSuccessful = 0
      let totalFailed = 0
      const allErrors: ImportError[] = []
      const processedSheets: string[] = []

      // 각 시트별로 복원 처리
      for (let sheetIndex = 0; sheetIndex < dataSheets.length; sheetIndex++) {
        const sheetName = dataSheets[sheetIndex]
        
        const baseProgress = 20 + Math.floor((sheetIndex / dataSheets.length) * 70)
        progressCallback?.(baseProgress, `${sheetName} 복원 중...`)

        try {
          const dataType = this.getDataTypeFromSheetName(sheetName)
          if (!dataType) {
            logger.warn(`Unknown sheet name: ${sheetName}`)
            continue
          }

          const sheetResult = await this.restoreSheet(
            workbook.Sheets[sheetName],
            dataType,
            restoreOptions,
            (progress, message) => {
              const adjustedProgress = baseProgress + Math.floor(progress * 0.7 / dataSheets.length)
              progressCallback?.(adjustedProgress, `${sheetName}: ${message}`)
            }
          )

          totalProcessed += sheetResult.summary.total
          totalSuccessful += sheetResult.summary.successful
          totalFailed += sheetResult.summary.failed
          allErrors.push(...sheetResult.errors)
          processedSheets.push(sheetName)

        } catch (error) {
          logger.error(`Failed to restore sheet: ${sheetName}`, error instanceof Error ? error : new Error(String(error)))
          allErrors.push({
            row: 0,
            message: `${sheetName} 시트 복원 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
          })
        }
      }

      progressCallback?.(95, '복원 완료 처리 중...')

      // 복원 로그 기록
      await this.logRestoreOperation(filename, processedSheets, totalProcessed, totalSuccessful, totalFailed)

      progressCallback?.(100, '백업 복원 완료')

      const result: ImportResult = {
        success: totalSuccessful > 0,
        errors: allErrors,
        summary: {
          total: totalProcessed,
          successful: totalSuccessful,
          failed: totalFailed
        }
      }

      logger.info('Backup restore completed', {
        churchId: this.churchId,
        action: 'restore_backup',
        metadata: {
          filename,
          processedSheets,
          total: totalProcessed,
          successful: totalSuccessful,
          failed: totalFailed
        }
      })

      return result
    } catch (error) {
      logger.error('Backup restore failed', error instanceof Error ? error : new Error(String(error)), {
        churchId: this.churchId,
        action: 'restore_backup',
        metadata: {
          filename
        }
      })

      return {
        success: false,
        errors: [{
          row: 0,
          message: error instanceof Error ? error.message : '백업 복원 중 알 수 없는 오류가 발생했습니다'
        }],
        summary: {
          total: 0,
          successful: 0,
          failed: 0
        }
      }
    }
  }

  /**
   * 선택적 복원 (특정 데이터 타입만)
   */
  async restoreSelectedData(
    fileBuffer: Buffer,
    filename: string,
    selectedDataTypes: DataType[],
    progressCallback?: ProgressCallback
  ): Promise<ImportResult> {
    try {
      progressCallback?.(10, '백업 파일 분석 중...')

      const workbook = XLSX.read(fileBuffer, { type: 'buffer' })
      const sheetNames = workbook.SheetNames

      // 선택된 데이터 타입에 해당하는 시트만 필터링
      const selectedSheets = sheetNames.filter(sheetName => {
        const dataType = this.getDataTypeFromSheetName(sheetName)
        return dataType && selectedDataTypes.includes(dataType)
      })

      if (selectedSheets.length === 0) {
        throw new Error('선택한 데이터 타입에 해당하는 시트를 찾을 수 없습니다')
      }

      let totalProcessed = 0
      let totalSuccessful = 0
      let totalFailed = 0
      const allErrors: ImportError[] = []

      const restoreOptions: ImportOptions = {
        dataType: DataType.MEMBERS, // 동적으로 변경됨
        skipErrors: true,
        updateExisting: true,
        validateOnly: false
      }

      // 선택된 시트들만 복원
      for (let sheetIndex = 0; sheetIndex < selectedSheets.length; sheetIndex++) {
        const sheetName = selectedSheets[sheetIndex]
        const dataType = this.getDataTypeFromSheetName(sheetName)!

        const baseProgress = 10 + Math.floor((sheetIndex / selectedSheets.length) * 80)
        progressCallback?.(baseProgress, `${sheetName} 복원 중...`)

        const sheetResult = await this.restoreSheet(
          workbook.Sheets[sheetName],
          dataType,
          restoreOptions
        )

        totalProcessed += sheetResult.summary.total
        totalSuccessful += sheetResult.summary.successful
        totalFailed += sheetResult.summary.failed
        allErrors.push(...sheetResult.errors)
      }

      progressCallback?.(100, '선택적 복원 완료')

      return {
        success: totalSuccessful > 0,
        errors: allErrors,
        summary: {
          total: totalProcessed,
          successful: totalSuccessful,
          failed: totalFailed
        }
      }
    } catch (error) {
      logger.error('Selected restore failed', error instanceof Error ? error : new Error(String(error)), {
        churchId: this.churchId,
        action: 'restore_selected_data',
        metadata: {
          filename,
          selectedDataTypes
        }
      })

      return {
        success: false,
        errors: [{
          row: 0,
          message: error instanceof Error ? error.message : '선택적 복원 중 알 수 없는 오류가 발생했습니다'
        }],
        summary: {
          total: 0,
          successful: 0,
          failed: 0
        }
      }
    }
  }

  /**
   * 복원 미리보기 (실제 저장하지 않고 검증만)
   */
  async previewRestore(
    fileBuffer: Buffer,
    filename: string,
    progressCallback?: ProgressCallback
  ): Promise<{
    sheets: Array<{
      sheetName: string;
      dataType: DataType;
      recordCount: number;
      validRecords: number;
      invalidRecords: number;
      errors: ImportError[];
    }>;
    totalRecords: number;
    totalValidRecords: number;
    totalInvalidRecords: number;
  }> {
    try {
      progressCallback?.(10, '백업 파일 분석 중...')

      const workbook = XLSX.read(fileBuffer, { type: 'buffer' })
      const sheetNames = workbook.SheetNames

      const dataSheets = sheetNames.filter(name => 
        !['요약', '내보내기정보', 'Summary', 'Metadata'].includes(name)
      )

      const sheets: Array<{
        sheetName: string;
        dataType: DataType;
        recordCount: number;
        validRecords: number;
        invalidRecords: number;
        errors: ImportError[];
      }> = []

      let totalRecords = 0
      let totalValidRecords = 0
      let totalInvalidRecords = 0

      // 각 시트별로 미리보기 처리
      for (let sheetIndex = 0; sheetIndex < dataSheets.length; sheetIndex++) {
        const sheetName = dataSheets[sheetIndex]
        
        const baseProgress = 10 + Math.floor((sheetIndex / dataSheets.length) * 80)
        progressCallback?.(baseProgress, `${sheetName} 분석 중...`)

        const dataType = this.getDataTypeFromSheetName(sheetName)
        if (!dataType) continue

        try {
          // 시트 데이터 파싱
          const worksheet = workbook.Sheets[sheetName]
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

          if (jsonData.length <= 1) {
            sheets.push({
              sheetName,
              dataType,
              recordCount: 0,
              validRecords: 0,
              invalidRecords: 0,
              errors: []
            })
            continue
          }

          // 헤더와 데이터 분리
          const headers = jsonData[0] as string[]
          const dataRows = jsonData.slice(1) as any[][]

          // 데이터 객체 변환
          const data = dataRows.map((row, index) => {
            const rowData: any = {}
            headers.forEach((header, colIndex) => {
              rowData[header] = row[colIndex] || null
            })
            return rowData
          }).filter(row => 
            Object.values(row).some(value => 
              value !== null && value !== undefined && value !== ''
            )
          )

          // 데이터 유효성 검증 (저장하지 않음)
          const validationResult = await this.validator.validateData(
            data,
            dataType,
            { dataType, validateOnly: true }
          )

          sheets.push({
            sheetName,
            dataType,
            recordCount: data.length,
            validRecords: validationResult.summary.successful,
            invalidRecords: validationResult.summary.failed,
            errors: validationResult.errors
          })

          totalRecords += data.length
          totalValidRecords += validationResult.summary.successful
          totalInvalidRecords += validationResult.summary.failed

        } catch (error) {
          sheets.push({
            sheetName,
            dataType,
            recordCount: 0,
            validRecords: 0,
            invalidRecords: 0,
            errors: [{
              row: 0,
              message: `시트 분석 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
            }]
          })
        }
      }

      progressCallback?.(100, '미리보기 분석 완료')

      return {
        sheets,
        totalRecords,
        totalValidRecords,
        totalInvalidRecords
      }
    } catch (error) {
      logger.error('Restore preview failed', error instanceof Error ? error : new Error(String(error)), { churchId: this.churchId, action: 'restore_preview', metadata: { filename } })
      throw error
    }
  }

  /**
   * 단일 시트 복원
   */
  private async restoreSheet(
    worksheet: XLSX.WorkSheet,
    dataType: DataType,
    options: ImportOptions,
    progressCallback?: ProgressCallback
  ): Promise<ImportResult> {
    try {
      progressCallback?.(10, '시트 데이터 파싱 중...')

      // 시트를 JSON으로 변환
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

      if (jsonData.length <= 1) {
        return {
          success: true,
          errors: [],
          summary: {
            total: 0,
            successful: 0,
            failed: 0
          }
        }
      }

      // 헤더와 데이터 분리
      const headers = jsonData[0] as string[]
      const dataRows = jsonData.slice(1) as any[][]

      // 데이터 객체 변환
      const data = dataRows.map((row, index) => {
        const rowData: any = {}
        headers.forEach((header, colIndex) => {
          const cellValue = row[colIndex]
          rowData[header] = cellValue !== undefined && cellValue !== '' ? cellValue : null
        })
        return rowData
      }).filter(row => 
        Object.values(row).some(value => 
          value !== null && value !== undefined && value !== ''
        )
      )

      if (data.length === 0) {
        return {
          success: true,
          errors: [],
          summary: {
            total: 0,
            successful: 0,
            failed: 0
          }
        }
      }

      progressCallback?.(30, '데이터 유효성 검증 중...')

      // 컬럼 매핑 적용
      const mappedData = this.mapSheetColumns(data, dataType)

      // 데이터 유효성 검증
      const validationResult = await this.validator.validateData(
        mappedData,
        dataType,
        { ...options, dataType }
      )

      if (!validationResult.success || !validationResult.data) {
        return validationResult
      }

      progressCallback?.(60, '데이터 저장 중...')

      // 데이터 저장
      const processingResult = await this.processor.processData(
        validationResult.data,
        dataType,
        { ...options, dataType }
      )

      return {
        success: processingResult.success,
        data: processingResult.data,
        errors: [...validationResult.errors, ...processingResult.errors],
        summary: {
          total: data.length,
          successful: processingResult.summary.successful,
          failed: data.length - processingResult.summary.successful
        }
      }
    } catch (error) {
      logger.error('Sheet restore failed', error instanceof Error ? error : new Error(String(error)), { churchId: this.churchId, action: 'restore_sheet', metadata: { dataType } })
      
      return {
        success: false,
        errors: [{
          row: 0,
          message: `시트 복원 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
        }],
        summary: {
          total: 0,
          successful: 0,
          failed: 0
        }
      }
    }
  }

  /**
   * 시트명으로부터 데이터 타입 추론
   */
  private getDataTypeFromSheetName(sheetName: string): DataType | null {
    const sheetNameLower = sheetName.toLowerCase()

    if (sheetNameLower.includes('교인') || sheetNameLower.includes('member')) {
      return DataType.MEMBERS
    }
    if (sheetNameLower.includes('헌금') || sheetNameLower.includes('offering')) {
      return DataType.OFFERINGS
    }
    if (sheetNameLower.includes('출석') || sheetNameLower.includes('attendance')) {
      return DataType.ATTENDANCES
    }
    if (sheetNameLower.includes('심방') || sheetNameLower.includes('visitation')) {
      return DataType.VISITATIONS
    }
    if (sheetNameLower.includes('지출') || sheetNameLower.includes('expense')) {
      return DataType.EXPENSE_REPORTS
    }

    return null
  }

  /**
   * 시트 컬럼 매핑
   */
  private mapSheetColumns(data: any[], dataType: DataType): any[] {
    const columnMappings = this.excelParser.getColumnMappings(dataType)
    
    return data.map(row => {
      const mappedRow: any = {}
      
      for (const [originalKey, value] of Object.entries(row)) {
        const mappedKey = columnMappings[originalKey] || originalKey
        mappedRow[mappedKey] = value
      }
      
      return mappedRow
    })
  }

  /**
   * 복원 작업 로그 기록
   */
  private async logRestoreOperation(
    filename: string,
    processedSheets: string[],
    totalProcessed: number,
    totalSuccessful: number,
    totalFailed: number
  ): Promise<void> {
    try {
      // 복원 이력을 별도 테이블에 기록할 수 있음 (향후 구현)
      logger.info('Restore operation logged', {
        churchId: this.churchId,
        action: 'log_restore_operation',
        metadata: {
          filename,
          processedSheets,
          totalProcessed,
          totalSuccessful,
          totalFailed,
          timestamp: new Date()
        }
      })
    } catch (error) {
      logger.error('Failed to log restore operation', error instanceof Error ? error : new Error(String(error)))
      // 로그 기록 실패는 복원 작업에 영향을 주지 않음
    }
  }

  /**
   * 백업 파일 구조 검증
   */
  async validateBackupFile(fileBuffer: Buffer): Promise<{
    isValid: boolean;
    errors: string[];
    sheets: string[];
    estimatedRecords: number;
  }> {
    try {
      // Excel 파일 유효성 검사
      const validation = this.excelParser.validateExcelFile(fileBuffer)
      if (!validation.isValid) {
        return {
          isValid: false,
          errors: [validation.error || '유효하지 않은 파일입니다'],
          sheets: [],
          estimatedRecords: 0
        }
      }

      // 워크북 읽기
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' })
      const sheetNames = workbook.SheetNames

      const errors: string[] = []
      const dataSheets: string[] = []
      let estimatedRecords = 0

      // 각 시트 검증
      for (const sheetName of sheetNames) {
        if (['요약', '내보내기정보', 'Summary', 'Metadata'].includes(sheetName)) {
          continue // 메타데이터 시트는 건너뛰기
        }

        const dataType = this.getDataTypeFromSheetName(sheetName)
        if (!dataType) {
          errors.push(`알 수 없는 시트입니다: ${sheetName}`)
          continue
        }

        try {
          const worksheet = workbook.Sheets[sheetName]
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
          
          if (jsonData.length > 1) {
            estimatedRecords += jsonData.length - 1 // 헤더 제외
            dataSheets.push(sheetName)
          }
        } catch (error) {
          errors.push(`시트 읽기 실패: ${sheetName}`)
        }
      }

      if (dataSheets.length === 0) {
        errors.push('복원할 데이터 시트를 찾을 수 없습니다')
      }

      return {
        isValid: errors.length === 0 && dataSheets.length > 0,
        errors,
        sheets: dataSheets,
        estimatedRecords
      }
    } catch (error) {
      return {
        isValid: false,
        errors: [error instanceof Error ? error.message : '파일 검증 중 오류가 발생했습니다'],
        sheets: [],
        estimatedRecords: 0
      }
    }
  }
}