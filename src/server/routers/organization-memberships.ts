import { z } from 'zod'
import { router, protectedProcedure, adminProcedure } from '@/lib/trpc/server'
import { TRPCError } from '@trpc/server'
import type { PrismaClient, MembershipChangeType, OrganizationMembership } from '@prisma/client'
import { createUserAccountIfNeeded, updateUserRoleIfNeeded, removeUserAccountIfNeeded } from '@/lib/organization/auto-user-creation'
import { logger } from '@/lib/logger'

// Helper function to track membership changes
async function createMembershipHistory(
  prisma: PrismaClient | any, // Allow transaction client
  membershipId: string,
  changeType: MembershipChangeType,
  previousValue: any,
  newValue: any,
  createdById: string,
  reason?: string
) {
  await prisma.organizationMembershipHistory.create({
    data: {
      membershipId,
      changeType,
      previousValue: previousValue ? JSON.stringify(previousValue) : null,
      newValue: newValue ? JSON.stringify(newValue) : null,
      reason,
      createdById,
    },
  })
}

// Input schemas
const membershipCreateSchema = z.object({
  memberId: z.string().min(1, '교인을 선택해주세요'),
  organizationId: z.string().min(1, '조직을 선택해주세요'),
  roleId: z.string().optional(),
  isPrimary: z.boolean().default(false),
  joinDate: z.union([
    z.string().transform((str) => new Date(str)),
    z.date()
  ]).optional(),
  notes: z.string().optional(),
})

const membershipUpdateSchema = z.object({
  id: z.string(),
  roleId: z.string().optional().nullable(),
  isPrimary: z.boolean().optional(),
  endDate: z.union([
    z.string().transform((str) => new Date(str)),
    z.date()
  ]).optional().nullable(),
  notes: z.string().optional(),
})

const membershipQuerySchema = z.object({
  organizationId: z.string().optional(),
  memberId: z.string().optional(),
  roleId: z.string().optional(),
  isActive: z.boolean().optional(),
  includeInactive: z.boolean().default(false),
})

