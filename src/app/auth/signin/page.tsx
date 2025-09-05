'use client'

import { useCallback, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Alert } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { 
  Home, 
  Mail, 
  Lock, 
  LogIn, 
  AlertCircle,
  ArrowLeft,
  Shield,
  Users,
  Eye,
  EyeOff
} from 'lucide-react'

// Enhanced validation schema with better security
const loginSchema = z.object({
  email: z
    .string()
    .min(1, '이메일을 입력해주세요')
    .email('올바른 이메일 주소를 입력해주세요')
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(1, '비밀번호를 입력해주세요')
    .max(100, '비밀번호가 너무 깁니다'),
})

type LoginForm = z.infer<typeof loginSchema>

export default function SignInPage() {
  const { loadingState, error, login, isLoading } = useAuth()
  const [showPassword, setShowPassword] = useState(false)

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
    mode: 'onChange', // Real-time validation
  })

  // Memoized button text
  const buttonText = useMemo(() => {
    switch (loadingState) {
      case 'authenticating':
        return '인증 중...'
      case 'redirecting':
        return '이동 중...'
      default:
        return '로그인'
    }
  }, [loadingState])

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword(prev => !prev)
  }, [])

  const handleSubmit = useCallback(async (data: LoginForm) => {
    await login({
      email: data.email,
      password: data.password,
    })
  }, [login])

  // Memoized form fields to prevent unnecessary re-renders
  const emailField = useMemo(() => (
    <FormField
      control={form.control}
      name="email"
      render={({ field }) => (
        <FormItem>
          <FormLabel>이메일주소</FormLabel>
          <FormControl>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="admin@gcchurch.kr"
                type="email"
                className="pl-9"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                disabled={isLoading}
                {...field}
              />
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  ), [form.control, isLoading])

  const passwordField = useMemo(() => (
    <FormField
      control={form.control}
      name="password"
      render={({ field }) => (
        <FormItem>
          <FormLabel>비밀번호</FormLabel>
          <FormControl>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="비밀번호를 입력하세요"
                type={showPassword ? 'text' : 'password'}
                className="pl-9 pr-9"
                autoComplete="current-password"
                disabled={isLoading}
                {...field}
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                disabled={isLoading}
                aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보이기'}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  ), [form.control, isLoading, showPassword, togglePasswordVisibility])

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />
      
      {/* Header */}
      <header className="relative z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <div className="rounded-md bg-primary p-1.5">
              <Home className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold">{process.env.NEXT_PUBLIC_CHURCH_NAME || '에벤에셀'}</span>
          </Link>
          
          <Button variant="ghost" asChild disabled={isLoading}>
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              홈으로 돌아가기
            </Link>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          {/* Welcome Section */}
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">관리 시스템 로그인</h1>
            <p className="mt-2 text-muted-foreground">
              에벤에셀(eVeNeZeR) 교회 관리 시스템에 로그인하세요
            </p>
          </div>

          {/* Login Form */}
          <Card className="shadow-lg">
            <CardHeader className="space-y-2">
              <CardTitle className="text-center text-xl">로그인</CardTitle>
              <CardDescription className="text-center">
                계정 정보를 입력하여 시스템에 접근하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                  {emailField}
                  {passwordField}
                  
                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <div className="font-medium">로그인 실패</div>
                      <div className="text-sm">{error}</div>
                    </Alert>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading}
                    size="lg"
                    aria-describedby={error ? 'error-message' : undefined}
                  >
                    {isLoading ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
                        {buttonText}
                      </>
                    ) : (
                      <>
                        <LogIn className="mr-2 h-4 w-4" />
                        로그인
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          <Separator />

          {/* Demo Info */}
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="flex items-center text-sm">
                <Users className="mr-2 h-4 w-4" />
                테스트 계정 정보
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">이메일:</span>
                  <Badge variant="outline" className="font-mono text-xs">
                    admin@gc.kr
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">비밀번호:</span>
                  <Badge variant="outline" className="font-mono text-xs">
                    admin123
                  </Badge>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                정실장 계정(Super Admin) - 시스템의 모든 기능에 접근 가능합니다.
              </p>
            </CardContent>
          </Card>

          {/* Footer */}
          <footer className="text-center">
            <p className="text-xs text-muted-foreground">
              문제가 있으시면 교회 관리자에게 문의해주세요
            </p>
          </footer>
        </div>
      </main>
    </div>
  )
}