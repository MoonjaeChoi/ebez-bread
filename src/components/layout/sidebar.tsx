'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { usePermissions } from '@/hooks/use-permissions';
import {
  Home,
  Users,
  DollarSign,
  UserCheck,
  Heart,
  FileText,
  BarChart3,
  Bell,
  Settings,
  Database,
  ChevronLeft,
  Menu,
  Calculator,
  PieChart,
  CheckSquare,
} from 'lucide-react';

interface SidebarProps {
  className?: string;
  isOpen?: boolean;
  onClose?: () => void;
}

const navigationItems = [
  {
    title: '대시보드',
    href: '/dashboard',
    icon: Home,
    permission: null, // Always available
  },
  {
    title: '교인 관리',
    href: '/dashboard/members',
    icon: Users,
    permission: 'members',
  },
  {
    title: '헌금 관리',
    href: '/dashboard/offerings',
    icon: DollarSign,
    permission: 'finances',
  },
  {
    title: '출석 관리',
    href: '/dashboard/attendance',
    icon: UserCheck,
    permission: 'attendance',
  },
  {
    title: '심방 관리',
    href: '/dashboard/visitations',
    icon: Heart,
    permission: 'visitations',
  },
  {
    title: '지출결의서',
    href: '/dashboard/expense-reports',
    icon: FileText,
    permission: 'expenses',
  },
  {
    title: '결재 관리',
    href: '/dashboard/approvals',
    icon: CheckSquare,
    permission: 'expenses',
  },
  {
    title: '회계 관리',
    href: '/dashboard/accounting',
    icon: Calculator,
    permission: 'finances',
  },
  {
    title: '예산 배정',
    href: '/dashboard/budgets/allocation',
    icon: PieChart,
    permission: 'finances',
  },
  {
    title: '보고서',
    href: '/dashboard/reports',
    icon: BarChart3,
    permission: 'reports',
  },
];

const systemItems = [
  {
    title: '알림 설정',
    href: '/dashboard/notifications',
    icon: Bell,
    permission: null,
  },
  {
    title: '데이터 관리',
    href: '/dashboard/data-management',
    icon: Database,
    permission: 'admin',
  },
];

export function Sidebar({ className, isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { accessibleMenus } = usePermissions();

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname?.startsWith(href) ?? false;
  };

  const canAccess = (permission: string | null) => {
    if (!permission) return true;
    return accessibleMenus[permission as keyof typeof accessibleMenus];
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 h-screen w-64 transform border-r bg-card transition-transform duration-200 ease-in-out md:relative md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          className
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-16 items-center justify-between border-b px-4">
            <div className="flex items-center space-x-2">
              <div className="rounded-md bg-primary p-1.5">
                <Home className="h-4 w-4 text-primary-foreground" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold">{process.env.NEXT_PUBLIC_CHURCH_NAME || '에벤에셀'}</span>
                <span className="text-xs text-muted-foreground">관리 시스템</span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={onClose}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto p-4">
            <nav className="space-y-2">
              {/* Main Navigation */}
              <div className="space-y-1">
                <h3 className="px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  주요 기능
                </h3>
                {navigationItems.map((item) => {
                  if (!canAccess(item.permission)) return null;
                  
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  
                  return (
                    <Button
                      key={item.href}
                      asChild
                      variant={active ? 'default' : 'ghost'}
                      className={cn(
                        'w-full justify-start',
                        active && 'bg-primary text-primary-foreground shadow-md'
                      )}
                    >
                      <Link href={item.href} onClick={onClose}>
                        <Icon className="mr-3 h-4 w-4" />
                        {item.title}
                      </Link>
                    </Button>
                  );
                })}
              </div>

              <Separator className="my-4" />

              {/* System Items */}
              <div className="space-y-1">
                <h3 className="px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  시스템
                </h3>
                {systemItems.map((item) => {
                  if (!canAccess(item.permission)) return null;
                  
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  
                  return (
                    <Button
                      key={item.href}
                      asChild
                      variant={active ? 'default' : 'ghost'}
                      className={cn(
                        'w-full justify-start',
                        active && 'bg-primary text-primary-foreground shadow-md'
                      )}
                    >
                      <Link href={item.href} onClick={onClose}>
                        <Icon className="mr-3 h-4 w-4" />
                        {item.title}
                        {item.permission === 'admin' && (
                          <Badge variant="secondary" className="ml-auto text-xs">
                            관리자
                          </Badge>
                        )}
                      </Link>
                    </Button>
                  );
                })}
              </div>
            </nav>
          </div>

          {/* Footer */}
          <div className="border-t p-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                © 2024 {process.env.NEXT_PUBLIC_CHURCH_NAME || '에벤에셀'}
              </p>
              <p className="text-xs text-muted-foreground">
                Church Management System
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}