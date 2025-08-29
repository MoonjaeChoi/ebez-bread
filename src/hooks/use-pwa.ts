'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAHook {
  isInstallable: boolean;
  isInstalled: boolean;
  isOnline: boolean;
  hasBeenOffline: boolean;
  installApp: () => Promise<void>;
  isSupported: boolean;
  isHydrated: boolean;
}

export function usePWA(): PWAHook {
  // SSR 안전한 초기값들 - hydration 불일치 방지
  const [isHydrated, setIsHydrated] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(true); // SSR 기본값
  const [hasBeenOffline, setHasBeenOffline] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  
  // PWA 지원 여부는 메모이제이션으로 최적화
  const isSupported = useMemo(() => {
    if (!isHydrated) return false;
    return 'serviceWorker' in navigator && 'PushManager' in window;
  }, [isHydrated]);

  // Hydration 완료 후 한 번만 실행되는 초기화
  useEffect(() => {
    setIsHydrated(true);
    
    // 클라이언트 전용 상태 초기화를 배치로 처리
    const initializeClientState = () => {
      // 온라인 상태 동기화
      setIsOnline(navigator.onLine);
      
      // 설치 상태 확인
      const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
      const isInWebAppMode = (navigator as any).standalone === true;
      setIsInstalled(isInStandaloneMode || isInWebAppMode);
    };

    // 이벤트 핸들러들을 useCallback으로 최적화
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => {
      setIsOnline(false);
      setHasBeenOffline(true);
    };

    // 클라이언트 상태 초기화
    initializeClientState();

    // 이벤트 리스너 등록
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []); // 빈 dependency로 한 번만 실행

  // useCallback으로 installApp 최적화
  const installApp = useCallback(async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        console.log('PWA installation accepted');
      } else {
        console.log('PWA installation dismissed');
      }
    } catch (error) {
      console.error('Error during PWA installation:', error);
    } finally {
      setDeferredPrompt(null);
      setIsInstallable(false);
    }
  }, [deferredPrompt]);

  return {
    isInstallable,
    isInstalled,
    isOnline,
    hasBeenOffline,
    installApp,
    isSupported,
    isHydrated,
  };
}