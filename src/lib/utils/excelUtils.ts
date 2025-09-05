import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

// Excel 템플릿 생성을 위한 타입 정의
interface ExcelTemplateColumn {
  key: string
  label: string
  width?: number
  type?: 'text' | 'number' | 'date' | 'boolean'
  required?: boolean
  options?: string[] // 드롭다운 옵션
  description?: string
}

interface ExcelTemplateConfig {
  sheetName: string
  columns: ExcelTemplateColumn[]
  sampleData?: any[]
  instructions?: string[]
}

// 조직 구성원 관리를 위한 Excel 템플릿 설정
export const ORGANIZATION_MEMBERSHIP_TEMPLATE: ExcelTemplateConfig = {
  sheetName: '조직구성원',
  columns: [
    { key: 'memberName', label: '구성원명*', width: 15, type: 'text', required: true },
    { key: 'memberPhone', label: '전화번호', width: 15, type: 'text' },
    { key: 'memberEmail', label: '이메일', width: 20, type: 'text' },
    { key: 'organizationName', label: '조직명*', width: 20, type: 'text', required: true },
    { key: 'organizationCode', label: '조직코드', width: 15, type: 'text' },
    { key: 'roleName', label: '직책명', width: 15, type: 'text' },
    { key: 'joinDate', label: '참여일*', width: 12, type: 'date', required: true },
    { key: 'endDate', label: '종료일', width: 12, type: 'date' },
    { key: 'isActive', label: '활성상태', width: 10, type: 'text', options: ['활성', '비활성'] },
    { key: 'memo', label: '메모', width: 25, type: 'text' }
  ],
  sampleData: [
    {
      memberName: '홍길동',
      memberPhone: '010-1234-5678',
      memberEmail: 'hong@example.com',
      organizationName: '찬양팀',
      organizationCode: 'PRAISE',
      roleName: '팀장',
      joinDate: '2024-01-01',
      endDate: '',
      isActive: '활성',
      memo: '예시 데이터입니다'
    },
    {
      memberName: '김영희',
      memberPhone: '010-9876-5432',
      memberEmail: 'kim@example.com',
      organizationName: '교육부',
      organizationCode: 'EDU',
      roleName: '부장',
      joinDate: '2024-02-15',
      endDate: '',
      isActive: '활성',
      memo: ''
    }
  ],
  instructions: [
    '* 표시된 필드는 필수 입력 사항입니다.',
    '구성원명: 실제 등록된 구성원 이름을 정확히 입력하세요.',
    '조직명: 기존 조직명을 정확히 입력하거나 새로운 조직을 생성할 수 있습니다.',
    '직책명: 기존 직책명을 입력하거나 새로운 직책을 생성할 수 있습니다.',
    '참여일/종료일: YYYY-MM-DD 형식으로 입력하세요.',
    '활성상태: "활성" 또는 "비활성"만 입력 가능합니다.',
    '메모: 추가 정보나 특이사항을 입력하세요.'
  ]
}

// Excel 워크북 생성
export function createExcelTemplate(config: ExcelTemplateConfig): XLSX.WorkBook {
  const wb = XLSX.utils.book_new()
  
  // 메인 데이터 시트 생성
  const headers = config.columns.map(col => col.label)
  const sampleRows = config.sampleData || []
  
  // 헤더와 샘플 데이터 결합
  const wsData = [headers, ...sampleRows.map(row => 
    config.columns.map(col => row[col.key] || '')
  )]
  
  const ws = XLSX.utils.aoa_to_sheet(wsData)
  
  // 열 너비 설정
  const colWidths = config.columns.map(col => ({ width: col.width || 12 }))
  ws['!cols'] = colWidths
  
  // 헤더 스타일링 (배경색과 굵기)
  const headerRange = XLSX.utils.decode_range(ws['!ref'] || 'A1')
  for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: col })
    if (!ws[cellRef]) continue
    ws[cellRef].s = {
      fill: { fgColor: { rgb: '4F46E5' } },
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      alignment: { horizontal: 'center' }
    }
  }
  
  XLSX.utils.book_append_sheet(wb, ws, config.sheetName)
  
  // 사용법 안내 시트 생성
  if (config.instructions && config.instructions.length > 0) {
    const instructionData = [
      ['사용법 안내'],
      [''],
      ...config.instructions.map(instruction => [instruction]),
      [''],
      ['컬럼 설명'],
      ['컬럼명', '설명', '필수여부', '데이터타입'],
      ...config.columns.map(col => [
        col.label,
        col.description || '',
        col.required ? '필수' : '선택',
        col.type || 'text'
      ])
    ]
    
    const instructionWs = XLSX.utils.aoa_to_sheet(instructionData)
    instructionWs['!cols'] = [
      { width: 20 }, { width: 50 }, { width: 10 }, { width: 15 }
    ]
    
    XLSX.utils.book_append_sheet(wb, instructionWs, '사용법')
  }
  
  return wb
}

// Excel 파일 다운로드
export function downloadExcelTemplate(
  config: ExcelTemplateConfig,
  filename?: string
): void {
  const wb = createExcelTemplate(config)
  const fileName = filename || `${config.sheetName}_템플릿_${new Date().toISOString().split('T')[0]}.xlsx`
  
  // 워크북을 버퍼로 변환
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  
  // 파일로 저장
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  saveAs(blob, fileName)
}

