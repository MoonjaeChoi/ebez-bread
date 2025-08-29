'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Calculator, 
  TreePine, 
  Wallet, 
  Receipt, 
  TrendingUp,
  Building2,
  ArrowRight
} from 'lucide-react'
import Link from 'next/link'
import { trpc } from '@/lib/trpc/client'

export default function AccountingPage() {
  // 기본 통계 조회
  const { data: accountStats } = trpc.accountCodes.getAll.useQuery({
    limit: 1,
    churchOnly: false
  })

  const { data: budgetStats } = trpc.budgets.getAll.useQuery({
    limit: 1
  })

  const menuItems = [
    {
      title: '계정과목 관리',
      description: '한국 표준 회계기준 4단계 계층구조 계정과목 관리',
      href: '/dashboard/accounting/accounts',
      icon: TreePine,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      features: ['4단계 계층 구조', '시스템/교회별 계정', '거래 허용 설정'],
      stats: accountStats?.total ? `${accountStats.total}개 계정` : undefined
    },
    {
      title: '예산 관리',
      description: '부서별 예산 계획 및 집행 현황 관리',
      href: '/dashboard/accounting/budgets',
      icon: Wallet,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      features: ['부서별 예산 할당', '실시간 집행률', '예산 변경 승인'],
      stats: budgetStats?.total ? `${budgetStats.total}개 예산` : undefined
    },
    {
      title: '거래 관리',
      description: '복식부기 기반 회계 거래 입력 및 관리',
      href: '/dashboard/accounting/transactions',
      icon: Receipt,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      features: ['복식부기 거래', '시산표 조회', '총계정원장'],
      stats: undefined
    },
    {
      title: '재무 보고서',
      description: '시산표, 손익계산서, 재정상태표 등 각종 재무제표',
      href: '/dashboard/accounting/reports',
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      features: ['시산표', '손익계산서', '재정상태표'],
      stats: undefined
    }
  ]

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Calculator className="w-8 h-8 text-blue-600" />
          회계 관리 시스템
        </h1>
        <p className="text-gray-600 mt-2">
          한국 표준 회계기준(K-GAAP)을 준수하는 교회 전용 회계 시스템
        </p>
      </div>

      {/* 시스템 특징 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            시스템 특징
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <TreePine className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium">4단계 계층구조</h3>
                <p className="text-sm text-gray-600">관-항목-세목-세세목</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Receipt className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium">복식부기 시스템</h3>
                <p className="text-sm text-gray-600">정확한 재무관리</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Wallet className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-medium">예산 연동</h3>
                <p className="text-sm text-gray-600">지출결의서 자동 검증</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 메인 메뉴 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {menuItems.map((item) => (
          <Card key={item.href} className="group hover:shadow-md transition-all duration-200">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-lg ${item.bgColor}`}>
                  <item.icon className={`w-6 h-6 ${item.color}`} />
                </div>
                {item.stats && (
                  <Badge variant="secondary" className="text-xs">
                    {item.stats}
                  </Badge>
                )}
              </div>
              
              <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
              <p className="text-gray-600 mb-4">{item.description}</p>
              
              <div className="space-y-2 mb-6">
                {item.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm text-gray-500">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                    {feature}
                  </div>
                ))}
              </div>
              
              <Link href={item.href}>
                <Button 
                  className="w-full group-hover:translate-x-1 transition-transform duration-200"
                  variant="outline"
                >
                  시작하기
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 빠른 시작 가이드 */}
      <Card>
        <CardHeader>
          <CardTitle>빠른 시작 가이드</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">
                1
              </div>
              <div>
                <h4 className="font-medium">계정과목 설정</h4>
                <p className="text-sm text-gray-600">
                  한국 표준 회계계정을 기반으로 교회 특성에 맞는 계정과목을 설정합니다.
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold text-sm">
                2
              </div>
              <div>
                <h4 className="font-medium">예산 계획 수립</h4>
                <p className="text-sm text-gray-600">
                  부서별로 연간 예산을 계획하고 승인 프로세스를 통해 확정합니다.
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold text-sm">
                3
              </div>
              <div>
                <h4 className="font-medium">지출결의서 연동</h4>
                <p className="text-sm text-gray-600">
                  지출결의서가 승인되면 자동으로 예산 집행이 반영되고 회계 거래가 생성됩니다.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}