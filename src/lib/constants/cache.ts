// tRPC React Query 캐시 설정 상수
export const CACHE_TIMES = {
  // 조직 데이터 - 자주 변경되지 않으므로 긴 캐시
  organizations: 10 * 60 * 1000,     // 10분
  organizationHierarchy: 15 * 60 * 1000, // 15분
  
  // 직책 데이터 - 비교적 안정적
  roles: 15 * 60 * 1000,             // 15분
  roleHierarchy: 20 * 60 * 1000,     // 20분
  
  // 구성원 데이터 - 자주 변경될 수 있음
  memberships: 3 * 60 * 1000,        // 3분
  membershipList: 2 * 60 * 1000,     // 2분
  membershipHistory: 5 * 60 * 1000,  // 5분
  
  // 통계 데이터 - 실시간성이 중요하지 않음
  statistics: 5 * 60 * 1000,         // 5분
  chartData: 10 * 60 * 1000,         // 10분
  
  // 기본 설정
  default: 2 * 60 * 1000             // 2분
} as const

// Stale time 설정 - 데이터를 신선하다고 간주할 시간
export const STALE_TIMES = {
  organizations: 5 * 60 * 1000,      // 5분
  roles: 10 * 60 * 1000,             // 10분
  memberships: 1 * 60 * 1000,        // 1분
  statistics: 2 * 60 * 1000,         // 2분
  default: 30 * 1000                 // 30초
} as const

// 재시도 설정
export const RETRY_CONFIG = {
  retries: 3,
  retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
} as const

// React Query 기본 옵션
export const DEFAULT_QUERY_OPTIONS = {
  staleTime: STALE_TIMES.default,
  cacheTime: CACHE_TIMES.default,
  ...RETRY_CONFIG,
  refetchOnWindowFocus: false,
  refetchOnMount: true,
  refetchOnReconnect: 'always' as const,
} as const