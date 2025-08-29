'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import {
  Menu,
  Home,
  Users,
  Calendar,
  Bell,
  BarChart3,
  Settings,
  User,
  LogOut,
  Church,
  MessageSquare,
  CreditCard
} from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  description?: string;
}

const navItems: NavItem[] = [
  {
    title: '홈',
    href: '/',
    icon: Home,
    description: '대시보드 및 개요'
  },
  {
    title: '교인 관리',
    href: '/members',
    icon: Users,
    description: '교인 정보 및 관리'
  },
  {
    title: '예배 관리',
    href: '/services',
    icon: Church,
    description: '예배 및 출석 관리'
  },
  {
    title: '소그룹',
    href: '/groups',
    icon: MessageSquare,
    description: '소그룹 및 모임 관리'
  },
  {
    title: '행사 관리',
    href: '/events',
    icon: Calendar,
    description: '교회 행사 및 일정'
  },
  {
    title: '헌금 관리',
    href: '/donations',
    icon: CreditCard,
    description: '헌금 및 재정 관리'
  },
  {
    title: '통계',
    href: '/analytics',
    icon: BarChart3,
    description: '각종 통계 및 보고서'
  },
  {
    title: '알림',
    href: '/notifications',
    icon: Bell,
    badge: 3,
    description: '알림 및 공지사항'
  }
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();

  const handleSignOut = () => {
    signOut();
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          className="md:hidden h-10 w-10 p-0"
          aria-label="메뉴 열기"
        >
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      
      <SheetContent side="left" className="w-80 p-0">
        <div className="flex flex-col h-full">
          <SheetHeader className="p-6 border-b">
            <div className="flex items-center space-x-2">
              <Church className="h-8 w-8 text-blue-600" />
              <div>
                <SheetTitle className="text-left">에벤에셀 교회</SheetTitle>
                <p className="text-sm text-muted-foreground">관리 시스템</p>
              </div>
            </div>
          </SheetHeader>

          {/* User Info */}
          {session?.user && (
            <div className="p-6 border-b">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <User className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">{session.user.name}</p>
                  <p className="text-sm text-muted-foreground">{session.user.email}</p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Items */}
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'flex items-center justify-between w-full p-3 rounded-lg transition-colors',
                    'hover:bg-gray-100 focus:bg-gray-100 focus:outline-none',
                    isActive && 'bg-blue-100 text-blue-600'
                  )}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={cn(
                      'h-5 w-5',
                      isActive ? 'text-blue-600' : 'text-gray-600'
                    )} />
                    <div>
                      <p className="font-medium">{item.title}</p>
                      {item.description && (
                        <p className="text-xs text-muted-foreground">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>
                  {item.badge && (
                    <Badge variant="secondary" className="ml-auto">
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t space-y-2">
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className={cn(
                'flex items-center space-x-3 w-full p-3 rounded-lg transition-colors',
                'hover:bg-gray-100 focus:bg-gray-100 focus:outline-none',
                pathname === '/settings' && 'bg-blue-100 text-blue-600'
              )}
            >
              <Settings className="h-5 w-5" />
              <span>설정</span>
            </Link>

            {session && (
              <Button
                variant="ghost"
                className="w-full justify-start p-3 h-auto"
                onClick={handleSignOut}
              >
                <LogOut className="h-5 w-5 mr-3" />
                로그아웃
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}