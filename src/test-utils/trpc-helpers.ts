import { appRouter } from '@/server/routers/app'
import { mockTRPCContext } from './setup'

// tRPC 프로시저 직접 테스트를 위한 헬퍼
export const createTRPCCaller = () => {
  return appRouter.createCaller(mockTRPCContext)
}

// tRPC 에러 생성 헬퍼
export const createTRPCError = (code: string, message: string) => {
  const error = new Error(message)
  ;(error as any).code = code
  return error
}

// 인증된 컨텍스트 생성
export const createAuthenticatedContext = (overrides: Partial<any> = {}) => ({
  ...mockTRPCContext,
  session: {
    ...mockTRPCContext.session,
    ...overrides
  }
})

// 인증되지 않은 컨텍스트 생성  
export const createUnauthenticatedContext = () => ({
  ...mockTRPCContext,
  session: null
})