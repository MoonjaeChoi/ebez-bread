import { PrismaClient } from '@prisma/client'
import {
  ExportOptions,
  ExportResult,
  DataType,
  ExportColumn,
  ProgressCallback
} from '../types'
import { logger } from '@/lib/logger'

export class CSVExporter {
  private prisma: PrismaClient
  private churchId: string

  constructor(prisma: PrismaClient, churchId: string) {
    this.prisma = prisma
    this.churchId = churchId
  }

  /**
   * 데이터를 CSV 파일로 내보내기
   */
  async exportData(
    data: any[],
    options: ExportOptions,
    progressCallback?: ProgressCallback
  ): Promise<ExportResult> {
    try {
      progressCallback?.(10, 'CSV 생성 준비 중...')

      // 데이터 타입에 따른 컬럼 정의
      const columns = this.getExportColumns(options.dataType)
      
      progressCallback?.(30, '헤더 생성 중...')

      // 헤더 생성
      const headers = columns.map(col => col.header)
      
      progressCallback?.(50, '데이터 변환 중...')

      // 데이터 변환
      const csvRows: string[] = []
      csvRows.push(this.createCSVRow(headers))

      for (let i = 0; i < data.length; i++) {
        const item = data[i]
        const row = columns.map(col => {
          const value = item[col.field]
          const formattedValue = col.formatter ? col.formatter(value) : this.formatCellValue(value)
          return formattedValue
        })
        csvRows.push(this.createCSVRow(row))

        // 진행률 업데이트
        if (i % 100 === 0) {
          const progress = 50 + Math.floor((i / data.length) * 40)
          progressCallback?.(progress, `${i + 1}/${data.length} 행 처리 중...`)
        }
      }

      progressCallback?.(90, 'CSV 파일 생성 중...')

      // CSV 문자열 생성
      const csvContent = csvRows.join('\n')
      
      // UTF-8 BOM 추가 (Excel에서 한글 깨짐 방지)
      const bom = '\uFEFF'
      const csvBuffer = Buffer.from(bom + csvContent, 'utf8')

      const filename = options.filename || this.generateFilename(options.dataType)

      progressCallback?.(100, '내보내기 완료')

      logger.info('CSV export completed', {
        churchId: this.churchId,
        action: 'csv_export',
        metadata: {
          dataType: options.dataType,
          recordCount: data.length,
          filename
        }
      })

      return {
        success: true,
        filename,
        data: csvBuffer.buffer.slice(csvBuffer.byteOffset, csvBuffer.byteOffset + csvBuffer.byteLength)
      }
    } catch (error) {
      logger.error('CSV export failed', error instanceof Error ? error : new Error(String(error)), {
        churchId: this.churchId,
        action: 'csv_export',
        metadata: {
          options
        }
      })
      
      return {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다'
      }
    }
  }

  /**
   * 스트리밍 방식으로 대용량 데이터 내보내기
   */
  async exportDataStream(
    options: ExportOptions,
    progressCallback?: ProgressCallback
  ): Promise<ExportResult> {
    try {
      progressCallback?.(10, '데이터 조회 시작...')

      const columns = this.getExportColumns(options.dataType)
      const headers = columns.map(col => col.header)

      // 스트림 생성
      const csvRows: string[] = []
      csvRows.push(this.createCSVRow(headers))

      // 배치 단위로 데이터 조회 및 처리
      const batchSize = 1000
      let offset = 0
      let totalRecords = 0
      let hasMore = true

      while (hasMore) {
        progressCallback?.(
          10 + Math.min(offset / 10000 * 60, 60),
          `${totalRecords.toLocaleString()} 레코드 처리 중...`
        )

        const batch = await this.fetchDataBatch(options, offset, batchSize)
        
        if (batch.length === 0) {
          hasMore = false
          break
        }

        // 배치 데이터 변환
        for (const item of batch) {
          const row = columns.map(col => {
            const value = item[col.field]
            const formattedValue = col.formatter ? col.formatter(value) : this.formatCellValue(value)
            return formattedValue
          })
          csvRows.push(this.createCSVRow(row))
        }

        totalRecords += batch.length
        offset += batchSize

        // 메모리 관리를 위해 일정 크기마다 중간 저장
        if (csvRows.length > 10000) {
          // 실제 구현에서는 스트림을 사용해야 함
          // 여기서는 간단한 예시로 배열을 사용
        }

        // 배치 크기보다 적으면 마지막 배치
        if (batch.length < batchSize) {
          hasMore = false
        }
      }

      progressCallback?.(90, 'CSV 파일 생성 중...')

      // CSV 문자열 생성
      const csvContent = csvRows.join('\n')
      const bom = '\uFEFF'
      const csvBuffer = Buffer.from(bom + csvContent, 'utf8')

      const filename = options.filename || this.generateFilename(options.dataType)

      progressCallback?.(100, `내보내기 완료 (${totalRecords.toLocaleString()} 레코드)`)

      logger.info('CSV stream export completed', {
        churchId: this.churchId,
        action: 'csv_stream_export',
        metadata: {
          dataType: options.dataType,
          recordCount: totalRecords,
          filename
        }
      })

      return {
        success: true,
        filename,
        data: csvBuffer.buffer.slice(csvBuffer.byteOffset, csvBuffer.byteOffset + csvBuffer.byteLength)
      }
    } catch (error) {
      logger.error('CSV stream export failed', error instanceof Error ? error : new Error(String(error)), {
        churchId: this.churchId,
        action: 'csv_stream_export',
        metadata: {
          options
        }
      })
      
      return {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다'
      }
    }
  }

