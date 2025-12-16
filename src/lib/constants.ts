// Time constants (in seconds)
export const TIME = {
  SECOND: 1,
  MINUTE: 60,
  HOUR: 60 * 60,
  DAY: 24 * 60 * 60,
  WEEK: 7 * 24 * 60 * 60,
} as const;

// Time constants (in milliseconds)
export const TIME_MS = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
} as const;

// Token expiry times
export const TOKEN_EXPIRY = {
  ACCESS_TOKEN: '15m',
  REFRESH_TOKEN: '7d',
  PASSWORD_RESET: TIME_MS.HOUR, // 1 hour
  EMAIL_VERIFICATION: TIME_MS.DAY, // 24 hours
  INVITE: TIME_MS.WEEK, // 7 days
} as const;

// Cookie max ages (in seconds)
export const COOKIE_MAX_AGE = {
  ACCESS_TOKEN: 15 * TIME.MINUTE,
  REFRESH_TOKEN: 7 * TIME.DAY,
} as const;

// Pagination defaults
export const PAGINATION = {
  DEFAULT_LIMIT: 50,
  MAX_LIMIT: 100,
} as const;

// Deal stages
export const DEAL_STAGES = [
  'lead',
  'qualified',
  'proposal',
  'negotiation',
  'won',
  'lost',
] as const;

export type DealStage = typeof DEAL_STAGES[number];

// Activity types
export const ACTIVITY_TYPES = ['call', 'email', 'meeting', 'task'] as const;

export type ActivityType = typeof ACTIVITY_TYPES[number];

// User roles
export const USER_ROLES = ['owner', 'admin', 'member', 'viewer'] as const;

export type UserRole = typeof USER_ROLES[number];

// Rate limiting
export const RATE_LIMIT = {
  AUTH_ENDPOINTS: {
    max: 5,
    timeWindow: '1 minute',
  },
  CSRF_ENDPOINT: {
    max: 30,
    timeWindow: '1 minute',
  },
  GENERAL: {
    max: 100,
    timeWindow: '1 minute',
  },
} as const;

// Request limits
export const REQUEST_LIMITS = {
  MAX_BODY_SIZE: 1024 * 1024, // 1MB
  MAX_JSON_BODY_SIZE: 100 * 1024, // 100KB for JSON
} as const;
