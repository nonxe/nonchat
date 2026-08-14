import { NextResponse } from 'next/server';
import { getJSON } from '@/lib/github';
import type { PublicUser } from '@/lib/types';

export async function GET() {
  try {
    const result = await getJSON<PublicUser[]>('users', 'index.json');
    return NextResponse.json({ users: result?.data || [] });
  } catch {
    return NextResponse.json({ users: [] });
  }
}
