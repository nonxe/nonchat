import { NextRequest, NextResponse } from 'next/server';
import { getJSON, putJSON } from '@/lib/github';
import { getSession } from '@/lib/auth';
import type { Conversation } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const result = await getJSON<Conversation[]>('msgs', 'conversations/index.json');
    const all = Array.isArray(result?.data) ? result.data : [];
    const mine = all.filter((c) => Array.isArray(c?.participants) && c.participants.includes(session.username));
    return NextResponse.json({ conversations: mine });
  } catch {
    return NextResponse.json({ conversations: [] });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    const otherUsername = body?.otherUsername?.trim()?.toLowerCase();
    if (!otherUsername) return NextResponse.json({ error: 'Missing otherUsername' }, { status: 400 });

    const indexFile = await getJSON<Conversation[]>('msgs', 'conversations/index.json');
    const index = Array.isArray(indexFile?.data) ? indexFile.data : [];

    // Check if DM already exists
    const existing = index.find(
      (c) =>
        c.type === 'dm' &&
        Array.isArray(c.participants) &&
        c.participants.includes(session.username) &&
        c.participants.includes(otherUsername)
    );
    if (existing) return NextResponse.json({ conversation: existing });

    const now = new Date().toISOString();
    const conv: Conversation = {
      id: uuidv4(),
      type: 'dm',
      participants: [session.username, otherUsername],
      createdAt: now,
      updatedAt: now,
      lastMessage: null,
      lastMessageAt: null,
    };

    index.push(conv);
    await putJSON('msgs', 'conversations/index.json', index, `New DM: ${session.username} <-> ${otherUsername}`, indexFile?.sha);
    // Initialize empty messages file
    await putJSON('msgs', `conversations/${conv.id}/messages.json`, [], `Init messages: ${conv.id}`);

    return NextResponse.json({ conversation: conv }, { status: 201 });
  } catch (err: any) {
    console.error('Create conversation error:', err);
    return NextResponse.json({ error: err.message || 'Failed to create conversation' }, { status: 500 });
  }
}
