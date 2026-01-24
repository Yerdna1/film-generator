export async function fetchAsBlob(url: string): Promise<Blob | null> {
  try {
    // Use proxy for external URLs to avoid CORS issues
    const needsProxy =
      (url.includes('s3.') && url.includes('amazonaws.com')) ||
      url.includes('aiquickdraw.com');

    const fetchUrl = needsProxy ? `/api/proxy?url=${encodeURIComponent(url)}` : url;

    const response = await fetch(fetchUrl);
    if (!response.ok) return null;
    return await response.blob();
  } catch (error) {
    console.error('Failed to fetch:', url, error);
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
  }
  const match = url.match(/\.([a-z0-9]+)(?:\?|$)/i);
  if (match) return match[1];
  return 'bin';
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
