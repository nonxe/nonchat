import { NextRequest, NextResponse } from 'next/server';
import { getJSON, putJSON } from '@/lib/github';
import { getSession } from '@/lib/auth';
import type { Message, Conversation } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: NextRequest, { params }: { params: Promise<{ convId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { convId } = await params;

  try {
    const result = await getJSON<Message[]>('msgs', `conversations/${convId}/messages.json`);
    const messages = Array.isArray(result?.data) ? result.data : [];
    return NextResponse.json({ messages });
  } catch {
    return NextResponse.json({ messages: [] });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ convId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { convId } = await params;

  try {
    const body = await req.json().catch(() => ({}));
    const { content, mediaUrl, mediaType, mediaName, mediaSize } = body;

    if (!content && !mediaUrl) {
      return NextResponse.json({ error: 'Message must have content or media' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const message: Message = {
      id: uuidv4(),
      conversationId: convId,
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

    // Load existing messages
    const existing = await getJSON<Message[]>('msgs', `conversations/${convId}/messages.json`);
    const messages = Array.isArray(existing?.data) ? existing.data : [];
    messages.push(message);

    await putJSON(
      'msgs',
      `conversations/${convId}/messages.json`,
      messages,
      `Message in ${convId}`,
      existing?.sha
    );

    // Update conversation metadata in index
    try {
      const indexFile = await getJSON<Conversation[]>('msgs', 'conversations/index.json');
      if (indexFile && Array.isArray(indexFile.data)) {
        const index = indexFile.data.map((c) =>
          c.id === convId
            ? { ...c, lastMessage: content || `[${mediaType}]`, lastMessageAt: now, updatedAt: now }
            : c
        );
        await putJSON('msgs', 'conversations/index.json', index, `Update conv meta: ${convId}`, indexFile.sha);
      }
    } catch (indexErr) {
      console.warn('Index update warning:', indexErr);
    }

    return NextResponse.json({ message }, { status: 201 });
  } catch (err: any) {
    console.error('Send message error:', err);
    return NextResponse.json({ error: err.message || 'Failed to send message' }, { status: 500 });
  }
}
