'use client'

import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { httpBatchLink } from '@trpc/client'
import { trpc } from '@/lib/trpc/client'
import { getTRPCUrl } from '@/lib/trpc/client'
import { CACHE_TIMES, STALE_TIMES, RETRY_CONFIG } from '@/lib/constants/cache'

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // 기본 캐시 설정 적용
        staleTime: STALE_TIMES.default,
        cacheTime: CACHE_TIMES.default,
        refetchOnWindowFocus: false,
        refetchOnMount: true,
        refetchOnReconnect: 'always',
        // 재시도 설정
        retry: RETRY_CONFIG.retries,
        retryDelay: RETRY_CONFIG.retryDelay,
        // 서스펜스 및 에러 경계와의 호환성
        suspense: false,
        useErrorBoundary: true,
      },
      mutations: {
        // 뮤테이션 기본 설정
        retry: 1,
        useErrorBoundary: true,
      },
    },
  }))

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: getTRPCUrl(),
          headers() {
            return {
              'Content-Type': 'application/json',
            }
          },
        }),
      ],
    })
  )

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  )
}