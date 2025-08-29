'use client'

import { useState, useEffect } from 'react'
import { Check, ChevronsUpDown, Search, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { trpc } from '@/lib/trpc/client'
import { AccountType } from '@prisma/client'
import { cn } from '@/lib/utils'

interface AccountOption {
  id: string
  code: string
  name: string
  type: AccountType
  englishName?: string | null
  isSystem?: boolean
  level?: number
}

interface AccountSelectorProps {
  value?: string
  onValueChange?: (value: string | undefined) => void
  accountType?: AccountType
  transactionOnly?: boolean // true면 거래 가능한 계정만
  placeholder?: string
  disabled?: boolean
  allowClear?: boolean
  className?: string
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

export function AccountSelector({
  value,
  onValueChange,
  accountType,
  transactionOnly = false,
  placeholder = '계정을 선택하세요',
  disabled = false,
  allowClear = true,
  className
}: AccountSelectorProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // 거래 가능한 계정 조회
  const { data: transactionAccounts, isLoading: isLoadingTransactionAccounts } = 
    trpc.accountCodes.getTransactionAccounts.useQuery({
      type: accountType,
      search: searchQuery
    }, {
      enabled: transactionOnly
    })

  // 전체 계정 조회
  const { data: allAccounts, isLoading: isLoadingAllAccounts } = 
    trpc.accountCodes.getAll.useQuery({
      search: searchQuery,
      type: accountType,
      limit: 100,
      includeInactive: false
    }, {
      enabled: !transactionOnly
    })

  // 선택된 계정 정보 조회
  const { data: selectedAccount } = trpc.accountCodes.getById.useQuery(
    { id: value! },
    { enabled: !!value }
  )

  const accounts: AccountOption[] = transactionOnly 
    ? (transactionAccounts || [])
    : (allAccounts?.accountCodes || [])

  const isLoading = transactionOnly ? isLoadingTransactionAccounts : isLoadingAllAccounts

  const handleSelect = (accountId: string) => {
    if (value === accountId) {
      if (allowClear) {
        onValueChange?.(undefined)
      }
    } else {
      onValueChange?.(accountId)
    }
    setOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onValueChange?.(undefined)
  }

  const selectedAccountDisplay = selectedAccount ? (
    <div className="flex items-center gap-2 flex-1 min-w-0">
      <code className="text-sm font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">
        {selectedAccount.code}
      </code>
      <span className="truncate">{selectedAccount.name}</span>
      <Badge variant="outline" className={`${accountTypeColors[selectedAccount.type]} text-xs`}>
        {accountTypeLabels[selectedAccount.type]}
      </Badge>
    </div>
  ) : null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "justify-between font-normal h-auto min-h-[40px] py-2",
            !selectedAccount && "text-muted-foreground",
            className
          )}
        >
          {selectedAccount ? selectedAccountDisplay : placeholder}
          <div className="flex items-center gap-2 ml-2">
            {allowClear && selectedAccount && (
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 hover:bg-red-100"
                onClick={handleClear}
              >
                ×
              </Button>
            )}
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" side="bottom" align="start">
        <Command>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Input
              placeholder="계정 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
          <CommandList>
            <ScrollArea className="h-[300px]">
              {isLoading ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : accounts.length === 0 ? (
                <CommandEmpty>계정을 찾을 수 없습니다.</CommandEmpty>
              ) : (
                <CommandGroup>
                  {accounts.map((account) => (
                    <CommandItem
                      key={account.id}
                      value={`${account.code} ${account.name}`}
                      onSelect={() => handleSelect(account.id)}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Check
                          className={cn(
                            "h-4 w-4",
                            value === account.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        
                        <code className="text-sm font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 shrink-0">
                          {account.code}
                        </code>
                        
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="truncate font-medium">{account.name}</span>
                          {account.englishName && (
                            <span className="text-xs text-gray-500 truncate">
                              {account.englishName}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <Badge 
                            variant="outline" 
                            className={`${accountTypeColors[account.type]} text-xs`}
                          >
                            {accountTypeLabels[account.type]}
                          </Badge>
                          
                          {account.isSystem && (
                            <Badge variant="secondary" className="text-xs">
                              <Building2 className="w-3 h-3 mr-1" />
                              시스템
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </ScrollArea>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// 단순한 계정 이름 표시 컴포넌트
export function AccountDisplay({ accountId, showCode = true }: { accountId?: string, showCode?: boolean }) {
  const { data: account, isLoading } = trpc.accountCodes.getById.useQuery(
    { id: accountId! },
    { enabled: !!accountId }
  )

  if (!accountId) return <span className="text-gray-400">-</span>
  
  if (isLoading) return <Skeleton className="h-4 w-32" />
  
  if (!account) return <span className="text-red-400">계정을 찾을 수 없음</span>

  return (
    <div className="flex items-center gap-2">
      {showCode && (
        <code className="text-sm font-mono bg-gray-100 px-1.5 py-0.5 rounded">
          {account.code}
        </code>
      )}
      <span>{account.name}</span>
      <Badge variant="outline" className={`${accountTypeColors[account.type]} text-xs`}>
        {accountTypeLabels[account.type]}
      </Badge>
    </div>
  )
}