'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DashboardLayout } from '@/components/layout'
import { usePermissions } from '@/hooks/use-permissions'
import { trpc } from '@/lib/trpc/client'
import {
  Database,
  Download,
  Upload,
  Trash2,
  Plus,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  HardDrive,
  Calendar,
  FileText,
  Settings,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react'
import { toast } from 'sonner'

interface BackupItem {
  id: string
  filename: string
  size: number
  createdAt: Date
  type: 'manual' | 'automatic'
  status: 'completed' | 'failed' | 'in_progress'
}

export default function AdminBackupPage() {
  const { data: session, status } = useSession()
  const { accessibleMenus } = usePermissions()
  const router = useRouter()

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [backupDescription, setBackupDescription] = useState('')
  const [includeFiles, setIncludeFiles] = useState(false)
  const [backupProgress, setBackupProgress] = useState(0)
  const [isBackupInProgress, setIsBackupInProgress] = useState(false)
  const [restoreProgress, setRestoreProgress] = useState(0)
  const [isRestoreInProgress, setIsRestoreInProgress] = useState(false)

  // tRPC queries and mutations
  const { data: backupList, isLoading: backupListLoading, refetch: refetchBackupList } = 
    trpc.admin.backup.getBackupList.useQuery()

  const { data: backupConfig, isLoading: configLoading, refetch: refetchConfig } = 
    trpc.admin.backup.getConfig.useQuery()

  const createBackupMutation = trpc.admin.backup.createBackup.useMutation({
    onSuccess: (data) => {
      toast.success('백업이 시작되었습니다')
      setIsCreateDialogOpen(false)
      setBackupDescription('')
      setIncludeFiles(false)
      setIsBackupInProgress(true)
      
      // 시뮬레이션을 위한 프로그레스 업데이트
      simulateProgress(setBackupProgress, () => {
        setIsBackupInProgress(false)
        refetchBackupList()
        toast.success('백업이 완료되었습니다')
      })
    },
    onError: (error) => {
      toast.error(error.message || '백업 생성에 실패했습니다')
    },
  })

  const restoreBackupMutation = trpc.admin.backup.restoreBackup.useMutation({
    onSuccess: (data) => {
      toast.success('복원이 시작되었습니다')
      setIsRestoreInProgress(true)
      
      // 시뮬레이션을 위한 프로그레스 업데이트
      simulateProgress(setRestoreProgress, () => {
        setIsRestoreInProgress(false)
        toast.success('복원이 완료되었습니다')
      })
    },
    onError: (error) => {
      toast.error(error.message || '백업 복원에 실패했습니다')
    },
  })

  const updateConfigMutation = trpc.admin.backup.updateConfig.useMutation({
    onSuccess: () => {
      toast.success('백업 설정이 성공적으로 업데이트되었습니다')
      refetchConfig()
    },
    onError: (error) => {
      toast.error(error.message || '백업 설정 업데이트에 실패했습니다')
    },
  })

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
    if (!accessibleMenus.admin) {
      router.push('/dashboard')
      return
    }
  }, [session, status, accessibleMenus.admin, router])

  if (status === 'loading') {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-r-transparent mx-auto mb-4" />
            <p className="text-muted-foreground">로딩 중...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!session || !accessibleMenus.admin) {
    return null
  }

  // Progress simulation function
  const simulateProgress = (setProgress: (value: number) => void, onComplete: () => void) => {
    let progress = 0
    const interval = setInterval(() => {
      progress += Math.random() * 15
      if (progress >= 100) {
        progress = 100
        clearInterval(interval)
        setTimeout(onComplete, 500)
      }
      setProgress(progress)
    }, 500)
  }

  const handleCreateBackup = () => {
    createBackupMutation.mutate({
      description: backupDescription,
      includeFiles,
    })
  }

  const handleRestoreBackup = (backupId: string) => {
    restoreBackupMutation.mutate({ backupId })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">완료</Badge>
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">실패</Badge>
      case 'in_progress':
        return <Badge className="bg-blue-100 text-blue-800">진행중</Badge>
      default:
        return <Badge variant="secondary">알 수 없음</Badge>
    }
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'manual':
        return <Badge variant="outline">수동</Badge>
      case 'automatic':
        return <Badge variant="secondary">자동</Badge>
      default:
        return <Badge variant="outline">-</Badge>
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">데이터 백업/복원</h1>
            <p className="text-muted-foreground">
              데이터베이스 백업 생성 및 복원을 관리합니다
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={isBackupInProgress}>
                <Plus className="mr-2 h-4 w-4" />
                새 백업 생성
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>새 백업 생성</DialogTitle>
                <DialogDescription>
                  현재 데이터베이스의 수동 백업을 생성합니다.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="description">백업 설명 (선택사항)</Label>
                  <Textarea
                    id="description"
                    value={backupDescription}
                    onChange={(e) => setBackupDescription(e.target.value)}
                    placeholder="이 백업에 대한 설명을 입력하세요"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="include-files"
                    checked={includeFiles}
                    onCheckedChange={setIncludeFiles}
                  />
                  <Label htmlFor="include-files">파일 포함</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  파일 포함 시 업로드된 이미지 및 첨부 파일도 백업에 포함됩니다.
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  취소
                </Button>
                <Button 
                  onClick={handleCreateBackup}
                  disabled={createBackupMutation.isLoading}
                >
                  {createBackupMutation.isLoading ? '생성 중...' : '백업 생성'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Critical Warning */}
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center text-red-800">
              <AlertTriangle className="mr-2 h-5 w-5" />
              중요한 주의사항
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-red-700 text-sm">
              <p>• 백업 복원은 <strong>되돌릴 수 없는</strong> 작업입니다. 현재 데이터가 모두 삭제됩니다.</p>
              <p>• 복원 작업 중에는 시스템을 사용할 수 없습니다.</p>
              <p>• 복원 전에 반드시 현재 데이터의 백업을 생성하세요.</p>
              <p>• 자동 백업이 활성화되어 있는지 확인하세요.</p>
            </div>
          </CardContent>
        </Card>

        {/* Progress Cards */}
        {(isBackupInProgress || isRestoreInProgress) && (
          <div className="grid gap-4 md:grid-cols-2">
            {isBackupInProgress && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5 animate-pulse" />
                    백업 진행중
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Progress value={backupProgress} className="h-2" />
                  <p className="text-sm text-muted-foreground">
                    {Math.round(backupProgress)}% 완료 - 백업을 생성하고 있습니다...
                  </p>
                </CardContent>
              </Card>
            )}

            {isRestoreInProgress && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <RotateCcw className="h-5 w-5 animate-spin" />
                    복원 진행중
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Progress value={restoreProgress} className="h-2" />
                  <p className="text-sm text-muted-foreground">
                    {Math.round(restoreProgress)}% 완료 - 데이터를 복원하고 있습니다...
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Main Content Tabs */}
        <Tabs defaultValue="backups" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="backups" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              백업 목록
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              백업 설정
            </TabsTrigger>
          </TabsList>

          {/* Backup List Tab */}
          <TabsContent value="backups">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>백업 목록</CardTitle>
                    <CardDescription>생성된 백업 파일들을 관리합니다</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => refetchBackupList()}
                    disabled={backupListLoading}
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${backupListLoading ? 'animate-spin' : ''}`} />
                    새로고침
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {backupListLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-r-transparent mx-auto mb-4" />
                      <p className="text-muted-foreground">백업 목록을 불러오는 중...</p>
                    </div>
                  </div>
                ) : backupList && backupList.length > 0 ? (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>파일명</TableHead>
                          <TableHead>크기</TableHead>
                          <TableHead>생성일</TableHead>
                          <TableHead>유형</TableHead>
                          <TableHead>상태</TableHead>
                          <TableHead className="text-right">작업</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {backupList.map((backup) => (
                          <TableRow key={backup.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                {backup.filename}
                              </div>
                            </TableCell>
                            <TableCell>{formatFileSize(backup.size)}</TableCell>
                            <TableCell>
                              {new Date(backup.createdAt).toLocaleString('ko-KR')}
                            </TableCell>
                            <TableCell>
                              {getTypeBadge(backup.type)}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(backup.status)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center gap-2 justify-end">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={backup.status !== 'completed'}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                                {backup.status === 'completed' && (
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        disabled={isRestoreInProgress}
                                      >
                                        <RotateCcw className="h-4 w-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>백업 복원 확인</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          <div className="space-y-2">
                                            <p className="text-red-600 font-medium">
                                              ⚠️ 위험한 작업입니다!
                                            </p>
                                            <p>
                                              이 백업으로 복원하면 현재 데이터베이스의 모든 데이터가 
                                              <strong> 영구적으로 삭제</strong>되고 백업 시점의 데이터로 대체됩니다.
                                            </p>
                                            <p>
                                              복원할 백업: <strong>{backup.filename}</strong><br/>
                                              생성일: <strong>{new Date(backup.createdAt).toLocaleString('ko-KR')}</strong>
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                              계속하시겠습니까?
                                            </p>
                                          </div>
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>취소</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => handleRestoreBackup(backup.id)}
                                          className="bg-red-600 hover:bg-red-700"
                                        >
                                          복원하기
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={backup.type === 'automatic'}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Database className="mx-auto h-12 w-12 text-muted-foreground" />
                    <p className="mt-4 text-lg font-medium">백업이 없습니다</p>
                    <p className="text-muted-foreground">새 백업을 생성해보세요.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Backup Settings Tab */}
          <TabsContent value="settings">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    자동 백업 설정
                  </CardTitle>
                  <CardDescription>
                    자동 백업 스케줄 및 보관 정책을 설정합니다
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {configLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-r-transparent mx-auto mb-4" />
                        <p className="text-muted-foreground">설정을 불러오는 중...</p>
                      </div>
                    </div>
                  ) : backupConfig ? (
                    <div className="space-y-6">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="auto-backup"
                          checked={backupConfig.autoBackupEnabled}
                          onCheckedChange={(checked) => {
                            updateConfigMutation.mutate({
                              ...backupConfig,
                              autoBackupEnabled: checked,
                            })
                          }}
                        />
                        <Label htmlFor="auto-backup" className="text-base">
                          자동 백업 활성화
                        </Label>
                      </div>

                      {backupConfig.autoBackupEnabled && (
                        <div className="ml-6 space-y-4 p-4 bg-green-50 rounded-lg border border-green-200">
                          <div className="flex items-center gap-2 text-green-800">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="font-medium">자동 백업이 활성화되었습니다</span>
                          </div>
                          
                          <div className="grid gap-4 md:grid-cols-2">
                            <div>
                              <Label>백업 스케줄</Label>
                              <Input
                                value="매일 오전 2시 (0 2 * * *)"
                                disabled
                              />
                              <p className="text-sm text-muted-foreground mt-1">
                                현재 스케줄 변경은 지원하지 않습니다
                              </p>
                            </div>
                            <div>
                              <Label>보관 기간 (일)</Label>
                              <Input
                                type="number"
                                value={backupConfig.retentionDays}
                                onChange={(e) => {
                                  updateConfigMutation.mutate({
                                    ...backupConfig,
                                    retentionDays: parseInt(e.target.value),
                                  })
                                }}
                                min="7"
                                max="365"
                              />
                              <p className="text-sm text-muted-foreground mt-1">
                                오래된 백업은 자동으로 삭제됩니다
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Switch
                              id="include-files-auto"
                              checked={backupConfig.includeFiles}
                              onCheckedChange={(checked) => {
                                updateConfigMutation.mutate({
                                  ...backupConfig,
                                  includeFiles: checked,
                                })
                              }}
                            />
                            <Label htmlFor="include-files-auto">파일 포함</Label>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">설정을 불러올 수 없습니다</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HardDrive className="h-5 w-5" />
                    스토리지 정보
                  </CardTitle>
                  <CardDescription>백업 스토리지 사용 현황</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-primary">15</div>
                      <div className="text-sm text-muted-foreground">총 백업 개수</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">2.1GB</div>
                      <div className="text-sm text-muted-foreground">사용 용량</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-green-600">97.9GB</div>
                      <div className="text-sm text-muted-foreground">사용 가능 용량</div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="flex justify-between text-sm text-muted-foreground mb-2">
                      <span>스토리지 사용률</span>
                      <span>2.1%</span>
                    </div>
                    <Progress value={2.1} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}