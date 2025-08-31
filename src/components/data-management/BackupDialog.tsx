'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Archive, CalendarIcon, CheckCircle, Database, Building2 } from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { toast } from 'sonner'
import { trpc } from '@/lib/trpc/client'

interface BackupDialogProps {
  children?: React.ReactNode
}

interface DateRange {
  from: Date | undefined
  to: Date | undefined
}

interface BackupOptions {
  includeMembers: boolean
  includeOfferings: boolean
  includeAttendances: boolean
  includeVisitations: boolean
  includeExpenseReports: boolean
  includeOrganizations: boolean
  dateRange?: DateRange
  filename: string
}

export function BackupDialog({ children }: BackupDialogProps) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<'configure' | 'creating' | 'complete'>('configure')
  const [progress, setProgress] = useState(0)
  const [progressMessage, setProgressMessage] = useState('')
  const [options, setOptions] = useState<BackupOptions>({
    includeMembers: true,
    includeOfferings: true,
    includeAttendances: true,
    includeVisitations: true,
    includeExpenseReports: true,
    includeOrganizations: true,
    filename: ''
  })
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined })
  const [backupResult, setBackupResult] = useState<{
    filename: string
    includedTables: string[]
    recordCounts: Record<string, number>
  } | null>(null)

  const createBackupMutation = trpc.importExport.createBackup.useMutation()

  const reset = () => {
    setStep('configure')
    setProgress(0)
    setProgressMessage('')
    setOptions({
      includeMembers: true,
      includeOfferings: true,
      includeAttendances: true,
      includeVisitations: true,
      includeExpenseReports: true,
      includeOrganizations: true,
      filename: ''
    })
    setDateRange({ from: undefined, to: undefined })
    setBackupResult(null)
  }

  const handleClose = () => {
    setOpen(false)
    setTimeout(reset, 300)
  }

  const getDefaultFilename = () => {
    const now = new Date()
    const dateStr = now.toISOString().split('T')[0]
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '')
    return `과천교회_백업_${dateStr}_${timeStr}.xlsx`
  }

  const handleCreateBackup = async () => {
    const selectedCount = [
      options.includeMembers,
      options.includeOfferings,
      options.includeAttendances,
      options.includeVisitations,
      options.includeExpenseReports
    ].filter(Boolean).length

    if (selectedCount === 0) {
      toast.error('최소 하나 이상의 데이터를 선택해야 합니다')
      return
    }

    setStep('creating')
    setProgress(0)
    setProgressMessage('백업 생성 시작...')

    try {
      const backupOptions: any = {
        ...options,
        ...(dateRange.from && dateRange.to && {
          dateRange: {
            start: dateRange.from.toISOString(),
            end: dateRange.to.toISOString()
          }
        }),
        filename: options.filename || getDefaultFilename()
      }

      setProgress(20)
      setProgressMessage('데이터 수집 중...')

      const result = await createBackupMutation.mutateAsync(backupOptions)

      if (result.success && result.data) {
        setProgress(80)
        setProgressMessage('백업 파일 생성 중...')

        // Base64를 Blob으로 변환하여 다운로드
        const binaryString = atob(result.data)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        
        const blob = new Blob([bytes], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        })
        
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = result.filename || '백업.xlsx'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)

        setProgress(100)
        setProgressMessage('백업 완료')
        setBackupResult({
          filename: result.filename || '백업.xlsx',
          includedTables: result.includedTables,
          recordCounts: result.recordCounts
        })
        setStep('complete')
        
        toast.success('백업이 성공적으로 생성되었습니다')
      }
    } catch (error) {
      toast.error('백업 생성 실패')
      setStep('configure')
    }
  }

  const updateOption = (key: keyof BackupOptions, value: boolean | string) => {
    setOptions(prev => ({ ...prev, [key]: value }))
  }

  const totalRecords = backupResult 
    ? Object.values(backupResult.recordCounts).reduce((sum, count) => sum + count, 0)
    : 0

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button>
            <Archive className="h-4 w-4 mr-2" />
            백업 생성
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            데이터 백업 생성
          </DialogTitle>
          <DialogDescription>
            교회 데이터를 Excel 파일로 백업할 수 있습니다
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 설정 단계 */}
          {step === 'configure' && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">백업할 데이터 선택</CardTitle>
                  <CardDescription>
                    백업에 포함할 데이터 타입을 선택하세요
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="members"
                      checked={options.includeMembers}
                      onCheckedChange={(checked) => updateOption('includeMembers', !!checked)}
                    />
                    <Label htmlFor="members" className="flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      교인 정보
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="offerings"
                      checked={options.includeOfferings}
                      onCheckedChange={(checked) => updateOption('includeOfferings', !!checked)}
                    />
                    <Label htmlFor="offerings" className="flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      헌금 내역
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="attendances"
                      checked={options.includeAttendances}
                      onCheckedChange={(checked) => updateOption('includeAttendances', !!checked)}
                    />
                    <Label htmlFor="attendances" className="flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      출석 현황
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="visitations"
                      checked={options.includeVisitations}
                      onCheckedChange={(checked) => updateOption('includeVisitations', !!checked)}
                    />
                    <Label htmlFor="visitations" className="flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      심방 기록
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="expenseReports"
                      checked={options.includeExpenseReports}
                      onCheckedChange={(checked) => updateOption('includeExpenseReports', !!checked)}
                    />
                    <Label htmlFor="expenseReports" className="flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      지출결의서
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="organizations"
                      checked={options.includeOrganizations}
                      onCheckedChange={(checked) => updateOption('includeOrganizations', !!checked)}
                    />
                    <Label htmlFor="organizations" className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      조직도
                    </Label>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">백업 옵션</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>날짜 범위 (선택사항)</Label>
                    <div className="flex gap-2 mt-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateRange.from ? (
                              format(dateRange.from, 'PPP', { locale: ko })
                            ) : (
                              <span>시작일</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={dateRange.from}
                            onSelect={(date) => setDateRange(prev => ({ ...prev, from: date }))}
                            autoFocus
                          />
                        </PopoverContent>
                      </Popover>
                      
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateRange.to ? (
                              format(dateRange.to, 'PPP', { locale: ko })
                            ) : (
                              <span>종료일</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={dateRange.to}
                            onSelect={(date) => setDateRange(prev => ({ ...prev, to: date }))}
                            autoFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      선택하지 않으면 전체 기간의 데이터를 백업합니다
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="filename">파일명 (선택사항)</Label>
                    <Input
                      id="filename"
                      value={options.filename}
                      onChange={(e) => updateOption('filename', e.target.value)}
                      placeholder={getDefaultFilename()}
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleClose}>
                  취소
                </Button>
                <Button
                  onClick={handleCreateBackup}
                  disabled={createBackupMutation.isLoading}
                >
                  백업 생성
                </Button>
              </div>
            </div>
          )}

          {/* 백업 생성 진행 단계 */}
          {step === 'creating' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">백업 생성 중...</h3>
              <div className="space-y-2">
                <Progress value={progress} />
                <p className="text-sm text-center">{progressMessage}</p>
              </div>
            </div>
          )}

          {/* 완료 단계 */}
          {step === 'complete' && backupResult && (
            <div className="space-y-4 text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
              <h3 className="text-lg font-semibold">백업 완료</h3>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{backupResult.filename}</CardTitle>
                  <CardDescription>
                    총 {totalRecords}건의 데이터가 백업되었습니다
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {backupResult.includedTables.map(table => (
                      <div key={table} className="flex justify-between">
                        <span>{table}:</span>
                        <span className="font-semibold">
                          {backupResult.recordCounts[table]?.toLocaleString()}건
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              <Button onClick={handleClose}>
                확인
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}