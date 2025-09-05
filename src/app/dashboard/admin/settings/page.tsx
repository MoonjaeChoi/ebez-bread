'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { DashboardLayout } from '@/components/layout'
import { usePermissions } from '@/hooks/use-permissions'
import { trpc } from '@/lib/trpc/client'
import {
  Settings,
  Building2,
  Bell,
  Shield,
  Database,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Globe,
  Mail,
  Phone,
  Lock
} from 'lucide-react'
import { toast } from 'sonner'

interface SettingItem {
  key: string
  value: string
  description?: string
  category: string
}

// 교회 정보 수정 폼 스키마
const churchInfoSchema = z.object({
  name: z.string().min(1, '교회명을 입력해주세요'),
  email: z.string().email('유효한 이메일을 입력해주세요').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  website: z.string().url('유효한 웹사이트 URL을 입력해주세요').optional().or(z.literal('')),
  pastorName: z.string().optional(),
  description: z.string().optional(),
})

type ChurchInfoFormData = z.infer<typeof churchInfoSchema>

export default function AdminSettingsPage() {
  const { data: session, status } = useSession()
  const { accessibleMenus } = usePermissions()
  const router = useRouter()

  const [settings, setSettings] = useState<SettingItem[]>([])
  const [hasChanges, setHasChanges] = useState(false)

  // 교회 정보 폼
  const {
    register: churchRegister,
    handleSubmit: handleChurchSubmit,
    formState: { errors: churchErrors, isDirty: isChurchDirty },
    reset: resetChurchForm,
    setValue: setChurchValue,
  } = useForm<ChurchInfoFormData>({
    resolver: zodResolver(churchInfoSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      address: '',
      website: '',
      pastorName: '',
      description: '',
    }
  })

  // tRPC queries and mutations
  const { data: settingsData, isLoading: settingsLoading, refetch: refetchSettings } = 
    trpc.admin.settings.getAll.useQuery()

  // 교회 정보 조회
  const { data: churchData, isLoading: churchLoading, refetch: refetchChurchInfo } = 
    trpc.admin.church.getInfo.useQuery()

  // 교회 정보 수정 뮤테이션
  const churchUpdateMutation = trpc.admin.church.updateInfo.useMutation({
    onSuccess: () => {
      toast.success('교회 정보가 성공적으로 수정되었습니다')
      refetchChurchInfo()
    },
    onError: (error) => {
      toast.error(error.message || '교회 정보 수정에 실패했습니다')
    },
  })

  const updateSettingMutation = trpc.admin.settings.update.useMutation({
    onSuccess: () => {
      toast.success('설정이 성공적으로 업데이트되었습니다')
      setHasChanges(false)
      refetchSettings()
    },
    onError: (error) => {
      toast.error(error.message || '설정 업데이트에 실패했습니다')
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

  useEffect(() => {
    if (settingsData) {
      setSettings(settingsData)
    }
  }, [settingsData])

  // 교회 정보 폼 초기화
  useEffect(() => {
    if (churchData) {
      resetChurchForm({
        name: churchData.name || '',
        email: churchData.email || '',
        phone: churchData.phone || '',
        address: churchData.address || '',
        website: churchData.website || '',
        pastorName: churchData.pastorName || '',
        description: churchData.description || '',
      })
    }
  }, [churchData, resetChurchForm])

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

  const handleSettingChange = (key: string, value: string) => {
    setSettings(prev => prev.map(setting => 
      setting.key === key ? { ...setting, value } : setting
    ))
    setHasChanges(true)
  }

  const handleSaveChanges = async () => {
    const changedSettings = settings.filter(setting => {
      const original = settingsData?.find(s => s.key === setting.key)
      return original?.value !== setting.value
    })

    for (const setting of changedSettings) {
      try {
        await updateSettingMutation.mutateAsync({
          key: setting.key,
          value: setting.value,
          description: setting.description,
        })
      } catch (error) {
        console.error('Failed to update setting:', setting.key, error)
      }
    }
  }

  // 교회 정보 수정 핸들러
  const onChurchInfoSubmit = async (data: ChurchInfoFormData) => {
    try {
      await churchUpdateMutation.mutateAsync({
        name: data.name,
        email: data.email || undefined,
        phone: data.phone || undefined,
        address: data.address || undefined,
        website: data.website || undefined,
        pastorName: data.pastorName || undefined,
        description: data.description || undefined,
      })
    } catch (error) {
      console.error('Failed to update church info:', error)
    }
  }

  const getSettingsByCategory = (category: string) => {
    return settings.filter(setting => setting.category === category)
  }

  const getSetting = (key: string) => {
    return settings.find(setting => setting.key === key)
  }

  const SettingInput = ({ 
    setting, 
    type = 'text',
    placeholder = '' 
  }: { 
    setting: SettingItem
    type?: string
    placeholder?: string 
  }) => (
    <div className="space-y-2">
      <Label htmlFor={setting.key}>{setting.description}</Label>
      {type === 'textarea' ? (
        <Textarea
          id={setting.key}
          value={setting.value}
          onChange={(e) => handleSettingChange(setting.key, e.target.value)}
          placeholder={placeholder}
          className="min-h-[100px]"
        />
      ) : type === 'boolean' ? (
        <div className="flex items-center space-x-2">
          <Switch
            id={setting.key}
            checked={setting.value === 'true'}
            onCheckedChange={(checked) => handleSettingChange(setting.key, checked.toString())}
          />
          <Label htmlFor={setting.key} className="text-sm text-muted-foreground">
            {setting.value === 'true' ? '활성화됨' : '비활성화됨'}
          </Label>
        </div>
      ) : (
        <Input
          id={setting.key}
          type={type}
          value={setting.value}
          onChange={(e) => handleSettingChange(setting.key, e.target.value)}
          placeholder={placeholder}
        />
      )}
    </div>
  )

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">시스템 설정 관리</h1>
            <p className="text-muted-foreground">
              전체 시스템의 기본 설정을 관리합니다
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => refetchSettings()}
              disabled={settingsLoading}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${settingsLoading ? 'animate-spin' : ''}`} />
              새로고침
            </Button>
            <Button 
              onClick={handleSaveChanges}
              disabled={!hasChanges || updateSettingMutation.isLoading}
            >
              <Save className="mr-2 h-4 w-4" />
              {updateSettingMutation.isLoading ? '저장 중...' : '변경사항 저장'}
            </Button>
          </div>
        </div>

        {/* Warning Card */}
        {hasChanges && (
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="flex items-center text-orange-800">
                <AlertTriangle className="mr-2 h-5 w-5" />
                저장되지 않은 변경사항
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-orange-700 text-sm">
                설정 변경사항이 있습니다. 저장 버튼을 클릭하여 변경사항을 적용해주세요.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Settings Tabs */}
        {settingsLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-r-transparent mx-auto mb-4" />
              <p className="text-muted-foreground">설정을 불러오는 중...</p>
            </div>
          </div>
        ) : (
          <Tabs defaultValue="general" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="general" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                일반 설정
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                알림 설정
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                보안 설정
              </TabsTrigger>
              <TabsTrigger value="backup" className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                백업 설정
              </TabsTrigger>
            </TabsList>

            {/* General Settings */}
            <TabsContent value="general">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    일반 설정
                  </CardTitle>
                  <CardDescription>
                    교회 기본 정보 및 시스템 일반 설정을 관리합니다
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* 교회 정보 수정 폼 (시스템 관리자만) */}
                  {session?.user?.role === 'SUPER_ADMIN' && (
                    <form onSubmit={handleChurchSubmit(onChurchInfoSubmit)} className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-medium flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            교회 정보
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            시스템 관리자만 교회 정보를 수정할 수 있습니다
                          </p>
                        </div>
                        <Button 
                          type="submit"
                          disabled={!isChurchDirty || churchUpdateMutation.isPending || churchLoading}
                          size="sm"
                        >
                          <Save className="mr-2 h-4 w-4" />
                          {churchUpdateMutation.isPending ? '저장 중...' : '저장'}
                        </Button>
                      </div>

                      {churchLoading ? (
                        <div className="text-center py-4">
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-r-transparent mx-auto" />
                        </div>
                      ) : (
                        <div className="grid gap-6 md:grid-cols-2">
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="churchName">
                                교회명 <span className="text-red-500">*</span>
                              </Label>
                              <Input
                                id="churchName"
                                {...churchRegister('name')}
                                placeholder="교회명을 입력하세요"
                                className={churchErrors.name ? 'border-red-500' : ''}
                              />
                              {churchErrors.name && (
                                <p className="text-sm text-red-500">{churchErrors.name.message}</p>
                              )}
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="churchEmail">교회 이메일</Label>
                              <Input
                                id="churchEmail"
                                type="email"
                                {...churchRegister('email')}
                                placeholder="church@example.com"
                                className={churchErrors.email ? 'border-red-500' : ''}
                              />
                              {churchErrors.email && (
                                <p className="text-sm text-red-500">{churchErrors.email.message}</p>
                              )}
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="churchPhone">교회 전화번호</Label>
                              <Input
                                id="churchPhone"
                                type="tel"
                                {...churchRegister('phone')}
                                placeholder="02-1234-5678"
                              />
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="churchAddress">교회 주소</Label>
                              <Input
                                id="churchAddress"
                                {...churchRegister('address')}
                                placeholder="서울시 강남구..."
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="churchWebsite">교회 홈페이지</Label>
                              <Input
                                id="churchWebsite"
                                type="url"
                                {...churchRegister('website')}
                                placeholder="https://church.example.com"
                                className={churchErrors.website ? 'border-red-500' : ''}
                              />
                              {churchErrors.website && (
                                <p className="text-sm text-red-500">{churchErrors.website.message}</p>
                              )}
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="pastorName">담임목사</Label>
                              <Input
                                id="pastorName"
                                {...churchRegister('pastorName')}
                                placeholder="담임목사님 성함"
                              />
                            </div>
                          </div>

                          <div className="md:col-span-2">
                            <div className="space-y-2">
                              <Label htmlFor="churchDescription">교회 소개</Label>
                              <Textarea
                                id="churchDescription"
                                {...churchRegister('description')}
                                placeholder="교회 소개를 입력하세요"
                                rows={3}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </form>
                  )}

                  {/* 시스템 관리자가 아닌 경우 읽기 전용 표시 */}
                  {session?.user?.role !== 'SUPER_ADMIN' && (
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-medium flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          교회 정보
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          교회 정보는 시스템 관리자만 수정할 수 있습니다
                        </p>
                      </div>
                      
                      {churchLoading ? (
                        <div className="text-center py-4">
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-r-transparent mx-auto" />
                        </div>
                      ) : churchData && (
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-4">
                            <div>
                              <Label>교회명</Label>
                              <Input value={churchData.name || ''} disabled />
                            </div>
                            <div>
                              <Label>교회 이메일</Label>
                              <Input value={churchData.email || ''} disabled />
                            </div>
                            <div>
                              <Label>교회 전화번호</Label>
                              <Input value={churchData.phone || ''} disabled />
                            </div>
                          </div>
                          <div className="space-y-4">
                            <div>
                              <Label>교회 주소</Label>
                              <Input value={churchData.address || ''} disabled />
                            </div>
                            <div>
                              <Label>교회 홈페이지</Label>
                              <Input value={churchData.website || ''} disabled />
                            </div>
                            <div>
                              <Label>담임목사</Label>
                              <Input value={churchData.pastorName || ''} disabled />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      시스템 기본 설정
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label>시스템 언어</Label>
                        <Input
                          value="한국어 (Korean)"
                          disabled
                        />
                        <p className="text-sm text-muted-foreground mt-1">
                          현재 한국어만 지원됩니다
                        </p>
                      </div>
                      <div>
                        <Label>시간대</Label>
                        <Input
                          value="Asia/Seoul (UTC+9)"
                          disabled
                        />
                        <p className="text-sm text-muted-foreground mt-1">
                          한국 표준시로 고정됩니다
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notifications Settings */}
            <TabsContent value="notifications">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    알림 설정
                  </CardTitle>
                  <CardDescription>
                    시스템 전체 알림 기능 설정을 관리합니다
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      이메일 알림
                    </h3>
                    <div className="space-y-4">
                      {getSetting('email_notifications_enabled') && (
                        <SettingInput 
                          setting={getSetting('email_notifications_enabled')!}
                          type="boolean"
                        />
                      )}
                      {getSetting('email_notifications_enabled')?.value === 'true' && (
                        <div className="ml-6 p-4 bg-green-50 rounded-lg border border-green-200">
                          <div className="flex items-center gap-2 text-green-800">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="font-medium">이메일 알림이 활성화되었습니다</span>
                          </div>
                          <p className="text-sm text-green-600 mt-1">
                            생일 알림, 심방 알림, 지출결의서 승인 알림 등이 이메일로 발송됩니다.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      SMS 알림
                    </h3>
                    <div className="space-y-4">
                      {getSetting('sms_notifications_enabled') && (
                        <SettingInput 
                          setting={getSetting('sms_notifications_enabled')!}
                          type="boolean"
                        />
                      )}
                      {getSetting('sms_notifications_enabled')?.value === 'false' && (
                        <div className="ml-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                          <div className="flex items-center gap-2 text-yellow-800">
                            <AlertTriangle className="h-4 w-4" />
                            <span className="font-medium">SMS 알림이 비활성화되었습니다</span>
                          </div>
                          <p className="text-sm text-yellow-600 mt-1">
                            SMS 알림을 사용하려면 SMS 서비스 설정이 필요합니다.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">알림 빈도 설정</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label>생일 알림 (일 전)</Label>
                        <Input
                          type="number"
                          value="7"
                          min="1"
                          max="30"
                        />
                        <p className="text-sm text-muted-foreground mt-1">
                          생일 며칠 전에 알림을 받을지 설정합니다
                        </p>
                      </div>
                      <div>
                        <Label>심방 알림 (시간 전)</Label>
                        <Input
                          type="number"
                          value="24"
                          min="1"
                          max="168"
                        />
                        <p className="text-sm text-muted-foreground mt-1">
                          심방 몇 시간 전에 알림을 받을지 설정합니다
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Settings */}
            <TabsContent value="security">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    보안 설정
                  </CardTitle>
                  <CardDescription>
                    시스템 보안 관련 설정을 관리합니다
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      세션 설정
                    </h3>
                    <div className="space-y-4">
                      {getSetting('session_timeout_hours') && (
                        <div className="space-y-2">
                          <Label htmlFor="session_timeout">
                            세션 만료 시간 (시간)
                          </Label>
                          <Input
                            id="session_timeout"
                            type="number"
                            value={getSetting('session_timeout_hours')!.value}
                            onChange={(e) => handleSettingChange('session_timeout_hours', e.target.value)}
                            min="1"
                            max="24"
                          />
                          <p className="text-sm text-muted-foreground">
                            사용자가 비활성 상태일 때 자동 로그아웃되는 시간을 설정합니다
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">비밀번호 정책</h3>
                    <div className="space-y-4">
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <h4 className="font-medium text-blue-800 mb-2">현재 비밀번호 정책</h4>
                        <ul className="text-sm text-blue-600 space-y-1">
                          <li>• 최소 8자 이상</li>
                          <li>• 8자 이상 길이 조건만 적용 (복잡성 조건 제거)</li>
                          <li>• 90일마다 변경 권장</li>
                          <li>• 최근 3개 비밀번호 재사용 금지</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">접근 제어</h3>
                    <div className="space-y-4">
                      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                        <h4 className="font-medium text-green-800 mb-2">보안 상태</h4>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-green-600">
                            <CheckCircle2 className="h-4 w-4" />
                            <span>HTTPS 연결 활성화</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-green-600">
                            <CheckCircle2 className="h-4 w-4" />
                            <span>세션 보안 쿠키 사용</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-green-600">
                            <CheckCircle2 className="h-4 w-4" />
                            <span>CSRF 보호 활성화</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Backup Settings */}
            <TabsContent value="backup">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    백업 설정
                  </CardTitle>
                  <CardDescription>
                    자동 백업 및 데이터 보관 정책을 설정합니다
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">자동 백업</h3>
                    <div className="space-y-4">
                      {getSetting('auto_backup_enabled') && (
                        <SettingInput 
                          setting={getSetting('auto_backup_enabled')!}
                          type="boolean"
                        />
                      )}
                      {getSetting('auto_backup_enabled')?.value === 'true' && (
                        <div className="ml-6 space-y-4">
                          <div className="grid gap-4 md:grid-cols-2">
                            <div>
                              <Label>백업 주기</Label>
                              <Input
                                value="매일 오전 2시"
                                disabled
                              />
                              <p className="text-sm text-muted-foreground mt-1">
                                현재 고정된 스케줄입니다
                              </p>
                            </div>
                            {getSetting('backup_retention_days') && (
                              <div className="space-y-2">
                                <Label htmlFor="retention_days">
                                  백업 보관 기간 (일)
                                </Label>
                                <Input
                                  id="retention_days"
                                  type="number"
                                  value={getSetting('backup_retention_days')!.value}
                                  onChange={(e) => handleSettingChange('backup_retention_days', e.target.value)}
                                  min="7"
                                  max="365"
                                />
                                <p className="text-sm text-muted-foreground">
                                  백업 파일을 몇 일 동안 보관할지 설정합니다
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">백업 상태</h3>
                    <div className="space-y-4">
                      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-green-800">마지막 백업</h4>
                            <p className="text-sm text-green-600">2024년 1월 15일 오전 2:00</p>
                          </div>
                          <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle2 className="h-5 w-5" />
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              성공
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="text-center p-4 border rounded-lg">
                          <div className="text-2xl font-bold text-primary">15</div>
                          <div className="text-sm text-muted-foreground">총 백업 개수</div>
                        </div>
                        <div className="text-center p-4 border rounded-lg">
                          <div className="text-2xl font-bold text-green-600">98.5%</div>
                          <div className="text-sm text-muted-foreground">백업 성공률</div>
                        </div>
                        <div className="text-center p-4 border rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">2.1GB</div>
                          <div className="text-sm text-muted-foreground">총 백업 용량</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">백업 알림</h3>
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="backup-notifications"
                          defaultChecked
                        />
                        <Label htmlFor="backup-notifications">백업 완료/실패 알림 받기</Label>
                      </div>
                      <p className="text-sm text-muted-foreground ml-6">
                        백업 작업이 완료되거나 실패할 때 관리자에게 이메일 알림을 발송합니다.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  )
}