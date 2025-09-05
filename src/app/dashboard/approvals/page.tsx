import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { ApprovalDashboard } from '@/components/approval/ApprovalDashboard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Clock, AlertTriangle } from 'lucide-react'

export const metadata: Metadata = {
  title: '결재 관리 | Ebenezer',
  description: '지출결의서 결재 및 승인 관리',
}

export default async function ApprovalsPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect('/auth/signin')
  }

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">결재 관리</h1>
        <p className="text-muted-foreground">
          지출결의서 결재 및 승인을 관리합니다.
        </p>
      </div>

      {/* 안내 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              결재 대기
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              승인이나 반려 처리가 필요한 지출결의서입니다.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              결재 완료
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              모든 결재 단계가 완료된 지출결의서입니다.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              결재 반려
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              반려된 지출결의서입니다. 수정 후 재요청이 필요합니다.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 결재 대시보드 */}
      <ApprovalDashboard userId={session.user.id} />
    </div>
  )
}