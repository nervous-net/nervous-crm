import { describe, it, expect } from 'vitest';
import { registerSchema, loginSchema, changePasswordSchema } from './auth.js';

describe('auth schemas', () => {
  describe('registerSchema', () => {
    it('should validate a valid registration', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'Password123',
        name: 'Test User',
        teamName: 'Test Team',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const result = registerSchema.safeParse({
        email: 'not-an-email',
        password: 'Password123',
        name: 'Test User',
        teamName: 'Test Team',
      });
      expect(result.success).toBe(false);
    });

    it('should reject password without uppercase', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        teamName: 'Test Team',
      });
      expect(result.success).toBe(false);
    });

    it('should reject password without lowercase', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'PASSWORD123',
        name: 'Test User',
        teamName: 'Test Team',
      });
      expect(result.success).toBe(false);
    });

    it('should reject password without number', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'PasswordABC',
        name: 'Test User',
        teamName: 'Test Team',
      });
      expect(result.success).toBe(false);
    });

    it('should reject password shorter than 8 characters', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'Pass1',
        name: 'Test User',
        teamName: 'Test Team',
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty name', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'Password123',
        name: '',
        teamName: 'Test Team',
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty team name', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'Password123',
        name: 'Test User',
        teamName: '',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('loginSchema', () => {
    it('should validate a valid login', () => {
      const result = loginSchema.safeParse({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid email format', () => {
      const result = loginSchema.safeParse({
        email: 'not-an-email',
        password: 'password123',
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty password', () => {
      const result = loginSchema.safeParse({
        email: 'test@example.com',
        password: '',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('changePasswordSchema', () => {
    it('should validate valid password change', () => {
      const result = changePasswordSchema.safeParse({
        currentPassword: 'OldPassword1',
        newPassword: 'NewPassword1',
      });
      expect(result.success).toBe(true);
    });

    it('should reject weak new password (no uppercase)', () => {
      const result = changePasswordSchema.safeParse({
        currentPassword: 'OldPassword1',
        newPassword: 'newpassword1',
      });
      expect(result.success).toBe(false);
    });

    it('should reject weak new password (no number)', () => {
      const result = changePasswordSchema.safeParse({
        currentPassword: 'OldPassword1',
        newPassword: 'NewPassword',
      });
      expect(result.success).toBe(false);
    });

    it('should reject short new password', () => {
      const result = changePasswordSchema.safeParse({
        currentPassword: 'OldPassword1',
        newPassword: 'Pass1',
      });
      expect(result.success).toBe(false);
    });
  });
});