// 현재 데이터를 Excel 파일로 내보내기
export function exportToExcel<T>(
  data: T[],
  columns: ExcelTemplateColumn[],
  sheetName: string = '데이터',
  filename?: string
): void {
  const wb = XLSX.utils.book_new()
  
  // 헤더 생성
  const headers = columns.map(col => col.label)
  
  // 데이터 변환
  const rows = data.map(item => 
    columns.map(col => {
      const value = (item as any)[col.key]
      
      // 타입별 포맷팅
      if (col.type === 'date' && value) {
        return value instanceof Date ? value.toISOString().split('T')[0] : value
      }
      if (col.type === 'boolean') {
        return value ? '활성' : '비활성'
      }
      return value || ''
    })
  )
  
  // 워크시트 생성
  const wsData = [headers, ...rows]
  const ws = XLSX.utils.aoa_to_sheet(wsData)
  
  // 열 너비 설정
  const colWidths = columns.map(col => ({ width: col.width || 12 }))
  ws['!cols'] = colWidths
  
  // 헤더 스타일링
  const headerRange = XLSX.utils.decode_range(ws['!ref'] || 'A1')
  for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: col })
    if (!ws[cellRef]) continue
    ws[cellRef].s = {
      fill: { fgColor: { rgb: '059669' } },
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      alignment: { horizontal: 'center' }
    }
  }
  
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  
  const fileName = filename || `${sheetName}_${new Date().toISOString().split('T')[0]}.xlsx`
  
  // 워크북을 버퍼로 변환
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  
  // 파일로 저장
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  saveAs(blob, fileName)
}

// Excel 파일 읽기
export function readExcelFile(file: File): Promise<any[][]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })
        
        // 첫 번째 시트 읽기
        const sheetName = wb.SheetNames[0]
        const ws = wb.Sheets[sheetName]
        
        // 시트를 JSON으로 변환
        const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1 })
        resolve(jsonData as any[][])
      } catch (error) {
        reject(error)
      }
    }
    
    reader.onerror = () => reject(new Error('파일을 읽을 수 없습니다'))
    reader.readAsArrayBuffer(file)
  })
}

// Excel 데이터 검증
export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

export interface ValidationError {
  row: number
  column: string
  message: string
  value: any
}

export interface ValidationWarning {
  row: number
  column: string
  message: string
  value: any
}

export function validateExcelData(
  data: any[][],
  config: ExcelTemplateConfig
): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []
  
  if (data.length < 2) {
    errors.push({
      row: 0,
      column: 'general',
      message: '데이터가 없습니다. 최소 1행의 데이터가 필요합니다.',
      value: null
    })
    return { isValid: false, errors, warnings }
  }
  
  const headers = data[0]
  const expectedHeaders = config.columns.map(col => col.label)
  
  // 헤더 검증
  expectedHeaders.forEach((expectedHeader, index) => {
    if (headers[index] !== expectedHeader) {
      errors.push({
        row: 0,
        column: expectedHeader,
        message: `예상 헤더 "${expectedHeader}"가 "${headers[index] || '없음'}"로 발견되었습니다.`,
        value: headers[index]
      })
    }
  })
  
  // 데이터 행 검증
  for (let i = 1; i < data.length; i++) {
    const row = data[i]
    
    config.columns.forEach((col, colIndex) => {
      const cellValue = row[colIndex]
      
      // 필수 필드 검증
      if (col.required && (!cellValue || cellValue.toString().trim() === '')) {
        errors.push({
          row: i,
          column: col.label,
          message: `${col.label}은(는) 필수 입력 항목입니다.`,
          value: cellValue
        })
      }
      
      // 데이터 타입 검증
      if (cellValue && cellValue.toString().trim() !== '') {
        switch (col.type) {
          case 'date':
            const dateValue = new Date(cellValue)
            if (isNaN(dateValue.getTime())) {
              errors.push({
                row: i,
                column: col.label,
                message: `올바른 날짜 형식(YYYY-MM-DD)이 아닙니다.`,
                value: cellValue
              })
            }
            break
            
          case 'number':
            if (isNaN(Number(cellValue))) {
              errors.push({
                row: i,
                column: col.label,
                message: `숫자가 아닙니다.`,
                value: cellValue
              })
            }
            break
            
          case 'boolean':
            if (col.options && !col.options.includes(cellValue.toString())) {
              errors.push({
                row: i,
                column: col.label,
                message: `허용된 값이 아닙니다. 가능한 값: ${col.options.join(', ')}`,
                value: cellValue
              })
            }
            break
        }
      }
      
      // 옵션 검증
      if (col.options && cellValue && !col.options.includes(cellValue.toString())) {
        if (col.type !== 'boolean') { // boolean은 위에서 이미 처리
          errors.push({
            row: i,
            column: col.label,
            message: `허용된 값이 아닙니다. 가능한 값: ${col.options.join(', ')}`,
            value: cellValue
          })
        }
      }
    })
    
    // 빈 행 경고
    const hasData = row.some(cell => cell && cell.toString().trim() !== '')
    if (!hasData) {
      warnings.push({
        row: i,
        column: 'general',
        message: '빈 행입니다.',
        value: null
      })
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}