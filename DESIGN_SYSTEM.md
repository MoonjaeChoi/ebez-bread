# 에벤에셀(eVeNeZeR) 교회 관리 시스템 - 디자인 시스템

## 개요

에벤에셀(eVeNeZeR) 교회 관리 시스템을 위한 통합 디자인 시스템입니다. shadcn/ui를 기반으로 하여 일관성 있고 접근 가능한 사용자 인터페이스를 제공합니다.

## 목차

1. [디자인 원칙](#디자인-원칙)
2. [색상 시스템](#색상-시스템)
3. [타이포그래피](#타이포그래피)
4. [간격 및 레이아웃](#간격-및-레이아웃)
5. [컴포넌트](#컴포넌트)
6. [레이아웃 시스템](#레이아웃-시스템)
7. [접근성](#접근성)
8. [반응형 디자인](#반응형-디자인)

## 디자인 원칙

### 1. 일관성 (Consistency)
- 모든 페이지와 컴포넌트에서 동일한 디자인 언어 사용
- 통일된 색상, 간격, 타이포그래피 적용

### 2. 접근성 (Accessibility)
- WCAG 2.1 AA 기준 준수
- 적절한 색상 대비 비율 유지
- 키보드 네비게이션 지원
- 스크린 리더 호환성

### 3. 사용성 (Usability)
- 직관적이고 명확한 인터페이스
- 사용자의 작업 흐름을 고려한 설계
- 명확한 시각적 피드백 제공

### 4. 교회 정체성 (Church Identity)
- 교회의 가치와 분위기를 반영하는 디자인
- 따뜻하고 신뢰감 있는 색상 사용
- 깔끔하고 전문적인 외관

## 색상 시스템

### 주요 색상 (Primary Colors)

#### Light Mode
```css
--primary: 217 91% 60%;           /* Church Blue */
--primary-foreground: 0 0% 98%;   /* White */
--secondary: 47 96% 53%;          /* Warm Yellow */
--secondary-foreground: 215 25% 27%; /* Dark Gray */
```

#### Dark Mode
```css
--primary: 217 91% 65%;           /* Brighter Blue */
--primary-foreground: 215 28% 7%; /* Dark */
--secondary: 47 84% 58%;          /* Warm Yellow */
--secondary-foreground: 215 28% 7%; /* Dark */
```

### 상태 색상 (Status Colors)

```css
--success: 142 71% 45%;           /* Green */
--warning: 38 92% 50%;            /* Orange */
--destructive: 0 84% 60%;         /* Red */
```

### 교회 전용 색상 팔레트

```css
--church-50: #f8fafc;
--church-100: #f1f5f9;
--church-200: #e2e8f0;
--church-300: #cbd5e1;
--church-400: #94a3b8;
--church-500: #64748b;
--church-600: #475569;
--church-700: #334155;
--church-800: #1e293b;
--church-900: #0f172a;
--church-950: #020617;
```

### 차트 색상

```css
--chart-1: 217 91% 60%;  /* Primary Blue */
--chart-2: 47 96% 53%;   /* Secondary Yellow */
--chart-3: 142 71% 45%;  /* Success Green */
--chart-4: 271 81% 56%;  /* Purple Accent */
--chart-5: 346 84% 61%;  /* Rose Accent */
```

## 타이포그래피

### 폰트 스택

```css
font-family: 'Pretendard Variable', 'Pretendard', -apple-system,
  BlinkMacSystemFont, system-ui, Roboto, 'Helvetica Neue', 'Segoe UI',
  'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', sans-serif;
```

### 타이포그래피 스케일

- **헤드라인 1**: text-4xl (36px) / text-6xl (60px) - 메인 페이지 제목
- **헤드라인 2**: text-3xl (30px) / text-4xl (36px) - 섹션 제목
- **헤드라인 3**: text-2xl (24px) - 카드 제목
- **헤드라인 4**: text-xl (20px) - 서브섹션 제목
- **본문 대**: text-lg (18px) - 중요한 설명
- **본문**: text-base (16px) - 기본 텍스트
- **본문 소**: text-sm (14px) - 보조 텍스트
- **캡션**: text-xs (12px) - 라벨, 메타데이터

## 간격 및 레이아웃

### 간격 시스템

```css
/* 기본 Tailwind 간격에 추가된 사용자 정의 간격 */
--spacing-18: 4.5rem;   /* 72px */
--spacing-88: 22rem;    /* 352px */
--spacing-100: 25rem;   /* 400px */
--spacing-128: 32rem;   /* 512px */
```

### 그림자 시스템

```css
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
--shadow-glow: 0 0 20px hsl(var(--primary) / 0.3);
--shadow-glow-lg: 0 0 40px hsl(var(--primary) / 0.4);
```

### 테두리 반경

```css
--radius: 0.5rem;       /* 8px - 기본 */
--radius-md: calc(var(--radius) - 2px);  /* 6px */
--radius-sm: calc(var(--radius) - 4px);  /* 4px */
```

## 컴포넌트

### 사용 가능한 shadcn/ui 컴포넌트

- **기본**: Button, Card, Badge, Alert, Separator
- **폼**: Input, Textarea, Label, Select, Checkbox, Radio Group, Form
- **네비게이션**: Breadcrumb, Navigation Menu, Dropdown Menu
- **데이터 표시**: Table, Progress, Avatar, Calendar
- **레이아웃**: Sheet, Dialog, Popover, Hover Card, Tabs
- **피드백**: Toast, Toaster

### 컴포넌트 변형

#### Button 변형

```typescript
variant: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
size: 'default' | 'sm' | 'lg' | 'icon'
```

#### Badge 변형

```typescript
variant: 'default' | 'secondary' | 'destructive' | 'outline'
```

#### Alert 변형

```typescript
variant: 'default' | 'destructive'
```

## 레이아웃 시스템

### 레이아웃 컴포넌트

#### 1. PageLayout
일반 페이지용 기본 레이아웃

```typescript
interface PageLayoutProps {
  children: React.ReactNode;
  className?: string;
  withHeader?: boolean;
}
```

#### 2. DashboardLayout
대시보드 페이지용 레이아웃 (사이드바 포함)

```typescript
interface DashboardLayoutProps {
  children: React.ReactNode;
  className?: string;
}
```

#### 3. Header
사이트 헤더 컴포넌트

```typescript
interface HeaderProps {
  className?: string;
  onMenuClick?: () => void;
  showMenuButton?: boolean;
}
```

#### 4. Sidebar
대시보드 사이드바 컴포넌트

```typescript
interface SidebarProps {
  className?: string;
  isOpen?: boolean;
  onClose?: () => void;
}
```

### 그리드 시스템

```css
/* 기본 그리드 */
.grid-cols-1        /* 1열 */
.md:grid-cols-2     /* 중간 화면에서 2열 */
.lg:grid-cols-3     /* 큰 화면에서 3열 */
.xl:grid-cols-4     /* 매우 큰 화면에서 4열 */

/* 카드 레이아웃 */
.gap-4              /* 16px 간격 */
.gap-6              /* 24px 간격 */
.gap-8              /* 32px 간격 */
```

## 접근성

### 색상 대비

- 텍스트와 배경 간 대비비 4.5:1 이상 (AA 기준)
- 중요한 UI 요소는 3:1 이상

### 키보드 네비게이션

- 모든 인터랙티브 요소에 Tab 키로 접근 가능
- Focus 표시를 위한 링 스타일 적용
- 논리적인 Tab 순서 유지

### 스크린 리더 지원

- 의미있는 HTML 시멘틱 태그 사용
- 적절한 ARIA 라벨 및 설명 제공
- 이미지에 대체 텍스트 제공

### 접근성 유틸리티

```css
.sr-only           /* 스크린 리더 전용 텍스트 */
.focus-visible     /* 키보드 포커스시만 표시 */
.focus:outline-none /* 기본 아웃라인 제거 */
```

## 반응형 디자인

### 브레이크포인트

```css
xs: '475px'   /* 추가 소형 화면 */
sm: '640px'   /* 소형 화면 */
md: '768px'   /* 중간 화면 */
lg: '1024px'  /* 큰 화면 */
xl: '1280px'  /* 매우 큰 화면 */
2xl: '1536px' /* 초대형 화면 */
```

### 반응형 패턴

#### 모바일 우선 설계

```css
/* 모바일 기본 스타일 */
.text-sm
.p-4

/* 태블릿 이상 */
.md:text-base
.md:p-6

/* 데스크톱 이상 */
.lg:text-lg
.lg:p-8
```

#### 그리드 반응형

```css
.grid
.grid-cols-1      /* 모바일: 1열 */
.md:grid-cols-2   /* 태블릿: 2열 */
.lg:grid-cols-3   /* 데스크톱: 3열 */
```

#### 사이드바 반응형

- 모바일: 오버레이 사이드바
- 태블릿 이상: 고정 사이드바

## 사용법

### 1. 기본 페이지 구조

```tsx
import { PageLayout } from '@/components/layout';

export default function MyPage() {
  return (
    <PageLayout>
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold tracking-tight mb-6">
          페이지 제목
        </h1>
        {/* 페이지 내용 */}
      </div>
    </PageLayout>
  );
}
```

### 2. 대시보드 페이지 구조

```tsx
import { DashboardLayout } from '@/components/layout';

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            대시보드 제목
          </h1>
          <p className="text-muted-foreground">
            설명 텍스트
          </p>
        </div>
        {/* 페이지 내용 */}
      </div>
    </DashboardLayout>
  );
}
```

### 3. 카드 레이아웃

```tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
  <Card>
    <CardHeader>
      <CardTitle>카드 제목</CardTitle>
      <CardDescription>카드 설명</CardDescription>
    </CardHeader>
    <CardContent>
      {/* 카드 내용 */}
    </CardContent>
  </Card>
</div>
```

### 4. 폼 구조

```tsx
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
    <FormField
      control={form.control}
      name="fieldName"
      render={({ field }) => (
        <FormItem>
          <FormLabel>라벨</FormLabel>
          <FormControl>
            <Input placeholder="플레이스홀더" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <Button type="submit" className="w-full">
      제출
    </Button>
  </form>
</Form>
```

## 모범 사례

### 1. 색상 사용

- `hsl(var(--primary))` 형태로 CSS 변수 사용
- 하드코딩된 색상값 사용 금지
- 다크모드를 고려한 색상 선택

### 2. 간격

- Tailwind의 간격 시스템 활용
- 일관된 간격 사용 (4, 6, 8의 배수)
- `space-y-*` 유틸리티 활용

### 3. 타이포그래피

- 계층적 텍스트 크기 사용
- `font-*` 유틸리티로 가중치 조절
- `text-*` 유틸리티로 색상 적용

### 4. 컴포넌트 조합

- 작은 컴포넌트의 조합으로 복잡한 UI 구성
- Props 인터페이스를 명확히 정의
- 재사용 가능한 컴포넌트 작성

## 성능 최적화

### 1. CSS 최적화

- Tailwind CSS의 Purge 기능 활용
- 사용하지 않는 스타일 제거
- 중복 스타일 방지

### 2. 컴포넌트 최적화

- React.memo() 적절히 사용
- 불필요한 리렌더링 방지
- 코드 분할 적용

### 3. 이미지 최적화

- Next.js Image 컴포넌트 사용
- 적절한 이미지 형식 선택
- 지연 로딩 적용

## 향후 계획

1. **다크모드 완전 지원**: 모든 컴포넌트에서 다크모드 테스트 완료
2. **애니메이션 시스템**: Framer Motion을 활용한 부드러운 전환 효과
3. **테마 커스터마이징**: 교회별 색상 테마 설정 기능
4. **접근성 강화**: 더 많은 ARIA 속성 및 키보드 네비게이션 개선
5. **모바일 최적화**: PWA 기능 강화 및 모바일 UX 개선

---

이 디자인 시스템은 에벤에셀(eVeNeZeR) 교회 관리 시스템의 일관성 있고 사용자 친화적인 인터페이스를 보장합니다. 지속적인 개선과 업데이트를 통해 더 나은 사용자 경험을 제공할 예정입니다.