export const organizationMembershipsRouter = router({
  // 조직별 멤버십 조회
  getByOrganization: protectedProcedure
    .input(z.object({ 
      organizationId: z.string(),
      includeInactive: z.boolean().default(false) 
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId, includeInactive } = input

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

      return await ctx.prisma.organizationMembership.findMany({
        where: {
          organizationId,
          ...(includeInactive ? {} : { isActive: true }),
        },
        include: {
          member: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
              photoUrl: true,
              birthDate: true,
              gender: true,
              maritalStatus: true,
              position: {
                select: {
                  id: true,
                  name: true,
                }
              }
            },
          },
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
              level: true,
            },
          },
        },
        orderBy: [
          { role: { level: 'desc' } },
          { isPrimary: 'desc' },
          { member: { name: 'asc' } },
        ],
      })
    }),

  // 교인별 멤버십 조회
  getByMember: protectedProcedure
    .input(z.object({ 
      memberId: z.string(),
      includeInactive: z.boolean().default(false) 
    }))
    .query(async ({ ctx, input }) => {
      const { memberId, includeInactive } = input

      // 교인 접근 권한 확인
      const member = await ctx.prisma.member.findFirst({
        where: {
          id: memberId,
          churchId: ctx.session.user.churchId,
        },
      })

      if (!member) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '교인을 찾을 수 없습니다',
        })
      }

      return await ctx.prisma.organizationMembership.findMany({
        where: {
          memberId,
          ...(includeInactive ? {} : { isActive: true }),
        },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              code: true,
              level: true,
              description: true,
              parent: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                }
              }
            },
          },
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
        },
        orderBy: [
          { isPrimary: 'desc' },
          { role: { level: 'desc' } },
          { organization: { name: 'asc' } },
        ],
      })
    }),

  // 조직별 리더십 조회
  getLeadersByOrganization: protectedProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = input

      return await ctx.prisma.organizationMembership.findMany({
        where: {
          organizationId,
          isActive: true,
          role: {
            isLeadership: true,
          },
        },
        include: {
          member: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
              photoUrl: true,
            },
          },
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
        },
        orderBy: [
          { role: { level: 'desc' } },
          { member: { name: 'asc' } },
        ],
      })
    }),

  // 멤버십 생성
  create: adminProcedure
    .input(membershipCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const { memberId, organizationId, roleId, isPrimary, joinDate, notes } = input

      // 중복 체크 - 같은 조직에서 활성 멤버십이 이미 있는지
      const existingMembership = await ctx.prisma.organizationMembership.findFirst({
        where: {
          memberId,
          organizationId,
          isActive: true,
        },
      })

      if (existingMembership) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: '해당 교인은 이미 이 조직의 멤버입니다',
        })
      }

      // 교인과 조직이 같은 교회에 속해있는지 확인
      const member = await ctx.prisma.member.findFirst({
        where: {
          id: memberId,
          churchId: ctx.session.user.churchId,
        },
      })

      const organization = await ctx.prisma.organization.findFirst({
        where: {
          id: organizationId,
          churchId: ctx.session.user.churchId,
        },
      })

      if (!member || !organization) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '교인 또는 조직을 찾을 수 없습니다',
        })
      }

      // 직책이 지정된 경우 유효성 확인
      if (roleId) {
        const role = await ctx.prisma.organizationRole.findFirst({
          where: {
            id: roleId,
            churchId: ctx.session.user.churchId,
          },
        })

        if (!role) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: '직책을 찾을 수 없습니다',
          })
        }
      }

      // 트랜잭션으로 멤버십 생성 및 사용자 계정 자동 생성
      return await ctx.prisma.$transaction(async (tx) => {
        // 1. 조직 멤버십 생성
        const membership = await tx.organizationMembership.create({
          data: {
            memberId,
            organizationId,
            roleId,
            isPrimary,
            joinDate: joinDate || new Date(),
            notes,
          },
          include: {
            member: {
              select: {
                id: true,
                name: true,
                phone: true,
                email: true,
              },
            },
            organization: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
            role: {
              select: {
                id: true,
                name: true,
                englishName: true,
                level: true,
                isLeadership: true,
              },
            },
          },
        })

        // 2. 자동 사용자 계정 생성 (필요한 경우)
        if (membership.role && member.email) {
          try {
            // 완전한 role 객체 조회
            const fullRole = await tx.organizationRole.findUnique({
              where: { id: membership.role.id }
            })
            
            if (fullRole) {
              const createdUser = await createUserAccountIfNeeded(
                tx,
                member,
                fullRole,
                ctx.session.user.churchId
              )

              if (createdUser) {
                logger.info('User account auto-created with membership', {
                  userId: createdUser.id,
                  action: 'membership_with_user_created',
                  metadata: {
                    memberId: member.id,
                    roleName: membership.role.name,
                    email: member.email
                  }
                })
              }
            }
          } catch (error) {
            // 사용자 계정 생성 실패 시에도 멤버십은 유지
            logger.warn('Failed to auto-create user account, but membership created', {
              action: 'membership_created_user_failed',
              metadata: {
                memberId: member.id,
                roleName: membership.role?.name,
                email: member.email,
                error: (error as Error).message
              }
            })
          }
        }

        return membership
      })
    }),

  // 멤버십 수정
  update: adminProcedure
    .input(membershipUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, roleId, isPrimary, endDate, notes } = input

      // 기존 멤버십 존재 여부 확인 및 현재 값 조회
      const existingMembership = await ctx.prisma.organizationMembership.findFirst({
        where: {
          id,
          organization: {
            churchId: ctx.session.user.churchId,
          },
        },
        include: {
          role: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      })

      if (!existingMembership) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '멤버십을 찾을 수 없습니다',
        })
      }

      // 직책 변경의 경우 유효성 확인
      if (roleId !== undefined) {
        if (roleId) {
          const role = await ctx.prisma.organizationRole.findFirst({
            where: {
              id: roleId,
              churchId: ctx.session.user.churchId,
            },
          })

          if (!role) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: '직책을 찾을 수 없습니다',
            })
          }
        }
      }

      // 변경사항 추적을 위한 배열
      const changePromises: Promise<any>[] = []

      // 직책 변경 추적
      if (roleId !== existingMembership.roleId) {
        changePromises.push(
          createMembershipHistory(
            ctx.prisma,
            id,
            'ROLE_CHANGED',
            { roleId: existingMembership.roleId, roleName: existingMembership.role?.name },
            { roleId },
            ctx.session.user.id,
            '직책 변경'
          )
        )
      }

      // 주요 조직 상태 변경 추적
      if (isPrimary !== undefined && isPrimary !== existingMembership.isPrimary) {
        changePromises.push(
          createMembershipHistory(
            ctx.prisma,
            id,
            'PRIMARY_CHANGED',
            { isPrimary: existingMembership.isPrimary },
            { isPrimary },
            ctx.session.user.id,
            isPrimary ? '주요 조직으로 설정' : '주요 조직에서 해제'
          )
        )
      }

      // 종료일 변경 추적 
      if (endDate !== existingMembership.endDate) {
        if (endDate && !existingMembership.endDate) {
          changePromises.push(
            createMembershipHistory(
              ctx.prisma,
              id,
              'DEACTIVATED',
              { endDate: existingMembership.endDate },
              { endDate },
              ctx.session.user.id,
              '구성원 비활성화'
            )
          )
        } else if (!endDate && existingMembership.endDate) {
          changePromises.push(
            createMembershipHistory(
              ctx.prisma,
              id,
              'ACTIVATED',
              { endDate: existingMembership.endDate },
              { endDate },
              ctx.session.user.id,
              '구성원 재활성화'
            )
          )
        } else {
          changePromises.push(
            createMembershipHistory(
              ctx.prisma,
              id,
              'END_DATE_CHANGED',
              { endDate: existingMembership.endDate },
              { endDate },
              ctx.session.user.id,
              '종료일 변경'
            )
          )
        }
      }

      // 메모 변경 추적
      if (notes !== undefined && notes !== existingMembership.notes) {
        changePromises.push(
          createMembershipHistory(
            ctx.prisma,
            id,
            'NOTES_CHANGED',
            { notes: existingMembership.notes },
            { notes },
            ctx.session.user.id,
            '메모 변경'
          )
        )
      }

      // 동시 실행: 멤버십 업데이트 및 변경 이력 저장
      const [updatedMembership] = await Promise.all([
        ctx.prisma.organizationMembership.update({
          where: { id },
          data: {
            ...(roleId !== undefined && { roleId }),
            ...(isPrimary !== undefined && { isPrimary }),
            ...(endDate !== undefined && { endDate }),
            ...(notes !== undefined && { notes }),
            // 종료일이 설정되면 비활성화
            ...(endDate && { isActive: false }),
            // 종료일이 제거되면 활성화 
            ...(!endDate && existingMembership.endDate && { isActive: true }),
          },
          include: {
            member: {
              select: {
                id: true,
                name: true,
                phone: true,
                email: true,
              },
            },
            organization: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
            role: {
              select: {
                id: true,
                name: true,
                englishName: true,
                level: true,
                isLeadership: true,
              },
            },
          },
        }),
        ...changePromises,
      ])

      return updatedMembership
    }),

  // 일괄 멤버십 업데이트
  bulkUpdate: adminProcedure
    .input(z.object({
      membershipIds: z.array(z.string()).min(1, '수정할 멤버십을 선택해주세요'),
      roleId: z.string().optional().nullable(),
      endDate: z.date().optional().nullable(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { membershipIds, roleId, endDate, reason } = input

      // 모든 멤버십이 같은 교회 소속인지 확인
      const memberships = await ctx.prisma.organizationMembership.findMany({
        where: {
          id: { in: membershipIds },
          organization: {
            churchId: ctx.session.user.churchId,
          },
        },
        include: {
          role: {
            select: {
              id: true,
              name: true,
            },
          },
          member: {
            select: {
              id: true,
              name: true,
            },
          },
          organization: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      })

      if (memberships.length !== membershipIds.length) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '일부 멤버십을 찾을 수 없습니다',
        })
      }

      // 직책 변경의 경우 유효성 확인
      if (roleId !== undefined && roleId) {
        const role = await ctx.prisma.organizationRole.findFirst({
          where: {
            id: roleId,
            churchId: ctx.session.user.churchId,
          },
        })

        if (!role) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: '직책을 찾을 수 없습니다',
          })
        }
      }

      // 트랜잭션으로 모든 업데이트 실행
      const result = await ctx.prisma.$transaction(async (tx) => {
        const updatePromises: Promise<any>[] = []
        const historyPromises: Promise<any>[] = []

        for (const membership of memberships) {
          // 업데이트할 데이터 구성
          const updateData: any = {}
          let hasChanges = false

          // 직책 변경
          if (roleId !== undefined && roleId !== membership.roleId) {
            updateData.roleId = roleId
            hasChanges = true

            // 변경 이력 추적
            historyPromises.push(
              createMembershipHistory(
                tx,
                membership.id,
                'ROLE_CHANGED',
                { roleId: membership.roleId, roleName: membership.role?.name },
                { roleId },
                ctx.session.user.id,
                reason || '일괄 직책 변경'
              )
            )
          }

          // 종료일 변경 (활성화/비활성화)
          if (endDate !== undefined && endDate !== membership.endDate) {
            updateData.endDate = endDate
            hasChanges = true

            if (endDate && !membership.endDate) {
              // 비활성화
              updateData.isActive = false
              historyPromises.push(
                createMembershipHistory(
                  tx,
                  membership.id,
                  'DEACTIVATED',
                  { endDate: membership.endDate },
                  { endDate },
                  ctx.session.user.id,
                  reason || '일괄 비활성화'
                )
              )
            } else if (!endDate && membership.endDate) {
              // 재활성화
              updateData.isActive = true
              historyPromises.push(
                createMembershipHistory(
                  tx,
                  membership.id,
                  'ACTIVATED',
                  { endDate: membership.endDate },
                  { endDate },
                  ctx.session.user.id,
                  reason || '일괄 재활성화'
                )
              )
            }
          }

          // 변경사항이 있으면 업데이트 실행
          if (hasChanges) {
            updatePromises.push(
              tx.organizationMembership.update({
                where: { id: membership.id },
                data: updateData,
              })
            )
          }
        }

        // 모든 업데이트와 이력 저장을 병렬 실행
        const [updatedMemberships] = await Promise.all([
          Promise.all(updatePromises),
          Promise.all(historyPromises),
        ])

        return updatedMemberships
      })

      return {
        updatedCount: result.length,
        message: `${result.length}개의 멤버십이 업데이트되었습니다`,
      }
    }),

  // 일괄 조직 이동
  bulkTransfer: adminProcedure
    .input(z.object({
      membershipIds: z.array(z.string()).min(1, '이동할 멤버십을 선택해주세요'),
      targetOrganizationId: z.string().min(1, '대상 조직을 선택해주세요'),
      keepRole: z.boolean().default(true), // 기존 직책 유지 여부
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { membershipIds, targetOrganizationId, keepRole, reason } = input

      // 대상 조직이 같은 교회 소속인지 확인
      const targetOrganization = await ctx.prisma.organization.findFirst({
        where: {
          id: targetOrganizationId,
          churchId: ctx.session.user.churchId,
          isActive: true,
        },
      })

      if (!targetOrganization) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '대상 조직을 찾을 수 없습니다',
        })
      }

      // 이동할 멤버십들이 같은 교회 소속인지 확인
      const memberships = await ctx.prisma.organizationMembership.findMany({
        where: {
          id: { in: membershipIds },
          organization: {
            churchId: ctx.session.user.churchId,
          },
        },
        include: {
          member: {
            select: {
              id: true,
              name: true,
            },
          },
          organization: {
            select: {
              id: true,
              name: true,
            },
          },
          role: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      })

      if (memberships.length !== membershipIds.length) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '일부 멤버십을 찾을 수 없습니다',
        })
      }

      // 트랜잭션으로 조직 이동 실행
      const result = await ctx.prisma.$transaction(async (tx) => {
        const transferPromises: Promise<any>[] = []
        const historyPromises: Promise<any>[] = []

        for (const membership of memberships) {
          // 같은 조직으로 이동하려는 경우 스킽
          if (membership.organizationId === targetOrganizationId) {
            continue
          }

          // 대상 조직에 이미 해당 교인의 활성 멤버십이 있는지 확인
          const existingMembership = await tx.organizationMembership.findFirst({
            where: {
              memberId: membership.memberId,
              organizationId: targetOrganizationId,
              isActive: true,
            },
          })

          if (existingMembership) {
            // 기존 멤버십이 있으면 기존 것을 비활성화하고 새로운 멤버십 생성
            await tx.organizationMembership.update({
              where: { id: existingMembership.id },
              data: { 
                isActive: false, 
                endDate: new Date() 
              },
            })

            // 기존 멤버십 종료 이력 추가
            historyPromises.push(
              createMembershipHistory(
                tx,
                existingMembership.id,
                'DEACTIVATED',
                { isActive: true },
                { isActive: false },
                ctx.session.user.id,
                '조직 이동으로 인한 기존 멤버십 종료'
              )
            )
          }

          // 기존 멤버십 종료
          transferPromises.push(
            tx.organizationMembership.update({
              where: { id: membership.id },
              data: {
                isActive: false,
                endDate: new Date(),
              },
            })
          )

          // 기존 멤버십 종료 이력 추가
          historyPromises.push(
            createMembershipHistory(
              tx,
              membership.id,
              'TRANSFERRED_OUT',
              { 
                organizationId: membership.organizationId,
                organizationName: membership.organization.name 
              },
              { 
                organizationId: targetOrganizationId,
                organizationName: targetOrganization.name 
              },
              ctx.session.user.id,
              reason || '조직 이동'
            )
          )

          // 새 조직에 멤버십 생성
          const newMembershipData = {
            memberId: membership.memberId,
            organizationId: targetOrganizationId,
            roleId: keepRole ? membership.roleId : null,
            isPrimary: membership.isPrimary,
            joinDate: new Date(),
            isActive: true,
          }

          transferPromises.push(
            tx.organizationMembership.create({
              data: newMembershipData,
            }).then((newMembership) => {
              // 새 멤버십 생성 이력 추가
              return createMembershipHistory(
                tx,
                newMembership.id,
                'TRANSFERRED_IN',
                { 
                  organizationId: membership.organizationId,
                  organizationName: membership.organization.name 
                },
                { 
                  organizationId: targetOrganizationId,
                  organizationName: targetOrganization.name 
                },
                ctx.session.user.id,
                reason || '조직 이동'
              )
            })
          )
        }

        // 모든 이동과 이력 저장을 병렬 실행
        await Promise.all([
          Promise.all(transferPromises),
          Promise.all(historyPromises),
        ])

        return memberships.length
      })

      return {
        transferredCount: result,
        message: `${result}개의 멤버십이 ${targetOrganization.name}(으)로 이동되었습니다`,
      }
    }),

  // 멤버십 종료 (비활성화)
  deactivate: adminProcedure
    .input(z.object({
      id: z.string(),
      endDate: z.date().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, endDate, notes } = input

      const existingMembership = await ctx.prisma.organizationMembership.findFirst({
        where: {
          id,
          organization: {
            churchId: ctx.session.user.churchId,
          },
        },
      })

      if (!existingMembership) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '멤버십을 찾을 수 없습니다',
        })
      }

      return await ctx.prisma.organizationMembership.update({
        where: { id },
        data: {
          isActive: false,
          endDate: endDate || new Date(),
          notes,
        },
      })
    }),

  // 멤버십 삭제
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { id } = input

      const existingMembership = await ctx.prisma.organizationMembership.findFirst({
        where: {
          id,
          organization: {
            churchId: ctx.session.user.churchId,
          },
        },
      })

      if (!existingMembership) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '멤버십을 찾을 수 없습니다',
        })
      }

      await ctx.prisma.organizationMembership.delete({
        where: { id },
      })

      return { success: true }
    }),

  // 조직별 멤버십 통계
  getStatsByOrganization: protectedProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = input

      // 전체 멤버 수
      const totalMembers = await ctx.prisma.organizationMembership.count({
        where: {
          organizationId,
          isActive: true,
        },
      })

      // 리더십 직책 보유자 수
      const leadershipMembers = await ctx.prisma.organizationMembership.count({
        where: {
          organizationId,
          isActive: true,
          role: {
            isLeadership: true,
          },
        },
      })

      // 직책별 통계
      const roleStats = await ctx.prisma.organizationMembership.groupBy({
        by: ['roleId'],
        where: {
          organizationId,
          isActive: true,
          roleId: { not: null },
        },
        _count: {
          id: true,
        },
      })

      // 직책 정보와 함께 결합
      const rolesWithCounts = await Promise.all(
        roleStats.map(async (stat) => {
          const role = await ctx.prisma.organizationRole.findUnique({
            where: { id: stat.roleId! },
            select: {
              id: true,
              name: true,
              englishName: true,
              level: true,
              isLeadership: true,
            },
          })
          return {
            role,
            count: stat._count.id,
          }
        })
      )

      return {
        totalMembers,
        leadershipMembers,
        roleStats: rolesWithCounts,
        noRoleMembers: totalMembers - roleStats.reduce((sum, stat) => sum + stat._count.id, 0),
      }
    }),

  // 페이지네이션 지원 조직별 멤버십 조회
  getByOrganizationPaginated: protectedProcedure
    .input(z.object({ 
      organizationId: z.string(),
      includeInactive: z.boolean().default(false),
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(10),
      search: z.string().optional(),
      roleFilter: z.string().optional(), // 특정 직책으로 필터링
      statusFilter: z.enum(['active', 'inactive', 'all']).default('active')
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId, includeInactive, page, limit, search, roleFilter, statusFilter } = input
      const offset = (page - 1) * limit

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

      // 검색 및 필터 조건 구성
      const whereCondition: any = {
        organizationId,
      }

      // 상태 필터
      if (statusFilter === 'active') {
        whereCondition.isActive = true
      } else if (statusFilter === 'inactive') {
        whereCondition.isActive = false
      }
      // 'all'인 경우 상태 조건 추가하지 않음

      // 직책 필터
      if (roleFilter) {
        whereCondition.roleId = roleFilter
      }

      // 검색 조건
      if (search) {
        whereCondition.OR = [
          {
            member: {
              name: {
                contains: search,
                mode: 'insensitive',
              },
            },
          },
          {
            member: {
              phone: {
                contains: search,
                mode: 'insensitive',
              },
            },
          },
          {
            member: {
              email: {
                contains: search,
                mode: 'insensitive',
              },
            },
          },
          {
            role: {
              name: {
                contains: search,
                mode: 'insensitive',
              },
            },
          },
        ]
      }

      // 총 개수 조회
      const totalCount = await ctx.prisma.organizationMembership.count({
        where: whereCondition,
      })

      // 데이터 조회
      const memberships = await ctx.prisma.organizationMembership.findMany({
        where: whereCondition,
        include: {
          member: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
              photoUrl: true,
              birthDate: true,
              gender: true,
              maritalStatus: true,
              position: {
                select: {
                  id: true,
                  name: true,
                }
              }
            },
          },
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
              level: true,
            },
          },
        },
        orderBy: [
          { role: { level: 'desc' } },
          { isPrimary: 'desc' },
          { member: { name: 'asc' } },
        ],
        skip: offset,
        take: limit,
      })

      const totalPages = Math.ceil(totalCount / limit)

      return {
        data: memberships,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          limit,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      }
    }),

  // 멤버십 변경 이력 조회
  getHistory: protectedProcedure
    .input(z.object({ 
      membershipId: z.string(),
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(50).default(20)
    }))
    .query(async ({ ctx, input }) => {
      const { membershipId, page, limit } = input
      const offset = (page - 1) * limit

      // 멤버십 존재 여부 및 권한 확인
      const membership = await ctx.prisma.organizationMembership.findFirst({
        where: {
          id: membershipId,
          organization: {
            churchId: ctx.session.user.churchId,
          },
        },
      })

      if (!membership) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '멤버십을 찾을 수 없습니다',
        })
      }

      // 총 이력 개수
      const totalCount = await ctx.prisma.organizationMembershipHistory.count({
        where: { membershipId },
      })

      // 이력 조회
      const history = await ctx.prisma.organizationMembershipHistory.findMany({
        where: { membershipId },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      })

      const totalPages = Math.ceil(totalCount / limit)

      return {
        data: history,
        pagination: {
          page,
          totalPages,
          totalCount,
          limit,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      }
    }),

  // 일괄 가져오기
  bulkImport: adminProcedure
    .input(z.object({
      data: z.array(z.object({
        memberName: z.string().min(1),
        memberPhone: z.string().optional(),
        memberEmail: z.string().email().optional(),
        organizationName: z.string().min(1),
        organizationCode: z.string().optional(),
        roleName: z.string().optional(),
        joinDate: z.string().or(z.date()),
        endDate: z.string().optional().or(z.date().optional()),
        isActive: z.string().default('활성'),
        memo: z.string().optional(),
      })),
      createMissingEntities: z.boolean().default(true), // 누락된 구성원/조직/직책 자동 생성 여부
      reason: z.string().default('Excel 일괄 가져오기')
    }))
    .mutation(async ({ ctx, input }) => {
      const { data, createMissingEntities, reason } = input
      const churchId = ctx.session.user.churchId
      const importResults: Array<{
        success: boolean;
        membershipId?: string;
        memberName?: string;
        organizationName?: string;
        action?: 'created' | 'updated';
        error?: string;
        data?: any;
      }> = []
      
      // 트랜잭션으로 일괄 처리
      const result = await ctx.prisma.$transaction(async (tx) => {
        for (const item of data) {
          try {
            // 날짜 처리
            const joinDate = typeof item.joinDate === 'string' 
              ? new Date(item.joinDate)
              : item.joinDate
            
            const endDate = item.endDate 
              ? (typeof item.endDate === 'string' ? new Date(item.endDate) : item.endDate)
              : null

            // 1. 구성원 찾기 또는 생성
            let member = await tx.member.findFirst({
              where: {
                churchId,
                OR: [
                  { name: item.memberName },
                  ...(item.memberPhone ? [{ phone: item.memberPhone }] : []),
                  ...(item.memberEmail ? [{ email: item.memberEmail }] : [])
                ]
              }
            })

            if (!member) {
              if (createMissingEntities) {
                member = await tx.member.create({
                  data: {
                    churchId,
                    name: item.memberName,
                    phone: item.memberPhone || null,
                    email: item.memberEmail || null,
                    status: 'ACTIVE',
                  }
                })
              } else {
                importResults.push({
                  success: false,
                  error: `구성원 '${item.memberName}'을 찾을 수 없습니다.`,
                  data: item
                })
                continue
              }
            }

            // 2. 조직 찾기 또는 생성
            let organization = await tx.organization.findFirst({
              where: {
                churchId,
                OR: [
                  { name: item.organizationName },
                  ...(item.organizationCode ? [{ code: item.organizationCode }] : [])
                ]
              }
            })

            if (!organization) {
              if (createMissingEntities) {
                // 새 조직 코드 생성
                const newCode = item.organizationCode || 
                  item.organizationName.replace(/\s+/g, '').toUpperCase().slice(0, 10)
                
                organization = await tx.organization.create({
                  data: {
                    churchId,
                    name: item.organizationName,
                    code: newCode,
                    level: 'LEVEL_5', // 기본 레벨
                    isActive: true,
                  }
                })
              } else {
                importResults.push({
                  success: false,
                  error: `조직 '${item.organizationName}'을 찾을 수 없습니다.`,
                  data: item
                })
                continue
              }
            }

            // 3. 직책 찾기 또는 생성
            let role = null
            if (item.roleName && item.roleName.trim() !== '') {
              // 조직에 할당된 직책 찾기
              const roleAssignment = await tx.organizationRoleAssignment.findFirst({
                where: {
                  organizationId: organization.id,
                  role: {
                    name: item.roleName,
                    churchId
                  },
                  isActive: true
                },
                include: {
                  role: true
                }
              })
              role = roleAssignment?.role || null

              if (!role && createMissingEntities) {
                // 새 직책 생성
                role = await tx.organizationRole.create({
                  data: {
                    churchId,
                    name: item.roleName,
                    level: 1,
                    isLeadership: false,
                    isActive: true,
                  }
                })
                
                // 조직에 직책 할당
                await tx.organizationRoleAssignment.create({
                  data: {
                    organizationId: organization.id,
                    roleId: role.id,
                    isActive: true
                  }
                })
              }
            }

            // 4. 기존 멤버십 확인
            const existingMembership = await tx.organizationMembership.findFirst({
              where: {
                memberId: member.id,
                organizationId: organization.id,
                isActive: true
              }
            })

            let membership
            if (existingMembership) {
              // 기존 멤버십 업데이트
              membership = await tx.organizationMembership.update({
                where: { id: existingMembership.id },
                data: {
                  roleId: role?.id || null,
                  joinDate,
                  endDate,
                  isActive: item.isActive === '활성',
                  notes: item.memo || null,
                }
              })
            } else {
              // 새 멤버십 생성
              membership = await tx.organizationMembership.create({
                data: {
                  memberId: member.id,
                  organizationId: organization.id,
                  roleId: role?.id || null,
                  joinDate,
                  endDate,
                  isActive: item.isActive === '활성',
                  notes: item.memo || null,
                }
              })
            }

            // 5. 변경 이력 저장 (기존 멤버십이 있는 경우 역할 변경으로, 없는 경우 활성화로 기록)
            if (existingMembership) {
              // 기존 멤버십 업데이트의 경우 - 가장 주요한 변경사항에 따라 타입 결정
              let changeType: MembershipChangeType = 'ROLE_CHANGED'
              if (membership.roleId !== existingMembership.roleId) {
                changeType = 'ROLE_CHANGED'
              } else if (membership.joinDate !== existingMembership.joinDate) {
                changeType = 'JOIN_DATE_CHANGED'
              } else if (membership.endDate !== existingMembership.endDate) {
                changeType = 'END_DATE_CHANGED'
              } else if (membership.notes !== existingMembership.notes) {
                changeType = 'NOTES_CHANGED'
              }
              
              await createMembershipHistory(
                tx,
                membership.id,
                changeType,
                {
                  roleId: existingMembership.roleId,
                  joinDate: existingMembership.joinDate,
                  endDate: existingMembership.endDate,
                  isActive: existingMembership.isActive,
                  notes: existingMembership.notes,
                },
                {
                  roleId: membership.roleId,
                  joinDate: membership.joinDate,
                  endDate: membership.endDate,
                  isActive: membership.isActive,
                  notes: membership.notes,
                },
                ctx.session.user.id,
                reason
              )
            } else {
              // 새 멤버십 생성의 경우
              await createMembershipHistory(
                tx,
                membership.id,
                'ACTIVATED',
                null,
                {
                  roleId: membership.roleId,
                  joinDate: membership.joinDate,
                  endDate: membership.endDate,
                  isActive: membership.isActive,
                  notes: membership.notes,
                },
                ctx.session.user.id,
                reason
              )
            }

            importResults.push({
              success: true,
              membershipId: membership.id,
              memberName: member.name,
              organizationName: organization.name,
              action: existingMembership ? 'updated' : 'created'
            })

          } catch (error) {
            importResults.push({
              success: false,
              error: error instanceof Error ? error.message : '알 수 없는 오류',
              data: item
            })
          }
        }
        
        return importResults
      })

      const successCount = result.filter(r => r.success).length
      const errorCount = result.filter(r => !r.success).length

      return {
        success: errorCount === 0,
        totalProcessed: data.length,
        successCount,
        errorCount,
        results: result
      }
    }),
})