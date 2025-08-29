import { PrismaClient } from '@prisma/client'
import * as XLSX from 'xlsx'
import {
  ExportOptions,
  ExportResult,
  DataType,
  ExportColumn,
  ProgressCallback
} from '../types'
import { logger } from '@/lib/logger'

export class ExcelExporter {
  private prisma: PrismaClient
  private churchId: string

  constructor(prisma: PrismaClient, churchId: string) {
    this.prisma = prisma
    this.churchId = churchId
  }

  /**
   * 데이터를 Excel 파일로 내보내기
   */
  async exportData(
    data: any[],
    options: ExportOptions,
    progressCallback?: ProgressCallback
  ): Promise<ExportResult> {
    try {
      progressCallback?.(10, '워크북 생성 중...')

      // 워크북 생성
      const workbook = XLSX.utils.book_new()

      progressCallback?.(30, '워크시트 생성 중...')

      // 데이터 타입에 따른 컬럼 정의
      const columns = this.getExportColumns(options.dataType)
      
      // 헤더 행 생성
      const headers = columns.map(col => col.header)
      
      // 데이터 행 생성
      const rows = data.map(item => 
        columns.map(col => {
          const value = item[col.field]
          return col.formatter ? col.formatter(value) : this.formatCellValue(value)
        })
      )

      // 전체 데이터 (헤더 + 데이터)
      const worksheetData = [headers, ...rows]

      progressCallback?.(60, '워크시트 포맷팅 중...')

      // 워크시트 생성
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData)

      // 컬럼 너비 설정
      const columnWidths = columns.map(col => ({ width: col.width || 15 }))
      worksheet['!cols'] = columnWidths

      // 헤더 스타일링
      this.styleWorksheet(worksheet, data.length + 1, columns.length)

      progressCallback?.(80, '워크북에 시트 추가 중...')

      // 워크북에 워크시트 추가
      const sheetName = this.getSheetName(options.dataType)
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)

      // 메타데이터 시트 추가 (선택사항)
      if (data.length > 0) {
        this.addMetadataSheet(workbook, options, data.length)
      }

      progressCallback?.(90, 'Excel 파일 생성 중...')

      // Excel 파일 생성
      const excelBuffer = XLSX.write(workbook, {
        type: 'buffer',
        bookType: 'xlsx',
        compression: true
      })

      const filename = options.filename || this.generateFilename(options.dataType)

      progressCallback?.(100, '내보내기 완료')

      logger.info('Excel export completed', {
        churchId: this.churchId,
        action: 'excel_export',
        metadata: {
          recordCount: data.length,
          filename
        }
      })

