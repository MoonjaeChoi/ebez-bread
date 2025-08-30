'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Home, 
  ArrowLeft, 
  Search,
  Church,
  AlertTriangle 
} from 'lucide-react'

export default function NotFound() {
  useEffect(() => {
    // 페이지 방문 로그 (선택사항)
    console.log('404 페이지 방문:', window.location.pathname)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto shadow-lg">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="h-10 w-10 text-red-600" />
          </div>
          <CardTitle className="text-3xl font-bold text-gray-900">
            404
          </CardTitle>
          <CardDescription className="text-lg text-gray-600">
            페이지를 찾을 수 없습니다
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="text-center space-y-2">
            <p className="text-gray-700">
              요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.
            </p>
            <p className="text-sm text-gray-500">
              URL을 확인하시거나 아래 버튼을 통해 다른 페이지로 이동해주세요.
            </p>
          </div>

          <div className="space-y-3">
            {/* 홈으로 이동 */}
            <Link href="/" className="w-full">
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                <Home className="h-4 w-4 mr-2" />
                홈으로 이동
              </Button>
            </Link>

            {/* 대시보드로 이동 */}
            <Link href="/dashboard" className="w-full">
              <Button variant="outline" className="w-full">
                <Church className="h-4 w-4 mr-2" />
                대시보드
              </Button>
            </Link>

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

          {/* 주요 메뉴 링크 */}
          <div className="border-t pt-4">
            <p className="text-sm font-medium text-gray-700 mb-3">
              주요 메뉴:
            </p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <Link 
                href="/dashboard/members" 
                className="text-blue-600 hover:text-blue-800 hover:underline"
              >
                교인 관리
              </Link>
              <Link 
                href="/dashboard/offerings" 
                className="text-blue-600 hover:text-blue-800 hover:underline"
              >
                헌금 관리
              </Link>
              <Link 
                href="/dashboard/attendance" 
                className="text-blue-600 hover:text-blue-800 hover:underline"
              >
                출석 관리
              </Link>
              <Link 
                href="/dashboard/budgets/allocation" 
                className="text-blue-600 hover:text-blue-800 hover:underline"
              >
                예산 관리
              </Link>
            </div>
          </div>

          {/* 도움말 */}
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-600">
              <strong>도움이 필요하시나요?</strong><br />
              시스템 관리자에게 문의하거나 메인 메뉴를 통해 원하는 기능을 찾아보세요.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 배경 장식 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-4 -right-4 w-20 h-20 bg-blue-200 rounded-full opacity-30 animate-pulse"></div>
        <div className="absolute top-1/3 -left-8 w-16 h-16 bg-indigo-200 rounded-full opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute bottom-1/4 right-1/4 w-12 h-12 bg-purple-200 rounded-full opacity-25 animate-pulse delay-500"></div>
      </div>
    </div>
  )
}