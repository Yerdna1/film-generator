import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest/client';
import { generateImagesBatch } from '@/lib/inngest/functions/generate-images';
import { generateScenesBatch } from '@/lib/inngest/functions/generate-scenes';
import { generateVideosBatch, cancelVideoGeneration } from '@/lib/inngest/functions/generate-videos';
import { generateVoiceoversBatch } from '@/lib/inngest/functions/generate-voiceovers';
import { generatePromptBatch } from '@/lib/inngest/functions/generate-prompt';
import { generateMusicBatch } from '@/lib/inngest/functions/music-generation';

// Create an API route to handle Inngest events
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    generatePromptBatch,
    generateImagesBatch,
    generateScenesBatch,
    generateVideosBatch,
    cancelVideoGeneration,
    generateVoiceoversBatch,
    generateMusicBatch,
  ],
});
