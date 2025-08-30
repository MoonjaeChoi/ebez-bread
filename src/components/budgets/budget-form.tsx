'use client'

import { useState, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, Plus, Trash2, AlertCircle, Loader2, Calculator } from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { trpc } from '@/lib/trpc/client'
import { BudgetCategory } from '@prisma/client'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency, cn } from '@/lib/utils'

const budgetItemSchema = z.object({
  name: z.string().min(1, '항목명을 입력해주세요').max(100),
  code: z.string().min(1, '항목 코드를 입력해주세요').max(20),
  amount: z.number().min(0, '금액은 0 이상이어야 합니다'),
  category: z.nativeEnum(BudgetCategory),
  description: z.string().max(500).optional().or(z.literal(''))
})

const budgetFormSchema = z.object({
  name: z.string().min(1, '예산명을 입력해주세요').max(100),
  year: z.number().min(2020).max(2050),
  quarter: z.number().min(1).max(4).optional(),
  month: z.number().min(1).max(12).optional(),
  totalAmount: z.number().min(0, '총 예산액은 0 이상이어야 합니다'),
  description: z.string().max(500).optional().or(z.literal('')),
  startDate: z.date(),
  endDate: z.date(),
  departmentId: z.string().min(1, '부서를 선택해주세요'),
  budgetItems: z.array(budgetItemSchema).min(1, '최소 1개의 예산 항목이 필요합니다')
}).refine((data) => data.endDate >= data.startDate, {
  message: '종료일은 시작일보다 늦어야 합니다',
  path: ['endDate']
}).refine((data) => {
  const itemsTotal = data.budgetItems.reduce((sum, item) => sum + item.amount, 0)
  return Math.abs(itemsTotal - data.totalAmount) < 0.01
}, {
  message: '총 예산액과 항목별 예산의 합계가 일치해야 합니다',
  path: ['totalAmount']
})

type BudgetFormData = z.infer<typeof budgetFormSchema>

interface BudgetFormProps {
  budgetId?: string
  onSuccess?: () => void
  onCancel?: () => void
}

const budgetCategoryLabels: Record<BudgetCategory, string> = {
  PERSONNEL: '인건비',
  OPERATIONS: '운영비',
  MANAGEMENT: '관리비',
  FACILITIES: '시설비',
  EDUCATION: '교육비',
  MINISTRY: '사역비',
  MISSION: '선교비',
  WELFARE: '복지비',
  EVENT: '행사비',
  OTHER: '기타'
}

