'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { usePWA } from '@/hooks/use-pwa';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { 
  Smartphone, 
  Download, 
  Bell, 
  Wifi, 
  WifiOff, 
  Settings, 
  Check,
  X,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

export function PWASettings() {
  const { isInstallable, isInstalled, isOnline, installApp, isSupported } = usePWA();
  const { 
    permission, 
    isSupported: notificationSupported, 
    requestPermission,
    subscribeToNotifications,
    unsubscribeFromNotifications,
    subscription
  } = usePushNotifications();

  const [pushEnabled, setPushEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setPushEnabled(permission === 'granted' && !!subscription);
  }, [permission, subscription]);

  const handleInstallApp = async () => {
    try {
      setIsLoading(true);
      await installApp();
      toast.success('앱이 성공적으로 설치되었습니다!');
    } catch (error) {
      toast.error('앱 설치에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTogglePushNotifications = async (enabled: boolean) => {
    try {
      setIsLoading(true);

      if (enabled) {
        const result = await requestPermission();
        if (result === 'granted') {
          await subscribeToNotifications();
          setPushEnabled(true);
          toast.success('푸시 알림이 활성화되었습니다.');
        } else {
          setPushEnabled(false);
          toast.error('푸시 알림 권한이 거부되었습니다.');
        }
      } else {
        await unsubscribeFromNotifications();
        setPushEnabled(false);
        toast.success('푸시 알림이 비활성화되었습니다.');
      }
    } catch (error) {
      toast.error('설정 변경에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const clearCache = async () => {
    try {
      setIsLoading(true);
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
        toast.success('캐시가 삭제되었습니다. 페이지를 새로고침합니다.');
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } catch (error) {
      toast.error('캐시 삭제에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* PWA 지원 상태 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Smartphone className="h-5 w-5" />
            <span>Progressive Web App (PWA)</span>
          </CardTitle>
          <CardDescription>
            앱 기능 및 오프라인 지원 상태
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span>PWA 지원</span>
            <Badge variant={isSupported ? 'default' : 'secondary'}>
              {isSupported ? (
                <><Check className="h-3 w-3 mr-1" /> 지원됨</>
              ) : (
                <><X className="h-3 w-3 mr-1" /> 지원되지 않음</>
              )}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <span>설치 상태</span>
            <Badge variant={isInstalled ? 'default' : 'outline'}>
              {isInstalled ? (
                <><Check className="h-3 w-3 mr-1" /> 설치됨</>
              ) : (
                <><Download className="h-3 w-3 mr-1" /> 미설치</>
              )}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <span>네트워크 상태</span>
            <Badge variant={isOnline ? 'default' : 'destructive'}>
              {isOnline ? (
                <><Wifi className="h-3 w-3 mr-1" /> 온라인</>
              ) : (
                <><WifiOff className="h-3 w-3 mr-1" /> 오프라인</>
              )}
            </Badge>
          </div>

          {isInstallable && !isInstalled && (
            <>
              <Separator />
              <Button 
                onClick={handleInstallApp} 
                disabled={isLoading}
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                홈화면에 앱 설치하기
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* 푸시 알림 설정 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="h-5 w-5" />
            <span>푸시 알림</span>
          </CardTitle>
          <CardDescription>
            중요한 알림을 실시간으로 받아보세요
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span>알림 지원</span>
            <Badge variant={notificationSupported ? 'default' : 'secondary'}>
              {notificationSupported ? (
                <><Check className="h-3 w-3 mr-1" /> 지원됨</>
              ) : (
                <><X className="h-3 w-3 mr-1" /> 지원되지 않음</>
              )}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <span>권한 상태</span>
            <Badge variant={
              permission === 'granted' ? 'default' : 
              permission === 'denied' ? 'destructive' : 'outline'
            }>
              {permission === 'granted' && <><Check className="h-3 w-3 mr-1" /> 허용됨</>}
              {permission === 'denied' && <><X className="h-3 w-3 mr-1" /> 거부됨</>}
              {permission === 'default' && <><AlertCircle className="h-3 w-3 mr-1" /> 미설정</>}
            </Badge>
          </div>

          {notificationSupported && (
            <>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-sm font-medium">푸시 알림 활성화</div>
                  <div className="text-xs text-muted-foreground">
                    교회 소식과 중요한 알림을 받습니다
                  </div>
                </div>
                <Switch
                  checked={pushEnabled}
                  onCheckedChange={handleTogglePushNotifications}
                  disabled={isLoading || permission === 'denied'}
                />
              </div>
            </>
          )}

          {permission === 'denied' && (
            <div className="text-xs text-muted-foreground bg-orange-50 p-3 rounded-lg border border-orange-200">
              알림 권한이 거부되어 있습니다. 브라우저 설정에서 알림을 허용해주세요.
            </div>
          )}
        </CardContent>
      </Card>

      {/* 캐시 관리 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>캐시 관리</span>
          </CardTitle>
          <CardDescription>
            저장된 데이터와 캐시를 관리합니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            앱이 느리거나 오래된 정보가 표시될 때 캐시를 삭제해보세요.
          </div>
          
          <Button 
            variant="outline" 
            onClick={clearCache}
            disabled={isLoading}
            className="w-full"
          >
            캐시 삭제 및 새로고침
          </Button>
        </CardContent>
      </Card>

      {/* 오프라인 기능 정보 */}
      <Card>
        <CardHeader>
          <CardTitle>오프라인 기능</CardTitle>
          <CardDescription>
            인터넷 연결 없이도 사용할 수 있는 기능들
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center space-x-2">
              <div className="h-1.5 w-1.5 bg-green-500 rounded-full" />
              <span>교인 정보 조회 (캐시된 데이터)</span>
            </li>
            <li className="flex items-center space-x-2">
              <div className="h-1.5 w-1.5 bg-green-500 rounded-full" />
              <span>예배 순서 및 일정 확인</span>
            </li>
            <li className="flex items-center space-x-2">
              <div className="h-1.5 w-1.5 bg-green-500 rounded-full" />
              <span>이전 공지사항 읽기</span>
            </li>
            <li className="flex items-center space-x-2">
              <div className="h-1.5 w-1.5 bg-yellow-500 rounded-full" />
              <span>새로운 데이터 입력 (동기화 대기)</span>
            </li>
            <li className="flex items-center space-x-2">
              <div className="h-1.5 w-1.5 bg-red-500 rounded-full" />
              <span>실시간 데이터 업데이트</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}