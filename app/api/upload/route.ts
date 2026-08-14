import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { uploadToCatbox } from '@/lib/catbox';

const MAX_SIZE = 15 * 1024 * 1024; // 15MB

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large. Maximum 15MB allowed.' }, { status: 413 });
    }

    // Determine media type
    const mime = file.type || '';
    let mediaType: 'image' | 'video' | 'file' = 'file';
    if (mime.startsWith('image/')) mediaType = 'image';
    else if (mime.startsWith('video/')) mediaType = 'video';

    const url = await uploadToCatbox(file);

    return NextResponse.json({
      url,
      mediaType,
      mediaName: file.name,
      mediaSize: file.size,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Upload failed';
    console.error('Upload error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const maxDuration = 60; // Allow up to 60s for large uploads
