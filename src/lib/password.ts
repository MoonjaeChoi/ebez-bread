import bcrypt from 'bcryptjs'

/**
 * Password hashing and validation utilities with enhanced security
 */

// Security configuration
const SALT_ROUNDS = 12 // Increased from default 10 for better security
const MIN_PASSWORD_LENGTH = 8
const MAX_PASSWORD_LENGTH = 128

/**
 * Hash a password with bcrypt
 * @param password - Plain text password
 * @returns Promise<string> - Hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long`)
  }

  if (password.length > MAX_PASSWORD_LENGTH) {
    throw new Error(`Password must be no longer than ${MAX_PASSWORD_LENGTH} characters`)
  }

  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS)
    return await bcrypt.hash(password, salt)
  } catch (error) {
    throw new Error('Failed to hash password')
  }
}

/**
 * Verify a password against its hash
 * @param password - Plain text password
 * @param hashedPassword - Hashed password from database
 * @returns Promise<boolean> - True if password matches
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  if (!password || !hashedPassword) {
    return false
  }

  try {
    return await bcrypt.compare(password, hashedPassword)
  } catch (error) {
    console.error('Password verification error:', error)
    return false
  }
}

/**
 * Validate password strength
 * @param password - Password to validate
 * @returns { isValid: boolean; errors: string[] }
 */
export function validatePasswordStrength(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!password) {
    errors.push('비밀번호는 필수입니다')
    return { isValid: false, errors }
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`비밀번호는 최소 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다`)
  }

  if (password.length > MAX_PASSWORD_LENGTH) {
    errors.push(`비밀번호는 최대 ${MAX_PASSWORD_LENGTH}자를 초과할 수 없습니다`)
  }

  // 복잡성 조건 제거: 8자 이상 길이 조건만 유지

  // Check for common weak passwords
  const weakPasswords = ['password', '123456', 'qwerty', 'admin', 'test']
  if (weakPasswords.includes(password.toLowerCase())) {
    errors.push('너무 일반적인 비밀번호입니다. 더 안전한 비밀번호를 사용해주세요')
  }

  return { isValid: errors.length === 0, errors }
}

/**
 * Generate a secure random password
 * @param length - Password length (default: 12)
 * @returns string - Generated password
 */
export function generateSecurePassword(length: number = 12): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  let password = ''
  
  // Ensure at least one character from each required category
  password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]
  password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]
  password += '0123456789'[Math.floor(Math.random() * 10)]
  password += '!@#$%^&*'[Math.floor(Math.random() * 8)]
  
  // Fill the rest randomly
  for (let i = 4; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)]
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('')
}

/**
 * Check if password needs rehashing (due to increased salt rounds)
 * @param hashedPassword - Current hashed password
 * @returns boolean - True if needs rehashing
 */
export function needsRehashing(hashedPassword: string): boolean {
  try {
    const rounds = bcrypt.getRounds(hashedPassword)
    return rounds < SALT_ROUNDS
  } catch (error) {
    return true // If we can't determine rounds, assume it needs rehashing
  }
}