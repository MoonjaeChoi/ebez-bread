'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DashboardLayout } from '@/components/layout'
import { usePermissions } from '@/hooks/use-permissions'
import { trpc } from '@/lib/trpc/client'
import {
  Users,
  Shield,
  Settings,
  Database,
  Activity,
  ArrowRight,
  User,
  HardDrive,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react'

interface AdminFeatureCardProps {
  title: string
  description: string
  detail: string
  icon: React.ElementType
  href: string
  color?: string
  badge?: string
}

function AdminFeatureCard({ 
  title, 
  description, 
  detail, 
  icon: Icon, 
  href, 
  color = 'bg-primary/10 text-primary',
  badge 
}: AdminFeatureCardProps) {
  const router = useRouter()

  return (
    <Card className="group cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-1" 
          onClick={() => router.push(href)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
          {badge && (
            <Badge variant="secondary" className="text-xs">
              {badge}
            </Badge>
          )}
        </div>
        <CardTitle className="text-lg group-hover:text-primary transition-colors">
          {title}
        </CardTitle>
        <CardDescription className="text-sm">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground mb-4">
          {detail}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-primary">관리하기</span>
          <ArrowRight className="h-4 w-4 text-primary group-hover:translate-x-1 transition-transform" />
        </div>
      </CardContent>
    </Card>
  )
}

export default function AdminPage() {
  const { data: session, status } = useSession()
  const { accessibleMenus, roleDisplayName } = usePermissions()
  const router = useRouter()

  // 시스템 상태 조회
  const { data: systemStatus, isLoading: statusLoading } = trpc.admin.system.getStatus.useQuery()

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

  const adminFeatures = [
    {
      title: '사용자 계정 관리',
      description: '시스템 사용자 계정을 관리합니다',
      detail: '계정 생성/수정/삭제, 권한 관리, 비밀번호 재설정',
      icon: Users,
      href: '/dashboard/admin/users',
      color: 'bg-blue-50 text-blue-600',
    },
    {
      title: '권한 설정 관리',
      description: '사용자 역할별 메뉴 접근 권한을 설정합니다',
      detail: '역할별 메뉴 권한, 기능 접근 제어 설정',
      icon: Shield,
      href: '/dashboard/admin/permissions',
      color: 'bg-green-50 text-green-600',
    },
    {
      title: '시스템 설정 관리',
      description: '전체 시스템 설정을 관리합니다',
      detail: '일반 설정, 알림 설정, 보안 설정',
      icon: Settings,
      href: '/dashboard/admin/settings',
      color: 'bg-purple-50 text-purple-600',
    },
    {
      title: '데이터 백업/복원',
      description: '데이터베이스 백업 및 복원을 관리합니다',
      detail: '자동/수동 백업, 백업 파일 관리, 데이터 복원',
      icon: Database,
      href: '/dashboard/admin/backup',
      color: 'bg-orange-50 text-orange-600',
      badge: 'CRITICAL',
    },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            시스템 관리
          </h1>
          <div className="flex items-center space-x-2">
            <p className="text-muted-foreground">
              시스템 전체 설정 및 사용자 관리
            </p>
            <Badge variant="destructive">
              관리자 전용
            </Badge>
          </div>
        </div>

        {/* Warning Card */}
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center text-orange-800">
              <AlertTriangle className="mr-2 h-5 w-5" />
              주의사항
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-orange-700 text-sm">
              이 섹션의 기능들은 시스템 전체에 영향을 미칠 수 있습니다. 
              변경사항을 적용하기 전에 반드시 백업을 수행하고 신중히 검토해주세요.
            </p>
          </CardContent>
        </Card>

        {/* System Status Overview */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="mr-2 h-5 w-5" />
                시스템 현황
              </CardTitle>
              <CardDescription>현재 시스템 운영 상태</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {statusLoading ? (
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                </div>
              ) : systemStatus ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">활성 사용자</span>
                    <span className="font-medium">{systemStatus.users}명</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">등록 교인</span>
                    <span className="font-medium">{systemStatus.members}명</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">총 헌금</span>
                    <span className="font-medium">
                      {new Intl.NumberFormat('ko-KR').format(Number(systemStatus.totalOfferings))}원
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">시스템 가동시간</span>
                    <span className="font-medium">
                      {Math.floor(systemStatus.uptime / 3600)}시간
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">데이터를 불러올 수 없습니다</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <HardDrive className="mr-2 h-5 w-5" />
                시스템 상태
              </CardTitle>
              <CardDescription>핵심 시스템 컴포넌트 상태</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {statusLoading ? (
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                </div>
              ) : systemStatus?.systemHealth ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">데이터베이스</span>
                    <div className="flex items-center">
                      <CheckCircle2 className="h-4 w-4 text-green-600 mr-1" />
                      <span className="text-sm font-medium text-green-600">정상</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">스토리지</span>
                    <div className="flex items-center">
                      <CheckCircle2 className="h-4 w-4 text-green-600 mr-1" />
                      <span className="text-sm font-medium text-green-600">정상</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">메모리</span>
                    <div className="flex items-center">
                      <CheckCircle2 className="h-4 w-4 text-green-600 mr-1" />
                      <span className="text-sm font-medium text-green-600">정상</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">마지막 백업</span>
                    <span className="text-sm font-medium">
                      {new Date(systemStatus.lastBackup).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">상태 정보를 불러올 수 없습니다</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Admin Features */}
        <div>
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-foreground mb-2">관리 기능</h2>
            <p className="text-muted-foreground">
              시스템 관리에 필요한 핵심 기능들에 접근하세요
            </p>
          </div>
          
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
            {adminFeatures.map((feature, index) => (
              <AdminFeatureCard key={index} {...feature} />
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-foreground mb-2">빠른 작업</h2>
            <p className="text-muted-foreground">
              자주 사용하는 관리 작업들에 빠르게 접근하세요
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Button 
              variant="outline" 
              className="h-auto p-4 flex flex-col space-y-2"
              onClick={() => router.push('/dashboard/admin/users')}
            >
              <User className="h-6 w-6" />
              <span>새 사용자 추가</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-auto p-4 flex flex-col space-y-2"
              onClick={() => router.push('/dashboard/admin/backup')}
            >
              <Database className="h-6 w-6" />
              <span>백업 생성</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-auto p-4 flex flex-col space-y-2"
              onClick={() => router.push('/dashboard/admin/settings')}
            >
              <Settings className="h-6 w-6" />
              <span>시스템 설정</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-auto p-4 flex flex-col space-y-2"
              onClick={() => router.push('/dashboard/reports')}
            >
              <TrendingUp className="h-6 w-6" />
              <span>시스템 보고서</span>
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}