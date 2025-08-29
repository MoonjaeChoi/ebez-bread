import { z } from 'zod'
import { 
  Gender, 
  MaritalStatus, 
  MemberStatus, 
  FamilyRelation,
  OfferingType,
  ServiceType,
  ReportStatus,
  OrganizationLevel
} from '@prisma/client'
import { 
  MemberImportData, 
  OfferingImportData, 
  AttendanceImportData, 
  VisitationImportData, 
  ExpenseReportImportData,
  OrganizationImportData,
  ImportError
} from './types'

// 유틸리티 함수들
function parseDate(dateString: string | Date): Date | undefined {
  if (!dateString) return undefined
  if (dateString instanceof Date) return dateString
  
  // 다양한 날짜 형식 지원
  const formats = [
    /^\d{4}-\d{2}-\d{2}$/,  // YYYY-MM-DD
    /^\d{4}\/\d{2}\/\d{2}$/,  // YYYY/MM/DD
    /^\d{2}\/\d{2}\/\d{4}$/,  // MM/DD/YYYY
    /^\d{2}-\d{2}-\d{4}$/,  // MM-DD-YYYY
  ]
  
  const dateStr = dateString.toString().trim()
  const date = new Date(dateStr)
  
  if (!isNaN(date.getTime())) {
    return date
  }
  
  return undefined
}

function parseBoolean(value: boolean | string): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const normalized = value.toLowerCase().trim()
    return normalized === 'true' || normalized === '예' || normalized === 'y' || normalized === '1'
  }
  return false
}

function parseNumber(value: number | string): number | undefined {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    // 쉼표 제거 및 숫자 추출
    const cleaned = value.replace(/[,\s]/g, '')
    const num = parseFloat(cleaned)
    return isNaN(num) ? undefined : num
  }
  return undefined
}

function parseEnum<T extends Record<string, string>>(
  value: string, 
  enumObject: T,
  mapping?: Record<string, keyof T>
): T[keyof T] | undefined {
  if (!value) return undefined
  
  const normalized = value.toString().trim()
  
  // 직접 매핑이 있는 경우
  if (mapping && mapping[normalized]) {
    return enumObject[mapping[normalized]]
  }
  
  // Enum 값 직접 매치
  if (Object.values(enumObject).includes(normalized as T[keyof T])) {
    return normalized as T[keyof T]
  }
  
  // 대소문자 무시하고 매치
  const found = Object.entries(enumObject).find(([key, val]) => 
    val.toLowerCase() === normalized.toLowerCase() ||
    key.toLowerCase() === normalized.toLowerCase()
  )
  
  return found ? found[1] as T[keyof T] : undefined
}

