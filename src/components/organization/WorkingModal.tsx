'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Building2, Plus, AlertTriangle, Loader2, X } from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { OrganizationLevel } from '@prisma/client'

interface WorkingModalProps {
  children: React.ReactNode
  onSuccess?: () => void
}

export function WorkingModal({ children, onSuccess }: WorkingModalProps) {
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
    console.log('WorkingModal: component mounted')
  }, [])

  useEffect(() => {
    console.log('WorkingModal: state changed', { open, mounted })
    if (open && mounted) {
      console.log('WorkingModal: should render modal now')
    }
  }, [open, mounted])

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
    console.log('WorkingModal: handleOpen called')
    console.log('WorkingModal: current state before open:', { open, mounted })
    setOpen(true)
    console.log('WorkingModal: setOpen(true) called')
  }

  const handleClose = () => {
    console.log('WorkingModal: handleClose called')
    setOpen(false)
    resetForm()
  }

  if (!mounted) return null

  const modalContent = open ? (
    <div 
      className="working-modal-overlay"
      style={{
        position: 'fixed',
        top: '0px',
        left: '0px',
        width: '100vw',
        height: '100vh',
        zIndex: 99999,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        cursor: 'pointer'
      }}
      onClick={handleClose}
    >
      <div 
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          maxWidth: '448px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          cursor: 'default'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          padding: '24px', 
          borderBottom: '1px solid #e5e7eb' 
        }}>
          <div>
            <h2 style={{ 
              fontSize: '18px', 
              fontWeight: '600', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              margin: 0,
              color: '#374151'
            }}>
              <Building2 style={{ height: '20px', width: '20px' }} />
              새 조직 생성
            </h2>
            <p style={{ 
              fontSize: '14px', 
              color: '#6b7280', 
              marginTop: '4px',
              margin: '4px 0 0 0'
            }}>
              새로운 교회 조직을 생성합니다
            </p>
          </div>
          <button
            onClick={handleClose}
            style={{
              color: '#9ca3af',
              padding: '8px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.color = '#6b7280'
              e.currentTarget.style.backgroundColor = '#f3f4f6'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.color = '#9ca3af'
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            <X style={{ height: '16px', width: '16px' }} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Label htmlFor="working-code">조직코드 *</Label>
              <Input
                id="working-code"
                placeholder="예: DISTRICT"
                value={formData.code}
                onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                disabled={createOrganization.isPending}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Label htmlFor="working-name">조직명 *</Label>
              <Input
                id="working-name"
                placeholder="예: 교구"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                disabled={createOrganization.isPending}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Label htmlFor="working-level">조직 레벨 *</Label>
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Label htmlFor="working-description">설명 (선택)</Label>
              <Input
                id="working-description"
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
            gap: '8px', 
            marginTop: '24px', 
            paddingTop: '16px', 
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
  ) : null

  return (
    <>
      <div onClick={handleOpen} style={{ cursor: 'pointer', display: 'inline-block' }}>
        {children}
      </div>
      
      {modalContent}
    </>
  )
}