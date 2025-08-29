import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import { 
  DataType,
  FileFormat,
  ImportResult,
  ExportResult,
  ImportOptions,
  ExportOptions,
  ProgressCallback,
  ColumnMapping
} from './types'
import {
  validateMemberData,
  validateOfferingData,
  validateAttendanceData,
  validateVisitationData,
  validateExpenseReportData,
  validateOrganizationData
} from './validators'

// 기본 컬럼 매핑 정의
const DEFAULT_COLUMN_MAPPINGS: Record<DataType, ColumnMapping> = {
  [DataType.MEMBERS]: {
    '이름': 'name',
    '이름*': 'name',
    '전화번호': 'phone',
    '휴대폰': 'phone',
    '핸드폰': 'phone',
    '연락처': 'phone',
    '이메일': 'email',
    '이메일주소': 'email',
    'Email': 'email',
    '생년월일': 'birthDate',
    '생일': 'birthDate',
    '주소': 'address',
    '성별': 'gender',
    '결혼상태': 'maritalStatus',
    '결혼여부': 'maritalStatus',
    '세례일': 'baptismDate',
    '입교일': 'confirmationDate',
    '직분': 'positionName',
    '부서': 'departmentName',
    '가족ID': 'familyId',
    '가족관계': 'relationship',
    '비고': 'notes',
    '메모': 'notes',
    '상태': 'status'
  },
  [DataType.OFFERINGS]: {
    '교인명': 'memberName',
    '이름': 'memberName',
    '헌금자': 'memberName',
    '금액': 'amount',
    '헌금액': 'amount',
    '헌금종류': 'offeringType',
    '종류': 'offeringType',
    '설명': 'description',
    '비고': 'description',
    '헌금일': 'offeringDate',
    '날짜': 'offeringDate'
  },
  [DataType.ATTENDANCES]: {
    '교인명': 'memberName',
    '이름': 'memberName',
    '예배종류': 'serviceType',
    '예배구분': 'serviceType',
    '출석일': 'attendanceDate',
    '날짜': 'attendanceDate',
    '출석여부': 'isPresent',
    '참석': 'isPresent',
    '비고': 'notes',
    '메모': 'notes'
  },
  [DataType.VISITATIONS]: {
    '교인명': 'memberName',
    '이름': 'memberName',
    '심방일': 'visitDate',
    '날짜': 'visitDate',
    '목적': 'purpose',
    '내용': 'content',
    '후속관리': 'followUpNeeded',
    '후속관리일': 'followUpDate'
  },
  [DataType.EXPENSE_REPORTS]: {
    '제목': 'title',
    '설명': 'description',
    '금액': 'amount',
    '분류': 'category',
    '카테고리': 'category',
    '상태': 'status',
    '신청일': 'requestDate',
    '승인일': 'approvedDate',
    '거부일': 'rejectedDate',
    '거부사유': 'rejectionReason',
    '영수증URL': 'receiptUrl'
  },
  [DataType.ORGANIZATIONS]: {
    '코드': 'code',
    '조직코드': 'code',
    '이름': 'name',
    '조직명': 'name',
    '조직단계': 'level',
    '레벨': 'level',
    '상위조직코드': 'parentCode',
    '부모조직': 'parentCode',
    '설명': 'description',
    '활성상태': 'isActive',
    '상태': 'isActive',
    '전화번호': 'phone',
    '연락처': 'phone',
    '이메일': 'email',
    '이메일주소': 'email',
    '주소': 'address',
    '담당자': 'managerName',
    '담당자명': 'managerName'
  },
  [DataType.ACCOUNT_CODES]: {
    '계정코드': 'code',
    '코드': 'code',
    '계정명': 'name',
    '이름': 'name',
    '영문명': 'englishName',
    '영문이름': 'englishName',
    '계정분류': 'type',
    '분류': 'type',
    '타입': 'type',
    '계층레벨': 'level',
    '레벨': 'level',
    '단계': 'level',
    '상위계정코드': 'parentCode',
    '부모코드': 'parentCode',
    '정렬순서': 'order',
    '순서': 'order',
    '거래허용': 'allowTransaction',
    '거래가능': 'allowTransaction',
    '활성상태': 'isActive',
    '상태': 'isActive',
    '시스템계정': 'isSystem',
    '시스템': 'isSystem',
    '설명': 'description',
    '비고': 'description'
  }
}

