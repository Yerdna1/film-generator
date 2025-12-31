import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest/client';
import { generateImagesBatch } from '@/lib/inngest/functions/generate-images';
import { generateScenesBatch } from '@/lib/inngest/functions/generate-scenes';

// Create an API route to handle Inngest events
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [generateImagesBatch, generateScenesBatch],
});
