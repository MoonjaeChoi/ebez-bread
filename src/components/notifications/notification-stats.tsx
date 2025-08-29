'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { trpc } from '@/lib/trpc/client'
import { Mail, MessageSquare, Bell, Monitor, Check, X, Clock, AlertCircle } from 'lucide-react'

export function NotificationStats() {
  const { data: stats, isLoading } = trpc.notifications.getStats.useQuery()

  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">발송 완료</CardTitle>
            <Check className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.totalSent}</div>
            <p className="text-xs text-muted-foreground">성공적으로 발송된 알림</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">발송 실패</CardTitle>
            <X className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.totalFailed}</div>
            <p className="text-xs text-muted-foreground">발송에 실패한 알림</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">대기중</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.queueStats.pending}</div>
            <p className="text-xs text-muted-foreground">발송 대기중인 알림</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">발송중</CardTitle>
            <AlertCircle className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.queueStats.sending}</div>
            <p className="text-xs text-muted-foreground">현재 발송중인 알림</p>
          </CardContent>
        </Card>
      </div>

      {/* 큐 상태 */}
      {Object.keys(stats.queueStats.queueSizes).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>큐 상태</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(stats.queueStats.queueSizes).map(([priority, count]) => (
                <div key={priority} className="text-center">
                  <div className="text-lg font-semibold">{count as React.ReactNode}</div>
                  <div className="text-sm text-muted-foreground capitalize">
                    {priority.toLowerCase()} 우선순위
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 최근 알림 */}
      {stats.recentNotifications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>최근 알림</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recentNotifications.map((notification: any) => {
                const getChannelIcon = (channel: string) => {
                  switch (channel) {
                    case 'EMAIL': return <Mail className="h-4 w-4" />
                    case 'SMS': return <MessageSquare className="h-4 w-4" />
                    case 'PUSH': return <Bell className="h-4 w-4" />
                    case 'IN_APP': return <Monitor className="h-4 w-4" />
                    default: return <Bell className="h-4 w-4" />
                  }
                }

                const getStatusColor = (status: string) => {
                  switch (status) {
                    case 'SENT': return 'bg-green-100 text-green-800'
                    case 'FAILED': return 'bg-red-100 text-red-800'
                    case 'PENDING': return 'bg-yellow-100 text-yellow-800'
                    case 'SENDING': return 'bg-blue-100 text-blue-800'
                    default: return 'bg-gray-100 text-gray-800'
                  }
                }

                const getStatusName = (status: string) => {
                  switch (status) {
                    case 'SENT': return '발송완료'
                    case 'FAILED': return '발송실패'
                    case 'PENDING': return '대기중'
                    case 'SENDING': return '발송중'
                    default: return status
                  }
                }

                return (
                  <div key={notification.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getChannelIcon(notification.channel)}
                      <div>
                        <div className="font-medium text-sm">{notification.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(notification.createdAt).toLocaleString('ko-KR')}
                        </div>
                      </div>
                    </div>
                    <Badge className={getStatusColor(notification.status)}>
                      {getStatusName(notification.status)}
                    </Badge>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}