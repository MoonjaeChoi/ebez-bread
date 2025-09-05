import jsPDF from 'jspdf'
import { saveAs } from 'file-saver'

// PDF 보고서 생성을 위한 타입 정의
interface PDFReportColumn {
  key: string
  label: string
  width: number
  align?: 'left' | 'center' | 'right'
}

interface PDFReportConfig {
  title: string
  subtitle?: string
  columns: PDFReportColumn[]
  data: any[]
  filename?: string
  author?: string
  subject?: string
}

// 한글 폰트 설정을 위한 유틸리티
export function setupKoreanFont(doc: jsPDF) {
  // 기본 폰트로 한글 지원 폰트 설정 시도
  try {
    doc.setFont('Arial Unicode MS', 'normal')
  } catch {
    // 폰트가 없으면 기본 폰트 사용
    doc.setFont('helvetica', 'normal')
  }
}

// 조직 구성원 PDF 보고서 생성
export function generateOrganizationMembershipReport(config: PDFReportConfig): void {
  const doc = new jsPDF('landscape', 'mm', 'a4') // A4 가로 방향
  
  // 페이지 여백
  const margin = {
    top: 20,
    left: 20,
    right: 20,
    bottom: 20
  }
  
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const contentWidth = pageWidth - margin.left - margin.right
  
  let currentY = margin.top
  
  // 한글 폰트 설정
  setupKoreanFont(doc)
  
  // 제목
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  const titleText = config.title || '조직 구성원 보고서'
  const titleWidth = doc.getTextWidth(titleText)
  doc.text(titleText, (pageWidth - titleWidth) / 2, currentY)
  currentY += 15
  
  // 부제목
  if (config.subtitle) {
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    const subtitleWidth = doc.getTextWidth(config.subtitle)
    doc.text(config.subtitle, (pageWidth - subtitleWidth) / 2, currentY)
    currentY += 10
  }
  
  // 생성일시
  doc.setFontSize(10)
  const dateText = `생성일시: ${new Date().toLocaleString('ko-KR')}`
  doc.text(dateText, pageWidth - margin.right - doc.getTextWidth(dateText), currentY)
  currentY += 15
  
  // 테이블 헤더
  const startY = currentY
  const cellHeight = 8
  let startX = margin.left
  
  // 헤더 배경색
  doc.setFillColor(79, 70, 229) // 파란색 배경
  doc.rect(margin.left, startY, contentWidth, cellHeight, 'F')
  
  // 헤더 텍스트
  doc.setTextColor(255, 255, 255) // 흰색 텍스트
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  
  config.columns.forEach(column => {
    const x = startX + (column.width * contentWidth / 100)
    const textX = startX + (column.width * contentWidth / 100 / 2)
    
    // 헤더 텍스트 중앙 정렬
    const textWidth = doc.getTextWidth(column.label)
    doc.text(column.label, textX - (textWidth / 2), startY + 5)
    
    startX += (column.width * contentWidth / 100)
  })
  
  currentY = startY + cellHeight
  
  // 테이블 데이터
  doc.setTextColor(0, 0, 0) // 검은색 텍스트
  doc.setFont('helvetica', 'normal')
  
  const rowsPerPage = Math.floor((pageHeight - currentY - margin.bottom) / cellHeight)
  let currentRow = 0
  
  config.data.forEach((row, index) => {
    // 새 페이지가 필요한 경우
    if (currentRow >= rowsPerPage) {
      doc.addPage()
      currentY = margin.top
      currentRow = 0
      
      // 새 페이지에 헤더 다시 그리기
      doc.setFillColor(79, 70, 229)
      doc.rect(margin.left, currentY, contentWidth, cellHeight, 'F')
      
      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      startX = margin.left
      
      config.columns.forEach(column => {
        const textX = startX + (column.width * contentWidth / 100 / 2)
        const textWidth = doc.getTextWidth(column.label)
        doc.text(column.label, textX - (textWidth / 2), currentY + 5)
        startX += (column.width * contentWidth / 100)
      })
      
      currentY += cellHeight
      doc.setTextColor(0, 0, 0)
      doc.setFont('helvetica', 'normal')
    }
    
    // 행 배경색 (짝수 행)
    if (index % 2 === 0) {
      doc.setFillColor(248, 250, 252) // 연한 회색
      doc.rect(margin.left, currentY, contentWidth, cellHeight, 'F')
    }
    
    // 행 테두리
    doc.setDrawColor(229, 231, 235)
    doc.rect(margin.left, currentY, contentWidth, cellHeight, 'S')
    
    startX = margin.left
    config.columns.forEach(column => {
      const cellWidth = (column.width * contentWidth / 100)
      const value = formatCellValue(row[column.key], column)
      
      // 텍스트 정렬
      let textX = startX + 2 // 기본 왼쪽 정렬 + 패딩
      if (column.align === 'center') {
        textX = startX + (cellWidth / 2) - (doc.getTextWidth(value) / 2)
      } else if (column.align === 'right') {
        textX = startX + cellWidth - doc.getTextWidth(value) - 2
      }
      
      // 텍스트가 셀을 벗어나지 않도록 자르기
      const maxWidth = cellWidth - 4
      const truncatedValue = truncateText(doc, value, maxWidth)
      
      doc.text(truncatedValue, textX, currentY + 5)
      startX += cellWidth
    })
    
    currentY += cellHeight
    currentRow++
  })
  
  // 요약 정보 (마지막 페이지 하단)
  const summaryY = pageHeight - margin.bottom - 20
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  
  const totalCount = config.data.length
  const summaryText = `총 ${totalCount}명의 구성원 정보가 포함되어 있습니다.`
  doc.text(summaryText, margin.left, summaryY)
  
  // 생성자 정보
  if (config.author) {
    doc.text(`생성자: ${config.author}`, margin.left, summaryY + 8)
  }
  
  // PDF 저장
  const filename = config.filename || `조직구성원_보고서_${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(filename)
}

// 셀 값 포맷팅
function formatCellValue(value: any, column: PDFReportColumn): string {
  if (value === null || value === undefined) return ''
  
  // 날짜 포맷팅
  if (column.key.includes('Date') && value) {
    return new Date(value).toLocaleDateString('ko-KR')
  }
  
  // 불린 값 포맷팅
  if (typeof value === 'boolean') {
    return value ? '활성' : '비활성'
  }
  
  return String(value)
}

// 텍스트 자르기 (셀 너비에 맞게)
function truncateText(doc: jsPDF, text: string, maxWidth: number): string {
  if (doc.getTextWidth(text) <= maxWidth) {
    return text
  }
  
  let truncated = text
  while (doc.getTextWidth(truncated + '...') > maxWidth && truncated.length > 0) {
    truncated = truncated.slice(0, -1)
  }
  
  return truncated + '...'
}

// 조직 구성원 관리를 위한 PDF 보고서 설정
export const ORGANIZATION_MEMBERSHIP_PDF_CONFIG: Omit<PDFReportConfig, 'data'> = {
  title: '조직 구성원 현황 보고서',
  subtitle: '',
  columns: [
    { key: 'memberName', label: '구성원명', width: 15, align: 'left' },
    { key: 'organizationName', label: '조직명', width: 20, align: 'left' },
    { key: 'roleName', label: '직책명', width: 15, align: 'left' },
    { key: 'memberPhone', label: '연락처', width: 15, align: 'left' },
    { key: 'memberEmail', label: '이메일', width: 20, align: 'left' },
    { key: 'joinDate', label: '참여일', width: 10, align: 'center' },
    { key: 'isActive', label: '상태', width: 5, align: 'center' }
  ],
  filename: `조직구성원_현황_${new Date().toISOString().split('T')[0]}.pdf`
}

// 간단한 PDF 통계 보고서 생성
export function generateMembershipStatsReport(
  organizationName: string,
  stats: {
    totalMembers: number
    activeMembers: number
    inactiveMembers: number
    leadershipMembers: number
    roleDistribution: { roleName: string; count: number }[]
  }
): void {
  const doc = new jsPDF('portrait', 'mm', 'a4')
  
  const margin = { top: 20, left: 20, right: 20, bottom: 20 }
  const pageWidth = doc.internal.pageSize.getWidth()
  let currentY = margin.top
  
  setupKoreanFont(doc)
  
  // 제목
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  const title = `${organizationName} 구성원 통계 보고서`
  const titleWidth = doc.getTextWidth(title)
  doc.text(title, (pageWidth - titleWidth) / 2, currentY)
  currentY += 20
  
  // 생성일시
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  const dateText = `생성일시: ${new Date().toLocaleString('ko-KR')}`
  doc.text(dateText, pageWidth - margin.right - doc.getTextWidth(dateText), currentY)
  currentY += 20
  
  // 전체 통계
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('전체 현황', margin.left, currentY)
  currentY += 15
  
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  
  const statsText = [
    `전체 구성원: ${stats.totalMembers}명`,
    `활성 구성원: ${stats.activeMembers}명`,
    `비활성 구성원: ${stats.inactiveMembers}명`,
    `리더십 직책: ${stats.leadershipMembers}명`
  ]
  
  statsText.forEach(text => {
    doc.text(text, margin.left + 10, currentY)
    currentY += 8
  })
  
  currentY += 10
  
  // 직책별 분포
  if (stats.roleDistribution.length > 0) {
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('직책별 구성원 분포', margin.left, currentY)
    currentY += 15
    
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    
    stats.roleDistribution.forEach(role => {
      doc.text(`• ${role.roleName}: ${role.count}명`, margin.left + 10, currentY)
      currentY += 8
    })
  }
  
  // PDF 저장
  const filename = `${organizationName}_통계_${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(filename)
}