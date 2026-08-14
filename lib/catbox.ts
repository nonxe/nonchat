/**
 * High-speed, reliable media upload helper for NONCHAT.
 * Uploads media to permanent Catbox CDN with automatic fallback.
 */
export async function uploadToCatbox(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // 1. Direct Catbox.moe permanent upload (Primary)
  try {
    const blob = new Blob([buffer], { type: file.type || 'application/octet-stream' });
    const formData = new FormData();
    formData.append('reqtype', 'fileupload');
    formData.append('fileToUpload', blob, file.name || 'upload.bin');

    const res = await fetch('https://catbox.moe/user/api.php', {
      method: 'POST',
      body: formData,
    });

    if (res.ok) {
      const url = (await res.text()).trim();
      if (url.startsWith('http')) {
        return url;
      }
    }
  } catch (err) {
    console.warn('Primary Catbox upload failed, attempting fallback:', err);
  }

  // 2. Litterbox fallback
  try {
    const blob = new Blob([buffer], { type: file.type || 'application/octet-stream' });
    const formData = new FormData();
    formData.append('reqtype', 'fileupload');
    formData.append('time', '72h');
    formData.append('fileToUpload', blob, file.name || 'upload.bin');

    const res = await fetch('https://litterbox.catbox.moe/resources/internals/api.php', {
      method: 'POST',
      body: formData,
    });

    if (res.ok) {
      const url = (await res.text()).trim();
      if (url.startsWith('http')) {
        return url;
      }
    }
  } catch (fallbackErr) {
    console.error('Fallback upload failed:', fallbackErr);
  }

  throw new Error('Could not upload media. Please check your connection and try again.');
}
