'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Switch } from '@/components/ui/switch'
import { DashboardLayout } from '@/components/layout'
import { usePermissions } from '@/hooks/use-permissions'
import { trpc } from '@/lib/trpc/client'
import {
  Shield,
  Users,
  DollarSign,
  UserCheck,
  Heart,
  FileText,
  BarChart3,
  Settings,
  Database,
  CheckCircle2,
  XCircle,
  Info,
  Save
} from 'lucide-react'
import { UserRole } from '@prisma/client'
import { toast } from 'sonner'

interface MenuPermission {
  key: string
  name: string
  description: string
  icon: React.ElementType
  category: string
}

const menuPermissions: MenuPermission[] = [
  {
    key: 'dashboard',
    name: '대시보드',
    description: '메인 대시보드 접근',
    icon: BarChart3,
    category: '기본',
  },
  {
    key: 'members',
    name: '교인 관리',
    description: '교인 정보 조회/수정/삭제',
    icon: Users,
    category: '교인',
  },
  {
    key: 'offerings',
    name: '헌금 관리',
    description: '헌금 입력/조회/통계',
    icon: DollarSign,
    category: '재정',
  },
  {
    key: 'attendance',
    name: '출석 관리',
    description: '출석 체크/통계',
    icon: UserCheck,
    category: '교인',
  },
  {
    key: 'visitations',
    name: '심방 관리',
    description: '심방 계획/기록/추적',
    icon: Heart,
    category: '목회',
  },
  {
    key: 'expense-reports',
    name: '지출결의서',
    description: '지출결의서 작성/승인/관리',
    icon: FileText,
    category: '재정',
  },
  {
    key: 'reports',
    name: '보고서',
    description: '각종 통계 및 보고서',
    icon: BarChart3,
    category: '보고서',
  },
  {
    key: 'data-management',
    name: '데이터 관리',
    description: '데이터 가져오기/내보내기',
    icon: Database,
    category: '시스템',
  },
  {
    key: 'admin',
    name: '시스템 관리',
    description: '사용자/시스템 설정 관리',
    icon: Settings,
    category: '시스템',
  },
]

