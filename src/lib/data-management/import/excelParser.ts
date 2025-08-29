import * as XLSX from 'xlsx'
import { DataType, ImportError, FileUploadResult, ProgressCallback } from '../types'
import { logger } from '@/lib/logger'

export class ExcelParser {
  private readonly maxFileSize = 10 * 1024 * 1024 // 10MB
  private readonly maxRows = 10000

  /**
   * Excel 파일 파싱
   */
  async parseFile(
    fileBuffer: Buffer,
    dataType: DataType,
    progressCallback?: ProgressCallback
  ): Promise<FileUploadResult> {
    try {
      progressCallback?.(10, '파일 크기 검사 중...')
      
      // 파일 크기 검사
      if (fileBuffer.length > this.maxFileSize) {
        throw new Error(`파일 크기가 너무 큽니다. 최대 ${this.maxFileSize / (1024 * 1024)}MB까지 지원합니다.`)
      }

      progressCallback?.(20, 'Excel 파일 읽는 중...')

      // Excel 파일 읽기
      const workbook = XLSX.read(fileBuffer, { 
        type: 'buffer',
        cellText: true,
        cellNF: false,
        cellHTML: false
      })

      progressCallback?.(40, '워크시트 분석 중...')

      // 첫 번째 워크시트 선택
      const sheetNames = workbook.SheetNames
      if (sheetNames.length === 0) {
        throw new Error('워크시트를 찾을 수 없습니다.')
      }

      const worksheet = workbook.Sheets[sheetNames[0]]
      if (!worksheet) {
        throw new Error('워크시트가 비어있습니다.')
      }

      progressCallback?.(60, '데이터 변환 중...')

      // JSON으로 변환
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: '',
        blankrows: false
      }) as any[][]

      if (jsonData.length === 0) {
        throw new Error('파일에 데이터가 없습니다.')
      }

      if (jsonData.length > this.maxRows) {
        throw new Error(`데이터가 너무 많습니다. 최대 ${this.maxRows}행까지 지원합니다.`)
      }

      progressCallback?.(80, '컬럼 매핑 중...')

      // 헤더 행 추출 (첫 번째 행)
      const headers = jsonData[0]?.map(header => 
        String(header || '').trim()
      ).filter(header => header !== '') || []

      if (headers.length === 0) {
        throw new Error('헤더 행을 찾을 수 없습니다.')
      }

      // 데이터 행들 (헤더를 제외한 나머지)
      const dataRows = jsonData.slice(1)

