/**
 * Uploads a file to Catbox via the proxy API.
 * All media uploads go through our own /api/upload endpoint (server-side)
 * so the underlying service stays hidden from clients.
 */
export async function uploadToCatbox(formData: FormData): Promise<string> {
  const CATBOX_API = 'https://apis.davidcyril.name.ng/uploader/catbox';

  const res = await fetch(CATBOX_API, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upload failed: ${res.status} ${text}`);
  }

  const json = await res.json().catch(async () => {
    // Some catbox responses are plain text URLs
    return { url: await res.text() };
  });

  const url: string = json?.url || json?.link || json?.data?.url || json;
  if (!url || typeof url !== 'string' || !url.startsWith('http')) {
    throw new Error('Invalid upload response');
  }
  return url.trim();
}
