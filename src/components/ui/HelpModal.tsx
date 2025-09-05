'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { HelpCircle } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

interface HelpModalProps {
  title?: string
  markdownContent: string
  triggerIcon?: React.ReactNode
  triggerClassName?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl'
}

export function HelpModal({ 
  title = '사용자 가이드', 
  markdownContent, 
  triggerIcon,
  triggerClassName = '',
  size = 'lg' 
}: HelpModalProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Trigger Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className={`p-2 h-9 w-9 ${triggerClassName}`}
        title="사용자 가이드 보기"
      >
        {triggerIcon || <HelpCircle className="h-4 w-4" />}
      </Button>

      {/* Help Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className={`${sizeClasses[size]} max-h-[90vh] p-0`}>
          <DialogHeader className="px-6 py-4 border-b bg-gray-50">
            <DialogTitle className="text-lg font-semibold">
              {title}
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="px-6 py-4 max-h-[calc(90vh-80px)]">
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown
                components={{
                  h1: ({ children, ...props }: any) => (
                    <h1 className="text-2xl font-bold mb-4 text-gray-900" {...props}>{children}</h1>
                  ),
                  h2: ({ children, ...props }: any) => (
                    <h2 className="text-xl font-semibold mt-6 mb-3 text-gray-800 border-b border-gray-200 pb-2" {...props}>{children}</h2>
                  ),
                  h3: ({ children, ...props }: any) => (
                    <h3 className="text-lg font-medium mt-4 mb-2 text-gray-800" {...props}>{children}</h3>
                  ),
                  h4: ({ children, ...props }: any) => (
                    <h4 className="text-base font-medium mt-3 mb-2 text-gray-700" {...props}>{children}</h4>
                  ),
                  p: ({ children, ...props }: any) => (
                    <p className="mb-3 text-gray-600 leading-relaxed" {...props}>{children}</p>
                  ),
                  ul: ({ children, ...props }: any) => (
                    <ul className="mb-3 pl-4 space-y-1" {...props}>{children}</ul>
                  ),
                  ol: ({ children, ...props }: any) => (
                    <ol className="mb-3 pl-4 space-y-1" {...props}>{children}</ol>
                  ),
                  li: ({ children, ...props }: any) => (
                    <li className="text-gray-600 text-sm leading-relaxed" {...props}>{children}</li>
                  ),
                  strong: ({ children, ...props }: any) => (
                    <strong className="font-semibold text-gray-800" {...props}>{children}</strong>
                  ),
                  em: ({ children, ...props }: any) => (
                    <em className="italic text-gray-700" {...props}>{children}</em>
                  ),
                  code: ({ children, ...props }: any) => (
                    <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono text-gray-800" {...props}>{children}</code>
                  ),
                  pre: ({ children, ...props }: any) => (
                    <pre className="bg-gray-100 p-3 rounded-md overflow-x-auto mb-3 text-sm" {...props}>{children}</pre>
                  ),
                  blockquote: ({ children, ...props }: any) => (
                    <blockquote className="border-l-4 border-blue-200 pl-4 py-2 my-3 bg-blue-50 text-gray-700" {...props}>{children}</blockquote>
                  ),
                  table: ({ children, ...props }: any) => (
                    <div className="overflow-x-auto mb-4">
                      <table className="min-w-full border border-gray-300 text-sm" {...props}>{children}</table>
                    </div>
                  ),
                  thead: ({ children, ...props }: any) => (
                    <thead className="bg-gray-100" {...props}>{children}</thead>
                  ),
                  th: ({ children, ...props }: any) => (
                    <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-800" {...props}>{children}</th>
                  ),
                  td: ({ children, ...props }: any) => (
                    <td className="border border-gray-300 px-3 py-2 text-gray-600" {...props}>{children}</td>
                  ),
                  hr: (props: any) => (
                    <hr className="my-6 border-gray-300" {...props} />
                  ),
                  // Alert box styling for special content
                  div: ({ children, ...props }: any) => {
                    const content = String(children).toLowerCase()
                    if (content.includes('주의사항') || content.includes('⚠️')) {
                      return (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 my-4">
                          <div className="flex items-start">
                            <span className="text-yellow-600 mr-2">⚠️</span>
                            <div className="text-yellow-800">{children}</div>
                          </div>
                        </div>
                      )
                    }
                    if (content.includes('문제 해결') || content.includes('🔧')) {
                      return (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 my-4">
                          <div className="flex items-start">
                            <span className="text-blue-600 mr-2">🔧</span>
                            <div className="text-blue-800">{children}</div>
                          </div>
                        </div>
                      )
                    }
                    return <div {...props}>{children}</div>
                  }
                }}
              >
                {markdownContent}
              </ReactMarkdown>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  )
}