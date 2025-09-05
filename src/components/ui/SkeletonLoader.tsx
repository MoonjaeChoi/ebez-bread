'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-muted',
        className
      )}
      {...props}
    />
  )
}

// 구성원 목록 스켈레톤
export function MembershipListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-4 border rounded-lg space-y-3 animate-pulse"
        >
          <div className="flex items-start gap-4">
            {/* 체크박스 스켈레톤 */}
            <Skeleton className="h-4 w-4 mt-1 rounded-sm" />
            
            <div className="flex-1 space-y-3">
              {/* 이름 및 배지 영역 */}
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-12 rounded-full" />
                <Skeleton className="h-5 w-10 rounded-full" />
              </div>
              
              {/* 연락처 정보 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-48" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-36" />
                </div>
              </div>
              
              {/* 메모 영역 (선택적) */}
              {Math.random() > 0.5 && (
                <Skeleton className="h-12 w-full rounded" />
              )}
            </div>
            
            {/* 액션 버튼들 */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded" />
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// 차트 스켈레톤
export function ChartSkeleton({ height = 'h-64' }: { height?: string }) {
  return (
    <div className={cn('w-full rounded-lg animate-pulse', height)}>
      <div className="h-full bg-gradient-to-br from-gray-100 via-gray-200 to-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-gray-400 text-sm">차트를 불러오는 중...</div>
      </div>
    </div>
  )
}

// 카드 목록 스켈레톤
export function CardListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-6 border rounded-lg animate-pulse space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
          <Skeleton className="h-20 w-full rounded" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-16 rounded" />
            <Skeleton className="h-8 w-20 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

// 테이블 스켈레톤
export function TableSkeleton({ 
  rows = 5, 
  columns = 4 
}: { 
  rows?: number
  columns?: number 
}) {
  return (
    <div className="w-full">
      {/* 헤더 */}
      <div className="flex gap-4 p-4 border-b bg-gray-50">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      
      {/* 행들 */}
      <div className="divide-y">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex gap-4 p-4">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton 
                key={colIndex} 
                className={cn(
                  'h-4 flex-1',
                  colIndex === 0 && 'w-8', // 첫 번째 열은 체크박스
                  colIndex === columns - 1 && 'w-16' // 마지막 열은 액션 버튼
                )}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// 폼 스켈레톤
export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="space-y-6">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full rounded" />
        </div>
      ))}
      
      <div className="flex gap-3 pt-4">
        <Skeleton className="h-10 w-20 rounded" />
        <Skeleton className="h-10 w-16 rounded" />
      </div>
    </div>
  )
}

// 통계 카드 스켈레톤
export function StatCardSkeleton() {
  return (
    <div className="p-6 border rounded-lg animate-pulse space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-6 w-6 rounded" />
      </div>
      <Skeleton className="h-8 w-16" />
      <div className="flex items-center gap-1">
        <Skeleton className="h-3 w-3" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  )
}

// 대시보드 스켈레톤
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* 통계 카드들 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      
      {/* 차트들 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 border rounded-lg">
          <Skeleton className="h-6 w-40 mb-4" />
          <ChartSkeleton height="h-80" />
        </div>
        <div className="p-6 border rounded-lg">
          <Skeleton className="h-6 w-32 mb-4" />
          <ChartSkeleton height="h-80" />
        </div>
      </div>
      
      {/* 목록 */}
      <div className="p-6 border rounded-lg">
        <Skeleton className="h-6 w-36 mb-4" />
        <MembershipListSkeleton count={3} />
      </div>
    </div>
  )
}