      return {
        success: true,
        filename,
        data: excelBuffer
      }
    } catch (error) {
      logger.error('Excel export failed', error as Error, {
        churchId: this.churchId,
        metadata: { options }
      })
      
      return {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다'
      }
    }
  }

  /**
   * 다중 시트 Excel 파일 생성
   */
  async exportMultipleSheets(
    dataMap: Map<DataType, any[]>,
    filename?: string,
    progressCallback?: ProgressCallback
  ): Promise<ExportResult> {
    try {
      progressCallback?.(10, '워크북 생성 중...')

      const workbook = XLSX.utils.book_new()
      const totalSheets = dataMap.size
      let currentSheet = 0

      for (const [dataType, data] of dataMap.entries()) {
        currentSheet++
        const progress = Math.floor((currentSheet / totalSheets) * 70) + 10
        progressCallback?.(progress, `${this.getSheetName(dataType)} 시트 생성 중...`)

        const columns = this.getExportColumns(dataType)
        const headers = columns.map(col => col.header)
        
        const rows = data.map(item => 
          columns.map(col => {
            const value = item[col.field]
            return col.formatter ? col.formatter(value) : this.formatCellValue(value)
          })
        )

        const worksheetData = [headers, ...rows]
        const worksheet = XLSX.utils.aoa_to_sheet(worksheetData)

        // 컬럼 너비 및 스타일 설정
        const columnWidths = columns.map(col => ({ width: col.width || 15 }))
        worksheet['!cols'] = columnWidths
        this.styleWorksheet(worksheet, data.length + 1, columns.length)

        // 워크시트 추가
        const sheetName = this.getSheetName(dataType)
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
      }

      progressCallback?.(85, '메타데이터 시트 추가 중...')

      // 전체 통계 시트 추가
      this.addSummarySheet(workbook, dataMap)

      progressCallback?.(95, 'Excel 파일 생성 중...')

      const excelBuffer = XLSX.write(workbook, {
        type: 'buffer',
        bookType: 'xlsx',
        compression: true
      })

      const finalFilename = filename || `교회데이터_전체백업_${new Date().toISOString().split('T')[0]}.xlsx`

      progressCallback?.(100, '내보내기 완료')

      logger.info('Multi-sheet Excel export completed', {
        churchId: this.churchId,
        action: 'multi_sheet_excel_export',
        metadata: {
          sheets: Array.from(dataMap.keys()),
          filename: finalFilename
        }
      })

      return {
        success: true,
        filename: finalFilename,
        data: excelBuffer
      }
    } catch (error) {
      logger.error('Multi-sheet Excel export failed', error as Error, {
        churchId: this.churchId,
        action: 'multi_sheet_excel_export'
      })
      
      return {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다'
      }
    }
  }

  /**
   * 데이터 타입별 내보내기 컬럼 정의
   */
  private getExportColumns(dataType: DataType): ExportColumn[] {
    switch (dataType) {
      case DataType.MEMBERS:
        return [
          { field: 'name', header: '이름', width: 15 },
          { field: 'phone', header: '전화번호', width: 18 },
          { field: 'email', header: '이메일', width: 25 },
          { 
            field: 'birthDate', 
            header: '생년월일', 
            width: 15,
            formatter: (date) => date ? new Date(date).toLocaleDateString('ko-KR') : ''
          },
          { field: 'address', header: '주소', width: 30 },
          { 
            field: 'gender', 
            header: '성별', 
            width: 10,
            formatter: (gender) => gender === 'MALE' ? '남' : gender === 'FEMALE' ? '여' : gender || ''
          },
          { 
            field: 'maritalStatus', 
            header: '결혼상태', 
            width: 12,
            formatter: (status) => {
              const mapping = { SINGLE: '미혼', MARRIED: '기혼', DIVORCED: '이혼', WIDOWED: '사별' }
              return mapping[status as keyof typeof mapping] || status || ''
            }
          },
          { 
            field: 'baptismDate', 
            header: '세례일', 
            width: 15,
            formatter: (date) => date ? new Date(date).toLocaleDateString('ko-KR') : ''
          },
          { 
            field: 'confirmationDate', 
            header: '입교일', 
            width: 15,
            formatter: (date) => date ? new Date(date).toLocaleDateString('ko-KR') : ''
          },
          { field: 'positionName', header: '직분', width: 15 },
          { field: 'departmentName', header: '부서', width: 15 },
          { field: 'familyId', header: '가족ID', width: 15 },
          { 
            field: 'relationship', 
            header: '가족관계', 
            width: 12,
            formatter: (rel) => {
              const mapping = { HEAD: '가장', SPOUSE: '배우자', CHILD: '자녀', PARENT: '부모', OTHER: '기타' }
              return mapping[rel as keyof typeof mapping] || rel || ''
            }
          },
          { 
            field: 'status', 
            header: '상태', 
            width: 10,
            formatter: (status) => {
              const mapping = { ACTIVE: '활동', INACTIVE: '비활동', TRANSFERRED: '이전' }
              return mapping[status as keyof typeof mapping] || status || ''
            }
          },
          { field: 'notes', header: '비고', width: 30 }
        ]

      case DataType.OFFERINGS:
        return [
          { field: 'memberName', header: '교인명', width: 15 },
          { 
            field: 'amount', 
            header: '금액', 
            width: 15,
            formatter: (amount) => amount ? Number(amount).toLocaleString('ko-KR') + '원' : ''
          },
          { 
            field: 'offeringType', 
            header: '헌금종류', 
            width: 15,
            formatter: (type) => {
              const mapping = { TITHE: '십일조', THANKSGIVING: '감사', MISSION: '선교', BUILDING: '건축', OTHER: '기타' }
              return mapping[type as keyof typeof mapping] || type || ''
            }
          },
          { field: 'description', header: '설명', width: 25 },
          { 
            field: 'offeringDate', 
            header: '헌금일', 
            width: 15,
            formatter: (date) => date ? new Date(date).toLocaleDateString('ko-KR') : ''
          }
        ]

      case DataType.ATTENDANCES:
        return [
          { field: 'memberName', header: '교인명', width: 15 },
          { 
            field: 'serviceType', 
            header: '예배종류', 
            width: 18,
            formatter: (type) => {
              const mapping = {
                SUNDAY_MORNING: '주일오전예배',
                SUNDAY_EVENING: '주일오후예배',
                WEDNESDAY: '수요예배',
                FRIDAY_PRAYER: '금요기도회',
                DAWN_PRAYER: '새벽기도회'
              }
              return mapping[type as keyof typeof mapping] || type || ''
            }
          },
          { 
            field: 'attendanceDate', 
            header: '출석일', 
            width: 15,
            formatter: (date) => date ? new Date(date).toLocaleDateString('ko-KR') : ''
          },
          { 
            field: 'isPresent', 
            header: '출석여부', 
            width: 12,
            formatter: (present) => present ? '출석' : '결석'
          },
          { field: 'notes', header: '비고', width: 25 }
        ]

      case DataType.VISITATIONS:
        return [
          { field: 'memberName', header: '교인명', width: 15 },
          { 
            field: 'visitDate', 
            header: '심방일', 
            width: 15,
            formatter: (date) => date ? new Date(date).toLocaleDateString('ko-KR') : ''
          },
          { field: 'purpose', header: '목적', width: 20 },
          { field: 'content', header: '내용', width: 35 },
          { 
            field: 'followUpNeeded', 
            header: '후속관리', 
            width: 12,
            formatter: (needed) => needed ? '필요' : '불필요'
          },
          { 
            field: 'followUpDate', 
            header: '후속관리일', 
            width: 15,
            formatter: (date) => date ? new Date(date).toLocaleDateString('ko-KR') : ''
          }
        ]

      case DataType.EXPENSE_REPORTS:
        return [
          { field: 'title', header: '제목', width: 20 },
          { field: 'description', header: '설명', width: 30 },
          { 
            field: 'amount', 
            header: '금액', 
            width: 15,
            formatter: (amount) => amount ? Number(amount).toLocaleString('ko-KR') + '원' : ''
          },
          { field: 'category', header: '분류', width: 15 },
          { 
            field: 'status', 
            header: '상태', 
            width: 12,
            formatter: (status) => {
              const mapping = { PENDING: '대기중', APPROVED: '승인', REJECTED: '거부' }
              return mapping[status as keyof typeof mapping] || status || ''
            }
          },
          { 
            field: 'requestDate', 
            header: '신청일', 
            width: 15,
            formatter: (date) => date ? new Date(date).toLocaleDateString('ko-KR') : ''
          },
          { 
            field: 'approvedDate', 
            header: '승인일', 
            width: 15,
            formatter: (date) => date ? new Date(date).toLocaleDateString('ko-KR') : ''
          },
          { field: 'requesterName', header: '신청자', width: 15 }
        ]

      default:
        return []
    }
  }

  /**
   * 워크시트 스타일링
   */
  private styleWorksheet(worksheet: XLSX.WorkSheet, _rowCount: number, _colCount: number): void {
    // 셀 범위 설정
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1')
    
    // 헤더 행 스타일링 (굵게, 배경색)
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col })
      if (!worksheet[cellAddress]) continue
      
      worksheet[cellAddress].s = {
        font: { bold: true },
        fill: { fgColor: { rgb: 'E0E0E0' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' }
        }
      }
    }

    // 데이터 행 테두리
    for (let row = 1; row <= range.e.r; row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col })
        if (!worksheet[cellAddress]) continue
        
        worksheet[cellAddress].s = {
          border: {
            top: { style: 'thin' },
            bottom: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' }
          }
        }
      }
    }

    // 자동 필터 설정
    worksheet['!autofilter'] = { ref: worksheet['!ref'] || 'A1' }
  }

  /**
   * 메타데이터 시트 추가
   */
  private addMetadataSheet(workbook: XLSX.WorkBook, options: ExportOptions, recordCount: number): void {
    const metadata = [
      ['내보내기 정보', ''],
      ['데이터 타입', this.getDataTypeName(options.dataType)],
      ['내보내기 일시', new Date().toLocaleString('ko-KR')],
      ['레코드 수', recordCount.toLocaleString('ko-KR')],
      ['', ''],
      ['필터 조건', ''],
    ]

    if (options.dateRange) {
      metadata.push(
        ['시작일', options.dateRange.start.toLocaleDateString('ko-KR')],
        ['종료일', options.dateRange.end.toLocaleDateString('ko-KR')]
      )
    }

    if (options.filters) {
      metadata.push(['', ''])
      metadata.push(['추가 필터', ''])
      Object.entries(options.filters).forEach(([key, value]) => {
        metadata.push([key, String(value)])
      })
    }

    const metaSheet = XLSX.utils.aoa_to_sheet(metadata)
    metaSheet['!cols'] = [{ width: 20 }, { width: 30 }]
    
    XLSX.utils.book_append_sheet(workbook, metaSheet, '내보내기정보')
  }

  /**
   * 요약 시트 추가
   */
  private addSummarySheet(workbook: XLSX.WorkBook, dataMap: Map<DataType, any[]>): void {
    const summary = [
      ['교회 데이터 백업 요약', ''],
      ['생성일시', new Date().toLocaleString('ko-KR')],
      ['', ''],
      ['데이터 타입별 레코드 수', ''],
    ]

    let totalRecords = 0
    for (const [dataType, data] of dataMap.entries()) {
      const count = data.length
      totalRecords += count
      summary.push([this.getDataTypeName(dataType), count.toLocaleString('ko-KR')])
    }

    summary.push(
      ['', ''],
      ['전체 레코드 수', totalRecords.toLocaleString('ko-KR')]
    )

    const summarySheet = XLSX.utils.aoa_to_sheet(summary)
    summarySheet['!cols'] = [{ width: 25 }, { width: 20 }]
    
    XLSX.utils.book_append_sheet(workbook, summarySheet, '요약')
  }

  /**
   * 셀 값 포맷팅
   */
  private formatCellValue(value: any): string {
    if (value === null || value === undefined) return ''
    if (value instanceof Date) return value.toLocaleDateString('ko-KR')
    if (typeof value === 'boolean') return value ? '예' : '아니오'
    if (typeof value === 'number') return value.toString()
    return String(value)
  }

  /**
   * 시트명 생성
   */
  private getSheetName(dataType: DataType): string {
    switch (dataType) {
      case DataType.MEMBERS: return '교인명부'
      case DataType.OFFERINGS: return '헌금내역'
      case DataType.ATTENDANCES: return '출석현황'
      case DataType.VISITATIONS: return '심방기록'
      case DataType.EXPENSE_REPORTS: return '지출결의서'
      default: return '데이터'
    }
  }

  /**
   * 데이터 타입명 생성
   */
  private getDataTypeName(dataType: DataType): string {
    return this.getSheetName(dataType)
  }

  /**
   * 파일명 생성
   */
  private generateFilename(dataType: DataType): string {
    const typeName = this.getSheetName(dataType)
    const date = new Date().toISOString().split('T')[0]
    return `${typeName}_${date}.xlsx`
  }
}