/**
 * KIE.ai Model By ID API Route
 *
 * GET /api/kie-models/:type/:modelId - Fetch specific model by type and ID
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getVideoModelById,
  getImageModelById,
  getTtsModelById,
  getMusicModelById,
  getLlmModelById,
} from '@/lib/db/kie-models';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const { type } = await params;
    const searchParams = request.nextUrl.searchParams;
    const modelId = searchParams.get('modelId');

    if (!modelId) {
      return NextResponse.json(
        { error: 'modelId query parameter is required' },
        { status: 400 }
      );
    }

    let model;
    switch (type) {
      case 'video':
        model = await getVideoModelById(modelId);
        break;
      case 'image':
        model = await getImageModelById(modelId);
        break;
      case 'tts':
        model = await getTtsModelById(modelId);
        break;
      case 'music':
        model = await getMusicModelById(modelId);
        break;
      case 'llm':
        model = await getLlmModelById(modelId);
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid type. Use: video, image, tts, music, or llm' },
          { status: 400 }
        );
    }

    if (!model) {
      return NextResponse.json(
        { error: `Model not found: ${modelId}` },
        { status: 404 }
      );
    }

    return NextResponse.json({ model });
  } catch (error) {
    console.error('Error fetching KIE model:', error);
    return NextResponse.json(
      { error: 'Failed to fetch model' },
      { status: 500 }
    );
  }
}
