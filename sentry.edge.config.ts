// This file configures the initialization of Sentry for edge features (middleware, edge routes, etc).
// The config you add here will be used whenever one of the edge features is loaded.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    
    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1.0, // Lower for edge
    
    // Release tracking
    release: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV,
    
    // Privacy settings
    sendDefaultPii: false,
    
    // Minimal integrations for edge runtime
    integrations: [
      // Keep integrations minimal for edge runtime
    ],
    
    // Additional context
    initialScope: {
      tags: {
        component: 'edge',
      },
    },
  })
}