// Excel/CSV 파일 읽기
export function readExcelFile(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })
        
        // 첫 번째 시트 사용
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        
        // JSON으로 변환 (헤더를 키로 사용)
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1,  // 첫 번째 행을 헤더로 사용
          defval: ''  // 빈 셀의 기본값
        })
        
        if (jsonData.length === 0) {
          reject(new Error('파일에 데이터가 없습니다'))
          return
        }
        
        // 헤더와 데이터 분리
        const headers = jsonData[0] as string[]
        const rows = jsonData.slice(1)
        
        // 헤더를 키로 하는 객체 배열로 변환
        const result = rows.map((row: unknown) => {
          const typedRow = row as any[]
          const obj: Record<string, any> = {}
          headers.forEach((header, index) => {
            if (header) {  // 빈 헤더는 무시
              obj[header.toString().trim()] = typedRow[index] || ''
            }
          })
          return obj
        }).filter(obj => Object.keys(obj).length > 0)  // 빈 행 제거
        
        resolve(result)
      } catch (error) {
        reject(new Error(`파일 읽기 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`))
      }
    }
    
    reader.onerror = () => {
      reject(new Error('파일 읽기 실패'))
    }
    
    reader.readAsBinaryString(file)
  })
}

// 컬럼 매핑 적용
export function mapColumns(data: any[], dataType: DataType, customMapping?: ColumnMapping): any[] {
  const mapping = { ...DEFAULT_COLUMN_MAPPINGS[dataType], ...customMapping }
  
  return data.map(row => {
    const mappedRow: Record<string, any> = {}
    
    Object.entries(row).forEach(([key, value]) => {
      const mappedKey = mapping[key] || key
      mappedRow[mappedKey] = value
    })
    
    return mappedRow
  })
}

// 데이터 가져오기 처리
export async function processImportData<T>(
  data: any[],
  dataType: DataType,
  options: ImportOptions,
  context: {
    existingMembers?: { name: string; id: string }[]
    existingPositions?: { name: string; id: string }[]
    existingDepartments?: { name: string; id: string }[]
  },
  progressCallback?: ProgressCallback
): Promise<ImportResult<T>> {
  const result: ImportResult<T> = {
    success: false,
    data: [],
    errors: [],
    summary: {
      total: data.length,
      successful: 0,
      failed: 0
    }
  }
  
  if (data.length === 0) {
    result.success = true
    return result
  }
  
  // 진행률 초기화
  progressCallback?.(0, '데이터 검증 중...')
  
  const validatedData: T[] = []
  
  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    const rowNumber = i + 2  // Excel 행 번호 (헤더 포함)
    
    try {
      let validationResult
      
      switch (dataType) {
        case DataType.MEMBERS:
          validationResult = validateMemberData(
            row, 
            rowNumber,
            context.existingPositions || [],
            context.existingDepartments || []
          )
          break
        case DataType.OFFERINGS:
          validationResult = validateOfferingData(
            row,
            rowNumber,
            context.existingMembers || []
          )
          break
        case DataType.ATTENDANCES:
          validationResult = validateAttendanceData(
            row,
            rowNumber,
            context.existingMembers || []
          )
          break
        case DataType.VISITATIONS:
          validationResult = validateVisitationData(
            row,
            rowNumber,
            context.existingMembers || []
          )
          break
        case DataType.EXPENSE_REPORTS:
          validationResult = validateExpenseReportData(
            row,
            rowNumber
          )
          break
        case DataType.ORGANIZATIONS:
          validationResult = validateOrganizationData(
            row,
            rowNumber
          )
          break
        default:
          throw new Error(`지원되지 않는 데이터 타입: ${dataType}`)
      }
      
      if (validationResult.errors.length > 0) {
        result.errors.push(...validationResult.errors)
        result.summary.failed++
        
        // 오류 건너뛰기 옵션이 false면 처리 중단
        if (!options.skipErrors) {
          progressCallback?.(100, `검증 실패: ${validationResult.errors.length}개 오류 발견`)
          return result
        }
      } else if ('member' in validationResult && validationResult.member || 
                'offering' in validationResult && validationResult.offering || 
                'attendance' in validationResult && validationResult.attendance || 
                'visitation' in validationResult && validationResult.visitation || 
                'expenseReport' in validationResult && validationResult.expenseReport ||
                'organization' in validationResult && validationResult.organization) {
        // 타입에 따라 적절한 데이터 추가
        const validData = (('member' in validationResult && validationResult.member) || 
                          ('offering' in validationResult && validationResult.offering) || 
                          ('attendance' in validationResult && validationResult.attendance) || 
                          ('visitation' in validationResult && validationResult.visitation) || 
                          ('expenseReport' in validationResult && validationResult.expenseReport) ||
                          ('organization' in validationResult && validationResult.organization)) as T
        validatedData.push(validData)
        result.summary.successful++
      }
      
      // 진행률 업데이트
      const progress = Math.round(((i + 1) / data.length) * 100)
      progressCallback?.(progress, `데이터 검증 중... (${i + 1}/${data.length})`)
      
    } catch (error) {
      result.errors.push({
        row: rowNumber,
        message: error instanceof Error ? error.message : '알 수 없는 오류'
      })
      result.summary.failed++
      
      if (!options.skipErrors) {
        return result
      }
    }
  }
  
  result.data = validatedData
  result.success = options.validateOnly || result.summary.successful > 0
  
  progressCallback?.(100, `검증 완료: ${result.summary.successful}개 성공, ${result.summary.failed}개 실패`)
  
  return result
}

