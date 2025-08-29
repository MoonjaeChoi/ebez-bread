import { PrismaClient } from '@prisma/client'
import {
  DataType,
  ImportOptions,
  ImportResult,
  ImportError,
  ProgressCallback,
  MemberImportData,
  OfferingImportData,
  AttendanceImportData,
  VisitationImportData,
  ExpenseReportImportData,
  BatchProcessingOptions
} from '../types'
import { logger } from '@/lib/logger'

export class DataProcessor {
  private prisma: PrismaClient
  private churchId: string

  constructor(prisma: PrismaClient, churchId: string) {
    this.prisma = prisma
    this.churchId = churchId
  }

  /**
   * 검증된 데이터 처리 및 저장
   */
  async processData(
    validatedData: any[],
    dataType: DataType,
    options: Partial<ImportOptions> = {},
    progressCallback?: ProgressCallback
  ): Promise<ImportResult> {
    try {
      progressCallback?.(10, '데이터 처리 시작...')

      const batchOptions: BatchProcessingOptions = {
        batchSize: 100,
        maxRetries: 3,
        retryDelay: 1000,
        onProgress: progressCallback
      }

      const fullOptions: ImportOptions = {
        dataType,
        ...options
      }

      let result: ImportResult

      switch (dataType) {
        case DataType.MEMBERS:
          result = await this.processMembersData(validatedData, fullOptions, batchOptions)
          break
        case DataType.OFFERINGS:
          result = await this.processOfferingsData(validatedData, fullOptions, batchOptions)
          break
        case DataType.ATTENDANCES:
          result = await this.processAttendancesData(validatedData, fullOptions, batchOptions)
          break
        case DataType.VISITATIONS:
          result = await this.processVisitationsData(validatedData, fullOptions, batchOptions)
          break
        case DataType.EXPENSE_REPORTS:
          result = await this.processExpenseReportsData(validatedData, fullOptions, batchOptions)
          break
        default:
          throw new Error(`지원하지 않는 데이터 타입입니다: ${dataType}`)
      }

      progressCallback?.(100, '데이터 처리 완료')

      logger.info('Data processing completed', {
        churchId: this.churchId,
        action: 'process_data',
        metadata: {
          dataType,
          total: result.summary.total,
          successful: result.summary.successful,
          failed: result.summary.failed
        }
      })

      return result
    } catch (error) {
      logger.error('Data processing failed', error instanceof Error ? error : new Error(String(error)), {
        churchId: this.churchId,
        action: 'process_data',
        metadata: {
          dataType
        }
      })
      throw error
    }
  }

  /**
   * 교인 데이터 처리
   */
  private async processMembersData(
    data: MemberImportData[],
    options: ImportOptions,
    batchOptions: BatchProcessingOptions
  ): Promise<ImportResult> {
    const savedData: any[] = []
    const errors: ImportError[] = []

    // 직분/부서 매핑 정보 미리 조회
    const [positions, departments] = await Promise.all([
      this.prisma.position.findMany({
        where: { churchId: this.churchId, isActive: true },
        select: { id: true, name: true }
      }),
      this.prisma.department.findMany({
        where: { churchId: this.churchId, isActive: true },
        select: { id: true, name: true }
      })
    ])

    // 배치 처리
    const batches = this.createBatches(data, batchOptions.batchSize || 100)

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex]
      
      batchOptions.onProgress?.(
        Math.floor((batchIndex / batches.length) * 80) + 10,
        `${batchIndex + 1}/${batches.length} 배치 처리 중...`
      )

      const batchResults = await this.processMembersBatch(
        batch,
        options,
        positions,
        departments,
        batchIndex * (batchOptions.batchSize || 100)
      )

