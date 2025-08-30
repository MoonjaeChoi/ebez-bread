'use client'

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { PageLayout } from '@/components/layout';
import { useRouter } from 'next/navigation';
import { 
  Users, 
  DollarSign, 
  BarChart3, 
  UserCheck, 
  Heart, 
  FileText,
  Shield,
  Clock,
  Smartphone,
  ArrowRight,
  CheckCircle,
  Star
} from 'lucide-react';

export default function HomePage() {
  const router = useRouter();

  const handleStartClick = () => {
    console.log('Login button clicked');
    router.push('/auth/signin');
  };

  const features = [
    {
      title: '교적 관리',
      description: '교인 정보 및 출석 관리를 효율적으로',
      detail: '교인 등록, 출석 체크, 개인 정보 관리 등 교적 관련 모든 업무를 한 곳에서',
      icon: Users,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      title: '재정 관리',
      description: '교회 재정의 투명한 관리',
      detail: '십일조, 헌금, 지출 내역을 체계적으로 관리하고 보고서를 생성',
      icon: DollarSign,
      color: 'bg-green-50 text-green-600',
    },
    {
      title: '출석 관리',
      description: '예배 및 모임 출석 현황 파악',
      detail: '실시간 출석 체크와 통계 분석으로 교인 참여도를 효과적으로 관리',
      icon: UserCheck,
      color: 'bg-purple-50 text-purple-600',
    },
    {
      title: '심방 관리',
      description: '체계적인 심방 계획과 기록',
      detail: '교인별 심방 기록, 후속 조치, 일정 관리로 목양 사역을 효율화',
      icon: Heart,
      color: 'bg-rose-50 text-rose-600',
    },
    {
      title: '지출결의서',
      description: '투명한 재정 사용 승인 프로세스',
      detail: '지출 승인 워크플로우와 영수증 관리로 재정 투명성 확보',
      icon: FileText,
      color: 'bg-orange-50 text-orange-600',
    },
    {
      title: '보고서',
      description: '데이터 기반 의사결정 지원',
      detail: '출석률, 재정 현황 등 다양한 통계 보고서를 자동으로 생성',
      icon: BarChart3,
      color: 'bg-indigo-50 text-indigo-600',
    },
  ];

  const benefits = [
    {
      icon: Shield,
      title: '보안 및 권한 관리',
      description: '역할별 접근 권한과 안전한 데이터 보호',
    },
    {
      icon: Clock,
      title: '실시간 업데이트',
      description: '실시간 데이터 동기화와 즉시 반영',
    },
    {
      icon: Smartphone,
      title: '모바일 최적화',
      description: '언제 어디서나 접근 가능한 반응형 설계',
    },
  ];

  return (
    <PageLayout>
      <div className="min-h-screen">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-secondary/5">
          <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />
          
          <div className="container relative mx-auto px-4 py-24 text-center">
            <div className="mx-auto max-w-4xl">
              <Badge variant="secondary" className="mb-6 px-4 py-2 text-sm">
                <Star className="mr-2 h-4 w-4" />
                {process.env.NEXT_PUBLIC_APP_NAME || '에벤에셀(eVeNeZeR) 교회 관리 시스템'}
              </Badge>
              
              <h1 className="mb-6 text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
                {process.env.NEXT_PUBLIC_CHURCH_NAME || '에벤에셀'}
              </h1>
              
              <p className="mx-auto mb-8 max-w-2xl text-xl text-muted-foreground">
                교회 교적 및 재정 관리를 위한 통합 플랫폼으로<br />
                효율적이고 체계적인 교회 운영을 지원합니다
              </p>
              
              <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
                <Button 
                  size="lg" 
                  onClick={handleStartClick}
                  className="group text-base shadow-lg"
                >
                  로그인하여 시작하기
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  className="text-base"
                  onClick={() => console.log('둘러보기 clicked')}
                >
                  시스템 둘러보기
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="mb-16 text-center">
              <h2 className="mb-4 text-3xl font-bold text-foreground sm:text-4xl">
                주요 기능
              </h2>
              <p className="mx-auto max-w-2xl text-muted-foreground">
                교회 운영에 필요한 모든 기능을 하나의 플랫폼에서 관리하세요
              </p>
            </div>

            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <Card key={index} className="group hover:shadow-lg transition-all duration-300">
                    <CardHeader>
                      <div className={`inline-flex h-12 w-12 rounded-lg ${feature.color} items-center justify-center mb-4`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <CardTitle className="text-xl">{feature.title}</CardTitle>
                      <CardDescription className="text-base">
                        {feature.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {feature.detail}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="bg-muted/50 py-20">
          <div className="container mx-auto px-4">
            <div className="mb-16 text-center">
              <h2 className="mb-4 text-3xl font-bold text-foreground sm:text-4xl">
                시스템 장점
              </h2>
              <p className="mx-auto max-w-2xl text-muted-foreground">
                현대적이고 안전한 기술로 구축된 신뢰할 수 있는 교회 관리 시스템
              </p>
            </div>

            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {benefits.map((benefit, index) => {
                const Icon = benefit.icon;
                return (
                  <div key={index} className="flex items-start space-x-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="mb-2 font-semibold text-foreground">
                        {benefit.title}
                      </h3>
                      <p className="text-muted-foreground">
                        {benefit.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20">
          <div className="container mx-auto px-4 text-center">
            <div className="mx-auto max-w-3xl">
              <h2 className="mb-6 text-3xl font-bold text-foreground sm:text-4xl">
                지금 시작하세요
              </h2>
              <p className="mb-8 text-lg text-muted-foreground">
                {process.env.NEXT_PUBLIC_APP_NAME || '에벤에셀(eVeNeZeR) 교회 관리 시스템'}와 함께 더 효율적이고 체계적인 교회 운영을 경험해보세요
              </p>
              
              <div className="flex flex-col items-center gap-6">
                <Button 
                  size="lg" 
                  onClick={handleStartClick}
                  className="text-base shadow-lg"
                >
                  지금 로그인하기
                </Button>
                
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span>무료로 시작 · 언제든 문의 가능</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <Separator />

        {/* Footer */}
        <footer className="py-12">
          <div className="container mx-auto px-4 text-center">
            <div className="mx-auto max-w-md">
              <div className="mb-4 flex items-center justify-center space-x-2">
                <div className="rounded-md bg-primary p-2">
                  <Users className="h-6 w-6 text-primary-foreground" />
                </div>
                <span className="text-lg font-bold">{process.env.NEXT_PUBLIC_CHURCH_NAME || '에벤에셀'}</span>
              </div>
              <p className="mb-4 text-sm text-muted-foreground">
                {process.env.NEXT_PUBLIC_APP_NAME || '에벤에셀(eVeNeZeR) 교회 관리 시스템'}
              </p>
              <p className="text-xs text-muted-foreground">
                © 2024 {process.env.NEXT_PUBLIC_CHURCH_NAME || '에벤에셀'}. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </PageLayout>
  );
}