import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { AuthSessionProvider } from '@/components/providers/session-provider';
import { TRPCProvider } from '@/components/providers/trpc-provider';
import { PWAProvider } from '@/components/providers/pwa-provider';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { Toaster } from 'sonner';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: `${process.env.NEXT_PUBLIC_CHURCH_NAME || '에벤에셀'} 교회 관리 시스템`,
  description: '교회 교적 및 재정 관리를 위한 통합 플랫폼',
  ...(process.env.NODE_ENV === 'production' && { manifest: '/manifest.json' }),
  keywords: [
    '교회', '관리', '시스템', '에벤에셀', '교인', '예배', '출석', '헌금'
  ],
  authors: [
    {
      name: `${process.env.NEXT_PUBLIC_CHURCH_NAME || '에벤에셀'} 교회`,
    },
  ],
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#2563eb' },
    { media: '(prefers-color-scheme: dark)', color: '#1e40af' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        {process.env.NODE_ENV === 'production' && (
          <>
            <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
            <meta name="apple-mobile-web-app-capable" content="yes" />
            <meta name="apple-mobile-web-app-status-bar-style" content="default" />
            <meta name="apple-mobile-web-app-title" content={`${process.env.NEXT_PUBLIC_CHURCH_NAME || '에벤에셀'} 교회`} />
            <meta name="mobile-web-app-capable" content="yes" />
            <meta name="msapplication-TileColor" content="#2563eb" />
            <meta name="msapplication-TileImage" content="/icons/icon-144x144.png" />
          </>
        )}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // React 18 Hydration과 동기화된 로딩 최적화
              (function() {
                let isLoaded = false;
                
                function setLoaded() {
                  if (isLoaded) return;
                  isLoaded = true;
                  // hydration 후에 클래스 추가
                  setTimeout(() => {
                    document.documentElement.classList.add('loaded');
                  }, 0);
                }
                
                // React hydration이 완료된 후에만 실행
                window.addEventListener('load', () => {
                  // 추가 지연으로 hydration 완료 보장
                  setTimeout(setLoaded, 200);
                });
              })();
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        <ErrorBoundary>
          <AuthSessionProvider>
            <TRPCProvider>
              {process.env.NODE_ENV === 'production' ? (
                <PWAProvider>
                  {children}
                  <Toaster position="top-right" richColors />
                </PWAProvider>
              ) : (
                <>
                  {children}
                  <Toaster position="top-right" richColors />
                </>
              )}
            </TRPCProvider>
          </AuthSessionProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}