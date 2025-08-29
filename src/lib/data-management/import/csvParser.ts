import { DataType, ImportError, FileUploadResult, ProgressCallback } from '../types'
import { logger } from '@/lib/logger'

export class CSVParser {
  private readonly maxFileSize = 10 * 1024 * 1024 // 10MB
  private readonly maxRows = 10000

  /**
   * CSV 파일 파싱
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

      progressCallback?.(20, 'CSV 파일 읽는 중...')

      // 텍스트 디코딩 (UTF-8, EUC-KR 자동 감지)
      const csvText = this.decodeText(fileBuffer)

      progressCallback?.(40, 'CSV 파싱 중...')

      // CSV 파싱
      const parsedData = this.parseCSV(csvText)

      if (parsedData.length === 0) {
        throw new Error('파일에 데이터가 없습니다.')
      }

      if (parsedData.length > this.maxRows) {
        throw new Error(`데이터가 너무 많습니다. 최대 ${this.maxRows}행까지 지원합니다.`)
      }

      progressCallback?.(60, '컬럼 매핑 중...')

      // 헤더 행 추출 (첫 번째 행)
      const headers = parsedData[0]?.map(header => 
        String(header || '').trim()
      ).filter(header => header !== '') || []

      if (headers.length === 0) {
        throw new Error('헤더 행을 찾을 수 없습니다.')
      }

      // 데이터 행들 (헤더를 제외한 나머지)
      const dataRows = parsedData.slice(1)

      progressCallback?.(80, '데이터 변환 중...')

      // 헤더와 데이터를 객체로 변환
      const data: any[] = []
      const errors: ImportError[] = []

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i]
        const rowIndex = i + 2 // CSV의 실제 행 번호 (헤더 + 1)

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
          filename: 'csv_file.csv',
          fileSize: fileBuffer.length,
          rowCount: data.length,
          columnCount: headers.length,
          format: 'csv'
        }
      }

      logger.info('CSV file parsed successfully', {
        action: 'csv_parse',
        metadata: {
          rowCount: data.length,
          columnCount: headers.length,
          errorCount: errors.length
        }
      })

      return result
    } catch (error) {
      logger.error('CSV parsing failed', error instanceof Error ? error : new Error(String(error)))
      throw error
    }
  }

  /**
   * 텍스트 디코딩 (UTF-8, EUC-KR 지원)
   */
  private decodeText(buffer: Buffer): string {
    try {
      // UTF-8로 먼저 시도
      const utf8Text = buffer.toString('utf8')
      
      // UTF-8 유효성 검사
      if (this.isValidUTF8(buffer)) {
        return utf8Text
      }

      // EUC-KR로 시도
      try {
        return buffer.toString('euc-kr' as any)
      } catch {
        // 기본적으로 UTF-8 반환
        return utf8Text
      }
    } catch (error) {
      // 최후의 수단으로 latin1 사용
      return buffer.toString('latin1')
    }
  }

  /**
   * UTF-8 유효성 검사
   */
  private isValidUTF8(buffer: Buffer): boolean {
    try {
      const text = buffer.toString('utf8')
      const encoded = Buffer.from(text, 'utf8')
      return buffer.equals(encoded)
    } catch {
      return false
    }
  }

  /**
   * CSV 파싱 (RFC 4180 준수)
   */
  private parseCSV(csvText: string): string[][] {
    const rows: string[][] = []
    const lines = this.splitLines(csvText)

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex].trim()
      if (line === '') continue

