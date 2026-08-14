import { NextRequest, NextResponse } from 'next/server';
import { getJSON, putJSON } from '@/lib/github';
import { getSession } from '@/lib/auth';
import type { Room } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  try {
    const result = await getJSON<Room[]>('msgs', 'global/rooms.json');
    const rooms = Array.isArray(result?.data) ? result.data : [];
    return NextResponse.json({ rooms });
  } catch {
    return NextResponse.json({ rooms: [] });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    const name = (body?.name || '').trim();
    const description = (body?.description || '').trim();
    if (!name) return NextResponse.json({ error: 'Room name required' }, { status: 400 });

    const roomsFile = await getJSON<Room[]>('msgs', 'global/rooms.json');
    const rooms = Array.isArray(roomsFile?.data) ? roomsFile.data : [];

    const now = new Date().toISOString();
    const room: Room = {
      id: uuidv4(),
      name: name.slice(0, 30),
      description: description.slice(0, 100),
      createdBy: session.username,
      createdAt: now,
      memberCount: 1,
      avatarUrl: null,
      isPublic: true,
    };

    rooms.push(room);
    await putJSON('msgs', 'global/rooms.json', rooms, `Create room: ${room.name}`, roomsFile?.sha);

    // Init room messages
    await putJSON('msgs', `rooms/${room.id}/messages.json`, [], `Init room: ${room.id}`);

    return NextResponse.json({ room }, { status: 201 });
  } catch (err: any) {
    console.error('Create room error:', err);
    return NextResponse.json({ error: err.message || 'Failed to create room' }, { status: 500 });
  }
}
