'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

interface ChartContainerProps {
  title: string
  description?: string
  icon?: React.ReactNode
  loading?: boolean
  error?: string | null
  children: React.ReactNode
  actions?: React.ReactNode
  className?: string
}

export default function ChartContainer({
  title,
  description,
  icon,
  loading = false,
  error = null,
  children,
  actions,
  className = '',
}: ChartContainerProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {icon}
              {title}
            </CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {actions && (
            <div className="flex items-center gap-2">
              {actions}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-80 flex items-center justify-center">
            <div className="flex items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-gray-500">차트 데이터를 불러오는 중...</span>
            </div>
          </div>
        ) : error ? (
          <div className="h-80 flex items-center justify-center">
            <div className="text-center">
              <div className="text-red-500 mb-2">데이터 로딩 오류</div>
              <div className="text-sm text-gray-500">{error}</div>
            </div>
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}