      try {
        const row = this.parseLine(line)
        if (row.length > 0) {
          rows.push(row)
        }
      } catch (error) {
        logger.warn('Failed to parse CSV line', {
          action: 'csv_parse_line',
          metadata: {
            lineIndex: lineIndex + 1,
            line,
            error: error instanceof Error ? error.message : String(error)
          }
        })
        // 파싱 실패한 행은 건너뛰기
        continue
      }
    }

    return rows
  }

  /**
   * 줄 분리 (개행 문자 처리)
   */
  private splitLines(text: string): string[] {
    // Windows(\r\n), Unix(\n), Mac(\r) 개행 문자 모두 처리
    return text.split(/\r?\n|\r/)
  }

  /**
   * CSV 라인 파싱
   */
  private parseLine(line: string): string[] {
    const cells: string[] = []
    let currentCell = ''
    let inQuotes = false
    let i = 0

    while (i < line.length) {
      const char = line[i]
      const nextChar = line[i + 1]

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // 이스케이프된 따옴표 ("")
          currentCell += '"'
          i += 2
        } else {
          // 따옴표 시작 또는 끝
          inQuotes = !inQuotes
          i++
        }
      } else if (char === ',' && !inQuotes) {
        // 구분자 (따옴표 밖에서만)
        cells.push(currentCell.trim())
        currentCell = ''
        i++
      } else {
        // 일반 문자
        currentCell += char
        i++
      }
    }

    // 마지막 셀 추가
    cells.push(currentCell.trim())

    return cells
  }

  /**
   * 셀 값 파싱
   */
  private parseCell(cellValue: any, header: string, dataType: DataType): any {
    if (cellValue === null || cellValue === undefined || cellValue === '') {
      return null
    }

    const value = String(cellValue).trim()

    // 따옴표 제거
    const cleanValue = value.replace(/^"(.*)"$/, '$1')

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
      return this.parseDate(cleanValue)
    }

    // 불린 처리
    if (booleanFields.some(field => header.includes(field) || field.includes(header))) {
      return this.parseBoolean(cleanValue)
    }

    // 숫자 처리
    if (numberFields.some(field => header.includes(field) || field.includes(header))) {
      return this.parseNumber(cleanValue)
    }

    // 기본적으로 문자열 반환
    return cleanValue
  }

  /**
   * 날짜 파싱
   */
  private parseDate(value: string): Date | null {
    if (!value || value === '') return null

    try {
      // 일반 날짜 문자열 처리
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

      // 다양한 날짜 형식 시도
      const dateFormats = [
        /^(\d{4})-(\d{2})-(\d{2})$/, // YYYY-MM-DD
        /^(\d{4})\/(\d{2})\/(\d{2})$/, // YYYY/MM/DD
        /^(\d{4})\.(\d{2})\.(\d{2})$/, // YYYY.MM.DD
        /^(\d{2})-(\d{2})-(\d{4})$/, // DD-MM-YYYY
        /^(\d{2})\/(\d{2})\/(\d{4})$/, // DD/MM/YYYY
        /^(\d{2})\.(\d{2})\.(\d{4})$/ // DD.MM.YYYY
      ]

      for (const format of dateFormats) {
        const match = value.match(format)
        if (match) {
          const [, p1, p2, p3] = match
          // YYYY-MM-DD 형식인지 DD-MM-YYYY 형식인지 판단
          if (parseInt(p1) > 31) {
            // YYYY-MM-DD
            return new Date(parseInt(p1), parseInt(p2) - 1, parseInt(p3))
          } else {
            // DD-MM-YYYY
            return new Date(parseInt(p3), parseInt(p2) - 1, parseInt(p1))
          }
        }
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

    // 기본값은 true
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
   * CSV 파일 유효성 검사
   */
  validateCSVFile(fileBuffer: Buffer): { isValid: boolean; error?: string } {
    try {
      const text = this.decodeText(fileBuffer)
      
      if (text.length === 0) {
        return {
          isValid: false,
          error: '파일이 비어있습니다'
        }
      }

      // 최소한의 CSV 구조 검사
      const lines = this.splitLines(text)
      if (lines.length < 2) {
        return {
          isValid: false,
          error: '최소 2행(헤더 + 데이터) 이상이어야 합니다'
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

  /**
   * CSV 생성 (내보내기용)
   */
  generateCSV(data: any[], headers: string[]): string {
    const lines: string[] = []

    // 헤더 추가
    lines.push(headers.map(header => this.escapeCSVField(header)).join(','))

    // 데이터 행 추가
    for (const row of data) {
      const csvRow = headers.map(header => {
        const value = row[header]
        return this.escapeCSVField(this.formatCellValue(value))
      })
      lines.push(csvRow.join(','))
    }

    return lines.join('\n')
  }

  /**
   * CSV 필드 이스케이프
   */
  private escapeCSVField(value: string): string {
    if (!value) return '""'

    const stringValue = String(value)
    
    // 특수 문자가 포함된 경우 따옴표로 감싸기
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
      return '"' + stringValue.replace(/"/g, '""') + '"'
    }

    return stringValue
  }

  /**
   * 셀 값 포맷팅
   */
  private formatCellValue(value: any): string {
    if (value === null || value === undefined) {
      return ''
    }

    if (value instanceof Date) {
      return value.toISOString().split('T')[0] // YYYY-MM-DD
    }

    return String(value)
  }
}