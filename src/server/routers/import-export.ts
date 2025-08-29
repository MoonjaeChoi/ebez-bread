import { z } from 'zod'
import { router, protectedProcedure, managerProcedure } from '@/lib/trpc/server'
import { TRPCError } from '@trpc/server'
import { 
  DataType, 
  FileFormat,
  ImportOptions,
  ExportOptions,
  BackupOptions,
  MemberImportData,
  OfferingImportData,
  AttendanceImportData,
  VisitationImportData,
  ExpenseReportImportData
} from '@/lib/data-import-export/types'
import { 
  processImportData,
  readExcelFile,
  mapColumns,
  exportToExcel
} from '@/lib/data-import-export/excel-processor'
import { BackupManager } from '@/lib/data-import-export/backup-manager'

// Input schemas
const importOptionsSchema = z.object({
  dataType: z.nativeEnum(DataType),
  skipErrors: z.boolean().default(true),
  updateExisting: z.boolean().default(false),
  validateOnly: z.boolean().default(false)
})

const exportOptionsSchema = z.object({
  dataType: z.nativeEnum(DataType),
  format: z.nativeEnum(FileFormat).default(FileFormat.EXCEL),
  dateRange: z.object({
    start: z.string().transform(str => new Date(str)),
    end: z.string().transform(str => new Date(str))
  }).optional(),
  filters: z.record(z.any()).optional(),
  includeInactive: z.boolean().default(false),
  filename: z.string().optional()
})

const backupOptionsSchema = z.object({
  includeMembers: z.boolean().default(true),
  includeOfferings: z.boolean().default(true),
  includeAttendances: z.boolean().default(true),
  includeVisitations: z.boolean().default(true),
  includeExpenseReports: z.boolean().default(true),
  dateRange: z.object({
    start: z.string().transform(str => new Date(str)),
    end: z.string().transform(str => new Date(str))
  }).optional(),
  filename: z.string().optional()
})

const validateDataSchema = z.object({
  data: z.array(z.record(z.any())),
  dataType: z.nativeEnum(DataType),
  options: importOptionsSchema.optional()
})

