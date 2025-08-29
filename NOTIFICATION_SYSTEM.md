# 알림 시스템 가이드

에벤에셀 교회 관리 시스템의 이메일/SMS 알림 시스템입니다.

## 주요 기능

### 1. 알림 채널
- **이메일**: Nodemailer를 활용한 SMTP 이메일 발송
- **SMS**: Twilio를 활용한 SMS 발송  
- **인앱**: 시스템 내 알림 (확장 가능)
- **푸시**: 푸시 알림 (확장 가능)

### 2. 알림 유형
- **생일 축하**: 교인 생일 며칠 전 자동 알림
- **심방 알림**: 심방 일정 몇 시간 전 자동 알림
- **지출결의서 승인**: 승인 요청 및 결과 알림
- **시스템 공지**: 관리자 공지사항

### 3. 알림 큐 시스템
- Redis 기반 비동기 처리
- 우선순위별 큐 관리 (URGENT, HIGH, NORMAL, LOW)
- 자동 재시도 메커니즘 (최대 3회)
- 배치 처리로 성능 최적화

## 설정 방법

### 1. 환경변수 설정

`.env` 파일에 다음 환경변수를 설정하세요:

```bash
# Email Service (Nodemailer)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"
SMTP_FROM="에벤에셀 교회 <noreply@ebenezer.kr>"

# SMS Service (Twilio)
TWILIO_ACCOUNT_SID="your-twilio-account-sid"
TWILIO_AUTH_TOKEN="your-twilio-auth-token"
TWILIO_PHONE_NUMBER="your-twilio-phone-number"

# Notification Settings
NOTIFICATION_QUEUE_REDIS_URL="redis://localhost:6379/1"
NOTIFICATION_RETRY_DELAY_MS="60000"
NOTIFICATION_MAX_RETRIES="3"
NOTIFICATION_BATCH_SIZE="50"
```

### 2. 이메일 설정 (Gmail 예시)