// Excel/CSV 파일로 내보내기
export async function exportToExcel<T extends Record<string, any>>(
  data: T[],
  options: ExportOptions,
  progressCallback?: ProgressCallback
): Promise<ExportResult> {
  try {
    progressCallback?.(0, '데이터 준비 중...')
    
    // 데이터가 없어도 헤더만 있는 파일 생성
    const headers = getExportHeaders(options.dataType)
    let mappedData: Record<string, any>[] = []
    
    if (data.length > 0) {
      mappedData = data.map((row, index) => {
        const mappedRow: Record<string, any> = {}
        
        Object.entries(headers).forEach(([key, header]) => {
          mappedRow[header] = formatExportValue(row[key], key)
        })
        
        // 진행률 업데이트
        if (index % 100 === 0) {
          const progress = Math.round((index / data.length) * 50)
          progressCallback?.(progress, `데이터 변환 중... (${index + 1}/${data.length})`)
        }
        
        return mappedRow
      })
    } else {
      // 데이터가 없으면 헤더만 있는 빈 행 생성
      const emptyRow: Record<string, any> = {}
      Object.values(headers).forEach(header => {
        emptyRow[header] = ''
      })
      mappedData = [emptyRow]
    }
    
    progressCallback?.(50, 'Excel 파일 생성 중...')
    
    // 워크북 생성 - 헤더만 있는 경우를 위해 특별 처리
    let worksheet: XLSX.WorkSheet
    if (data.length === 0) {
      // 데이터가 없으면 헤더만 생성
      const headerRow = Object.values(headers)
      worksheet = XLSX.utils.aoa_to_sheet([headerRow])
    } else {
      worksheet = XLSX.utils.json_to_sheet(mappedData)
    }
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, getSheetName(options.dataType))
    
    // 컬럼 너비 자동 조정
    const colWidths = Object.values(headers).map(header => ({
      wch: Math.max(header.length * 1.2, 10)
    }))
    worksheet['!cols'] = colWidths
    
    progressCallback?.(80, '파일 저장 준비 중...')
    
    // 파일명 생성
    const filename = options.filename || generateFilename(options.dataType, options.format)
    
    if (options.format === FileFormat.CSV) {
      // CSV 형식으로 내보내기
      const csv = XLSX.utils.sheet_to_csv(worksheet, { FS: ',', RS: '\n' })
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
      saveAs(blob, filename.replace('.xlsx', '.csv'))
    } else {
      // Excel 형식으로 내보내기
      const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      saveAs(blob, filename)
    }
    
    progressCallback?.(100, '내보내기 완료')
    
    return {
      success: true,
      filename,
      data: options.format === FileFormat.CSV 
        ? new TextEncoder().encode('\uFEFF' + XLSX.utils.sheet_to_csv(worksheet)).buffer
        : XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
    }
    
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    }
  }
}

