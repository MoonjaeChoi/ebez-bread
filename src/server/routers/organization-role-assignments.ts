import { z } from 'zod'
import { router, protectedProcedure, adminProcedure } from '@/lib/trpc/server'
import { TRPCError } from '@trpc/server'

// Input schemas
const roleAssignmentCreateSchema = z.object({
  organizationId: z.string().min(1, '조직을 선택해주세요'),
  roleId: z.string().min(1, '직책을 선택해주세요'),
  isInherited: z.boolean().default(false),
  inheritedFrom: z.string().optional(),
})

const roleAssignmentUpdateSchema = z.object({
  id: z.string(),
  isActive: z.boolean().optional(),
})

const bulkRoleAssignmentSchema = z.object({
  organizationId: z.string().min(1, '조직을 선택해주세요'),
  roleIds: z.array(z.string()).min(1, '최소 하나의 직책을 선택해주세요'),
  replaceExisting: z.boolean().default(false), // true면 기존 할당을 모두 삭제하고 새로 할당
})

const inheritRolesSchema = z.object({
  fromOrganizationId: z.string().min(1, '상위 조직을 선택해주세요'),
  toOrganizationId: z.string().min(1, '하위 조직을 선택해주세요'),
  roleIds: z.array(z.string()).optional(), // 특정 직책만 상속하려면 지정
})

