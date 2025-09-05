import { describe, it, expect, vi } from 'vitest'
import { 
  createExcelTemplate, 
  downloadExcelTemplate,
  validateExcelData,
  readExcelFile,
  ORGANIZATION_MEMBERSHIP_TEMPLATE
} from '../excelUtils'

interface ExcelTemplateConfig {
  sheetName: string
  columns: Array<{
    key: string
    label: string
    width?: number
    type?: 'text' | 'number' | 'date' | 'boolean'
    required?: boolean
    options?: string[]
    description?: string
  }>
  sampleData?: any[]
  instructions?: string[]
}

interface ValidationResult {
  isValid: boolean
  errors: Array<{
    row: number
    column: string
    message: string
    value: any
  }>
  warnings: Array<{
    row: number
    column: string
    message: string
    value: any
  }>
}

// XLSX 모킹
vi.mock('xlsx', () => ({
  utils: {
    book_new: vi.fn(() => ({})),
    aoa_to_sheet: vi.fn(() => ({ '!ref': 'A1:J10', '!cols': [] })),
    book_append_sheet: vi.fn(),
    decode_range: vi.fn(() => ({ s: { c: 0, r: 0 }, e: { c: 9, r: 0 } })),
    encode_cell: vi.fn((ref) => `${String.fromCharCode(65 + ref.c)}${ref.r + 1}`),
    sheet_to_json: vi.fn(() => [
      ['구성원명*', '전화번호', '이메일', '조직명*', '조직코드', '직책명', '참여일*', '종료일', '활성상태', '메모'],
      ['홍길동', '010-1234-5678', 'hong@test.com', '찬양팀', 'PRAISE', '팀장', '2024-01-01', '', '활성', '테스트']
    ])
  },
  write: vi.fn(() => new ArrayBuffer(8)),
  read: vi.fn(() => ({
    SheetNames: ['Sheet1'],
    Sheets: { Sheet1: {} }
  }))
}))

// file-saver 모킹
vi.mock('file-saver', () => ({
  saveAs: vi.fn()
}))