// 교인 데이터 검증
export function validateMemberData(
  data: any, 
  row: number,
  existingPositions: { name: string; id: string }[],
  existingDepartments: { name: string; id: string }[]
): { member: MemberImportData | null; errors: ImportError[] } {
  const errors: ImportError[] = []
  
  // 필수 필드 검증
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    errors.push({
      row,
      field: 'name',
      message: '이름은 필수 입력 항목입니다',
      value: data.name
    })
  }
  
  // 이메일 형식 검증
  if (data.email && data.email.trim() && !z.string().email().safeParse(data.email.trim()).success) {
    errors.push({
      row,
      field: 'email',
      message: '올바른 이메일 형식이 아닙니다',
      value: data.email
    })
  }
  
  // 생년월일 검증
  let birthDate: Date | undefined
  if (data.birthDate) {
    birthDate = parseDate(data.birthDate)
    if (!birthDate) {
      errors.push({
        row,
        field: 'birthDate',
        message: '올바른 날짜 형식이 아닙니다 (YYYY-MM-DD)',
        value: data.birthDate
      })
    } else if (birthDate > new Date()) {
      errors.push({
        row,
        field: 'birthDate',
        message: '생년월일은 현재 날짜보다 이후일 수 없습니다',
        value: data.birthDate
      })
    }
  }
  
  // 성별 검증
  const genderMapping: Record<string, keyof typeof Gender> = {
    '남': 'MALE',
    '남자': 'MALE',
    '여': 'FEMALE',
    '여자': 'FEMALE'
  }
  const gender = data.gender ? parseEnum(data.gender, Gender, genderMapping) : undefined
  if (data.gender && !gender) {
    errors.push({
      row,
      field: 'gender',
      message: '올바른 성별 형식이 아닙니다 (남/여, MALE/FEMALE)',
      value: data.gender
    })
  }
  
  // 결혼 상태 검증
  const maritalStatusMapping: Record<string, keyof typeof MaritalStatus> = {
    '미혼': 'SINGLE',
    '기혼': 'MARRIED',
    '이혼': 'DIVORCED',
    '사별': 'WIDOWED'
  }
  const maritalStatus = data.maritalStatus ? parseEnum(data.maritalStatus, MaritalStatus, maritalStatusMapping) : undefined
  if (data.maritalStatus && !maritalStatus) {
    errors.push({
      row,
      field: 'maritalStatus',
      message: '올바른 결혼 상태가 아닙니다 (미혼/기혼/이혼/사별)',
      value: data.maritalStatus
    })
  }
  
  // 직분 검증 (존재하는 직분인지 확인)
  let positionId: string | undefined
  if (data.positionName) {
    const position = existingPositions.find(p => p.name === data.positionName.trim())
    if (!position) {
      errors.push({
        row,
        field: 'positionName',
        message: '존재하지 않는 직분입니다',
        value: data.positionName
      })
    } else {
      positionId = position.id
    }
  }
  
  // 부서 검증 (존재하는 부서인지 확인)
  let departmentId: string | undefined
  if (data.departmentName) {
    const department = existingDepartments.find(d => d.name === data.departmentName.trim())
    if (!department) {
      errors.push({
        row,
        field: 'departmentName',
        message: '존재하지 않는 부서입니다',
        value: data.departmentName
      })
    } else {
      departmentId = department.id
    }
  }
  
  // 가족 관계 검증
  const relationshipMapping: Record<string, keyof typeof FamilyRelation> = {
    '가장': 'HEAD',
    '배우자': 'SPOUSE',
    '자녀': 'CHILD',
    '부모': 'PARENT',
    '형제자매': 'SIBLING',
    '기타': 'OTHER'
  }
  const relationship = data.relationship ? parseEnum(data.relationship, FamilyRelation, relationshipMapping) : undefined
  if (data.relationship && !relationship) {
    errors.push({
      row,
      field: 'relationship',
      message: '올바른 가족 관계가 아닙니다 (가장/배우자/자녀/부모/형제자매/기타)',
      value: data.relationship
    })
  }
  
  // 상태 검증
  const statusMapping: Record<string, keyof typeof MemberStatus> = {
    '활동': 'ACTIVE',
    '비활동': 'INACTIVE',
    '전출': 'TRANSFERRED',
    '소천': 'DECEASED'
  }
  const status = data.status ? parseEnum(data.status, MemberStatus, statusMapping) : 'ACTIVE'
  if (data.status && !status) {
    errors.push({
      row,
      field: 'status',
      message: '올바른 상태가 아닙니다 (활동/비활동/전출/소천)',
      value: data.status
    })
  }
  
  if (errors.length > 0) {
    return { member: null, errors }
  }
  
  const member: MemberImportData = {
    name: data.name.trim(),
    phone: data.phone?.trim() || undefined,
    email: data.email?.trim() || undefined,
    birthDate,
    address: data.address?.trim() || undefined,
    gender,
    maritalStatus,
    baptismDate: data.baptismDate ? parseDate(data.baptismDate) : undefined,
    confirmationDate: data.confirmationDate ? parseDate(data.confirmationDate) : undefined,
    positionName: data.positionName?.trim() || undefined,
    departmentName: data.departmentName?.trim() || undefined,
    familyId: data.familyId?.trim() || undefined,
    relationship,
    notes: data.notes?.trim() || undefined,
    status: status as MemberStatus
  }
  
  return { member, errors }
}

