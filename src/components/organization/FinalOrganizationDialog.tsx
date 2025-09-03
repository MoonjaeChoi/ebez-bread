'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Building2, Plus, AlertTriangle, Loader2, X } from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { OrganizationLevel } from '@prisma/client'

interface FinalOrganizationDialogProps {
  children: React.ReactNode
  onSuccess?: () => void
}

export function FinalOrganizationDialog({ children, onSuccess }: FinalOrganizationDialogProps) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    level: '' as string,
    description: ''
  })
  const [error, setError] = useState('')

  useEffect(() => {
    setMounted(true)
  }, [])

  // 조직 생성 mutation
  const createOrganization = trpc.organizations.create.useMutation({
    onSuccess: (data) => {
      console.log('조직 생성 성공:', data)
      setFormData({
        code: '',
        name: '',
        level: '',
        description: ''
      })
      setError('')
      setOpen(false)
      onSuccess?.()
    },
    onError: (error) => {
      console.error('조직 생성 실패:', error)
      setError(error.message)
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.code.trim()) {
      setError('조직코드를 입력해주세요')
      return
    }
    
    if (!formData.name.trim()) {
      setError('조직명을 입력해주세요')
      return
    }
    
    if (!formData.level) {
      setError('조직 레벨을 선택해주세요')
      return
    }

    setError('')

    // 조직 생성 실행
    createOrganization.mutate({
      code: formData.code.trim(),
      name: formData.name.trim(),
      level: formData.level as OrganizationLevel,
      description: formData.description.trim() || undefined,
      sortOrder: 0
    })
  }

  const handleTriggerClick = () => {
    console.log('Trigger clicked, opening dialog')
    setOpen(true)
  }

  const handleClose = () => {
    console.log('Closing dialog')
    setOpen(false)
    setError('')
    setFormData({
      code: '',
      name: '',
      level: '',
      description: ''
    })
  }

  if (!mounted) return null

  return (
    <>
      <div onClick={handleTriggerClick}>
        {children}
      </div>
      
      {open && createPortal(
        <div className="fixed inset-0 z-[10000] bg-black/50 flex items-center justify-center p-4"
             style={{
               position: 'fixed',
               top: 0,
               left: 0,
               right: 0,
               bottom: 0,
               zIndex: 10000,
               backgroundColor: 'rgba(0, 0, 0, 0.5)',
               display: 'flex',
               alignItems: 'center',
               justifyContent: 'center',
               padding: '1rem'
             }}
             onClick={handleClose}>
          <div 
            className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  새 조직 생성
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  새로운 교회 조직을 생성합니다
                </p>
              </div>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 p-2"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="code">조직코드 *</Label>
                  <Input
                    id="code"
                    placeholder="예: DISTRICT"
                    value={formData.code}
                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                    disabled={createOrganization.isPending}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">조직명 *</Label>
                  <Input
                    id="name"
                    placeholder="예: 교구"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    disabled={createOrganization.isPending}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="level">조직 레벨 *</Label>
                  <Select 
                    value={formData.level} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, level: value }))}
                    disabled={createOrganization.isPending}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="조직 레벨을 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LEVEL_1">LEVEL_1 - 본부/교구</SelectItem>
                      <SelectItem value="LEVEL_2">LEVEL_2 - 부서/팀</SelectItem>
                      <SelectItem value="LEVEL_3">LEVEL_3 - 소그룹/모임</SelectItem>
                      <SelectItem value="LEVEL_4">LEVEL_4 - 세부조직</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">설명 (선택)</Label>
                  <Input
                    id="description"
                    placeholder="조직에 대한 설명"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    disabled={createOrganization.isPending}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={createOrganization.isPending}
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  disabled={createOrganization.isPending}
                >
                  {createOrganization.isPending ? (
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
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}