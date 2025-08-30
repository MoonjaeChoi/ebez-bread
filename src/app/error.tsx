'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  RefreshCw, 
  Home, 
  AlertCircle,
  Bug,
  ArrowLeft 
} from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // 에러 로깅
    console.error('Application Error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto shadow-lg">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle className="h-10 w-10 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            오류가 발생했습니다
          </CardTitle>
          <CardDescription className="text-gray-600">
            시스템에 일시적인 문제가 발생했습니다
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="text-center space-y-2">
            <p className="text-gray-700">
              예상치 못한 오류가 발생했습니다.
            </p>
            <p className="text-sm text-gray-500">
              잠시 후 다시 시도해주세요. 문제가 계속되면 시스템 관리자에게 문의하세요.
            </p>
          </div>

          {/* 에러 정보 (개발 환경에서만) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-2">
                <Bug className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-red-800">
                  개발 정보:
                </span>
              </div>
              <div className="text-xs text-red-700 font-mono bg-red-100 p-2 rounded">
                {error.message}
              </div>
              {error.digest && (
                <div className="text-xs text-red-600 mt-1">
                  Error ID: {error.digest}
                </div>
              )}
            </div>
          )}

          <div className="space-y-3">
            {/* 다시 시도 */}
            <Button 
              className="w-full bg-red-600 hover:bg-red-700 text-white"
              onClick={reset}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              다시 시도
            </Button>

            {/* 홈으로 이동 */}
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => window.location.href = '/'}
            >
              <Home className="h-4 w-4 mr-2" />
              홈으로 이동
            </Button>

            {/* 뒤로 가기 */}
            <Button 
              variant="ghost" 
              className="w-full"
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              이전 페이지로
            </Button>
          </div>

          {/* 도움말 */}
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-600">
              <strong>문제가 계속 발생하나요?</strong><br />
              • 페이지를 새로고침 해보세요<br />
              • 브라우저 캐시를 삭제해보세요<br />
              • 다른 브라우저로 시도해보세요<br />
              • 시스템 관리자에게 문의하세요
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 배경 장식 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-4 -right-4 w-20 h-20 bg-red-200 rounded-full opacity-30 animate-bounce"></div>
        <div className="absolute top-1/3 -left-8 w-16 h-16 bg-orange-200 rounded-full opacity-20 animate-bounce delay-1000"></div>
        <div className="absolute bottom-1/4 right-1/4 w-12 h-12 bg-yellow-200 rounded-full opacity-25 animate-bounce delay-500"></div>
      </div>
    </div>
  )
}