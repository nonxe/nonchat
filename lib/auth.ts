import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import type { AuthPayload } from './types';

export const COOKIE_NAME = 'nc_auth';

const DEFAULT_JWT_SECRET = 'nonchat-secret-as-cloud-host-2026-secure-jwt-key-998877665544332211';

function getJwtSecret(): string {
  return (process.env.JWT_SECRET || DEFAULT_JWT_SECRET).trim();
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
