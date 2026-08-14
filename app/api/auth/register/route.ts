import { NextRequest, NextResponse } from 'next/server';
import { getJSON, putJSON } from '@/lib/github';
import { hashPassword } from '@/lib/crypto';
import { signToken, createAuthCookie } from '@/lib/auth';
import type { UserWithHash, PublicUser } from '@/lib/types';


export async function POST(req: NextRequest) {
  try {
    const { username, password, displayName } = await req.json();

    if (!username || !password || !displayName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const uname = username.toLowerCase().trim();
    if (!/^[a-z0-9_]{3,20}$/.test(uname)) {
      return NextResponse.json(
        { error: 'Username must be 3-20 chars: letters, numbers, underscores' },
        { status: 400 }
      );
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    // Check if user exists
    const existing = await getJSON<UserWithHash>('users', `users/${uname}.json`);
    if (existing) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const now = new Date().toISOString();

    const user: UserWithHash = {
      username: uname,
      displayName: displayName.trim().slice(0, 30),
      bio: '',
      avatarUrl: null,
      passwordHash,
      createdAt: now,
      status: 'online',
      lastSeen: now,
    };

    // Save user file
    await putJSON('users', `users/${uname}.json`, user, `Register user: ${uname}`);

    // Update public index
    let indexFile = await getJSON<PublicUser[]>('users', 'index.json');
    const publicUser: PublicUser = {
      username: uname,
      displayName: user.displayName,
      avatarUrl: null,
      status: 'online',
      lastSeen: now,
    };

    const index = indexFile?.data || [];
    index.push(publicUser);
    await putJSON('users', 'index.json', index, `Add ${uname} to index`, indexFile?.sha);

    // Sign JWT
    const token = signToken({ username: uname, displayName: user.displayName, avatarUrl: null });

    const response = NextResponse.json({
      user: { username: uname, displayName: user.displayName, avatarUrl: null },
    });
    response.headers.set('Set-Cookie', createAuthCookie(token));
    return response;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Register error:', msg);
    return NextResponse.json(
      { error: 'Registration failed', detail: msg },
      { status: 500 }
    );
  }
}
