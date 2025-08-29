'use client';

import { useEffect, useCallback, useRef } from 'react';
import { InstallBanner } from '@/components/mobile/install-banner';
import { usePushNotifications } from '@/hooks/use-push-notifications';

export function PWAProvider({ children }: { children: React.ReactNode }) {
  const { requestPermission, subscribeToNotifications, permission } = usePushNotifications();
  const isInitializedRef = useRef(false);

  // Service Worker 등록을 메모이제이션된 콜백으로 최적화
  const registerServiceWorker = useCallback(async () => {
    // PWA is disabled in development, skip service worker registration
    if (process.env.NODE_ENV === 'development') {
      console.log('PWA disabled in development mode');
      return;
    }

    if (!('serviceWorker' in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', registration);
      
      // Listen for service worker updates
      registration.addEventListener('updatefound', () => {
        console.log('New service worker found, reloading...');
        window.location.reload();
      });
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }, []);

  // 알림 초기화를 최적화
  const initializeNotifications = useCallback(async () => {
    if (permission === 'default') {
      try {
        const result = await requestPermission();
        if (result === 'granted') {
          await subscribeToNotifications();
        }
      } catch (error) {
        console.error('Failed to initialize notifications:', error);
      }
    } else if (permission === 'granted') {
      await subscribeToNotifications();
    }
  }, [permission, requestPermission, subscribeToNotifications]);

  // 초기화를 한 번만 수행
  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    // Service Worker 등록
    registerServiceWorker();

    // Service Worker 메시지 리스너 등록
    if ('serviceWorker' in navigator) {
      const handleMessage = (event: MessageEvent) => {
        if (event.data && event.data.type === 'BACKGROUND_SYNC') {
          console.log('Background sync completed:', event.data.payload);
        }
      };

      navigator.serviceWorker.addEventListener('message', handleMessage);
      
      // 알림 초기화 (지연 없이 실행하여 깜빡임 방지)
      const timer = setTimeout(initializeNotifications, 2000);

      return () => {
        clearTimeout(timer);
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      };
    }
  }, [registerServiceWorker, initializeNotifications]);

  return (
    <>
      {children}
      <InstallBanner />
    </>
  );
}