'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { trpc } from '@/lib/trpc/client'
import { NotificationType, NotificationChannel, NotificationStatus } from '@prisma/client'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Mail, MessageSquare, Bell, Monitor, Check, X, Clock, Loader2 } from 'lucide-react'

const channelIcons = {
  [NotificationChannel.EMAIL]: Mail,
  [NotificationChannel.SMS]: MessageSquare,
  [NotificationChannel.PUSH]: Bell,
  [NotificationChannel.IN_APP]: Monitor,
}

const channelNames = {
  [NotificationChannel.EMAIL]: '이메일',
  [NotificationChannel.SMS]: 'SMS',
  [NotificationChannel.PUSH]: '푸시',
  [NotificationChannel.IN_APP]: '인앱',
}

const typeNames = {
  [NotificationType.BIRTHDAY_REMINDER]: '생일 축하',
  [NotificationType.VISITATION_REMINDER]: '심방 알림',
  [NotificationType.EXPENSE_APPROVAL_REQUEST]: '승인 요청',
  [NotificationType.EXPENSE_APPROVED]: '승인 완료',
  [NotificationType.EXPENSE_REJECTED]: '승인 반려',
  [NotificationType.SYSTEM_ANNOUNCEMENT]: '시스템 공지',
  [NotificationType.WELCOME_NEW_MEMBER]: '새 교인 환영',
  [NotificationType.PAYMENT_REMINDER]: '납부 안내',
  [NotificationType.CUSTOM]: '사용자 정의',
}

const statusColors = {
  [NotificationStatus.SENT]: 'bg-green-100 text-green-800',
  [NotificationStatus.FAILED]: 'bg-red-100 text-red-800',
  [NotificationStatus.PENDING]: 'bg-yellow-100 text-yellow-800',
  [NotificationStatus.SENDING]: 'bg-blue-100 text-blue-800',
  [NotificationStatus.CANCELLED]: 'bg-gray-100 text-gray-800',
}

const statusNames = {
  [NotificationStatus.SENT]: '발송 완료',
  [NotificationStatus.FAILED]: '발송 실패',
  [NotificationStatus.PENDING]: '대기중',
  [NotificationStatus.SENDING]: '발송중',
  [NotificationStatus.CANCELLED]: '취소됨',
}

const statusIcons = {
  [NotificationStatus.SENT]: Check,
  [NotificationStatus.FAILED]: X,
  [NotificationStatus.PENDING]: Clock,
  [NotificationStatus.SENDING]: Loader2,
  [NotificationStatus.CANCELLED]: X,
}

export function NotificationHistory() {
  const [page, setPage] = useState(1)
  const [typeFilter, setTypeFilter] = useState<NotificationType | 'all'>('all')
  const [channelFilter, setChannelFilter] = useState<NotificationChannel | 'all'>('all')

  const { data, isLoading, refetch } = trpc.notifications.getHistory.useQuery({
    page,
    limit: 20,
    type: typeFilter === 'all' ? undefined : typeFilter,
    channel: channelFilter === 'all' ? undefined : channelFilter,
  })

  const notifications = data?.notifications || []
  const totalPages = data?.pages || 1

  return (
    <div className="space-y-4">
      {/* 필터 */}
      <Card>
        <CardHeader>
          <CardTitle>필터</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">알림 유형</label>
              <Select
                value={typeFilter}
                onValueChange={(value) => setTypeFilter(value as NotificationType | 'all')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  {Object.entries(typeNames).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">알림 채널</label>
              <Select
                value={channelFilter}
                onValueChange={(value) => setChannelFilter(value as NotificationChannel | 'all')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  {Object.entries(channelNames).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button onClick={() => refetch()} variant="outline">
                새로고침
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 알림 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>알림 기록</CardTitle>
          <CardDescription>
            최근 받은 알림들을 확인할 수 있습니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center text-muted-foreground p-8">
              알림 기록이 없습니다
            </div>
          ) : (
            <div className="space-y-4">
              {notifications.map((notification: any) => {
                const ChannelIcon = channelIcons[notification.channel as NotificationChannel]
                const StatusIcon = statusIcons[notification.status as NotificationStatus]
                
                return (
                  <div
                    key={notification.id}
                    className="flex items-start gap-4 p-4 border rounded-lg"
                  >
                    <div className="flex-shrink-0">
                      <ChannelIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{notification.title}</h4>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {typeNames[notification.type as NotificationType]}
                          </Badge>
                          <Badge className={statusColors[notification.status as NotificationStatus]}>
                            <StatusIcon 
                              className={`h-3 w-3 mr-1 ${
                                notification.status === NotificationStatus.SENDING ? 'animate-spin' : ''
                              }`} 
                            />
                            {statusNames[notification.status as NotificationStatus]}
                          </Badge>
                        </div>
                      </div>
                      
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {notification.message}
                      </p>
                      
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{channelNames[notification.channel as NotificationChannel]}</span>
                        <span>
                          {format(new Date(notification.createdAt), 'yyyy.MM.dd HH:mm', { locale: ko })}
                        </span>
                      </div>

                      {notification.errorMessage && (
                        <p className="text-sm text-red-600 bg-red-50 p-2 rounded">
                          오류: {notification.errorMessage}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                이전
              </Button>
              
              <span className="text-sm text-muted-foreground">
                {page} / {totalPages}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                다음
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}