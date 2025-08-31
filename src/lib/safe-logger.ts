/**
 * 안전한 로깅 유틸리티
 * 배포 환경에서 console이 null이 될 수 있는 상황을 방지합니다.
 */

type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug'

const isSafeConsole = (): boolean => {
  return typeof console !== 'undefined' && console !== null
}

const safeLog = (level: LogLevel, message: string, ...args: any[]): void => {
  if (isSafeConsole() && console[level]) {
    try {
      console[level](message, ...args)
    } catch (e) {
      // 로깅 실패 시에도 에러를 발생시키지 않음
    }
  }
}

export const logger = {
  log: (message: string, ...args: any[]) => safeLog('log', message, ...args),
  info: (message: string, ...args: any[]) => safeLog('info', message, ...args),
  warn: (message: string, ...args: any[]) => safeLog('warn', message, ...args),
  error: (message: string, ...args: any[]) => safeLog('error', message, ...args),
  debug: (message: string, ...args: any[]) => safeLog('debug', message, ...args),
}

// 기존 console 메소드와 동일한 인터페이스 제공
export const safeConsole = {
  log: logger.log,
  info: logger.info,
  warn: logger.warn,
  error: logger.error,
  debug: logger.debug,
}