export const organizationRoleAssignmentsRouter = router({
  // 조직별 할당된 직책 목록 조회
  getByOrganization: protectedProcedure
    .input(z.object({ 
      organizationId: z.string(),
      includeInherited: z.boolean().default(true),
      includeInactive: z.boolean().default(false) 
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId, includeInherited, includeInactive } = input

      // 조직 접근 권한 확인
      const organization = await ctx.prisma.organization.findFirst({
        where: {
          id: organizationId,
          churchId: ctx.session.user.churchId,
        },
      })

      if (!organization) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '조직을 찾을 수 없습니다',
        })
      }

      const assignments = await ctx.prisma.organizationRoleAssignment.findMany({
        where: {
          organizationId,
          ...(includeInactive ? {} : { isActive: true }),
          ...(includeInherited ? {} : { isInherited: false }),
        },
        include: {
          role: {
            select: {
              id: true,
              name: true,
              englishName: true,
              level: true,
              isLeadership: true,
              description: true,
            },
          },
          inheritedFromOrg: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
        orderBy: [
          { role: { level: 'desc' } },
          { role: { name: 'asc' } },
        ],
      })

      return assignments
    }),

  // 조직 계층구조에서 사용 가능한 모든 직책 조회 (상속된 것 포함)
  getAvailableRoles: protectedProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = input

      // 조직과 그 상위 조직들을 가져옴
      const organization = await ctx.prisma.organization.findFirst({
        where: {
          id: organizationId,
          churchId: ctx.session.user.churchId,
        },
      })

      if (!organization) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '조직을 찾을 수 없습니다',
        })
      }

      // 상위 조직 계층구조 구하기
      const getAncestorIds = async (orgId: string): Promise<string[]> => {
        const org = await ctx.prisma.organization.findUnique({
          where: { id: orgId },
          select: { id: true, parentId: true },
        })
        
        if (!org || !org.parentId) return [orgId]
        
        const ancestors = await getAncestorIds(org.parentId)
        return [...ancestors, orgId]
      }

      const ancestorIds = await getAncestorIds(organizationId)

      // 현재 조직과 상위 조직들에 할당된 모든 활성 직책들
      const availableAssignments = await ctx.prisma.organizationRoleAssignment.findMany({
        where: {
          organizationId: { in: ancestorIds },
          isActive: true,
        },
        include: {
          role: {
            select: {
              id: true,
              name: true,
              englishName: true,
              level: true,
              isLeadership: true,
              description: true,
            },
          },
          organization: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
        orderBy: [
          { role: { level: 'desc' } },
          { role: { name: 'asc' } },
        ],
      })

      // 중복 제거 및 그룹화
      const roleMap = new Map()
      
      availableAssignments.forEach(assignment => {
        const roleId = assignment.role.id
        if (!roleMap.has(roleId)) {
          roleMap.set(roleId, {
            ...assignment.role,
            assignedAt: assignment.organizationId,
            assignedOrganization: assignment.organization,
            isDirectlyAssigned: assignment.organizationId === organizationId,
            isInherited: assignment.organizationId !== organizationId,
          })
        }
      })

      return Array.from(roleMap.values())
    }),

  // 직책 할당
  assign: adminProcedure
    .input(roleAssignmentCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const { organizationId, roleId, isInherited, inheritedFrom } = input

      // 조직과 직책 유효성 검사
      const [organization, role] = await Promise.all([
        ctx.prisma.organization.findFirst({
          where: {
            id: organizationId,
            churchId: ctx.session.user.churchId,
          },
        }),
        ctx.prisma.organizationRole.findFirst({
          where: {
            id: roleId,
            churchId: ctx.session.user.churchId,
          },
        }),
      ])

      if (!organization || !role) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '조직 또는 직책을 찾을 수 없습니다',
        })
      }

      // 이미 할당되어 있는지 확인
      const existingAssignment = await ctx.prisma.organizationRoleAssignment.findUnique({
        where: {
          organizationId_roleId: {
            organizationId,
            roleId,
          },
        },
      })

      if (existingAssignment) {
        // 비활성화된 할당이라면 다시 활성화
        if (!existingAssignment.isActive) {
          return await ctx.prisma.organizationRoleAssignment.update({
            where: { id: existingAssignment.id },
            data: { 
              isActive: true,
              isInherited,
              inheritedFrom,
              updatedBy: ctx.session.user.id,
            },
            include: {
              role: true,
              organization: true,
              inheritedFromOrg: true,
            },
          })
        } else {
          throw new TRPCError({
            code: 'CONFLICT',
            message: '해당 조직에 이미 할당된 직책입니다',
          })
        }
      }

      // 새 할당 생성
      const assignment = await ctx.prisma.organizationRoleAssignment.create({
        data: {
          organizationId,
          roleId,
          isInherited,
          inheritedFrom,
          createdBy: ctx.session.user.id,
        },
        include: {
          role: true,
          organization: true,
          inheritedFromOrg: true,
        },
      })

      return assignment
    }),

  // 여러 직책 한번에 할당 (자동 상속 포함)
  bulkAssign: adminProcedure
    .input(bulkRoleAssignmentSchema.extend({
      autoInheritToChildren: z.boolean().default(true), // 하위 조직에 자동 상속
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId, roleIds, replaceExisting, autoInheritToChildren } = input

      // 조직 유효성 검사
      const organization = await ctx.prisma.organization.findFirst({
        where: {
          id: organizationId,
          churchId: ctx.session.user.churchId,
        },
      })

      if (!organization) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '조직을 찾을 수 없습니다',
        })
      }

      // 직책들 유효성 검사
      const roles = await ctx.prisma.organizationRole.findMany({
        where: {
          id: { in: roleIds },
          churchId: ctx.session.user.churchId,
        },
      })

      if (roles.length !== roleIds.length) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '일부 직책을 찾을 수 없습니다',
        })
      }

      // 하위 조직들 조회 (자동 상속용)
      const getChildrenIds = async (orgId: string): Promise<string[]> => {
        const children = await ctx.prisma.organization.findMany({
          where: { parentId: orgId },
          select: { id: true },
        })
        
        let allChildren = children.map(child => child.id)
        
        for (const child of children) {
          const grandChildren = await getChildrenIds(child.id)
          allChildren = [...allChildren, ...grandChildren]
        }
        
        return allChildren
      }

      const childrenIds = autoInheritToChildren ? await getChildrenIds(organizationId) : []

      // 트랜잭션으로 처리
      const result = await ctx.prisma.$transaction(async (tx) => {
        // 기존 할당 제거 (replaceExisting이 true일 때)
        if (replaceExisting) {
          await tx.organizationRoleAssignment.updateMany({
            where: {
              organizationId,
              isInherited: false, // 직접 할당된 것만 제거
            },
            data: {
              isActive: false,
              updatedBy: ctx.session.user.id,
            },
          })
        }

        // 새 할당들 생성 (현재 조직)
        const assignments = await Promise.all(
          roleIds.map(async (roleId) => {
            // 기존 할당 확인
            const existing = await tx.organizationRoleAssignment.findUnique({
              where: {
                organizationId_roleId: {
                  organizationId,
                  roleId,
                },
              },
            })

            if (existing) {
              // 기존 할당이 있다면 활성화
              return await tx.organizationRoleAssignment.update({
                where: { id: existing.id },
                data: {
                  isActive: true,
                  isInherited: false,
                  inheritedFrom: null,
                  updatedBy: ctx.session.user.id,
                },
                include: {
                  role: true,
                  organization: true,
                },
              })
            } else {
              // 새 할당 생성
              return await tx.organizationRoleAssignment.create({
                data: {
                  organizationId,
                  roleId,
                  isInherited: false,
                  createdBy: ctx.session.user.id,
                },
                include: {
                  role: true,
                  organization: true,
                },
              })
            }
          })
        )

        // 하위 조직들에 상속 (자동 상속이 활성화된 경우)
        if (autoInheritToChildren && childrenIds.length > 0) {
          for (const childId of childrenIds) {
            for (const roleId of roleIds) {
              // 이미 직접 할당된 직책인지 확인 (직접 할당이 우선)
              const directAssignment = await tx.organizationRoleAssignment.findFirst({
                where: {
                  organizationId: childId,
                  roleId,
                  isInherited: false,
                  isActive: true,
                },
              })

              if (!directAssignment) {
                // 기존 상속 할당 확인
                const existingInheritance = await tx.organizationRoleAssignment.findUnique({
                  where: {
                    organizationId_roleId: {
                      organizationId: childId,
                      roleId,
                    },
                  },
                })

                if (existingInheritance) {
                  // 상속 할당 업데이트
                  await tx.organizationRoleAssignment.update({
                    where: { id: existingInheritance.id },
                    data: {
                      isActive: true,
                      isInherited: true,
                      inheritedFrom: organizationId,
                      updatedBy: ctx.session.user.id,
                    },
                  })
                } else {
                  // 새 상속 할당 생성
                  await tx.organizationRoleAssignment.create({
                    data: {
                      organizationId: childId,
                      roleId,
                      isInherited: true,
                      inheritedFrom: organizationId,
                      createdBy: ctx.session.user.id,
                    },
                  })
                }
              }
            }
          }
        }

        return assignments
      })

      return result
    }),

  // 직책 할당 해제
  unassign: adminProcedure
    .input(z.object({ 
      organizationId: z.string(),
      roleId: z.string(),
      removeInherited: z.boolean().default(false) // 하위 조직의 상속된 할당도 제거할지
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId, roleId, removeInherited } = input

      const assignment = await ctx.prisma.organizationRoleAssignment.findUnique({
        where: {
          organizationId_roleId: {
            organizationId,
            roleId,
          },
        },
      })

      if (!assignment) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '할당된 직책을 찾을 수 없습니다',
        })
      }

      // 트랜잭션으로 처리
      await ctx.prisma.$transaction(async (tx) => {
        // 해당 할당 비활성화
        await tx.organizationRoleAssignment.update({
          where: { id: assignment.id },
          data: {
            isActive: false,
            updatedBy: ctx.session.user.id,
          },
        })

        // 하위 조직의 상속된 할당도 제거
        if (removeInherited) {
          await tx.organizationRoleAssignment.updateMany({
            where: {
              inheritedFrom: organizationId,
              roleId: roleId,
              isInherited: true,
            },
            data: {
              isActive: false,
              updatedBy: ctx.session.user.id,
            },
          })
        }
      })

      return { success: true }
    }),

  // 상위 조직에서 하위 조직으로 직책 상속
  inheritRoles: adminProcedure
    .input(inheritRolesSchema)
    .mutation(async ({ ctx, input }) => {
      const { fromOrganizationId, toOrganizationId, roleIds } = input

      // 조직들 유효성 검사
      const [fromOrg, toOrg] = await Promise.all([
        ctx.prisma.organization.findFirst({
          where: {
            id: fromOrganizationId,
            churchId: ctx.session.user.churchId,
          },
        }),
        ctx.prisma.organization.findFirst({
          where: {
            id: toOrganizationId,
            churchId: ctx.session.user.churchId,
          },
        }),
      ])

      if (!fromOrg || !toOrg) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '조직을 찾을 수 없습니다',
        })
      }

      // toOrg가 fromOrg의 하위 조직인지 확인
      let currentOrg = toOrg
      let isDescendant = false
      
      while (currentOrg.parentId) {
        if (currentOrg.parentId === fromOrganizationId) {
          isDescendant = true
          break
        }
        const parent = await ctx.prisma.organization.findUnique({
          where: { id: currentOrg.parentId },
          select: { id: true, parentId: true },
        })
        if (!parent) break
        currentOrg = parent as any
      }

      if (!isDescendant) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '대상 조직이 상위 조직의 하위 조직이 아닙니다',
        })
      }

      // 상속할 직책들 가져오기
      const fromAssignments = await ctx.prisma.organizationRoleAssignment.findMany({
        where: {
          organizationId: fromOrganizationId,
          isActive: true,
          ...(roleIds && { roleId: { in: roleIds } }),
        },
        include: {
          role: true,
        },
      })

      if (fromAssignments.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '상속할 직책이 없습니다',
        })
      }

      // 트랜잭션으로 상속 처리
      const inheritedAssignments = await ctx.prisma.$transaction(async (tx) => {
        const results = await Promise.all(
          fromAssignments.map(async (fromAssignment) => {
            // 이미 상속된 할당이 있는지 확인
            const existing = await tx.organizationRoleAssignment.findUnique({
              where: {
                organizationId_roleId: {
                  organizationId: toOrganizationId,
                  roleId: fromAssignment.roleId,
                },
              },
            })

            if (existing) {
              // 기존 할당이 있다면 상속으로 업데이트
              return await tx.organizationRoleAssignment.update({
                where: { id: existing.id },
                data: {
                  isActive: true,
                  isInherited: true,
                  inheritedFrom: fromOrganizationId,
                  updatedBy: ctx.session.user.id,
                },
                include: {
                  role: true,
                  organization: true,
                  inheritedFromOrg: true,
                },
              })
            } else {
              // 새 상속 할당 생성
              return await tx.organizationRoleAssignment.create({
                data: {
                  organizationId: toOrganizationId,
                  roleId: fromAssignment.roleId,
                  isInherited: true,
                  inheritedFrom: fromOrganizationId,
                  createdBy: ctx.session.user.id,
                },
                include: {
                  role: true,
                  organization: true,
                  inheritedFromOrg: true,
                },
              })
            }
          })
        )

        return results
      })

      return inheritedAssignments
    }),

  // 조직의 모든 하위 조직에 직책 상속 전파
  cascadeRoles: adminProcedure
    .input(z.object({
      organizationId: z.string(),
      roleIds: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId, roleIds } = input

      // 조직과 모든 하위 조직들 가져오기
      const getAllDescendants = async (orgId: string): Promise<string[]> => {
        const children = await ctx.prisma.organization.findMany({
          where: { parentId: orgId },
          select: { id: true },
        })

        let descendants = children.map(child => child.id)
        
        for (const child of children) {
          const childDescendants = await getAllDescendants(child.id)
          descendants = [...descendants, ...childDescendants]
        }
        
        return descendants
      }

      const descendantIds = await getAllDescendants(organizationId)

      if (descendantIds.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '하위 조직이 없습니다',
        })
      }

      // 상속할 직책들 가져오기
      const assignments = await ctx.prisma.organizationRoleAssignment.findMany({
        where: {
          organizationId,
          isActive: true,
          isInherited: false, // 직접 할당된 것만
          ...(roleIds && { roleId: { in: roleIds } }),
        },
      })

      // 각 하위 조직에 상속 - inheritRoles 로직을 인라인으로 구현
      const results = []
      
      for (const descendantId of descendantIds) {
        const inheritedAssignments = await ctx.prisma.$transaction(async (tx) => {
          const assignmentResults = await Promise.all(
            assignments.map(async (assignment) => {
              // 이미 상속된 할당이 있는지 확인
              const existing = await tx.organizationRoleAssignment.findUnique({
                where: {
                  organizationId_roleId: {
                    organizationId: descendantId,
                    roleId: assignment.roleId,
                  },
                },
              })

              if (existing) {
                // 기존 할당이 있다면 상속으로 업데이트
                return await tx.organizationRoleAssignment.update({
                  where: { id: existing.id },
                  data: {
                    isActive: true,
                    isInherited: true,
                    inheritedFrom: organizationId,
                    updatedBy: ctx.session.user.id,
                  },
                  include: {
                    role: true,
                    organization: true,
                    inheritedFromOrg: true,
                  },
                })
              } else {
                // 새 상속 할당 생성
                return await tx.organizationRoleAssignment.create({
                  data: {
                    organizationId: descendantId,
                    roleId: assignment.roleId,
                    isInherited: true,
                    inheritedFrom: organizationId,
                    createdBy: ctx.session.user.id,
                  },
                  include: {
                    role: true,
                    organization: true,
                    inheritedFromOrg: true,
                  },
                })
              }
            })
          )
          return assignmentResults
        })
        
        results.push(...inheritedAssignments)
      }

      return results
    }),

  // 조직 직책 할당 통계
  getStats: protectedProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = input

      // 직접 할당된 직책 수
      const directAssignments = await ctx.prisma.organizationRoleAssignment.count({
        where: {
          organizationId,
          isActive: true,
          isInherited: false,
        },
      })

      // 상속받은 직책 수
      const inheritedAssignments = await ctx.prisma.organizationRoleAssignment.count({
        where: {
          organizationId,
          isActive: true,
          isInherited: true,
        },
      })

      // 리더십 직책 수
      const leadershipAssignments = await ctx.prisma.organizationRoleAssignment.count({
        where: {
          organizationId,
          isActive: true,
          role: {
            isLeadership: true,
          },
        },
      })

      // 전체 사용 가능한 직책 수 (교회 전체)
      const totalChurchRoles = await ctx.prisma.organizationRole.count({
        where: {
          churchId: ctx.session.user.churchId,
          isActive: true,
        },
      })

      return {
        directAssignments,
        inheritedAssignments,
        totalAssignments: directAssignments + inheritedAssignments,
        leadershipAssignments,
        totalChurchRoles,
        assignmentRate: totalChurchRoles > 0 ? 
          Math.round(((directAssignments + inheritedAssignments) / totalChurchRoles) * 100) : 0,
      }
    }),
})