// 내보내기용 헤더 매핑
function getExportHeaders(dataType: DataType): Record<string, string> {
  switch (dataType) {
    case DataType.MEMBERS:
      return {
        name: '이름',
        phone: '전화번호',
        email: '이메일',
        birthDate: '생년월일',
        address: '주소',
        gender: '성별',
        maritalStatus: '결혼상태',
        baptismDate: '세례일',
        confirmationDate: '입교일',
        positionName: '직분',
        departmentName: '부서',
        familyId: '가족ID',
        relationship: '가족관계',
        status: '상태',
        notes: '비고'
      }
    case DataType.OFFERINGS:
      return {
        memberName: '교인명',
        amount: '금액',
        offeringType: '헌금종류',
        description: '설명',
        offeringDate: '헌금일'
      }
    case DataType.ATTENDANCES:
      return {
        memberName: '교인명',
        serviceType: '예배종류',
        attendanceDate: '출석일',
        isPresent: '출석여부',
        notes: '비고'
      }
    case DataType.VISITATIONS:
      return {
        memberName: '교인명',
        visitDate: '심방일',
        purpose: '목적',
        content: '내용',
        followUpNeeded: '후속관리',
        followUpDate: '후속관리일'
      }
    case DataType.EXPENSE_REPORTS:
      return {
        title: '제목',
        description: '설명',
        amount: '금액',
        category: '분류',
        status: '상태',
        requestDate: '신청일',
        approvedDate: '승인일',
        rejectedDate: '거부일',
        rejectionReason: '거부사유'
      }
    case DataType.ORGANIZATIONS:
      return {
        조직코드: '조직코드',
        조직명: '조직명',
        영문명: '영문명',
        조직레벨: '조직레벨',
        상위조직코드: '상위조직코드',
        설명: '설명',
        활성상태: '활성상태',
        연락처: '연락처',
        이메일: '이메일',
        주소: '주소',
        담당자: '담당자',
        정렬순서: '정렬순서',
        생성일: '생성일',
        수정일: '수정일'
      }
    case DataType.ORGANIZATION_MEMBERSHIPS:
      return {
        교인명: '교인명',
        교인연락처: '교인연락처',
        교인이메일: '교인이메일',
        조직코드: '조직코드',
        조직명: '조직명',
        조직레벨: '조직레벨',
        직책명: '직책명',
        직책레벨: '직책레벨',
        리더십여부: '리더십여부',
        주소속여부: '주소속여부',
        가입일: '가입일',
        종료일: '종료일',
        활성상태: '활성상태',
        비고: '비고',
        생성일: '생성일',
        수정일: '수정일'
      }
    case DataType.ACCOUNT_CODES:
      return {
        계정코드: '계정코드',
        계정명: '계정명',
        영문명: '영문명',
        계정분류: '계정분류',
        계층레벨: '계층레벨',
        상위계정코드: '상위계정코드',
        정렬순서: '정렬순서',
        거래허용: '거래허용',
        활성상태: '활성상태',
        시스템계정: '시스템계정',
        설명: '설명',
        생성일: '생성일',
        수정일: '수정일'
      }
    default:
      return {}
  }
}

// 내보내기 값 형식화
function formatExportValue(value: any, key: string): string {
  if (value === null || value === undefined) return ''
  
  // 날짜 형식화
  if (value instanceof Date) {
    return value.toISOString().split('T')[0]  // YYYY-MM-DD
  }
  
  // 불린 값 형식화
  if (typeof value === 'boolean') {
    return value ? '예' : '아니오'
  }
  
  // 숫자 형식화 (금액)
  if (typeof value === 'number' && (key.includes('amount') || key === 'amount')) {
    return value.toLocaleString('ko-KR')
  }
  
  // Enum 값 한글 변환
  const enumMappings: Record<string, Record<string, string>> = {
    gender: { MALE: '남', FEMALE: '여' },
    maritalStatus: { SINGLE: '미혼', MARRIED: '기혼', DIVORCED: '이혼', WIDOWED: '사별' },
    status: { ACTIVE: '활동', INACTIVE: '비활동', TRANSFERRED: '전출', DECEASED: '소천' },
    relationship: { HEAD: '가장', SPOUSE: '배우자', CHILD: '자녀', PARENT: '부모', SIBLING: '형제자매', OTHER: '기타' },
    offeringType: { 
      TITHE: '십일조', 
      THANKSGIVING: '감사헌금', 
      SUNDAY_OFFERING: '주일헌금', 
      SPECIAL: '특별헌금',
      MISSION: '선교헌금',
      BUILDING: '건축헌금',
      OTHER: '기타'
    },
    serviceType: {
      SUNDAY_MORNING: '주일오전예배',
      SUNDAY_EVENING: '주일오후예배',
      WEDNESDAY: '수요예배',
      DAWN_PRAYER: '새벽기도회',
      FRIDAY_PRAYER: '금요기도회',
      SPECIAL_SERVICE: '특별예배',
      OTHER: '기타'
    },
    reportStatus: {
      PENDING: '대기중',
      APPROVED: '승인',
      REJECTED: '거부',
      PAID: '지급완료'
    }
  }
  
  for (const [enumKey, mapping] of Object.entries(enumMappings)) {
    if (mapping[value]) {
      return mapping[value]
    }
  }
  
  return value.toString()
}

// 시트명 생성
function getSheetName(dataType: DataType): string {
  switch (dataType) {
    case DataType.MEMBERS: return '교인명부'
    case DataType.OFFERINGS: return '헌금내역'
    case DataType.ATTENDANCES: return '출석현황'
    case DataType.VISITATIONS: return '심방기록'
    case DataType.EXPENSE_REPORTS: return '지출결의서'
    case DataType.ORGANIZATIONS: return '조직도'
    default: return '데이터'
  }
}

// 파일명 생성
function generateFilename(dataType: DataType, format: FileFormat): string {
  const today = new Date().toISOString().split('T')[0]
  const sheetName = getSheetName(dataType)
  const extension = format === FileFormat.CSV ? 'csv' : 'xlsx'
  
  return `${sheetName}_${today}.${extension}`
}