'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Building2, Plus, AlertTriangle, Loader2, X } from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { OrganizationLevel } from '@prisma/client'

interface DebugModalProps {
  children: React.ReactNode
  onSuccess?: () => void
}

export function DebugModal({ children, onSuccess }: DebugModalProps) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    level: '' as string,
    description: ''
  })
  const [error, setError] = useState('')

  useEffect(() => {
    setMounted(true)
    console.log('DebugModal mounted')
  }, [])

  useEffect(() => {
    if (open && mounted) {
      console.log('=== MODAL OPEN DEBUG INFO ===')
      console.log('Modal state:', { open, mounted })
      
      // DOM 체크
      const modalElement = modalRef.current
      if (modalElement) {
        const rect = modalElement.getBoundingClientRect()
        const styles = window.getComputedStyle(modalElement)
        
        console.log('Modal DOM element found:', modalElement)
        console.log('Position coordinates:', {
          top: rect.top,
          left: rect.left,
          bottom: rect.bottom,
          right: rect.right,
          width: rect.width,
          height: rect.height
        })
        console.log('Computed styles:', {
          display: styles.display,
          visibility: styles.visibility,
          opacity: styles.opacity,
          zIndex: styles.zIndex,
          position: styles.position,
          transform: styles.transform
        })
        console.log('Modal HTML:', modalElement.outerHTML.substring(0, 200) + '...')
      } else {
        console.log('Modal DOM element NOT found')
      }

      // 전체 body에서 모달 관련 요소 찾기
      const allModals = document.querySelectorAll('[role="dialog"], [data-state="open"]')
      console.log('All modal elements found in DOM:', allModals.length)
      allModals.forEach((modal, index) => {
        const rect = modal.getBoundingClientRect()
        const styles = window.getComputedStyle(modal)
        console.log(`Modal ${index}:`, {
          element: modal,
          coordinates: { top: rect.top, left: rect.left, bottom: rect.bottom, right: rect.right },
          styles: { display: styles.display, visibility: styles.visibility, opacity: styles.opacity, zIndex: styles.zIndex }
        })
      })

      // 화면 정보
      console.log('Viewport info:', {
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        documentWidth: document.documentElement.scrollWidth,
        documentHeight: document.documentElement.scrollHeight,
        scrollTop: window.scrollY,
        scrollLeft: window.scrollX
      })

      // body 클래스 확인
      console.log('Document classes:', {
        htmlClass: document.documentElement.className,
        bodyClass: document.body.className,
        hasLoadedClass: document.documentElement.classList.contains('loaded')
      })
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
    console.log('DebugModal handleOpen called')
    setOpen(true)
  }

  const handleClose = () => {
    console.log('DebugModal handleClose called')
    setOpen(false)
    resetForm()
  }

  if (!mounted) {
    console.log('DebugModal not mounted yet')
    return null
  }

  // 방법 1: 절대 위치 고정 모달 (매우 높은 z-index)
  const absoluteModal = open ? (
    <div 
      ref={modalRef}
      className="debug-modal-overlay"
      style={{
        position: 'fixed',
        top: '0px',
        left: '0px',
        width: '100vw',
        height: '100vh',
        zIndex: 99999,
        backgroundColor: 'rgba(255, 0, 0, 0.8)', // 빨간색으로 확실히 보이게
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
          border: '5px solid red',
          borderRadius: '10px',
          padding: '20px',
          maxWidth: '500px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          cursor: 'default'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ 
          margin: '0 0 20px 0', 
          color: 'red', 
          fontSize: '24px', 
          fontWeight: 'bold',
          textAlign: 'center'
        }}>
          🔥 DEBUG MODAL - 이것이 보이면 성공! 🔥
        </h2>
        
        <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '5px' }}>
          <strong>Modal이 보입니다!</strong><br />
          이 방법으로 실제 조직 생성 폼을 만들 수 있습니다.
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div>
            <Label htmlFor="debug-code" style={{ display: 'block', marginBottom: '5px' }}>조직코드 *</Label>
            <Input
              id="debug-code"
              placeholder="예: DISTRICT"
              value={formData.code}
              onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
              disabled={createOrganization.isPending}
            />
          </div>

          <div>
            <Label htmlFor="debug-name" style={{ display: 'block', marginBottom: '5px' }}>조직명 *</Label>
            <Input
              id="debug-name"
              placeholder="예: 교구"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              disabled={createOrganization.isPending}
            />
          </div>

          <div>
            <Label htmlFor="debug-level" style={{ display: 'block', marginBottom: '5px' }}>조직 레벨 *</Label>
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

          <div>
            <Label htmlFor="debug-desc" style={{ display: 'block', marginBottom: '5px' }}>설명 (선택)</Label>
            <Input
              id="debug-desc"
              placeholder="조직에 대한 설명"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              disabled={createOrganization.isPending}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
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
      
      {absoluteModal}
    </>
  )
}