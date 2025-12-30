// S3 Media Upload Service
// Uploads images, videos, and audio to AWS S3 for public access

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

export type MediaType = 'image' | 'video' | 'audio';

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
  folder: string = 'film-generator'
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
    let mimeType = 'image/png';
    let base64Content = base64Data;

    if (base64Data.startsWith('data:')) {
      const matches = base64Data.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        mimeType = matches[1];
        base64Content = matches[2];
      }
    }

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
    };
    const extension = extMap[mimeType] || 'bin';

    // Generate unique key
    const key = `${folder}/${uuidv4()}.${extension}`;

    // Convert base64 to buffer
    const buffer = Buffer.from(base64Content, 'base64');

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

    console.log('Uploaded image to S3:', url);

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
  folder: string = 'film-generator'
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
  const folder = projectId ? `film-generator/${projectId}/images` : 'film-generator/images';
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
  const folder = projectId ? `film-generator/${projectId}/videos` : 'film-generator/videos';
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
  const folder = projectId ? `film-generator/${projectId}/audio` : 'film-generator/audio';
  return uploadBase64ToS3(base64Data, folder);
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
