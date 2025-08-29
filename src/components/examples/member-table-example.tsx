"use client"

import * as React from "react"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

// Example member data type
type MemberStatus = "active" | "inactive" | "pending"
type MemberRole = "member" | "leader" | "admin"

interface Member {
  id: string
  name: string
  email: string
  role: MemberRole
  status: MemberStatus
  joinDate: string
  department?: string
}

// Example member data
const sampleMembers: Member[] = [
  {
    id: "1",
    name: "김철수",
    email: "chulsu.kim@example.com",
    role: "leader",
    status: "active",
    joinDate: "2023-01-15",
    department: "청년부"
  },
  {
    id: "2",
    name: "이영희",
    email: "younghee.lee@example.com",
    role: "member",
    status: "active",
    joinDate: "2023-03-20",
    department: "찬양팀"
  },
  {
    id: "3",
    name: "박민수",
    email: "minsu.park@example.com",
    role: "admin",
    status: "active",
    joinDate: "2022-11-10",
    department: "관리"
  },
  {
    id: "4",
    name: "최수진",
    email: "sujin.choi@example.com",
    role: "member",
    status: "pending",
    joinDate: "2024-01-05",
    department: "새신자부"
  }
]

const getStatusBadgeVariant = (status: MemberStatus) => {
  switch (status) {
    case "active":
      return "default"
    case "inactive":
      return "secondary"
    case "pending":
      return "outline"
    default:
      return "secondary"
  }
}

const getRoleBadgeVariant = (role: MemberRole) => {
  switch (role) {
    case "admin":
      return "destructive"
    case "leader":
      return "default"
    case "member":
      return "secondary"
    default:
      return "secondary"
  }
}

export function MemberTableExample() {
  const [statusFilter, setStatusFilter] = React.useState<string>("all")
  const [roleFilter, setRoleFilter] = React.useState<string>("all")

  const filteredMembers = sampleMembers.filter((member) => {
    const statusMatch = statusFilter === "all" || member.status === statusFilter
    const roleMatch = roleFilter === "all" || member.role === roleFilter
    return statusMatch && roleMatch
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>교회 구성원 관리</CardTitle>
        <CardDescription>
          교회 구성원들의 정보를 확인하고 관리할 수 있습니다.
        </CardDescription>
        
        {/* Filter Controls */}
        <div className="flex gap-4 mt-4">
          <div className="flex flex-col space-y-1.5">
            <label htmlFor="status-filter" className="text-sm font-medium">
              상태별 필터
            </label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger id="status-filter" className="w-[180px]">
                <SelectValue placeholder="상태 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="active">활성</SelectItem>
                <SelectItem value="inactive">비활성</SelectItem>
                <SelectItem value="pending">대기중</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex flex-col space-y-1.5">
            <label htmlFor="role-filter" className="text-sm font-medium">
              역할별 필터
            </label>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger id="role-filter" className="w-[180px]">
                <SelectValue placeholder="역할 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="admin">관리자</SelectItem>
                <SelectItem value="leader">리더</SelectItem>
                <SelectItem value="member">멤버</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <Table>
          <TableCaption>총 {filteredMembers.length}명의 구성원이 있습니다.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>이름</TableHead>
              <TableHead>이메일</TableHead>
              <TableHead>역할</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>소속부서</TableHead>
              <TableHead className="text-right">가입일</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMembers.map((member) => (
              <TableRow key={member.id}>
                <TableCell className="font-medium">{member.name}</TableCell>
                <TableCell>{member.email}</TableCell>
                <TableCell>
                  <Badge variant={getRoleBadgeVariant(member.role)}>
                    {member.role === "admin" && "관리자"}
                    {member.role === "leader" && "리더"}
                    {member.role === "member" && "멤버"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusBadgeVariant(member.status)}>
                    {member.status === "active" && "활성"}
                    {member.status === "inactive" && "비활성"}
                    {member.status === "pending" && "대기중"}
                  </Badge>
                </TableCell>
                <TableCell>{member.department || "-"}</TableCell>
                <TableCell className="text-right">{member.joinDate}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}