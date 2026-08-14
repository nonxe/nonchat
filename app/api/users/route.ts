import { NextRequest, NextResponse } from 'next/server';
import { getJSON } from '@/lib/github';
import { getSession } from '@/lib/auth';
import type { PublicUser } from '@/lib/types';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim().toLowerCase();

  // If no search query is provided, do NOT reveal all registered users (Privacy like Telegram/WhatsApp)
  if (!q || q.length < 1) {
    return NextResponse.json({ users: [] });
  }

  try {
    const result = await getJSON<PublicUser[]>('users', 'index.json');
    const all = Array.isArray(result?.data) ? result.data : [];

    const matched = all.filter((u) => {
      if (u.username === session.username) return false;
      const unameMatch = u.username.toLowerCase().includes(q);
      const dnameMatch = (u.displayName || '').toLowerCase().includes(q);
      return unameMatch || dnameMatch;
    });

    return NextResponse.json({ users: matched });
  } catch {
    return NextResponse.json({ users: [] });
  }
}
