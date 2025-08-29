import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import webpush from 'web-push';

// Configure web-push with VAPID keys
// You should generate your own VAPID keys using: npx web-push generate-vapid-keys
const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY || 'BKQh9A-Q8B1HXRXbQFaGCJHJN8cXl9pDfKx2Q7_3Zf8vKGxLB2VWH6jKFgPQ3DKLQNz8RFJyGH4jQW9K6Z8hGmA',
  privateKey: process.env.VAPID_PRIVATE_KEY || 'example-private-key',
};

webpush.setVapidDetails(
  'mailto:admin@ebenezer-church.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has admin permissions
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== 'SUPER_ADMIN' && user?.role !== 'MINISTER') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const { payload, userIds } = await request.json();

    if (!payload || !payload.title || !payload.body) {
      return NextResponse.json(
        { error: 'Invalid payload data' },
        { status: 400 }
      );
    }

    // Get subscriptions for target users
    const whereCondition = userIds && userIds.length > 0 
      ? { userId: { in: userIds } }
      : {};

    const subscriptions = await prisma.pushSubscription.findMany({
      where: whereCondition,
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
    });

    if (subscriptions.length === 0) {
      return NextResponse.json(
        { error: 'No subscriptions found' },
        { status: 404 }
      );
    }

    // Prepare notification payload
    const notificationPayload: PushNotificationPayload = {
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/icons/icon-192x192.png',
      badge: payload.badge || '/icons/icon-72x72.png',
      url: payload.url || '/',
      actions: payload.actions || [
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
    };

    // Send notifications
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            sub.subscription as any,
            JSON.stringify(notificationPayload),
            {
              urgency: 'normal',
              TTL: 24 * 60 * 60, // 24 hours
            }
          );
          return { success: true, userId: sub.userId };
        } catch (error) {
          console.error(`Failed to send notification to user ${sub.userId}:`, error);
          
          // Remove invalid subscription
          if (error && (error as any).statusCode === 410) {
            await prisma.pushSubscription.delete({
              where: { id: sub.id },
            });
          }
          
          return { success: false, userId: sub.userId, error: (error as Error).message };
        }
      })
    );

    const successful = results.filter(result => 
      result.status === 'fulfilled' && result.value.success
    ).length;

    const failed = results.length - successful;

    return NextResponse.json({
      success: true,
      message: `Notifications sent`,
      stats: {
        total: results.length,
        successful,
        failed,
      },
    });
  } catch (error) {
    console.error('Failed to send push notifications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}