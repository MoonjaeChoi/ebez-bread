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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Download, CalendarIcon, CheckCircle } from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { toast } from 'sonner'
import { trpc } from '@/lib/trpc/client'
import { DataType, FileFormat } from '@/lib/data-import-export/types'

interface ExportDialogProps {
  children?: React.ReactNode
  defaultDataType?: DataType
}

interface DateRange {
  from: Date | undefined
  to: Date | undefined
}

export function ExportDialog({ children, defaultDataType }: ExportDialogProps) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<'configure' | 'exporting' | 'complete'>('configure')
  const [dataType, setDataType] = useState<DataType | ''>(defaultDataType || '')
  const [fileFormat, setFileFormat] = useState<FileFormat>(FileFormat.EXCEL)
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined })
  const [includeInactive, setIncludeInactive] = useState(false)
  const [filename, setFilename] = useState('')
  const [progress, setProgress] = useState(0)
  const [progressMessage, setProgressMessage] = useState('')
  const [exportResult, setExportResult] = useState<{
    filename: string
    recordCount: number
  } | null>(null)

  const exportDataMutation = trpc.importExport.exportData.useMutation()

  const reset = () => {
    setStep('configure')
    setDataType(defaultDataType || '')
    setFileFormat(FileFormat.EXCEL)
    setDateRange({ from: undefined, to: undefined })
    setIncludeInactive(false)
    setFilename('')
    setProgress(0)
    setProgressMessage('')
    setExportResult(null)
  }

  const handleClose = () => {
    setOpen(false)
    setTimeout(reset, 300)
  }

  const handleExport = async () => {
    if (!dataType) return

    setStep('exporting')
    setProgress(0)
    setProgressMessage('데이터 내보내기 시작...')

    try {
      const options = {
        dataType: dataType as DataType,
        format: fileFormat,
        ...(dateRange.from && dateRange.to && {
          dateRange: {
            start: dateRange.from.toISOString(),
            end: dateRange.to.toISOString()
          }
        }),
        includeInactive,
        filename: filename || undefined
      }

      setProgress(50)
      setProgressMessage('데이터 준비 중...')

      const result = await exportDataMutation.mutateAsync(options)

      if (result && result.success && result.data) {
        setProgress(80)
        setProgressMessage('파일 생성 중...')

        // Base64를 Blob으로 변환하여 다운로드
        const binaryString = atob(result.data)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        
        const mimeType = fileFormat === FileFormat.CSV 
          ? 'text/csv' 
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        
        const blob = new Blob([bytes], { type: mimeType })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = result.filename || '데이터.xlsx'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)

        setProgress(100)
        setProgressMessage('내보내기 완료')
        setExportResult({
          filename: result.filename || '데이터.xlsx',
          recordCount: result.recordCount
        })
        setStep('complete')
        
        toast.success('데이터가 성공적으로 내보내졌습니다')
      }
    } catch (error) {
      toast.error('데이터 내보내기 실패')
      setStep('configure')
    }
  }

  const getDataTypeLabel = (type: DataType) => {
    switch (type) {
      case DataType.MEMBERS: return '교인 정보'
      case DataType.OFFERINGS: return '헌금 내역'
      case DataType.ATTENDANCES: return '출석 현황'
      case DataType.VISITATIONS: return '심방 기록'
      case DataType.EXPENSE_REPORTS: return '지출결의서'
      case DataType.ORGANIZATIONS: return '조직도'
      case DataType.ORGANIZATION_MEMBERSHIPS: return '조직별 직책 구성원'
      case DataType.ACCOUNT_CODES: return '회계 계정코드'
      default: return type
    }
  }

  const getDefaultFilename = () => {
    if (!dataType) return ''
    
    const today = new Date().toISOString().split('T')[0]
    const typeLabel = getDataTypeLabel(dataType as DataType)
    const extension = fileFormat === FileFormat.CSV ? 'csv' : 'xlsx'
    
    return `${typeLabel}_${today}.${extension}`
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            데이터 내보내기
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            데이터 내보내기
          </DialogTitle>
          <DialogDescription>
            데이터를 Excel 또는 CSV 파일로 내보낼 수 있습니다
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 설정 단계 */}
          {step === 'configure' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="dataType">데이터 타입</Label>
                <Select value={dataType} onValueChange={(value) => setDataType(value as DataType)}>
                  <SelectTrigger>
                    <SelectValue placeholder="내보낼 데이터 타입을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={DataType.MEMBERS}>교인 정보</SelectItem>
                    <SelectItem value={DataType.OFFERINGS}>헌금 내역</SelectItem>
                    <SelectItem value={DataType.ATTENDANCES}>출석 현황</SelectItem>
                    <SelectItem value={DataType.VISITATIONS}>심방 기록</SelectItem>
                    <SelectItem value={DataType.EXPENSE_REPORTS}>지출결의서</SelectItem>
                    <SelectItem value={DataType.ORGANIZATIONS}>조직도</SelectItem>
                    <SelectItem value={DataType.ORGANIZATION_MEMBERSHIPS}>조직별 직책 구성원</SelectItem>
                    <SelectItem value={DataType.ACCOUNT_CODES}>회계 계정코드</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="format">파일 형식</Label>
                <Select value={fileFormat} onValueChange={(value) => setFileFormat(value as FileFormat)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={FileFormat.EXCEL}>Excel (.xlsx)</SelectItem>
                    <SelectItem value={FileFormat.CSV}>CSV (.csv)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

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
              </div>

              {dataType === DataType.MEMBERS && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeInactive"
                    checked={includeInactive}
                    onCheckedChange={(checked) => setIncludeInactive(checked as boolean)}
                  />
                  <Label htmlFor="includeInactive">
                    비활성 교인 포함
                  </Label>
                </div>
              )}

              <div>
                <Label htmlFor="filename">파일명 (선택사항)</Label>
                <Input
                  id="filename"
                  value={filename}
                  onChange={(e) => setFilename(e.target.value)}
                  placeholder={getDefaultFilename()}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleClose}>
                  취소
                </Button>
                <Button
                  onClick={handleExport}
                  disabled={!dataType || exportDataMutation.isLoading}
                >
                  내보내기
                  {/* Debug: {dataType ? `(${dataType})` : '(선택 안됨)'} */}
                </Button>
              </div>
            </div>
          )}

          {/* 내보내기 진행 단계 */}
          {step === 'exporting' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">데이터 내보내는 중...</h3>
              <div className="space-y-2">
                <Progress value={progress} />
                <p className="text-sm text-center">{progressMessage}</p>
              </div>
            </div>
          )}

          {/* 완료 단계 */}
          {step === 'complete' && exportResult && (
            <div className="space-y-4 text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
              <h3 className="text-lg font-semibold">내보내기 완료</h3>
              <div className="text-muted-foreground">
                <p>{exportResult.filename}</p>
                <p>{exportResult.recordCount}건의 데이터가 내보내졌습니다</p>
              </div>
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