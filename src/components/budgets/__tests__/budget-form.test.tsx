import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@test-utils/react-helpers'
import { BudgetForm } from '../budget-form'
import { budgetFactory, departmentFactory } from '@test-utils/factories'
import { BudgetCategory } from '@prisma/client'

// Mock the tRPC client
const mockUseQuery = vi.fn()
const mockUseMutation = vi.fn()

vi.mock('@/lib/trpc/client', () => ({
  trpc: {
    budgets: {
      getById: {
        useQuery: mockUseQuery
      },
      create: {
        useMutation: mockUseMutation
      },
      update: {
        useMutation: mockUseMutation
      }
    },
    departments: {
      getAll: {
        useQuery: () => ({
          data: [departmentFactory.create()],
          isLoading: false
        })
      }
    }
  }
}))

// Mock react-hook-form
const mockUseForm = vi.fn()
vi.mock('react-hook-form', () => ({
  useForm: mockUseForm,
  useFieldArray: () => ({
    fields: [],
    append: vi.fn(),
    remove: vi.fn()
  }),
  Controller: ({ render }: any) => render({ field: { onChange: vi.fn(), value: '' } })
}))

describe('BudgetForm Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    mockUseForm.mockReturnValue({
      control: {},
      handleSubmit: vi.fn((fn) => (e: any) => {
        e?.preventDefault?.()
        return fn({
          name: '테스트 예산',
          year: 2024,
          totalAmount: 1000000,
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
          departmentId: 'dept-1',
          budgetItems: [
            {
              name: '사무용품비',
              amount: 1000000,
              category: BudgetCategory.OPERATIONS,
              code: 'OP001'
            }
          ]
        })
      }),
      formState: { errors: {}, isSubmitting: false },
      watch: vi.fn(),
      setValue: vi.fn(),
      reset: vi.fn()
    })

    mockUseMutation.mockReturnValue({
      mutate: vi.fn(),
      isLoading: false,
      isError: false,
      error: null
    })
  })

  it('should render create mode form correctly', () => {
    render(<BudgetForm />)

    expect(screen.getByText('예산 생성')).toBeInTheDocument()
    expect(screen.getByLabelText('예산명')).toBeInTheDocument()
    expect(screen.getByLabelText('예산 년도')).toBeInTheDocument()
    expect(screen.getByLabelText('시작일')).toBeInTheDocument()
    expect(screen.getByLabelText('종료일')).toBeInTheDocument()
    expect(screen.getByLabelText('부서')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '예산 항목 추가' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '생성' })).toBeInTheDocument()
  })

  it('should render edit mode form correctly', async () => {
    const mockBudget = budgetFactory.createWithItems()
    
    mockUseQuery.mockReturnValue({
      data: mockBudget,
      isLoading: false,
      isError: false
    })

    render(<BudgetForm budgetId="budget-1" />)

    await waitFor(() => {
      expect(screen.getByText('예산 수정')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '수정' })).toBeInTheDocument()
    })
  })

  it('should show loading state when fetching budget data', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false
    })

    render(<BudgetForm budgetId="budget-1" />)

    expect(screen.getByText('예산 정보를 불러오는 중...')).toBeInTheDocument()
  })

  it('should handle form submission for create mode', async () => {
    const mockMutate = vi.fn()
    mockUseMutation.mockReturnValue({
      mutate: mockMutate,
      isLoading: false
    })

    render(<BudgetForm />)

    const form = screen.getByRole('form')
    fireEvent.submit(form)

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith({
        name: '테스트 예산',
        year: 2024,
        totalAmount: 1000000,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        departmentId: 'dept-1',
        budgetItems: [
          {
            name: '사무용품비',
            amount: 1000000,
            category: BudgetCategory.OPERATIONS,
            code: 'OP001'
          }
        ]
      })
    })
  })

  it('should handle form submission for edit mode', async () => {
    const mockBudget = budgetFactory.create()
    mockUseQuery.mockReturnValue({
      data: mockBudget,
      isLoading: false,
      isError: false
    })

    const mockMutate = vi.fn()
    mockUseMutation.mockReturnValue({
      mutate: mockMutate,
      isLoading: false
    })

    render(<BudgetForm budgetId="budget-1" />)

    const form = await screen.findByRole('form')
    fireEvent.submit(form)

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'budget-1'
        })
      )
    })
  })

  it('should show submission loading state', () => {
    mockUseMutation.mockReturnValue({
      mutate: vi.fn(),
      isLoading: true
    })

    render(<BudgetForm />)

    expect(screen.getByText('생성 중...')).toBeInTheDocument()
  })

  it('should display form validation errors', () => {
    mockUseForm.mockReturnValue({
      control: {},
      handleSubmit: vi.fn(),
      formState: { 
        errors: {
          name: { message: '예산명을 입력해주세요' },
          totalAmount: { message: '총 예산액은 0 이상이어야 합니다' }
        },
        isSubmitting: false 
      },
      watch: vi.fn(),
      setValue: vi.fn(),
      reset: vi.fn()
    })

    render(<BudgetForm />)

    expect(screen.getByText('예산명을 입력해주세요')).toBeInTheDocument()
    expect(screen.getByText('총 예산액은 0 이상이어야 합니다')).toBeInTheDocument()
  })

  it('should calculate total amount automatically', () => {
    const mockWatch = vi.fn()
    const mockSetValue = vi.fn()
    
    mockWatch.mockImplementation((field) => {
      if (field === 'budgetItems') {
        return [
          { amount: 500000 },
          { amount: 300000 }
        ]
      }
      return undefined
    })

    mockUseForm.mockReturnValue({
      control: {},
      handleSubmit: vi.fn(),
      formState: { errors: {}, isSubmitting: false },
      watch: mockWatch,
      setValue: mockSetValue,
      reset: vi.fn()
    })

    render(<BudgetForm />)

    // Should calculate and set total amount
    expect(mockSetValue).toHaveBeenCalledWith('totalAmount', 800000)
  })

  it('should show total amount mismatch warning', () => {
    const mockWatch = vi.fn()
    
    mockWatch.mockImplementation((field) => {
      if (field === 'budgetItems') {
        return [{ amount: 500000 }]
      }
      if (field === 'totalAmount') {
        return 1000000 // Different from items total
      }
      return undefined
    })

    mockUseForm.mockReturnValue({
      control: {},
      handleSubmit: vi.fn(),
      formState: { errors: {}, isSubmitting: false },
      watch: mockWatch,
      setValue: vi.fn(),
      reset: vi.fn()
    })

    render(<BudgetForm />)

    expect(screen.getByText(/항목별 합계와 총액이 일치하지 않습니다/)).toBeInTheDocument()
  })

  it('should handle quarter and month selection', () => {
    render(<BudgetForm />)

    expect(screen.getByLabelText('분기 (선택)')).toBeInTheDocument()
    expect(screen.getByLabelText('월 (선택)')).toBeInTheDocument()
  })

  it('should validate budget item categories', () => {
    render(<BudgetForm />)

    // Should show category options
    expect(screen.getByText('운영비')).toBeInTheDocument()
    expect(screen.getByText('사역비')).toBeInTheDocument()
    expect(screen.getByText('시설비')).toBeInTheDocument()
  })

  it('should handle error state from API', () => {
    mockUseMutation.mockReturnValue({
      mutate: vi.fn(),
      isLoading: false,
      isError: true,
      error: { message: '예산 생성에 실패했습니다' }
    })

    render(<BudgetForm />)

    expect(screen.getByText('예산 생성에 실패했습니다')).toBeInTheDocument()
  })

  it('should reset form when onCancel is called', () => {
    const mockReset = vi.fn()
    const onCancel = vi.fn()

    mockUseForm.mockReturnValue({
      control: {},
      handleSubmit: vi.fn(),
      formState: { errors: {}, isSubmitting: false },
      watch: vi.fn(),
      setValue: vi.fn(),
      reset: mockReset
    })

    render(<BudgetForm onCancel={onCancel} />)

    const cancelButton = screen.getByRole('button', { name: '취소' })
    fireEvent.click(cancelButton)

    expect(onCancel).toHaveBeenCalled()
  })

  it('should handle success callback after form submission', async () => {
    const onSuccess = vi.fn()
    const mockMutate = vi.fn((data, { onSuccess: successCallback }) => {
      successCallback?.(budgetFactory.create())
    })

    mockUseMutation.mockReturnValue({
      mutate: mockMutate,
      isLoading: false
    })

    render(<BudgetForm onSuccess={onSuccess} />)

    const form = screen.getByRole('form')
    fireEvent.submit(form)

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(expect.any(Object))
    })
  })
})