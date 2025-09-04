'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Building2, Plus, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { OrganizationLevel } from '@prisma/client'

interface OrganizationManageDialogProps {
  children: React.ReactNode
  onSuccess?: () => void
}

export function OrganizationManageDialog({ children, onSuccess }: OrganizationManageDialogProps) {
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    englishName: '',
    level: '' as string,
    description: '',
    parentId: '',
    sortOrder: 0
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  // 조직 생성 mutation
  const createOrganization = trpc.organizations.create.useMutation({
    onSuccess: (data) => {
      console.log('조직 생성 성공:', data)
      setFormData({
        code: '',
        name: '',
        englishName: '',
        level: '',
        description: '',
        parentId: '',
        sortOrder: 0
      })
      setErrors({})
      setOpen(false)
      onSuccess?.()
    },
    onError: (error) => {
      console.error('조직 생성 실패:', error)
      setErrors({ general: error.message })
    }
  })

  // 기존 조직들 조회 (부모 조직 선택용)
  const { data: organizations } = trpc.organizations.getHierarchy.useQuery({
    includeInactive: false,
    includeStats: false
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // 기본 유효성 검사
    const newErrors: Record<string, string> = {}
    
    if (!formData.code.trim()) {
      newErrors.code = '조직코드를 입력해주세요'
    }
    
    if (!formData.name.trim()) {
      newErrors.name = '조직명을 입력해주세요'
    }
    
    if (!formData.level) {
      newErrors.level = '조직 레벨을 선택해주세요'
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    // 조직 생성 실행
    createOrganization.mutate({
      code: formData.code.trim(),
      name: formData.name.trim(),
      englishName: formData.englishName.trim() || undefined,
      level: formData.level as OrganizationLevel,
      description: formData.description.trim() || undefined,
      parentId: formData.parentId || undefined,
      sortOrder: formData.sortOrder
    })
  }

  const getLevelLabel = (level: OrganizationLevel) => {
    switch (level) {
      case 'LEVEL_1': return '본부/교구'
      case 'LEVEL_2': return '부서/팀'
      case 'LEVEL_3': return '소그룹/모임'
      case 'LEVEL_4': return '세부조직'
      case 'LEVEL_5': return '개별단위'
      default: return '조직'
    }
  }

  const getLevelOptions = () => {
    const levels = [
      { value: 'LEVEL_1', label: getLevelLabel('LEVEL_1') },
      { value: 'LEVEL_2', label: getLevelLabel('LEVEL_2') },
      { value: 'LEVEL_3', label: getLevelLabel('LEVEL_3') },
      { value: 'LEVEL_4', label: getLevelLabel('LEVEL_4') },
      { value: 'LEVEL_5', label: getLevelLabel('LEVEL_5') }
    ]
    return levels
  }

  const getParentOptions = () => {
    if (!organizations) return []
    
    const selectedLevel = formData.level as OrganizationLevel
    if (!selectedLevel) return []
    
    // 선택된 레벨보다 한 단계 위 레벨의 조직들만 부모로 선택 가능
    const levelMap = {
      'LEVEL_1': null, // LEVEL_1은 부모가 없음
      'LEVEL_2': 'LEVEL_1',
      'LEVEL_3': 'LEVEL_2', 
      'LEVEL_4': 'LEVEL_3',
      'LEVEL_5': 'LEVEL_4'
    }
    
    const parentLevel = levelMap[selectedLevel]
    if (!parentLevel) return []
    
    // 재귀적으로 모든 조직 수집
    const collectOrganizations = (orgs: any[]): any[] => {
      const result: any[] = []
      orgs.forEach(org => {
        if (org.level === parentLevel) {
          result.push(org)
        }
        if (org.children && org.children.length > 0) {
          result.push(...collectOrganizations(org.children))
        }
      })
      return result
    }
    
    return collectOrganizations(organizations)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            새 조직 생성
          </DialogTitle>
          <DialogDescription>
            새로운 교회 조직을 생성합니다
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            {errors.general && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{errors.general}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="code">조직코드 *</Label>
              <Input
                id="code"
                placeholder="예: DISTRICT, YOUTH"
                value={formData.code}
                onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                className={errors.code ? 'border-red-500' : ''}
              />
              {errors.code && (
                <p className="text-sm text-red-500">{errors.code}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">조직명 *</Label>
              <Input
                id="name"
                placeholder="예: 교구, 청년부"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="englishName">영문명 (선택)</Label>
              <Input
                id="englishName"
                placeholder="예: District, Youth Department"
                value={formData.englishName}
                onChange={(e) => setFormData(prev => ({ ...prev, englishName: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="level">조직 레벨 *</Label>
              <Select 
                value={formData.level} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, level: value, parentId: '' }))}
              >
                <SelectTrigger className={errors.level ? 'border-red-500' : ''}>
                  <SelectValue placeholder="조직 레벨을 선택하세요" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {getLevelOptions().map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {option.value}
                        </Badge>
                        {option.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.level && (
                <p className="text-sm text-red-500">{errors.level}</p>
              )}
            </div>

            {formData.level && formData.level !== 'LEVEL_1' && (
              <div className="space-y-2">
                <Label htmlFor="parent">상위 조직 (선택)</Label>
                <Select 
                  value={formData.parentId} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, parentId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="상위 조직을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="">선택 안함</SelectItem>
                    {getParentOptions().map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {org.code}
                          </Badge>
                          {org.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="sortOrder">정렬 순서</Label>
              <Input
                id="sortOrder"
                type="number"
                min="0"
                value={formData.sortOrder}
                onChange={(e) => setFormData(prev => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">설명 (선택)</Label>
              <Textarea
                id="description"
                placeholder="조직에 대한 설명을 입력하세요"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="flex flex-row gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={createOrganization.isLoading}
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={createOrganization.isLoading}
            >
              {createOrganization.isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  생성 중...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  생성
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}