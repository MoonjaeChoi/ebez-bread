import { NotificationType, NotificationChannel } from '@prisma/client'
import { NotificationTemplate, NotificationTemplateData } from './types'

export const defaultTemplates: Record<
  NotificationType,
  Record<NotificationChannel, NotificationTemplate>
> = {
  [NotificationType.BIRTHDAY_REMINDER]: {
    [NotificationChannel.EMAIL]: {
      subject: '생일을 축하드립니다! 🎉',
      title: '생일 축하 알림',
      content: `안녕하세요, {{recipientName}}님!

{{memberName}}님의 생일({{birthDate}})이 곧 다가옵니다.
{{age}}번째 생일을 맞이하시는 {{memberName}}님께 축하 인사를 전해주세요.

따뜻한 축복이 함께하기를 기도합니다.

{{churchName}} 드림`,
      variables: ['recipientName', 'memberName', 'birthDate', 'age', 'churchName'],
    },
    [NotificationChannel.SMS]: {
      title: '생일 축하',
      content: '{{memberName}}님의 {{age}}번째 생일이 {{birthDate}}입니다. 축하 인사를 전해주세요! - {{churchName}}',
      variables: ['memberName', 'age', 'birthDate', 'churchName'],
    },
    [NotificationChannel.PUSH]: {
      title: '생일 알림',
      content: '{{memberName}}님의 생일이 곧 다가옵니다',
      variables: ['memberName'],
    },
    [NotificationChannel.IN_APP]: {
      title: '생일 축하 알림',
      content: '{{memberName}}님({{age}}세)의 생일이 {{birthDate}}입니다.',
      variables: ['memberName', 'age', 'birthDate'],
    },
  },

  [NotificationType.VISITATION_REMINDER]: {
    [NotificationChannel.EMAIL]: {
      subject: '심방 일정 알림',
      title: '심방 일정 안내',
      content: `안녕하세요, {{recipientName}}님!

다음 심방 일정을 안내드립니다:

• 대상: {{memberName}}님
• 일시: {{visitDate}}
• 목적: {{visitPurpose}}
• 주소: {{memberAddress}}

미리 준비하셔서 은혜로운 심방이 되기를 기도합니다.

{{churchName}} 드림`,
      variables: ['recipientName', 'memberName', 'visitDate', 'visitPurpose', 'memberAddress', 'churchName'],
    },
    [NotificationChannel.SMS]: {
      title: '심방 알림',
      content: '심방 일정: {{memberName}}님 ({{visitDate}}) {{memberAddress}} - {{churchName}}',
      variables: ['memberName', 'visitDate', 'memberAddress', 'churchName'],
    },
    [NotificationChannel.PUSH]: {
      title: '심방 일정',
      content: '{{memberName}}님 심방이 {{visitDate}}에 예정되어 있습니다',
      variables: ['memberName', 'visitDate'],
    },
    [NotificationChannel.IN_APP]: {
      title: '심방 일정 알림',
      content: '{{memberName}}님 심방 - {{visitDate}} ({{visitPurpose}})',
      variables: ['memberName', 'visitDate', 'visitPurpose'],
    },
  },

  [NotificationType.EXPENSE_APPROVAL_REQUEST]: {
    [NotificationChannel.EMAIL]: {
      subject: '지출결의서 승인 요청',
      title: '지출결의서 승인 요청',
      content: `안녕하세요, {{recipientName}}님!

새로운 지출결의서 승인 요청이 있습니다:

• 제목: {{expenseTitle}}
• 금액: {{expenseAmount}}원
• 분류: {{expenseCategory}}
• 신청자: {{requesterName}}

시스템에 로그인하여 검토 및 승인 처리해 주시기 바랍니다.

{{churchName}} 드림`,
      variables: ['recipientName', 'expenseTitle', 'expenseAmount', 'expenseCategory', 'requesterName', 'churchName'],
    },
    [NotificationChannel.SMS]: {
      title: '지출결의서 승인',
      content: '{{requesterName}}님의 지출결의서({{expenseAmount}}원) 승인이 필요합니다 - {{churchName}}',
      variables: ['requesterName', 'expenseAmount', 'churchName'],
    },
    [NotificationChannel.PUSH]: {
      title: '승인 요청',
      content: '{{expenseTitle}} 지출결의서 승인이 필요합니다',
      variables: ['expenseTitle'],
    },
    [NotificationChannel.IN_APP]: {
      title: '지출결의서 승인 요청',
      content: '{{requesterName}} - {{expenseTitle}} ({{expenseAmount}}원)',
      variables: ['requesterName', 'expenseTitle', 'expenseAmount'],
    },
  },

  [NotificationType.EXPENSE_APPROVED]: {
    [NotificationChannel.EMAIL]: {
      subject: '지출결의서가 승인되었습니다',
      title: '지출결의서 승인 완료',
      content: `안녕하세요, {{recipientName}}님!

신청하신 지출결의서가 승인되었습니다:

• 제목: {{expenseTitle}}
• 금액: {{expenseAmount}}원
• 분류: {{expenseCategory}}
• 승인자: {{approverName}}

승인된 지출결의서를 확인하시려면 시스템에 로그인해 주세요.

{{churchName}} 드림`,
      variables: ['recipientName', 'expenseTitle', 'expenseAmount', 'expenseCategory', 'approverName', 'churchName'],
    },
    [NotificationChannel.SMS]: {
      title: '지출결의서 승인',
      content: '{{expenseTitle}} 지출결의서가 승인되었습니다 ({{expenseAmount}}원) - {{churchName}}',
      variables: ['expenseTitle', 'expenseAmount', 'churchName'],
    },
    [NotificationChannel.PUSH]: {
      title: '승인 완료',
      content: '{{expenseTitle}} 지출결의서가 승인되었습니다',
      variables: ['expenseTitle'],
    },
    [NotificationChannel.IN_APP]: {
      title: '지출결의서 승인',
      content: '{{expenseTitle}} ({{expenseAmount}}원) 승인 완료',
      variables: ['expenseTitle', 'expenseAmount'],
    },
  },

  [NotificationType.EXPENSE_REJECTED]: {
    [NotificationChannel.EMAIL]: {
      subject: '지출결의서가 반려되었습니다',
      title: '지출결의서 반려 안내',
      content: `안녕하세요, {{recipientName}}님!

신청하신 지출결의서가 반려되었습니다:

• 제목: {{expenseTitle}}
• 금액: {{expenseAmount}}원
• 분류: {{expenseCategory}}
• 반려 사유: {{rejectionReason}}

문의사항이 있으시면 담당자에게 연락주시기 바랍니다.

{{churchName}} 드림`,
      variables: ['recipientName', 'expenseTitle', 'expenseAmount', 'expenseCategory', 'rejectionReason', 'churchName'],
    },
    [NotificationChannel.SMS]: {
      title: '지출결의서 반려',
      content: '{{expenseTitle}} 지출결의서가 반려되었습니다. 사유: {{rejectionReason}} - {{churchName}}',
      variables: ['expenseTitle', 'rejectionReason', 'churchName'],
    },
    [NotificationChannel.PUSH]: {
      title: '반려 안내',
      content: '{{expenseTitle}} 지출결의서가 반려되었습니다',
      variables: ['expenseTitle'],
    },
    [NotificationChannel.IN_APP]: {
      title: '지출결의서 반려',
      content: '{{expenseTitle}} 반려 - {{rejectionReason}}',
      variables: ['expenseTitle', 'rejectionReason'],
    },
  },

  [NotificationType.SYSTEM_ANNOUNCEMENT]: {
    [NotificationChannel.EMAIL]: {
      subject: '{{announcementTitle}}',
      title: '시스템 공지사항',
      content: `안녕하세요, {{recipientName}}님!

{{announcementTitle}}

{{announcementContent}}

{{churchName}} 드림`,
      variables: ['recipientName', 'announcementTitle', 'announcementContent', 'churchName'],
    },
    [NotificationChannel.SMS]: {
      title: '공지사항',
      content: '[공지] {{announcementTitle}} - {{churchName}}',
      variables: ['announcementTitle', 'churchName'],
    },
    [NotificationChannel.PUSH]: {
      title: '공지사항',
      content: '{{announcementTitle}}',
      variables: ['announcementTitle'],
    },
    [NotificationChannel.IN_APP]: {
      title: '시스템 공지',
      content: '{{announcementTitle}}',
      variables: ['announcementTitle'],
    },
  },

  [NotificationType.WELCOME_NEW_MEMBER]: {
    [NotificationChannel.EMAIL]: {
      subject: '새 교인을 환영합니다!',
      title: '새 교인 환영',
      content: `축하드립니다!

{{memberName}}님이 우리 교회 새 가족이 되셨습니다.
따뜻한 관심과 사랑으로 맞이해 주시기 바랍니다.

{{churchName}} 드림`,
      variables: ['memberName', 'churchName'],
    },
    [NotificationChannel.SMS]: {
      title: '새 교인',
      content: '{{memberName}}님이 새 교인으로 등록되었습니다 - {{churchName}}',
      variables: ['memberName', 'churchName'],
    },
    [NotificationChannel.PUSH]: {
      title: '새 교인',
      content: '{{memberName}}님이 새 교인으로 등록되었습니다',
      variables: ['memberName'],
    },
    [NotificationChannel.IN_APP]: {
      title: '새 교인 등록',
      content: '{{memberName}}님 등록 완료',
      variables: ['memberName'],
    },
  },

  [NotificationType.PAYMENT_REMINDER]: {
    [NotificationChannel.EMAIL]: {
      subject: '납부 안내',
      title: '납부 알림',
      content: `안녕하세요, {{recipientName}}님!

납부 안내드립니다.
자세한 내용은 시스템에서 확인해 주세요.

{{churchName}} 드림`,
      variables: ['recipientName', 'churchName'],
    },
    [NotificationChannel.SMS]: {
      title: '납부 안내',
      content: '납부 안내가 있습니다. 시스템을 확인해 주세요 - {{churchName}}',
      variables: ['churchName'],
    },
    [NotificationChannel.PUSH]: {
      title: '납부 안내',
      content: '납부 안내가 있습니다',
      variables: [],
    },
    [NotificationChannel.IN_APP]: {
      title: '납부 알림',
      content: '납부 안내가 있습니다',
      variables: [],
    },
  },

  [NotificationType.EXPENSE_WORKFLOW_STEP_APPROVAL]: {
    [NotificationChannel.EMAIL]: {
      subject: '지출결의서 승인 요청',
      title: '지출결의서 승인 요청',
      content: `안녕하세요, {{recipientName}}님!

{{requesterName}}님이 제출한 지출결의서의 승인을 요청드립니다.

• 제목: {{expenseTitle}}
• 금액: {{amount}}
• 승인 단계: {{stepName}}

지출결의서를 검토하신 후 승인 처리를 진행해 주시기 바랍니다.

{{churchName}} 드림`,
      variables: ['recipientName', 'requesterName', 'expenseTitle', 'amount', 'stepName', 'churchName'],
    },
    [NotificationChannel.SMS]: {
      title: '지출결의서 승인 요청',
      content: '{{requesterName}}님이 {{amount}} 지출결의서 승인을 요청했습니다. ({{stepName}} 단계) - {{churchName}}',
      variables: ['requesterName', 'amount', 'stepName', 'churchName'],
    },
    [NotificationChannel.PUSH]: {
      title: '승인 요청',
      content: '{{requesterName}}님의 지출결의서 승인이 필요합니다',
      variables: ['requesterName'],
    },
    [NotificationChannel.IN_APP]: {
      title: '지출결의서 승인 요청',
      content: '{{requesterName}}님이 {{amount}} 지출결의서 승인을 요청했습니다',
      variables: ['requesterName', 'amount'],
    },
  },

  [NotificationType.EXPENSE_WORKFLOW_APPROVED]: {
    [NotificationChannel.EMAIL]: {
      subject: '지출결의서 최종 승인 완료',
      title: '지출결의서 최종 승인 완료',
      content: `안녕하세요, {{recipientName}}님!

제출하신 지출결의서가 모든 승인 단계를 완료했습니다.

• 제목: {{expenseTitle}}
• 금액: {{amount}}
• 승인 완료일: {{approvalDate}}

지급 처리를 기다리고 있습니다.

{{churchName}} 드림`,
      variables: ['recipientName', 'expenseTitle', 'amount', 'approvalDate', 'churchName'],
    },
    [NotificationChannel.SMS]: {
      title: '지출결의서 최종 승인',
      content: '{{amount}} 지출결의서가 최종 승인되었습니다. 지급 처리를 기다리고 있습니다. - {{churchName}}',
      variables: ['amount', 'churchName'],
    },
    [NotificationChannel.PUSH]: {
      title: '승인 완료',
      content: '지출결의서가 최종 승인되었습니다',
      variables: [],
    },
    [NotificationChannel.IN_APP]: {
      title: '지출결의서 최종 승인 완료',
      content: '{{amount}} 지출결의서가 모든 승인을 완료했습니다',
      variables: ['amount'],
    },
  },

  [NotificationType.EXPENSE_WORKFLOW_REJECTED]: {
    [NotificationChannel.EMAIL]: {
      subject: '지출결의서 반려',
      title: '지출결의서 반려',
      content: `안녕하세요, {{recipientName}}님!

제출하신 지출결의서가 승인 과정에서 반려되었습니다.

• 제목: {{expenseTitle}}
• 금액: {{amount}}
• 반려 단계: {{stepName}}
• 반려 사유: {{rejectionReason}}

필요시 수정 후 다시 제출해 주시기 바랍니다.

{{churchName}} 드림`,
      variables: ['recipientName', 'expenseTitle', 'amount', 'stepName', 'rejectionReason', 'churchName'],
    },
    [NotificationChannel.SMS]: {
      title: '지출결의서 반려',
      content: '{{amount}} 지출결의서가 {{stepName}} 단계에서 반려되었습니다. 사유: {{rejectionReason}} - {{churchName}}',
      variables: ['amount', 'stepName', 'rejectionReason', 'churchName'],
    },
    [NotificationChannel.PUSH]: {
      title: '지출결의서 반려',
      content: '지출결의서가 반려되었습니다',
      variables: [],
    },
    [NotificationChannel.IN_APP]: {
      title: '지출결의서 반려',
      content: '{{amount}} 지출결의서가 반려되었습니다. 사유: {{rejectionReason}}',
      variables: ['amount', 'rejectionReason'],
    },
  },

  [NotificationType.CUSTOM]: {
    [NotificationChannel.EMAIL]: {
      subject: '{{title}}',
      title: '{{title}}',
      content: '{{message}}',
      variables: ['title', 'message'],
    },
    [NotificationChannel.SMS]: {
      title: '{{title}}',
      content: '{{message}}',
      variables: ['title', 'message'],
    },
    [NotificationChannel.PUSH]: {
      title: '{{title}}',
      content: '{{message}}',
      variables: ['title', 'message'],
    },
    [NotificationChannel.IN_APP]: {
      title: '{{title}}',
      content: '{{message}}',
      variables: ['title', 'message'],
    },
  },
}

export function renderTemplate(
  template: NotificationTemplate,
  data: NotificationTemplateData
): { subject?: string; title: string; content: string } {
  const replacePlaceholders = (text: string) => {
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return (data as any)[key] || match
    })
  }

  return {
    subject: template.subject ? replacePlaceholders(template.subject) : undefined,
    title: replacePlaceholders(template.title),
    content: replacePlaceholders(template.content),
  }
}