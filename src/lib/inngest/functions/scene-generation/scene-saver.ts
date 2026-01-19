import { prisma } from '@/lib/db/prisma';
import type { Scene, Character } from './types';

export async function saveScenesToDatabase(options: {
  projectId: string;
  scenes: Scene[];
  characters: Character[];
}): Promise<number> {
  const { projectId, scenes, characters } = options;
  let savedCount = 0;

  for (const scene of scenes) {
    // Check if scene already exists (in case of retry)
    const existingScene = await prisma.scene.findFirst({
      where: { projectId, number: scene.number },
    });

    if (existingScene) {
      console.log(`[Inngest Scenes] Scene ${scene.number} already exists, skipping`);
      continue;
    }

    const dialogue = scene.dialogue?.map((line) => {
      const character = characters.find(
        (c) => c.name.toLowerCase() === line.characterName?.toLowerCase()
      );
      return {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        characterId: character?.id || characters[0]?.id || '',
        characterName: line.characterName || 'Unknown',
        text: line.text || '',
      };
    }) || [];

    await prisma.scene.create({
      data: {
        projectId,
        number: scene.number,
        title: scene.title || `Scene ${scene.number}`,
        description: '',
        textToImagePrompt: scene.textToImagePrompt || '',
        imageToVideoPrompt: scene.imageToVideoPrompt || '',
        cameraShot: scene.cameraShot || 'medium',
        dialogue: dialogue,
        duration: 6,
      },
    });

    savedCount++;
  }

  return savedCount;
}

export async function getExistingSceneCount(projectId: string): Promise<number> {
  return prisma.scene.count({ where: { projectId } });
}
