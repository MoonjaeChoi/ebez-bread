'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { X, Download, Smartphone } from 'lucide-react';
import { usePWA } from '@/hooks/use-pwa';

export function InstallBanner() {
  const { isInstallable, isInstalled, installApp, isSupported, isHydrated } = usePWA();
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // 배너 표시 여부를 메모이제이션으로 최적화
  const shouldShowBanner = useMemo(() => {
    return isHydrated && isInitialized && isInstallable && !isInstalled && !isDismissed && isSupported;
  }, [isHydrated, isInitialized, isInstallable, isInstalled, isDismissed, isSupported]);

  // Hydration 후 localStorage 초기화 (한 번만)
  useEffect(() => {
    if (!isHydrated) return;
    
    // localStorage 접근을 한 번만 수행
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    setIsDismissed(dismissed === 'true');
    setIsInitialized(true);
  }, [isHydrated]);

  // 배너 표시 타이밍 제어
  useEffect(() => {
    if (!shouldShowBanner) {
      setIsVisible(false);
      return;
    }

    // 지연 없이 표시하여 깜빡임 방지
    setIsVisible(true);
  }, [shouldShowBanner]);

  const handleInstall = async () => {
    try {
      await installApp();
      setIsVisible(false);
    } catch (error) {
      console.error('Failed to install app:', error);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  // Hydration이 완료되지 않았거나 조건에 맞지 않으면 렌더링하지 않음
  if (!isHydrated || !isVisible || !shouldShowBanner) {
    return null;
  }

  return (
    <div 
      className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96"
      data-pwa-component="install-banner"
      style={{ 
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(100%)',
        transition: 'opacity 0.3s ease-out, transform 0.3s ease-out'
      }}
    >
      <Card className="p-4 shadow-lg border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Smartphone className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">앱 설치</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-6 w-6 p-0"
            aria-label="배너 닫기"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <p className="text-sm text-gray-700 mb-3">
          에벤에셀 교회 앱을 홈화면에 설치하여 더 빠르고 편리하게 이용하세요.
        </p>
        
        <div className="flex space-x-2">
          <Button 
            onClick={handleInstall} 
            className="flex-1 bg-blue-600 hover:bg-blue-700"
            size="sm"
          >
            <Download className="h-4 w-4 mr-2" />
            설치하기
          </Button>
          <Button 
            variant="outline" 
            onClick={handleDismiss}
            size="sm"
            className="px-3"
          >
            나중에
          </Button>
        </div>
      </Card>
    </div>
  );
}