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
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FileUp, Download, AlertTriangle, CheckCircle, X } from 'lucide-react'
import { toast } from 'sonner'
import { trpc } from '@/lib/trpc/client'
import { DataType, ImportResult, ImportError } from '@/lib/data-import-export/types'
import { readExcelFile, mapColumns } from '@/lib/data-import-export/excel-processor'

interface ImportDialogProps {
  children?: React.ReactNode
  onImportComplete?: (result: ImportResult) => void
}

export function ImportDialog({ children, onImportComplete }: ImportDialogProps) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<'select' | 'upload' | 'validate' | 'import' | 'complete'>('select')
  const [dataType, setDataType] = useState<DataType | ''>('')
  const [file, setFile] = useState<File | null>(null)
  const [fileData, setFileData] = useState<any[]>([])
  const [validationResult, setValidationResult] = useState<ImportResult | null>(null)
  const [progress, setProgress] = useState(0)
  const [progressMessage, setProgressMessage] = useState('')
  const [options, setOptions] = useState({
    skipErrors: true,
    updateExisting: false
  })

  // tRPC mutations
  const validateDataMutation = trpc.importExport.validateData.useMutation()
  const importMembersMutation = trpc.importExport.importMembers.useMutation()
  const importOfferingsMutation = trpc.importExport.importOfferings.useMutation()
  const importAttendancesMutation = trpc.importExport.importAttendances.useMutation()
  const downloadTemplateQuery = trpc.importExport.downloadTemplate.useQuery({
    dataType: dataType as DataType
  }, {
    enabled: false,
  })

  const reset = () => {
    setStep('select')
    setDataType('')
    setFile(null)
    setFileData([])
    setValidationResult(null)
    setProgress(0)
    setProgressMessage('')
    setOptions({ skipErrors: true, updateExisting: false })
  }

  const handleClose = () => {
    setOpen(false)
    setTimeout(reset, 300) // 애니메이션 완료 후 리셋
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) return

    if (!selectedFile.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast.error('Excel (.xlsx, .xls) 또는 CSV 파일만 업로드 가능합니다')
      return
    }

    setFile(selectedFile)
    setProgress(0)
    setProgressMessage('파일을 읽는 중...')
    
    try {
      const data = await readExcelFile(selectedFile)
      setFileData(data)
      setStep('validate')
      setProgress(100)
      setProgressMessage('파일 읽기 완료')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '파일 읽기 실패')
      setFile(null)
    }
  }

  const handleValidate = async () => {
    if (!dataType || !fileData.length) return

    setProgress(0)
    setProgressMessage('데이터 검증 중...')

    try {
      const mappedData = mapColumns(fileData, dataType as DataType)
      
      const result = await validateDataMutation.mutateAsync({
        data: mappedData,
        dataType: dataType as DataType,
        options: {
          ...options,
          dataType: dataType as DataType
        }
      })

      setValidationResult(result)
      setProgress(100)
      setProgressMessage('검증 완료')
      
      if (result.errors.length === 0) {
        toast.success(`${result.summary.successful}건의 데이터가 검증되었습니다`)
      } else {
        toast.warning(`${result.summary.successful}건 성공, ${result.summary.failed}건 실패`)
      }
    } catch (error) {
      toast.error('데이터 검증 실패')
    }
  }

  const handleImport = async () => {
    if (!dataType || !fileData.length || !validationResult) return

    if (validationResult.summary.successful === 0) {
      toast.error('가져올 수 있는 데이터가 없습니다')
      return
    }

    setStep('import')
    setProgress(0)
    setProgressMessage('데이터 가져오기 시작...')

    try {
      const mappedData = mapColumns(fileData, dataType as DataType)
      let result: ImportResult

      switch (dataType) {
        case DataType.MEMBERS:
          result = await importMembersMutation.mutateAsync({
            data: mappedData,
            options: {
              ...options,
              dataType: dataType as DataType
            }
          })
          break
        case DataType.OFFERINGS:
          result = await importOfferingsMutation.mutateAsync({
            data: mappedData,
            options: {
              ...options,
              dataType: dataType as DataType
            }
          })
          break
        case DataType.ATTENDANCES:
          result = await importAttendancesMutation.mutateAsync({
            data: mappedData,
            options: {
              ...options,
              dataType: dataType as DataType
            }
          })
          break
        default:
          throw new Error('지원되지 않는 데이터 타입입니다')
      }

      setProgress(100)
      setProgressMessage('가져오기 완료')
      setStep('complete')
      
      toast.success(`${result.summary.successful}건의 데이터를 성공적으로 가져왔습니다`)
      
      onImportComplete?.(result)
    } catch (error) {
      toast.error('데이터 가져오기 실패')
      setStep('validate')
    }
  }

  const handleDownloadTemplate = async () => {
    if (!dataType) return

    try {
      const result = await downloadTemplateQuery.refetch()

      if (result.data && result.data.success && result.data.data) {
        // Base64를 Blob으로 변환하여 다운로드
        const binaryString = atob(result.data.data)
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
        link.download = result.data.filename || '템플릿.xlsx'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)

        toast.success('템플릿이 다운로드되었습니다')
      }
    } catch (error) {
      toast.error('템플릿 다운로드 실패')
    }
  }

  const getDataTypeLabel = (type: DataType) => {
    switch (type) {
      case DataType.MEMBERS: return '교인 정보'
      case DataType.OFFERINGS: return '헌금 내역'
      case DataType.ATTENDANCES: return '출석 현황'
      case DataType.VISITATIONS: return '심방 기록'
      case DataType.EXPENSE_REPORTS: return '지출결의서'
      default: return type
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button>
            <FileUp className="h-4 w-4 mr-2" />
            데이터 가져오기
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileUp className="h-5 w-5" />
            데이터 가져오기
          </DialogTitle>
          <DialogDescription>
            Excel 또는 CSV 파일로부터 데이터를 가져올 수 있습니다
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 단계 1: 데이터 타입 선택 */}
          {step === 'select' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="dataType">데이터 타입</Label>
                <Select value={dataType} onValueChange={(value) => setDataType(value as DataType)}>
                  <SelectTrigger>
                    <SelectValue placeholder="가져올 데이터 타입을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={DataType.MEMBERS}>교인 정보</SelectItem>
                    <SelectItem value={DataType.OFFERINGS}>헌금 내역</SelectItem>
                    <SelectItem value={DataType.ATTENDANCES}>출석 현황</SelectItem>
                    <SelectItem value={DataType.VISITATIONS}>심방 기록</SelectItem>
                    <SelectItem value={DataType.EXPENSE_REPORTS}>지출결의서</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleDownloadTemplate}
                  disabled={!dataType || downloadTemplateQuery.isLoading}
                  variant="outline"
                >
                  <Download className="h-4 w-4 mr-2" />
                  템플릿 다운로드
                </Button>
                <Button
                  onClick={() => setStep('upload')}
                  disabled={!dataType}
                >
                  다음
                </Button>
              </div>
            </div>
          )}

          {/* 단계 2: 파일 업로드 */}
          {step === 'upload' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="file">
                  {getDataTypeLabel(dataType as DataType)} 파일 업로드
                </Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStep('select')}
                >
                  이전
                </Button>
              </div>
              
              <Input
                id="file"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
              />
              
              <div className="text-sm text-muted-foreground">
                <p>• 지원 형식: .xlsx, .xls, .csv</p>
                <p>• 첫 번째 행은 헤더로 사용됩니다</p>
                <p>• 템플릿을 사용하면 오류를 최소화할 수 있습니다</p>
              </div>

              {progress > 0 && (
                <div className="space-y-2">
                  <Progress value={progress} />
                  <p className="text-sm text-center">{progressMessage}</p>
                </div>
              )}
            </div>
          )}

          {/* 단계 3: 데이터 검증 */}
          {step === 'validate' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  데이터 검증 ({fileData.length}건)
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStep('upload')}
                >
                  이전
                </Button>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="skipErrors"
                    checked={options.skipErrors}
                    onCheckedChange={(checked) => 
                      setOptions(prev => ({ ...prev, skipErrors: !!checked }))
                    }
                  />
                  <Label htmlFor="skipErrors">
                    오류가 있는 행 건너뛰기
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="updateExisting"
                    checked={options.updateExisting}
                    onCheckedChange={(checked) => 
                      setOptions(prev => ({ ...prev, updateExisting: !!checked }))
                    }
                  />
                  <Label htmlFor="updateExisting">
                    기존 데이터 업데이트 (이름/이메일 기준)
                  </Label>
                </div>
              </div>

              {validationResult && (
                <Alert className={validationResult.errors.length > 0 ? 'border-yellow-500' : 'border-green-500'}>
                  <div className="flex items-center gap-2">
                    {validationResult.errors.length > 0 ? (
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    <AlertDescription>
                      <div className="space-y-1">
                        <p>
                          성공: {validationResult.summary.successful}건, 
                          실패: {validationResult.summary.failed}건
                        </p>
                        {validationResult.errors.length > 0 && (
                          <div className="max-h-40 overflow-y-auto">
                            <p className="font-semibold">오류 목록:</p>
                            {validationResult.errors.slice(0, 10).map((error, index) => (
                              <p key={index} className="text-xs">
                                {error.row}행: {error.message}
                              </p>
                            ))}
                            {validationResult.errors.length > 10 && (
                              <p className="text-xs">...외 {validationResult.errors.length - 10}개</p>
                            )}
                          </div>
                        )}
                      </div>
                    </AlertDescription>
                  </div>
                </Alert>
              )}

              {progress > 0 && (
                <div className="space-y-2">
                  <Progress value={progress} />
                  <p className="text-sm text-center">{progressMessage}</p>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={handleValidate}
                  disabled={validateDataMutation.isLoading}
                  variant="outline"
                >
                  {validateDataMutation.isLoading ? '검증 중...' : '데이터 검증'}
                </Button>
                {validationResult && validationResult.summary.successful > 0 && (
                  <Button onClick={handleImport}>
                    데이터 가져오기
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* 단계 4: 가져오기 진행 */}
          {step === 'import' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">데이터 가져오는 중...</h3>
              <div className="space-y-2">
                <Progress value={progress} />
                <p className="text-sm text-center">{progressMessage}</p>
              </div>
            </div>
          )}

          {/* 단계 5: 완료 */}
          {step === 'complete' && (
            <div className="space-y-4 text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
              <h3 className="text-lg font-semibold">가져오기 완료</h3>
              <p className="text-muted-foreground">
                데이터를 성공적으로 가져왔습니다
              </p>
              <Button onClick={handleClose}>
                확인
              </Button>
            </div>
          )}
        </div>

        {step !== 'complete' && step !== 'import' && (
          <div className="flex justify-end">
            <Button variant="outline" onClick={handleClose}>
              <X className="h-4 w-4 mr-2" />
              취소
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}