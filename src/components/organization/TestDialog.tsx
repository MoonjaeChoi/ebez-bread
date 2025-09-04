'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Building2 } from 'lucide-react'

interface TestDialogProps {
  children: React.ReactNode
}

export function TestDialog({ children }: TestDialogProps) {
  const [open, setOpen] = useState(false)

  console.log('TestDialog render, open:', open)

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      console.log('Dialog onOpenChange:', isOpen)
      setOpen(isOpen)
    }}>
      <DialogTrigger asChild onClick={() => {
        console.log('DialogTrigger clicked')
        setOpen(true)
      }}>
        {children}
      </DialogTrigger>
      <DialogContent 
        className="sm:max-w-md z-[71] bg-white border-2 border-red-500" 
        style={{ 
          position: 'fixed' as const,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 71,
          backgroundColor: 'white',
          display: 'block',
          visibility: 'visible' as const,
          opacity: 1
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            테스트 다이얼로그
          </DialogTitle>
          <DialogDescription>
            다이얼로그가 정상적으로 표시되는지 테스트합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="p-4">
          <p>이 다이얼로그가 보인다면 UI는 정상적으로 작동하고 있습니다.</p>
          
          <div className="mt-4 flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                console.log('Close button clicked')
                setOpen(false)
              }}
            >
              닫기
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}