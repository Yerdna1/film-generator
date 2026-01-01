// Import project from uploaded files
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { uploadBufferToS3 } from '@/lib/services/s3-upload';
import { nanoid } from 'nanoid';

export const maxDuration = 300; // 5 minutes for large uploads

interface ImportedScene {
  number: number;
  title: string;
  description?: string;
  textToImagePrompt?: string;
  imageToVideoPrompt?: string;
  dialogue?: Array<{ character: string; text: string }>;
}

interface ImportedCharacter {
  name: string;
  description?: string;
  visualDescription?: string;
}

interface ProjectMetadata {
  name: string;
  style?: string;
  story?: string;
  masterPrompt?: string;
  characters?: ImportedCharacter[];
  scenes?: ImportedScene[];
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const metadataFile = formData.get('metadata') as File | null;

    if (!metadataFile) {
      return NextResponse.json({ error: 'Missing metadata.json file' }, { status: 400 });
    }

    // Parse metadata
    const metadataText = await metadataFile.text();
    const metadata: ProjectMetadata = JSON.parse(metadataText);

    if (!metadata.name) {
      return NextResponse.json({ error: 'Project name is required in metadata' }, { status: 400 });
    }

    // Create project
    const projectId = `cm${nanoid(22)}`;
    const project = await prisma.project.create({
      data: {
        id: projectId,
        name: metadata.name,
        userId: session.user.id,
        style: metadata.style || 'cinematic',
        masterPrompt: metadata.masterPrompt || '',
        currentStep: 5,
        isComplete: false,
        story: metadata.story ? { content: metadata.story } : undefined,
      },
    });

    // Process characters
    const characterIds: Record<string, string> = {};
    if (metadata.characters) {
      for (const char of metadata.characters) {
        const charId = `cm${nanoid(22)}`;
        characterIds[char.name.toLowerCase()] = charId;

        // Check for character image
        const charImageFile = formData.get(`character_${char.name.toLowerCase()}`) as File | null;
        let imageUrl: string | null = null;

        if (charImageFile) {
          const buffer = Buffer.from(await charImageFile.arrayBuffer());
          const ext = charImageFile.name.split('.').pop() || 'jpeg';
          const s3Key = `projects/${projectId}/characters/${charId}.${ext}`;
          imageUrl = await uploadBufferToS3(buffer, s3Key, charImageFile.type);
        }

        await prisma.character.create({
          data: {
            id: charId,
            projectId: projectId,
            name: char.name,
            description: char.description || '',
            visualDescription: char.visualDescription || '',
            masterPrompt: char.visualDescription || '',
            imageUrl,
          },
        });
      }
    }

    // Process scenes
    const sceneCount = metadata.scenes?.length || 0;
    if (metadata.scenes) {
      for (const scene of metadata.scenes) {
        const sceneId = `cm${nanoid(22)}`;

        // Check for scene image
        const imageFile = formData.get(`scene_${scene.number}_image`) as File | null;
        const videoFile = formData.get(`scene_${scene.number}_video`) as File | null;

        let imageUrl: string | null = null;
        let videoUrl: string | null = null;

        if (imageFile) {
          const buffer = Buffer.from(await imageFile.arrayBuffer());
          const ext = imageFile.name.split('.').pop() || 'jpeg';
          const s3Key = `projects/${projectId}/scenes/${sceneId}/image.${ext}`;
          imageUrl = await uploadBufferToS3(buffer, s3Key, imageFile.type);
        }

        if (videoFile) {
          const buffer = Buffer.from(await videoFile.arrayBuffer());
          const ext = videoFile.name.split('.').pop() || 'mp4';
          const s3Key = `projects/${projectId}/scenes/${sceneId}/video.${ext}`;
          videoUrl = await uploadBufferToS3(buffer, s3Key, videoFile.type);
        }

        await prisma.scene.create({
          data: {
            id: sceneId,
            projectId: projectId,
            number: scene.number,
            title: scene.title,
            description: scene.description || '',
            textToImagePrompt: scene.textToImagePrompt || '',
            imageToVideoPrompt: scene.imageToVideoPrompt || '',
            imageUrl,
            videoUrl,
            dialogue: scene.dialogue || [],
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      project: {
        id: project.id,
        name: project.name,
        characters: Object.keys(characterIds).length,
        scenes: sceneCount,
      },
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to import project' },
      { status: 500 }
    );
  }
}
