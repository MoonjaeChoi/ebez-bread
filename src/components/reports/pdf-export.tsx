'use client'

import { useRef } from 'react'
import { useReactToPrint } from 'react-to-print'
import { Button } from '@/components/ui/button'
import { FileDown, Printer } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

interface ReportData {
  churchName: string
  reportType: string
  period: string
  generatedAt: Date
  stats?: {
    totalMembers: number
    totalOfferings: number
    avgAttendance: number
  }
  offeringData?: Array<{
    type: string
    amount: number
    count: number
    name: string
  }>
  attendanceData?: Array<{
    name: string
    total: number
  }>
  memberStats?: {
    gender: Array<{ name: string; value: number }>
    position: Array<{ name: string; value: number }>
    age: Array<{ name: string; value: number }>
  }
}

interface PDFExportProps {
  data: ReportData
  children: React.ReactNode
}

export function PDFExport({ data, children }: PDFExportProps) {
  const componentRef = useRef<HTMLDivElement>(null)

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `${data.churchName}_${data.reportType}_${data.period}`,
    pageStyle: `
      @page {
        size: A4;
        margin: 20mm;
      }
      @media print {
        body { -webkit-print-color-adjust: exact; }
        .no-print { display: none !important; }
        .print-break { page-break-after: always; }
      }
    `
  })

  return (
    <div>
      <div className="flex gap-2 mb-4 no-print">
        <Button onClick={handlePrint} variant="outline">
          <Printer className="mr-2 h-4 w-4" />
          인쇄하기
        </Button>
        <Button onClick={handlePrint} variant="outline">
          <FileDown className="mr-2 h-4 w-4" />
          PDF 다운로드
        </Button>
      </div>

      <div ref={componentRef} className="bg-white">
        {/* PDF 헤더 */}
        <div className="border-b-2 border-gray-300 pb-4 mb-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {data.churchName}
            </h1>
            <h2 className="text-lg font-semibold text-gray-700 mb-1">
              {data.reportType}
            </h2>
            <p className="text-gray-600">
              기간: {data.period}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              생성일: {format(data.generatedAt, 'yyyy년 MM월 dd일 HH:mm', { locale: ko })}
            </p>
          </div>
        </div>

        {/* 요약 통계 (PDF 전용) */}
        {data.stats && (
          <div className="mb-8 print-break">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">📊 요약 통계</h3>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 border rounded">
                <div className="text-2xl font-bold text-blue-600">{data.stats.totalMembers}</div>
                <div className="text-sm text-gray-600">총 교인수</div>
              </div>
              <div className="text-center p-4 border rounded">
                <div className="text-2xl font-bold text-green-600">{formatCurrency(data.stats.totalOfferings)}</div>
                <div className="text-sm text-gray-600">총 헌금</div>
              </div>
              <div className="text-center p-4 border rounded">
                <div className="text-2xl font-bold text-orange-600">{data.stats.avgAttendance}</div>
                <div className="text-sm text-gray-600">평균 출석수</div>
              </div>
            </div>
          </div>
        )}

        {/* 헌금 데이터 테이블 */}
        {data.offeringData && data.offeringData.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">💰 헌금 현황</h3>
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-4 py-2 text-left">헌금 종류</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">건수</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">금액</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">비율</th>
                </tr>
              </thead>
              <tbody>
                {data.offeringData.map((item, index) => {
                  const total = data.offeringData!.reduce((sum, d) => sum + d.amount, 0)
                  const percentage = total > 0 ? ((item.amount / total) * 100).toFixed(1) : 0
                  return (
                    <tr key={index}>
                      <td className="border border-gray-300 px-4 py-2">{item.name}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{item.count}건</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(item.amount)}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{percentage}%</td>
                    </tr>
                  )
                })}
                <tr className="bg-gray-50 font-semibold">
                  <td className="border border-gray-300 px-4 py-2">총계</td>
                  <td className="border border-gray-300 px-4 py-2 text-right">
                    {data.offeringData.reduce((sum, d) => sum + d.count, 0)}건
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-right">
                    {formatCurrency(data.offeringData.reduce((sum, d) => sum + d.amount, 0))}
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-right">100.0%</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* 출석 데이터 테이블 */}
        {data.attendanceData && data.attendanceData.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">📅 출석 현황</h3>
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-4 py-2 text-left">기간</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">출석수</th>
                </tr>
              </thead>
              <tbody>
                {data.attendanceData.map((item, index) => (
                  <tr key={index}>
                    <td className="border border-gray-300 px-4 py-2">{item.name}</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">{item.total}명</td>
                  </tr>
                ))}
                <tr className="bg-gray-50 font-semibold">
                  <td className="border border-gray-300 px-4 py-2">평균</td>
                  <td className="border border-gray-300 px-4 py-2 text-right">
                    {Math.round(data.attendanceData.reduce((sum, d) => sum + d.total, 0) / data.attendanceData.length)}명
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* 교인 통계 */}
        {data.memberStats && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">👥 교인 통계</h3>
            
            <div className="grid grid-cols-3 gap-6">
              {/* 성별 통계 */}
              <div>
                <h4 className="font-medium mb-2 text-gray-700">성별 분포</h4>
                <table className="w-full border border-gray-300 text-sm">
                  <tbody>
                    {data.memberStats.gender.filter(g => g.name !== '미분류').map((item) => (
                      <tr key={item.name}>
                        <td className="border border-gray-300 px-2 py-1">
                          {item.name === 'MALE' ? '남성' : item.name === 'FEMALE' ? '여성' : item.name}
                        </td>
                        <td className="border border-gray-300 px-2 py-1 text-right">{item.value}명</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 연령대 통계 */}
              <div>
                <h4 className="font-medium mb-2 text-gray-700">연령대 분포</h4>
                <table className="w-full border border-gray-300 text-sm">
                  <tbody>
                    {data.memberStats.age.filter(a => a.value > 0 && a.name !== '미분류').slice(0, 5).map((item) => (
                      <tr key={item.name}>
                        <td className="border border-gray-300 px-2 py-1">{item.name}</td>
                        <td className="border border-gray-300 px-2 py-1 text-right">{item.value}명</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 직분 통계 */}
              <div>
                <h4 className="font-medium mb-2 text-gray-700">주요 직분</h4>
                <table className="w-full border border-gray-300 text-sm">
                  <tbody>
                    {data.memberStats.position.filter(p => p.value > 0).slice(0, 5).map((item) => (
                      <tr key={item.name}>
                        <td className="border border-gray-300 px-2 py-1">{item.name}</td>
                        <td className="border border-gray-300 px-2 py-1 text-right">{item.value}명</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 차트 및 기타 내용 */}
        <div className="mb-8">
          {children}
        </div>

        {/* PDF 푸터 */}
        <div className="border-t-2 border-gray-300 pt-4 mt-8 text-center text-sm text-gray-500">
          <p>
            본 보고서는 {data.churchName} 교회 관리 시스템에서 자동으로 생성되었습니다.
          </p>
          <p className="mt-1">
            Ebenezer Church Management System © 2024
          </p>
        </div>
      </div>
    </div>
  )
}