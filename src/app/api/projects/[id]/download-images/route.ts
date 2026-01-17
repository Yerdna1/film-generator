import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import JSZip from 'jszip';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch project with scenes
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        scenes: {
          orderBy: { number: 'asc' },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Filter scenes with images
    const scenesWithImages = project.scenes.filter(scene => scene.imageUrl);

    if (scenesWithImages.length === 0) {
      return NextResponse.json({ error: 'No images found' }, { status: 400 });
    }

    console.log(`[Download API] Creating ZIP for ${scenesWithImages.length} images`);

    // Create ZIP file
    const zip = new JSZip();

    // Generate alphabetical filename helper
    const getAlphabeticalFilename = (index: number): string => {
      const letters = 'abcdefghijklmnopqrstuvwxyz';
      let result = '';
      let num = index;
      do {
        result = letters[num % 26] + result;
        num = Math.floor(num / 26) - 1;
      } while (num >= 0);
      return `${result}1`;
    };

    // Fetch and add all images to ZIP
    let downloaded = 0;
    for (let i = 0; i < scenesWithImages.length; i++) {
      const scene = scenesWithImages[i];
      const filename = getAlphabeticalFilename(i);

      try {
        const response = await fetch(scene.imageUrl!);
        if (!response.ok) {
          console.error(`Failed to fetch image ${i + 1}: ${response.statusText}`);
          continue;
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Determine file extension
        let extension = '.jpg';
        const urlMatch = scene.imageUrl?.match(/\.(jpg|jpeg|png|webp|gif)(\?|$)/i);
        if (urlMatch) {
          extension = urlMatch[1].startsWith('.') ? urlMatch[1] : `.${urlMatch[1]}`;
        } else {
          // Try to get from content type
          const contentType = response.headers.get('content-type');
          if (contentType) {
            const mimeToExt: Record<string, string> = {
              'image/jpeg': '.jpg',
              'image/png': '.png',
              'image/webp': '.webp',
              'image/gif': '.gif',
            };
            extension = mimeToExt[contentType] || '.jpg';
          }
        }

        zip.file(`${filename}${extension}`, buffer);
        downloaded++;
        console.log(`Downloaded ${downloaded}/${scenesWithImages.length} images`);
      } catch (error) {
        console.error(`Error fetching image ${i + 1}:`, error);
      }
    }

    // Add prompts text file (only SCENE section, no characters)
    const promptsText = scenesWithImages
      .map((scene) => {
        // Extract only the SCENE section from the prompt
        const prompt = scene.textToImagePrompt || '';

        // Find the SCENE: section and extract its content
        const sceneMatch = prompt.match(/SCENE:\s*(.+?)(?=$)/s);
        if (sceneMatch) {
          return sceneMatch[1].trim();
        }

        // If no SCENE section found, fall back to the full prompt
        return prompt;
      })
      .join('\n\n');

    zip.file('image-prompts.txt', promptsText);

    console.log('[Download API] Generating ZIP buffer...');

    // Generate ZIP buffer
    const zipBuffer = await zip.generateAsync({ type: 'uint8array' });

    console.log(`[Download API] ZIP created: ${(zipBuffer.length / 1024 / 1024).toFixed(2)} MB`);

    // Return ZIP file as response
    return new NextResponse(zipBuffer as BodyInit, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="scene-images-${id.slice(0, 8)}.zip"`,
        'Content-Length': zipBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('[Download API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate ZIP file', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
