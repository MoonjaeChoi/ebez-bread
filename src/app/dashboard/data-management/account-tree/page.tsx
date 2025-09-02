'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  ArrowLeft, 
  TreePine, 
  Building2, 
  Calculator,
  Info,
  FileText,
  Download,
  RotateCcw
} from 'lucide-react'
import Link from 'next/link'
import { AccountTree } from '@/components/accounting/account-tree'
import { AccountType } from '@prisma/client'
import { trpc } from '@/lib/trpc/client'

const accountTypeLabels: Record<AccountType, string> = {
  ASSET: '자산',
  LIABILITY: '부채',
  EQUITY: '자본',
  REVENUE: '수익',
  EXPENSE: '비용'
}

export default function AccountTreePage() {
  const [selectedAccountType, setSelectedAccountType] = useState<AccountType | 'ALL'>('ALL')
  const [churchOnly, setChurchOnly] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<any>(null)

  // 통계 조회
  const { data: accountStats, refetch: refetchStats } = trpc.accountCodes.getAll.useQuery({
    limit: 1,
    churchOnly
  })

  const handleSelectAccount = (account: any) => {
    setSelectedAccount(account)
  }

  const handleRefresh = () => {
    refetchStats()
    // AccountTree 컴포넌트의 데이터도 새로고침됩니다
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* 헤더 */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/dashboard/data-management">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              데이터 관리로 돌아가기
            </Button>
          </Link>
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <TreePine className="w-8 h-8 text-green-600" />
              회계 계정코드 트리
            </h1>
            <p className="text-muted-foreground mt-2">
              회계 시스템의 계정과목을 계층구조로 확인할 수 있습니다
            </p>
          </div>
          
          <Button onClick={handleRefresh} variant="outline">
            <RotateCcw className="h-4 w-4 mr-2" />
            새로고침
          </Button>
        </div>
      </div>

      {/* 통계 카드 */}
      {accountStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">전체 계정</p>
                  <p className="text-2xl font-bold">{accountStats.total}</p>
                  <p className="text-xs text-gray-500">개</p>
                </div>
                <Calculator className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">시스템 계정</p>
                  <p className="text-2xl font-bold">
                    {accountStats.accountCodes?.filter(acc => acc.isSystem).length || 0}
                  </p>
                  <p className="text-xs text-gray-500">개</p>
                </div>
                <Building2 className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">교회 계정</p>
                  <p className="text-2xl font-bold">
                    {accountStats.accountCodes?.filter(acc => !acc.isSystem).length || 0}
                  </p>
                  <p className="text-xs text-gray-500">개</p>
                </div>
                <TreePine className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">거래 가능</p>
                  <p className="text-2xl font-bold">
                    {accountStats.accountCodes?.filter(acc => acc.allowTransaction).length || 0}
                  </p>
                  <p className="text-xs text-gray-500">개</p>
                </div>
                <FileText className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 계정 트리 (왼쪽 3컬럼) */}
        <div className="lg:col-span-3">
          <div className="space-y-4">
            {/* 필터 옵션 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">필터 옵션</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <Label htmlFor="account-type">계정 유형</Label>
                    <Select
                      value={selectedAccountType}
                      onValueChange={(value) => setSelectedAccountType(value as AccountType | 'ALL')}
                    >
                      <SelectTrigger id="account-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">전체</SelectItem>
                        {Object.entries(accountTypeLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center space-x-2 pt-6">
                    <Switch
                      id="church-only"
                      checked={churchOnly}
                      onCheckedChange={setChurchOnly}
                    />
                    <Label htmlFor="church-only">교회 계정만</Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 안내 메시지 */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                이 페이지는 조회 전용입니다. 계정을 수정하려면 
                <Link href="/dashboard/accounting/accounts" className="text-blue-600 hover:underline ml-1">
                  계정과목 관리 페이지
                </Link>
                를 이용해주세요.
              </AlertDescription>
            </Alert>

            {/* 계정 유형별 탭 */}
            <Tabs value={selectedAccountType} onValueChange={(value) => setSelectedAccountType(value as AccountType | 'ALL')}>
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="ALL">전체</TabsTrigger>
                {Object.entries(accountTypeLabels).map(([value, label]) => (
                  <TabsTrigger key={value} value={value} className="text-sm">
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>
              
              <TabsContent value="ALL" className="mt-4">
                <AccountTree
                  onSelectAccount={handleSelectAccount}
                  selectedAccountId={selectedAccount?.id}
                  churchOnly={churchOnly}
                  showActions={false}
                />
              </TabsContent>
              
              {Object.keys(accountTypeLabels).map((accountType) => (
                <TabsContent key={accountType} value={accountType} className="mt-4">
                  <AccountTree
                    accountType={accountType as AccountType}
                    onSelectAccount={handleSelectAccount}
                    selectedAccountId={selectedAccount?.id}
                    churchOnly={churchOnly}
                    showActions={false}
                  />
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </div>

        {/* 선택된 계정 상세 정보 (오른쪽 1컬럼) */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                계정 정보
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedAccount ? (
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm text-gray-600">계정 코드</Label>
                    <code className="block text-lg font-mono bg-gray-100 px-3 py-2 rounded mt-1">
                      {selectedAccount.code}
                    </code>
                  </div>
                  
                  <div>
                    <Label className="text-sm text-gray-600">계정명</Label>
                    <p className="text-lg font-medium mt-1">{selectedAccount.name}</p>
                    {selectedAccount.englishName && (
                      <p className="text-sm text-gray-500 mt-1">({selectedAccount.englishName})</p>
                    )}
                  </div>

                  {selectedAccount.description && (
                    <div>
                      <Label className="text-sm text-gray-600">설명</Label>
                      <p className="text-sm mt-1">{selectedAccount.description}</p>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-sm">
                      {accountTypeLabels[selectedAccount.type as AccountType] || selectedAccount.type}
                    </Badge>
                    <Badge variant="outline" className="text-sm">
                      레벨 {selectedAccount.level}
                    </Badge>
                    {selectedAccount.isSystem && (
                      <Badge variant="secondary">
                        <Building2 className="w-3 h-3 mr-1" />
                        시스템 계정
                      </Badge>
                    )}
                    {selectedAccount.allowTransaction && (
                      <Badge variant="outline" className="text-green-600">
                        거래 가능
                      </Badge>
                    )}
                    {!selectedAccount.isActive && (
                      <Badge variant="destructive">비활성</Badge>
                    )}
                  </div>

                  {selectedAccount.parent && (
                    <div>
                      <Label className="text-sm text-gray-600">상위 계정</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                          {selectedAccount.parent.code}
                        </code>
                        <span>{selectedAccount.parent.name}</span>
                      </div>
                    </div>
                  )}

                  {selectedAccount._count && selectedAccount._count.children > 0 && (
                    <div>
                      <Label className="text-sm text-gray-600">하위 계정</Label>
                      <p className="mt-1">{selectedAccount._count.children}개</p>
                    </div>
                  )}

                  <div className="pt-4 border-t">
                    <Link href="/dashboard/accounting/accounts">
                      <Button variant="outline" size="sm" className="w-full">
                        <FileText className="w-4 h-4 mr-2" />
                        계정과목 관리로 이동
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <TreePine className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>계정을 선택하면</p>
                  <p>상세 정보가 표시됩니다</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 빠른 액션 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">빠른 액션</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/dashboard/accounting/accounts">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <TreePine className="w-4 h-4 mr-2" />
                  계정과목 관리
                </Button>
              </Link>
              
              <Link href="/dashboard/accounting/transactions">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <FileText className="w-4 h-4 mr-2" />
                  거래 입력
                </Button>
              </Link>
              
              <Link href="/dashboard/accounting/reports">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Download className="w-4 h-4 mr-2" />
                  재무 보고서
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}