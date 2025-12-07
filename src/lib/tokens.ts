import { randomBytes } from 'crypto';
import { TOKEN_EXPIRY } from './constants.js';

/**
 * Generates a secure random token for password resets, email verification, etc.
 */
export function generateSecureToken(length: number = 32): string {
  return randomBytes(length).toString('hex');
}

/**
 * Gets expiry date for password reset tokens
 */
export function getPasswordResetExpiry(): Date {
  return new Date(Date.now() + TOKEN_EXPIRY.PASSWORD_RESET);
}

/**
 * Gets expiry date for email verification tokens
 */
export function getEmailVerificationExpiry(): Date {
  return new Date(Date.now() + TOKEN_EXPIRY.EMAIL_VERIFICATION);
}
