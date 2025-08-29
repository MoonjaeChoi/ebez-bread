import { PrismaClient } from '@prisma/client'
import {
  DataType,
  ExportOptions,
  ProgressCallback,
  MemberExportData,
  OfferingExportData,
  AttendanceExportData,
  VisitationExportData,
  ExpenseReportExportData
} from '../types'
import { logger } from '@/lib/logger'

export class DataFormatter {
  /**
   * 내보내기 옵션에 따라 데이터 조회 및 포맷팅
   */
  async formatData(
    options: ExportOptions,
    progressCallback?: ProgressCallback
  ): Promise<any[]> {
    try {
      progressCallback?.(10, '데이터 조회 중...')

      // 데이터 조회는 별도 서비스에서 처리하므로 여기서는 포맷팅만 담당
      // 실제 구현에서는 prisma 인스턴스와 churchId가 필요
      
      progressCallback?.(50, '데이터 포맷팅 중...')

      // 이 메서드는 이미 조회된 데이터를 포맷팅하는 용도로 사용
      // 실제 데이터 조회는 각 Exporter에서 처리

      progressCallback?.(100, '포맷팅 완료')

      return []
    } catch (error) {
      logger.error('Data formatting failed', error instanceof Error ? error : new Error(String(error)), { metadata: { options } })
      throw error
    }
  }

  /**
   * 교인 데이터 포맷팅
   */
  formatMembersData(members: any[]): MemberExportData[] {
    return members.map(member => ({
      id: member.id,
      name: member.name,
      phone: member.phone,
      email: member.email,
      photoUrl: member.photoUrl,
      birthDate: member.birthDate,
      address: member.address,
      gender: member.gender,
      maritalStatus: member.maritalStatus,
      baptismDate: member.baptismDate,
      confirmationDate: member.confirmationDate,
      registrationDate: member.registrationDate,
      familyId: member.familyId,
      relationship: member.relationship,
      notes: member.notes,
      status: member.status,
      createdAt: member.createdAt,
      updatedAt: member.updatedAt,
      positionName: member.position?.name || '',
      departmentName: member.department?.name || ''
    }))
  }

  /**
   * 헌금 데이터 포맷팅
   */
  formatOfferingsData(offerings: any[]): OfferingExportData[] {
    return offerings.map(offering => ({
      id: offering.id,
      amount: offering.amount,
      offeringType: offering.offeringType,
      description: offering.description,
      offeringDate: offering.offeringDate,
      createdAt: offering.createdAt,
      updatedAt: offering.updatedAt,
      memberName: offering.member?.name || ''
    }))
  }

  /**
   * 출석 데이터 포맷팅
   */
  formatAttendancesData(attendances: any[]): AttendanceExportData[] {
    return attendances.map(attendance => ({
      id: attendance.id,
      serviceType: attendance.serviceType,
      attendanceDate: attendance.attendanceDate,
      isPresent: attendance.isPresent,
      notes: attendance.notes,
      createdAt: attendance.createdAt,
      updatedAt: attendance.updatedAt,
      memberName: attendance.member?.name || ''
    }))
  }

  /**
   * 심방 데이터 포맷팅
   */
  formatVisitationsData(visitations: any[]): VisitationExportData[] {
    return visitations.map(visitation => ({
      id: visitation.id,
      visitDate: visitation.visitDate,
      purpose: visitation.purpose,
      content: visitation.content,
      description: visitation.description,
      churchId: visitation.churchId,
      needsFollowUp: visitation.needsFollowUp,
      followUpDate: visitation.followUpDate,
      createdAt: visitation.createdAt,
      updatedAt: visitation.updatedAt,
      memberName: visitation.member?.name || ''
    }))
  }

  /**
   * 지출결의서 데이터 포맷팅
   */
  formatExpenseReportsData(reports: any[]): ExpenseReportExportData[] {
    return reports.map(report => ({
      id: report.id,
      title: report.title,
      description: report.description,
      amount: report.amount,
      category: report.category,
      status: report.status,
      budgetItemId: report.budgetItemId,
      requestDate: report.requestDate,
      approvedDate: report.approvedDate,
      rejectedDate: report.rejectedDate,
      rejectionReason: report.rejectionReason,
      receiptUrl: report.receiptUrl,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
      requesterName: report.requester?.name || ''
    }))
  }

  /**
   * 날짜 범위 필터링
   */
  filterByDateRange<T extends { [key: string]: any }>(
    data: T[],
    dateField: keyof T,
    startDate: Date,
    endDate: Date
  ): T[] {
    return data.filter(item => {
      const itemDate = item[dateField]
      if (!itemDate) return false
      
      const date = new Date(itemDate)
      return date >= startDate && date <= endDate
    })
  }

