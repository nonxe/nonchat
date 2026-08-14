import { NextRequest, NextResponse } from 'next/server';
import { getJSON, putJSON } from '@/lib/github';
import { verifyPassword } from '@/lib/crypto';
import { signToken, COOKIE_NAME } from '@/lib/auth';
import type { UserWithHash } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
    }

    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ error: 'Missing username or password' }, { status: 400 });
    }

    const uname = String(username).toLowerCase().trim();
    const userFile = await getJSON<UserWithHash>('users', `users/${uname}.json`);

    if (!userFile) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    const user = userFile.data;
    const valid = await verifyPassword(String(password), user.passwordHash);

    if (!valid) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    // Update status to online
    const now = new Date().toISOString();
    const updated = { ...user, status: 'online' as const, lastSeen: now };
    try {
      await putJSON('users', `users/${uname}.json`, updated, `Login: ${uname}`, userFile.sha);
    } catch (putErr) {
      console.warn('Status update warning:', putErr);
    }

    const token = signToken({
      username: uname,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
    });

    const response = NextResponse.json({
      success: true,
      user: { username: uname, displayName: user.displayName, avatarUrl: user.avatarUrl },
    });

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });

    return response;
  } catch (err: any) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Login error:', msg);
    return NextResponse.json({ error: msg || 'Login failed' }, { status: 500 });
  }
}
