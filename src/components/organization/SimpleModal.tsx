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

interface SimpleModalProps {
  children: React.ReactNode
  onSuccess?: () => void
}

export function SimpleModal({ children, onSuccess }: SimpleModalProps) {
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

  const createOrganization = trpc.organizations.create.useMutation({
    onSuccess: (data) => {
      console.log('조직 생성 성공:', data)
      resetForm()
      setOpen(false)
      onSuccess?.()
    },
    onError: (error) => {
      console.error('조직 생성 실패:', error)
      setError(error.message)
    }
  })

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      level: '',
      description: ''
    })
    setError('')
  }

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
    createOrganization.mutate({
      code: formData.code.trim(),
      name: formData.name.trim(),
      level: formData.level as OrganizationLevel,
      description: formData.description.trim() || undefined,
      sortOrder: 0
    })
  }

  const handleOpen = () => {
    console.log('Opening SimpleModal')
    setOpen(true)
  }

  const handleClose = () => {
    console.log('Closing SimpleModal')
    setOpen(false)
    resetForm()
  }

  if (!mounted) return null

  const modalContent = (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 10001,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
      onClick={handleClose}
    >
      <div 
        style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          maxWidth: '28rem',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          border: '2px solid #e5e7eb'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          padding: '1.5rem', 
          borderBottom: '1px solid #e5e7eb' 
        }}>
          <div>
            <h2 style={{ 
              fontSize: '1.125rem', 
              fontWeight: '600', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              margin: 0
            }}>
              <Building2 style={{ height: '1.25rem', width: '1.25rem' }} />
              새 조직 생성 (Simple Modal Test)
            </h2>
            <p style={{ 
              fontSize: '0.875rem', 
              color: '#6b7280', 
              marginTop: '0.25rem',
              margin: '0.25rem 0 0 0'
            }}>
              새로운 교회 조직을 생성합니다
            </p>
          </div>
          <button
            onClick={handleClose}
            style={{
              color: '#9ca3af',
              padding: '0.5rem',
              border: 'none',
              background: 'none',
              cursor: 'pointer'
            }}
          >
            <X style={{ height: '1rem', width: '1rem' }} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <Label htmlFor="code">조직코드 *</Label>
              <Input
                id="code"
                placeholder="예: DISTRICT"
                value={formData.code}
                onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                disabled={createOrganization.isPending}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <Label htmlFor="name">조직명 *</Label>
              <Input
                id="name"
                placeholder="예: 교구"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                disabled={createOrganization.isPending}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
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
          <div style={{ 
            display: 'flex', 
            justifyContent: 'flex-end', 
            gap: '0.5rem', 
            marginTop: '1.5rem', 
            paddingTop: '1rem', 
            borderTop: '1px solid #e5e7eb' 
          }}>
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
    </div>
  )

  return (
    <>
      <div onClick={handleOpen} style={{ cursor: 'pointer' }}>
        {children}
      </div>
      
      {open && mounted && createPortal(modalContent, document.body)}
    </>
  )
}