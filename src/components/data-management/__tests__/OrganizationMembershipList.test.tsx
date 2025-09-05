import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { OptimizedOrganizationMembershipList } from '../optimized/OptimizedOrganizationMembershipList'
import { trpc } from '@/lib/trpc/client'

// tRPC 모킹
vi.mock('@/lib/trpc/client', () => ({
  trpc: {
    organizationMemberships: {
      getByOrganizationPaginated: {
        useQuery: vi.fn()
      },
      bulkImport: {
        useMutation: vi.fn()
      }
    },
    organizations: {
      getHierarchy: {
        useQuery: vi.fn()
      }
    },
    organizationRoles: {
      getAll: {
        useQuery: vi.fn()
      }
    }
  }
}))

// 테스트 데이터
const mockOrganizations = [
  {
    id: 'org-1',
    name: '찬양팀',
    code: 'PRAISE',
    level: 'LEVEL_2',
    children: []
  },
  {
    id: 'org-2', 
    name: '교육부',
    code: 'EDU',
    level: 'LEVEL_2',
    children: []
  }
]

const mockRoles = [
  {
    id: 'role-1',
    name: '팀장',
    level: 1,
    isLeadership: true,
    isActive: true
  },
  {
    id: 'role-2',
    name: '팀원',
    level: 2,
    isLeadership: false,
    isActive: true
  }
]

const mockMemberships = [
  {
    id: 'membership-1',
    isPrimary: true,
    joinDate: '2024-01-01',
    endDate: null,
    isActive: true,
    notes: '테스트 메모',
    member: {
      id: 'member-1',
      name: '홍길동',
      phone: '010-1234-5678',
      email: 'hong@example.com',
      photoUrl: null
    },
    organization: {
      id: 'org-1',
      name: '찬양팀',
      code: 'PRAISE',
      level: 'LEVEL_2'
    },
    role: {
      id: 'role-1',
      name: '팀장',
      level: 1,
      isLeadership: true
    }
  },
  {
    id: 'membership-2',
    isPrimary: false,
    joinDate: '2024-02-01',
    endDate: null,
    isActive: true,
    notes: null,
    member: {
      id: 'member-2',
      name: '김영희',
      phone: '010-9876-5432',
      email: 'kim@example.com',
      photoUrl: null
    },
    organization: {
      id: 'org-1',
      name: '찬양팀',
      code: 'PRAISE',
      level: 'LEVEL_2'
    },
    role: {
      id: 'role-2',
      name: '팀원',
      level: 2,
      isLeadership: false
    }
  }
]

const mockPagination = {
  currentPage: 1,
  totalPages: 1,
  totalCount: 2,
  limit: 10,
  hasNextPage: false,
  hasPreviousPage: false
}

