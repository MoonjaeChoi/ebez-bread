'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Building2, Plus, FileText, TreePine } from 'lucide-react'
import { AccountTree } from '@/components/accounting/account-tree'
import { AccountForm } from '@/components/accounting/account-form'
import { AccountType } from '@prisma/client'
import { trpc } from '@/lib/trpc/client'

interface AccountCodeWithChildren {
  id: string
  code: string
  name: string
  englishName?: string | null
  type: AccountType
  level: number
  isSystem: boolean
  allowTransaction: boolean
  isActive: boolean
  parent?: {
    id: string
    code: string
    name: string
    level: number
  } | null
  children?: AccountCodeWithChildren[]
  _count?: {
    children: number
  }
}

const accountTypeLabels: Record<AccountType, string> = {
  ASSET: '자산',
  LIABILITY: '부채',
  EQUITY: '자본',
  REVENUE: '수익',
  EXPENSE: '비용'
}

export default function AccountsPage() {
  const [selectedAccountType, setSelectedAccountType] = useState<AccountType | 'ALL'>('ALL')
  const [churchOnly, setChurchOnly] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<AccountCodeWithChildren | null>(null)
  
  // 폼 상태
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [parentIdForCreate, setParentIdForCreate] = useState<string | undefined>()

  // 통계 조회
  const { data: accountStats } = trpc.accountCodes.getAll.useQuery({
    limit: 1,
    churchOnly
  })

  const handleCreateAccount = (parentId?: string) => {
    setParentIdForCreate(parentId)
    setShowCreateForm(true)
  }

  const handleEditAccount = (account: AccountCodeWithChildren) => {
    setSelectedAccount(account)
    setShowEditForm(true)
  }

  const handleSelectAccount = (account: AccountCodeWithChildren) => {
    setSelectedAccount(account)
  }

  const handleFormSuccess = () => {
    setShowCreateForm(false)
    setShowEditForm(false)
    setSelectedAccount(null)
    setParentIdForCreate(undefined)
  }

  const handleFormCancel = () => {
    setShowCreateForm(false)
    setShowEditForm(false)
    setSelectedAccount(null)
    setParentIdForCreate(undefined)
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">계정과목 관리</h1>
          <p className="text-gray-600 mt-1">
            한국 표준 회계기준 4단계 계층구조 계정과목을 관리합니다
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => handleCreateAccount()}
          >
            <Plus className="w-4 h-4 mr-2" />
            계정 추가
          </Button>
        </div>
      </div>

      {/* 통계 카드 */}
      {accountStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">전체 계정</p>
                  <p className="text-2xl font-bold">{accountStats.total}</p>
                </div>
                <Building2 className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 계정 트리 */}
        <div className="lg:col-span-2">
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
              
              {/* 단일 AccountTree 컴포넌트로 모든 탭 처리 */}
              <div className="mt-4">
                <AccountTree
                  accountType={selectedAccountType === 'ALL' ? undefined : selectedAccountType as AccountType}
                  onSelectAccount={handleSelectAccount}
                  onCreateAccount={handleCreateAccount}
                  onEditAccount={handleEditAccount}
                  selectedAccountId={selectedAccount?.id}
                  churchOnly={churchOnly}
                />
              </div>
            </Tabs>
          </div>
        </div>

        {/* 선택된 계정 상세 정보 */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                계정 상세 정보
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

                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-sm">
                      {accountTypeLabels[selectedAccount.type]}
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

                  <div className="flex gap-2 pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCreateAccount(selectedAccount.id)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      하위 계정 추가
                    </Button>
                    
                    {!selectedAccount.isSystem && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditAccount(selectedAccount)}
                      >
                        수정
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <TreePine className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  계정을 선택하면 상세 정보가 표시됩니다
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 계정 생성 다이얼로그 */}
      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>새 계정과목 생성</DialogTitle>
          </DialogHeader>
          <AccountForm
            parentId={parentIdForCreate}
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
          />
        </DialogContent>
      </Dialog>

      {/* 계정 수정 다이얼로그 */}
      <Dialog open={showEditForm} onOpenChange={setShowEditForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>계정과목 수정</DialogTitle>
          </DialogHeader>
          <AccountForm
            accountId={selectedAccount?.id}
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}