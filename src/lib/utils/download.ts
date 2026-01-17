import JSZip from 'jszip';
import type { Scene } from '@/types/project';

/**
 * Generates an alphabetical filename based on index (0 -> a1, 1 -> b1, 26 -> aa1, etc.)
 */
function getAlphabeticalFilename(index: number): string {
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  let result = '';

  let num = index;
  do {
    result = letters[num % 26] + result;
    num = Math.floor(num / 26) - 1;
  } while (num >= 0);

  return `${result}1`;
}

/**
 * Downloads an image from a URL and returns it as a Blob
 */
async function downloadImageAsBlob(url: string): Promise<Blob> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }
  return response.blob();
}

/**
 * Triggers a browser download for a blob
 */
function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Downloads all images from scenes with alphabetical naming (a1, b1, c1, etc.)
 * and saves all prompts to a text file with blank lines between prompts
 * All files are bundled into a single ZIP file
 */
export async function downloadAllImagesAndPrompts(scenes: Scene[]): Promise<void> {
  console.log('[Download] Starting download process...');
  console.log('[Download] Total scenes:', scenes.length);

  // Filter scenes that have images and sort by scene number
  const scenesWithImages = scenes
    .filter(scene => scene.imageUrl)
    .sort((a, b) => (a.number || 0) - (b.number || 0));

  console.log(`[Download] Found ${scenesWithImages.length} scenes with images`);
  console.log('[Download] Sample image URLs:', scenesWithImages.slice(0, 3).map(s => s.imageUrl));

  if (scenesWithImages.length === 0) {
    throw new Error('No scenes with images found');
  }

  // Create a new ZIP file
  const zip = new JSZip();

  // Add images to the ZIP with alphabetical names
  console.log('[Download] Fetching images...');
  let completed = 0;

  const imagePromises = scenesWithImages.map(async (scene, index) => {
    try {
      const filename = getAlphabeticalFilename(index);
      console.log(`[Download] Fetching image ${index + 1}/${scenesWithImages.length}: ${filename} from ${scene.imageUrl?.substring(0, 50)}...`);

      const response = await fetch(scene.imageUrl!);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();
      console.log(`[Download] Got blob: ${blob.type}, size: ${blob.size}`);

      // Determine file extension from content type or URL
      let extension = '.jpg';
      const urlMatch = scene.imageUrl?.match(/\.(jpg|jpeg|png|webp|gif)(\?|$)/i);
      if (urlMatch) {
        extension = urlMatch[1].startsWith('.') ? urlMatch[1] : `.${urlMatch[1]}`;
      } else if (blob.type) {
        // Fallback to MIME type
        const mimeToExt: Record<string, string> = {
          'image/jpeg': '.jpg',
          'image/png': '.png',
          'image/webp': '.webp',
          'image/gif': '.gif',
        };
        extension = mimeToExt[blob.type] || '.jpg';
      }

      // Add image to ZIP
      zip.file(`${filename}${extension}`, blob);
      completed++;
      console.log(`[Download] Progress: ${completed}/${scenesWithImages.length} images fetched`);
      return { success: true, sceneId: scene.id, filename: `${filename}${extension}` };
    } catch (error) {
      console.error(`[Download] Failed to download image for scene ${scene.title}:`, error);
      return { success: false, sceneId: scene.id, error };
    }
  });

  // Wait for all images to be fetched and added to ZIP
  const results = await Promise.all(imagePromises);

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`[Download] Fetch complete: ${successful} succeeded, ${failed} failed`);

  if (successful === 0) {
    throw new Error('Failed to download any images. Check console for details.');
  }

  console.log('[Download] Creating prompts file...');

  // Create prompts text file with blank lines between prompts
  const promptsText = scenesWithImages
    .map((scene, index) => {
      const filename = getAlphabeticalFilename(index);
      const sceneNumber = scene.number || index + 1;
      return `[${filename}] Scene ${sceneNumber}: ${scene.title}\n${scene.textToImagePrompt}`;
    })
    .join('\n\n');

  // Add prompts text file to ZIP
  zip.file('image-prompts.txt', promptsText);

  console.log('[Download] Generating ZIP file...');
  console.log('[Download] ZIP contents:', Object.keys(zip.files));

  // Generate the ZIP file
  const zipBlob = await zip.generateAsync({ type: 'blob' });

  console.log('[Download] ZIP blob created:', zipBlob.type, zipBlob.size);

  // Download the ZIP file
  triggerDownload(zipBlob, 'scene-images.zip');

  console.log(`[Download] Complete: ${successful} images added to ZIP, ${failed} failed`);
}
