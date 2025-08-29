import { AccountType, BudgetStatus, BudgetCategory } from '@prisma/client'

export const accountCodeFactory = {
  create: (overrides: Partial<any> = {}) => ({
    id: 'account-1',
    code: '1000',
    name: '현금',
    englishName: 'Cash',
    type: AccountType.ASSET,
    level: 1,
    parentId: null,
    order: 1000,
    allowTransaction: true,
    isActive: true,
    isSystem: false,
    churchId: 'test-church-id',
    createdAt: new Date(),
    updatedAt: new Date(),
    children: [],
    parent: null,
    _count: { children: 0 },
    ...overrides
  }),

  createHierarchy: () => [
    // Level 1 - 관
    {
      id: 'asset-1000',
      code: '1000',
      name: '자산',
      type: AccountType.ASSET,
      level: 1,
      parentId: null,
      order: 1000,
      allowTransaction: false,
      isActive: true,
      isSystem: true,
      churchId: 'test-church-id',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    // Level 2 - 항목
    {
      id: 'asset-1100',
      code: '1100',
      name: '유동자산',
      type: AccountType.ASSET,
      level: 2,
      parentId: 'asset-1000',
      order: 1100,
      allowTransaction: false,
      isActive: true,
      isSystem: true,
      churchId: 'test-church-id',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    // Level 3 - 세목
    {
      id: 'asset-1110',
      code: '1110',
      name: '현금및현금성자산',
      type: AccountType.ASSET,
      level: 3,
      parentId: 'asset-1100',
      order: 1110,
      allowTransaction: false,
      isActive: true,
      isSystem: true,
      churchId: 'test-church-id',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    // Level 4 - 세세목
    {
      id: 'asset-1111',
      code: '1111',
      name: '현금',
      type: AccountType.ASSET,
      level: 4,
      parentId: 'asset-1110',
      order: 1111,
      allowTransaction: true,
      isActive: true,
      isSystem: false,
      churchId: 'test-church-id',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ]
}

export const budgetFactory = {
  create: (overrides: Partial<any> = {}) => ({
    id: 'budget-1',
    name: '2024년 교회 운영예산',
    description: '교회 연간 운영예산',
    year: 2024,
    quarter: null,
    month: null,
    totalAmount: '10000000',
    status: BudgetStatus.ACTIVE,
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-12-31'),
    churchId: 'test-church-id',
    departmentId: 'dept-1',
    createdById: 'test-user-id',
    approvedById: null,
    approvedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    department: {
      id: 'dept-1',
      name: '총무부',
      description: '교회 총무 담당 부서',
      churchId: 'test-church-id',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    createdBy: {
      id: 'test-user-id',
      name: 'Test User',
      email: 'test@example.com'
    },
    approver: null,
    budgetItems: [],
    budgetChanges: [],
    _count: {
      budgetItems: 0,
      budgetChanges: 0
    },
    ...overrides
  }),

  createWithItems: (overrides: Partial<any> = {}) => ({
    ...budgetFactory.create(overrides),
    budgetItems: [
      {
        id: 'item-1',
        name: '사무용품비',
        description: '사무 운영에 필요한 용품 구매',
        amount: '1000000',
        category: BudgetCategory.OPERATIONS,
        code: 'OP001',
        budgetId: 'budget-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        budgetExecution: null
      },
      {
        id: 'item-2', 
        name: '목회활동비',
        description: '목회 활동 관련 경비',
        amount: '2000000',
        category: BudgetCategory.MINISTRY,
        code: 'MIN001',
        budgetId: 'budget-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        budgetExecution: null
      }
    ],
    _count: {
      budgetItems: 2,
      budgetChanges: 0
    }
  })
}

export const transactionFactory = {
  create: (overrides: Partial<any> = {}) => ({
    id: 'transaction-1',
    description: '현금 입금',
    amount: '500000',
    transactionDate: new Date(),
    debitAccountId: 'asset-1111', // 현금 계정
    creditAccountId: 'revenue-1', // 수익 계정
    reference: 'REF001',
    voucherNumber: 'V001',
    churchId: 'test-church-id',
    createdById: 'test-user-id',
    createdAt: new Date(),
    updatedAt: new Date(),
    debitAccount: {
      id: 'asset-1111',
      code: '1111',
      name: '현금',
      type: AccountType.ASSET
    },
    creditAccount: {
      id: 'revenue-1',
      code: '4000',
      name: '헌금수입',
      type: AccountType.REVENUE
    },
    createdBy: {
      id: 'test-user-id',
      name: 'Test User',
      email: 'test@example.com'
    },
    ...overrides
  })
}

export const churchFactory = {
  create: (overrides: Partial<any> = {}) => ({
    id: 'test-church-id',
    name: '테스트교회',
    address: '서울시 테스트구 테스트동 123',
    phone: '02-123-4567',
    email: 'test@church.com',
    pastorName: '김목사',
    description: '테스트용 교회',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  })
}

export const departmentFactory = {
  create: (overrides: Partial<any> = {}) => ({
    id: 'dept-1',
    name: '총무부',
    description: '교회 총무 담당 부서',
    churchId: 'test-church-id',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  })
}