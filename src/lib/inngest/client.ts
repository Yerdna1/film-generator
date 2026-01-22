import { Inngest } from 'inngest';

// Create a client to send and receive events
export const inngest = new Inngest({
  id: 'film-generator',
  name: 'Film Generator',
  // Dev mode configuration
  isDev: process.env.NODE_ENV === 'development',
  baseUrl: process.env.INNGEST_DEV || undefined,
});

// Event types for type safety
export type InngestEvents = {
  'image/generate.batch': {
    data: {
      projectId: string;
      userId: string;
      batchId: string;
      scenes: Array<{
        sceneId: string;
        sceneNumber: number;
        prompt: string;
      }>;
      aspectRatio: string;
      resolution: string;
      referenceImages: Array<{
        name: string;
        imageUrl: string;
      }>;
    };
  };
  'image/generate.single': {
    data: {
      projectId: string;
      userId: string;
      batchId: string;
      sceneId: string;
      sceneNumber: number;
      prompt: string;
      aspectRatio: string;
      resolution: string;
      referenceImages: Array<{
        name: string;
        imageUrl: string;
      }>;
    };
  };
  'scenes/generate.batch': {
    data: {
      projectId: string;
      userId: string;
      jobId: string;
      story: {
        title: string;
        concept: string;
        genre: string;
        tone: string;
        setting: string;
      };
      characters: Array<{
        id: string;
        name: string;
        description: string;
        masterPrompt?: string;
      }>;
      style: string;
      sceneCount: number;
    };
  };
  'video/generate.batch': {
    data: {
      projectId: string;
      userId: string;
      jobId: string;
      scenes: Array<{
        sceneId: string;
        sceneNumber: number;
        imageUrl: string;
        prompt: string;
      }>;
      videoMode?: string;
      videoProvider?: string;
      videoModel?: string;
    };
  };
  'video/batch.cancel': {
    data: {
      jobId: string;
      batchId?: string;
    };
  };
  'voiceover/generate.batch': {
    data: {
      projectId: string;
      userId: string;
      batchId: string;
      audioLines: Array<{
        lineId: string;
        sceneId: string;
        sceneNumber: number;
        text: string;
        characterId: string;
        voiceId: string;
      }>;
      language: string;
      userHasOwnApiKey?: boolean;
    };
  };
  'voiceover/batch.cancel': {
    data: {
      batchId: string;
    };
  };
};
