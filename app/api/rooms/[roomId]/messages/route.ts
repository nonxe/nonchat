import { NextRequest, NextResponse } from 'next/server';
import { getJSON, putJSON } from '@/lib/github';
import { getSession } from '@/lib/auth';
import type { Message } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  try {
    const result = await getJSON<Message[]>('msgs', `rooms/${roomId}/messages.json`);
    const messages = Array.isArray(result?.data) ? result.data : [];
    return NextResponse.json({ messages });
  } catch {
    return NextResponse.json({ messages: [] });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { roomId } = await params;

  try {
    const body = await req.json().catch(() => ({}));
    const { content, mediaUrl, mediaType, mediaName, mediaSize } = body;

    if (!content && !mediaUrl) {
      return NextResponse.json({ error: 'Empty message' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const message: Message = {
      id: uuidv4(),
      conversationId: roomId,
      senderId: session.username,
      senderName: session.displayName,
      senderAvatar: session.avatarUrl,
      content: content || null,
      mediaUrl: mediaUrl || null,
      mediaType: mediaType || null,
      mediaName: mediaName || null,
      mediaSize: mediaSize || null,
      timestamp: now,
      status: 'sent',
    };

    const existing = await getJSON<Message[]>('msgs', `rooms/${roomId}/messages.json`);
    const messages = Array.isArray(existing?.data) ? existing.data : [];
    messages.push(message);

    await putJSON('msgs', `rooms/${roomId}/messages.json`, messages, `Room msg: ${roomId}`, existing?.sha);

    return NextResponse.json({ message }, { status: 201 });
  } catch (err: any) {
    console.error('Room message error:', err);
    return NextResponse.json({ error: err.message || 'Failed to send message' }, { status: 500 });
  }
}
