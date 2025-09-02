'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { 
  AlertCircle, 
  CheckCircle, 
  Loader2, 
  Wallet, 
  Receipt, 
  Building2,
  DollarSign
} from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/utils'

const budgetExpenseFormSchema = z.object({
  title: z.string().min(1, '제목을 입력해주세요').max(200),
  amount: z.number().min(1, '금액을 입력해주세요'),
  category: z.string().min(1, '카테고리를 선택해주세요'),
  description: z.string().max(1000).optional().or(z.literal('')),
  receiptUrl: z.string().url('올바른 URL을 입력해주세요').optional().or(z.literal('')),
  budgetItemId: z.string().min(1, '예산 항목을 선택해주세요')
})

type BudgetExpenseFormData = z.infer<typeof budgetExpenseFormSchema>

interface BudgetExpenseFormProps {
  expenseId?: string
  onSuccess?: () => void
  onCancel?: () => void
  initialBudgetItemId?: string
}

const expenseCategories = [
  { value: 'office', label: '사무용품' },
  { value: 'travel', label: '교통비' },
  { value: 'meal', label: '식비' },
  { value: 'accommodation', label: '숙박비' },
  { value: 'education', label: '교육비' },
  { value: 'equipment', label: '장비구입' },
  { value: 'maintenance', label: '유지보수' },
  { value: 'utilities', label: '공과금' },
  { value: 'marketing', label: '홍보비' },
  { value: 'other', label: '기타' }
]

