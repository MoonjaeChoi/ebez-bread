import { PrismaClient, Prisma } from '@prisma/client'
import { getEnvVar } from './env'
import { logger } from './logger'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// 환경 변수 확인 및 로드
const databaseUrl = getEnvVar('DATABASE_URL', 'file:./dev.db')
// logger.debug('Database URL configured', { 
//   action: 'db_config',
//   metadata: { 
//     hasUrl: !!databaseUrl,
//     environment: process.env.NODE_ENV 
//   }
// }) // 일시적으로 비활성화 - 무한 리로딩 방지

// Enhanced Prisma logging configuration
const logLevel: Prisma.LogLevel[] = process.env.NODE_ENV === 'production' 
  ? ['error', 'warn']
  : ['query', 'info', 'warn', 'error']

// Enhanced connection URL with PostgreSQL-specific settings to prevent prepared statement errors
const enhancedDatabaseUrl = databaseUrl.includes('postgresql://') 
  ? `${databaseUrl}${databaseUrl.includes('?') ? '&' : '?'}pgbouncer=true&connection_limit=10&pool_timeout=20`
  : databaseUrl

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: logLevel,
  datasources: {
    db: {
      url: enhancedDatabaseUrl,
    },
  },
  errorFormat: 'colorless', // Better for logging
})

// Enhanced Prisma event logging
// Temporarily disabled due to TypeScript issues with event types
// if (prisma && process.env.NODE_ENV !== 'production') {
//   try {
//     prisma.$on('query', (e) => {
//       logger.query(e.query, e.duration, {
//         action: 'db_query',
//         metadata: { target: e.target, params: e.params }
//       })
//     })
//   } catch (error) {
//     // Ignore if event logging is not available
//   }
// }
  
// logger.info('Prisma client initialized with enhanced logging', {
//   action: 'prisma_init',
//   metadata: {
//     logLevel: logLevel.join(', '),
//     environment: process.env.NODE_ENV
//   }
// }) // 일시적으로 비활성화 - 무한 리로딩 방지

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma