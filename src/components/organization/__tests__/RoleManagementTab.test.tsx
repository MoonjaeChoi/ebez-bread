import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { RoleManagementTab } from '../RoleManagementTab'

// Mock tRPC client
const mockMutation = vi.fn()
const mockQuery = vi.fn()

vi.mock('@/lib/trpc/client', () => ({
  trpc: {
    organizationRoleAssignments: {
      getByOrganization: {
        useQuery: vi.fn(() => ({
          data: null,
          refetch: vi.fn()
        }))
      },
      bulkAssign: {
        useMutation: vi.fn(() => ({
          mutateAsync: mockMutation
        }))
      },
      unassign: {
        useMutation: vi.fn(() => ({
          mutateAsync: mockMutation
        }))
      }
    }
  }
}))

// Mock UI components
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardDescription: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <div>{children}</div>
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  )
}))

vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ checked, onCheckedChange, disabled }: any) => (
    <input 
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      disabled={disabled}
    />
  )
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: any) => <span className={className}>{children}</span>
}))

vi.mock('@/components/ui/alert', () => ({
  Alert: ({ children }: any) => <div>{children}</div>,
  AlertDescription: ({ children }: any) => <div>{children}</div>
}))

vi.mock('@/components/ui/separator', () => ({
  Separator: () => <hr />
}))

describe('RoleManagementTab', () => {
  const mockOrganizations = [
    {
      id: 'org1',
      name: '본부',
      code: 'HQ',
      level: 'CHURCH' as any,
      parentId: null,
      children: [
        {
          id: 'org2',
          name: '사무처',
          code: 'ADMIN',
          level: 'DEPARTMENT' as any,
          parentId: 'org1',
          children: []
        }
      ]
    }
  ]

  const mockRoles = [
    {
      id: 'role1',
      name: '회장',
      englishName: 'President',
      level: 95,
      isLeadership: true,
      description: '조직의 최고 책임자'
    },
    {
      id: 'role2',
      name: '총무',
      englishName: 'Secretary General',
      level: 65,
      isLeadership: true,
      description: '조직의 사무를 총괄'
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('조직도 트리를 렌더링한다', () => {
    render(<RoleManagementTab organizations={mockOrganizations} roles={mockRoles} />)
    
    expect(screen.getByText('조직도')).toBeInTheDocument()
    expect(screen.getByText('본부')).toBeInTheDocument()
    expect(screen.getByText('사무처')).toBeInTheDocument()
  })

  it('조직을 선택할 때 직책 관리 패널이 표시된다', async () => {
    render(<RoleManagementTab organizations={mockOrganizations} roles={mockRoles} />)
    
    // 조직 선택
    fireEvent.click(screen.getByText('본부'))
    
    await waitFor(() => {
      expect(screen.getByText('본부 직책 관리')).toBeInTheDocument()
    })
  })

  it('직책 선택시 할당 상태가 변경된다', async () => {
    render(<RoleManagementTab organizations={mockOrganizations} roles={mockRoles} />)
    
    // 조직 선택
    fireEvent.click(screen.getByText('본부'))
    
    await waitFor(() => {
      const checkbox = screen.getAllByRole('checkbox')[0]
      fireEvent.click(checkbox)
      
      // 변경사항 알림이 표시되는지 확인
      expect(screen.getByText(/변경사항이 있습니다/)).toBeInTheDocument()
    })
  })

  it('리더십 직책과 일반 직책을 구분하여 표시한다', () => {
    render(<RoleManagementTab organizations={mockOrganizations} roles={mockRoles} />)
    
    // 조직 선택
    fireEvent.click(screen.getByText('본부'))
    
    // 리더십 배지 확인
    expect(screen.getByText('리더십')).toBeInTheDocument()
  })

  it('저장 버튼 클릭시 변경사항을 저장한다', async () => {
    mockMutation.mockResolvedValue({})
    
    render(<RoleManagementTab organizations={mockOrganizations} roles={mockRoles} />)
    
    // 조직 선택
    fireEvent.click(screen.getByText('본부'))
    
    await waitFor(async () => {
      const checkbox = screen.getAllByRole('checkbox')[0]
      fireEvent.click(checkbox)
      
      const saveButton = screen.getByText('저장')
      fireEvent.click(saveButton)
      
      await waitFor(() => {
        expect(mockMutation).toHaveBeenCalled()
      })
    })
  })

  it('취소 버튼 클릭시 변경사항을 되돌린다', async () => {
    render(<RoleManagementTab organizations={mockOrganizations} roles={mockRoles} />)
    
    // 조직 선택
    fireEvent.click(screen.getByText('본부'))
    
    await waitFor(() => {
      const checkbox = screen.getAllByRole('checkbox')[0]
      fireEvent.click(checkbox)
      
      const cancelButton = screen.getByText('취소')
      fireEvent.click(cancelButton)
      
      // 변경사항 알림이 사라지는지 확인
      expect(screen.queryByText(/변경사항이 있습니다/)).not.toBeInTheDocument()
    })
  })

  it('빈 조직 목록일 때 적절한 메시지를 표시한다', () => {
    render(<RoleManagementTab organizations={[]} roles={mockRoles} />)
    
    expect(screen.getByText('등록된 조직이 없습니다.')).toBeInTheDocument()
  })

  it('빈 직책 목록일 때 적절한 메시지를 표시한다', () => {
    render(<RoleManagementTab organizations={mockOrganizations} roles={[]} />)
    
    // 조직 선택
    fireEvent.click(screen.getByText('본부'))
    
    expect(screen.getByText('등록된 직책이 없습니다.')).toBeInTheDocument()
  })

  it('조직 확장/축소 기능이 작동한다', () => {
    render(<RoleManagementTab organizations={mockOrganizations} roles={mockRoles} />)
    
    // 확장 버튼 클릭
    const expandButton = screen.getAllByRole('button')[0] // 첫 번째 버튼이 확장 버튼
    fireEvent.click(expandButton)
    
    // 하위 조직이 표시되는지 확인
    expect(screen.getByText('사무처')).toBeInTheDocument()
  })

  it('상속된 직책은 비활성화된 상태로 표시된다', async () => {
    // 상속된 직책 데이터 모킹
    const mockQueryWithInheritance = vi.fn(() => ({
      data: [
        {
          id: 'assignment1',
          roleId: 'role1',
          isActive: true,
          isInherited: true,
          inheritedFrom: 'org1',
          role: mockRoles[0]
        }
      ],
      refetch: vi.fn()
    }))

    vi.mocked(require('@/lib/trpc/client').trpc.organizationRoleAssignments.getByOrganization.useQuery)
      .mockImplementation(mockQueryWithInheritance)

    render(<RoleManagementTab organizations={mockOrganizations} roles={mockRoles} />)
    
    // 조직 선택
    fireEvent.click(screen.getByText('본부'))
    
    await waitFor(() => {
      // 상속된 직책 섹션이 표시되는지 확인
      expect(screen.getByText('상속받은 직책')).toBeInTheDocument()
    })
  })
})