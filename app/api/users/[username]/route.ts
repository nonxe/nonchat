import { NextRequest, NextResponse } from 'next/server';
import { getJSON, putJSON, getFile } from '@/lib/github';
import { getSession } from '@/lib/auth';
import type { UserWithHash, PublicUser } from '@/lib/types';

export async function GET(req: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  try {
    const result = await getJSON<UserWithHash>('users', `users/${username}.json`);
    if (!result) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const { passwordHash, ...publicData } = result.data;
    return NextResponse.json({ user: publicData });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { username } = await params;
  if (session.username !== username) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await req.json();
    const { displayName, bio, avatarUrl, status } = body;

    const userFile = await getJSON<UserWithHash>('users', `users/${username}.json`);
    if (!userFile) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const updated = {
      ...userFile.data,
      ...(displayName !== undefined && { displayName: displayName.slice(0, 30) }),
      ...(bio !== undefined && { bio: bio.slice(0, 150) }),
      ...(avatarUrl !== undefined && { avatarUrl }),
      ...(status !== undefined && { status }),
      lastSeen: new Date().toISOString(),
    };

    await putJSON('users', `users/${username}.json`, updated, `Update profile: ${username}`, userFile.sha);

    // Update public index
    const indexFile = await getJSON<PublicUser[]>('users', 'index.json');
    if (indexFile) {
      const index = indexFile.data.map((u) =>
        u.username === username
          ? { ...u, displayName: updated.displayName, avatarUrl: updated.avatarUrl, status: updated.status }
          : u
      );
      await putJSON('users', 'index.json', index, `Update index: ${username}`, indexFile.sha);
    }

    const { passwordHash, ...publicData } = updated;
    return NextResponse.json({ user: publicData });
  } catch (err) {
    console.error('Update user error:', err);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