// 헌금 데이터 검증
export function validateOfferingData(
  data: any, 
  row: number,
  existingMembers: { name: string; id: string }[]
): { offering: OfferingImportData | null; errors: ImportError[] } {
  const errors: ImportError[] = []
  
  // 교인명 검증 (필수)
  if (!data.memberName || typeof data.memberName !== 'string' || data.memberName.trim().length === 0) {
    errors.push({
      row,
      field: 'memberName',
      message: '교인명은 필수 입력 항목입니다',
      value: data.memberName
    })
  } else {
    const member = existingMembers.find(m => m.name === data.memberName.trim())
    if (!member) {
      errors.push({
        row,
        field: 'memberName',
        message: '존재하지 않는 교인입니다',
        value: data.memberName
      })
    }
  }
  
  // 금액 검증 (필수)
  const amount = parseNumber(data.amount)
  if (amount === undefined || amount <= 0) {
    errors.push({
      row,
      field: 'amount',
      message: '유효한 금액을 입력해주세요',
      value: data.amount
    })
  }
  
  // 헌금 종류 검증
  const offeringTypeMapping: Record<string, keyof typeof OfferingType> = {
    '십일조': 'TITHE',
    '감사헌금': 'THANKSGIVING',
    '주일헌금': 'SUNDAY_OFFERING',
    '특별헌금': 'SPECIAL',
    '선교헌금': 'MISSION',
    '건축헌금': 'BUILDING',
    '기타': 'OTHER'
  }
  const offeringType = parseEnum(data.offeringType, OfferingType, offeringTypeMapping)
  if (!offeringType) {
    errors.push({
      row,
      field: 'offeringType',
      message: '올바른 헌금 종류가 아닙니다 (십일조/감사헌금/주일헌금/특별헌금/선교헌금/건축헌금/기타)',
      value: data.offeringType
    })
  }
  
  // 헌금일 검증
  let offeringDate: Date | undefined
  if (data.offeringDate) {
    offeringDate = parseDate(data.offeringDate)
    if (!offeringDate) {
      errors.push({
        row,
        field: 'offeringDate',
        message: '올바른 날짜 형식이 아닙니다 (YYYY-MM-DD)',
        value: data.offeringDate
      })
    }
  }
  
  if (errors.length > 0) {
    return { offering: null, errors }
  }
  
  const offering: OfferingImportData = {
    memberName: data.memberName.trim(),
    amount: amount!,
    offeringType: offeringType!,
    description: data.description?.trim() || undefined,
    offeringDate
  }
  
  return { offering, errors }
}

// 출석 데이터 검증
export function validateAttendanceData(
  data: any, 
  row: number,
  existingMembers: { name: string; id: string }[]
): { attendance: AttendanceImportData | null; errors: ImportError[] } {
  const errors: ImportError[] = []
  
  // 교인명 검증 (필수)
  if (!data.memberName || typeof data.memberName !== 'string' || data.memberName.trim().length === 0) {
    errors.push({
      row,
      field: 'memberName',
      message: '교인명은 필수 입력 항목입니다',
      value: data.memberName
    })
  } else {
    const member = existingMembers.find(m => m.name === data.memberName.trim())
    if (!member) {
      errors.push({
        row,
        field: 'memberName',
        message: '존재하지 않는 교인입니다',
        value: data.memberName
      })
    }
  }
  
  // 예배 종류 검증 (필수)
  const serviceTypeMapping: Record<string, keyof typeof ServiceType> = {
    '주일오전예배': 'SUNDAY_MORNING',
    '주일오후예배': 'SUNDAY_EVENING',
    '수요예배': 'WEDNESDAY',
    '새벽기도회': 'DAWN',
    '금요기도회': 'FRIDAY',
    '토요예배': 'SATURDAY',
    '특별예배': 'SPECIAL'
  }
  const serviceType = parseEnum(data.serviceType, ServiceType, serviceTypeMapping)
  if (!serviceType) {
    errors.push({
      row,
      field: 'serviceType',
      message: '올바른 예배 종류가 아닙니다 (주일오전예배/주일오후예배/수요예배/새벽기도회/금요기도회/특별예배/기타)',
      value: data.serviceType
    })
  }
  
  // 출석일 검증
  let attendanceDate: Date | undefined
  if (data.attendanceDate) {
    attendanceDate = parseDate(data.attendanceDate)
    if (!attendanceDate) {
      errors.push({
        row,
        field: 'attendanceDate',
        message: '올바른 날짜 형식이 아닙니다 (YYYY-MM-DD)',
        value: data.attendanceDate
      })
    }
  }
  
  if (errors.length > 0) {
    return { attendance: null, errors }
  }
  
  const attendance: AttendanceImportData = {
    memberName: data.memberName.trim(),
    serviceType: serviceType!,
    attendanceDate,
    isPresent: data.isPresent !== undefined ? parseBoolean(data.isPresent) : true,
    notes: data.notes?.trim() || undefined
  }
  
  return { attendance, errors }
}

