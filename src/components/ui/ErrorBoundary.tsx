'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    this.setState({
      error,
      errorInfo
    })

    // 선택적 에러 리포팅
    this.props.onError?.(error, errorInfo)

    // 프로덕션 환경에서 글로벌 에러 로깅
    if (process.env.NODE_ENV === 'production') {
      console.error('Global Error:', error, errorInfo)
      // 예: Sentry, LogRocket 등으로 전송 가능
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  private handleReload = () => {
    window.location.reload()
  }

  public render() {
    if (this.state.hasError) {
      // 커스텀 fallback이 있으면 사용
      if (this.props.fallback) {
        return this.props.fallback
      }

      // 기본 에러 UI
      return (
        <div className="flex items-center justify-center min-h-[400px] p-6">
          <div className="max-w-md w-full">
            <Alert className="border-red-200">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <AlertDescription className="text-red-700">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">오류가 발생했습니다</h3>
                    <p className="text-sm text-red-600 mb-4">
                      예기치 못한 오류가 발생했습니다. 문제가 지속되면 관리자에게 문의하세요.
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={this.handleReset}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      다시 시도
                    </Button>
                    <Button
                      onClick={this.handleReload}
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      페이지 새로고침
                    </Button>
                  </div>

                  {process.env.NODE_ENV === 'development' && this.state.error && (
                    <details className="mt-4">
                      <summary className="text-xs cursor-pointer hover:text-red-800">
                        개발자 정보 (펼쳐보기)
                      </summary>
                      <div className="mt-2 p-3 bg-red-50 rounded border text-xs font-mono overflow-auto max-h-32">
                        <div className="mb-2">
                          <strong>Error:</strong> {this.state.error.message}
                        </div>
                        <div>
                          <strong>Stack:</strong>
                          <pre className="whitespace-pre-wrap">
                            {this.state.error.stack}
                          </pre>
                        </div>
                      </div>
                    </details>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// 함수형 컴포넌트를 위한 HOC
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode,
  onError?: (error: Error, errorInfo: ErrorInfo) => void
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback} onError={onError}>
        <Component {...props} />
      </ErrorBoundary>
    )
  }
}

// 특정 컴포넌트를 위한 에러 경계 - Client Component
export const MembershipErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => {
  const handleError = (error: Error, errorInfo: ErrorInfo) => {
    // 에러 로깅 (실제 환경에서는 외부 서비스로 전송)
    console.error('Membership Error:', error)
    console.error('Error Info:', errorInfo)
  }

  return (
    <ErrorBoundary
      fallback={
        <div className="text-center py-8">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-700 mb-2">
            구성원 관리 시스템 오류
          </h3>
          <p className="text-red-600 mb-4">
            구성원 데이터를 불러오는 중 오류가 발생했습니다.
          </p>
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            페이지 새로고침
          </Button>
        </div>
      }
      onError={handleError}
    >
      {children}
    </ErrorBoundary>
  )
}