export function BudgetForm({ budgetId, onSuccess, onCancel }: BudgetFormProps) {
  const [startDate, setStartDate] = useState<Date>()
  const [endDate, setEndDate] = useState<Date>()
  const { toast } = useToast()
  
  const isEdit = !!budgetId
  
  // 기존 예산 데이터 조회
  const { data: existingBudget, isLoading: isLoadingBudget } = trpc.budgets.getById.useQuery(
    { id: budgetId! },
    { enabled: isEdit }
  )

  // 부서 목록 조회 (임시로 빈 배열 사용)
  const departments: any[] = []

  const form = useForm<BudgetFormData>({
    resolver: zodResolver(budgetFormSchema),
    defaultValues: {
      name: '',
      year: new Date().getFullYear(),
      quarter: undefined,
      month: undefined,
      totalAmount: 0,
      description: '',
      startDate: new Date(),
      endDate: new Date(new Date().getFullYear(), 11, 31),
      departmentId: '',
      budgetItems: []
    }
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'budgetItems'
  })

  // 기존 데이터로 폼 초기화
  useEffect(() => {
    if (existingBudget && isEdit) {
      const budgetItems = (existingBudget as any).budgetItems?.map((item: any) => ({
        name: item.name,
        code: item.code || '',
        amount: Number(item.amount),
        category: item.category,
        description: item.description || ''
      })) || []

      form.reset({
        name: existingBudget.name,
        year: existingBudget.year,
        quarter: existingBudget.quarter || undefined,
        month: existingBudget.month || undefined,
        totalAmount: Number(existingBudget.totalAmount),
        description: existingBudget.description || '',
        startDate: new Date(existingBudget.startDate),
        endDate: new Date(existingBudget.endDate),
        departmentId: existingBudget.departmentId || '',
        budgetItems
      })

      setStartDate(new Date(existingBudget.startDate))
      setEndDate(new Date(existingBudget.endDate))
    }
  }, [existingBudget, isEdit, form])

  // 예산 항목 추가
  const addBudgetItem = () => {
    append({
      name: '',
      code: '',
      amount: 0,
      category: BudgetCategory.OTHER,
      description: ''
    })
  }

  // 총액 자동 계산
  const budgetItems = form.watch('budgetItems')
  const calculatedTotal = budgetItems.reduce((sum, item) => sum + (item.amount || 0), 0)

  useEffect(() => {
    form.setValue('totalAmount', calculatedTotal)
  }, [calculatedTotal, form])

  // 예산 생성/수정 뮤테이션
  const createBudget = trpc.budgets.create.useMutation({
    onSuccess: () => {
      toast({
        title: '예산이 생성되었습니다',
        description: '새로운 예산이 성공적으로 생성되었습니다.'
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

  const updateBudget = trpc.budgets.update.useMutation({
    onSuccess: () => {
      toast({
        title: '예산이 수정되었습니다',
        description: '예산 정보가 성공적으로 수정되었습니다.'
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

  const onSubmit = (data: BudgetFormData) => {
    const cleanData = {
      ...data,
      startDate: data.startDate.toISOString(),
      endDate: data.endDate.toISOString(),
      description: data.description || undefined,
      quarter: data.quarter || undefined,
      month: data.month || undefined,
      budgetItems: data.budgetItems.map(item => ({
        ...item,
        description: item.description || undefined
      }))
    }

    if (isEdit) {
      updateBudget.mutate({
        id: budgetId,
        ...cleanData
      })
    } else {
      createBudget.mutate(cleanData)
    }
  }

  const isLoading = isLoadingBudget || createBudget.isLoading || updateBudget.isLoading

  if (isEdit && isLoadingBudget) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            예산 정보를 불러오는 중...
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{isEdit ? '예산 수정' : '새 예산 생성'}</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* 기본 정보 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>예산명 *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="예: 2024년 교육부 예산" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="departmentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>담당 부서 *</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="부서 선택" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {departments?.map((dept: any) => (
                            <SelectItem key={dept.id} value={dept.id}>
                              {dept.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* 기간 설정 */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <FormField
                  control={form.control}
                  name="year"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>연도 *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="quarter"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>분기</FormLabel>
                      <Select
                        value={field.value?.toString()}
                        onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="선택" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1">1분기</SelectItem>
                          <SelectItem value="2">2분기</SelectItem>
                          <SelectItem value="3">3분기</SelectItem>
                          <SelectItem value="4">4분기</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>시작일 *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                'w-full pl-3 text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              {field.value ? (
                                format(field.value, 'yyyy-MM-dd', { locale: ko })
                              ) : (
                                <span>날짜 선택</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={(date) => {
                              field.onChange(date)
                              setStartDate(date)
                            }}
                            disabled={(date) =>
                              date > new Date() || date < new Date('1900-01-01')
                            }
                            autoFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>종료일 *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                'w-full pl-3 text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              {field.value ? (
                                format(field.value, 'yyyy-MM-dd', { locale: ko })
                              ) : (
                                <span>날짜 선택</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={(date) => {
                              field.onChange(date)
                              setEndDate(date)
                            }}
                            disabled={(date) => startDate ? date < startDate : false}
                            autoFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

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
                        placeholder="예산에 대한 설명을 입력하세요"
                        className="min-h-[80px]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              {/* 예산 항목 */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">예산 항목</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addBudgetItem}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    항목 추가
                  </Button>
                </div>

                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <Card key={field.id} className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <FormField
                          control={form.control}
                          name={`budgetItems.${index}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>항목명 *</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="예: 교재비" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`budgetItems.${index}.code`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>코드 *</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="예: EDU001" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`budgetItems.${index}.amount`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>예산액 *</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  {...field}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                  placeholder="0"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`budgetItems.${index}.category`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>분류 *</FormLabel>
                              <Select value={field.value} onValueChange={field.onChange}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {Object.entries(budgetCategoryLabels).map(([value, label]) => (
                                    <SelectItem key={value} value={value}>
                                      {label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="flex items-end">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => remove(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <FormField
                        control={form.control}
                        name={`budgetItems.${index}.description`}
                        render={({ field }) => (
                          <FormItem className="mt-4">
                            <FormLabel>설명</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                placeholder="항목에 대한 설명"
                                className="min-h-[60px]"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </Card>
                  ))}
                </div>

                {fields.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    예산 항목을 추가해주세요.
                  </div>
                )}
              </div>

              {/* 총액 표시 */}
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calculator className="w-5 h-5 text-blue-600" />
                      <span className="font-semibold text-blue-800">총 예산액</span>
                    </div>
                    <div className="text-2xl font-bold text-blue-800">
                      {formatCurrency(calculatedTotal)}
                    </div>
                  </div>
                  {Math.abs(calculatedTotal - (form.watch('totalAmount') || 0)) > 0.01 && (
                    <div className="flex items-center gap-2 mt-2 text-amber-600">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm">항목별 예산의 합계와 총 예산액이 일치하지 않습니다</span>
                    </div>
                  )}
                </CardContent>
              </Card>

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
                  disabled={isLoading || fields.length === 0}
                >
                  {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {isEdit ? '수정' : '생성'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}