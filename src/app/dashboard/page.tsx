'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { DashboardLayout } from '@/components/layout'
import { usePermissions } from '@/hooks/use-permissions'
import {
  Users,
  DollarSign,
  UserCheck,
  Heart,
  FileText,
  BarChart3,
  Bell,
  Settings,
  ArrowRight,
  CheckCircle2,
  Zap,
  TrendingUp,
  Calendar,
  CreditCard,
  User
} from 'lucide-react'

interface FeatureCardProps {
  title: string
  description: string
  detail: string
  icon: React.ElementType
  href: string
  available: boolean
  color?: string
  badge?: string
}

function FeatureCard({ 
  title, 
  description, 
  detail, 
  icon: Icon, 
  href, 
  available, 
  color = 'bg-primary/10 text-primary',
  badge 
}: FeatureCardProps) {
  const router = useRouter()

  if (!available) return null

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
          <span className="text-sm font-medium text-primary">바로가기</span>
          <ArrowRight className="h-4 w-4 text-primary group-hover:translate-x-1 transition-transform" />
        </div>
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const { accessibleMenus, roleDisplayName } = usePermissions()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return // 로딩 중
    if (!session) {
      router.push('/auth/signin')
      return
    }
  }, [session, status, router])

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

  if (!session) {
    return null
  }

  const features = [
    {
      title: '교인 관리',
      description: '교인 정보를 관리합니다',
      detail: '교인 등록, 수정, 삭제 및 조회 기능',
      icon: Users,
      href: '/dashboard/members',
      available: accessibleMenus.members,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      title: '헌금 관리',
      description: '헌금 및 재정을 관리합니다',
      detail: '헌금 입력, 조회 및 재정 보고서 기능',
      icon: DollarSign,
      href: '/dashboard/offerings',
      available: accessibleMenus.finances,
      color: 'bg-green-50 text-green-600',
    },
    {
      title: '출석 관리',
      description: '예배 및 모임 출석을 관리합니다',
      detail: '출석 체크, 출석률 통계 기능',
      icon: UserCheck,
      href: '/dashboard/attendance',
      available: accessibleMenus.attendance,
      color: 'bg-purple-50 text-purple-600',
    },
    {
      title: '심방 관리',
      description: '교인 심방 계획 및 기록을 관리합니다',
      detail: '심방 기록, 후속조치, 일정 관리 기능',
      icon: Heart,
      href: '/dashboard/visitations',
      available: accessibleMenus.visitations,
      color: 'bg-rose-50 text-rose-600',
      badge: 'NEW',
    },
    {
      title: '지출결의서',
      description: '지출결의서 작성 및 승인을 관리합니다',
      detail: '지출결의서 작성, 승인 워크플로우, 영수증 관리',
      icon: FileText,
      href: '/dashboard/expense-reports',
      available: accessibleMenus.expenses,
      color: 'bg-orange-50 text-orange-600',
      badge: 'NEW',
    },
    {
      title: '보고서',
      description: '각종 통계 및 보고서를 확인합니다',
      detail: '교세, 재정, 출석률 등 통계 보고서',
      icon: BarChart3,
      href: '/dashboard/reports',
      available: accessibleMenus.reports,
      color: 'bg-indigo-50 text-indigo-600',
    },
    {
      title: '알림 설정',
      description: '알림 설정 및 이력을 관리합니다',
      detail: '생일/심방 알림, 지출결의서 승인 알림 설정',
      icon: Bell,
      href: '/dashboard/notifications',
      available: true,
      color: 'bg-yellow-50 text-yellow-600',
      badge: 'COMPLETE',
    },
    {
      title: '시스템 관리',
      description: '사용자 계정 및 시스템 설정을 관리합니다',
      detail: '사용자 관리, 권한 설정, 백업/복원, 시스템 설정',
      icon: Settings,
      href: '/dashboard/admin',
      available: accessibleMenus.admin,
      color: 'bg-red-50 text-red-600',
      badge: 'ADMIN',
    },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            대시보드
          </h1>
          <div className="flex items-center space-x-2">
            <p className="text-muted-foreground">
              {session.user.churchName} - {session.user.name}님 환영합니다
            </p>
            <Badge variant="outline">
              {roleDisplayName}
            </Badge>
          </div>
        </div>

        {/* User Info Card */}
        <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="mr-2 h-5 w-5" />
              사용자 정보
            </CardTitle>
            <CardDescription>현재 로그인된 사용자 정보</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-sm text-muted-foreground">이름</p>
                <p className="font-medium">{session.user.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">이메일</p>
                <p className="font-medium">{session.user.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">역할</p>
                <Badge variant="secondary">{roleDisplayName}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">교회</p>
                <p className="font-medium">{session.user.churchName}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Features */}
        <div>
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-foreground mb-2">주요 기능</h2>
            <p className="text-muted-foreground">
              교회 운영에 필요한 핵심 기능들에 빠르게 접근하세요
            </p>
          </div>
          
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <FeatureCard key={index} {...feature} />
            ))}
          </div>
        </div>

        <Separator />

        {/* System Status */}
        <div>
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-foreground mb-2">시스템 현황</h2>
            <p className="text-muted-foreground">
              에벤에셀(eVeNeZeR) 교회 관리 시스템의 개발 진행 상황
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Completed Features */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-success">
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  완료된 기능
                </CardTitle>
                <CardDescription>정상 작동하는 기능들</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>전체 진행률</span>
                    <span className="font-medium">85%</span>
                  </div>
                  <Progress value={85} className="h-2" />
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center">
                    <CheckCircle2 className="mr-2 h-3 w-3 text-success" />
                    NextAuth.js 인증 시스템
                  </li>
                  <li className="flex items-center">
                    <CheckCircle2 className="mr-2 h-3 w-3 text-success" />
                    교인 관리 CRUD 기능
                  </li>
                  <li className="flex items-center">
                    <CheckCircle2 className="mr-2 h-3 w-3 text-success" />
                    헌금 입력/조회/통계
                  </li>
                  <li className="flex items-center">
                    <CheckCircle2 className="mr-2 h-3 w-3 text-success" />
                    출석 관리 시스템
                  </li>
                  <li className="flex items-center">
                    <CheckCircle2 className="mr-2 h-3 w-3 text-success" />
                    권한 기반 메뉴 시스템
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Recent Updates */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-secondary">
                  <Zap className="mr-2 h-5 w-5" />
                  최근 업데이트
                </CardTitle>
                <CardDescription>새로 추가된 기능들</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center">
                    <Badge variant="secondary" className="mr-2 text-xs">NEW</Badge>
                    심방 관리 시스템
                  </li>
                  <li className="flex items-center">
                    <Badge variant="secondary" className="mr-2 text-xs">NEW</Badge>
                    지출결의서 시스템
                  </li>
                  <li className="flex items-center">
                    <Badge variant="secondary" className="mr-2 text-xs">NEW</Badge>
                    승인 워크플로우
                  </li>
                  <li className="flex items-center">
                    <Badge variant="secondary" className="mr-2 text-xs">NEW</Badge>
                    파일 업로드 기능
                  </li>
                  <li className="flex items-center">
                    <Badge variant="outline" className="mr-2 text-xs">COMPLETE</Badge>
                    이메일/SMS 알림 시스템
                  </li>
                  <li className="flex items-center">
                    <Badge variant="outline" className="mr-2 text-xs">COMPLETE</Badge>
                    생일 및 심방 자동 알림
                  </li>
                  <li className="flex items-center">
                    <Badge variant="outline" className="mr-2 text-xs">COMPLETE</Badge>
                    통합 디자인 시스템
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-foreground mb-2">빠른 작업</h2>
            <p className="text-muted-foreground">
              자주 사용하는 작업들에 빠르게 접근하세요
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {accessibleMenus.members && (
              <Button 
                variant="outline" 
                className="h-auto p-4 flex flex-col space-y-2"
                onClick={() => router.push('/dashboard/members')}
              >
                <Users className="h-6 w-6" />
                <span>새 교인 등록</span>
              </Button>
            )}
            
            {accessibleMenus.finances && (
              <Button 
                variant="outline" 
                className="h-auto p-4 flex flex-col space-y-2"
                onClick={() => router.push('/dashboard/offerings')}
              >
                <CreditCard className="h-6 w-6" />
                <span>헌금 입력</span>
              </Button>
            )}
            
            {accessibleMenus.attendance && (
              <Button 
                variant="outline" 
                className="h-auto p-4 flex flex-col space-y-2"
                onClick={() => router.push('/dashboard/attendance')}
              >
                <Calendar className="h-6 w-6" />
                <span>출석 체크</span>
              </Button>
            )}
            
            {accessibleMenus.reports && (
              <Button 
                variant="outline" 
                className="h-auto p-4 flex flex-col space-y-2"
                onClick={() => router.push('/dashboard/reports')}
              >
                <TrendingUp className="h-6 w-6" />
                <span>보고서 확인</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}