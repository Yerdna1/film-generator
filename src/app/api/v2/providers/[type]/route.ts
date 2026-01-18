// Provider Listing Endpoint
// GET /api/v2/providers/:type - List available providers for a generation type

import { NextRequest, NextResponse } from 'next/server';
import { listProviders, type GenerationType } from '@/lib/providers';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ type: string }> }
) {
  const { type: typeStr } = await context.params;
  const type = typeStr as GenerationType;

  // Validate type
  const validTypes: GenerationType[] = ['image', 'video', 'tts', 'music'];
  if (!validTypes.includes(type)) {
    return NextResponse.json(
      { error: `Invalid generation type. Must be one of: ${validTypes.join(', ')}` },
      { status: 400 }
    );
  }

  try {
    // Get providers for this type
    const providers = listProviders(type);

    // Sort by cost (cheapest first)
    const sorted = providers.sort((a, b) => {
      const costA = a.costPerUnit || Infinity;
      const costB = b.costPerUnit || Infinity;
      return costA - costB;
    });

    return NextResponse.json({
      type,
      providers: sorted,
      count: sorted.length,
    });
  } catch (error) {
    console.error('Provider listing error:', error);
    return NextResponse.json(
      { error: 'Failed to list providers' },
      { status: 500 }
    );
  }
}

// POST /api/v2/providers/:type/estimate - Estimate cost before generation
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ type: string }> }
) {
  const { type: typeStr } = await context.params;
  const type = typeStr as GenerationType;
  const body = await request.json();

  // Validate type
  const validTypes: GenerationType[] = ['image', 'video', 'tts', 'music'];
  if (!validTypes.includes(type)) {
    return NextResponse.json(
      { error: `Invalid generation type. Must be one of: ${validTypes.join(', ')}` },
      { status: 400 }
    );
  }

  try {
    const providers = listProviders(type);

    // Calculate costs for each provider
    const estimates = providers.map(metadata => {
      const baseCost = metadata.costPerUnit || 0;

      // Apply modifiers based on request parameters
      let multiplier = 1;

      // Image resolution multiplier
      if (type === 'image' && body.resolution) {
        if (body.resolution === '4k') multiplier = 2;
        else if (body.resolution === 'hd') multiplier = 0.5;
      }

      // TTS length multiplier
      if (type === 'tts' && body.text) {
        const charCount = body.text.length;
        multiplier = Math.ceil(charCount / 1000); // Per 1000 chars
      }

      // Video duration (fixed for now)
      if (type === 'video') {
        multiplier = 1; // Could be based on duration in future
      }

      // Music duration
      if (type === 'music' && body.duration) {
        multiplier = Math.ceil(body.duration / 30); // Per 30 seconds
      }

      return {
        provider: metadata.provider,
        name: metadata.name,
        estimatedCost: baseCost * multiplier,
        baseCost,
        multiplier,
        features: metadata.features,
        limitations: metadata.limitations,
      };
    });

    // Sort by cost
    estimates.sort((a, b) => a.estimatedCost - b.estimatedCost);

    return NextResponse.json({
      type,
      request: body,
      estimates,
      cheapest: estimates[0],
      recommended: estimates.find(e => e.features?.includes('High-quality')) || estimates[0],
    });
  } catch (error) {
    console.error('Cost estimation error:', error);
    return NextResponse.json(
      { error: 'Failed to estimate costs' },
      { status: 500 }
    );
  }
}