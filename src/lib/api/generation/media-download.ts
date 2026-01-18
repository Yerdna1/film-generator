import { ProviderError } from '@/lib/providers/types';

export interface DownloadOptions {
  url: string;
  contentType?: string;
  maxSize?: number;
  timeout?: number;
}

export interface DownloadResult {
  base64: string;
  contentType: string;
  size: number;
}

/**
 * Download media from URL and convert to base64
 */
export async function downloadMediaAsBase64(
  options: DownloadOptions
): Promise<DownloadResult> {
  const {
    url,
    contentType: requestedContentType,
    maxSize = 100 * 1024 * 1024, // 100MB default
    timeout = 30000, // 30 seconds default
  } = options;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'FilmGenerator/1.0',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new ProviderError(
        `Failed to download media: ${response.status} ${response.statusText}`,
        'DOWNLOAD_ERROR',
        'system',
        { status: response.status, url }
      );
    }

    // Get content type from response headers
    const contentType = requestedContentType ||
      response.headers.get('content-type') ||
      inferContentType(url);

    // Check content length if available
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > maxSize) {
      throw new ProviderError(
        `Media file too large: ${contentLength} bytes (max: ${maxSize})`,
        'FILE_TOO_LARGE',
        'system',
        { size: parseInt(contentLength), maxSize }
      );
    }

    // Read response as buffer
    const buffer = await response.arrayBuffer();

    if (buffer.byteLength > maxSize) {
      throw new ProviderError(
        `Media file too large: ${buffer.byteLength} bytes (max: ${maxSize})`,
        'FILE_TOO_LARGE',
        'system',
        { size: buffer.byteLength, maxSize }
      );
    }

    // Convert to base64
    const base64 = Buffer.from(buffer).toString('base64');

    return {
      base64,
      contentType,
      size: buffer.byteLength,
    };
  } catch (error) {
    if (error instanceof ProviderError) {
      throw error;
    }

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new ProviderError(
          'Media download timeout',
          'DOWNLOAD_TIMEOUT',
          'system',
          { url, timeout }
        );
      }

      throw new ProviderError(
        `Media download failed: ${error.message}`,
        'DOWNLOAD_ERROR',
        'system',
        { url, error: error.message }
      );
    }

    throw new ProviderError(
      'Unknown media download error',
      'DOWNLOAD_ERROR',
      'system',
      { url }
    );
  }
}

/**
 * Download video and convert to base64
 */
export async function downloadVideoAsBase64(
  url: string,
  timeout?: number
): Promise<string | null> {
  try {
    const result = await downloadMediaAsBase64({
      url,
      contentType: 'video/mp4',
      maxSize: 500 * 1024 * 1024, // 500MB for videos
      timeout: timeout || 60000, // 60 seconds for videos
    });
    return result.base64;
  } catch (error) {
    console.error('Failed to download video:', error);
    return null;
  }
}

/**
 * Download audio and convert to base64
 */
export async function downloadAudioAsBase64(
  url: string,
  format?: 'mp3' | 'wav' | 'opus' | 'aac',
  timeout?: number
): Promise<string | null> {
  try {
    const contentType = format ? getAudioContentType(format) : undefined;
    const result = await downloadMediaAsBase64({
      url,
      contentType,
      maxSize: 50 * 1024 * 1024, // 50MB for audio
      timeout: timeout || 30000, // 30 seconds for audio
    });
    return result.base64;
  } catch (error) {
    console.error('Failed to download audio:', error);
    return null;
  }
}

/**
 * Download image and convert to base64
 */
export async function downloadImageAsBase64(
  url: string,
  timeout?: number
): Promise<string | null> {
  try {
    const result = await downloadMediaAsBase64({
      url,
      maxSize: 20 * 1024 * 1024, // 20MB for images
      timeout: timeout || 10000, // 10 seconds for images
    });
    return result.base64;
  } catch (error) {
    console.error('Failed to download image:', error);
    return null;
  }
}

/**
 * Batch download media files
 */
export async function batchDownloadMedia(
  urls: string[],
  type: 'image' | 'video' | 'audio',
  concurrency = 3
): Promise<Array<{ url: string; base64: string | null; error?: string }>> {
  const results: Array<{ url: string; base64: string | null; error?: string }> = [];

  // Process in batches
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);
    const batchPromises = batch.map(async (url) => {
      try {
        let base64: string | null = null;

        switch (type) {
          case 'image':
            base64 = await downloadImageAsBase64(url);
            break;
          case 'video':
            base64 = await downloadVideoAsBase64(url);
            break;
          case 'audio':
            base64 = await downloadAudioAsBase64(url);
            break;
        }

        return { url, base64 };
      } catch (error) {
        return {
          url,
          base64: null,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }

  return results;
}

/**
 * Infer content type from URL extension
 */
function inferContentType(url: string): string {
  const extension = url.split('.').pop()?.toLowerCase();

  switch (extension) {
    // Video formats
    case 'mp4':
      return 'video/mp4';
    case 'webm':
      return 'video/webm';
    case 'mov':
      return 'video/quicktime';
    case 'avi':
      return 'video/x-msvideo';

    // Audio formats
    case 'mp3':
      return 'audio/mpeg';
    case 'wav':
      return 'audio/wav';
    case 'opus':
      return 'audio/opus';
    case 'ogg':
      return 'audio/ogg';
    case 'aac':
      return 'audio/aac';
    case 'm4a':
      return 'audio/mp4';

    // Image formats
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    case 'svg':
      return 'image/svg+xml';

    default:
      return 'application/octet-stream';
  }
}

/**
 * Get audio content type from format
 */
function getAudioContentType(format: string): string {
  switch (format) {
    case 'mp3':
      return 'audio/mpeg';
    case 'wav':
      return 'audio/wav';
    case 'opus':
      return 'audio/opus';
    case 'aac':
      return 'audio/aac';
    default:
      return 'audio/mpeg';
  }
}

/**
 * Stream download for large files
 */
export async function streamDownload(
  url: string,
  onChunk: (chunk: Uint8Array, progress: number) => void,
  options?: {
    timeout?: number;
    signal?: AbortSignal;
  }
): Promise<void> {
  const response = await fetch(url, {
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new ProviderError(
      `Stream download failed: ${response.status}`,
      'STREAM_ERROR',
      'system',
      { status: response.status, url }
    );
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new ProviderError(
      'No response body',
      'STREAM_ERROR',
      'system',
      { url }
    );
  }

  const contentLength = response.headers.get('content-length');
  const totalBytes = contentLength ? parseInt(contentLength) : 0;
  let receivedBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      receivedBytes += value.length;
      const progress = totalBytes > 0 ? (receivedBytes / totalBytes) * 100 : 0;

      onChunk(value, progress);
    }
  } finally {
    reader.releaseLock();
  }
}