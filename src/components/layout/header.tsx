'use client';

import React from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  User, 
  Settings, 
  LogOut, 
  Home,
  Menu,
  Sun,
  Moon,
  Bell
} from 'lucide-react';

interface HeaderProps {
  className?: string;
  onMenuClick?: () => void;
  showMenuButton?: boolean;
}

export function Header({ className, onMenuClick, showMenuButton = false }: HeaderProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' });
  };

  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleDisplayName = (role?: string) => {
    const roleMap = {
      ADMIN: '관리자',
      PASTOR: '목사',
      ELDER: '장로',
      DEACON: '집사',
      MEMBER: '교인',
    };
    return roleMap[role as keyof typeof roleMap] || role || '교인';
  };

  const isHomePage = pathname === '/';
  const isDashboard = pathname?.startsWith('/dashboard');

  return (
    <header className={cn(
      'sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60',
      className
    )}>
      <div className="container flex h-16 items-center">
        {/* Menu Button for Mobile */}
        {showMenuButton && (
          <Button
            variant="ghost"
            size="icon"
            className="mr-3 md:hidden"
            onClick={onMenuClick}
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">메뉴 열기</span>
          </Button>
        )}

        {/* Logo/Title */}
        <div className="mr-4 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <div className="rounded-md bg-primary p-1.5">
              <Home className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold">{process.env.NEXT_PUBLIC_CHURCH_NAME || '에벤에셀'}</span>
              {isDashboard && (
                <span className="text-sm text-muted-foreground">관리 시스템</span>
              )}
            </div>
          </Link>
        </div>

        {/* Mobile Logo */}
        <div className="flex-1 md:hidden">
          <Link href="/" className="flex items-center space-x-2">
            <div className="rounded-md bg-primary p-1.5">
              <Home className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold">{process.env.NEXT_PUBLIC_CHURCH_NAME || '에벤에셀'}</span>
          </Link>
        </div>

        {/* Right Side */}
        <div className="flex items-center space-x-4">
          {/* Notifications (if logged in) */}
          {session && (
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-destructive"></div>
              <span className="sr-only">알림</span>
            </Button>
          )}

          {/* User Menu */}
          {session ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-auto space-x-2 px-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={session.user.image || ''} alt={session.user.name || ''} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                      {getInitials(session.user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:flex md:flex-col md:items-start">
                    <span className="text-sm font-medium">{session.user.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {getRoleDisplayName(session.user.role)}
                    </Badge>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{session.user.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {session.user.email}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {session.user.churchName}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/dashboard')}>
                  <User className="mr-2 h-4 w-4" />
                  <span>대시보드</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/dashboard/notifications')}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>설정</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>로그아웃</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            !isHomePage && (
              <Button asChild>
                <Link href="/auth/signin">로그인</Link>
              </Button>
            )
          )}
        </div>
      </div>
    </header>
  );
}