// 심방 데이터 검증
export function validateVisitationData(
  data: any, 
  row: number,
  existingMembers: { name: string; id: string }[]
): { visitation: VisitationImportData | null; errors: ImportError[] } {
  const errors: ImportError[] = []
  
  // 교인명 검증 (필수)
  if (!data.memberName || typeof data.memberName !== 'string' || data.memberName.trim().length === 0) {
    errors.push({
      row,
      field: 'memberName',
      message: '교인명은 필수 입력 항목입니다',
      value: data.memberName
    })
  } else {
    const member = existingMembers.find(m => m.name === data.memberName.trim())
    if (!member) {
      errors.push({
        row,
        field: 'memberName',
        message: '존재하지 않는 교인입니다',
        value: data.memberName
      })
    }
  }
  
  // 심방일 검증 (필수)
  let visitDate: Date | undefined
  if (data.visitDate) {
    visitDate = parseDate(data.visitDate)
    if (!visitDate) {
      errors.push({
        row,
        field: 'visitDate',
        message: '올바른 날짜 형식이 아닙니다 (YYYY-MM-DD)',
        value: data.visitDate
      })
    }
  } else {
    errors.push({
      row,
      field: 'visitDate',
      message: '심방일은 필수 입력 항목입니다',
      value: data.visitDate
    })
  }
  
  // 후속 관리 날짜 검증
  let followUpDate: Date | undefined
  if (data.followUpDate) {
    followUpDate = parseDate(data.followUpDate)
    if (!followUpDate) {
      errors.push({
        row,
        field: 'followUpDate',
        message: '올바른 날짜 형식이 아닙니다 (YYYY-MM-DD)',
        value: data.followUpDate
      })
    }
  }
  
  if (errors.length > 0) {
    return { visitation: null, errors }
  }
  
  const visitation: VisitationImportData = {
    memberName: data.memberName.trim(),
    visitDate: visitDate!,
    purpose: data.purpose?.trim() || undefined,
    content: data.content?.trim() || undefined,
    followUpNeeded: data.followUpNeeded !== undefined ? parseBoolean(data.followUpNeeded) : false,
    followUpDate
  }
  
  return { visitation, errors }
}

// 지출결의서 데이터 검증
export function validateExpenseReportData(
  data: any, 
  row: number
): { expenseReport: ExpenseReportImportData | null; errors: ImportError[] } {
  const errors: ImportError[] = []
  
  // 제목 검증 (필수)
  if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
    errors.push({
      row,
      field: 'title',
      message: '제목은 필수 입력 항목입니다',
      value: data.title
    })
  }
  
  // 금액 검증 (필수)
  const amount = parseNumber(data.amount)
  if (amount === undefined || amount <= 0) {
    errors.push({
      row,
      field: 'amount',
      message: '유효한 금액을 입력해주세요',
      value: data.amount
    })
  }
  
  // 분류 검증 (필수)
  if (!data.category || typeof data.category !== 'string' || data.category.trim().length === 0) {
    errors.push({
      row,
      field: 'category',
      message: '분류는 필수 입력 항목입니다',
      value: data.category
    })
  }
  
  // 상태 검증
  const statusMapping: Record<string, keyof typeof ReportStatus> = {
    '대기중': 'PENDING',
    '승인': 'APPROVED',
    '거부': 'REJECTED',
    '지급완료': 'PAID'
  }
  const status = data.status ? parseEnum(data.status, ReportStatus, statusMapping) : 'PENDING'
  if (data.status && !status) {
    errors.push({
      row,
      field: 'status',
      message: '올바른 상태가 아닙니다 (대기중/승인/거부/지급완료)',
      value: data.status
    })
  }
  
  // 신청일 검증
  let requestDate: Date | undefined
  if (data.requestDate) {
    requestDate = parseDate(data.requestDate)
    if (!requestDate) {
      errors.push({
        row,
        field: 'requestDate',
        message: '올바른 날짜 형식이 아닙니다 (YYYY-MM-DD)',
        value: data.requestDate
      })
    }
  }
  
  if (errors.length > 0) {
    return { expenseReport: null, errors }
  }
  
  const expenseReport: ExpenseReportImportData = {
    title: data.title.trim(),
    description: data.description?.trim() || undefined,
    amount: amount!,
    category: data.category.trim(),
    status: status as ReportStatus,
    requestDate,
    approvedDate: data.approvedDate ? parseDate(data.approvedDate) : undefined,
    rejectedDate: data.rejectedDate ? parseDate(data.rejectedDate) : undefined,
    rejectionReason: data.rejectionReason?.trim() || undefined,
    receiptUrl: data.receiptUrl?.trim() || undefined
  }
  
  return { expenseReport, errors }
}

