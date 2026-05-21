import jwt from 'jsonwebtoken';

const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET || 'aurea-local-development-secret-key-321-go';
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || 'aurea-local-development-refresh-secret-key-987-go';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

/**
 * Generates an Access Token valid for 30 minutes.
 * @param payload Basic user identifier fields
 */
export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, ACCESS_TOKEN_SECRET, { expiresIn: '30m' });
}

/**
 * Generates a Refresh Token valid for either 30 days or 24 hours.
 * @param payload Basic user identifier fields
 * @param rememberMe Toggles extending session duration
 */
export function generateRefreshToken(payload: TokenPayload, rememberMe: boolean): string {
  const expiresIn = rememberMe ? '30d' : '24h';
  return jwt.sign(payload, REFRESH_TOKEN_SECRET, { expiresIn });
}

/**
 * Verifies an Access Token.
 * @param token Access JWT
 */
export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, ACCESS_TOKEN_SECRET) as TokenPayload;
}

/**
 * Verifies a Refresh Token.
 * @param token Refresh JWT
 */
export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, REFRESH_TOKEN_SECRET) as TokenPayload;
}
