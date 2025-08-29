'use client';

import { useState, useEffect } from 'react';
import { usePWA } from '@/hooks/use-pwa';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { WifiOff, Wifi } from 'lucide-react';

export function OfflineBanner() {
  const { isOnline, hasBeenOffline } = usePWA();
  const [showOnlineMessage, setShowOnlineMessage] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // 클라이언트 사이드에서만 렌더링
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient && hasBeenOffline && isOnline && !showOnlineMessage) {
      setShowOnlineMessage(true);
      const timer = setTimeout(() => {
        setShowOnlineMessage(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isClient, isOnline, hasBeenOffline, showOnlineMessage]);

  // 서버 사이드 렌더링 중이거나 클라이언트 초기화 전에는 렌더링하지 않음
  if (!isClient) {
    return null;
  }

  // 오프라인 상태일 때
  if (!isOnline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50">
        <Alert className="rounded-none border-0 border-b bg-orange-50 border-orange-200">
          <WifiOff className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            인터넷 연결이 끊어졌습니다. 일부 기능이 제한될 수 있습니다.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // 온라인으로 복구되었을 때만 잠시 표시
  if (showOnlineMessage) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50">
        <Alert className="rounded-none border-0 border-b bg-green-50 border-green-200">
          <Wifi className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            인터넷 연결이 복구되었습니다.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return null;
}

// 이 컴포넌트는 더 이상 사용하지 않음
export function OnlineBanner() {
  return null;
}