      savedData.push(...batchResults.saved)
      errors.push(...batchResults.errors)
    }

    return {
      success: savedData.length > 0,
      data: savedData,
      errors,
      summary: {
        total: data.length,
        successful: savedData.length,
        failed: data.length - savedData.length
      }
    }
  }

  /**
   * 교인 배치 처리
   */
  private async processMembersBatch(
    batch: MemberImportData[],
    options: ImportOptions,
    positions: { id: string; name: string }[],
    departments: { id: string; name: string }[],
    batchOffset: number
  ): Promise<{ saved: any[]; errors: ImportError[] }> {
    const saved: any[] = []
    const errors: ImportError[] = []

    for (let i = 0; i < batch.length; i++) {
      const memberData = batch[i]
      const rowIndex = batchOffset + i + 1

      try {
        // 직분/부서 ID 조회
        const positionId = memberData.positionName 
          ? positions.find(p => p.name === memberData.positionName)?.id
          : null

        const departmentId = memberData.departmentName
          ? departments.find(d => d.name === memberData.departmentName)?.id
          : null

        // Enum 값 변환
        const processedData = this.convertMemberEnums(memberData)

        let member
        if (options.updateExisting) {
          // 기존 교인 찾기 (이메일 또는 이름으로)
          const existingMember = await this.prisma.member.findFirst({
            where: {
              churchId: this.churchId,
              OR: [
                { email: processedData.email },
                { name: processedData.name }
              ]
            }
          })

          if (existingMember) {
            // 기존 교인 업데이트
            member = await this.prisma.member.update({
              where: { id: existingMember.id },
              data: {
                name: processedData.name,
                phone: processedData.phone,
                email: processedData.email,
                birthDate: processedData.birthDate,
                address: processedData.address,
                gender: processedData.gender,
                maritalStatus: processedData.maritalStatus,
                baptismDate: processedData.baptismDate,
                confirmationDate: processedData.confirmationDate,
                positionId,
                departmentId,
                familyId: processedData.familyId,
                relationship: processedData.relationship,
                notes: processedData.notes,
                status: processedData.status || 'ACTIVE'
              }
            })
          } else {
            // 새 교인 생성
            member = await this.prisma.member.create({
              data: {
                churchId: this.churchId,
                name: processedData.name,
                phone: processedData.phone,
                email: processedData.email,
                birthDate: processedData.birthDate,
                address: processedData.address,
                gender: processedData.gender,
                maritalStatus: processedData.maritalStatus,
                baptismDate: processedData.baptismDate,
                confirmationDate: processedData.confirmationDate,
                positionId,
                departmentId,
                familyId: processedData.familyId,
                relationship: processedData.relationship,
                notes: processedData.notes,
                status: processedData.status || 'ACTIVE'
              }
            })
          }
        } else {
          // 새 교인 생성만
          member = await this.prisma.member.create({
            data: {
              churchId: this.churchId,
              name: processedData.name,
              phone: processedData.phone,
              email: processedData.email,
              birthDate: processedData.birthDate,
              address: processedData.address,
              gender: processedData.gender,
              maritalStatus: processedData.maritalStatus,
              baptismDate: processedData.baptismDate,
              confirmationDate: processedData.confirmationDate,
              positionId,
              departmentId,
              familyId: processedData.familyId,
              relationship: processedData.relationship,
              notes: processedData.notes,
              status: processedData.status || 'ACTIVE'
            }
          })
        }

        saved.push(member)
      } catch (error) {
        errors.push({
          row: rowIndex,
          message: `교인 ${memberData.name} 저장 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
          value: memberData
        })

        if (!options.skipErrors) {
          break
        }
      }
    }

    return { saved, errors }
  }

  /**
   * 헌금 데이터 처리
   */
  private async processOfferingsData(
    data: OfferingImportData[],
    options: ImportOptions,
    batchOptions: BatchProcessingOptions
  ): Promise<ImportResult> {
    const savedData: any[] = []
    const errors: ImportError[] = []

    // 교인 매핑 정보 미리 조회
    const members = await this.prisma.member.findMany({
      where: { churchId: this.churchId },
      select: { id: true, name: true }
    })

    // 배치 처리
    const batches = this.createBatches(data, batchOptions.batchSize || 100)

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex]
      
      batchOptions.onProgress?.(
        Math.floor((batchIndex / batches.length) * 80) + 10,
        `${batchIndex + 1}/${batches.length} 배치 처리 중...`
      )

      const batchResults = await this.processOfferingsBatch(
        batch,
        options,
        members,
        batchIndex * (batchOptions.batchSize || 100)
      )

      savedData.push(...batchResults.saved)
      errors.push(...batchResults.errors)
    }

    return {
      success: savedData.length > 0,
      data: savedData,
      errors,
      summary: {
        total: data.length,
        successful: savedData.length,
        failed: data.length - savedData.length
      }
    }
  }

  /**
   * 헌금 배치 처리
   */
  private async processOfferingsBatch(
    batch: OfferingImportData[],
    options: ImportOptions,
    members: { id: string; name: string }[],
    batchOffset: number
  ): Promise<{ saved: any[]; errors: ImportError[] }> {
    const saved: any[] = []
    const errors: ImportError[] = []

    for (let i = 0; i < batch.length; i++) {
      const offeringData = batch[i]
      const rowIndex = batchOffset + i + 1

      try {
        // 교인 ID 찾기
        const member = members.find(m => m.name === offeringData.memberName)
        if (!member) {
          errors.push({
            row: rowIndex,
            message: `교인을 찾을 수 없습니다: ${offeringData.memberName}`,
            value: offeringData
          })
          continue
        }

        // Enum 값 변환
        const processedData = this.convertOfferingEnums(offeringData)

        const offering = await this.prisma.offering.create({
          data: {
            churchId: this.churchId,
            memberId: member.id,
            amount: processedData.amount,
            offeringType: processedData.offeringType,
            description: processedData.description,
            offeringDate: processedData.offeringDate || new Date()
          }
        })

        saved.push(offering)
      } catch (error) {
        errors.push({
          row: rowIndex,
          message: `헌금 데이터 저장 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
          value: offeringData
        })

        if (!options.skipErrors) {
          break
        }
      }
    }

    return { saved, errors }
  }

  /**
   * 출석 데이터 처리
   */
  private async processAttendancesData(
    data: AttendanceImportData[],
    options: ImportOptions,
    batchOptions: BatchProcessingOptions
  ): Promise<ImportResult> {
    const savedData: any[] = []
    const errors: ImportError[] = []

    // 교인 매핑 정보 미리 조회
    const members = await this.prisma.member.findMany({
      where: { churchId: this.churchId },
      select: { id: true, name: true }
    })

    // 배치 처리
    const batches = this.createBatches(data, batchOptions.batchSize || 100)

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex]
      
      batchOptions.onProgress?.(
        Math.floor((batchIndex / batches.length) * 80) + 10,
        `${batchIndex + 1}/${batches.length} 배치 처리 중...`
      )

      const batchResults = await this.processAttendancesBatch(
        batch,
        options,
        members,
        batchIndex * (batchOptions.batchSize || 100)
      )

      savedData.push(...batchResults.saved)
      errors.push(...batchResults.errors)
    }

    return {
      success: savedData.length > 0,
      data: savedData,
      errors,
      summary: {
        total: data.length,
        successful: savedData.length,
        failed: data.length - savedData.length
      }
    }
  }

  /**
   * 출석 배치 처리
   */
  private async processAttendancesBatch(
    batch: AttendanceImportData[],
    options: ImportOptions,
    members: { id: string; name: string }[],
    batchOffset: number
  ): Promise<{ saved: any[]; errors: ImportError[] }> {
    const saved: any[] = []
    const errors: ImportError[] = []

    for (let i = 0; i < batch.length; i++) {
      const attendanceData = batch[i]
      const rowIndex = batchOffset + i + 1

      try {
        // 교인 ID 찾기
        const member = members.find(m => m.name === attendanceData.memberName)
        if (!member) {
          errors.push({
            row: rowIndex,
            message: `교인을 찾을 수 없습니다: ${attendanceData.memberName}`,
            value: attendanceData
          })
          continue
        }

        // Enum 값 변환
        const processedData = this.convertAttendanceEnums(attendanceData)
        const attendanceDate = processedData.attendanceDate || new Date()

        // 중복 체크
        const existingAttendance = await this.prisma.attendance.findFirst({
          where: {
            churchId: this.churchId,
            memberId: member.id,
            serviceType: processedData.serviceType,
            attendanceDate: {
              gte: new Date(attendanceDate.getFullYear(), attendanceDate.getMonth(), attendanceDate.getDate()),
              lt: new Date(attendanceDate.getFullYear(), attendanceDate.getMonth(), attendanceDate.getDate() + 1)
            }
          }
        })

        let attendance
        if (existingAttendance && options.updateExisting) {
          // 기존 출석 기록 업데이트
          attendance = await this.prisma.attendance.update({
            where: { id: existingAttendance.id },
            data: {
              isPresent: processedData.isPresent,
              notes: processedData.notes
            }
          })
        } else if (!existingAttendance) {
          // 새 출석 기록 생성
          attendance = await this.prisma.attendance.create({
            data: {
              churchId: this.churchId,
              memberId: member.id,
              serviceType: processedData.serviceType,
              attendanceDate,
              isPresent: processedData.isPresent ?? true,
              notes: processedData.notes
            }
          })
        }

        if (attendance) {
          saved.push(attendance)
        }
      } catch (error) {
        errors.push({
          row: rowIndex,
          message: `출석 데이터 저장 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
          value: attendanceData
        })

        if (!options.skipErrors) {
          break
        }
      }
    }

    return { saved, errors }
  }

  /**
   * 심방 데이터 처리
   */
  private async processVisitationsData(
    data: VisitationImportData[],
    options: ImportOptions,
    batchOptions: BatchProcessingOptions
  ): Promise<ImportResult> {
    const savedData: any[] = []
    const errors: ImportError[] = []

    // 교인 매핑 정보 미리 조회
    const members = await this.prisma.member.findMany({
      where: { churchId: this.churchId },
      select: { id: true, name: true }
    })

    // 배치 처리
    const batches = this.createBatches(data, batchOptions.batchSize || 100)

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex]
      
      batchOptions.onProgress?.(
        Math.floor((batchIndex / batches.length) * 80) + 10,
        `${batchIndex + 1}/${batches.length} 배치 처리 중...`
      )

      const batchResults = await this.processVisitationsBatch(
        batch,
        options,
        members,
        batchIndex * (batchOptions.batchSize || 100)
      )

      savedData.push(...batchResults.saved)
      errors.push(...batchResults.errors)
    }

    return {
      success: savedData.length > 0,
      data: savedData,
      errors,
      summary: {
        total: data.length,
        successful: savedData.length,
        failed: data.length - savedData.length
      }
    }
  }

  /**
   * 심방 배치 처리
   */
  private async processVisitationsBatch(
    batch: VisitationImportData[],
    options: ImportOptions,
    members: { id: string; name: string }[],
    batchOffset: number
  ): Promise<{ saved: any[]; errors: ImportError[] }> {
    const saved: any[] = []
    const errors: ImportError[] = []

    for (let i = 0; i < batch.length; i++) {
      const visitationData = batch[i]
      const rowIndex = batchOffset + i + 1

      try {
        // 교인 ID 찾기
        const member = members.find(m => m.name === visitationData.memberName)
        if (!member) {
          errors.push({
            row: rowIndex,
            message: `교인을 찾을 수 없습니다: ${visitationData.memberName}`,
            value: visitationData
          })
          continue
        }

        const visitation = await this.prisma.visitation.create({
          data: {
            churchId: this.churchId,
            memberId: member.id,
            visitDate: visitationData.visitDate,
            purpose: (visitationData.purpose as any) || 'GENERAL',
            content: visitationData.content,
            needsFollowUp: Boolean(visitationData.followUpNeeded) ?? false,
            followUpDate: visitationData.followUpDate
          }
        })

        saved.push(visitation)
      } catch (error) {
        errors.push({
          row: rowIndex,
          message: `심방 데이터 저장 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
          value: visitationData
        })

        if (!options.skipErrors) {
          break
        }
      }
    }

    return { saved, errors }
  }

  /**
   * 지출결의서 데이터 처리
   */
  private async processExpenseReportsData(
    data: ExpenseReportImportData[],
    options: ImportOptions,
    batchOptions: BatchProcessingOptions
  ): Promise<ImportResult> {
    const savedData: any[] = []
    const errors: ImportError[] = []

    // 배치 처리
    const batches = this.createBatches(data, batchOptions.batchSize || 100)

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex]
      
      batchOptions.onProgress?.(
        Math.floor((batchIndex / batches.length) * 80) + 10,
        `${batchIndex + 1}/${batches.length} 배치 처리 중...`
      )

      const batchResults = await this.processExpenseReportsBatch(
        batch,
        options,
        batchIndex * (batchOptions.batchSize || 100)
      )

      savedData.push(...batchResults.saved)
      errors.push(...batchResults.errors)
    }

    return {
      success: savedData.length > 0,
      data: savedData,
      errors,
      summary: {
        total: data.length,
        successful: savedData.length,
        failed: data.length - savedData.length
      }
    }
  }

  /**
   * 지출결의서 배치 처리
   */
  private async processExpenseReportsBatch(
    batch: ExpenseReportImportData[],
    options: ImportOptions,
    batchOffset: number
  ): Promise<{ saved: any[]; errors: ImportError[] }> {
    const saved: any[] = []
    const errors: ImportError[] = []

    for (let i = 0; i < batch.length; i++) {
      const expenseData = batch[i]
      const rowIndex = batchOffset + i + 1

      try {
        // Enum 값 변환
        const processedData = this.convertExpenseReportEnums(expenseData)

        const expenseReport = await this.prisma.expenseReport.create({
          data: {
            churchId: this.churchId,
            requesterId: '', // 실제 요청자 ID는 별도 설정 필요
            title: processedData.title,
            description: processedData.description,
            amount: processedData.amount,
            category: processedData.category,
            status: processedData.status || 'PENDING',
            requestDate: processedData.requestDate || new Date(),
            approvedDate: processedData.approvedDate,
            rejectedDate: processedData.rejectedDate,
            rejectionReason: processedData.rejectionReason
          }
        })

        saved.push(expenseReport)
      } catch (error) {
        errors.push({
          row: rowIndex,
          message: `지출결의서 저장 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
          value: expenseData
        })

        if (!options.skipErrors) {
          break
        }
      }
    }

    return { saved, errors }
  }

  /**
   * 배치 생성
   */
  private createBatches<T>(data: T[], batchSize: number): T[][] {
    const batches: T[][] = []
    for (let i = 0; i < data.length; i += batchSize) {
      batches.push(data.slice(i, i + batchSize))
    }
    return batches
  }

  /**
   * 교인 Enum 값 변환
   */
  private convertMemberEnums(data: MemberImportData): any {
    return {
      ...data,
      gender: this.convertGender(data.gender),
      maritalStatus: this.convertMaritalStatus(data.maritalStatus),
      relationship: this.convertFamilyRelation(data.relationship),
      status: this.convertMemberStatus(data.status)
    }
  }

  /**
   * 헌금 Enum 값 변환
   */
  private convertOfferingEnums(data: OfferingImportData): any {
    return {
      ...data,
      offeringType: this.convertOfferingType(data.offeringType)
    }
  }

  /**
   * 출석 Enum 값 변환
   */
  private convertAttendanceEnums(data: AttendanceImportData): any {
    return {
      ...data,
      serviceType: this.convertServiceType(data.serviceType)
    }
  }

  /**
   * 지출결의서 Enum 값 변환
   */
  private convertExpenseReportEnums(data: ExpenseReportImportData): any {
    return {
      ...data,
      status: this.convertReportStatus(data.status)
    }
  }

  // Enum 변환 헬퍼 메서드들
  private convertGender(value: any): string | null {
    if (!value) return null
    const str = String(value).toLowerCase()
    if (['남', 'male', 'm'].includes(str)) return 'MALE'
    if (['여', 'female', 'f'].includes(str)) return 'FEMALE'
    return value
  }

  private convertMaritalStatus(value: any): string | null {
    if (!value) return null
    const str = String(value)
    const mapping: { [key: string]: string } = {
      '미혼': 'SINGLE',
      '기혼': 'MARRIED',
      '이혼': 'DIVORCED',
      '사별': 'WIDOWED'
    }
    return mapping[str] || value
  }

  private convertFamilyRelation(value: any): string | null {
    if (!value) return null
    const str = String(value)
    const mapping: { [key: string]: string } = {
      '가장': 'HEAD',
      '배우자': 'SPOUSE',
      '자녀': 'CHILD',
      '부모': 'PARENT',
      '기타': 'OTHER'
    }
    return mapping[str] || value
  }

  private convertMemberStatus(value: any): string | null {
    if (!value) return null
    const str = String(value)
    const mapping: { [key: string]: string } = {
      '활동': 'ACTIVE',
      '비활동': 'INACTIVE',
      '이전': 'TRANSFERRED'
    }
    return mapping[str] || value
  }

  private convertOfferingType(value: any): string {
    if (!value) return 'OTHER'
    const str = String(value)
    const mapping: { [key: string]: string } = {
      '십일조': 'TITHE',
      '감사': 'THANKSGIVING',
      '선교': 'MISSION',
      '건축': 'BUILDING',
      '기타': 'OTHER'
    }
    return mapping[str] || value
  }

  private convertServiceType(value: any): string {
    if (!value) return 'SUNDAY_MORNING'
    const str = String(value)
    const mapping: { [key: string]: string } = {
      '주일오전예배': 'SUNDAY_MORNING',
      '주일오후예배': 'SUNDAY_EVENING',
      '수요예배': 'WEDNESDAY',
      '금요기도회': 'FRIDAY_PRAYER',
      '새벽기도회': 'DAWN_PRAYER'
    }
    return mapping[str] || value
  }

  private convertReportStatus(value: any): string {
    if (!value) return 'PENDING'
    const str = String(value)
    const mapping: { [key: string]: string } = {
      '대기중': 'PENDING',
      '승인': 'APPROVED',
      '거부': 'REJECTED'
    }
    return mapping[str] || value
  }
}