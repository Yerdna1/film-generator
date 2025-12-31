import { Inngest } from 'inngest';

// Create a client to send and receive events
export const inngest = new Inngest({
  id: 'film-generator',
  name: 'Film Generator',
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
};
