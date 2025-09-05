// 조직 레벨별 색상 정의
export const ORGANIZATION_LEVEL_COLORS = {
  LEVEL_1: '#8b5cf6', // 보라색 - 최고 레벨
  LEVEL_2: '#3b82f6', // 파란색
  LEVEL_3: '#10b981', // 초록색
  LEVEL_4: '#f59e0b', // 주황색
  LEVEL_5: '#ef4444', // 빨간색
} as const

// 상태별 색상
export const STATUS_COLORS = {
  active: '#22c55e',      // 활성 - 초록색
  inactive: '#94a3b8',    // 비활성 - 회색
  leadership: '#f59e0b',  // 리더십 - 주황색
  general: '#6b7280',     // 일반 - 회색
} as const

// 차트용 색상 팔레트 (다양한 데이터 시각화에 사용)
export const CHART_COLORS = [
  '#3b82f6', // 파란색
  '#10b981', // 초록색
  '#f59e0b', // 주황색
  '#ef4444', // 빨간색
  '#8b5cf6', // 보라색
  '#f97316', // 오렌지
  '#06b6d4', // 시안
  '#84cc16', // 라임
  '#f43f5e', // 장미색
  '#6366f1', // 인디고
] as const

// 조직 이름 줄이기
export const truncateText = (text: string, maxLength: number = 12): string => {
  if (text.length <= maxLength) return text
  return `${text.substring(0, maxLength)}...`
}

// 숫자를 한글 단위로 포맷팅
export const formatKoreanNumber = (num: number): string => {
  if (num >= 10000) {
    const man = Math.floor(num / 10000)
    const remainder = num % 10000
    if (remainder === 0) {
      return `${man}만`
    }
    return `${man}만 ${remainder.toLocaleString()}`
  }
  return num.toLocaleString()
}

// 퍼센트 포맷팅
export const formatPercentage = (value: number, decimals: number = 1): string => {
  return `${value.toFixed(decimals)}%`
}

// 차트 데이터 색상 매핑
export const getChartColor = (index: number): string => {
  return CHART_COLORS[index % CHART_COLORS.length]
}

// 조직 레벨 색상 가져오기
export const getOrganizationLevelColor = (level: keyof typeof ORGANIZATION_LEVEL_COLORS): string => {
  return ORGANIZATION_LEVEL_COLORS[level] || ORGANIZATION_LEVEL_COLORS.LEVEL_1
}

// 리더십 여부에 따른 색상
export const getRoleTypeColor = (isLeadership: boolean): string => {
  return isLeadership ? STATUS_COLORS.leadership : STATUS_COLORS.general
}

// 활성 상태에 따른 색상
export const getStatusColor = (isActive: boolean): string => {
  return isActive ? STATUS_COLORS.active : STATUS_COLORS.inactive
}

// 커스텀 툴팁 스타일
export const tooltipStyle = {
  backgroundColor: 'white',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  fontSize: '14px',
}

// 범례 스타일
export const legendStyle = {
  paddingTop: '20px',
}

// 반응형 컨테이너 기본 마진
export const chartMargin = {
  top: 20,
  right: 30,
  left: 20,
  bottom: 60,
}

// 기간별 그룹화 유틸리티
export const groupByPeriod = (date: Date, period: 'month' | 'year'): string => {
  if (period === 'month') {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  }
  return `${date.getFullYear()}`
}

// 데이터 정렬 유틸리티
export const sortByValue = <T>(data: T[], key: keyof T, direction: 'asc' | 'desc' = 'desc') => {
  return [...data].sort((a, b) => {
    const aVal = a[key] as number
    const bVal = b[key] as number
    return direction === 'desc' ? bVal - aVal : aVal - bVal
  })
}