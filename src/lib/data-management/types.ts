import { 
  Member, 
  Offering, 
  Attendance, 
  Visitation, 
  ExpenseReport,
  Organization,
  Gender,
  MaritalStatus,
  MemberStatus,
  FamilyRelation,
  OfferingType,
  ServiceType,
  ReportStatus,
  OrganizationLevel
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

// 데이터 타입 열거형
export enum DataType {
  MEMBERS = 'members',
  OFFERINGS = 'offerings',
  ATTENDANCES = 'attendances',
  VISITATIONS = 'visitations',
  EXPENSE_REPORTS = 'expense_reports',
  ORGANIZATIONS = 'organizations'
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

// 진행률 추적 인터페이스
export interface ProcessingProgress {
  current: number
  total: number
  message: string
  percentage: number
}

// 파일 업로드 결과
export interface FileUploadResult {
  data: any[]
  errors: ImportError[]
  metadata: {
    filename: string
    fileSize: number
    rowCount: number
    columnCount: number
    format: 'excel' | 'csv'
  }
}

// 데이터 검증 컨텍스트
export interface ValidationContext {
  existingMembers?: { id: string; name: string; email?: string | null }[]
  existingPositions?: { id: string; name: string }[]
  existingDepartments?: { id: string; name: string }[]
  existingFamilies?: { id: string }[]
  existingOrganizations?: { id: string; code: string; name: string; parentId?: string | null }[]
}

// 배치 처리 옵션
export interface BatchProcessingOptions {
  batchSize?: number
  maxRetries?: number
  retryDelay?: number
  onProgress?: ProgressCallback
  onBatchComplete?: (batchIndex: number, results: any[]) => void
}

// 중복 처리 전략
export enum DuplicateStrategy {
  SKIP = 'skip',
  UPDATE = 'update',
  CREATE_NEW = 'create_new',
  ERROR = 'error'
}

// 중복 감지 규칙
export interface DuplicateDetectionRule {
  fields: string[]
  strategy: DuplicateStrategy
  caseSensitive?: boolean
}

// 데이터 변환 규칙
export interface TransformationRule {
  field: string
  from: any
  to: any
  condition?: (value: any) => boolean
}

// 내보내기 컬럼 설정
export interface ExportColumn {
  field: string
  header: string
  formatter?: (value: any) => string
  width?: number
}

// 파일 보안 검사 결과
export interface SecurityCheckResult {
  isValid: boolean
  fileType: string
  actualMimeType: string
  expectedMimeType: string
  containsMacros: boolean
  risks: string[]
}

// 성능 메트릭
export interface PerformanceMetrics {
  startTime: Date
  endTime?: Date
  duration?: number
  recordsProcessed: number
  recordsPerSecond?: number
  memoryUsage?: number
  errors: number
}