  /**
   * 배치 단위 데이터 조회
   */
  private async fetchDataBatch(
    options: ExportOptions,
    offset: number,
    batchSize: number
  ): Promise<any[]> {
    const where: any = { churchId: this.churchId }

    // 날짜 범위 필터
    if (options.dateRange) {
      const dateField = this.getDateField(options.dataType)
      if (dateField) {
        where[dateField] = {
          gte: options.dateRange.start,
          lte: options.dateRange.end
        }
      }
    }

    // 추가 필터
    if (options.filters) {
      Object.assign(where, options.filters)
    }

    // 비활성 데이터 제외
    if (!options.includeInactive) {
      if (options.dataType === DataType.MEMBERS) {
        where.status = { not: 'INACTIVE' }
      }
    }

    try {
      switch (options.dataType) {
        case DataType.MEMBERS:
          return await this.prisma.member.findMany({
            where,
            include: {
              position: { select: { name: true } },
              department: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' },
            skip: offset,
            take: batchSize
          }).then(members => members.map(member => ({
            ...member,
            positionName: member.position?.name,
            departmentName: member.department?.name
          })))

        case DataType.OFFERINGS:
          return await this.prisma.offering.findMany({
            where,
            include: {
              member: { select: { name: true } }
            },
            orderBy: { offeringDate: 'desc' },
            skip: offset,
            take: batchSize
          }).then(offerings => offerings.map(offering => ({
            ...offering,
            memberName: offering.member.name
          })))

        case DataType.ATTENDANCES:
          return await this.prisma.attendance.findMany({
            where,
            include: {
              member: { select: { name: true } }
            },
            orderBy: { attendanceDate: 'desc' },
            skip: offset,
            take: batchSize
          }).then(attendances => attendances.map(attendance => ({
            ...attendance,
            memberName: attendance.member.name
          })))

        case DataType.VISITATIONS:
          return await this.prisma.visitation.findMany({
            where: {
              member: { churchId: this.churchId },
              ...where
            },
            include: {
              member: { select: { name: true } }
            },
            orderBy: { visitDate: 'desc' },
            skip: offset,
            take: batchSize
          }).then(visitations => visitations.map(visitation => ({
            ...visitation,
            memberName: visitation.member.name
          })))

        case DataType.EXPENSE_REPORTS:
          return await this.prisma.expenseReport.findMany({
            where,
            include: {
              requester: { select: { name: true } }
            },
            orderBy: { requestDate: 'desc' },
            skip: offset,
            take: batchSize
          }).then(reports => reports.map(report => ({
            ...report,
            requesterName: report.requester.name
          })))

        default:
          return []
      }
    } catch (error) {
      logger.error('Failed to fetch data batch', error instanceof Error ? error : new Error(String(error)), {
        churchId: this.churchId,
        action: 'fetch_data_batch',
        metadata: {
          dataType: options.dataType,
          offset,
          batchSize
        }
      })
      throw error
    }
  }

  /**
   * 데이터 타입별 내보내기 컬럼 정의
   */
  private getExportColumns(dataType: DataType): ExportColumn[] {
    switch (dataType) {
      case DataType.MEMBERS:
        return [
          { field: 'name', header: '이름' },
          { field: 'phone', header: '전화번호' },
          { field: 'email', header: '이메일' },
          { 
            field: 'birthDate', 
            header: '생년월일',
            formatter: (date) => date ? new Date(date).toLocaleDateString('ko-KR') : ''
          },
          { field: 'address', header: '주소' },
          { 
            field: 'gender', 
            header: '성별',
            formatter: (gender) => gender === 'MALE' ? '남' : gender === 'FEMALE' ? '여' : gender || ''
          },
          { 
            field: 'maritalStatus', 
            header: '결혼상태',
            formatter: (status) => {
              const mapping = { SINGLE: '미혼', MARRIED: '기혼', DIVORCED: '이혼', WIDOWED: '사별' }
              return mapping[status as keyof typeof mapping] || status || ''
            }
          },
          { 
            field: 'baptismDate', 
            header: '세례일',
            formatter: (date) => date ? new Date(date).toLocaleDateString('ko-KR') : ''
          },
          { 
            field: 'confirmationDate', 
            header: '입교일',
            formatter: (date) => date ? new Date(date).toLocaleDateString('ko-KR') : ''
          },
          { field: 'positionName', header: '직분' },
          { field: 'departmentName', header: '부서' },
          { field: 'familyId', header: '가족ID' },
          { 
            field: 'relationship', 
            header: '가족관계',
            formatter: (rel) => {
              const mapping = { HEAD: '가장', SPOUSE: '배우자', CHILD: '자녀', PARENT: '부모', OTHER: '기타' }
              return mapping[rel as keyof typeof mapping] || rel || ''
            }
          },
          { 
            field: 'status', 
            header: '상태',
            formatter: (status) => {
              const mapping = { ACTIVE: '활동', INACTIVE: '비활동', TRANSFERRED: '이전' }
              return mapping[status as keyof typeof mapping] || status || ''
            }
          },
          { field: 'notes', header: '비고' }
        ]

      case DataType.OFFERINGS:
        return [
          { field: 'memberName', header: '교인명' },
          { 
            field: 'amount', 
            header: '금액',
            formatter: (amount) => amount ? Number(amount).toLocaleString('ko-KR') : ''
          },
          { 
            field: 'offeringType', 
            header: '헌금종류',
            formatter: (type) => {
              const mapping = { TITHE: '십일조', THANKSGIVING: '감사', MISSION: '선교', BUILDING: '건축', OTHER: '기타' }
              return mapping[type as keyof typeof mapping] || type || ''
            }
          },
          { field: 'description', header: '설명' },
          { 
            field: 'offeringDate', 
            header: '헌금일',
            formatter: (date) => date ? new Date(date).toLocaleDateString('ko-KR') : ''
          }
        ]

      case DataType.ATTENDANCES:
        return [
          { field: 'memberName', header: '교인명' },
          { 
            field: 'serviceType', 
            header: '예배종류',
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
            formatter: (date) => date ? new Date(date).toLocaleDateString('ko-KR') : ''
          },
          { 
            field: 'isPresent', 
            header: '출석여부',
            formatter: (present) => present ? '출석' : '결석'
          },
          { field: 'notes', header: '비고' }
        ]

      case DataType.VISITATIONS:
        return [
          { field: 'memberName', header: '교인명' },
          { 
            field: 'visitDate', 
            header: '심방일',
            formatter: (date) => date ? new Date(date).toLocaleDateString('ko-KR') : ''
          },
          { field: 'purpose', header: '목적' },
          { field: 'content', header: '내용' },
          { 
            field: 'followUpNeeded', 
            header: '후속관리',
            formatter: (needed) => needed ? '필요' : '불필요'
          },
          { 
            field: 'followUpDate', 
            header: '후속관리일',
            formatter: (date) => date ? new Date(date).toLocaleDateString('ko-KR') : ''
          }
        ]

      case DataType.EXPENSE_REPORTS:
        return [
          { field: 'title', header: '제목' },
          { field: 'description', header: '설명' },
          { 
            field: 'amount', 
            header: '금액',
            formatter: (amount) => amount ? Number(amount).toLocaleString('ko-KR') : ''
          },
          { field: 'category', header: '분류' },
          { 
            field: 'status', 
            header: '상태',
            formatter: (status) => {
              const mapping = { PENDING: '대기중', APPROVED: '승인', REJECTED: '거부' }
              return mapping[status as keyof typeof mapping] || status || ''
            }
          },
          { 
            field: 'requestDate', 
            header: '신청일',
            formatter: (date) => date ? new Date(date).toLocaleDateString('ko-KR') : ''
          },
          { 
            field: 'approvedDate', 
            header: '승인일',
            formatter: (date) => date ? new Date(date).toLocaleDateString('ko-KR') : ''
          },
          { field: 'requesterName', header: '신청자' }
        ]

      default:
        return []
    }
  }

  /**
   * CSV 행 생성
   */
  private createCSVRow(values: string[]): string {
    return values.map(value => this.escapeCSVField(value)).join(',')
  }

  /**
   * CSV 필드 이스케이프
   */
  private escapeCSVField(value: string): string {
    if (!value) return '""'

    const stringValue = String(value)
    
    // 특수 문자가 포함된 경우 따옴표로 감싸기
    if (stringValue.includes(',') || 
        stringValue.includes('"') || 
        stringValue.includes('\n') || 
        stringValue.includes('\r')) {
      return '"' + stringValue.replace(/"/g, '""') + '"'
    }

    return stringValue
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
   * 데이터 타입별 날짜 필드명
   */
  private getDateField(dataType: DataType): string | null {
    switch (dataType) {
      case DataType.OFFERINGS: return 'offeringDate'
      case DataType.ATTENDANCES: return 'attendanceDate'
      case DataType.VISITATIONS: return 'visitDate'
      case DataType.EXPENSE_REPORTS: return 'requestDate'
      default: return null
    }
  }

  /**
   * 파일명 생성
   */
  private generateFilename(dataType: DataType): string {
    const typeName = this.getDataTypeName(dataType)
    const date = new Date().toISOString().split('T')[0]
    return `${typeName}_${date}.csv`
  }

  /**
   * 데이터 타입명 생성
   */
  private getDataTypeName(dataType: DataType): string {
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