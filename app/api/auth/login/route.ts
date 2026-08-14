import { NextRequest, NextResponse } from 'next/server';
import { getJSON, putJSON } from '@/lib/github';
import { verifyPassword } from '@/lib/crypto';
import { signToken, createAuthCookie } from '@/lib/auth';
import type { UserWithHash } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
    }

    const uname = username.toLowerCase().trim();
    const userFile = await getJSON<UserWithHash>('users', `users/${uname}.json`);

    if (!userFile) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    const user = userFile.data;
    const valid = await verifyPassword(password, user.passwordHash);

    if (!valid) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    // Update status to online
    const now = new Date().toISOString();
    const updated = { ...user, status: 'online' as const, lastSeen: now };
    await putJSON('users', `users/${uname}.json`, updated, `Login: ${uname}`, userFile.sha);

    const token = signToken({
      username: uname,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
    });

    const response = NextResponse.json({
      user: { username: uname, displayName: user.displayName, avatarUrl: user.avatarUrl },
    });
    response.headers.set('Set-Cookie', createAuthCookie(token));
    return response;
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
