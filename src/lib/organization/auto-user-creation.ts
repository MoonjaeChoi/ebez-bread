import { PrismaClient } from '@prisma/client'
import { generatePassword, hashPassword } from '@/lib/password'
import { 
  shouldCreateUserAccount, 
  mapOrganizationRoleToUserRole,
  getRoleCapabilities 
} from './role-mapping'
import { logger } from '@/lib/logger'
import type { Member, OrganizationRole } from '@prisma/client'

/**
 * 조직 멤버 추가 시 필요한 경우 자동으로 User 계정을 생성합니다.
 */
export async function createUserAccountIfNeeded(
  prisma: PrismaClient | any, // 트랜잭션 클라이언트 지원
  member: Member,
  organizationRole: OrganizationRole,
  churchId: string
) {
  const roleName = organizationRole.name

  // 계정 생성이 필요한 직책인지 확인
  if (!shouldCreateUserAccount(roleName)) {
    logger.info('User account not required for role', {
      memberId: member.id,
      memberName: member.name,
      roleName,
      action: 'skip_user_creation'
    })
    return null
  }

  try {
    // 이메일이 없는 경우 생성 불가 (먼저 확인)
    if (!member.email) {
      logger.warn('Cannot create user account - no email', {
        memberId: member.id,
        memberName: member.name,
        roleName,
        action: 'user_creation_failed_no_email'
      })
      return null
    }

    // 이미 계정이 있는지 확인
    const existingUser = await prisma.user.findUnique({
      where: { email: member.email }
    })

    if (existingUser) {
      logger.info('User account already exists', {
        memberId: member.id,
        userId: existingUser.id,
        email: member.email,
        action: 'user_account_exists'
      })
      return existingUser
    }

    // 역할 정보 분석
    const roleCapabilities = getRoleCapabilities(roleName)
    const userRole = mapOrganizationRoleToUserRole(roleName)

    // 임시 비밀번호를 이메일 주소로 설정
    const tempPassword = member.email
    const hashedPassword = await hashPassword(tempPassword)

    // User 계정 생성
    const newUser = await prisma.user.create({
      data: {
        email: member.email,
        name: member.name,
        phone: member.phone,
        role: userRole,
        password: hashedPassword,
        passwordChangeRequired: true, // 첫 로그인 시 비밀번호 변경 강제
        lastPasswordChange: null,
        churchId,
        isActive: true,
      }
    })

    logger.info('User account created successfully', {
      userId: newUser.id,
      memberId: member.id,
      email: member.email,
      role: userRole,
      roleName,
      authorityLevel: roleCapabilities.authorityLevel,
      // tempPassword는 이메일과 동일하므로 로그에서 제외
      action: 'user_account_created'
    })

    // TODO: 이메일 또는 SMS로 로그인 정보 전송
    await sendLoginCredentials(member, tempPassword, roleCapabilities)

    return newUser

  } catch (error) {
    logger.error('Failed to create user account', error as Error, {
      memberId: member.id,
      memberName: member.name,
      email: member.email,
      roleName,
      action: 'user_creation_error'
    })
    throw error
  }
}


/**
 * 로그인 정보를 사용자에게 전송
 * TODO: 실제 이메일/SMS 발송 구현
 */
async function sendLoginCredentials(
  member: Member,
  tempPassword: string,
  roleCapabilities: ReturnType<typeof getRoleCapabilities>
) {
  // 알림 메시지 템플릿
  const message = `
안녕하세요 ${member.name}님,

교회 관리 시스템 계정이 생성되었습니다.

🔑 로그인 정보:
- 이메일: ${member.email}
- 임시 비밀번호: 이메일 주소와 동일

👥 직책 및 권한:
- 직책: ${roleCapabilities.roleName}
- 시스템 권한: ${roleCapabilities.description}

⚠️ 보안 안내:
- 첫 로그인 시 반드시 비밀번호를 변경해주세요
- 임시 비밀번호(이메일 주소)로 로그인한 후 즉시 변경하세요

로그인 URL: ${process.env.NEXTAUTH_URL}/auth/signin

감사합니다.
`

  // TODO: 실제 알림 발송 로직 구현
  logger.info('Login credentials prepared for sending', {
    memberId: member.id,
    email: member.email,
    hasPhone: !!member.phone,
    roleName: roleCapabilities.roleName,
    action: 'credentials_prepared'
  })

  // 개발 환경에서는 콘솔에 출력
  if (process.env.NODE_ENV === 'development') {
    console.log('\n=== 새 사용자 계정 생성 ===')
    console.log(message)
    console.log('==========================\n')
  }
}

/**
 * 사용자 계정 삭제 (조직에서 제거 시)
 */
export async function removeUserAccountIfNeeded(
  prisma: PrismaClient | any,
  memberEmail: string,
  roleName: string
) {
  // 중요 직책이 아니면 계정 유지
  if (!shouldCreateUserAccount(roleName)) {
    return
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: memberEmail },
      include: {
        organizationMemberships: {
          where: { isActive: true },
          include: {
            role: true
          }
        }
      }
    })

    if (!user) return

    // 다른 중요 직책이 있는지 확인
    const hasOtherImportantRoles = user.organizationMemberships.some(
      (membership: any) => 
        membership.role && 
        shouldCreateUserAccount(membership.role.name) &&
        membership.role.name !== roleName
    )

    // 다른 중요 직책이 없으면 계정 비활성화
    if (!hasOtherImportantRoles) {
      await prisma.user.update({
        where: { id: user.id },
        data: { isActive: false }
      })

      logger.info('User account deactivated', {
        userId: user.id,
        email: memberEmail,
        removedRole: roleName,
        action: 'user_account_deactivated'
      })
    }

  } catch (error) {
    logger.error('Failed to remove user account', error as Error, {
      memberEmail,
      roleName,
      action: 'user_removal_error'
    })
  }
}

/**
 * 역할 변경 시 사용자 권한 업데이트
 */
export async function updateUserRoleIfNeeded(
  prisma: PrismaClient | any,
  memberEmail: string,
  oldRoleName: string,
  newRoleName: string
) {
  try {
    const user = await prisma.user.findUnique({
      where: { email: memberEmail }
    })

    if (!user) return

    const oldCapabilities = getRoleCapabilities(oldRoleName)
    const newCapabilities = getRoleCapabilities(newRoleName)

    // 권한 레벨이 변경된 경우에만 업데이트
    if (oldCapabilities.userRole !== newCapabilities.userRole) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          role: newCapabilities.userRole
        }
      })

      logger.info('User role updated', {
        userId: user.id,
        email: memberEmail,
        oldRole: oldCapabilities.userRole,
        newRole: newCapabilities.userRole,
        oldRoleName,
        newRoleName,
        action: 'user_role_updated'
      })
    }

  } catch (error) {
    logger.error('Failed to update user role', error as Error, {
      memberEmail,
      oldRoleName,
      newRoleName,
      action: 'user_role_update_error'
    })
  }
}