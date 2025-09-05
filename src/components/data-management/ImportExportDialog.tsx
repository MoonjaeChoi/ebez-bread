'use client'

import { useState, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Download, 
  Upload, 
  FileText, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileSpreadsheet,
  Info,
  Loader2,
  FileText as FilePdf
} from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { 
  downloadExcelTemplate, 
  exportToExcel,
  readExcelFile,
  validateExcelData,
  ORGANIZATION_MEMBERSHIP_TEMPLATE,
  type ValidationResult
} from '@/lib/utils/excelUtils'
import { 
  generateOrganizationMembershipReport, 
  generateMembershipStatsReport, 
  ORGANIZATION_MEMBERSHIP_PDF_CONFIG 
} from '@/lib/utils/pdfUtils'

interface ImportExportDialogProps {
  open: boolean
  onClose: () => void
  organizationId?: string
  onImportSuccess?: () => void
}

interface ImportData {
  memberName: string
  memberPhone?: string
  memberEmail?: string
  organizationName: string
  organizationCode?: string
  roleName?: string
  joinDate: string
  endDate?: string
  isActive: string
  memo?: string
}

export function ImportExportDialog({
  open,
  onClose,
  organizationId,
  onImportSuccess
}: ImportExportDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [importData, setImportData] = useState<ImportData[]>([])
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [importStatus, setImportStatus] = useState<'idle' | 'validating' | 'importing' | 'success' | 'error'>('idle')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 현재 조직의 구성원 데이터 조회 (내보내기용)
  const { data: membershipData, isLoading: isLoadingData } = trpc.organizationMemberships.getByOrganization.useQuery({
    organizationId: organizationId || '',
    includeInactive: true
  }, {
    enabled: !!organizationId && open
  })

  // 일괄 가져오기 mutation
  const importMembershipsMutation = trpc.organizationMemberships.bulkImport.useMutation()

  // Excel 템플릿 다운로드
  const handleDownloadTemplate = () => {
    downloadExcelTemplate(
      ORGANIZATION_MEMBERSHIP_TEMPLATE,
      '조직구성원_템플릿.xlsx'
    )
  }

  // 현재 데이터 Excel로 내보내기
  const handleExportData = () => {
    if (!membershipData || membershipData.length === 0) {
      alert('내보낼 데이터가 없습니다.')
      return
    }

    // 데이터 변환
    const exportData = membershipData.map(membership => ({
      memberName: membership.member.name,
      memberPhone: membership.member.phone || '',
      memberEmail: membership.member.email || '',
      organizationName: membership.organization.name,
      organizationCode: membership.organization.code,
      roleName: membership.role?.name || '',
      joinDate: new Date(membership.joinDate).toISOString().split('T')[0],
      endDate: membership.endDate ? new Date(membership.endDate).toISOString().split('T')[0] : '',
      isActive: membership.isActive ? '활성' : '비활성',
      memo: membership.notes || ''
    }))

    const organizationName = membershipData[0]?.organization.name || '조직'
    exportToExcel(
      exportData,
      ORGANIZATION_MEMBERSHIP_TEMPLATE.columns,
      '조직구성원',
      `조직구성원_${organizationName}_${new Date().toISOString().split('T')[0]}.xlsx`
    )
  }

  // 현재 데이터 PDF로 내보내기
  const handleExportPDF = () => {
    if (!membershipData || membershipData.length === 0) {
      alert('내보낼 데이터가 없습니다.')
      return
    }

    // 데이터 변환
    const exportData = membershipData.map(membership => ({
      memberName: membership.member.name,
      memberPhone: membership.member.phone || '',
      memberEmail: membership.member.email || '',
      organizationName: membership.organization.name,
      organizationCode: membership.organization.code || '',
      roleName: membership.role?.name || '',
      joinDate: membership.joinDate,
      endDate: membership.endDate || '',
      isActive: membership.isActive,
      memo: membership.notes || ''
    }))

    const organizationName = membershipData[0]?.organization.name || '조직'
    generateOrganizationMembershipReport({
      ...ORGANIZATION_MEMBERSHIP_PDF_CONFIG,
      title: `${organizationName} 구성원 현황 보고서`,
      subtitle: `생성일: ${new Date().toLocaleDateString('ko-KR')}`,
      data: exportData,
      filename: `조직구성원_${organizationName}_${new Date().toISOString().split('T')[0]}.pdf`
    })
  }

  // 통계 보고서 PDF로 내보내기
  const handleExportStatsReport = () => {
    if (!membershipData || membershipData.length === 0) {
      alert('내보낼 데이터가 없습니다.')
      return
    }

    const organizationName = membershipData[0]?.organization.name || '조직'
    
    // 통계 계산
    const totalMembers = membershipData.length
    const activeMembers = membershipData.filter(m => m.isActive).length
    const inactiveMembers = totalMembers - activeMembers
    const leadershipMembers = membershipData.filter(m => m.role?.isLeadership).length
    
    // 직책별 분포 계산
    const roleCount = new Map<string, number>()
    membershipData.forEach(m => {
      const roleName = m.role?.name || '직책 없음'
      roleCount.set(roleName, (roleCount.get(roleName) || 0) + 1)
    })
    
    const roleDistribution = Array.from(roleCount.entries()).map(([roleName, count]) => ({
      roleName,
      count
    }))

    generateMembershipStatsReport(organizationName, {
      totalMembers,
      activeMembers,
      inactiveMembers,
      leadershipMembers,
      roleDistribution
    })
  }

  // 파일 선택 처리
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setImportData([])
      setValidationResult(null)
      setImportStatus('idle')
    }
  }

  // 파일 검증 및 미리보기
  const handleValidateFile = async () => {
    if (!selectedFile) return

    setImportStatus('validating')
    setIsProcessing(true)

    try {
      // 파일 읽기
      const rawData = await readExcelFile(selectedFile)
      
      // 데이터 검증
      const validation = validateExcelData(rawData, ORGANIZATION_MEMBERSHIP_TEMPLATE)
      setValidationResult(validation)

      if (validation.isValid || validation.errors.length === 0) {
        // 유효한 데이터 변환
        const headers = rawData[0]
        const dataRows = rawData.slice(1).filter(row => 
          row.some(cell => cell && cell.toString().trim() !== '')
        )

        const transformedData: ImportData[] = dataRows.map(row => ({
          memberName: row[0]?.toString() || '',
          memberPhone: row[1]?.toString() || '',
          memberEmail: row[2]?.toString() || '',
          organizationName: row[3]?.toString() || '',
          organizationCode: row[4]?.toString() || '',
          roleName: row[5]?.toString() || '',
          joinDate: row[6]?.toString() || '',
          endDate: row[7]?.toString() || '',
          isActive: row[8]?.toString() || '활성',
          memo: row[9]?.toString() || ''
        }))

        setImportData(transformedData)
      }

    } catch (error) {
      console.error('파일 검증 오류:', error)
      setValidationResult({
        isValid: false,
        errors: [{
          row: 0,
          column: 'general',
          message: '파일을 읽을 수 없습니다. Excel 파일(.xlsx)인지 확인해주세요.',
          value: null
        }],
        warnings: []
      })
    }

    setIsProcessing(false)
  }

  // 데이터 가져오기 실행
  const handleImportData = async () => {
    if (!importData.length || !validationResult?.isValid) return

    setImportStatus('importing')
    setIsProcessing(true)
    setImportProgress(0)

    try {
      // 실제 import API 호출
      const result = await importMembershipsMutation.mutateAsync({
        data: importData,
        createMissingEntities: true,
        reason: 'Excel 파일 일괄 가져오기'
      })

      if (result.success) {
        setImportStatus('success')
        onImportSuccess?.()
      } else {
        setImportStatus('error')
      }
      
    } catch (error) {
      console.error('가져오기 오류:', error)
      setImportStatus('error')
    }

    setIsProcessing(false)
  }

  // 다이얼로그 초기화
  const handleClose = () => {
    setSelectedFile(null)
    setImportData([])
    setValidationResult(null)
    setImportStatus('idle')
    setImportProgress(0)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            데이터 가져오기/내보내기
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="import" className="flex-1">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="import">가져오기</TabsTrigger>
            <TabsTrigger value="export">내보내기</TabsTrigger>
          </TabsList>

          {/* 가져오기 탭 */}
          <TabsContent value="import" className="space-y-4">
            {/* 파일 선택 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">1. Excel 파일 선택</CardTitle>
                <CardDescription>
                  조직 구성원 정보가 포함된 Excel 파일(.xlsx)을 선택하세요.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessing}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    파일 선택
                  </Button>
                  
                  <Button
                    variant="ghost"
                    onClick={handleDownloadTemplate}
                    className="text-blue-600"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    템플릿 다운로드
                  </Button>
                </div>

                {selectedFile && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <FileText className="h-4 w-4" />
                    {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </CardContent>
            </Card>

            {/* 파일 검증 */}
            {selectedFile && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">2. 데이터 검증</CardTitle>
                  <CardDescription>
                    선택한 파일의 데이터를 검증하고 미리보기를 확인하세요.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    onClick={handleValidateFile}
                    disabled={isProcessing || importStatus === 'validating'}
                  >
                    {importStatus === 'validating' ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        검증 중...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        데이터 검증
                      </>
                    )}
                  </Button>

                  {/* 검증 결과 */}
                  {validationResult && (
                    <div className="space-y-3">
                      {/* 오류 표시 */}
                      {validationResult.errors.length > 0 && (
                        <Alert className="border-red-200">
                          <XCircle className="h-4 w-4" />
                          <AlertDescription>
                            <div className="font-medium mb-2">
                              {validationResult.errors.length}개의 오류가 발견되었습니다
                            </div>
                            <ScrollArea className="max-h-32">
                              {validationResult.errors.map((error, index) => (
                                <div key={index} className="text-sm mb-1">
                                  행 {error.row + 1}, {error.column}: {error.message}
                                </div>
                              ))}
                            </ScrollArea>
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* 경고 표시 */}
                      {validationResult.warnings.length > 0 && (
                        <Alert className="border-yellow-200">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            <div className="font-medium mb-2">
                              {validationResult.warnings.length}개의 경고가 있습니다
                            </div>
                            <ScrollArea className="max-h-24">
                              {validationResult.warnings.map((warning, index) => (
                                <div key={index} className="text-sm mb-1">
                                  행 {warning.row + 1}: {warning.message}
                                </div>
                              ))}
                            </ScrollArea>
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* 성공 표시 */}
                      {validationResult.isValid && (
                        <Alert className="border-green-200">
                          <CheckCircle className="h-4 w-4" />
                          <AlertDescription>
                            데이터 검증이 완료되었습니다. {importData.length}개의 항목을 가져올 수 있습니다.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* 데이터 미리보기 */}
            {importData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">3. 데이터 미리보기</CardTitle>
                  <CardDescription>
                    가져올 데이터를 확인하세요. ({importData.length}개 항목)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="max-h-64">
                    <div className="space-y-2">
                      {importData.slice(0, 10).map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded">
                          <div className="space-y-1">
                            <div className="font-medium">{item.memberName}</div>
                            <div className="text-sm text-gray-600">
                              {item.organizationName} • {item.roleName || '직책 없음'}
                            </div>
                          </div>
                          <Badge variant={item.isActive === '활성' ? 'default' : 'secondary'}>
                            {item.isActive}
                          </Badge>
                        </div>
                      ))}
                      {importData.length > 10 && (
                        <div className="text-center text-sm text-gray-500 py-2">
                          ... 및 {importData.length - 10}개 더
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {/* 가져오기 실행 */}
            {validationResult?.isValid && importData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">4. 가져오기 실행</CardTitle>
                  <CardDescription>
                    검증된 데이터를 시스템에 가져옵니다.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {importStatus === 'importing' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>진행률</span>
                        <span>{Math.round(importProgress)}%</span>
                      </div>
                      <Progress value={importProgress} />
                    </div>
                  )}

                  {importStatus === 'success' && (
                    <Alert className="border-green-200">
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        성공적으로 {importData.length}개의 항목을 가져왔습니다!
                      </AlertDescription>
                    </Alert>
                  )}

                  {importStatus === 'error' && (
                    <Alert className="border-red-200">
                      <XCircle className="h-4 w-4" />
                      <AlertDescription>
                        가져오기 중 오류가 발생했습니다. 다시 시도해주세요.
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button
                    onClick={handleImportData}
                    disabled={isProcessing || importStatus === 'success'}
                    className="w-full"
                  >
                    {importStatus === 'importing' ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        가져오는 중... ({Math.round(importProgress)}%)
                      </>
                    ) : importStatus === 'success' ? (
                      '가져오기 완료'
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        데이터 가져오기
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* 내보내기 탭 */}
          <TabsContent value="export" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">현재 데이터 내보내기</CardTitle>
                <CardDescription>
                  현재 조직의 구성원 데이터를 Excel 파일로 내보냅니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoadingData ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="ml-2">데이터를 불러오는 중...</span>
                  </div>
                ) : (
                  <>
                    <div className="text-sm text-gray-600">
                      <Info className="h-4 w-4 inline mr-1" />
                      총 {membershipData?.length || 0}개의 구성원 데이터가 있습니다.
                    </div>

                    <div className="space-y-3">
                      <div className="flex gap-3 flex-wrap">
                        <Button
                          onClick={handleExportData}
                          disabled={!membershipData || membershipData.length === 0}
                        >
                          <FileSpreadsheet className="h-4 w-4 mr-2" />
                          Excel로 내보내기
                        </Button>

                        <Button
                          onClick={handleExportPDF}
                          disabled={!membershipData || membershipData.length === 0}
                          variant="secondary"
                        >
                          <FilePdf className="h-4 w-4 mr-2" />
                          PDF 보고서
                        </Button>

                        <Button
                          onClick={handleExportStatsReport}
                          disabled={!membershipData || membershipData.length === 0}
                          variant="secondary"
                        >
                          <FilePdf className="h-4 w-4 mr-2" />
                          통계 보고서
                        </Button>
                      </div>

                      <Button
                        variant="outline"
                        onClick={handleDownloadTemplate}
                        className="w-full"
                      >
                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                        빈 템플릿 다운로드
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">내보내기 형식</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-medium mb-2">포함 정보:</div>
                    <ul className="space-y-1 text-gray-600">
                      <li>• 구성원 기본 정보</li>
                      <li>• 조직 및 직책 정보</li>
                      <li>• 참여 기간 정보</li>
                      <li>• 활성 상태</li>
                      <li>• 메모</li>
                    </ul>
                  </div>
                  <div>
                    <div className="font-medium mb-2">파일 형식:</div>
                    <ul className="space-y-1 text-gray-600">
                      <li>• <strong>Excel (.xlsx)</strong>: 데이터 편집 및 가져오기용</li>
                      <li>• <strong>PDF 보고서</strong>: 인쇄 및 공유용</li>
                      <li>• <strong>PDF 통계</strong>: 요약 보고서</li>
                    </ul>
                  </div>
                </div>
                
                <div className="border-t pt-3">
                  <div className="font-medium mb-2 text-sm">내보내기 옵션:</div>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div className="p-3 bg-blue-50 rounded-md">
                      <div className="font-medium text-blue-700 mb-1">Excel 내보내기</div>
                      <p className="text-blue-600">데이터 편집이 가능한 형식</p>
                      <p className="text-blue-600">템플릿과 호환</p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-md">
                      <div className="font-medium text-green-700 mb-1">PDF 보고서</div>
                      <p className="text-green-600">구성원 상세 정보</p>
                      <p className="text-green-600">인쇄 최적화</p>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-md">
                      <div className="font-medium text-purple-700 mb-1">통계 보고서</div>
                      <p className="text-purple-600">요약 및 통계 정보</p>
                      <p className="text-purple-600">임원진 보고용</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}