1. Gmail 계정에서 2단계 인증 활성화
2. 앱 비밀번호 생성 ([Google 계정 설정](https://myaccount.google.com/apppasswords))
3. 생성된 앱 비밀번호를 `SMTP_PASSWORD`에 설정

### 3. SMS 설정 (Twilio)

1. [Twilio 콘솔](https://console.twilio.com/)에서 계정 생성
2. Phone Number 구매 (한국 번호 권장)
3. Account SID, Auth Token, Phone Number를 환경변수에 설정

### 4. Redis 설정

```bash
# Docker로 Redis 실행
docker run -d --name redis -p 6379:6379 redis:latest

# 또는 로컬 설치
brew install redis
redis-server
```

## 사용 방법

### 1. 사용자 알림 설정

대시보드 → 알림 설정에서:
- 알림 채널 활성화/비활성화
- 알림 유형별 수신 설정
- 생일 알림 시기 설정 (1-30일)
- 심방 알림 시기 설정 (1-168시간)

### 2. 자동 알림

시스템이 자동으로 다음 상황에 알림을 발송합니다:
- **생일**: 매일 오전 9시 실행
- **심방**: 매일 오전 8시, 오후 6시 실행
- **지출결의서**: 즉시 발송 (승인 요청/결과)

### 3. 수동 알림 (관리자)

알림 설정 → 관리 탭에서:
- 생일/심방 알림 수동 실행
- 이메일/SMS 연결 테스트
- 큐 상태 모니터링

## API 사용법

### tRPC 라우터

```typescript
// 알림 설정 조회
const settings = trpc.notifications.getSettings.useQuery()

// 알림 설정 업데이트
const updateSettings = trpc.notifications.updateSettings.useMutation()

// 알림 기록 조회
const history = trpc.notifications.getHistory.useQuery({
  page: 1,
  limit: 20,
  type: 'BIRTHDAY_REMINDER',
  channel: 'EMAIL'
})

// 사용자 정의 알림 발송 (관리자)
const sendCustom = trpc.notifications.sendCustom.useMutation()
```

### 직접 서비스 사용

```typescript
import { notificationService } from '@/lib/notifications'

// 생일 알림 발송
await notificationService.sendBirthdayReminders(churchId)

// 지출결의서 승인 요청
await notificationService.sendExpenseApprovalRequest({
  expenseReportId: 'xxx',
  title: '사무용품 구입',
  amount: 50000,
  category: '사무용품',
  requesterId: 'xxx',
  requesterName: '김철수',
})

// 사용자 정의 알림
await notificationService.sendCustomNotification({
  type: 'CUSTOM',
  channel: 'EMAIL',
  recipientId: 'xxx',
  email: 'user@example.com',
  title: '제목',
  message: '내용',
  churchId: 'xxx'
})
```

## 아키텍처

```
알림 요청 → 알림 큐 → 백그라운드 처리 → 채널별 발송 → 기록 저장
     ↓           ↓            ↓             ↓           ↓
   Service   Redis Queue   Worker       Email/SMS   History
```

### 주요 컴포넌트

- **NotificationService**: 비즈니스 로직 처리
- **NotificationQueue**: Redis 기반 큐 관리
- **EmailService**: Nodemailer 이메일 발송
- **SMSService**: Twilio SMS 발송
- **NotificationCron**: 스케줄링 작업

### 데이터베이스 스키마

- **NotificationSetting**: 사용자별 알림 설정
- **NotificationQueue**: 발송 대기 큐
- **NotificationHistory**: 발송 이력
- **NotificationTemplate**: 커스텀 템플릿

## 확장 가능성

### 1. 새로운 알림 채널 추가

```typescript
// src/lib/notifications/channels/push.ts
export class PushService {
  async sendPush(options: PushOptions): Promise<QueueProcessResult> {
    // Firebase FCM 연동
  }
}
```

### 2. 새로운 알림 유형 추가

1. Prisma 스키마의 `NotificationType` enum에 추가
2. 템플릿 파일에 기본 템플릿 추가
3. 트리거 로직 구현

### 3. 대량 발송 최적화

```typescript
// 배치 크기 조정
NOTIFICATION_BATCH_SIZE="100"

// 여러 큐 워커 실행
const worker1 = new NotificationWorker('queue1')
const worker2 = new NotificationWorker('queue2')
```

## 모니터링

### 1. 로그 모니터링

```bash
# 알림 관련 로그 확인
tail -f logs/notification.log | grep ERROR
```

### 2. 큐 상태 확인

대시보드 → 알림 설정 → 관리 탭에서 실시간 모니터링

### 3. 성능 메트릭

- 발송 성공률
- 평균 처리 시간
- 큐 대기 시간
- 에러율

## 문제 해결

### 1. 이메일이 발송되지 않는 경우

- SMTP 설정 확인
- 앱 비밀번호 재생성
- 방화벽/보안 소프트웨어 확인

### 2. SMS가 발송되지 않는 경우

- Twilio 계정 잔액 확인
- 전화번호 포맷 확인 (+82 형식)
- Twilio Console에서 로그 확인

### 3. 큐가 처리되지 않는 경우

- Redis 연결 상태 확인
- 큐 워커 프로세스 상태 확인
- 메모리 사용량 확인

## 보안 고려사항

1. **환경변수 보호**: 중요한 API 키는 환경변수로 관리
2. **전화번호 검증**: SMS 발송 전 번호 포맷 검증
3. **스팸 방지**: 같은 수신자에게 중복 발송 방지
4. **개인정보 보호**: 알림 내용에 민감 정보 포함 금지

## 라이선스 및 비용

- **Nodemailer**: MIT License (무료)
- **Twilio**: Pay-as-you-go (SMS당 과금)
- **Redis**: BSD License (무료)

## 지원

문제가 발생하면 다음을 확인하세요:

1. 환경변수 설정
2. 서비스 상태 (Redis, SMTP, Twilio)
3. 네트워크 연결
4. 로그 파일

추가 지원이 필요하면 시스템 관리자에게 문의하세요.