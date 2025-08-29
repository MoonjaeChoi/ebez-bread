// This file configures the initialization of Sentry on the browser side.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    
    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Release tracking
    release: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV,
    
    // Session Replay
    replaysSessionSampleRate: 0.1, // Capture 10% of all sessions
    replaysOnErrorSampleRate: 1.0, // Capture 100% of sessions with errors
    
    // Privacy settings
    sendDefaultPii: false,
    
    // Error filtering
    beforeSend(event) {
      // Filter out common non-critical errors in development
      if (process.env.NODE_ENV === 'development') {
        // Skip certain error types in development
        if (event.exception?.values?.[0]?.type === 'ChunkLoadError') {
          return null
        }
        
        // Skip network errors in development
        if (event.exception?.values?.[0]?.value?.includes('NetworkError')) {
          return null
        }
      }
      
      return event
    },
    
    integrations: [
      Sentry.replayIntegration({
        // Mask sensitive content
        maskAllText: false,
        blockAllMedia: true,
        maskAllInputs: true,
      }),
      Sentry.browserTracingIntegration(),
    ],
    
    // Additional context
    initialScope: {
      tags: {
        component: 'client',
      },
    },
  })
}