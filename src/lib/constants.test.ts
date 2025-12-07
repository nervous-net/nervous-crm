import { describe, it, expect } from 'vitest';
import { TIME, TIME_MS, TOKEN_EXPIRY, COOKIE_MAX_AGE, PAGINATION, DEAL_STAGES, USER_ROLES } from './constants.js';

describe('constants', () => {
  describe('TIME', () => {
    it('should have correct time values in seconds', () => {
      expect(TIME.SECOND).toBe(1);
      expect(TIME.MINUTE).toBe(60);
      expect(TIME.HOUR).toBe(3600);
      expect(TIME.DAY).toBe(86400);
      expect(TIME.WEEK).toBe(604800);
    });
  });

  describe('TIME_MS', () => {
    it('should have correct time values in milliseconds', () => {
      expect(TIME_MS.SECOND).toBe(1000);
      expect(TIME_MS.MINUTE).toBe(60000);
      expect(TIME_MS.HOUR).toBe(3600000);
      expect(TIME_MS.DAY).toBe(86400000);
      expect(TIME_MS.WEEK).toBe(604800000);
    });
  });

  describe('TOKEN_EXPIRY', () => {
    it('should have valid expiry formats', () => {
      expect(TOKEN_EXPIRY.ACCESS_TOKEN).toBe('15m');
      expect(TOKEN_EXPIRY.REFRESH_TOKEN).toBe('7d');
      expect(TOKEN_EXPIRY.PASSWORD_RESET).toBe(TIME_MS.HOUR);
      expect(TOKEN_EXPIRY.EMAIL_VERIFICATION).toBe(TIME_MS.DAY);
      expect(TOKEN_EXPIRY.INVITE).toBe(TIME_MS.WEEK);
    });
  });

  describe('COOKIE_MAX_AGE', () => {
    it('should have correct cookie max ages in seconds', () => {
      expect(COOKIE_MAX_AGE.ACCESS_TOKEN).toBe(15 * 60); // 15 minutes
      expect(COOKIE_MAX_AGE.REFRESH_TOKEN).toBe(7 * 24 * 60 * 60); // 7 days
    });
  });

  describe('PAGINATION', () => {
    it('should have sensible defaults', () => {
      expect(PAGINATION.DEFAULT_LIMIT).toBe(50);
      expect(PAGINATION.MAX_LIMIT).toBe(100);
      expect(PAGINATION.MAX_LIMIT).toBeGreaterThan(PAGINATION.DEFAULT_LIMIT);
    });
  });

  describe('DEAL_STAGES', () => {
    it('should have all stages in order', () => {
      expect(DEAL_STAGES).toEqual(['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost']);
    });
  });

  describe('USER_ROLES', () => {
    it('should have all roles', () => {
      expect(USER_ROLES).toEqual(['owner', 'admin', 'member', 'viewer']);
    });
  });
});