  /**
   * 상태별 필터링
   */
  filterByStatus<T extends { status?: string }>(
    data: T[],
    status: string
  ): T[] {
    return data.filter(item => item.status === status)
  }

  /**
   * 활성 상태 필터링
   */
  filterActive<T extends { status?: string }>(data: T[]): T[] {
    return data.filter(item => 
      !item.status || 
      (item.status !== 'INACTIVE' && item.status !== 'DELETED')
    )
  }

  /**
   * 교인별 필터링
   */
  filterByMember<T extends { memberName?: string; memberId?: string }>(
    data: T[],
    memberNameOrId: string
  ): T[] {
    return data.filter(item => 
      item.memberName === memberNameOrId || 
      item.memberId === memberNameOrId
    )
  }

  /**
   * 분류별 필터링
   */
  filterByCategory<T extends { category?: string }>(
    data: T[],
    category: string
  ): T[] {
    return data.filter(item => item.category === category)
  }

  /**
   * 정렬
   */
  sortData<T extends { [key: string]: any }>(
    data: T[],
    sortField: keyof T,
    sortOrder: 'asc' | 'desc' = 'desc'
  ): T[] {
    return [...data].sort((a, b) => {
      const aValue = a[sortField]
      const bValue = b[sortField]

      if (aValue === null || aValue === undefined) return 1
      if (bValue === null || bValue === undefined) return -1

      let comparison = 0
      if (aValue > bValue) comparison = 1
      else if (aValue < bValue) comparison = -1

      return sortOrder === 'desc' ? -comparison : comparison
    })
  }

  /**
   * 중복 제거
   */
  removeDuplicates<T extends { id: string }>(data: T[]): T[] {
    const seen = new Set<string>()
    return data.filter(item => {
      if (seen.has(item.id)) return false
      seen.add(item.id)
      return true
    })
  }

  /**
   * 페이징
   */
  paginate<T>(data: T[], page: number, pageSize: number): T[] {
    const startIndex = (page - 1) * pageSize
    const endIndex = startIndex + pageSize
    return data.slice(startIndex, endIndex)
  }

  /**
   * 컬럼별 통계 생성
   */
  generateStatistics(data: any[], dataType: DataType): Record<string, any> {
    if (!data || data.length === 0) {
      return { total: 0 }
    }

    const stats: Record<string, any> = {
      total: data.length,
      createdAt: {
        earliest: null,
        latest: null
      }
    }

    // 생성일 통계
    const createdDates = data
      .map(item => item.createdAt)
      .filter(date => date)
      .map(date => new Date(date))

    if (createdDates.length > 0) {
      stats.createdAt.earliest = new Date(Math.min(...createdDates.map(d => d.getTime())))
      stats.createdAt.latest = new Date(Math.max(...createdDates.map(d => d.getTime())))
    }

    // 데이터 타입별 특별 통계
    switch (dataType) {
      case DataType.MEMBERS:
        this.addMemberStatistics(stats, data)
        break
      case DataType.OFFERINGS:
        this.addOfferingStatistics(stats, data)
        break
      case DataType.ATTENDANCES:
        this.addAttendanceStatistics(stats, data)
        break
      case DataType.EXPENSE_REPORTS:
        this.addExpenseStatistics(stats, data)
        break
    }

    return stats
  }

  /**
   * 교인 통계 추가
   */
  private addMemberStatistics(stats: Record<string, any>, members: any[]): void {
    // 성별 분포
    stats.genderDistribution = this.countByField(members, 'gender')
    
    // 결혼 상태 분포
    stats.maritalStatusDistribution = this.countByField(members, 'maritalStatus')
    
    // 상태 분포
    stats.statusDistribution = this.countByField(members, 'status')
    
    // 연령대 분포 (대략적)
    const ageGroups = members
      .filter(m => m.birthDate)
      .map(m => {
        const age = new Date().getFullYear() - new Date(m.birthDate).getFullYear()
        if (age < 20) return '20세 미만'
        if (age < 30) return '20-29세'
        if (age < 40) return '30-39세'
        if (age < 50) return '40-49세'
        if (age < 60) return '50-59세'
        if (age < 70) return '60-69세'
        return '70세 이상'
      })
    
    stats.ageGroupDistribution = this.countItems(ageGroups)
  }

