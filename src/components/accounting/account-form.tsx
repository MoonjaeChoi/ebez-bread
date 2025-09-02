'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { AccountType } from '@prisma/client'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

const accountFormSchema = z.object({
  code: z.string()
    .min(1, '계정 코드를 입력해주세요')
    .regex(/^[1-5](-\d{2}){0,3}$/, '올바른 계정 코드 형식이 아닙니다 (예: 1-11-01-01)'),
  name: z.string()
    .min(1, '계정명을 입력해주세요')
    .max(100, '계정명은 100자 이내로 입력해주세요'),
  englishName: z.string()
    .max(100, '영문명은 100자 이내로 입력해주세요')
    .optional()
    .or(z.literal('')),
  type: z.nativeEnum(AccountType, {
    errorMap: () => ({ message: '계정 유형을 선택해주세요' })
  }),
  parentId: z.string().optional(),
  description: z.string()
    .max(500, '설명은 500자 이내로 입력해주세요')
    .optional()
    .or(z.literal('')),
  allowTransaction: z.boolean().default(true)
})

type AccountFormData = z.infer<typeof accountFormSchema>

interface AccountFormProps {
  accountId?: string // 수정 시에만 제공
  parentId?: string // 새 계정 생성 시 부모 ID
  onSuccess?: () => void
  onCancel?: () => void
}

const accountTypeLabels: Record<AccountType, string> = {
  ASSET: '자산',
  LIABILITY: '부채',
  EQUITY: '자본', 
  REVENUE: '수익',
  EXPENSE: '비용'
}

const accountTypeDescriptions: Record<AccountType, string> = {
  ASSET: '현금, 예금, 건물, 장비 등',
  LIABILITY: '미지급금, 대출금, 선수금 등',
  EQUITY: '자본금, 이익잉여금 등',
  REVENUE: '헌금, 후원금, 사업수입 등', 
  EXPENSE: '사업비, 관리비, 인건비 등'
}