// 조직 데이터 검증
export function validateOrganizationData(
  data: any, 
  row: number
): { organization: OrganizationImportData | null; errors: ImportError[] } {
  const errors: ImportError[] = []
  
  // 코드 검증 (필수)
  if (!data.code || typeof data.code !== 'string' || data.code.trim().length === 0) {
    errors.push({
      row,
      field: 'code',
      message: '조직코드는 필수 입력 항목입니다',
      value: data.code
    })
  } else if (!/^[A-Z0-9_]+$/.test(data.code.trim())) {
    errors.push({
      row,
      field: 'code',
      message: '조직코드는 영문 대문자, 숫자, 언더스코어만 사용 가능합니다',
      value: data.code
    })
  }
  
  // 이름 검증 (필수)
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    errors.push({
      row,
      field: 'name',
      message: '조직명은 필수 입력 항목입니다',
      value: data.name
    })
  }
  
  // 조직 레벨 검증 (필수)
  const levelMapping: Record<string, keyof typeof OrganizationLevel> = {
    '1단계': 'LEVEL_1',
    '2단계': 'LEVEL_2',
    '3단계': 'LEVEL_3',
    '4단계': 'LEVEL_4'
  }
  const level = parseEnum(data.level, OrganizationLevel, levelMapping)
  if (!level) {
    errors.push({
      row,
      field: 'level',
      message: '올바른 조직단계가 아닙니다 (LEVEL_1/LEVEL_2/LEVEL_3/LEVEL_4 또는 1단계/2단계/3단계/4단계)',
      value: data.level
    })
  }
  
  // 이메일 검증 (선택)
  if (data.email && typeof data.email === 'string' && data.email.trim().length > 0) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(data.email.trim())) {
      errors.push({
        row,
        field: 'email',
        message: '올바른 이메일 형식이 아닙니다',
        value: data.email
      })
    }
  }
  
  // 전화번호 검증 (선택)
  if (data.phone && typeof data.phone === 'string' && data.phone.trim().length > 0) {
    const phoneRegex = /^(0[2-9]\d?-?\d{3,4}-?\d{4}|01[0-9]-?\d{4}-?\d{4})$/
    if (!phoneRegex.test(data.phone.trim().replace(/\s/g, ''))) {
      errors.push({
        row,
        field: 'phone',
        message: '올바른 전화번호 형식이 아닙니다',
        value: data.phone
      })
    }
  }
  
  if (errors.length > 0) {
    return { organization: null, errors }
  }
  
  const organization: OrganizationImportData = {
    code: data.code.trim(),
    name: data.name.trim(),
    level: level!,
    parentCode: data.parentCode?.trim() || undefined,
    description: data.description?.trim() || undefined,
    isActive: data.isActive !== undefined ? parseBoolean(data.isActive) : true,
    phone: data.phone?.trim() || undefined,
    email: data.email?.trim() || undefined,
    address: data.address?.trim() || undefined,
    managerName: data.managerName?.trim() || undefined
  }
  
  return { organization, errors }
}