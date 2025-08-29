// 환경 변수를 명시적으로 로드하는 유틸리티
import { loadEnvConfig } from '@next/env'

// Next.js 환경 변수 로딩
const projectDir = process.cwd()
loadEnvConfig(projectDir)

export function getEnvVar(name: string, defaultValue?: string): string {
  const value = process.env[name]
  if (!value) {
    if (defaultValue !== undefined) {
      return defaultValue
    }
    throw new Error(`Environment variable ${name} is not set`)
  }
  return value
}