export const importExportRouter = router({
  // 데이터 유효성 검증 (실제 저장하지 않고 검증만)
  validateData: managerProcedure
    .input(validateDataSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const { data, dataType, options = {} } = input
        const churchId = ctx.session.user.churchId

        // 컨텍스트 데이터 준비
        const [existingMembers, existingPositions, existingDepartments] = await Promise.all([
          ctx.prisma.member.findMany({
            where: { churchId },
            select: { id: true, name: true }
          }),
          ctx.prisma.position.findMany({
            where: { churchId, isActive: true },
            select: { id: true, name: true }
          }),
          ctx.prisma.department.findMany({
            where: { churchId, isActive: true },
            select: { id: true, name: true }
          })
        ])

        // 컬럼 매핑 적용
        const mappedData = mapColumns(data, dataType)

        // 데이터 검증
        const result = await processImportData(
          mappedData,
          dataType,
          { ...options, validateOnly: true },
          {
            existingMembers,
            existingPositions,
            existingDepartments
          }
        )

        return result
      } catch (error) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error instanceof Error ? error.message : '데이터 검증 중 오류가 발생했습니다'
        })
      }
    }),

  // 교인 데이터 가져오기
  importMembers: managerProcedure
    .input(z.object({
      data: z.array(z.record(z.any())),
      options: importOptionsSchema.optional()
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const { data, options = {} } = input
        const churchId = ctx.session.user.churchId

        // 컨텍스트 데이터 준비
        const [existingPositions, existingDepartments] = await Promise.all([
          ctx.prisma.position.findMany({
            where: { churchId, isActive: true },
            select: { id: true, name: true }
          }),
          ctx.prisma.department.findMany({
            where: { churchId, isActive: true },
            select: { id: true, name: true }
          })
        ])

        // 컬럼 매핑 및 검증
        const mappedData = mapColumns(data, DataType.MEMBERS)
        const validationResult = await processImportData<MemberImportData>(
          mappedData,
          DataType.MEMBERS,
          options,
          { existingPositions, existingDepartments }
        )

        if (!validationResult.success || !validationResult.data) {
          return validationResult
        }

        // 실제 데이터베이스에 저장
        const savedMembers = []
        const errors = [...validationResult.errors]

        for (const memberData of validationResult.data) {
          try {
            // 직분/부서 ID 찾기
            const positionId = memberData.positionName 
              ? existingPositions.find(p => p.name === memberData.positionName)?.id
              : undefined
            const departmentId = memberData.departmentName
              ? existingDepartments.find(d => d.name === memberData.departmentName)?.id
              : undefined

            // 기존 교인 업데이트 또는 새로 생성
            let member
            if (options.updateExisting) {
              // 이름과 전화번호로 기존 교인 찾기
              const existingMember = await ctx.prisma.member.findFirst({
                where: {
                  churchId,
                  OR: [
                    { name: memberData.name },
                    ...(memberData.email ? [{ email: memberData.email }] : [])
                  ]
                }
              })

              if (existingMember) {
                member = await ctx.prisma.member.update({
                  where: { id: existingMember.id },
                  data: {
                    name: memberData.name,
                    phone: memberData.phone,
                    email: memberData.email,
                    birthDate: memberData.birthDate,
                    address: memberData.address,
                    gender: memberData.gender,
                    maritalStatus: memberData.maritalStatus,
                    baptismDate: memberData.baptismDate,
                    confirmationDate: memberData.confirmationDate,
                    positionId,
                    departmentId,
                    familyId: memberData.familyId,
                    relationship: memberData.relationship,
                    notes: memberData.notes,
                    status: memberData.status
                  }
                })
              } else {
                member = await ctx.prisma.member.create({
                  data: {
                    churchId,
                    name: memberData.name,
                    phone: memberData.phone,
                    email: memberData.email,
                    birthDate: memberData.birthDate,
                    address: memberData.address,
                    gender: memberData.gender,
                    maritalStatus: memberData.maritalStatus,
                    baptismDate: memberData.baptismDate,
                    confirmationDate: memberData.confirmationDate,
                    positionId,
                    departmentId,
                    familyId: memberData.familyId,
                    relationship: memberData.relationship,
                    notes: memberData.notes,
                    status: memberData.status
                  }
                })
              }
            } else {
              member = await ctx.prisma.member.create({
                data: {
                  churchId,
                  name: memberData.name,
                  phone: memberData.phone,
                  email: memberData.email,
                  birthDate: memberData.birthDate,
                  address: memberData.address,
                  gender: memberData.gender,
                  maritalStatus: memberData.maritalStatus,
                  baptismDate: memberData.baptismDate,
                  confirmationDate: memberData.confirmationDate,
                  positionId,
                  departmentId,
                  familyId: memberData.familyId,
                  relationship: memberData.relationship,
                  notes: memberData.notes,
                  status: memberData.status
                }
              })
            }

            savedMembers.push(member)
          } catch (error) {
            errors.push({
              row: 0,
              message: `교인 ${memberData.name} 저장 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
            })
          }
        }

        return {
          success: savedMembers.length > 0,
          data: savedMembers,
          errors,
          summary: {
            total: validationResult.summary.total,
            successful: savedMembers.length,
            failed: validationResult.summary.total - savedMembers.length
          }
        }
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : '교인 데이터 가져오기 중 오류가 발생했습니다'
        })
      }
    }),

  // 헌금 데이터 가져오기
  importOfferings: managerProcedure
    .input(z.object({
      data: z.array(z.record(z.any())),
      options: importOptionsSchema.optional()
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const { data, options = {} } = input
        const churchId = ctx.session.user.churchId

        // 기존 교인 목록 조회
        const existingMembers = await ctx.prisma.member.findMany({
          where: { churchId },
          select: { id: true, name: true }
        })

        // 컬럼 매핑 및 검증
        const mappedData = mapColumns(data, DataType.OFFERINGS)
        const validationResult = await processImportData<OfferingImportData>(
          mappedData,
          DataType.OFFERINGS,
          options,
          { existingMembers }
        )

        if (!validationResult.success || !validationResult.data) {
          return validationResult
        }

        // 실제 데이터베이스에 저장
        const savedOfferings = []
        const errors = [...validationResult.errors]

        for (const offeringData of validationResult.data) {
          try {
            const member = existingMembers.find(m => m.name === offeringData.memberName)
            if (!member) {
              errors.push({
                row: 0,
                message: `교인 ${offeringData.memberName}을 찾을 수 없습니다`
              })
              continue
            }

            const offering = await ctx.prisma.offering.create({
              data: {
                churchId,
                memberId: member.id,
                amount: offeringData.amount,
                offeringType: offeringData.offeringType,
                description: offeringData.description,
                offeringDate: offeringData.offeringDate || new Date()
              }
            })

            savedOfferings.push(offering)
          } catch (error) {
            errors.push({
              row: 0,
              message: `헌금 데이터 저장 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
            })
          }
        }

        return {
          success: savedOfferings.length > 0,
          data: savedOfferings,
          errors,
          summary: {
            total: validationResult.summary.total,
            successful: savedOfferings.length,
            failed: validationResult.summary.total - savedOfferings.length
          }
        }
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : '헌금 데이터 가져오기 중 오류가 발생했습니다'
        })
      }
    }),

  // 출석 데이터 가져오기
  importAttendances: managerProcedure
    .input(z.object({
      data: z.array(z.record(z.any())),
      options: importOptionsSchema.optional()
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const { data, options = {} } = input
        const churchId = ctx.session.user.churchId

        // 기존 교인 목록 조회
        const existingMembers = await ctx.prisma.member.findMany({
          where: { churchId },
          select: { id: true, name: true }
        })

        // 컬럼 매핑 및 검증
        const mappedData = mapColumns(data, DataType.ATTENDANCES)
        const validationResult = await processImportData<AttendanceImportData>(
          mappedData,
          DataType.ATTENDANCES,
          options,
          { existingMembers }
        )

        if (!validationResult.success || !validationResult.data) {
          return validationResult
        }

        // 실제 데이터베이스에 저장
        const savedAttendances = []
        const errors = [...validationResult.errors]

        for (const attendanceData of validationResult.data) {
          try {
            const member = existingMembers.find(m => m.name === attendanceData.memberName)
            if (!member) {
              errors.push({
                row: 0,
                message: `교인 ${attendanceData.memberName}을 찾을 수 없습니다`
              })
              continue
            }

            // 중복 체크 (같은 교인, 같은 날짜, 같은 예배)
            const targetDate = new Date(attendanceData.attendanceDate || new Date())
            const startOfDay = new Date(targetDate)
            startOfDay.setHours(0, 0, 0, 0)
            const endOfDay = new Date(targetDate)
            endOfDay.setHours(23, 59, 59, 999)
            
            const existingAttendance = await ctx.prisma.attendance.findFirst({
              where: {
                churchId,
                memberId: member.id,
                serviceType: attendanceData.serviceType,
                attendanceDate: {
                  gte: startOfDay,
                  lte: endOfDay
                }
              }
            })

            let attendance
            if (existingAttendance && options.updateExisting) {
              attendance = await ctx.prisma.attendance.update({
                where: { id: existingAttendance.id },
                data: {
                  isPresent: attendanceData.isPresent !== undefined ? attendanceData.isPresent : true,
                  notes: attendanceData.notes
                }
              })
            } else if (!existingAttendance) {
              attendance = await ctx.prisma.attendance.create({
                data: {
                  churchId,
                  memberId: member.id,
                  serviceType: attendanceData.serviceType,
                  attendanceDate: attendanceData.attendanceDate || new Date(),
                  isPresent: attendanceData.isPresent !== undefined ? attendanceData.isPresent : true,
                  notes: attendanceData.notes
                }
              })
            }

            if (attendance) {
              savedAttendances.push(attendance)
            }
          } catch (error) {
            errors.push({
              row: 0,
              message: `출석 데이터 저장 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
            })
          }
        }

        return {
          success: savedAttendances.length > 0,
          data: savedAttendances,
          errors,
          summary: {
            total: validationResult.summary.total,
            successful: savedAttendances.length,
            failed: validationResult.summary.total - savedAttendances.length
          }
        }
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : '출석 데이터 가져오기 중 오류가 발생했습니다'
        })
      }
    }),

  // 데이터 내보내기 (서버에서 데이터만 반환, 클라이언트에서 파일 생성)
  exportData: protectedProcedure
    .input(exportOptionsSchema)
    .query(async ({ ctx, input }) => {
      try {
        const churchId = ctx.session.user.churchId
        const backupManager = new BackupManager(ctx.prisma, churchId)

        const result = await backupManager.exportDataByType(input.dataType, input)
        
        if (!result.success) {
          throw new Error(result.error)
        }

        // ArrayBuffer를 Base64로 변환하여 전송
        const base64Data = Buffer.from(result.data as ArrayBuffer).toString('base64')

        return {
          success: true,
          filename: result.filename,
          data: base64Data,
          recordCount: result.recordCounts[input.dataType] || 0
        }
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : '데이터 내보내기 중 오류가 발생했습니다'
        })
      }
    }),

  // 전체 백업 생성
  createBackup: managerProcedure
    .input(backupOptionsSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const churchId = ctx.session.user.churchId
        const backupManager = new BackupManager(ctx.prisma, churchId)

        const result = await backupManager.createFullBackup(input)
        
        if (!result.success) {
          throw new Error(result.error)
        }

        // ArrayBuffer를 Base64로 변환하여 전송
        const base64Data = Buffer.from(result.data as ArrayBuffer).toString('base64')

        return {
          success: true,
          filename: result.filename,
          data: base64Data,
          includedTables: result.includedTables,
          recordCounts: result.recordCounts
        }
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : '백업 생성 중 오류가 발생했습니다'
        })
      }
    }),

  // 템플릿 다운로드
  downloadTemplate: protectedProcedure
    .input(z.object({ dataType: z.nativeEnum(DataType) }))
    .query(async ({ input }) => {
      try {
        const templateData = getTemplateData(input.dataType)
        
        const result = await exportToExcel(
          templateData,
          {
            dataType: input.dataType,
            format: FileFormat.EXCEL,
            filename: `${getTemplateName(input.dataType)}_템플릿.xlsx`
          }
        )

        if (!result.success) {
          throw new Error(result.error)
        }

        // ArrayBuffer를 Base64로 변환하여 전송
        const base64Data = Buffer.from(result.data as ArrayBuffer).toString('base64')

        return {
          success: true,
          filename: result.filename,
          data: base64Data
        }
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : '템플릿 생성 중 오류가 발생했습니다'
        })
      }
    })
})

// 템플릿 데이터 생성
function getTemplateData(dataType: DataType): any[] {
  switch (dataType) {
    case DataType.MEMBERS:
      return [{
        이름: '홍길동',
        전화번호: '010-1234-5678',
        이메일: 'hong@example.com',
        생년월일: '1990-01-01',
        주소: '서울시 강남구',
        성별: '남',
        결혼상태: '기혼',
        세례일: '2020-01-01',
        입교일: '2020-06-01',
        직분: '집사',
        부서: '남선교회',
        가족ID: 'FAM001',
        가족관계: '가장',
        상태: '활동',
        비고: '특이사항 없음'
      }]
    case DataType.OFFERINGS:
      return [{
        교인명: '홍길동',
        금액: '100000',
        헌금종류: '십일조',
        설명: '2024년 1월 십일조',
        헌금일: '2024-01-07'
      }]
    case DataType.ATTENDANCES:
      return [{
        교인명: '홍길동',
        예배종류: '주일오전예배',
        출석일: '2024-01-07',
        출석여부: '예',
        비고: ''
      }]
    case DataType.VISITATIONS:
      return [{
        교인명: '홍길동',
        심방일: '2024-01-15',
        목적: '안부 확인',
        내용: '건강하게 지내고 계심',
        후속관리: '아니오',
        후속관리일: ''
      }]
    case DataType.EXPENSE_REPORTS:
      return [{
        제목: '교회 전기요금',
        설명: '2024년 1월 전기요금 납부',
        금액: '150000',
        분류: '공과금',
        상태: '대기중',
        신청일: '2024-01-15',
        승인일: '',
        거부일: '',
        거부사유: ''
      }]
    default:
      return []
  }
}

// 템플릿명 생성
function getTemplateName(dataType: DataType): string {
  switch (dataType) {
    case DataType.MEMBERS: return '교인명부'
    case DataType.OFFERINGS: return '헌금내역'
    case DataType.ATTENDANCES: return '출석현황'
    case DataType.VISITATIONS: return '심방기록'
    case DataType.EXPENSE_REPORTS: return '지출결의서'
    default: return '데이터'
  }
}