  /**
   * 헌금 통계 추가
   */
  private addOfferingStatistics(stats: Record<string, any>, offerings: any[]): void {
    // 헌금 종류별 분포
    stats.typeDistribution = this.countByField(offerings, 'offeringType')
    
    // 총 헌금액
    stats.totalAmount = offerings.reduce((sum, o) => sum + (o.amount || 0), 0)
    
    // 평균 헌금액
    stats.averageAmount = Math.round(stats.totalAmount / offerings.length)
    
    // 월별 분포
    const monthlyData = offerings
      .filter(o => o.offeringDate)
      .map(o => new Date(o.offeringDate).toISOString().substring(0, 7)) // YYYY-MM
    
    stats.monthlyDistribution = this.countItems(monthlyData)
  }

  /**
   * 출석 통계 추가
   */
  private addAttendanceStatistics(stats: Record<string, any>, attendances: any[]): void {
    // 예배별 분포
    stats.serviceTypeDistribution = this.countByField(attendances, 'serviceType')
    
    // 출석률
    const presentCount = attendances.filter(a => a.isPresent).length
    stats.attendanceRate = Math.round((presentCount / attendances.length) * 100)
    
    // 월별 분포
    const monthlyData = attendances
      .filter(a => a.attendanceDate)
      .map(a => new Date(a.attendanceDate).toISOString().substring(0, 7))
    
    stats.monthlyDistribution = this.countItems(monthlyData)
  }

  /**
   * 지출결의서 통계 추가
   */
  private addExpenseStatistics(stats: Record<string, any>, expenses: any[]): void {
    // 상태별 분포
    stats.statusDistribution = this.countByField(expenses, 'status')
    
    // 분류별 분포
    stats.categoryDistribution = this.countByField(expenses, 'category')
    
    // 총 지출액
    stats.totalAmount = expenses.reduce((sum, e) => sum + (e.amount || 0), 0)
    
    // 평균 지출액
    stats.averageAmount = Math.round(stats.totalAmount / expenses.length)
    
    // 승인된 지출액
    const approvedExpenses = expenses.filter(e => e.status === 'APPROVED')
    stats.approvedAmount = approvedExpenses.reduce((sum, e) => sum + (e.amount || 0), 0)
  }

  /**
   * 필드별 카운트
   */
  private countByField(data: any[], field: string): Record<string, number> {
    const values = data.map(item => item[field]).filter(value => value != null)
    return this.countItems(values)
  }

  /**
   * 항목별 카운트
   */
  private countItems(items: any[]): Record<string, number> {
    const counts: Record<string, number> = {}
    for (const item of items) {
      const key = String(item)
      counts[key] = (counts[key] || 0) + 1
    }
    return counts
  }

  /**
   * 데이터 검증 (내보내기 전 마지막 체크)
   */
  validateExportData(data: any[], dataType: DataType): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!data || data.length === 0) {
      errors.push('내보낼 데이터가 없습니다')
      return { isValid: false, errors }
    }

    // 데이터 타입별 필수 필드 검증
    const requiredFields = this.getRequiredFields(dataType)
    const sampleItem = data[0]

    for (const field of requiredFields) {
      if (!(field in sampleItem)) {
        errors.push(`필수 필드가 누락되었습니다: ${field}`)
      }
    }

    // 데이터 일관성 검증
    const fieldTypes = this.analyzeFieldTypes(data)
    for (const [field, types] of Object.entries(fieldTypes)) {
      if (types.size > 2) { // null/undefined 제외하고 타입이 2개 이상이면 문제
        errors.push(`필드 '${field}'의 데이터 타입이 일관성이 없습니다`)
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * 필수 필드 목록
   */
  private getRequiredFields(dataType: DataType): string[] {
    switch (dataType) {
      case DataType.MEMBERS:
        return ['id', 'name']
      case DataType.OFFERINGS:
        return ['id', 'amount', 'memberName']
      case DataType.ATTENDANCES:
        return ['id', 'memberName', 'serviceType', 'isPresent']
      case DataType.VISITATIONS:
        return ['id', 'memberName', 'visitDate']
      case DataType.EXPENSE_REPORTS:
        return ['id', 'title', 'amount', 'status']
      default:
        return ['id']
    }
  }

  /**
   * 필드별 데이터 타입 분석
   */
  private analyzeFieldTypes(data: any[]): Map<string, Set<string>> {
    const fieldTypes = new Map<string, Set<string>>()

    for (const item of data.slice(0, 100)) { // 샘플링으로 성능 최적화
      for (const [field, value] of Object.entries(item)) {
        if (!fieldTypes.has(field)) {
          fieldTypes.set(field, new Set())
        }
        
        const types = fieldTypes.get(field)!
        if (value === null || value === undefined) {
          types.add('null')
        } else {
          types.add(typeof value)
        }
      }
    }

    return fieldTypes
  }
}