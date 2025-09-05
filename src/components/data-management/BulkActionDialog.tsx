'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Crown, 
  Users, 
  AlertTriangle,
  CheckCircle,
  UserCheck,
  UserX,
  Move,
  X
} from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import type { OrganizationMembership } from '@prisma/client'

type BulkActionType = 'role' | 'organization' | 'activate' | 'deactivate'

interface BulkActionDialogProps {
  open: boolean
  onClose: () => void
  actionType: BulkActionType | null
  selectedMemberships: any[] // 더 유연한 타입으로 변경
  onSuccess: () => void
}

const actionConfig = {
  role: {
    title: '직책 일괄 변경',
    description: '선택된 구성원들의 직책을 일괄적으로 변경합니다.',
    icon: Crown,
    confirmButtonText: '직책 변경',
    requiresSelection: true
  },
  organization: {
    title: '조직 일괄 이동',
    description: '선택된 구성원들을 다른 조직으로 일괄 이동합니다.',
    icon: Move,
    confirmButtonText: '조직 이동',
    requiresSelection: true
  },
  activate: {
    title: '구성원 일괄 활성화',
    description: '선택된 구성원들을 일괄적으로 활성화합니다.',
    icon: UserCheck,
    confirmButtonText: '활성화',
    requiresSelection: false
  },
  deactivate: {
    title: '구성원 일괄 비활성화',
    description: '선택된 구성원들을 일괄적으로 비활성화합니다.',
    icon: UserX,
    confirmButtonText: '비활성화',
    requiresSelection: false
  }
}

export function BulkActionDialog({
  open,
  onClose,
  actionType,
  selectedMemberships,
  onSuccess
}: BulkActionDialogProps) {
  const [selectedValue, setSelectedValue] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState(false)

  const config = actionType ? actionConfig[actionType] : null
  const Icon = config?.icon

  // tRPC queries
  const { data: roles } = trpc.organizationRoles.getAll.useQuery({
    isActive: true
  }, {
    enabled: actionType === 'role'
  })

  const { data: organizations } = trpc.organizations.getHierarchy.useQuery({}, {
    enabled: actionType === 'organization'
  })

  // tRPC mutations
  const bulkUpdateMutation = trpc.organizationMemberships.bulkUpdate.useMutation()
  const bulkTransferMutation = trpc.organizationMemberships.bulkTransfer.useMutation()

  const handleConfirm = async () => {
    if (!actionType || !config) return

    setIsProcessing(true)

    try {
      const membershipIds = selectedMemberships.map(m => m.id)

      // 각 액션 타입별로 처리
      switch (actionType) {
        case 'role':
          if (!selectedValue && config.requiresSelection) {
            alert('직책을 선택해주세요')
            return
          }
          
          await bulkUpdateMutation.mutateAsync({
            membershipIds,
            roleId: selectedValue === '__NO_ROLE__' ? null : selectedValue,
            reason: '일괄 직책 변경'
          })
          break

        case 'organization':
          if (!selectedValue && config.requiresSelection) {
            alert('조직을 선택해주세요')
            return
          }
          
          await bulkTransferMutation.mutateAsync({
            membershipIds,
            targetOrganizationId: selectedValue,
            keepRole: true, // 직책 유지
            reason: '일괄 조직 이동'
          })
          break

        case 'activate':
          await bulkUpdateMutation.mutateAsync({
            membershipIds,
            endDate: null, // 종료일 제거하여 활성화
            reason: '일괄 활성화'
          })
          break

        case 'deactivate':
          await bulkUpdateMutation.mutateAsync({
            membershipIds,
            endDate: new Date(), // 종료일 설정하여 비활성화
            reason: '일괄 비활성화'
          })
          break
      }

      onSuccess()
      onClose()
      setSelectedValue('')
    } catch (error) {
      console.error('일괄 작업 오류:', error)
      alert('작업 중 오류가 발생했습니다')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleClose = () => {
    onClose()
    setSelectedValue('')
  }

  if (!open || !actionType || !config) return null

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {Icon && <Icon className="h-5 w-5" />}
            {config.title}
          </DialogTitle>
          <DialogDescription>
            {config.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 선택 옵션 */}
          {config.requiresSelection && (
            <div className="space-y-2">
              <Label>
                {actionType === 'role' ? '새로운 직책' : '이동할 조직'}
              </Label>
              
              {actionType === 'role' && (
                <Select value={selectedValue} onValueChange={setSelectedValue}>
                  <SelectTrigger>
                    <SelectValue placeholder="직책을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__NO_ROLE__">직책 없음</SelectItem>
                    {roles?.filter((role: any) => role.isActive).map((role: any) => (
                      <SelectItem key={role.id} value={role.id}>
                        <div className="flex items-center gap-2">
                          {role.isLeadership && <Crown className="h-3 w-3" />}
                          {role.name}
                          <Badge variant="outline" className="text-xs">
                            Lv.{role.level}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {actionType === 'organization' && (
                <Select value={selectedValue} onValueChange={setSelectedValue}>
                  <SelectTrigger>
                    <SelectValue placeholder="조직을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations?.map((org: any) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name} ({org.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* 선택된 구성원 목록 */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              대상 구성원 ({selectedMemberships.length}명)
            </Label>
            
            <ScrollArea className="h-32 rounded border">
              <div className="p-3 space-y-2">
                {selectedMemberships.map((membership) => (
                  <div key={membership.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{membership.member.name}</span>
                      {membership.role && (
                        <Badge variant="secondary" className="text-xs">
                          {membership.role.name}
                        </Badge>
                      )}
                    </div>
                    <Badge variant={membership.isActive ? "default" : "secondary"} className="text-xs">
                      {membership.isActive ? '활성' : '비활성'}
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* 경고 메시지 */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              이 작업은 되돌릴 수 없습니다. 선택된 {selectedMemberships.length}명의 구성원에게 
              {actionType === 'deactivate' ? ' 비활성화가' : ' 변경사항이'} 적용됩니다.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            취소
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={isProcessing || (config.requiresSelection && !selectedValue)}
            className={actionType === 'deactivate' ? 'bg-red-600 hover:bg-red-700' : ''}
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                처리 중...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                {config.confirmButtonText}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}