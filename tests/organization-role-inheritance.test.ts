import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { organizationRoleAssignmentsRouter } from '@/server/routers/organization-role-assignments'
import { createTRPCMsw } from 'msw-trpc'
import { setupServer } from 'msw/node'

const prisma = new PrismaClient()
const server = setupServer()

describe('Organization Role Inheritance', () => {
  let churchId: string
  let rootOrgId: string
  let childOrgId: string
  let grandChildOrgId: string
  let roleId: string
  let userId: string

  beforeEach(async () => {
    // 테스트 데이터 설정
    const church = await prisma.church.create({
      data: {
        name: '테스트교회',
        address: '서울시 강남구',
      },
    })
    churchId = church.id

    const user = await prisma.user.create({
      data: {
        name: '테스트 관리자',
        email: 'admin@test.com',
        churchId,
        role: 'SUPER_ADMIN',
      },
    })
    userId = user.id

    // 계층적 조직 구조 생성
    const rootOrg = await prisma.organization.create({
      data: {
        name: '본부',
        code: 'ROOT',
        level: 'CHURCH',
        churchId,
        createdById: userId,
      },
    })
    rootOrgId = rootOrg.id

    const childOrg = await prisma.organization.create({
      data: {
        name: '교육부',
        code: 'EDU',
        level: 'DEPARTMENT',
        parentId: rootOrgId,
        churchId,
        createdById: userId,
      },
    })
    childOrgId = childOrg.id

    const grandChildOrg = await prisma.organization.create({
      data: {
        name: '주일학교',
        code: 'SUNDAY',
        level: 'TEAM',
        parentId: childOrgId,
        churchId,
        createdById: userId,
      },
    })
    grandChildOrgId = grandChildOrg.id

    // 테스트용 직책 생성
    const role = await prisma.organizationRole.create({
      data: {
        name: '부장',
        level: 80,
        isLeadership: true,
        churchId,
      },
    })
    roleId = role.id
  })

  afterEach(async () => {
    // 테스트 데이터 정리
    await prisma.organizationRoleAssignment.deleteMany({
      where: { organization: { churchId } },
    })
    await prisma.organization.deleteMany({
      where: { churchId },
    })
    await prisma.organizationRole.deleteMany({
      where: { churchId },
    })
    await prisma.user.deleteMany({
      where: { churchId },
    })
    await prisma.church.delete({
      where: { id: churchId },
    })
  })

  it('상위 조직에 직책을 할당하면 하위 조직들에 자동으로 상속된다', async () => {
    // 상위 조직(본부)에 직책 할당
    const ctx = {
      prisma,
      session: { user: { id: userId, churchId } },
    }

    const caller = organizationRoleAssignmentsRouter.createCaller(ctx)
    
    await caller.bulkAssign({
      organizationId: rootOrgId,
      roleIds: [roleId],
      replaceExisting: false,
      autoInheritToChildren: true,
    })

    // 하위 조직들의 상속 확인
    const childAssignments = await prisma.organizationRoleAssignment.findMany({
      where: {
        organizationId: childOrgId,
        roleId,
        isInherited: true,
        inheritedFrom: rootOrgId,
      },
    })

    const grandChildAssignments = await prisma.organizationRoleAssignment.findMany({
      where: {
        organizationId: grandChildOrgId,
        roleId,
        isInherited: true,
        inheritedFrom: rootOrgId,
      },
    })

    expect(childAssignments).toHaveLength(1)
    expect(grandChildAssignments).toHaveLength(1)
    expect(childAssignments[0].isActive).toBe(true)
    expect(grandChildAssignments[0].isActive).toBe(true)
  })

  it('하위 조직에 직접 할당된 직책이 있으면 상속되지 않는다', async () => {
    const ctx = {
      prisma,
      session: { user: { id: userId, churchId } },
    }

    const caller = organizationRoleAssignmentsRouter.createCaller(ctx)

    // 하위 조직에 직접 할당
    await caller.assign({
      organizationId: childOrgId,
      roleId,
      isInherited: false,
    })

    // 상위 조직에 할당 (자동 상속 포함)
    await caller.bulkAssign({
      organizationId: rootOrgId,
      roleIds: [roleId],
      replaceExisting: false,
      autoInheritToChildren: true,
    })

    // 하위 조직의 할당 확인 - 직접 할당이 유지되어야 함
    const childAssignments = await prisma.organizationRoleAssignment.findMany({
      where: {
        organizationId: childOrgId,
        roleId,
      },
    })

    expect(childAssignments).toHaveLength(1)
    expect(childAssignments[0].isInherited).toBe(false) // 직접 할당
    expect(childAssignments[0].inheritedFrom).toBeNull()
  })

  it('상위 조직의 직책을 해제하면 상속된 직책들도 제거된다', async () => {
    const ctx = {
      prisma,
      session: { user: { id: userId, churchId } },
    }

    const caller = organizationRoleAssignmentsRouter.createCaller(ctx)

    // 상위 조직에 할당
    await caller.bulkAssign({
      organizationId: rootOrgId,
      roleIds: [roleId],
      replaceExisting: false,
      autoInheritToChildren: true,
    })

    // 상위 조직의 직책 해제 (상속도 함께 제거)
    await caller.unassign({
      organizationId: rootOrgId,
      roleId,
      removeInherited: true,
    })

    // 하위 조직들의 상속이 제거되었는지 확인
    const childAssignments = await prisma.organizationRoleAssignment.findMany({
      where: {
        organizationId: childOrgId,
        roleId,
        isActive: true,
      },
    })

    const grandChildAssignments = await prisma.organizationRoleAssignment.findMany({
      where: {
        organizationId: grandChildOrgId,
        roleId,
        isActive: true,
      },
    })

    expect(childAssignments).toHaveLength(0)
    expect(grandChildAssignments).toHaveLength(0)
  })

  it('조직의 사용 가능한 직책 조회 시 상속된 직책들이 포함된다', async () => {
    const ctx = {
      prisma,
      session: { user: { id: userId, churchId } },
    }

    const caller = organizationRoleAssignmentsRouter.createCaller(ctx)

    // 상위 조직에 할당
    await caller.bulkAssign({
      organizationId: rootOrgId,
      roleIds: [roleId],
      replaceExisting: false,
      autoInheritToChildren: true,
    })

    // 하위 조직의 사용 가능한 직책 조회
    const availableRoles = await caller.getAvailableRoles({
      organizationId: childOrgId,
    })

    expect(availableRoles).toHaveLength(1)
    expect(availableRoles[0].id).toBe(roleId)
    expect(availableRoles[0].isInherited).toBe(true)
    expect(availableRoles[0].assignedAt).toBe(rootOrgId)
  })

  it('중간 레벨에서 직책을 추가하면 하위 조직들에만 상속된다', async () => {
    // 중간 조직에 추가 직책 생성
    const middleRole = await prisma.organizationRole.create({
      data: {
        name: '차장',
        level: 75,
        isLeadership: true,
        churchId,
      },
    })

    const ctx = {
      prisma,
      session: { user: { id: userId, churchId } },
    }

    const caller = organizationRoleAssignmentsRouter.createCaller(ctx)

    // 중간 조직(교육부)에 직책 할당
    await caller.bulkAssign({
      organizationId: childOrgId,
      roleIds: [middleRole.id],
      replaceExisting: false,
      autoInheritToChildren: true,
    })

    // 최하위 조직에 상속되었는지 확인
    const grandChildAssignments = await prisma.organizationRoleAssignment.findMany({
      where: {
        organizationId: grandChildOrgId,
        roleId: middleRole.id,
        isInherited: true,
        inheritedFrom: childOrgId,
      },
    })

    // 상위 조직(본부)에는 상속되지 않았는지 확인
    const rootAssignments = await prisma.organizationRoleAssignment.findMany({
      where: {
        organizationId: rootOrgId,
        roleId: middleRole.id,
      },
    })

    expect(grandChildAssignments).toHaveLength(1)
    expect(rootAssignments).toHaveLength(0)
  })

  it('직책 할당 통계가 정확히 계산된다', async () => {
    const ctx = {
      prisma,
      session: { user: { id: userId, churchId } },
    }

    const caller = organizationRoleAssignmentsRouter.createCaller(ctx)

    // 상위 조직에 직접 할당
    await caller.bulkAssign({
      organizationId: rootOrgId,
      roleIds: [roleId],
      replaceExisting: false,
      autoInheritToChildren: true,
    })

    // 하위 조직의 통계 조회
    const stats = await caller.getStats({
      organizationId: childOrgId,
    })

    expect(stats.directAssignments).toBe(0) // 직접 할당된 직책 없음
    expect(stats.inheritedAssignments).toBe(1) // 상속받은 직책 1개
    expect(stats.totalAssignments).toBe(1) // 전체 1개
    expect(stats.leadershipAssignments).toBe(1) // 리더십 직책 1개
  })
})