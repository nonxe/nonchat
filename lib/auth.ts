import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import type { AuthPayload } from './types';

export const COOKIE_NAME = 'nc_auth';

function getJwtSecret(): string {
  return (process.env.JWT_SECRET || 'nonchat-jwt-secret-please-change-in-production-to-64-random-chars').trim();
}

export function signToken(payload: Omit<AuthPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '30d' });
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as AuthPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<AuthPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return verifyToken(token);
  } catch {
    return null;
  }
}
