'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileUp, Download } from 'lucide-react'
import { ImportDialog } from './ImportDialog'
import { ExportDialog } from './ExportDialog'
import { DataType } from '@/lib/data-import-export/types'

interface DataTypeCardProps {
  type: DataType
  title: string
  description: string
  icon: React.ComponentType<any>
  color: string
  bgColor: string
  borderColor: string
  recordCount?: number
  onImportComplete?: (result: any) => void
}

export function DataTypeCard({
  type,
  title,
  description,
  icon: Icon,
  color,
  bgColor,
  borderColor,
  recordCount,
  onImportComplete
}: DataTypeCardProps) {
  return (
    <Card className={`${bgColor} ${borderColor} border-2 hover:shadow-md transition-shadow`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon className={`h-6 w-6 ${color}`} />
            <span className="text-lg">{title}</span>
          </div>
          {recordCount !== undefined && (
            <Badge variant="secondary" className="text-xs">
              {recordCount.toLocaleString()}건
            </Badge>
          )}
        </CardTitle>
        <CardDescription className="text-sm">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex gap-2">
          <ImportDialog onImportComplete={onImportComplete}>
            <Button size="sm" variant="outline" className="flex-1">
              <FileUp className="h-4 w-4 mr-1" />
              가져오기
            </Button>
          </ImportDialog>
          
          <ExportDialog defaultDataType={type}>
            <Button size="sm" variant="outline" className="flex-1">
              <Download className="h-4 w-4 mr-1" />
              내보내기
            </Button>
          </ExportDialog>
        </div>
      </CardContent>
    </Card>
  )
}