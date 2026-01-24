export async function fetchAsBlob(url: string): Promise<Blob | null> {
  try {
    console.log('[fetchAsBlob] Fetching URL:', url.substring(0, 100) + (url.length > 100 ? '...' : ''));

    // Handle base64 data URLs directly
    if (url.startsWith('data:')) {
      console.log('[fetchAsBlob] Handling as base64 data URL');
      try {
        const [metadata, base64] = url.split(',');
        if (!base64) {
          console.error('[fetchAsBlob] Invalid base64 data URL');
          return null;
        }

        const byteString = atob(base64);
        const byteArray = new Uint8Array(byteString.length);
        for (let i = 0; i < byteString.length; i++) {
          byteArray[i] = byteString.charCodeAt(i);
        }

        const mimeType = metadata.split(':')[1]?.split(';')[0] || 'audio/mpeg';
        const blob = new Blob([byteArray], { type: mimeType });
        console.log('[fetchAsBlob] Base64 blob created! Size:', blob.size, 'type:', blob.type);
        return blob;
      } catch (error) {
        console.error('[fetchAsBlob] Failed to decode base64:', error);
        return null;
      }
    }

    // Use proxy for external URLs to avoid CORS issues
    const needsProxy =
      (url.includes('s3.') && url.includes('amazonaws.com')) ||
      url.includes('aiquickdraw.com') ||
      url.includes('amazonaws.com');

    const fetchUrl = needsProxy ? `/api/proxy?url=${encodeURIComponent(url)}` : url;
    console.log('[fetchAsBlob] Using proxy:', needsProxy);

    const response = await fetch(fetchUrl);
    console.log('[fetchAsBlob] Response status:', response.status, 'ok:', response.ok);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error('[fetchAsBlob] Failed response:', response.status, errorText);
      return null;
    }

    const blob = await response.blob();
    console.log('[fetchAsBlob] Success! Blob size:', blob.size, 'type:', blob.type);
    return blob;
  } catch (error) {
    console.error('[fetchAsBlob] Failed to fetch:', error);
    return null;
  }
}

export function getExtension(url: string, mimeType?: string): string {
  if (mimeType) {
    if (mimeType.includes('mp4')) return 'mp4';
    if (mimeType.includes('webm')) return 'webm';
    if (mimeType.includes('png')) return 'png';
    if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'jpg';
    if (mimeType.includes('webp')) return 'webp';
    if (mimeType.includes('mp3')) return 'mp3';
    if (mimeType.includes('wav')) return 'wav';
    if (mimeType.includes('ogg')) return 'ogg';
    if (mimeType.includes('mpeg')) return 'mp3';
  }

  // For base64 data URLs, check the mime type in the URL
  if (url.startsWith('data:')) {
    const mimeType = url.split(':')[1]?.split(';')[0] || '';
    if (mimeType.includes('mp3') || mimeType.includes('mpeg')) return 'mp3';
    if (mimeType.includes('wav')) return 'wav';
    if (mimeType.includes('ogg')) return 'ogg';
  }

  const match = url.match(/\.([a-z0-9]+)(?:\?|$)/i);
  if (match) return match[1];
  return 'mp3'; // Default to mp3 for audio
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export function sanitizeFilename(name: string): string {
  return name.replace(/\s+/g, '_');
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
