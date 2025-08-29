/**
 * Next.js instrumentation file
 * This runs once when the Next.js server starts up
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only run on server side
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Initialize logging system
    const { initializeLogging, setupGlobalErrorHandlers } = await import('./src/lib/logger/init')
    
    // Initialize logging first
    initializeLogging()
    
    // Setup global error handlers
    setupGlobalErrorHandlers()
    
    // Initialize Sentry for server-side error monitoring
    // if (process.env.SENTRY_DSN) {
    //   await import('./sentry.server.config')
    // } // 일시적으로 비활성화
  }
  
  // For edge runtime (middleware, etc.)
  if (process.env.NEXT_RUNTIME === 'edge') {
    // if (process.env.SENTRY_DSN) {
    //   await import('./sentry.edge.config')
    // } // 일시적으로 비활성화
  }
}