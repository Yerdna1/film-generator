// S3 Media Upload Service
// Uploads images, videos, and audio to AWS S3 for public access

import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

export type MediaType = 'image' | 'video' | 'audio';

// SECURITY: Allowed MIME types to prevent malicious file uploads
const ALLOWED_MIME_TYPES: Record<MediaType, string[]> = {
  image: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'],
  video: ['video/mp4', 'video/webm', 'video/quicktime'],
  audio: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/aac', 'audio/l16', 'audio/pcm', 'audio/raw'],
};

// SECURITY: Maximum file sizes (in bytes)
const MAX_FILE_SIZES: Record<MediaType, number> = {
  image: 20 * 1024 * 1024,  // 20 MB
  video: 100 * 1024 * 1024, // 100 MB
  audio: 50 * 1024 * 1024,  // 50 MB
};

// SECURITY: Magic bytes for file type verification
const MAGIC_BYTES: Record<string, number[][]> = {
  // Images
  'image/png': [[0x89, 0x50, 0x4E, 0x47]],  // PNG
  'image/jpeg': [[0xFF, 0xD8, 0xFF]],        // JPEG
  'image/jpg': [[0xFF, 0xD8, 0xFF]],         // JPEG
  'image/webp': [[0x52, 0x49, 0x46, 0x46]],  // RIFF (WebP)
  'image/gif': [[0x47, 0x49, 0x46, 0x38]],   // GIF
  // Videos
  'video/mp4': [[0x00, 0x00, 0x00], [0x66, 0x74, 0x79, 0x70]],  // MP4 (ftyp at offset 4)
  'video/webm': [[0x1A, 0x45, 0xDF, 0xA3]],  // WebM/MKV
  'video/quicktime': [[0x00, 0x00, 0x00]],   // MOV (similar to MP4)
  // Audio - many have headers added during processing, so we're more lenient
  'audio/mpeg': [[0x49, 0x44, 0x33], [0xFF, 0xFB], [0xFF, 0xFA]],  // MP3 (ID3 or sync)
  'audio/wav': [[0x52, 0x49, 0x46, 0x46]],   // WAV (RIFF)
};

/**
 * SECURITY: Validate file type by checking MIME type and magic bytes
 */
function validateFileType(
  buffer: Buffer,
  claimedMimeType: string,
  mediaType: MediaType
): { valid: boolean; error?: string } {
  const baseMimeType = claimedMimeType.split(';')[0].toLowerCase();

  // Check if MIME type is allowed for this media type
  const allowed = ALLOWED_MIME_TYPES[mediaType];
  if (!allowed.includes(baseMimeType)) {
    return {
      valid: false,
      error: `Invalid file type: ${baseMimeType}. Allowed types for ${mediaType}: ${allowed.join(', ')}`,
    };
  }

  // Check file size
  if (buffer.length > MAX_FILE_SIZES[mediaType]) {
    const maxMB = MAX_FILE_SIZES[mediaType] / (1024 * 1024);
    return {
      valid: false,
      error: `File too large. Maximum size for ${mediaType}: ${maxMB} MB`,
    };
  }

  // Verify magic bytes if available (skip for raw audio which may be processed)
  const magicSignatures = MAGIC_BYTES[baseMimeType];
  if (magicSignatures && buffer.length >= 8) {
    let matchFound = false;

    for (const signature of magicSignatures) {
      let matches = true;
      for (let i = 0; i < signature.length; i++) {
        if (buffer[i] !== signature[i]) {
          matches = false;
          break;
        }
      }
      if (matches) {
        matchFound = true;
        break;
      }
    }

    // For video/mp4, also check for 'ftyp' at offset 4
    if (!matchFound && (baseMimeType === 'video/mp4' || baseMimeType === 'video/quicktime')) {
      if (buffer.length >= 8) {
        const ftyp = buffer.slice(4, 8).toString('ascii');
        if (ftyp === 'ftyp') {
          matchFound = true;
        }
      }
    }

    if (!matchFound) {
      return {
        valid: false,
        error: `File content does not match claimed type: ${baseMimeType}`,
      };
    }
  }

  return { valid: true };
}

