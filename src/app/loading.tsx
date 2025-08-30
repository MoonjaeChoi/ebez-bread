'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Church, Loader2 } from 'lucide-react'

export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto shadow-lg">
        <CardContent className="pt-8 pb-8 space-y-6">
          {/* 로고 및 제목 */}
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <Church className="h-8 w-8 text-blue-600" />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-bold text-gray-900">
                과천 교회
              </h1>
              <p className="text-sm text-gray-600">
                교회 관리 시스템
              </p>
            </div>
          </div>

          {/* 로딩 스피너 */}
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <span className="text-sm text-gray-600">
              페이지를 불러오는 중...
            </span>
          </div>

          {/* 로딩 바 */}
          <div className="space-y-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full animate-pulse" 
                   style={{ width: '60%' }}>
              </div>
            </div>
          </div>

          {/* 스켈레톤 UI */}
          <div className="space-y-3">
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>

            <Skeleton className="h-10 w-full" />
          </div>

          {/* 로딩 메시지 */}
          <div className="text-center">
            <p className="text-xs text-gray-500">
              데이터를 안전하게 불러오고 있습니다...
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 배경 애니메이션 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-4 -right-4 w-20 h-20 bg-blue-200 rounded-full opacity-30 animate-pulse"></div>
        <div className="absolute top-1/3 -left-8 w-16 h-16 bg-indigo-200 rounded-full opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute bottom-1/4 right-1/4 w-12 h-12 bg-purple-200 rounded-full opacity-25 animate-pulse delay-500"></div>
        
        {/* 움직이는 원 */}
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-blue-300 rounded-full animate-ping"></div>
        <div className="absolute bottom-1/3 right-1/3 w-3 h-3 bg-indigo-300 rounded-full animate-ping delay-700"></div>
      </div>
    </div>
  )
}