export function AccountForm({ 
  accountId, 
  parentId, 
  onSuccess, 
  onCancel 
}: AccountFormProps) {
  const [codeValidation, setCodeValidation] = useState<{
    isValid: boolean
    error?: string
    level?: number
    accountType?: AccountType
  } | null>(null)
  const [isValidatingCode, setIsValidatingCode] = useState(false)

  const { toast } = useToast()
  const isEdit = !!accountId

  // 기존 계정 데이터 조회 (수정 모드)
  const { data: existingAccount, isLoading: isLoadingAccount } = trpc.accountCodes.getById.useQuery(
    { id: accountId! },
    { enabled: isEdit }
  )

  // 부모 계정 데이터 조회
  const { data: parentAccount } = trpc.accountCodes.getById.useQuery(
    { id: parentId! },
    { enabled: !!parentId }
  )

  const form = useForm<AccountFormData>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      code: '',
      name: '',
      englishName: '',
      type: AccountType.ASSET,
      parentId: parentId || '',
      description: '',
      allowTransaction: true
    }
  })

  // 기존 데이터로 폼 초기화
  useEffect(() => {
    if (existingAccount && isEdit) {
      form.reset({
        code: existingAccount.code,
        name: existingAccount.name,
        englishName: existingAccount.englishName || '',
        type: existingAccount.type,
        parentId: existingAccount.parent?.id || '',
        description: existingAccount.description || '',
        allowTransaction: existingAccount.allowTransaction
      })
    }
  }, [existingAccount, isEdit, form])

  // 부모 계정 기반 타입 설정
  useEffect(() => {
    if (parentAccount && !isEdit) {
      form.setValue('type', parentAccount.type)
    }
  }, [parentAccount, isEdit, form])

  // 계정 코드 유효성 검증을 위한 쿼리
  const { refetch: validateCodeQuery } = trpc.accountCodes.validateCode.useQuery(
    {
      code: form.watch('code') || '',
      excludeId: accountId
    },
    {
      enabled: false // 수동으로 실행
    }
  )

  const validateCode = useCallback(async (code: string) => {
    if (!code || code.length < 1) {
      setCodeValidation(null)
      return
    }

    setIsValidatingCode(true)
    try {
      const result = await validateCodeQuery()
      if (result.data) {
        setCodeValidation(result.data)
      }
    } catch (error) {
      setCodeValidation({
        isValid: false,
        error: '코드 검증 중 오류가 발생했습니다'
      })
    } finally {
      setIsValidatingCode(false)
    }
  }, [validateCodeQuery])

  // 계정 생성/수정 뮤테이션
  const createAccount = trpc.accountCodes.create.useMutation({
    onSuccess: () => {
      toast({
        title: '계정과목이 생성되었습니다',
        description: '새로운 계정과목이 성공적으로 생성되었습니다.'
      })
      onSuccess?.()
    },
    onError: (error) => {
      toast({
        title: '생성 실패',
        description: error.message,
        variant: 'destructive'
      })
    }
  })

  const updateAccount = trpc.accountCodes.update.useMutation({
    onSuccess: () => {
      toast({
        title: '계정과목이 수정되었습니다',
        description: '계정과목 정보가 성공적으로 수정되었습니다.'
      })
      onSuccess?.()
    },
    onError: (error) => {
      toast({
        title: '수정 실패',
        description: error.message,
        variant: 'destructive'
      })
    }
  })

  const onSubmit = (data: AccountFormData) => {
    // 빈 문자열을 undefined로 변환
    const cleanData = {
      ...data,
      englishName: data.englishName || undefined,
      description: data.description || undefined,
      parentId: data.parentId || undefined
    }

    if (isEdit) {
      updateAccount.mutate({
        id: accountId,
        ...cleanData
      })
    } else {
      createAccount.mutate(cleanData)
    }
  }

  const watchedCode = form.watch('code')

  // 코드 변경 시 유효성 검증
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (watchedCode) {
        validateCode(watchedCode)
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [watchedCode, validateCode])

  const isLoading = isLoadingAccount || createAccount.isPending || updateAccount.isPending

  if (isEdit && isLoadingAccount) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="ml-2">계정 정보를 불러오는 중...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isEdit ? '계정과목 수정' : '새 계정과목 생성'}
        </CardTitle>
        {parentAccount && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>상위 계정:</span>
            <Badge variant="outline">
              {parentAccount.code} - {parentAccount.name}
            </Badge>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* 계정 코드 */}
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>계정 코드 *</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="예: 1-11-01-01"
                        className={cn(
                          codeValidation?.isValid === false && "border-red-500",
                          codeValidation?.isValid === true && "border-green-500"
                        )}
                      />
                    </FormControl>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {isValidatingCode && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
                      {!isValidatingCode && codeValidation?.isValid === true && (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      )}
                      {!isValidatingCode && codeValidation?.isValid === false && (
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                  </div>
                  <FormDescription>
                    관(1-5) - 항목(01-99) - 세목(01-99) - 세세목(01-99) 형식으로 입력
                    {codeValidation?.level && (
                      <span className="ml-2">
                        • 레벨 {codeValidation.level}
                      </span>
                    )}
                  </FormDescription>
                  {codeValidation?.error && (
                    <div className="text-sm text-red-600">{codeValidation.error}</div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 계정명 */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>계정명 *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="계정명을 입력하세요" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 영문명 */}
            <FormField
              control={form.control}
              name="englishName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>영문명</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="영문명을 입력하세요 (선택사항)" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 계정 유형 */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>계정 유형 *</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={!!parentAccount} // 부모 계정이 있으면 비활성화
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="계정 유형 선택" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(accountTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          <div className="flex flex-col">
                            <span>{label}</span>
                            <span className="text-xs text-gray-500">
                              {accountTypeDescriptions[value as AccountType]}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {parentAccount && (
                    <FormDescription>
                      상위 계정의 유형({accountTypeLabels[parentAccount.type]})으로 고정됩니다.
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 설명 */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>설명</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="계정과목에 대한 설명을 입력하세요 (선택사항)"
                      className="min-h-[80px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 거래 허용 여부 */}
            <FormField
              control={form.control}
              name="allowTransaction"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">거래 허용</FormLabel>
                    <FormDescription>
                      이 계정으로 직접 거래를 입력할 수 있도록 허용합니다.
                      일반적으로 세세목(4단계) 계정에서만 활성화합니다.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* 버튼 */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
              >
                취소
              </Button>
              <Button
                type="submit"
                disabled={isLoading || codeValidation?.isValid === false}
              >
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isEdit ? '수정' : '생성'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}