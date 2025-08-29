import React from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createTRPCReact } from '@trpc/react-query'
import { AppRouter } from '@/server/routers/app'
import { SessionProvider } from 'next-auth/react'
import { mockSession } from './setup'

// Create tRPC React client for testing
export const trpc = createTRPCReact<AppRouter>()

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
})

interface AllTheProvidersProps {
  children: React.ReactNode
  queryClient?: QueryClient
  session?: any
}

const AllTheProviders = ({ 
  children, 
  queryClient = createTestQueryClient(),
  session = mockSession
}: AllTheProvidersProps) => {
  const trpcClient = trpc.createClient({
    links: [
      // Mock link that returns mock data
      {
        request: () => {
          return new Promise((resolve) => {
            resolve({
              result: {
                data: null,
                type: 'data'
              }
            })
          })
        }
      }
    ] as any,
  })

  return (
    <SessionProvider session={session}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </trpc.Provider>
    </SessionProvider>
  )
}

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & {
    queryClient?: QueryClient
    session?: any
  }
) => {
  const { queryClient, session, ...renderOptions } = options || {}
  
  return render(ui, {
    wrapper: ({ children }) => (
      <AllTheProviders queryClient={queryClient} session={session}>
        {children}
      </AllTheProviders>
    ),
    ...renderOptions,
  })
}

// Re-export everything
export * from '@testing-library/react'
export { customRender as render }

// Helper to create mock tRPC response
export const mockTRPCResponse = (data: any) => ({
  data,
  isLoading: false,
  isError: false,
  error: null,
  refetch: vi.fn(),
  fetchStatus: 'idle' as const,
  status: 'success' as const,
})

// Helper to create loading tRPC response
export const mockTRPCLoading = () => ({
  data: undefined,
  isLoading: true,
  isError: false,
  error: null,
  refetch: vi.fn(),
  fetchStatus: 'fetching' as const,
  status: 'loading' as const,
})

// Helper to create error tRPC response
export const mockTRPCError = (error: string) => ({
  data: undefined,
  isLoading: false,
  isError: true,
  error: { message: error },
  refetch: vi.fn(),
  fetchStatus: 'idle' as const,
  status: 'error' as const,
})