/**
 * KIE.ai Models API Routes
 *
 * GET /api/kie-models?type=video|image|tts|music|llm - Fetch models by type
 * GET /api/kie-models/:type/:modelId - Fetch specific model
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getVideoModels,
  getImageModels,
  getTtsModels,
  getMusicModels,
  getLlmModels,
  getVideoModelById,
  getImageModelById,
  getTtsModelById,
  getMusicModelById,
  getLlmModelById,
} from '@/lib/db/kie-models';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');

    console.log('[KIE Models API] Fetching models for type:', type);

    switch (type) {
      case 'video':
        const videoModels = await getVideoModels();
        console.log('[KIE Models API] Returning', videoModels.length, 'video models');
        return NextResponse.json({ models: videoModels });

      case 'image':
        const imageModels = await getImageModels();
        console.log('[KIE Models API] Returning', imageModels.length, 'image models');
        return NextResponse.json({ models: imageModels });

      case 'tts':
        const ttsModels = await getTtsModels();
        console.log('[KIE Models API] Returning', ttsModels.length, 'TTS models');
        return NextResponse.json({ models: ttsModels });

      case 'music':
        const musicModels = await getMusicModels();
        console.log('[KIE Models API] Returning', musicModels.length, 'music models');
        return NextResponse.json({ models: musicModels });

      case 'llm':
        const llmModels = await getLlmModels();
        console.log('[KIE Models API] Returning', llmModels.length, 'LLM models');
        return NextResponse.json({ models: llmModels });

      default:
        console.log('[KIE Models API] Invalid type:', type);
        return NextResponse.json(
          { error: 'Invalid type. Use: video, image, tts, music, or llm' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[KIE Models API] Error fetching KIE models:', error);
    console.error('[KIE Models API] Error stack:', error instanceof Error ? error.stack : 'No stack');
    return NextResponse.json(
      { error: 'Failed to fetch models', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
