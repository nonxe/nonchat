import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import type { AuthPayload } from './types';

const JWT_SECRET = process.env.JWT_SECRET || 'nonchat-secret-change-in-production';
const COOKIE_NAME = 'nc_auth';

export function signToken(payload: Omit<AuthPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<AuthPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export function createAuthCookie(token: string): string {
  const maxAge = 30 * 24 * 60 * 60; // 30 days
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}`;
}

export function clearAuthCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`;
}