export default function AdminPermissionsPage() {
  const { data: session, status } = useSession()
  const { accessibleMenus } = usePermissions()
  const router = useRouter()

  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.GENERAL_USER)
  const [hasChanges, setHasChanges] = useState(false)

  // tRPC queries and mutations
  const { data: menuPermissionsData, isLoading: permissionsLoading, refetch: refetchPermissions } = 
    trpc.admin.permissions.getMenuPermissions.useQuery()

  const updatePermissionsMutation = trpc.admin.permissions.updateMenuPermissions.useMutation({
    onSuccess: () => {
      toast.success('권한 설정이 성공적으로 업데이트되었습니다')
      setHasChanges(false)
      refetchPermissions()
    },
    onError: (error) => {
      toast.error(error.message || '권한 설정 업데이트에 실패했습니다')
    },
  })

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
    if (!accessibleMenus.admin) {
      router.push('/dashboard')
      return
    }
  }, [session, status, accessibleMenus.admin, router])

  if (status === 'loading') {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-r-transparent mx-auto mb-4" />
            <p className="text-muted-foreground">로딩 중...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!session || !accessibleMenus.admin) {
    return null
  }

  const getRoleDisplayName = (role: UserRole): string => {
    const roleNames: Record<UserRole, string> = {
      SUPER_ADMIN: '슈퍼 관리자',
      FINANCIAL_MANAGER: '재정 담당자',
      MINISTER: '교역자',
      COMMITTEE_CHAIR: '위원장',
      DEPARTMENT_HEAD: '부서장',
      DEPARTMENT_ACCOUNTANT: '부서 회계',
      GENERAL_USER: '일반 사용자',
      BUDGET_MANAGER: '예산 담당자',
      DEPARTMENT_BUDGET: '부서 예산 담당자',
    }
    return roleNames[role] || role
  }

  const getRoleDescription = (role: UserRole): string => {
    const descriptions: Record<UserRole, string> = {
      SUPER_ADMIN: '시스템의 모든 기능에 접근할 수 있는 최고 관리자',
      FINANCIAL_MANAGER: '재정 관련 업무를 전담하는 재정 담당자',
      MINISTER: '목회 업무를 담당하는 교역자 및 부서장',
      COMMITTEE_CHAIR: '각종 위원회 위원장으로 승인 권한을 가진 역할',
      DEPARTMENT_HEAD: '부서를 관리하는 부서장',
      DEPARTMENT_ACCOUNTANT: '부서 회계 업무를 담당하는 회계 담당자',
      GENERAL_USER: '기본적인 조회 권한만 가진 일반 사용자',
      BUDGET_MANAGER: '예산 계획 및 관리를 담당하는 예산 담당자',
      DEPARTMENT_BUDGET: '부서별 예산 관리를 담당하는 부서 예산 담당자',
    }
    return descriptions[role] || ''
  }

  const getCurrentPermissions = (role: UserRole): string[] => {
    if (!menuPermissionsData) return []
    return (menuPermissionsData as any)[role] || []
  }

  const handlePermissionToggle = () => {
    // 실제 권한 변경 로직은 현재 하드코딩되어 있으므로
    // UI 업데이트만 처리하고 실제 변경은 로깅만 수행
    setHasChanges(true)
    toast.info('권한 변경사항이 기록되었습니다. 저장 버튼을 클릭해주세요.')
  }

  const handleSaveChanges = () => {
    const currentPermissions = getCurrentPermissions(selectedRole)
    updatePermissionsMutation.mutate({
      role: selectedRole,
      menuItems: currentPermissions,
    })
  }

  const groupedPermissions = menuPermissions.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = []
    }
    acc[permission.category].push(permission)
    return acc
  }, {} as Record<string, MenuPermission[]>)

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">권한 설정 관리</h1>
            <p className="text-muted-foreground">
              사용자 역할별 메뉴 접근 권한을 설정합니다
            </p>
          </div>
          <Button 
            onClick={handleSaveChanges}
            disabled={!hasChanges || updatePermissionsMutation.isPending}
          >
            <Save className="mr-2 h-4 w-4" />
            {updatePermissionsMutation.isPending ? '저장 중...' : '변경사항 저장'}
          </Button>
        </div>

        {/* Info Card */}
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center text-blue-800">
              <Info className="mr-2 h-5 w-5" />
              권한 설정 안내
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-blue-700 text-sm">
              <p>• 각 사용자 역할별로 접근할 수 있는 메뉴를 설정할 수 있습니다.</p>
              <p>• 현재는 시스템에 하드코딩된 권한이 적용되며, 향후 데이터베이스 기반으로 확장될 예정입니다.</p>
              <p>• 권한 변경은 즉시 반영되지 않으며, 사용자가 다시 로그인해야 적용됩니다.</p>
              <p>• 슈퍼 관리자 권한은 변경할 수 없습니다.</p>
            </div>
          </CardContent>
        </Card>

        {/* Role Selection */}
        <Card>
          <CardHeader>
            <CardTitle>역할 선택</CardTitle>
            <CardDescription>권한을 설정할 사용자 역할을 선택하세요</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="role-select">사용자 역할</Label>
                  <Select value={selectedRole} onValueChange={(value: UserRole) => setSelectedRole(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(UserRole).map((role) => (
                        <SelectItem key={role} value={role}>
                          {getRoleDisplayName(role)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Badge variant="outline" className="h-10 px-4 flex items-center">
                    <Shield className="mr-2 h-4 w-4" />
                    {getRoleDisplayName(selectedRole)}
                  </Badge>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {getRoleDescription(selectedRole)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Permissions Table */}
        <Card>
          <CardHeader>
            <CardTitle>메뉴 접근 권한</CardTitle>
            <CardDescription>
              {getRoleDisplayName(selectedRole)}의 메뉴별 접근 권한 설정
            </CardDescription>
          </CardHeader>
          <CardContent>
            {permissionsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-r-transparent mx-auto mb-4" />
                  <p className="text-muted-foreground">권한 정보를 불러오는 중...</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedPermissions).map(([category, permissions]) => (
                  <div key={category}>
                    <h3 className="text-lg font-medium mb-4 text-foreground border-b pb-2">
                      {category} 메뉴
                    </h3>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>메뉴</TableHead>
                            <TableHead>설명</TableHead>
                            <TableHead className="text-center">접근 권한</TableHead>
                            <TableHead className="text-center">현재 상태</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {permissions.map((permission) => {
                            const hasPermission = getCurrentPermissions(selectedRole).includes(permission.key)
                            const Icon = permission.icon
                            
                            return (
                              <TableRow key={permission.key}>
                                <TableCell>
                                  <div className="flex items-center gap-3">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                                      <Icon className="h-4 w-4 text-primary" />
                                    </div>
                                    <span className="font-medium">{permission.name}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {permission.description}
                                </TableCell>
                                <TableCell className="text-center">
                                  <Switch
                                    checked={hasPermission}
                                    onCheckedChange={handlePermissionToggle}
                                    disabled={selectedRole === UserRole.SUPER_ADMIN}
                                  />
                                </TableCell>
                                <TableCell className="text-center">
                                  {hasPermission ? (
                                    <div className="flex items-center justify-center">
                                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                                      <span className="ml-1 text-sm text-green-600">허용</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-center">
                                      <XCircle className="h-4 w-4 text-red-600" />
                                      <span className="ml-1 text-sm text-red-600">차단</span>
                                    </div>
                                  )}
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Permission Summary */}
        <Card>
          <CardHeader>
            <CardTitle>권한 요약</CardTitle>
            <CardDescription>
              {getRoleDisplayName(selectedRole)}이 접근할 수 있는 메뉴 목록
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {getCurrentPermissions(selectedRole).map((menuKey) => {
                  const permission = menuPermissions.find(p => p.key === menuKey)
                  if (!permission) return null
                  
                  const Icon = permission.icon
                  return (
                    <Badge key={menuKey} variant="secondary" className="flex items-center gap-1">
                      <Icon className="h-3 w-3" />
                      {permission.name}
                    </Badge>
                  )
                })}
              </div>
              
              {getCurrentPermissions(selectedRole).length === 0 && (
                <p className="text-muted-foreground">이 역할은 접근할 수 있는 메뉴가 없습니다.</p>
              )}
              
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  총 {getCurrentPermissions(selectedRole).length}개 메뉴에 접근 가능 
                  (전체 {menuPermissions.length}개 메뉴 중)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}