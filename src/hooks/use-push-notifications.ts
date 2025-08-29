'use client';

import { useEffect, useState } from 'react';

interface PushNotificationHook {
  permission: NotificationPermission;
  isSupported: boolean;
  requestPermission: () => Promise<NotificationPermission>;
  sendNotification: (title: string, options?: NotificationOptions) => Promise<void>;
  subscribeToNotifications: () => Promise<PushSubscription | null>;
  unsubscribeFromNotifications: () => Promise<boolean>;
  subscription: PushSubscription | null;
}

export function usePushNotifications(): PushNotificationHook {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check if notifications are supported
    setIsSupported('Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window);

    if ('Notification' in window) {
      setPermission(Notification.permission);
      
      // Get existing subscription
      getExistingSubscription();
    }
  }, []);

  const getExistingSubscription = async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        const existingSubscription = await registration.pushManager.getSubscription();
        setSubscription(existingSubscription);
      } catch (error) {
        console.error('Error getting existing subscription:', error);
      }
    }
  };

  const requestPermission = async (): Promise<NotificationPermission> => {
    if (!isSupported) {
      throw new Error('Notifications are not supported');
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      throw error;
    }
  };

  const sendNotification = async (title: string, options?: NotificationOptions): Promise<void> => {
    if (permission !== 'granted') {
      throw new Error('Notification permission not granted');
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        actions: [
          {
            action: 'open',
            title: '열기',
            icon: '/icons/icon-72x72.png'
          },
          {
            action: 'close',
            title: '닫기',
            icon: '/icons/icon-72x72.png'
          }
        ],
        ...options
      } as any);
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  };

  const subscribeToNotifications = async (): Promise<PushSubscription | null> => {
    if (!isSupported || permission !== 'granted') {
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // VAPID public key from environment
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BOjjwehQsblq6hTUsQE9FtLEf83drP7s2aV1maCQPnq-T5MfuUdLpnfWoW37iihV36EoHkqbhfyOMnbPVlFzMGA';
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidPublicKey,
      });

      setSubscription(subscription);
      
      // Send subscription to server
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscription),
      });

      return subscription;
    } catch (error) {
      console.error('Error subscribing to notifications:', error);
      return null;
    }
  };

  const unsubscribeFromNotifications = async (): Promise<boolean> => {
    if (!subscription) {
      return false;
    }

    try {
      const success = await subscription.unsubscribe();
      
      if (success) {
        setSubscription(null);
        
        // Remove subscription from server
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(subscription),
        });
      }

      return success;
    } catch (error) {
      console.error('Error unsubscribing from notifications:', error);
      return false;
    }
  };

  return {
    permission,
    isSupported,
    requestPermission,
    sendNotification,
    subscribeToNotifications,
    unsubscribeFromNotifications,
    subscription,
  };
}