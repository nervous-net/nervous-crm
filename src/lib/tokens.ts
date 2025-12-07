import { randomBytes } from 'crypto';

/**
 * Generates a secure random token for password resets, email verification, etc.
 */
export function generateSecureToken(length: number = 32): string {
  return randomBytes(length).toString('hex');
}

/**
 * Gets expiry date for password reset tokens (1 hour)
 */
export function getPasswordResetExpiry(): Date {
  return new Date(Date.now() + 60 * 60 * 1000); // 1 hour
}

/**
 * Gets expiry date for email verification tokens (24 hours)
 */
export function getEmailVerificationExpiry(): Date {
  return new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
}
