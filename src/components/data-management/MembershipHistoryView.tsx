'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  History, 
  ChevronLeft, 
  ChevronRight, 
  Crown, 
  User, 
  Calendar, 
  FileText,
  AlertCircle,
  CheckCircle2,
  XCircle
} from 'lucide-react'

interface MembershipHistoryViewProps {
  membershipId: string
}

const changeTypeIcons = {
  ROLE_CHANGED: Crown,
  STATUS_CHANGED: AlertCircle,
  PRIMARY_CHANGED: CheckCircle2,
  JOIN_DATE_CHANGED: Calendar,
  END_DATE_CHANGED: Calendar,
  NOTES_CHANGED: FileText,
  ACTIVATED: CheckCircle2,
  DEACTIVATED: XCircle,
}

const changeTypeLabels = {
  ROLE_CHANGED: '직책 변경',
  STATUS_CHANGED: '상태 변경',
  PRIMARY_CHANGED: '주요 조직 설정 변경',
  JOIN_DATE_CHANGED: '참여 시작일 변경',
  END_DATE_CHANGED: '종료일 변경',
  NOTES_CHANGED: '메모 변경',
  ACTIVATED: '구성원 활성화',
  DEACTIVATED: '구성원 비활성화',
}

const changeTypeColors = {
  ROLE_CHANGED: 'bg-blue-50 text-blue-700 border-blue-200',
  STATUS_CHANGED: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  PRIMARY_CHANGED: 'bg-green-50 text-green-700 border-green-200',
  JOIN_DATE_CHANGED: 'bg-purple-50 text-purple-700 border-purple-200',
  END_DATE_CHANGED: 'bg-orange-50 text-orange-700 border-orange-200',
  NOTES_CHANGED: 'bg-gray-50 text-gray-700 border-gray-200',
  ACTIVATED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  DEACTIVATED: 'bg-red-50 text-red-700 border-red-200',
}

export function MembershipHistoryView({ membershipId }: MembershipHistoryViewProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  const { data: historyData, isLoading, error } = trpc.organizationMemberships.getHistory.useQuery({
    membershipId,
    page: currentPage,
    limit: pageSize,
  })

  const formatValue = (value: string | null) => {
    if (!value) return '없음'
    try {
      const parsed = JSON.parse(value)
      if (typeof parsed === 'object') {
        return Object.entries(parsed)
          .map(([key, val]) => `${key}: ${val || '없음'}`)
          .join(', ')
      }
      return value
    } catch {
      return value
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            변경 이력
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-12 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            변경 이력
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">이력을 불러오는 중 오류가 발생했습니다.</p>
        </CardContent>
      </Card>
    )
  }

  const { data: history, pagination } = historyData || { data: [], pagination: null }

  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            변경 이력
          </CardTitle>
          <CardDescription>
            이 멤버십의 변경 이력을 확인할 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">아직 변경 이력이 없습니다.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          변경 이력
        </CardTitle>
        <CardDescription>
          총 {pagination?.totalCount || 0}건의 변경 이력이 있습니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {history.map((record: any) => {
          const Icon = changeTypeIcons[record.changeType as keyof typeof changeTypeIcons]
          const colorClass = changeTypeColors[record.changeType as keyof typeof changeTypeColors]
          
          return (
            <div key={record.id} className="border rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {Icon && <Icon className="h-4 w-4" />}
                  <Badge variant="outline" className={colorClass}>
                    {changeTypeLabels[record.changeType as keyof typeof changeTypeLabels] || record.changeType}
                  </Badge>
                </div>
                <span className="text-xs text-gray-500">
                  {formatDate(record.createdAt.toString())}
                </span>
              </div>
              
              <div className="text-sm space-y-1">
                {record.reason && (
                  <p className="font-medium">{record.reason}</p>
                )}
                
                <div className="grid grid-cols-2 gap-4 text-xs">
                  {record.previousValue && (
                    <div>
                      <span className="text-gray-500">변경 전:</span>
                      <p className="text-red-600">{formatValue(record.previousValue)}</p>
                    </div>
                  )}
                  {record.newValue && (
                    <div>
                      <span className="text-gray-500">변경 후:</span>
                      <p className="text-green-600">{formatValue(record.newValue)}</p>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <User className="h-3 w-3" />
                  <span>{record.createdBy.name}</span>
                </div>
              </div>
            </div>
          )
        })}
        
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between pt-4">
            <div className="text-sm text-gray-500">
              {pagination.totalCount}건 중 {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, pagination.totalCount)}건 표시
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={!pagination.hasPreviousPage}
              >
                <ChevronLeft className="h-4 w-4" />
                이전
              </Button>
              
              <span className="text-sm">
                {currentPage} / {pagination.totalPages}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={!pagination.hasNextPage}
              >
                다음
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}