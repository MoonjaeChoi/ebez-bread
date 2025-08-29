'use client';

import { ReactNode } from 'react';
import { MobileHeader } from './mobile-header';
import { cn } from '@/lib/utils';

interface MobileLayoutProps {
  children: ReactNode;
  title: string;
  showNotifications?: boolean;
  notificationCount?: number;
  onNotificationClick?: () => void;
  className?: string;
  padding?: boolean;
}

export function MobileLayout({
  children,
  title,
  showNotifications = true,
  notificationCount = 0,
  onNotificationClick,
  className,
  padding = true
}: MobileLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <MobileHeader
        title={title}
        showNotifications={showNotifications}
        notificationCount={notificationCount}
        onNotificationClick={onNotificationClick}
      />
      
      <main className={cn(
        'flex-1',
        padding && 'p-4',
        className
      )}>
        {children}
      </main>
    </div>
  );
}

// 모바일 전용 카드 컴포넌트
export function MobileCard({
  children,
  className,
  title,
  subtitle,
  action
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className={cn(
      'bg-card rounded-lg border p-4 shadow-sm',
      'active:bg-accent/50 transition-colors',
      className
    )}>
      {(title || subtitle || action) && (
        <div className="flex items-center justify-between mb-3">
          <div>
            {title && (
              <h3 className="font-semibold text-foreground">{title}</h3>
            )}
            {subtitle && (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

// 모바일 전용 리스트 아이템
export function MobileListItem({
  children,
  onClick,
  className,
  disabled = false
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-center p-4 border-b border-border/50 last:border-b-0',
        onClick && !disabled && 'active:bg-accent/50 cursor-pointer transition-colors',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      onClick={!disabled ? onClick : undefined}
    >
      {children}
    </div>
  );
}

// 모바일 전용 액션 버튼
export function MobileActionButton({
  children,
  onClick,
  variant = 'primary',
  size = 'default',
  className,
  disabled = false
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'default' | 'large';
  className?: string;
  disabled?: boolean;
}) {
  const baseClasses = 'w-full font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variantClasses = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-primary',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 focus:ring-secondary',
    outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground focus:ring-primary',
    ghost: 'hover:bg-accent hover:text-accent-foreground focus:ring-accent'
  };
  
  const sizeClasses = {
    small: 'h-9 px-3 text-sm',
    default: 'h-11 px-8',
    large: 'h-13 px-12 text-lg'
  };

  return (
    <button
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      onClick={!disabled ? onClick : undefined}
      disabled={disabled}
    >
      {children}
    </button>
  );
}