      // 헤더와 데이터를 객체로 변환
      const data: any[] = []
      const errors: ImportError[] = []

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i]
        const rowIndex = i + 2 // Excel의 실제 행 번호 (헤더 + 1)

        try {
          const rowData: any = {}
          let hasData = false

          for (let j = 0; j < headers.length; j++) {
            const header = headers[j]
            const cellValue = row[j]

            if (cellValue !== undefined && cellValue !== null && cellValue !== '') {
              rowData[header] = this.parseCell(cellValue, header, dataType)
              hasData = true
            } else {
              rowData[header] = null
            }
          }

          // 빈 행이 아닌 경우에만 추가
          if (hasData) {
            data.push(rowData)
          }
        } catch (error) {
          errors.push({
            row: rowIndex,
            message: error instanceof Error ? error.message : '행 파싱 중 오류가 발생했습니다',
            value: row
          })
        }
      }

      progressCallback?.(100, '파싱 완료')

      const result: FileUploadResult = {
        data,
        errors,
        metadata: {
          filename: 'excel_file.xlsx',
          fileSize: fileBuffer.length,
          rowCount: data.length,
          columnCount: headers.length,
          format: 'excel'
        }
      }

      logger.info('Excel file parsed successfully', {
        action: 'excel_parse',
        metadata: {
          rowCount: data.length,
          columnCount: headers.length,
          errorCount: errors.length
        }
      })

      return result
    } catch (error) {
      logger.error('Excel parsing failed', error instanceof Error ? error : new Error(String(error)))
      throw error
    }
  }

  /**
   * 셀 값 파싱
   */
  private parseCell(cellValue: any, header: string, dataType: DataType): any {
    if (cellValue === null || cellValue === undefined || cellValue === '') {
      return null
    }

    const value = String(cellValue).trim()

    // 날짜 관련 컬럼들
    const dateFields = [
      '생년월일', '세례일', '입교일', 'birthDate', 'baptismDate', 'confirmationDate',
      '헌금일', 'offeringDate',
      '출석일', 'attendanceDate',
      '심방일', '후속관리일', 'visitDate', 'followUpDate',
      '신청일', '승인일', '거부일', 'requestDate', 'approvedDate', 'rejectedDate'
    ]

    const booleanFields = [
      '출석여부', '후속관리', 'isPresent', 'followUpNeeded'
    ]

    const numberFields = [
      '금액', 'amount'
    ]

    // 날짜 처리
    if (dateFields.some(field => header.includes(field) || field.includes(header))) {
      return this.parseDate(value)
    }

    // 불린 처리
    if (booleanFields.some(field => header.includes(field) || field.includes(header))) {
      return this.parseBoolean(value)
    }

    // 숫자 처리
    if (numberFields.some(field => header.includes(field) || field.includes(header))) {
      return this.parseNumber(value)
    }

    // 기본적으로 문자열 반환
    return value
  }

  /**
   * 날짜 파싱
   */
  private parseDate(value: string): Date | null {
    if (!value || value === '') return null

    try {
      // Excel 날짜 숫자 처리
      const numValue = parseFloat(value)
      if (!isNaN(numValue) && numValue > 1) {
        // Excel 날짜를 JavaScript Date로 변환
        const excelDate = XLSX.SSF.parse_date_code(numValue)
        if (excelDate) {
          return new Date(excelDate.y, excelDate.m - 1, excelDate.d)
        }
      }

      // 일반 날짜 문자열 처리
      const dateFormats = [
        /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
        /^\d{4}\/\d{2}\/\d{2}$/, // YYYY/MM/DD
        /^\d{4}\.\d{2}\.\d{2}$/, // YYYY.MM.DD
        /^\d{2}-\d{2}-\d{4}$/, // DD-MM-YYYY
        /^\d{2}\/\d{2}\/\d{4}$/, // DD/MM/YYYY
        /^\d{2}\.\d{2}\.\d{4}$/ // DD.MM.YYYY
      ]

      const parsedDate = new Date(value)
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate
      }

      // 한국어 날짜 형식 처리
      const koreanDateMatch = value.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/)
      if (koreanDateMatch) {
        const [, year, month, day] = koreanDateMatch
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
      }

      return null
    } catch (error) {
      return null
    }
  }

  /**
   * 불린 파싱
   */
  private parseBoolean(value: string): boolean {
    const lowerValue = value.toLowerCase()
    const trueValues = ['true', '1', 'yes', 'y', '예', '네', '참', 'o', 'ok']
    const falseValues = ['false', '0', 'no', 'n', '아니오', '아니요', '거짓', 'x']

    if (trueValues.includes(lowerValue)) return true
    if (falseValues.includes(lowerValue)) return false

    // 기본값은 true (출석의 경우)
    return true
  }

  /**
   * 숫자 파싱
   */
  private parseNumber(value: string): number {
    // 콤마 제거
    const cleanValue = value.replace(/,/g, '')

    const num = parseFloat(cleanValue)
    if (isNaN(num)) {
      throw new Error(`숫자 형식이 올바르지 않습니다: ${value}`)
    }

    return num
  }

  /**
   * Excel 파일 유효성 검사
   */
  validateExcelFile(fileBuffer: Buffer): { isValid: boolean; error?: string } {
    try {
      // Magic number 검사
      const magicNumbers = [
        [0x50, 0x4B], // ZIP 기반 파일 (xlsx)
        [0xD0, 0xCF] // OLE2 기반 파일 (xls)
      ]

      const header = Array.from(fileBuffer.slice(0, 8))
      const isValidMagicNumber = magicNumbers.some(magic =>
        magic.every((byte, index) => header[index] === byte)
      )

      if (!isValidMagicNumber) {
        return {
          isValid: false,
          error: '올바른 Excel 파일이 아닙니다'
        }
      }

      return { isValid: true }
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : '파일 유효성 검사 실패'
      }
    }
  }

  /**
   * 지원되는 데이터 타입별 컬럼 매핑 정보
   */
  getColumnMappings(dataType: DataType): { [koreanHeader: string]: string } {
    switch (dataType) {
      case DataType.MEMBERS:
        return {
          '이름': 'name',
          '전화번호': 'phone',
          '이메일': 'email',
          '생년월일': 'birthDate',
          '주소': 'address',
          '성별': 'gender',
          '결혼상태': 'maritalStatus',
          '세례일': 'baptismDate',
          '입교일': 'confirmationDate',
          '직분': 'positionName',
          '부서': 'departmentName',
          '가족ID': 'familyId',
          '가족관계': 'relationship',
          '상태': 'status',
          '비고': 'notes'
        }
      case DataType.OFFERINGS:
        return {
          '교인명': 'memberName',
          '금액': 'amount',
          '헌금종류': 'offeringType',
          '설명': 'description',
          '헌금일': 'offeringDate'
        }
      case DataType.ATTENDANCES:
        return {
          '교인명': 'memberName',
          '예배종류': 'serviceType',
          '출석일': 'attendanceDate',
          '출석여부': 'isPresent',
          '비고': 'notes'
        }
      case DataType.VISITATIONS:
        return {
          '교인명': 'memberName',
          '심방일': 'visitDate',
          '목적': 'purpose',
          '내용': 'content',
          '후속관리': 'followUpNeeded',
          '후속관리일': 'followUpDate'
        }
      case DataType.EXPENSE_REPORTS:
        return {
          '제목': 'title',
          '설명': 'description',
          '금액': 'amount',
          '분류': 'category',
          '상태': 'status',
          '신청일': 'requestDate',
          '승인일': 'approvedDate',
          '거부일': 'rejectedDate',
          '거부사유': 'rejectionReason'
        }
      default:
        return {}
    }
  }
}