/**
 * Determine media type from MIME type
 */
function getMediaTypeFromMime(mimeType: string): MediaType | null {
  const baseMime = mimeType.split(';')[0].toLowerCase();
  if (baseMime.startsWith('image/')) return 'image';
  if (baseMime.startsWith('video/')) return 'video';
  if (baseMime.startsWith('audio/')) return 'audio';
  return null;
}

// Initialize S3 client
const getS3Client = () => {
  const region = process.env.AWS_REGION || 'eu-central-1';
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error('AWS credentials not configured. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in .env');
  }

  return new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
};

export interface UploadResult {
  success: boolean;
  url?: string;
  key?: string;
  error?: string;
}

/**
 * Upload a base64 image to S3
 * @param base64Data - Base64 encoded image data (with or without data URL prefix)
 * @param folder - Optional folder/prefix for the S3 key
 * @returns Public URL of the uploaded image
 */
export async function uploadBase64ToS3(
  base64Data: string,
  folder: string = 'artflowly'
): Promise<UploadResult> {
  try {
    const bucket = process.env.AWS_S3_BUCKET;
    const region = process.env.AWS_REGION || 'eu-central-1';

    if (!bucket) {
      return {
        success: false,
        error: 'AWS_S3_BUCKET not configured in .env',
      };
    }

    // Parse base64 data URL
    let mimeType = 'application/octet-stream';
    let base64Content = base64Data;

    if (base64Data.startsWith('data:')) {
      // Match data URL format - handle MIME types with parameters (e.g., audio/L16;rate=24000)
      const matches = base64Data.match(/^data:([^;,]+)[^,]*,(.+)$/);
      if (matches) {
        mimeType = matches[1];
        base64Content = matches[2];
      }
    }

    // Extract base MIME type (without parameters like ;rate=24000)
    const baseMimeType = mimeType.split(';')[0].toLowerCase();

    // Determine file extension from mime type
    const extMap: Record<string, string> = {
      // Images
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/webp': 'webp',
      'image/gif': 'gif',
      // Videos
      'video/mp4': 'mp4',
      'video/webm': 'webm',
      'video/quicktime': 'mov',
      // Audio
      'audio/mpeg': 'mp3',
      'audio/mp3': 'mp3',
      'audio/wav': 'wav',
      'audio/ogg': 'ogg',
      'audio/webm': 'webm',
      'audio/aac': 'aac',
      'audio/l16': 'wav',  // PCM audio from Gemini TTS
      'audio/pcm': 'wav',  // Raw PCM audio
      'audio/raw': 'wav',  // Raw audio
    };

    // Try exact match first, then base MIME type
    let extension = extMap[mimeType] || extMap[baseMimeType];

    // If still no match but it's audio, default to wav
    if (!extension && baseMimeType.startsWith('audio/')) {
      extension = 'wav';
    }

    extension = extension || 'bin';

    // Generate unique key
    const key = `${folder}/${uuidv4()}.${extension}`;

    // Convert base64 to buffer
    const buffer = Buffer.from(base64Content, 'base64');

    // SECURITY: Validate file type and size
    const mediaType = getMediaTypeFromMime(mimeType);
    if (mediaType) {
      const validation = validateFileType(buffer, mimeType, mediaType);
      if (!validation.valid) {
        console.warn('[S3] File validation failed:', validation.error);
        return {
          success: false,
          error: validation.error,
        };
      }
    }

    // Upload to S3
    const s3Client = getS3Client();
    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        // Cache for 1 day
        CacheControl: 'max-age=86400',
      })
    );

    // Construct public URL
    const url = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;

    console.log(`[S3] Uploaded ${baseMimeType} to:`, url);

    return {
      success: true,
      url,
      key,
    };
  } catch (error) {
    console.error('S3 upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload to S3',
    };
  }
}

