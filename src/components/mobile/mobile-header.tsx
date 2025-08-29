'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MobileNav } from './mobile-nav';
import { usePWA } from '@/hooks/use-pwa';
import { Bell, Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileHeaderProps {
  title: string;
  showNotifications?: boolean;
  notificationCount?: number;
  onNotificationClick?: () => void;
}

export function MobileHeader({
  title,
  showNotifications = true,
  notificationCount = 0,
  onNotificationClick
}: MobileHeaderProps) {
  const { isOnline, isInstalled } = usePWA();

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center px-4">
        <MobileNav />
        
        <div className="flex-1 text-center">
          <h1 className="text-lg font-semibold truncate px-4">{title}</h1>
        </div>

        <div className="flex items-center space-x-2">
          {/* Network Status Indicator */}
          <div className="flex items-center">
            {isOnline ? (
              <Wifi className="h-4 w-4 text-green-600" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-600" />
            )}
          </div>

          {/* PWA Install Status */}
          {isInstalled && (
            <div className="h-2 w-2 rounded-full bg-blue-600" title="앱으로 설치됨" />
          )}

          {/* Notifications */}
          {showNotifications && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 relative"
              onClick={onNotificationClick}
            >
              <Bell className="h-4 w-4" />
              {notificationCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs flex items-center justify-center"
                >
                  {notificationCount > 99 ? '99+' : notificationCount}
                </Badge>
              )}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}