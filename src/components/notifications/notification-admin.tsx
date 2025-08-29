'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

export function NotificationAdmin() {
  // 알림 시스템이 일시적으로 비활성화되어 있습니다
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>알림 관리</CardTitle>
          <CardDescription>알림 시스템이 일시적으로 비활성화되었습니다</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              알림 시스템이 현재 유지보수 중입니다. 곧 다시 활성화될 예정입니다.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  )
}