/**
 * Upload multiple base64 images to S3
 * @param images - Array of base64 encoded images
 * @param folder - Optional folder/prefix for the S3 keys
 * @returns Array of upload results
 */
export async function uploadMultipleToS3(
  images: string[],
  folder: string = 'artflowly'
): Promise<UploadResult[]> {
  return Promise.all(images.map((img) => uploadBase64ToS3(img, folder)));
}

/**
 * Upload an image to S3
 * @param base64Data - Base64 encoded image
 * @param projectId - Project ID for organization
 * @returns Public URL of the uploaded image
 */
export async function uploadImageToS3(
  base64Data: string,
  projectId?: string
): Promise<UploadResult> {
  const folder = projectId ? `artflowly/${projectId}/images` : 'artflowly/images';
  return uploadBase64ToS3(base64Data, folder);
}

/**
 * Upload a video to S3
 * @param base64Data - Base64 encoded video
 * @param projectId - Project ID for organization
 * @returns Public URL of the uploaded video
 */
export async function uploadVideoToS3(
  base64Data: string,
  projectId?: string
): Promise<UploadResult> {
  const folder = projectId ? `artflowly/${projectId}/videos` : 'artflowly/videos';
  return uploadBase64ToS3(base64Data, folder);
}

/**
 * Upload audio to S3
 * @param base64Data - Base64 encoded audio
 * @param projectId - Project ID for organization
 * @returns Public URL of the uploaded audio
 */
export async function uploadAudioToS3(
  base64Data: string,
  projectId?: string
): Promise<UploadResult> {
  const folder = projectId ? `artflowly/${projectId}/audio` : 'artflowly/audio';
  return uploadBase64ToS3(base64Data, folder);
}

/**
 * Upload a buffer to S3 with a specific key
 * @param buffer - File buffer
 * @param key - S3 key (path in bucket)
 * @param contentType - MIME type
 * @returns Public URL of the uploaded file
 */
export async function uploadBufferToS3(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  const bucket = process.env.AWS_S3_BUCKET;
  const region = process.env.AWS_REGION || 'eu-central-1';

  if (!bucket) {
    throw new Error('AWS_S3_BUCKET not configured');
  }

  // SECURITY: Validate file type and size
  const mediaType = getMediaTypeFromMime(contentType);
  if (mediaType) {
    const validation = validateFileType(buffer, contentType, mediaType);
    if (!validation.valid) {
      throw new Error(`File validation failed: ${validation.error}`);
    }
  }

  const s3Client = getS3Client();

  await s3Client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));

  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

/**
 * Check if S3 is configured
 */
export function isS3Configured(): boolean {
  return !!(
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_S3_BUCKET
  );
}

/**
 * Delete a file from S3 by its URL
 * @param url - The full S3 URL of the file to delete
 * @returns Success status
 */
export async function deleteFromS3(url: string): Promise<{ success: boolean; error?: string }> {
  try {
    const bucket = process.env.AWS_S3_BUCKET;
    const region = process.env.AWS_REGION || 'eu-central-1';

    if (!bucket) {
      return {
        success: false,
        error: 'AWS_S3_BUCKET not configured',
      };
    }

    // Extract key from URL
    // URL format: https://bucket.s3.region.amazonaws.com/key
    const urlPattern = new RegExp(`https://${bucket}\\.s3\\.${region}\\.amazonaws\\.com/(.+)`);
    const match = url.match(urlPattern);

    if (!match) {
      console.warn('[S3] URL does not match expected pattern, skipping delete:', url);
      return {
        success: false,
        error: 'URL does not match S3 bucket pattern',
      };
    }

    const key = decodeURIComponent(match[1]);

    const s3Client = getS3Client();
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    );

    console.log(`[S3] Deleted:`, key);

    return { success: true };
  } catch (error) {
    console.error('S3 delete error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete from S3',
    };
  }
}
