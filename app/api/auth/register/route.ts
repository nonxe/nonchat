import { NextRequest, NextResponse } from 'next/server';
import { getJSON, putJSON } from '@/lib/github';
import { hashPassword } from '@/lib/crypto';
import { signToken, COOKIE_NAME } from '@/lib/auth';
import type { UserWithHash, PublicUser } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
    }

    const { username, password, displayName } = body;

    if (!username || !password || !displayName) {
      return NextResponse.json({ error: 'Please fill in all fields' }, { status: 400 });
    }

    const uname = String(username).toLowerCase().trim();
    const dname = String(displayName).trim().slice(0, 30);
    const pass = String(password);

    if (!/^[a-z0-9_]{3,20}$/.test(uname)) {
      return NextResponse.json(
        { error: 'Username must be 3-20 chars: lowercase letters, numbers, or underscores' },
        { status: 400 }
      );
    }
    if (pass.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    // Check if user already exists
    let existing = null;
    try {
      existing = await getJSON<UserWithHash>('users', `users/${uname}.json`);
    } catch (e: any) {
      console.warn('Check existing user warning:', e.message);
    }

    if (existing) {
      return NextResponse.json({ error: 'Username is already taken' }, { status: 409 });
    }

    const passwordHash = await hashPassword(pass);
    const now = new Date().toISOString();

    const user: UserWithHash = {
      username: uname,
      displayName: dname,
      bio: '',
      avatarUrl: null,
      passwordHash,
      createdAt: now,
      status: 'online',
      lastSeen: now,
    };

    // Save user file to userdb
    await putJSON('users', `users/${uname}.json`, user, `Register user: ${uname}`);

    // Update public index
    try {
      const indexFile = await getJSON<PublicUser[]>('users', 'index.json');
      const index = indexFile?.data || [];
      const alreadyInIndex = index.some(u => u.username === uname);
      if (!alreadyInIndex) {
        index.push({
          username: uname,
          displayName: user.displayName,
          avatarUrl: null,
          status: 'online',
          lastSeen: now,
        });
        await putJSON('users', 'index.json', index, `Add ${uname} to index`, indexFile?.sha);
      }
    } catch (indexErr) {
      console.error('Index update warning:', indexErr);
    }

    // Sign JWT
    const token = signToken({ username: uname, displayName: user.displayName, avatarUrl: null });

    const response = NextResponse.json({
      success: true,
      user: { username: uname, displayName: user.displayName, avatarUrl: null },
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
    console.error('Register API error:', msg);
    return NextResponse.json(
      { error: msg || 'Registration failed' },
      { status: 500 }
    );
  }
}
