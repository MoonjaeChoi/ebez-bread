import { 
  Member, 
  Offering, 
  Attendance, 
  Visitation, 
  ExpenseReport,
  Organization,
  AccountCode,
  Gender,
  MaritalStatus,
  MemberStatus,
  FamilyRelation,
  OfferingType,
  ServiceType,
  ReportStatus,
  OrganizationLevel,
  AccountType
} from '@prisma/client'

// 공통 인터페이스
export interface ImportResult<T = any> {
  success: boolean
  data?: T[]
  errors: ImportError[]
  summary: {
    total: number
    successful: number
    failed: number
  }
}

export interface ExportResult {
  success: boolean
  filename?: string
  data?: ArrayBuffer
  error?: string
}

export interface ImportError {
  row: number
  field?: string
  message: string
  value?: any
}

export interface ProgressCallback {
  (progress: number, message: string): void
}

// 교인 데이터 타입
export interface MemberImportData {
  name: string
  phone?: string
  email?: string
  birthDate?: string | Date
  address?: string
  gender?: Gender | string
  maritalStatus?: MaritalStatus | string
  baptismDate?: string | Date
  confirmationDate?: string | Date
  positionName?: string  // 직분명 (실제 Position ID로 변환됨)
  departmentName?: string  // 부서명 (실제 Department ID로 변환됨)
  familyId?: string
  relationship?: FamilyRelation | string
  notes?: string
  status?: MemberStatus | string
}

export interface MemberExportData extends Omit<Member, 'churchId' | 'positionId' | 'departmentId'> {
  positionName?: string
  departmentName?: string
}

// 헌금 데이터 타입
export interface OfferingImportData {
  memberName: string  // 교인명 (실제 Member ID로 변환됨)
  amount: number | string
  offeringType: OfferingType | string
  description?: string
  offeringDate?: string | Date
}

export interface OfferingExportData extends Omit<Offering, 'churchId' | 'memberId'> {
  memberName: string
}

// 출석 데이터 타입
export interface AttendanceImportData {
  memberName: string  // 교인명 (실제 Member ID로 변환됨)
  serviceType: ServiceType | string
  attendanceDate?: string | Date
  isPresent?: boolean | string
  notes?: string
}

export interface AttendanceExportData extends Omit<Attendance, 'churchId' | 'memberId'> {
  memberName: string
}

// 심방 데이터 타입
export interface VisitationImportData {
  memberName: string  // 교인명 (실제 Member ID로 변환됨)
  visitDate: string | Date
  purpose?: string
  content?: string
  followUpNeeded?: boolean | string
  followUpDate?: string | Date
}

export interface VisitationExportData extends Omit<Visitation, 'memberId'> {
  memberName: string
}

// 지출결의서 데이터 타입
export interface ExpenseReportImportData {
  title: string
  description?: string
  amount: number | string
  category: string
  status?: ReportStatus | string
  requestDate?: string | Date
  approvedDate?: string | Date
  rejectedDate?: string | Date
  rejectionReason?: string
  receiptUrl?: string
}

export interface ExpenseReportExportData extends Omit<ExpenseReport, 'churchId' | 'requesterId'> {
  requesterName: string
}

// 조직 데이터 타입
export interface OrganizationImportData {
  code: string
  name: string
  level: OrganizationLevel | string
  parentCode?: string  // 부모 조직 코드 (실제 Parent ID로 변환됨)
  description?: string
  isActive?: boolean | string
  phone?: string
  email?: string
  address?: string
  managerName?: string
}

export interface OrganizationExportData extends Omit<Organization, 'churchId' | 'parentId'> {
  parentCode?: string
}

// 조직별 직책 구성원 데이터 타입
export interface OrganizationMembershipImportData {
  memberName: string  // 교인명 (실제 Member ID로 변환됨)
  organizationCode: string  // 조직 코드 (실제 Organization ID로 변환됨)
  roleName?: string  // 직책명 (실제 Role ID로 변환됨)
  isPrimary?: boolean | string  // 주 소속 여부
  joinDate?: string | Date  // 가입일
  endDate?: string | Date  // 종료일
  notes?: string  // 비고
}

// 회계 계정코드 데이터 타입
export interface AccountCodeImportData {
  code: string
  name: string
  englishName?: string
  type: AccountType | string
  level: number | string
  parentCode?: string  // 부모 계정 코드 (실제 Parent ID로 변환됨)
  order?: number | string
  allowTransaction?: boolean | string
  isActive?: boolean | string
  isSystem?: boolean | string
  description?: string
}

export interface AccountCodeExportData extends Omit<AccountCode, 'churchId' | 'parentId'> {
  parentCode?: string
}

export interface OrganizationMembershipExportData {
  id: string
  memberName: string
  memberPhone?: string
  memberEmail?: string
  organizationCode: string
  organizationName: string
  organizationLevel: string
  roleName?: string
  roleLevel?: number
  isLeadership?: boolean
  isPrimary: boolean
  joinDate: Date | string
  endDate?: Date | string | null
  isActive: boolean
  notes?: string
}

// 데이터 타입 열거형
export enum DataType {
  MEMBERS = 'members',
  OFFERINGS = 'offerings',
  ATTENDANCES = 'attendances',
  VISITATIONS = 'visitations',
  EXPENSE_REPORTS = 'expense_reports',
  ORGANIZATIONS = 'organizations',
  ORGANIZATION_MEMBERSHIPS = 'organization_memberships',
  ACCOUNT_CODES = 'account_codes'
}

// 파일 포맷 열거형
export enum FileFormat {
  EXCEL = 'excel',
  CSV = 'csv'
}

// 내보내기 옵션
export interface ExportOptions {
  dataType: DataType
  format: FileFormat
  dateRange?: {
    start: Date
    end: Date
  }
  filters?: Record<string, any>
  includeInactive?: boolean
  filename?: string
}

// 가져오기 옵션
export interface ImportOptions {
  dataType: DataType
  skipErrors?: boolean  // 오류가 있는 행을 건너뛸지 여부
  updateExisting?: boolean  // 기존 데이터 업데이트 여부 (이름이나 이메일 기준)
  validateOnly?: boolean  // 유효성 검증만 수행
}

// 데이터 매핑 정보
export interface ColumnMapping {
  [excelColumn: string]: string  // Excel 컬럼명 -> 데이터 필드명
}

// 백업 생성 옵션
export interface BackupOptions {
  includeMembers?: boolean
  includeOfferings?: boolean
  includeAttendances?: boolean
  includeVisitations?: boolean
  includeExpenseReports?: boolean
  includeOrganizations?: boolean
  includeAccountCodes?: boolean
  dateRange?: {
    start: Date
    end: Date
  }
  filename?: string
}

// 백업 결과
export interface BackupResult {
  success: boolean
  filename?: string
  data?: ArrayBuffer
  includedTables: string[]
  recordCounts: Record<string, number>
  error?: string
}