export function BudgetExpenseForm({ 
  expenseId, 
  onSuccess, 
  onCancel, 
  initialBudgetItemId 
}: BudgetExpenseFormProps) {
  const [selectedBudgetItemId, setSelectedBudgetItemId] = useState(initialBudgetItemId)
  const [budgetValidation, setBudgetValidation] = useState<{
    isValid: boolean
    availableAmount?: number
    usedAmount?: number
    pendingAmount?: number
    error?: string
  } | null>(null)
  
  const { toast } = useToast()
  const isEdit = !!expenseId

  // 기존 지출결의서 데이터 조회
  const { data: existingExpense, isLoading: isLoadingExpense } = trpc.expenseReports.getById?.useQuery(
    { id: expenseId! },
    { enabled: isEdit }
  )

  // 사용 가능한 예산 항목 조회
  const { data: availableBudgetItems, isLoading: isLoadingBudgetItems } = 
    trpc.budgets.getAvailableItems.useQuery({})

  const form = useForm<BudgetExpenseFormData>({
    resolver: zodResolver(budgetExpenseFormSchema),
    defaultValues: {
      title: '',
      amount: 0,
      category: '',
      description: '',
      receiptUrl: '',
      budgetItemId: initialBudgetItemId || ''
    }
  })

  // 기존 데이터로 폼 초기화
  useEffect(() => {
    if (existingExpense && isEdit) {
      form.reset({
        title: existingExpense.title,
        amount: Number(existingExpense.amount),
        category: existingExpense.category,
        description: existingExpense.description || '',
        receiptUrl: existingExpense.receiptUrl || '',
        budgetItemId: existingExpense.budgetItemId || ''
      })
      
      if (existingExpense.budgetItemId) {
        setSelectedBudgetItemId(existingExpense.budgetItemId)
      }
    }
  }, [existingExpense, isEdit, form])

  // 예산 잔액 확인
  const requestAmount = form.watch('amount') || 0
  const { data: budgetBalance, isLoading: isCheckingBalance } = 
    trpc.budgets.checkBalance.useQuery(
      { 
        budgetItemId: selectedBudgetItemId!,
        requestAmount: Number(requestAmount)
      },
      { 
        enabled: !!selectedBudgetItemId && Number(requestAmount) > 0,
        refetchOnMount: true 
      }
    )

  // 예산 검증
  useEffect(() => {
    if (budgetBalance) {
      setBudgetValidation({
        isValid: true, // 임시로 true
        availableAmount: Number(budgetBalance.budgetItem?.amount || 0),
        usedAmount: 0, // 임시값
        pendingAmount: 0, // 임시값  
        error: undefined
      })
    }
  }, [budgetBalance])

  // 실시간 예산 검증
  const watchedAmount = form.watch('amount')
  const watchedBudgetItemId = form.watch('budgetItemId')

  useEffect(() => {
    if (watchedBudgetItemId !== selectedBudgetItemId) {
      setSelectedBudgetItemId(watchedBudgetItemId)
    }
  }, [watchedBudgetItemId, selectedBudgetItemId])

  useEffect(() => {
    if (budgetBalance && watchedAmount > 0) {
      const isValidAmount = watchedAmount <= Number(budgetBalance.budgetItem?.amount || 0)
      setBudgetValidation(prev => ({
        ...prev,
        isValid: isValidAmount,
        error: isValidAmount ? undefined : `사용 가능한 예산을 초과했습니다 (한도: ${formatCurrency(budgetBalance.budgetItem?.amount || 0)})`
      }))
    }
  }, [watchedAmount, budgetBalance])

  // 지출결의서 생성/수정
  const createExpense = trpc.expenseReports.create.useMutation({
    onSuccess: () => {
      toast({
        title: '지출결의서가 생성되었습니다',
        description: '예산 연동 지출결의서가 성공적으로 생성되었습니다.'
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

  const updateExpense = trpc.expenseReports.update?.useMutation({
    onSuccess: () => {
      toast({
        title: '지출결의서가 수정되었습니다',
        description: '지출결의서가 성공적으로 수정되었습니다.'
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

  const onSubmit = (data: BudgetExpenseFormData) => {
    const cleanData = {
      ...data,
      description: data.description || undefined,
      receiptUrl: data.receiptUrl || undefined
    }

    if (isEdit && updateExpense) {
      updateExpense.mutate({
        id: expenseId,
        ...cleanData
      })
    } else {
      createExpense.mutate(cleanData)
    }
  }

  const isLoading = isLoadingExpense || createExpense.isPending || (updateExpense?.isPending ?? false)
  const canSubmit = budgetValidation?.isValid && !isLoading

  // 선택된 예산 항목 정보
  const selectedBudgetItem = availableBudgetItems?.find(item => item.id === selectedBudgetItemId)

  if (isEdit && isLoadingExpense) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            지출결의서 정보를 불러오는 중...
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            {isEdit ? '예산 연동 지출결의서 수정' : '예산 연동 지출결의서 작성'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* 예산 항목 선택 */}
              <FormField
                control={form.control}
                name="budgetItemId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>예산 항목 *</FormLabel>
                    <Select 
                      value={field.value} 
                      onValueChange={field.onChange}
                      disabled={isLoadingBudgetItems}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="예산 항목을 선택하세요" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isLoadingBudgetItems ? (
                          <SelectItem value="" disabled>
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            불러오는 중...
                          </SelectItem>
                        ) : availableBudgetItems?.length === 0 ? (
                          <SelectItem value="" disabled>
                            사용 가능한 예산 항목이 없습니다
                          </SelectItem>
                        ) : (
                          availableBudgetItems?.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              <div className="flex flex-col">
                                <span className="font-medium">{item.name}</span>
                                <span className="text-xs text-gray-500">
                                  {item.budget?.name} - {item.budget?.department?.name}
                                </span>
                                <span className="text-xs text-green-600">
                                  사용가능: {formatCurrency(item.budgetExecution?.remainingAmount || 0)}
                                </span>
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 예산 현황 카드 */}
              {selectedBudgetItem && budgetBalance && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Wallet className="w-4 h-4" />
                      예산 현황
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">총 예산</p>
                        <p className="font-semibold text-lg">
                          {formatCurrency(budgetBalance.budgetItem?.amount || 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">사용된 금액</p>
                        <p className="font-semibold text-lg text-red-600">
                          {formatCurrency(0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">사용 가능 금액</p>
                        <p className="font-semibold text-lg text-green-600">
                          {formatCurrency(budgetBalance.budgetItem?.amount || 0)}
                        </p>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>예산 집행률</span>
                        <span>0%</span>
                      </div>
                      <Progress 
                        value={0} 
                        className="h-2"
                      />
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <Building2 className="w-4 h-4" />
                      <span>{selectedBudgetItem.budget?.department?.name}</span>
                      <Badge variant="outline">{selectedBudgetItem.budget?.name}</Badge>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Separator />

              {/* 지출 정보 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>제목 *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="지출 내용을 입력하세요" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>카테고리 *</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="카테고리 선택" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {expenseCategories.map((category) => (
                            <SelectItem key={category.value} value={category.value}>
                              {category.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>지출 금액 *</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          className={budgetValidation?.isValid === false ? 'border-red-500' : ''}
                        />
                      </FormControl>
                      <DollarSign className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    </div>
                    {budgetValidation?.isValid === false && (
                      <div className="text-sm text-red-600 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        {budgetValidation.error}
                      </div>
                    )}
                    {budgetValidation?.isValid === true && watchedAmount > 0 && (
                      <div className="text-sm text-green-600 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        예산 범위 내 금액입니다
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>상세 설명</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="지출에 대한 상세 설명을 입력하세요"
                        className="min-h-[100px]"
                      />
                    </FormControl>
                    <FormDescription>
                      지출의 목적, 세부 내역 등을 자세히 작성해주세요.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="receiptUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>영수증 URL</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="https://example.com/receipt.pdf"
                        type="url"
                      />
                    </FormControl>
                    <FormDescription>
                      영수증을 스캔하여 클라우드에 업로드 후 URL을 입력해주세요.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 예산 검증 알림 */}
              {budgetValidation && !budgetValidation.isValid && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {budgetValidation.error || '예산 검증에 실패했습니다.'}
                  </AlertDescription>
                </Alert>
              )}

              {isCheckingBalance && (
                <Alert>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <AlertDescription>
                    예산 잔액을 확인하는 중...
                  </AlertDescription>
                </Alert>
              )}

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
                  disabled={!canSubmit}
                >
                  {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {isEdit ? '수정' : '제출'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}