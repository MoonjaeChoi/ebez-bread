import { Metadata } from 'next'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { NotificationSettingsForm } from '@/components/notifications/notification-settings-form'
import { NotificationHistory } from '@/components/notifications/notification-history'
import { NotificationStats } from '@/components/notifications/notification-stats'
import { NotificationAdmin } from '@/components/notifications/notification-admin'
import { Bell } from 'lucide-react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canApproveExpenses } from '@/lib/permissions'

export const metadata: Metadata = {
  title: '알림 설정 | 에벤에셀 교회 관리 시스템',
  description: '알림 설정을 관리하고 알림 기록을 확인합니다.',
}

export default async function NotificationsPage() {
  const session = await getServerSession(authOptions)
  const isManager = session?.user?.role && canApproveExpenses(session.user.role as any)

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-2 mb-6">
        <Bell className="h-6 w-6" />
        <h1 className="text-2xl font-bold">알림 설정</h1>
      </div>

      <Tabs defaultValue="settings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="settings">알림 설정</TabsTrigger>
          <TabsTrigger value="history">알림 기록</TabsTrigger>
          <TabsTrigger value="stats">통계</TabsTrigger>
          {isManager && <TabsTrigger value="admin">관리</TabsTrigger>}
        </TabsList>

        <TabsContent value="settings" className="space-y-4">
          <NotificationSettingsForm />
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <NotificationHistory />
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          <NotificationStats />
        </TabsContent>

        {isManager && (
          <TabsContent value="admin" className="space-y-4">
            <NotificationAdmin />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}