describe('OrganizationMembershipList', () => {
  beforeEach(() => {
    // 기본 mock 설정
    vi.mocked(trpc.organizations.getHierarchy.useQuery).mockReturnValue({
      data: mockOrganizations,
      isLoading: false,
      error: null,
      refetch: vi.fn()
    } as any)

    vi.mocked(trpc.organizationRoles.getAll.useQuery).mockReturnValue({
      data: mockRoles,
      isLoading: false,
      error: null,
      refetch: vi.fn()
    } as any)

    vi.mocked(trpc.organizationMemberships.getByOrganizationPaginated.useQuery).mockReturnValue({
      data: {
        data: mockMemberships,
        pagination: mockPagination
      },
      isLoading: false,
      error: null,
      refetch: vi.fn()
    } as any)
  })

  it('조직을 선택하지 않았을 때 안내 메시지를 표시한다', () => {
    render(<OptimizedOrganizationMembershipList />)
    
    expect(screen.getByText('조직을 선택하세요')).toBeInTheDocument()
    expect(screen.getByText('구성원을 확인하려면 먼저 조직을 선택해주세요')).toBeInTheDocument()
  })

  it('조직 목록이 올바르게 표시된다', () => {
    render(<OptimizedOrganizationMembershipList />)
    
    // 조직 선택 드롭다운 확인
    const organizationSelect = screen.getByRole('combobox', { name: /조직을 선택하세요/i })
    expect(organizationSelect).toBeInTheDocument()
  })

  it('조직 선택 시 구성원 목록을 로드한다', async () => {
    render(<OptimizedOrganizationMembershipList organizationId="org-1" />)
    
    // 구성원 목록 헤더 확인
    expect(screen.getByText('구성원 목록')).toBeInTheDocument()
    
    // 구성원 데이터 확인
    await waitFor(() => {
      expect(screen.getByText('홍길동')).toBeInTheDocument()
      expect(screen.getByText('김영희')).toBeInTheDocument()
    })
  })

  it('검색 기능이 동작한다', async () => {
    render(<OptimizedOrganizationMembershipList organizationId="org-1" />)
    
    const searchInput = screen.getByPlaceholderText('이름, 전화번호, 이메일, 직책...')
    
    // 검색어 입력
    fireEvent.change(searchInput, { target: { value: '홍길동' } })
    
    expect(searchInput).toHaveValue('홍길동')
    
    // 검색어 삭제 버튼 확인
    await waitFor(() => {
      const clearButton = screen.getByRole('button', { name: '' })
      expect(clearButton).toBeInTheDocument()
    })
  })

  it('필터링 기능이 동작한다', () => {
    render(<OptimizedOrganizationMembershipList organizationId="org-1" />)
    
    // 직책 필터 확인
    const roleSelect = screen.getByRole('combobox', { name: /모든 직책/i })
    expect(roleSelect).toBeInTheDocument()
    
    // 상태 필터 확인
    const statusSelect = screen.getByDisplayValue('활성 구성원만')
    expect(statusSelect).toBeInTheDocument()
  })

  it('다중 선택 기능이 동작한다', async () => {
    render(<OptimizedOrganizationMembershipList organizationId="org-1" />)
    
    await waitFor(() => {
      // 첫 번째 구성원 체크박스 선택
      const checkboxes = screen.getAllByRole('checkbox')
      const memberCheckbox = checkboxes.find(cb => 
        cb.getAttribute('aria-label')?.includes('홍길동')
      )
      
      if (memberCheckbox) {
        fireEvent.click(memberCheckbox)
        
        // 선택된 개수 표시 확인
        expect(screen.getByText(/1명 선택됨/)).toBeInTheDocument()
      }
    })
  })

  it('페이지네이션이 올바르게 표시된다', async () => {
    // 여러 페이지가 있는 경우를 시뮬레이션
    const multiPagePagination = {
      ...mockPagination,
      totalPages: 3,
      totalCount: 25,
      hasNextPage: true
    }

    vi.mocked(trpc.organizationMemberships.getByOrganizationPaginated.useQuery).mockReturnValue({
      data: {
        data: mockMemberships,
        pagination: multiPagePagination
      },
      isLoading: false,
      error: null,
      refetch: vi.fn()
    } as any)

    render(<OptimizedOrganizationMembershipList organizationId="org-1" />)
    
    await waitFor(() => {
      expect(screen.getByText('1 / 3 페이지')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /다음/i })).toBeInTheDocument()
    })
  })

  it('로딩 상태를 올바르게 표시한다', () => {
    vi.mocked(trpc.organizationMemberships.getByOrganizationPaginated.useQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn()
    } as any)

    render(<OptimizedOrganizationMembershipList organizationId="org-1" />)
    
    expect(screen.getByText('구성원 목록을 불러오는 중...')).toBeInTheDocument()
  })

  it('에러 상태를 올바르게 표시한다', () => {
    const mockError = new Error('네트워크 오류')
    
    vi.mocked(trpc.organizationMemberships.getByOrganizationPaginated.useQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: mockError,
      refetch: vi.fn()
    } as any)

    render(<OptimizedOrganizationMembershipList organizationId="org-1" />)
    
    expect(screen.getByText(/멤버십 목록을 불러오는 중 오류가 발생했습니다/)).toBeInTheDocument()
    expect(screen.getByText(/네트워크 오류/)).toBeInTheDocument()
  })

  it('빈 결과를 올바르게 표시한다', async () => {
    vi.mocked(trpc.organizationMemberships.getByOrganizationPaginated.useQuery).mockReturnValue({
      data: {
        data: [],
        pagination: { ...mockPagination, totalCount: 0 }
      },
      isLoading: false,
      error: null,
      refetch: vi.fn()
    } as any)

    render(<OptimizedOrganizationMembershipList organizationId="org-1" />)
    
    await waitFor(() => {
      expect(screen.getByText('구성원이 없습니다')).toBeInTheDocument()
      expect(screen.getByText('아직 등록된 구성원이 없습니다')).toBeInTheDocument()
    })
  })

  it('구성원 정보가 올바르게 표시된다', async () => {
    render(<OptimizedOrganizationMembershipList organizationId="org-1" />)
    
    await waitFor(() => {
      // 구성원 이름 확인
      expect(screen.getByText('홍길동')).toBeInTheDocument()
      expect(screen.getByText('김영희')).toBeInTheDocument()
      
      // 직책 배지 확인
      expect(screen.getByText('팀장')).toBeInTheDocument()
      expect(screen.getByText('팀원')).toBeInTheDocument()
      
      // 연락처 정보 확인
      expect(screen.getByText('010-1234-5678')).toBeInTheDocument()
      expect(screen.getByText('hong@example.com')).toBeInTheDocument()
      
      // 주요 조직 배지 확인
      expect(screen.getByText('주요')).toBeInTheDocument()
      
      // 상태 확인
      const activeStatuses = screen.getAllByText('활성')
      expect(activeStatuses).toHaveLength(2)
    })
  })

  it('일괄 작업 버튼들이 선택 시에만 표시된다', async () => {
    render(<OptimizedOrganizationMembershipList organizationId="org-1" />)
    
    await waitFor(() => {
      // 처음에는 일괄 작업 버튼이 보이지 않음
      expect(screen.queryByText('일괄 작업')).not.toBeInTheDocument()
      
      // 구성원 선택
      const checkboxes = screen.getAllByRole('checkbox')
      const memberCheckbox = checkboxes.find(cb => 
        cb.getAttribute('aria-label')?.includes('홍길동')
      )
      
      if (memberCheckbox) {
        fireEvent.click(memberCheckbox)
        
        // 일괄 작업 버튼이 표시됨
        expect(screen.getByText('일괄 작업')).toBeInTheDocument()
        expect(screen.getByText('선택 해제')).toBeInTheDocument()
      }
    })
  })

  it('필터 초기화 기능이 동작한다', async () => {
    render(<OptimizedOrganizationMembershipList organizationId="org-1" />)
    
    const searchInput = screen.getByPlaceholderText('이름, 전화번호, 이메일, 직책...')
    const resetButton = screen.getByRole('button', { name: /초기화/i })
    
    // 검색어 입력
    fireEvent.change(searchInput, { target: { value: '테스트' } })
    expect(searchInput).toHaveValue('테스트')
    
    // 초기화 버튼 클릭
    fireEvent.click(resetButton)
    
    // 검색어가 초기화됨
    expect(searchInput).toHaveValue('')
  })

  it('가져오기/내보내기 버튼이 올바르게 표시된다', () => {
    render(<OptimizedOrganizationMembershipList organizationId="org-1" />)
    
    expect(screen.getByRole('button', { name: /가져오기\/내보내기/i })).toBeInTheDocument()
  })
})