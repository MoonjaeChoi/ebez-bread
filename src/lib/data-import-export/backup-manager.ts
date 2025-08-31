import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import { PrismaClient } from '@prisma/client'
import { 
  BackupOptions, 
  BackupResult, 
  DataType,
  FileFormat,
  ExportOptions,
  ProgressCallback
} from './types'
import { exportToExcel } from './excel-processor'

// 백업 생성 클래스
export class BackupManager {
  private prisma: PrismaClient
  private churchId: string

  constructor(prisma: PrismaClient, churchId: string) {
    this.prisma = prisma
    this.churchId = churchId
  }

  // 전체 백업 생성
  async createFullBackup(
    options: BackupOptions = {},
    progressCallback?: ProgressCallback
  ): Promise<BackupResult> {
    try {
      progressCallback?.(0, '백업 시작...')

      const {
        includeMembers = true,
        includeOfferings = true,
        includeAttendances = true,
        includeVisitations = true,
        includeExpenseReports = true,
        dateRange,
        filename
      } = options

      const workbook = XLSX.utils.book_new()
      const includedTables: string[] = []
      const recordCounts: Record<string, number> = {}
      let currentProgress = 0
      const totalTasks = [
        includeMembers,
        includeOfferings,
        includeAttendances,
        includeVisitations,
        includeExpenseReports
      ].filter(Boolean).length

      // 교인 데이터 백업
      if (includeMembers) {
        progressCallback?.(currentProgress, '교인 데이터 백업 중...')
        const memberData = await this.exportMemberData(dateRange)
        if (memberData.length > 0) {
          const worksheet = XLSX.utils.json_to_sheet(memberData)
          XLSX.utils.book_append_sheet(workbook, worksheet, '교인명부')
          includedTables.push('교인명부')
          recordCounts['교인명부'] = memberData.length
        }
        currentProgress = Math.round((1 / totalTasks) * 100)
        progressCallback?.(currentProgress, '교인 데이터 백업 완료')
      }

      // 헌금 데이터 백업
      if (includeOfferings) {
        progressCallback?.(currentProgress, '헌금 데이터 백업 중...')
        const offeringData = await this.exportOfferingData(dateRange)
        if (offeringData.length > 0) {
          const worksheet = XLSX.utils.json_to_sheet(offeringData)
          XLSX.utils.book_append_sheet(workbook, worksheet, '헌금내역')
          includedTables.push('헌금내역')
          recordCounts['헌금내역'] = offeringData.length
        }
        currentProgress = Math.round((2 / totalTasks) * 100)
        progressCallback?.(currentProgress, '헌금 데이터 백업 완료')
      }

      // 출석 데이터 백업
      if (includeAttendances) {
        progressCallback?.(currentProgress, '출석 데이터 백업 중...')
        const attendanceData = await this.exportAttendanceData(dateRange)
        if (attendanceData.length > 0) {
          const worksheet = XLSX.utils.json_to_sheet(attendanceData)
          XLSX.utils.book_append_sheet(workbook, worksheet, '출석현황')
          includedTables.push('출석현황')
          recordCounts['출석현황'] = attendanceData.length
        }
        currentProgress = Math.round((3 / totalTasks) * 100)
        progressCallback?.(currentProgress, '출석 데이터 백업 완료')
      }

      // 심방 데이터 백업
      if (includeVisitations) {
        progressCallback?.(currentProgress, '심방 데이터 백업 중...')
        const visitationData = await this.exportVisitationData(dateRange)
        if (visitationData.length > 0) {
          const worksheet = XLSX.utils.json_to_sheet(visitationData)
          XLSX.utils.book_append_sheet(workbook, worksheet, '심방기록')
          includedTables.push('심방기록')
          recordCounts['심방기록'] = visitationData.length
        }
        currentProgress = Math.round((4 / totalTasks) * 100)
        progressCallback?.(currentProgress, '심방 데이터 백업 완료')
      }

      // 지출결의서 데이터 백업
      if (includeExpenseReports) {
        progressCallback?.(currentProgress, '지출결의서 데이터 백업 중...')
        const expenseData = await this.exportExpenseReportData(dateRange)
        if (expenseData.length > 0) {
          const worksheet = XLSX.utils.json_to_sheet(expenseData)
          XLSX.utils.book_append_sheet(workbook, worksheet, '지출결의서')
          includedTables.push('지출결의서')
          recordCounts['지출결의서'] = expenseData.length
        }
        currentProgress = Math.round((5 / totalTasks) * 100)
        progressCallback?.(currentProgress, '지출결의서 데이터 백업 완료')
      }

      // 백업 정보 시트 추가
      progressCallback?.(90, '백업 정보 생성 중...')
      const backupInfo = this.createBackupInfoSheet(includedTables, recordCounts, options)
      const infoWorksheet = XLSX.utils.json_to_sheet(backupInfo)
      XLSX.utils.book_append_sheet(workbook, infoWorksheet, '백업정보')

      // 파일 생성
      progressCallback?.(95, '백업 파일 생성 중...')
      const backupFilename = filename || this.generateBackupFilename()
      const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      })
      
