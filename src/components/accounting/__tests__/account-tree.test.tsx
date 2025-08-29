import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@test-utils/react-helpers'
import { AccountTree } from '../account-tree'
import { accountCodeFactory } from '@test-utils/factories'
import { AccountType } from '@prisma/client'

// Mock the tRPC client
const mockUseQuery = vi.fn()
const mockUseMutation = vi.fn()

vi.mock('@/lib/trpc/client', () => ({
  trpc: {
    accountCodes: {
      getAll: {
        useQuery: mockUseQuery
      },
      delete: {
        useMutation: mockUseMutation
      }
    }
  }
}))

describe('AccountTree Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseMutation.mockReturnValue({
      mutate: vi.fn(),
      isLoading: false
    })
  })

  it('should render loading skeleton when data is loading', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null
    })

    render(<AccountTree />)

    expect(screen.getByText('계정과목')).toBeInTheDocument()
    // Loading skeletons should be present
    expect(document.querySelectorAll('.animate-pulse')).toHaveLength(5)
  })

  it('should render account hierarchy correctly', async () => {
    const mockAccounts = [
      accountCodeFactory.create({
        id: 'asset-1000',
        code: '1000',
        name: '자산',
        type: AccountType.ASSET,
        level: 1,
        children: [
          {
            id: 'asset-1100',
            code: '1100',
            name: '유동자산',
            type: AccountType.ASSET,
            level: 2,
            children: [
              {
                id: 'asset-1111',
                code: '1111',
                name: '현금',
                type: AccountType.ASSET,
                level: 4,
                children: []
              }
            ]
          }
        ]
      })
    ]

    mockUseQuery.mockReturnValue({
      data: mockAccounts,
      isLoading: false,
      error: null
    })

    render(<AccountTree />)

    await waitFor(() => {
      expect(screen.getByText('1000 자산')).toBeInTheDocument()
      expect(screen.getByText('1100 유동자산')).toBeInTheDocument()
      expect(screen.getByText('1111 현금')).toBeInTheDocument()
    })
  })

  it('should expand and collapse account nodes', async () => {
    const mockAccounts = [
      accountCodeFactory.create({
        id: 'asset-1000',
        code: '1000',
        name: '자산',
        children: [
          {
            id: 'asset-1100',
            code: '1100',
            name: '유동자산',
            children: []
          }
        ]
      })
    ]

    mockUseQuery.mockReturnValue({
      data: mockAccounts,
      isLoading: false,
      error: null
    })

    render(<AccountTree />)

    const expandButton = screen.getByRole('button', { name: /expand/i })
    
    // Initially collapsed
    expect(screen.queryByText('1100 유동자산')).not.toBeInTheDocument()
    
    // Click to expand
    fireEvent.click(expandButton)
    
    await waitFor(() => {
      expect(screen.getByText('1100 유동자산')).toBeInTheDocument()
    })
  })

  it('should handle account selection', async () => {
    const mockAccounts = [
      accountCodeFactory.create({
        id: 'asset-1000',
        code: '1000',
        name: '자산'
      })
    ]
    
    const onSelectAccount = vi.fn()

    mockUseQuery.mockReturnValue({
      data: mockAccounts,
      isLoading: false,
      error: null
    })

    render(<AccountTree onSelectAccount={onSelectAccount} />)

    const accountItem = screen.getByText('1000 자산')
    fireEvent.click(accountItem)

    expect(onSelectAccount).toHaveBeenCalledWith(mockAccounts[0])
  })

  it('should show action buttons when showActions is true', async () => {
    const mockAccounts = [
      accountCodeFactory.create({
        id: 'asset-1000',
        code: '1000',
        name: '자산',
        isSystem: false
      })
    ]

    mockUseQuery.mockReturnValue({
      data: mockAccounts,
      isLoading: false,
      error: null
    })

    render(<AccountTree showActions={true} />)

    await waitFor(() => {
      // Should show action buttons for non-system accounts
      expect(screen.getByRole('button', { name: /add child/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
    })
  })

  it('should not show delete button for system accounts', async () => {
    const mockAccounts = [
      accountCodeFactory.create({
        id: 'asset-1000',
        code: '1000',
        name: '자산',
        isSystem: true
      })
    ]

    mockUseQuery.mockReturnValue({
      data: mockAccounts,
      isLoading: false,
      error: null
    })

    render(<AccountTree showActions={true} />)

    await waitFor(() => {
      expect(screen.getByText('1000 자산')).toBeInTheDocument()
      // System accounts should not have delete button
      expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
    })
  })

  it('should handle delete confirmation', async () => {
    const mockAccounts = [
      accountCodeFactory.create({
        id: 'asset-1000',
        code: '1000',
        name: '자산',
        isSystem: false,
        _count: { children: 0 }
      })
    ]

    const mockMutate = vi.fn()
    mockUseMutation.mockReturnValue({
      mutate: mockMutate,
      isLoading: false
    })

    mockUseQuery.mockReturnValue({
      data: mockAccounts,
      isLoading: false,
      error: null
    })

    render(<AccountTree showActions={true} />)

    const deleteButton = await screen.findByRole('button', { name: /delete/i })
    fireEvent.click(deleteButton)

    // Should show confirmation dialog
    const confirmButton = await screen.findByRole('button', { name: /삭제/i })
    fireEvent.click(confirmButton)

    expect(mockMutate).toHaveBeenCalledWith({ id: 'asset-1000' })
  })

  it('should filter accounts by type', async () => {
    const mockAccounts = [
      accountCodeFactory.create({
        code: '1000',
        name: '자산',
        type: AccountType.ASSET
      })
    ]

    mockUseQuery.mockReturnValue({
      data: mockAccounts,
      isLoading: false,
      error: null
    })

    render(<AccountTree accountType={AccountType.ASSET} />)

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        accountType: AccountType.ASSET
      })
    )
  })

  it('should display account type badges correctly', async () => {
    const mockAccounts = [
      accountCodeFactory.create({
        code: '1000',
        name: '자산',
        type: AccountType.ASSET
      }),
      accountCodeFactory.create({
        code: '2000',
        name: '부채',
        type: AccountType.LIABILITY
      })
    ]

    mockUseQuery.mockReturnValue({
      data: mockAccounts,
      isLoading: false,
      error: null
    })

    render(<AccountTree />)

    await waitFor(() => {
      expect(screen.getByText('자산')).toBeInTheDocument()
      expect(screen.getByText('부채')).toBeInTheDocument()
    })
  })

  it('should handle empty state', () => {
    mockUseQuery.mockReturnValue({
      data: [],
      isLoading: false,
      error: null
    })

    render(<AccountTree />)

    expect(screen.getByText('계정과목이 없습니다')).toBeInTheDocument()
  })

  it('should handle error state', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { message: '데이터를 불러올 수 없습니다' }
    })

    render(<AccountTree />)

    expect(screen.getByText('계정과목을 불러오는 중 오류가 발생했습니다')).toBeInTheDocument()
  })

  it('should call onCreateAccount when add button is clicked', async () => {
    const mockAccounts = [
      accountCodeFactory.create({
        id: 'asset-1000',
        code: '1000',
        name: '자산',
        level: 1
      })
    ]

    const onCreateAccount = vi.fn()

    mockUseQuery.mockReturnValue({
      data: mockAccounts,
      isLoading: false,
      error: null
    })

    render(
      <AccountTree 
        showActions={true} 
        onCreateAccount={onCreateAccount} 
      />
    )

    const addButton = await screen.findByRole('button', { name: /add child/i })
    fireEvent.click(addButton)

    expect(onCreateAccount).toHaveBeenCalledWith('asset-1000')
  })

  it('should respect maxLevel constraint', async () => {
    const mockAccounts = [
      accountCodeFactory.create({
        id: 'asset-1111',
        code: '1111',
        name: '현금',
        level: 4 // Max level
      })
    ]

    mockUseQuery.mockReturnValue({
      data: mockAccounts,
      isLoading: false,
      error: null
    })

    render(
      <AccountTree 
        showActions={true} 
        maxLevel={4}
      />
    )

    await waitFor(() => {
      // Should not show add button for max level accounts
      expect(screen.queryByRole('button', { name: /add child/i })).not.toBeInTheDocument()
    })
  })
})