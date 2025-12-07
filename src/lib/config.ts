// Environment variable validation - runs on startup
// Fails fast if required variables are missing

interface Config {
  port: number;
  nodeEnv: 'development' | 'production';
  cookieSecret: string;
  jwtSecret: string;
  jwtRefreshSecret: string;
  frontendUrl: string;
  databaseUrl: string;
  sentryDsn: string | undefined;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function validateConfig(): Config {
  const nodeEnv = process.env.NODE_ENV === 'production' ? 'production' : 'development';

  // In production, all secrets are required
  // In development, we allow defaults for convenience
  const isProduction = nodeEnv === 'production';

  if (isProduction) {
    return {
      port: parseInt(process.env.PORT || '3000', 10),
      nodeEnv,
      cookieSecret: requireEnv('COOKIE_SECRET'),
      jwtSecret: requireEnv('JWT_SECRET'),
      jwtRefreshSecret: requireEnv('JWT_REFRESH_SECRET'),
      frontendUrl: requireEnv('FRONTEND_URL'),
      databaseUrl: requireEnv('DATABASE_URL'),
      sentryDsn: process.env.SENTRY_DSN, // Optional but recommended in production
    };
  }

  // Development defaults
  return {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv,
    cookieSecret: process.env.COOKIE_SECRET || 'dev-cookie-secret-not-for-production',
    jwtSecret: process.env.JWT_SECRET || 'dev-jwt-secret-not-for-production',
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-not-for-production',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
    databaseUrl: requireEnv('DATABASE_URL'), // Always required
    sentryDsn: process.env.SENTRY_DSN, // Optional in development
  };
}

// Validate and export config on module load
export const config = validateConfig();
