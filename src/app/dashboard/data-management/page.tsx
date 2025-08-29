'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  FileUp, 
  Download, 
  Archive, 
  Database, 
  Users, 
  HandHeart, 
  Calendar,
  MapPin,
  Receipt,
  Building2,
  UserCheck,
  AlertTriangle,
  CheckCircle,
  Info,
  Calculator
} from 'lucide-react'
import { ImportDialog } from '@/components/data-management/ImportDialog'
import { ExportDialog } from '@/components/data-management/ExportDialog'
import { BackupDialog } from '@/components/data-management/BackupDialog'
import { DataType } from '@/lib/data-import-export/types'

export default function DataManagementPage() {
  const [recentActivity, setRecentActivity] = useState<Array<{
    id: string
    type: 'import' | 'export' | 'backup'
    dataType: string
    recordCount: number
    timestamp: Date
    status: 'success' | 'warning' | 'error'
    message: string
  }>>([
    {
      id: '1',
      type: 'import',
      dataType: '교인 정보',
      recordCount: 25,
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2시간 전
      status: 'success',
      message: '25건의 교인 정보를 성공적으로 가져왔습니다'
    },
    {
      id: '2',
      type: 'export',
      dataType: '헌금 내역',
      recordCount: 150,
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6시간 전
      status: 'success',
      message: '150건의 헌금 내역을 내보냈습니다'
    },
    {
      id: '3',
      type: 'backup',
      dataType: '전체 데이터',
      recordCount: 500,
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1일 전
      status: 'success',
      message: '전체 데이터 백업을 완료했습니다'
    }
  ])

  const dataTypeInfo = [
    {
      type: DataType.MEMBERS,
      title: '교인 정보',
      description: '교인의 개인정보, 연락처, 직분, 부서 등',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      type: DataType.OFFERINGS,
      title: '헌금 내역',
      description: '십일조, 감사헌금, 특별헌금 등 헌금 기록',
      icon: HandHeart,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    {
      type: DataType.ATTENDANCES,
      title: '출석 현황',
      description: '각종 예배 및 모임 출석 기록',
      icon: Calendar,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200'
    },
    {
      type: DataType.VISITATIONS,
      title: '심방 기록',
      description: '교인 심방 및 상담 기록',
      icon: MapPin,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200'
    },
    {
      type: DataType.EXPENSE_REPORTS,
      title: '지출결의서',
      description: '교회 지출 신청 및 승인 기록',
      icon: Receipt,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200'
    },
    {
      type: DataType.ORGANIZATIONS,
      title: '조직도',
      description: '교회 조직 구조 및 부서 정보',
      icon: Building2,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200'
    },
    {
      type: DataType.ORGANIZATION_MEMBERSHIPS,
      title: '조직별 직책 구성원',
      description: '조직별 교인 소속 및 직책 정보',
      icon: UserCheck,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
      borderColor: 'border-teal-200'
    },
    {
      type: DataType.ACCOUNT_CODES,
      title: '회계 계정코드',
      description: '교회 회계 시스템의 계정과목 정보',
      icon: Calculator,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200'
    }
  ]

  const handleImportComplete = (result: any) => {
    // 가져오기 완료 시 최근 활동에 추가
    const newActivity = {
      id: Date.now().toString(),
      type: 'import' as const,
      dataType: '데이터',
      recordCount: result.summary.successful,
      timestamp: new Date(),
      status: result.summary.failed > 0 ? 'warning' as const : 'success' as const,
      message: `${result.summary.successful}건 성공, ${result.summary.failed}건 실패`
    }
    setRecentActivity(prev => [newActivity, ...prev.slice(0, 4)])
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'import': return FileUp
      case 'export': return Download
      case 'backup': return Archive
      default: return Database
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return CheckCircle
      case 'warning': return AlertTriangle
      case 'error': return AlertTriangle
      default: return Info
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600'
      case 'warning': return 'text-yellow-600'
      case 'error': return 'text-red-600'
      default: return 'text-blue-600'
    }
  }

  const formatRelativeTime = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)

    if (diffDays > 0) {
      return `${diffDays}일 전`
    } else if (diffHours > 0) {
      return `${diffHours}시간 전`
    } else {
      return '방금 전'
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">데이터 관리</h1>
        <p className="text-muted-foreground">
          교회 데이터를 가져오고 내보내며 백업을 관리할 수 있습니다
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">개요</TabsTrigger>
          <TabsTrigger value="import">가져오기</TabsTrigger>
          <TabsTrigger value="export">내보내기</TabsTrigger>
          <TabsTrigger value="backup">백업</TabsTrigger>
        </TabsList>

        {/* 개요 탭 */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 빠른 작업 카드 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  빠른 작업
                </CardTitle>
                <CardDescription>
                  자주 사용하는 데이터 관리 작업
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <ImportDialog>
                  <Button className="w-full justify-start">
                    <FileUp className="h-4 w-4 mr-2" />
                    데이터 가져오기
                  </Button>
                </ImportDialog>
                
                <ExportDialog>
                  <Button variant="outline" className="w-full justify-start">
                    <Download className="h-4 w-4 mr-2" />
                    데이터 내보내기
                  </Button>
                </ExportDialog>
                
                <BackupDialog>
                  <Button variant="outline" className="w-full justify-start">
                    <Archive className="h-4 w-4 mr-2" />
                    백업 생성
                  </Button>
                </BackupDialog>
              </CardContent>
            </Card>

            {/* 최근 활동 카드 */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>최근 활동</CardTitle>
                <CardDescription>
                  최근 데이터 관리 활동 내역
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">
                      아직 활동 내역이 없습니다
                    </p>
                  ) : (
                    recentActivity.map((activity) => {
                      const ActivityIcon = getActivityIcon(activity.type)
                      const StatusIcon = getStatusIcon(activity.status)
                      
                      return (
                        <div key={activity.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                          <div className="flex-shrink-0">
                            <ActivityIcon className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{activity.dataType}</span>
                              <Badge variant="secondary" className="text-xs">
                                {activity.recordCount.toLocaleString()}건
                              </Badge>
                              <StatusIcon className={`h-4 w-4 ${getStatusColor(activity.status)}`} />
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {activity.message}
                            </p>
                          </div>
                          <div className="flex-shrink-0 text-xs text-muted-foreground">
                            {formatRelativeTime(activity.timestamp)}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 데이터 타입별 정보 */}
          <Card>
            <CardHeader>
              <CardTitle>지원되는 데이터 타입</CardTitle>
              <CardDescription>
                가져오기/내보내기가 가능한 데이터 타입들
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
                {dataTypeInfo.map((item) => {
                  const Icon = item.icon
                  return (
                    <div
                      key={item.type}
                      className={`p-4 rounded-lg border ${item.bgColor} ${item.borderColor}`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <Icon className={`h-6 w-6 ${item.color}`} />
                        <h3 className="font-semibold">{item.title}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 가져오기 탭 */}
        <TabsContent value="import" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileUp className="h-5 w-5" />
                  데이터 가져오기
                </CardTitle>
                <CardDescription>
                  Excel 또는 CSV 파일로부터 데이터를 가져올 수 있습니다
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    데이터 가져오기 전에 템플릿을 다운로드하여 올바른 형식으로 데이터를 준비하세요.
                  </AlertDescription>
                </Alert>

                <ImportDialog onImportComplete={handleImportComplete}>
                  <Button size="lg" className="w-full">
                    <FileUp className="h-5 w-5 mr-2" />
                    데이터 가져오기 시작
                  </Button>
                </ImportDialog>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>가져오기 지침</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <h4 className="font-semibold">1. 템플릿 다운로드</h4>
                  <p className="text-sm text-muted-foreground">
                    각 데이터 타입별 템플릿을 다운로드하여 올바른 형식을 확인하세요.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-semibold">2. 데이터 준비</h4>
                  <p className="text-sm text-muted-foreground">
                    템플릿에 맞춰 데이터를 입력하고, 필수 항목은 반드시 입력하세요.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-semibold">3. 파일 업로드</h4>
                  <p className="text-sm text-muted-foreground">
                    준비된 파일을 업로드하고 데이터 검증을 실행하세요.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-semibold">4. 검증 및 가져오기</h4>
                  <p className="text-sm text-muted-foreground">
                    검증 결과를 확인한 후 데이터를 최종 가져오세요.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 내보내기 탭 */}
        <TabsContent value="export" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  데이터 내보내기
                </CardTitle>
                <CardDescription>
                  교회 데이터를 Excel 또는 CSV 파일로 내보낼 수 있습니다
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {dataTypeInfo.map((item) => {
                    const Icon = item.icon
                    return (
                      <div
                        key={item.type}
                        className={`p-4 rounded-lg border ${item.bgColor} ${item.borderColor}`}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <Icon className={`h-5 w-5 ${item.color}`} />
                          <h3 className="font-semibold">{item.title}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">
                          {item.description}
                        </p>
                        <ExportDialog defaultDataType={item.type}>
                          <Button variant="outline" size="sm" className="w-full">
                            내보내기
                          </Button>
                        </ExportDialog>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>내보내기 옵션</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">파일 형식</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Excel (.xlsx): 서식이 있는 파일</li>
                    <li>• CSV (.csv): 단순 텍스트 파일</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">필터링</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• 날짜 범위 지정 가능</li>
                    <li>• 활성/비활성 데이터 선택</li>
                    <li>• 사용자 정의 파일명</li>
                  </ul>
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    대용량 데이터는 처리 시간이 오래 걸릴 수 있습니다.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 백업 탭 */}
        <TabsContent value="backup" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Archive className="h-5 w-5" />
                  데이터 백업
                </CardTitle>
                <CardDescription>
                  전체 교회 데이터를 백업할 수 있습니다
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    정기적인 백업을 통해 데이터 손실을 방지하세요. 
                    최소 주 1회 이상 백업을 권장합니다.
                  </AlertDescription>
                </Alert>

                <BackupDialog>
                  <Button size="lg" className="w-full">
                    <Archive className="h-5 w-5 mr-2" />
                    전체 백업 생성
                  </Button>
                </BackupDialog>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>백업 관리</CardTitle>
                <CardDescription>
                  백업 파일 생성 및 관리 지침
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">백업 포함 내용</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• 교인 정보 및 연락처</li>
                    <li>• 헌금 내역 및 통계</li>
                    <li>• 출석 현황 데이터</li>
                    <li>• 심방 기록 및 상담</li>
                    <li>• 지출결의서 및 회계</li>
                    <li>• 조직도 및 부서 구조</li>
                    <li>• 조직별 직책 구성원 정보</li>
                    <li>• 회계 계정코드 및 과목</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">백업 권장사항</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• 주 1회 정기 백업</li>
                    <li>• 중요한 작업 전 백업</li>
                    <li>• 백업 파일을 안전한 곳에 보관</li>
                    <li>• 주기적으로 백업 파일 확인</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">백업 파일 형식</h4>
                  <p className="text-sm text-muted-foreground">
                    Excel 파일(.xlsx)로 생성되며, 각 데이터 타입별로 
                    별도 시트로 구성됩니다.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}