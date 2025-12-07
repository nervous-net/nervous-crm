import * as jose from 'jose';
import { config } from './config.js';
import { TOKEN_EXPIRY, TIME_MS } from './constants.js';

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
    .setExpirationTime(TOKEN_EXPIRY.ACCESS_TOKEN)
    .sign(jwtSecretKey);
}

export async function createRefreshToken(payload: { sessionId: string }): Promise<string> {
  return new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY.REFRESH_TOKEN)
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
  return new Date(Date.now() + TIME_MS.WEEK);
}