      saveAs(blob, backupFilename)

      progressCallback?.(100, '백업 완료')

      return {
        success: true,
        filename: backupFilename,
        data: buffer,
        includedTables,
        recordCounts
      }

    } catch (error) {
      return {
        success: false,
        includedTables: [],
        recordCounts: {},
        error: error instanceof Error ? error.message : '백업 생성 중 오류가 발생했습니다'
      }
    }
  }

  // 개별 데이터 타입별 내보내기
  async exportDataByType<T extends Record<string, any>>(
    dataType: DataType,
    options: ExportOptions,
    progressCallback?: ProgressCallback
  ): Promise<BackupResult> {
    try {
      let data: T[] = []
      
      switch (dataType) {
        case DataType.MEMBERS:
          data = await this.exportMemberData(options.dateRange) as unknown as T[]
          break
        case DataType.OFFERINGS:
          data = await this.exportOfferingData(options.dateRange, options.filters) as unknown as T[]
          break
        case DataType.ATTENDANCES:
          data = await this.exportAttendanceData(options.dateRange, options.filters) as unknown as T[]
          break
        case DataType.VISITATIONS:
          data = await this.exportVisitationData(options.dateRange, options.filters) as unknown as T[]
          break
        case DataType.EXPENSE_REPORTS:
          data = await this.exportExpenseReportData(options.dateRange, options.filters) as unknown as T[]
          break
        case DataType.ORGANIZATIONS:
          data = await this.exportOrganizationData(options.includeInactive) as unknown as T[]
          break
        case DataType.ORGANIZATION_MEMBERSHIPS:
          data = await this.exportOrganizationMembershipData(options.includeInactive) as unknown as T[]
          break
        default:
          throw new Error(`지원되지 않는 데이터 타입: ${dataType}`)
      }

      const result = await exportToExcel(data, options, progressCallback)
      
      if (result.success) {
        return {
          success: true,
          filename: result.filename,
          data: result.data,
          includedTables: [dataType],
          recordCounts: { [dataType]: data.length }
        }
      } else {
        return {
          success: false,
          includedTables: [],
          recordCounts: {},
          error: result.error
        }
      }

    } catch (error) {
      return {
        success: false,
        includedTables: [],
        recordCounts: {},
        error: error instanceof Error ? error.message : '데이터 내보내기 중 오류가 발생했습니다'
      }
    }
  }

  // 교인 데이터 내보내기
  private async exportMemberData(dateRange?: { start: Date; end: Date }) {
    const where = {
      churchId: this.churchId,
      ...(dateRange && {
        createdAt: {
          gte: dateRange.start,
          lte: dateRange.end
        }
      })
    }

    const members = await this.prisma.member.findMany({
      where,
      include: {
        position: true,
        department: true
      },
      orderBy: { name: 'asc' }
    })

    return members.map(member => ({
      이름: member.name,
      전화번호: member.phone || '',
      이메일: member.email || '',
      생년월일: member.birthDate ? member.birthDate.toISOString().split('T')[0] : '',
      주소: member.address || '',
      성별: this.formatGender(member.gender),
      결혼상태: this.formatMaritalStatus(member.maritalStatus),
      세례일: member.baptismDate ? member.baptismDate.toISOString().split('T')[0] : '',
      입교일: member.confirmationDate ? member.confirmationDate.toISOString().split('T')[0] : '',
      등록일: member.registrationDate.toISOString().split('T')[0],
      직분: member.position?.name || '',
      부서: member.department?.name || '',
      가족ID: member.familyId || '',
      가족관계: this.formatFamilyRelation(member.relationship),
      상태: this.formatMemberStatus(member.status),
      비고: member.notes || '',
      생성일: member.createdAt.toISOString().split('T')[0],
      수정일: member.updatedAt.toISOString().split('T')[0]
    }))
  }

  // 헌금 데이터 내보내기
  private async exportOfferingData(
    dateRange?: { start: Date; end: Date },
    filters?: Record<string, any>
  ) {
    const where = {
      churchId: this.churchId,
      ...(dateRange && {
        offeringDate: {
          gte: dateRange.start,
          lte: dateRange.end
        }
      }),
      ...filters
    }

    const offerings = await this.prisma.offering.findMany({
      where,
      include: {
        member: true
      },
      orderBy: { offeringDate: 'desc' }
    })

    return offerings.map(offering => ({
      교인명: offering.member.name,
      금액: offering.amount.toNumber().toLocaleString('ko-KR'),
      헌금종류: this.formatOfferingType(offering.offeringType),
      설명: offering.description || '',
      헌금일: offering.offeringDate.toISOString().split('T')[0],
      생성일: offering.createdAt.toISOString().split('T')[0]
    }))
  }

  // 출석 데이터 내보내기
  private async exportAttendanceData(
    dateRange?: { start: Date; end: Date },
    filters?: Record<string, any>
  ) {
    const where = {
      churchId: this.churchId,
      ...(dateRange && {
        attendanceDate: {
          gte: dateRange.start,
          lte: dateRange.end
        }
      }),
      ...filters
    }

    const attendances = await this.prisma.attendance.findMany({
      where,
      include: {
        member: true
      },
      orderBy: { attendanceDate: 'desc' }
    })

    return attendances.map(attendance => ({
      교인명: attendance.member.name,
      예배종류: this.formatServiceType(attendance.serviceType),
      출석일: attendance.attendanceDate.toISOString().split('T')[0],
      출석여부: attendance.isPresent ? '출석' : '결석',
      비고: attendance.notes || '',
      생성일: attendance.createdAt.toISOString().split('T')[0]
    }))
  }

  // 심방 데이터 내보내기
  private async exportVisitationData(
    dateRange?: { start: Date; end: Date },
    filters?: Record<string, any>
  ) {
    const where = {
      member: {
        churchId: this.churchId
      },
      ...(dateRange && {
        visitDate: {
          gte: dateRange.start,
          lte: dateRange.end
        }
      }),
      ...filters
    }

    const visitations = await this.prisma.visitation.findMany({
      where,
      include: {
        member: true
      },
      orderBy: { visitDate: 'desc' }
    })

    return visitations.map(visitation => ({
      교인명: visitation.member.name,
      심방일: visitation.visitDate.toISOString().split('T')[0],
      목적: visitation.purpose || '',
      내용: visitation.content || '',
      후속관리: visitation.needsFollowUp ? '필요' : '불필요',
      후속관리일: visitation.followUpDate ? visitation.followUpDate.toISOString().split('T')[0] : '',
      생성일: visitation.createdAt.toISOString().split('T')[0]
    }))
  }

  // 지출결의서 데이터 내보내기
  private async exportExpenseReportData(
    dateRange?: { start: Date; end: Date },
    filters?: Record<string, any>
  ) {
    const where = {
      churchId: this.churchId,
      ...(dateRange && {
        requestDate: {
          gte: dateRange.start,
          lte: dateRange.end
        }
      }),
      ...filters
    }

    const expenses = await this.prisma.expenseReport.findMany({
      where,
      include: {
        requester: true
      },
      orderBy: { requestDate: 'desc' }
    })

    return expenses.map(expense => ({
      제목: expense.title,
      설명: expense.description || '',
      금액: expense.amount.toNumber().toLocaleString('ko-KR'),
      분류: expense.category,
      상태: this.formatReportStatus(expense.status),
      신청자: expense.requester.name,
      신청일: expense.requestDate.toISOString().split('T')[0],
      승인일: expense.approvedDate ? expense.approvedDate.toISOString().split('T')[0] : '',
      거부일: expense.rejectedDate ? expense.rejectedDate.toISOString().split('T')[0] : '',
      거부사유: expense.rejectionReason || '',
      생성일: expense.createdAt.toISOString().split('T')[0]
    }))
  }

  // 조직 데이터 내보내기
  private async exportOrganizationData(includeInactive: boolean = false) {
    const where = {
      churchId: this.churchId,
      ...(includeInactive ? {} : { isActive: true })
    }

    const organizations = await this.prisma.organization.findMany({
      where,
      include: {
        parent: true
      },
      orderBy: [
        { level: 'asc' },
        { sortOrder: 'asc' },
        { name: 'asc' }
      ]
    })

    return organizations.map(org => ({
      조직코드: org.code,
      조직명: org.name,
      영문명: org.englishName || '',
      조직레벨: this.formatOrganizationLevel(org.level),
      상위조직코드: org.parent?.code || '',
      설명: org.description || '',
      활성상태: org.isActive ? '예' : '아니오',
      정렬순서: org.sortOrder,
      생성일: org.createdAt.toISOString().split('T')[0],
      수정일: org.updatedAt.toISOString().split('T')[0]
    }))
  }

  // 조직별 직책 구성원 데이터 내보내기
  private async exportOrganizationMembershipData(includeInactive: boolean = false) {
    const where = {
      organization: {
        churchId: this.churchId
      },
      ...(includeInactive ? {} : { isActive: true })
    }

    const memberships = await this.prisma.organizationMembership.findMany({
      where,
      include: {
        member: {
          select: {
            name: true,
            phone: true,
            email: true
          }
        },
        organization: {
          select: {
            code: true,
            name: true,
            level: true
          }
        },
        role: {
          select: {
            name: true,
            level: true,
            isLeadership: true
          }
        }
      },
      orderBy: [
        { organization: { name: 'asc' } },
        { role: { level: 'desc' } },
        { member: { name: 'asc' } }
      ]
    })

    return memberships.map(membership => ({
      교인명: membership.member.name,
      교인연락처: membership.member.phone || '',
      교인이메일: membership.member.email || '',
      조직코드: membership.organization.code,
      조직명: membership.organization.name,
      조직레벨: this.formatOrganizationLevel(membership.organization.level),
      직책명: membership.role?.name || '',
      직책레벨: membership.role?.level || 0,
      리더십여부: membership.role?.isLeadership ? '예' : '아니오',
      주소속여부: membership.isPrimary ? '예' : '아니오',
      가입일: membership.joinDate.toISOString().split('T')[0],
      종료일: membership.endDate ? membership.endDate.toISOString().split('T')[0] : '',
      활성상태: membership.isActive ? '예' : '아니오',
      비고: membership.notes || '',
      생성일: membership.createdAt.toISOString().split('T')[0],
      수정일: membership.updatedAt.toISOString().split('T')[0]
    }))
  }

  // 회계 계정코드 데이터 내보내기
  private async exportAccountCodeData(includeInactive: boolean = false) {
    const where = {
      churchId: this.churchId,
      ...(includeInactive ? {} : { isActive: true })
    }

    const accountCodes = await this.prisma.accountCode.findMany({
      where,
      include: {
        parent: true
      },
      orderBy: [
        { level: 'asc' },
        { order: 'asc' },
        { code: 'asc' }
      ]
    })

    return accountCodes.map(account => ({
      계정코드: account.code,
      계정명: account.name,
      영문명: account.englishName || '',
      계정분류: this.formatAccountType(account.type),
      계층레벨: account.level,
      상위계정코드: account.parent?.code || '',
      정렬순서: account.order,
      거래허용: account.allowTransaction ? '예' : '아니오',
      활성상태: account.isActive ? '예' : '아니오',
      시스템계정: account.isSystem ? '예' : '아니오',
      설명: account.description || '',
      생성일: account.createdAt.toISOString().split('T')[0],
      수정일: account.updatedAt.toISOString().split('T')[0]
    }))
  }

  // 백업 정보 시트 생성
  private createBackupInfoSheet(
    includedTables: string[],
    recordCounts: Record<string, number>,
    options: BackupOptions
  ) {
    const backupDate = new Date().toISOString()
    const totalRecords = Object.values(recordCounts).reduce((sum, count) => sum + count, 0)

    return [
      { 항목: '백업 생성일', 값: backupDate.split('T')[0] },
      { 항목: '백업 생성시간', 값: backupDate.split('T')[1].split('.')[0] },
      { 항목: '교회 ID', 값: this.churchId },
      { 항목: '포함된 테이블', 값: includedTables.join(', ') },
      { 항목: '총 레코드 수', 값: totalRecords.toString() },
      ...includedTables.map(table => ({
        항목: `${table} 레코드 수`,
        값: recordCounts[table]?.toString() || '0'
      })),
      {
        항목: '날짜 범위',
        값: options.dateRange
          ? `${options.dateRange.start.toISOString().split('T')[0]} ~ ${options.dateRange.end.toISOString().split('T')[0]}`
          : '전체 기간'
      }
    ]
  }

  // 백업 파일명 생성
  private generateBackupFilename(): string {
    const now = new Date()
    const dateStr = now.toISOString().split('T')[0]
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '')
    return `과천교회_백업_${dateStr}_${timeStr}.xlsx`
  }

  // 포맷팅 유틸리티 함수들
  private formatGender(gender: any): string {
    switch (gender) {
      case 'MALE': return '남'
      case 'FEMALE': return '여'
      default: return ''
    }
  }

  private formatMaritalStatus(status: any): string {
    switch (status) {
      case 'SINGLE': return '미혼'
      case 'MARRIED': return '기혼'
      case 'DIVORCED': return '이혼'
      case 'WIDOWED': return '사별'
      default: return ''
    }
  }

  private formatFamilyRelation(relation: any): string {
    switch (relation) {
      case 'HEAD': return '가장'
      case 'SPOUSE': return '배우자'
      case 'CHILD': return '자녀'
      case 'PARENT': return '부모'
      case 'SIBLING': return '형제자매'
      case 'OTHER': return '기타'
      default: return ''
    }
  }

  private formatMemberStatus(status: any): string {
    switch (status) {
      case 'ACTIVE': return '활동'
      case 'INACTIVE': return '비활동'
      case 'TRANSFERRED': return '전출'
      case 'DECEASED': return '소천'
      default: return ''
    }
  }

  private formatOfferingType(type: any): string {
    switch (type) {
      case 'TITHE': return '십일조'
      case 'THANKSGIVING': return '감사헌금'
      case 'SUNDAY_OFFERING': return '주일헌금'
      case 'SPECIAL': return '특별헌금'
      case 'MISSION': return '선교헌금'
      case 'BUILDING': return '건축헌금'
      case 'OTHER': return '기타'
      default: return ''
    }
  }

  private formatServiceType(type: any): string {
    switch (type) {
      case 'SUNDAY_MORNING': return '주일오전예배'
      case 'SUNDAY_EVENING': return '주일오후예배'
      case 'WEDNESDAY': return '수요예배'
      case 'DAWN_PRAYER': return '새벽기도회'
      case 'FRIDAY_PRAYER': return '금요기도회'
      case 'SPECIAL_SERVICE': return '특별예배'
      case 'OTHER': return '기타'
      default: return ''
    }
  }

  private formatReportStatus(status: any): string {
    switch (status) {
      case 'PENDING': return '대기중'
      case 'APPROVED': return '승인'
      case 'REJECTED': return '거부'
      case 'PAID': return '지급완료'
      default: return ''
    }
  }

  private formatOrganizationLevel(level: any): string {
    switch (level) {
      case 'LEVEL_1': return '1단계'
      case 'LEVEL_2': return '2단계'
      case 'LEVEL_3': return '3단계'
      case 'LEVEL_4': return '4단계'
      default: return ''
    }
  }

  private formatAccountType(type: any): string {
    switch (type) {
      case 'ASSET': return '자산'
      case 'LIABILITY': return '부채'
      case 'EQUITY': return '자본'
      case 'REVENUE': return '수익'
      case 'EXPENSE': return '비용'
      default: return ''
    }
  }

}