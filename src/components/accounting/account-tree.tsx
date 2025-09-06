'use client'

import { useState, useMemo, memo } from 'react'
import { ChevronDown, ChevronRight, Plus, Edit, Trash2, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { trpc } from '@/lib/trpc/client'
import { AccountType } from '@prisma/client'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

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

interface AccountTreeProps {
  onSelectAccount?: (account: AccountCodeWithChildren) => void
  onCreateAccount?: (parentId?: string) => void
  onEditAccount?: (account: AccountCodeWithChildren) => void
  selectedAccountId?: string
  showActions?: boolean
  maxLevel?: number
  accountType?: AccountType
  churchOnly?: boolean
}

const accountTypeLabels: Record<AccountType, string> = {
  ASSET: '자산',
  LIABILITY: '부채', 
  EQUITY: '자본',
  REVENUE: '수익',
  EXPENSE: '비용'
}

const accountTypeColors: Record<AccountType, string> = {
  ASSET: 'bg-blue-100 text-blue-800',
  LIABILITY: 'bg-red-100 text-red-800',
  EQUITY: 'bg-green-100 text-green-800',
  REVENUE: 'bg-yellow-100 text-yellow-800',
  EXPENSE: 'bg-purple-100 text-purple-800'
}

const AccountTreeComponent = ({
  onSelectAccount,
  onCreateAccount,
  onEditAccount,
  selectedAccountId,
  showActions = true,
  maxLevel = 4,
  accountType,
  churchOnly = false
}: AccountTreeProps) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const { toast } = useToast()

  // 전체 계정 데이터를 한 번에 조회
  const { data: allAccountTree, isLoading, refetch, error } = trpc.accountCodes.getTree.useQuery({
    churchOnly,
    maxLevel
  })

  // 클라이언트에서 필터링
  const accountTree = useMemo(() => {
    if (!allAccountTree || !accountType) return allAccountTree
    
    const filterByType = (accounts: AccountCodeWithChildren[]): AccountCodeWithChildren[] => {
      return accounts
        .filter(account => account.type === accountType)
        .map(account => ({
          ...account,
          children: account.children ? filterByType(account.children) : undefined
        }))
    }
    
    return filterByType(allAccountTree)
  }, [allAccountTree, accountType])

  const deleteAccount = trpc.accountCodes.delete.useMutation({
    onSuccess: () => {
      toast({
        title: '계정과목이 삭제되었습니다',
        description: '계정과목이 성공적으로 삭제되었습니다.',
      })
      refetch()
      setDeleteConfirmId(null)
    },
    onError: (error) => {
      toast({
        title: '삭제 실패',
        description: error.message,
        variant: 'destructive'
      })
      setDeleteConfirmId(null)
    }
  })

  const toggleExpanded = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes)
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId)
    } else {
      newExpanded.add(nodeId)
    }
    setExpandedNodes(newExpanded)
  }

  const handleDeleteAccount = (accountId: string) => {
    deleteAccount.mutate({ id: accountId })
  }

  const renderAccountNode = (account: AccountCodeWithChildren, level: number = 0) => {
    const hasChildren = account.children && account.children.length > 0
    const isExpanded = expandedNodes.has(account.id)
    const isSelected = selectedAccountId === account.id

    return (
      <div key={account.id} className={cn("", level > 0 && "ml-6")}>
        <div
          className={cn(
            "flex items-center gap-2 p-2 rounded-md hover:bg-gray-50 cursor-pointer transition-colors",
            isSelected && "bg-blue-50 border border-blue-200"
          )}
          onClick={() => onSelectAccount?.(account)}
        >
          {/* 확장/축소 버튼 */}
          <div className="w-6 h-6 flex items-center justify-center">
            {hasChildren ? (
              <Button
                variant="ghost"
                size="sm"
                className="w-6 h-6 p-0"
                onClick={(e) => {
                  e.stopPropagation()
                  toggleExpanded(account.id)
                }}
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </Button>
            ) : (
              <div className="w-4" />
            )}
          </div>

          {/* 계정 정보 */}
          <div className="flex-1 flex items-center gap-3">
            <div className="flex items-center gap-2">
              <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                {account.code}
              </code>
              <span className="font-medium">{account.name}</span>
              {account.englishName && (
                <span className="text-sm text-gray-500">({account.englishName})</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className={accountTypeColors[account.type]}>
                {accountTypeLabels[account.type]}
              </Badge>
              
              {account.isSystem && (
                <Badge variant="secondary">
                  <Building2 className="w-3 h-3 mr-1" />
                  시스템
                </Badge>
              )}
              
              {!account.allowTransaction && (
                <Badge variant="outline" className="text-gray-500">
                  거래불가
                </Badge>
              )}
              
              {!account.isActive && (
                <Badge variant="destructive">비활성</Badge>
              )}
            </div>
          </div>

          {/* 액션 버튼 */}
          {showActions && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onCreateAccount?.(account.id)
                }}
                className="h-8 px-2"
              >
                <Plus className="w-4 h-4" />
              </Button>
              
              {!account.isSystem && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      onEditAccount?.(account)
                    }}
                    className="h-8 px-2"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeleteConfirmId(account.id)
                    }}
                    className="h-8 px-2 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        {/* 하위 계정 렌더링 */}
        {hasChildren && isExpanded && account.children && (
          <div className="mt-1">
            {account.children.map((child) => renderAccountNode(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">
              계정과목 {accountType && `(${accountTypeLabels[accountType]})`}
            </CardTitle>
            {showActions && (
              <Button
                onClick={() => onCreateAccount?.()}
                className="h-9"
              >
                <Plus className="w-4 h-4 mr-2" />
                계정 추가
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-center py-8 text-red-500">
              <p>데이터를 불러오는 중 오류가 발생했습니다.</p>
              <p className="text-sm mt-2">{error.message}</p>
            </div>
          ) : accountTree && accountTree.length > 0 ? (
            <div className="space-y-1">
              {accountTree.map((account) => renderAccountNode(account))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>등록된 계정과목이 없습니다.</p>
              <p className="text-sm mt-2">Level 1 (관) 계정부터 생성해주세요.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>계정과목 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 계정과목을 삭제하시겠습니까? 
              <br />
              하위 계정이나 거래 내역이 있는 경우 삭제할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && handleDeleteAccount(deleteConfirmId)}
              className="bg-red-600 hover:bg-red-700"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export const AccountTree = memo(AccountTreeComponent)