describe('excelUtils', () => {
  describe('createExcelTemplate', () => {
    it('Excel 워크북을 생성한다', () => {
      const template = createExcelTemplate(ORGANIZATION_MEMBERSHIP_TEMPLATE)
      
      expect(template).toBeDefined()
      expect(typeof template).toBe('object')
    })

    it('사용자 정의 설정으로 템플릿을 생성한다', () => {
      const customConfig: ExcelTemplateConfig = {
        sheetName: '테스트시트',
        columns: [
          { key: 'name', label: '이름', width: 20, type: 'text', required: true },
          { key: 'age', label: '나이', width: 10, type: 'number', required: false }
        ],
        sampleData: [
          { name: '홍길동', age: 30 }
        ],
        instructions: ['테스트 지침입니다.']
      }

      const template = createExcelTemplate(customConfig)
      expect(template).toBeDefined()
    })

    it('지침이 없는 경우에도 정상 동작한다', () => {
      const configWithoutInstructions: ExcelTemplateConfig = {
        sheetName: '테스트',
        columns: [
          { key: 'name', label: '이름', width: 20 }
        ]
      }

      const template = createExcelTemplate(configWithoutInstructions)
      expect(template).toBeDefined()
    })
  })

  describe('downloadExcelTemplate', () => {
    it('파일 다운로드 함수를 호출한다', async () => {
      const fileSaver = await import('file-saver')
      const saveAsSpy = vi.spyOn(fileSaver, 'saveAs').mockImplementation(() => {})
      
      downloadExcelTemplate(ORGANIZATION_MEMBERSHIP_TEMPLATE, 'test.xlsx')
      
      expect(saveAsSpy).toHaveBeenCalled()
      
      saveAsSpy.mockRestore()
    })

    it('기본 파일명을 생성한다', async () => {
      const fileSaver = await import('file-saver')
      const saveAsSpy = vi.spyOn(fileSaver, 'saveAs').mockImplementation(() => {})
      
      downloadExcelTemplate(ORGANIZATION_MEMBERSHIP_TEMPLATE)
      
      expect(saveAsSpy).toHaveBeenCalled()
      const callArgs = saveAsSpy.mock.calls[saveAsSpy.mock.calls.length - 1]
      expect(callArgs[1]).toContain('조직구성원_템플릿_')
      expect(callArgs[1]).toContain('.xlsx')
      
      saveAsSpy.mockRestore()
    })
  })

  describe('readExcelFile', () => {
    it('Excel 파일을 읽어서 배열로 반환한다', async () => {
      const mockFile = new File([''], 'test.xlsx', { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      })

      // FileReader 모킹
      const mockFileReader = {
        readAsArrayBuffer: vi.fn(),
        onload: null as ((event: any) => void) | null,
        onerror: null as (() => void) | null,
        result: new ArrayBuffer(8)
      }

      global.FileReader = vi.fn(() => mockFileReader) as any

      const readPromise = readExcelFile(mockFile)

      // onload 콜백 시뮬레이션
      if (mockFileReader.onload) {
        mockFileReader.onload({ target: { result: new ArrayBuffer(8) } })
      }

      const result = await readPromise

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)
    })

    it('파일 읽기 오류를 처리한다', async () => {
      const mockFile = new File([''], 'test.xlsx', { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      })

      const mockFileReader = {
        readAsArrayBuffer: vi.fn(),
        onload: null as ((event: any) => void) | null,
        onerror: null as (() => void) | null,
        result: null
      }

      global.FileReader = vi.fn(() => mockFileReader) as any

      const readPromise = readExcelFile(mockFile)

      // onerror 콜백 시뮬레이션
      if (mockFileReader.onerror) {
        mockFileReader.onerror()
      }

      await expect(readPromise).rejects.toThrow('파일을 읽을 수 없습니다')
    })
  })

  describe('validateExcelData', () => {
    const validData = [
      ['구성원명*', '전화번호', '이메일', '조직명*', '조직코드', '직책명', '참여일*', '종료일', '활성상태', '메모'],
      ['홍길동', '010-1234-5678', 'hong@test.com', '찬양팀', 'PRAISE', '팀장', '2024-01-01', '', '활성', '테스트']
    ]

    it('유효한 데이터를 올바르게 검증한다', () => {
      const result = validateExcelData(validData, ORGANIZATION_MEMBERSHIP_TEMPLATE)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('빈 데이터를 검증한다', () => {
      const emptyData: any[][] = []
      
      const result = validateExcelData(emptyData, ORGANIZATION_MEMBERSHIP_TEMPLATE)

      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].message).toBe('데이터가 없습니다. 최소 1행의 데이터가 필요합니다.')
    })

    it('헤더만 있는 데이터를 검증한다', () => {
      const headerOnlyData = [
        ['구성원명*', '전화번호', '이메일', '조직명*', '조직코드', '직책명', '참여일*', '종료일', '활성상태', '메모']
      ]
      
      const result = validateExcelData(headerOnlyData, ORGANIZATION_MEMBERSHIP_TEMPLATE)

      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
    })

    it('잘못된 헤더를 검증한다', () => {
      const wrongHeaderData = [
        ['잘못된헤더', '전화번호', '이메일', '조직명*', '조직코드', '직책명', '참여일*', '종료일', '활성상태', '메모'],
        ['홍길동', '010-1234-5678', 'hong@test.com', '찬양팀', 'PRAISE', '팀장', '2024-01-01', '', '활성', '테스트']
      ]

      const result = validateExcelData(wrongHeaderData, ORGANIZATION_MEMBERSHIP_TEMPLATE)

      expect(result.isValid).toBe(false)
      expect(result.errors.some(error => error.column === '구성원명*')).toBe(true)
    })

    it('필수 필드 누락을 검증한다', () => {
      const missingRequiredData = [
        ['구성원명*', '전화번호', '이메일', '조직명*', '조직코드', '직책명', '참여일*', '종료일', '활성상태', '메모'],
        ['', '010-1234-5678', 'hong@test.com', '찬양팀', 'PRAISE', '팀장', '2024-01-01', '', '활성', '테스트']
      ]

      const result = validateExcelData(missingRequiredData, ORGANIZATION_MEMBERSHIP_TEMPLATE)

      expect(result.isValid).toBe(false)
      expect(result.errors.some(error => error.message.includes('필수 입력 항목'))).toBe(true)
    })

    it('잘못된 날짜 형식을 검증한다', () => {
      const invalidDateData = [
        ['구성원명*', '전화번호', '이메일', '조직명*', '조직코드', '직책명', '참여일*', '종료일', '활성상태', '메모'],
        ['홍길동', '010-1234-5678', 'hong@test.com', '찬양팀', 'PRAISE', '팀장', '잘못된날짜', '', '활성', '테스트']
      ]

      const result = validateExcelData(invalidDateData, ORGANIZATION_MEMBERSHIP_TEMPLATE)

      expect(result.isValid).toBe(false)
      expect(result.errors.some(error => error.message.includes('올바른 날짜 형식'))).toBe(true)
    })

    it('잘못된 옵션 값을 검증한다', () => {
      const invalidOptionData = [
        ['구성원명*', '전화번호', '이메일', '조직명*', '조직코드', '직책명', '참여일*', '종료일', '활성상태', '메모'],
        ['홍길동', '010-1234-5678', 'hong@test.com', '찬양팀', 'PRAISE', '팀장', '2024-01-01', '', '잘못된상태', '테스트']
      ]

      const result = validateExcelData(invalidOptionData, ORGANIZATION_MEMBERSHIP_TEMPLATE)

      expect(result.isValid).toBe(false)
      expect(result.errors.some(error => error.message.includes('허용된 값이 아닙니다'))).toBe(true)
    })

    it('빈 행에 대한 경고를 생성한다', () => {
      const dataWithEmptyRow = [
        ['구성원명*', '전화번호', '이메일', '조직명*', '조직코드', '직책명', '참여일*', '종료일', '활성상태', '메모'],
        ['홍길동', '010-1234-5678', 'hong@test.com', '찬양팀', 'PRAISE', '팀장', '2024-01-01', '', '활성', '테스트'],
        ['', '', '', '', '', '', '', '', '', ''] // 빈 행
      ]

      const result = validateExcelData(dataWithEmptyRow, ORGANIZATION_MEMBERSHIP_TEMPLATE)

      expect(result.warnings.some(warning => warning.message.includes('빈 행'))).toBe(true)
    })

    it('여러 행의 데이터를 검증한다', () => {
      const multiRowData = [
        ['구성원명*', '전화번호', '이메일', '조직명*', '조직코드', '직책명', '참여일*', '종료일', '활성상태', '메모'],
        ['홍길동', '010-1234-5678', 'hong@test.com', '찬양팀', 'PRAISE', '팀장', '2024-01-01', '', '활성', '테스트1'],
        ['김영희', '010-9876-5432', 'kim@test.com', '교육부', 'EDU', '부장', '2024-02-01', '', '활성', '테스트2'],
        ['박철수', '010-1111-2222', 'park@test.com', '봉사팀', 'SERVICE', '팀원', '2024-03-01', '', '비활성', '테스트3']
      ]

      const result = validateExcelData(multiRowData, ORGANIZATION_MEMBERSHIP_TEMPLATE)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('ORGANIZATION_MEMBERSHIP_TEMPLATE', () => {
    it('올바른 템플릿 구조를 가진다', () => {
      expect(ORGANIZATION_MEMBERSHIP_TEMPLATE.sheetName).toBe('조직구성원')
      expect(Array.isArray(ORGANIZATION_MEMBERSHIP_TEMPLATE.columns)).toBe(true)
      expect(ORGANIZATION_MEMBERSHIP_TEMPLATE.columns.length).toBeGreaterThan(0)
      expect(Array.isArray(ORGANIZATION_MEMBERSHIP_TEMPLATE.sampleData)).toBe(true)
      expect(Array.isArray(ORGANIZATION_MEMBERSHIP_TEMPLATE.instructions)).toBe(true)
    })

    it('필수 필드가 올바르게 표시된다', () => {
      const requiredColumns = ORGANIZATION_MEMBERSHIP_TEMPLATE.columns.filter(col => col.required)
      
      expect(requiredColumns.length).toBeGreaterThan(0)
      expect(requiredColumns.some(col => col.key === 'memberName')).toBe(true)
      expect(requiredColumns.some(col => col.key === 'organizationName')).toBe(true)
      expect(requiredColumns.some(col => col.key === 'joinDate')).toBe(true)
    })

    it('샘플 데이터가 템플릿과 일치한다', () => {
      const columns = ORGANIZATION_MEMBERSHIP_TEMPLATE.columns
      const sampleData = ORGANIZATION_MEMBERSHIP_TEMPLATE.sampleData || []

      expect(sampleData.length).toBeGreaterThan(0)

      sampleData.forEach(sample => {
        columns.forEach(column => {
          if (column.required) {
            expect(sample).toHaveProperty(column.key)
            expect(sample[column.key]).toBeDefined()
          }
        })
      })
    })
  })
})