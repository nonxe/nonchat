/**
 * Uploads a file to Catbox with automatic fallback.
 * All media uploads go through our own /api/upload endpoint (server-side)
 * so the underlying service stays hidden from clients.
 */
export async function uploadToCatbox(file: File): Promise<string> {
  // 1. Try David Cyril uploader proxy first
  try {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('https://apis.davidcyril.name.ng/uploader/catbox', {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(6000),
    });

    if (res.ok) {
      const text = await res.text();
      try {
        const json = JSON.parse(text);
        const url = json?.url || json?.link || json?.data?.url || (typeof json === 'string' ? json : null);
        if (url && typeof url === 'string' && url.startsWith('http')) {
          return url.trim();
        }
      } catch {
        if (text.startsWith('http')) {
          return text.trim();
        }
      }
    }
  } catch (err) {
    console.warn('Catbox proxy failed, using direct endpoint fallback:', err);
  }

  // 2. Fallback to direct Catbox API
  try {
    const directForm = new FormData();
    directForm.append('reqtype', 'fileupload');
    directForm.append('fileToUpload', file, file.name);

    const directRes = await fetch('https://catbox.moe/user/api.php', {
      method: 'POST',
      body: directForm,
    });

    if (!directRes.ok) {
      const errorText = await directRes.text();
      throw new Error(`Upload failed (${directRes.status}): ${errorText}`);
    }

    const directUrl = (await directRes.text()).trim();
    if (!directUrl.startsWith('http')) {
      throw new Error(`Invalid response from storage: ${directUrl}`);
    }

    return directUrl;
  } catch (fallbackErr: any) {
    throw new Error(`Media upload failed: ${fallbackErr.message}`);
  }
}
