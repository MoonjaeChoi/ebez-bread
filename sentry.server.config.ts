// This file configures the initialization of Sentry for edge features (middleware, edge routes, etc).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    
    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Release tracking
    release: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV,
    
    // Privacy settings
    sendDefaultPii: false,
    
    // Error filtering for server
    beforeSend(event) {
      // Filter out non-critical errors in development
      if (process.env.NODE_ENV === 'development') {
        // Skip database connection errors in development
        if (event.exception?.values?.[0]?.value?.includes('ECONNREFUSED')) {
          return null
        }
      }
      
      // Don't send auth validation errors (these are expected)
      if (event.exception?.values?.[0]?.value?.includes('UNAUTHORIZED')) {
        return null
      }
      
      return event
    },
    
    integrations: [
      // Server-side integrations
      Sentry.httpIntegration(),
      Sentry.prismaIntegration(),
    ],
    
    // Additional context
    initialScope: {
      tags: {
        component: 'server',
      },
    },
  })
}