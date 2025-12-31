import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest/client';
import { generateImagesBatch } from '@/lib/inngest/functions/generate-images';

// Create an API route to handle Inngest events
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [generateImagesBatch],
});
