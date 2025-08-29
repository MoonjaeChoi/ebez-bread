import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest'
import { mockDeep, mockReset, DeepMockProxy } from 'vitest-mock-extended'
import { PrismaClient } from '@prisma/client'

// Prisma Mock
export const prismaMock = mockDeep<PrismaClient>()

// Mock Prisma Client
vi.mock('@/lib/db', () => ({
  prisma: prismaMock,
  db: prismaMock
}))

// Session Mock
export const mockSession = {
  user: {
    id: 'test-user-id',
    name: 'Test User',
    email: 'test@example.com',
    role: 'FINANCIAL_MANAGER' as const,
    churchId: 'test-church-id',
    churchName: 'Test Church'
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
}

// tRPC Context Mock
export const mockTRPCContext = {
  prisma: prismaMock,
  session: mockSession,
  req: null,
  res: null
}

beforeEach(() => {
  mockReset(prismaMock)
})

// Setup test environment
beforeAll(() => {
  // Global test setup
  ;(process.env as any).NODE_ENV = 'test'
  process.env.NEXTAUTH_SECRET = 'test-secret'
})

afterAll(() => {
  // Cleanup after all tests
})