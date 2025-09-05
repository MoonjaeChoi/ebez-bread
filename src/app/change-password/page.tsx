'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { trpc } from '@/lib/trpc/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Eye, EyeOff, Shield } from 'lucide-react'

export default function ChangePasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()
  const returnUrl = searchParams.get('returnUrl') || '/dashboard'

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // 비밀번호 변경 필요 상태 확인
  const { data: passwordStatus, isLoading: statusLoading } = trpc.password.checkChangeRequired.useQuery()
  
  // 비밀번호 변경 mutation
  const changePasswordMutation = trpc.password.change.useMutation({
    onSuccess: () => {
      // 성공 시 원래 페이지로 리다이렉트
      router.push(returnUrl)
    },
    onError: (error) => {
      setErrors({ submit: error.message })
    }
  })

  // 초기 비밀번호 설정 mutation (첫 로그인)
  const setInitialPasswordMutation = trpc.password.setInitialPassword.useMutation({
    onSuccess: () => {
      router.push(returnUrl)
    },
    onError: (error) => {
      setErrors({ submit: error.message })
    }
  })

  // 로그인 상태가 아니면 로그인 페이지로 리다이렉트
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  // 비밀번호 변경이 필요하지 않은 사용자는 대시보드로 리다이렉트
  useEffect(() => {
    if (!statusLoading && passwordStatus && !passwordStatus.isRequired) {
      router.push('/dashboard')
    }
  }, [passwordStatus, statusLoading, router])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!passwordStatus?.isRequired && !currentPassword.trim()) {
      newErrors.currentPassword = '현재 비밀번호를 입력해주세요'
    }

    if (!newPassword.trim()) {
      newErrors.newPassword = '새 비밀번호를 입력해주세요'
    } else if (newPassword.length < 8) {
      newErrors.newPassword = '새 비밀번호는 8자 이상이어야 합니다'
    }

    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = '비밀번호 확인을 입력해주세요'
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = '새 비밀번호와 확인 비밀번호가 일치하지 않습니다'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    const isInitialSetup = passwordStatus?.isRequired

    if (isInitialSetup) {
      // 첫 로그인: 초기 비밀번호 설정
      setInitialPasswordMutation.mutate({
        newPassword,
        confirmPassword
      })
    } else {
      // 일반적인 비밀번호 변경
      changePasswordMutation.mutate({
        currentPassword,
        newPassword,
        confirmPassword
      })
    }
  }

  const isLoading = changePasswordMutation.isLoading || setInitialPasswordMutation.isLoading

  if (status === 'loading' || statusLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return null
  }

  const isInitialSetup = passwordStatus?.isRequired

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 mb-4">
            <Shield className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">
            {isInitialSetup ? '초기 비밀번호 설정' : '비밀번호 변경'}
          </CardTitle>
          <CardDescription>
            {isInitialSetup 
              ? '보안을 위해 새로운 비밀번호를 설정해주세요'
              : '안전한 비밀번호로 변경해주세요'
            }
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isInitialSetup && (
              <div>
                <Label htmlFor="currentPassword">현재 비밀번호</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className={errors.currentPassword ? 'border-red-500' : ''}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
                {errors.currentPassword && (
                  <p className="text-sm text-red-600 mt-1">{errors.currentPassword}</p>
                )}
              </div>
            )}

            <div>
              <Label htmlFor="newPassword">새 비밀번호</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={errors.newPassword ? 'border-red-500' : ''}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.newPassword && (
                <p className="text-sm text-red-600 mt-1">{errors.newPassword}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                8자 이상 입력해주세요
              </p>
            </div>

            <div>
              <Label htmlFor="confirmPassword">새 비밀번호 확인</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={errors.confirmPassword ? 'border-red-500' : ''}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-red-600 mt-1">{errors.confirmPassword}</p>
              )}
            </div>

            {errors.submit && (
              <Alert variant="destructive">
                <AlertDescription>{errors.submit}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isInitialSetup ? '비밀번호 설정' : '비밀번호 변경'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}