import * as jose from 'jose';
import { config } from './config.js';

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

interface TokenPayload {
  userId: string;
  teamId: string;
  role: string;
  [key: string]: unknown;
}

// Pre-compute secret keys at startup (config already validated)
const jwtSecretKey = new TextEncoder().encode(config.jwtSecret);
const jwtRefreshSecretKey = new TextEncoder().encode(config.jwtRefreshSecret);

export async function createAccessToken(payload: TokenPayload): Promise<string> {
  return new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(jwtSecretKey);
}

export async function createRefreshToken(payload: { sessionId: string }): Promise<string> {
  return new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .sign(jwtRefreshSecretKey);
}

export async function verifyAccessToken(token: string): Promise<TokenPayload> {
  const { payload } = await jose.jwtVerify(token, jwtSecretKey);
  return payload as unknown as TokenPayload;
}

export async function verifyRefreshToken(token: string): Promise<{ sessionId: string }> {
  const { payload } = await jose.jwtVerify(token, jwtRefreshSecretKey);
  return payload as unknown as { sessionId: string };
}

export function getRefreshTokenExpiry(): Date {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
}
