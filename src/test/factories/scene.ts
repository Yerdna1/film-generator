import { prisma } from '../setup'

interface CreateSceneOptions {
  number?: number
  title?: string
  description?: string
  textToImagePrompt?: string
  imageToVideoPrompt?: string
  cameraShot?: string
  imageUrl?: string
  videoUrl?: string
  audioUrl?: string
  duration?: number
}

export async function createTestScene(projectId: string, options: CreateSceneOptions = {}) {
  return prisma.scene.create({
    data: {
      projectId,
      number: options.number ?? 1,
      title: options.title || 'Test Scene',
      description: options.description || 'A test scene description',
      textToImagePrompt: options.textToImagePrompt || 'A beautiful landscape',
      imageToVideoPrompt: options.imageToVideoPrompt || 'Camera pans slowly',
      cameraShot: options.cameraShot || 'medium',
      imageUrl: options.imageUrl,
      videoUrl: options.videoUrl,
      audioUrl: options.audioUrl,
      duration: options.duration ?? 6
    }
  })
}

export async function createTestScenes(projectId: string, count: number) {
  const scenes = []
  for (let i = 0; i < count; i++) {
    const scene = await createTestScene(projectId, {
      number: i + 1,
      title: `Scene ${i + 1}`,
      description: `Scene ${i + 1} description`,
      textToImagePrompt: `Prompt for scene ${i + 1}`
    })
    scenes.push(scene)
  }
  return scenes
}

export async function createSceneWithImage(projectId: string, options: CreateSceneOptions = {}) {
  return createTestScene(projectId, {
    ...options,
    imageUrl: options.imageUrl || 'https://mock-s3.com/scene-image.png'
  })
}

export async function createSceneWithVideo(projectId: string, options: CreateSceneOptions = {}) {
  return createTestScene(projectId, {
    ...options,
    imageUrl: options.imageUrl || 'https://mock-s3.com/scene-image.png',
    videoUrl: options.videoUrl || 'https://mock-s3.com/scene-video.mp4'
  })
}

export async function createFullScene(projectId: string, options: CreateSceneOptions = {}) {
  return createTestScene(projectId, {
    ...options,
    imageUrl: options.imageUrl || 'https://mock-s3.com/scene-image.png',
    videoUrl: options.videoUrl || 'https://mock-s3.com/scene-video.mp4',
    audioUrl: options.audioUrl || 'https://mock-s3.com/scene-audio.mp3'
  })
}
