import { describe, it, expect } from 'vitest';
import { generateSecureToken, getPasswordResetExpiry, getEmailVerificationExpiry } from './tokens.js';
import { TOKEN_EXPIRY } from './constants.js';

describe('tokens', () => {
  describe('generateSecureToken', () => {
    it('should generate a token of default length (32 bytes = 64 hex chars)', () => {
      const token = generateSecureToken();
      expect(token).toHaveLength(64);
      expect(token).toMatch(/^[a-f0-9]+$/);
    });

    it('should generate tokens of specified length', () => {
      const token16 = generateSecureToken(16);
      expect(token16).toHaveLength(32); // 16 bytes = 32 hex chars

      const token64 = generateSecureToken(64);
      expect(token64).toHaveLength(128); // 64 bytes = 128 hex chars
    });

    it('should generate unique tokens', () => {
      const tokens = new Set<string>();
      for (let i = 0; i < 100; i++) {
        tokens.add(generateSecureToken());
      }
      expect(tokens.size).toBe(100);
    });
  });

  describe('getPasswordResetExpiry', () => {
    it('should return a date in the future', () => {
      const now = Date.now();
      const expiry = getPasswordResetExpiry();
      expect(expiry.getTime()).toBeGreaterThan(now);
    });

    it('should return a date approximately 1 hour from now', () => {
      const now = Date.now();
      const expiry = getPasswordResetExpiry();
      const diff = expiry.getTime() - now;
      // Allow 1 second tolerance
      expect(diff).toBeGreaterThanOrEqual(TOKEN_EXPIRY.PASSWORD_RESET - 1000);
      expect(diff).toBeLessThanOrEqual(TOKEN_EXPIRY.PASSWORD_RESET + 1000);
    });
  });

  describe('getEmailVerificationExpiry', () => {
    it('should return a date in the future', () => {
      const now = Date.now();
      const expiry = getEmailVerificationExpiry();
      expect(expiry.getTime()).toBeGreaterThan(now);
    });

    it('should return a date approximately 24 hours from now', () => {
      const now = Date.now();
      const expiry = getEmailVerificationExpiry();
      const diff = expiry.getTime() - now;
      // Allow 1 second tolerance
      expect(diff).toBeGreaterThanOrEqual(TOKEN_EXPIRY.EMAIL_VERIFICATION - 1000);
      expect(diff).toBeLessThanOrEqual(TOKEN_EXPIRY.EMAIL_VERIFICATION + 1000);
    });
  });
});
