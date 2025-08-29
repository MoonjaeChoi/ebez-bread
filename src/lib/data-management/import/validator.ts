import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import {
  DataType,
  ImportOptions,
  ImportResult,
  ImportError,
  ProgressCallback,
  ValidationContext,
  MemberImportData,
  OfferingImportData,
  AttendanceImportData,
  VisitationImportData,
  ExpenseReportImportData
} from '../types'
import { logger } from '@/lib/logger'

export class DataValidator {
  private prisma: PrismaClient
  private churchId: string

  constructor(prisma: PrismaClient, churchId: string) {
    this.prisma = prisma
    this.churchId = churchId
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
      progressCallback?.(10, '검증 컨텍스트 준비 중...')

      // 검증에 필요한 컨텍스트 데이터 조회
      const context = await this.getValidationContext(dataType)

      progressCallback?.(30, '스키마 검증 시작...')

      const validatedData: any[] = []
      const errors: ImportError[] = []

      // 데이터 타입별 검증 스키마 선택
      const schema = this.getValidationSchema(dataType)

      for (let i = 0; i < data.length; i++) {
        const row = data[i]
        const rowIndex = i + 1

        try {
          progressCallback?.(
            30 + Math.floor((i / data.length) * 60),
            `${i + 1}/${data.length} 행 검증 중...`
          )

          // 기본 스키마 검증
          const validatedRow = await schema.parseAsync(row)

          // 비즈니스 룰 검증
          const businessValidationResult = await this.validateBusinessRules(
            validatedRow,
            dataType,
            context,
            rowIndex
          )

          if (businessValidationResult.isValid) {
            validatedData.push(businessValidationResult.data)
          } else {
            errors.push(...businessValidationResult.errors)
          }
        } catch (error) {
          if (error instanceof z.ZodError) {
            // Zod 검증 오류
            for (const issue of error.issues) {
              errors.push({
                row: rowIndex,
                field: issue.path.join('.'),
                message: this.getKoreanErrorMessage(issue),
                value: 'received' in issue ? issue.received : undefined
              })
            }
          } else {
            // 기타 오류
            errors.push({
              row: rowIndex,
              message: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
              value: row
            })
          }

          // skipErrors 옵션이 false이면 처리 중단
          if (!options.skipErrors) {
            break
          }
        }
      }

      progressCallback?.(100, '검증 완료')

      const result: ImportResult = {
        success: validatedData.length > 0,
        data: validatedData,
        errors,
        summary: {
          total: data.length,
          successful: validatedData.length,
          failed: data.length - validatedData.length
        }
      }

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
   * 검증 컨텍스트 데이터 조회
   */
  private async getValidationContext(dataType: DataType): Promise<ValidationContext> {
    const context: ValidationContext = {}

    try {
      // 모든 데이터 타입에서 교인 정보 필요
      context.existingMembers = await this.prisma.member.findMany({
        where: { churchId: this.churchId },
        select: { id: true, name: true, email: true }
      })

      // 교인 데이터 검증 시 추가 정보 필요
      if (dataType === DataType.MEMBERS) {
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

        context.existingPositions = positions
        context.existingDepartments = departments
      }

      return context
    } catch (error) {
      logger.error('Failed to get validation context', error instanceof Error ? error : new Error(String(error)), {
        churchId: this.churchId,
        action: 'get_validation_context',
        metadata: {
          dataType
        }
      })
      throw error
    }
  }

  /**
   * 데이터 타입별 검증 스키마
   */
  private getValidationSchema(dataType: DataType): z.ZodSchema {
    switch (dataType) {
      case DataType.MEMBERS:
        return z.object({
          name: z.string()
            .min(1, '이름은 필수입니다')
            .max(50, '이름은 50자 이내여야 합니다')
            .regex(/^[가-힣a-zA-Z\s]+$/, '한글 또는 영문만 입력 가능합니다'),
          
          phone: z.string()
            .regex(/^01[0-9]-?[0-9]{4}-?[0-9]{4}$/, '올바른 휴대폰 번호를 입력해주세요')
            .optional()
            .nullable(),
          
          email: z.string()
            .email('올바른 이메일 형식이 아닙니다')
            .optional()
            .nullable(),
          
          birthDate: z.date()
            .max(new Date(), '미래 날짜는 입력할 수 없습니다')
            .optional()
            .nullable(),
          
          address: z.string().max(200, '주소는 200자 이내여야 합니다').optional().nullable(),
          
          gender: z.enum(['남', '여', 'MALE', 'FEMALE']).optional().nullable(),
          
          maritalStatus: z.enum(['미혼', '기혼', '이혼', '사별', 'SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED']).optional().nullable(),
          
          baptismDate: z.date().optional().nullable(),
          confirmationDate: z.date().optional().nullable(),
          
          positionName: z.string().max(50).optional().nullable(),
          departmentName: z.string().max(50).optional().nullable(),
          
          familyId: z.string().max(20).optional().nullable(),
          relationship: z.enum(['가장', '배우자', '자녀', '부모', '기타', 'HEAD', 'SPOUSE', 'CHILD', 'PARENT', 'OTHER']).optional().nullable(),
          
          status: z.enum(['활동', '비활동', '이전', 'ACTIVE', 'INACTIVE', 'TRANSFERRED']).optional().nullable(),
          notes: z.string().max(500, '비고는 500자 이내여야 합니다').optional().nullable()
        }).refine(data => data.email || data.phone, {
          message: '이메일 또는 전화번호 중 하나는 필수입니다',
          path: ['email']
        })

      case DataType.OFFERINGS:
        return z.object({
          memberName: z.string().min(1, '교인명은 필수입니다'),
          
          amount: z.number()
            .positive('금액은 0보다 커야 합니다')
            .max(100000000, '금액이 너무 큽니다'),
          
          offeringType: z.enum(['십일조', '감사', '선교', '건축', '기타', 'TITHE', 'THANKSGIVING', 'MISSION', 'BUILDING', 'OTHER']),
          
          description: z.string().max(200, '설명은 200자 이내여야 합니다').optional().nullable(),
          
          offeringDate: z.date().optional().nullable()
        })

      case DataType.ATTENDANCES:
        return z.object({
          memberName: z.string().min(1, '교인명은 필수입니다'),
          
          serviceType: z.enum(['주일오전예배', '주일오후예배', '수요예배', '금요기도회', '새벽기도회', 'SUNDAY_MORNING', 'SUNDAY_EVENING', 'WEDNESDAY', 'FRIDAY_PRAYER', 'DAWN_PRAYER']),
          
          attendanceDate: z.date().optional().nullable(),
          
          isPresent: z.boolean().default(true),
          
          notes: z.string().max(200, '비고는 200자 이내여야 합니다').optional().nullable()
        })

      case DataType.VISITATIONS:
        return z.object({
          memberName: z.string().min(1, '교인명은 필수입니다'),
          
          visitDate: z.date(),
          
          purpose: z.string().max(100, '목적은 100자 이내여야 합니다').optional().nullable(),
          
          content: z.string().max(1000, '내용은 1000자 이내여야 합니다').optional().nullable(),
          
          followUpNeeded: z.boolean().default(false),
          
          followUpDate: z.date().optional().nullable()
        })

      case DataType.EXPENSE_REPORTS:
        return z.object({
          title: z.string()
            .min(1, '제목은 필수입니다')
            .max(100, '제목은 100자 이내여야 합니다'),
          
          description: z.string().max(500, '설명은 500자 이내여야 합니다').optional().nullable(),
          
          amount: z.number()
            .positive('금액은 0보다 커야 합니다')
            .max(10000000, '1천만원을 초과할 수 없습니다'),
          
          category: z.string().min(1, '분류는 필수입니다').max(50, '분류는 50자 이내여야 합니다'),
          
          status: z.enum(['대기중', '승인', '거부', 'PENDING', 'APPROVED', 'REJECTED']).default('PENDING'),
          
          requestDate: z.date().optional().nullable(),
          approvedDate: z.date().optional().nullable(),
          rejectedDate: z.date().optional().nullable(),
          rejectionReason: z.string().max(200).optional().nullable()
        })

      default:
        return z.object({})
    }
  }

  /**
   * 비즈니스 룰 검증
   */
  private async validateBusinessRules(
    data: any,
    dataType: DataType,
    context: ValidationContext,
    rowIndex: number
  ): Promise<{ isValid: boolean; data?: any; errors: ImportError[] }> {
    const errors: ImportError[] = []
    let processedData = { ...data }

    try {
      switch (dataType) {
        case DataType.MEMBERS:
          processedData = await this.validateMemberBusinessRules(data, context, rowIndex, errors)
          break
        case DataType.OFFERINGS:
          processedData = await this.validateOfferingBusinessRules(data, context, rowIndex, errors)
          break
        case DataType.ATTENDANCES:
          processedData = await this.validateAttendanceBusinessRules(data, context, rowIndex, errors)
          break
        case DataType.VISITATIONS:
          processedData = await this.validateVisitationBusinessRules(data, context, rowIndex, errors)
          break
        case DataType.EXPENSE_REPORTS:
          processedData = await this.validateExpenseReportBusinessRules(data, context, rowIndex, errors)
          break
      }

      return {
        isValid: errors.length === 0,
        data: processedData,
        errors
      }
    } catch (error) {
      errors.push({
        row: rowIndex,
        message: error instanceof Error ? error.message : '비즈니스 룰 검증 중 오류가 발생했습니다'
      })
      
      return { isValid: false, errors }
    }
  }

  /**
   * 교인 비즈니스 룰 검증
   */
  private async validateMemberBusinessRules(
    data: MemberImportData,
    context: ValidationContext,
    rowIndex: number,
    errors: ImportError[]
  ): Promise<any> {
    // 이메일 중복 검사
    if (data.email && context.existingMembers) {
      const existingMember = context.existingMembers.find(m => 
        m.email?.toLowerCase() === data.email?.toLowerCase()
      )
      if (existingMember) {
        errors.push({
          row: rowIndex,
          field: 'email',
          message: `이미 등록된 이메일입니다: ${existingMember.name}`,
          value: data.email
        })
      }
    }

    // 직분 검증
    if (data.positionName && context.existingPositions) {
      const position = context.existingPositions.find(p => p.name === data.positionName)
      if (!position) {
        errors.push({
          row: rowIndex,
          field: 'positionName',
          message: `등록되지 않은 직분입니다: ${data.positionName}`,
          value: data.positionName
        })
      }
    }

    // 부서 검증
    if (data.departmentName && context.existingDepartments) {
      const department = context.existingDepartments.find(d => d.name === data.departmentName)
      if (!department) {
        errors.push({
          row: rowIndex,
          field: 'departmentName',
          message: `등록되지 않은 부서입니다: ${data.departmentName}`,
          value: data.departmentName
        })
      }
    }

    // 세례일/입교일 순서 검증
    if (data.baptismDate && data.confirmationDate) {
      if (data.baptismDate > data.confirmationDate) {
        errors.push({
          row: rowIndex,
          field: 'confirmationDate',
          message: '입교일은 세례일 이후여야 합니다',
          value: data.confirmationDate
        })
      }
    }

    // 생년월일 검증
    if (data.birthDate) {
      const birthDate = new Date(data.birthDate)
      const age = new Date().getFullYear() - birthDate.getFullYear()
      if (age < 0 || age > 120) {
        errors.push({
          row: rowIndex,
          field: 'birthDate',
          message: '생년월일이 올바르지 않습니다',
          value: data.birthDate
        })
      }
    }

    return data
  }

  /**
   * 헌금 비즈니스 룰 검증
   */
  private async validateOfferingBusinessRules(
    data: OfferingImportData,
    context: ValidationContext,
    rowIndex: number,
    errors: ImportError[]
  ): Promise<any> {
    // 교인 존재 검증
    if (context.existingMembers) {
      const member = context.existingMembers.find(m => m.name === data.memberName)
      if (!member) {
        errors.push({
          row: rowIndex,
          field: 'memberName',
          message: `등록되지 않은 교인입니다: ${data.memberName}`,
          value: data.memberName
        })
      } else {
        // 교인 ID 설정
        (data as any).memberId = member.id
      }
    }

    // 헌금일 검증
    if (data.offeringDate && data.offeringDate > new Date()) {
      errors.push({
        row: rowIndex,
        field: 'offeringDate',
        message: '헌금일은 미래 날짜일 수 없습니다',
        value: data.offeringDate
      })
    }

    return data
  }

  /**
   * 출석 비즈니스 룰 검증
   */
  private async validateAttendanceBusinessRules(
    data: AttendanceImportData,
    context: ValidationContext,
    rowIndex: number,
    errors: ImportError[]
  ): Promise<any> {
    // 교인 존재 검증
    if (context.existingMembers) {
      const member = context.existingMembers.find(m => m.name === data.memberName)
      if (!member) {
        errors.push({
          row: rowIndex,
          field: 'memberName',
          message: `등록되지 않은 교인입니다: ${data.memberName}`,
          value: data.memberName
        })
      } else {
        // 교인 ID 설정
        (data as any).memberId = member.id
      }
    }

    // 출석일 검증
    if (data.attendanceDate && data.attendanceDate > new Date()) {
      errors.push({
        row: rowIndex,
        field: 'attendanceDate',
        message: '출석일은 미래 날짜일 수 없습니다',
        value: data.attendanceDate
      })
    }

    return data
  }

  /**
   * 심방 비즈니스 룰 검증
   */
  private async validateVisitationBusinessRules(
    data: VisitationImportData,
    context: ValidationContext,
    rowIndex: number,
    errors: ImportError[]
  ): Promise<any> {
    // 교인 존재 검증
    if (context.existingMembers) {
      const member = context.existingMembers.find(m => m.name === data.memberName)
      if (!member) {
        errors.push({
          row: rowIndex,
          field: 'memberName',
          message: `등록되지 않은 교인입니다: ${data.memberName}`,
          value: data.memberName
        })
      } else {
        // 교인 ID 설정
        (data as any).memberId = member.id
      }
    }

    // 심방일 검증
    if (data.visitDate > new Date()) {
      errors.push({
        row: rowIndex,
        field: 'visitDate',
        message: '심방일은 미래 날짜일 수 없습니다',
        value: data.visitDate
      })
    }

    // 후속관리일 검증
    if (data.followUpDate && data.followUpDate <= data.visitDate) {
      errors.push({
        row: rowIndex,
        field: 'followUpDate',
        message: '후속관리일은 심방일 이후여야 합니다',
        value: data.followUpDate
      })
    }

    return data
  }

  /**
   * 지출결의서 비즈니스 룰 검증
   */
  private async validateExpenseReportBusinessRules(
    data: ExpenseReportImportData,
    context: ValidationContext,
    rowIndex: number,
    errors: ImportError[]
  ): Promise<any> {
    // 신청일 검증
    if (data.requestDate && data.requestDate > new Date()) {
      errors.push({
        row: rowIndex,
        field: 'requestDate',
        message: '신청일은 미래 날짜일 수 없습니다',
        value: data.requestDate
      })
    }

    // 승인일/거부일 검증
    if (data.approvedDate && data.requestDate && data.approvedDate < data.requestDate) {
      errors.push({
        row: rowIndex,
        field: 'approvedDate',
        message: '승인일은 신청일 이후여야 합니다',
        value: data.approvedDate
      })
    }

    if (data.rejectedDate && data.requestDate && data.rejectedDate < data.requestDate) {
      errors.push({
        row: rowIndex,
        field: 'rejectedDate',
        message: '거부일은 신청일 이후여야 합니다',
        value: data.rejectedDate
      })
    }

    return data
  }

  /**
   * Zod 오류 메시지 한국어 변환
   */
  private getKoreanErrorMessage(issue: z.ZodIssue): string {
    switch (issue.code) {
      case 'invalid_type':
        return `${issue.path.join('.')} 필드의 형식이 올바르지 않습니다`
      case 'too_small':
        if (issue.type === 'string') {
          return `${issue.path.join('.')} 필드는 최소 ${issue.minimum}자 이상이어야 합니다`
        }
        return `${issue.path.join('.')} 필드가 너무 작습니다`
      case 'too_big':
        if (issue.type === 'string') {
          return `${issue.path.join('.')} 필드는 최대 ${issue.maximum}자 이하여야 합니다`
        }
        return `${issue.path.join('.')} 필드가 너무 큽니다`
      case 'invalid_string':
        if (issue.validation === 'email') {
          return `${issue.path.join('.')} 필드는 올바른 이메일 형식이어야 합니다`
        }
        if (issue.validation === 'regex') {
          return `${issue.path.join('.')} 필드의 형식이 올바르지 않습니다`
        }
        return `${issue.path.join('.')} 필드의 문자열 형식이 올바르지 않습니다`
      case 'invalid_enum_value':
        return `${issue.path.join('.')} 필드는 다음 값 중 하나여야 합니다: ${issue.options.join(', ')}`
      default:
        return issue.message || `${issue.path.join('.')} 필드에 오류가 있습니다`
    }
  }
}