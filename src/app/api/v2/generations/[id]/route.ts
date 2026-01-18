// Dynamic route for specific generation operations
// GET /api/v2/generations/[id] - Get generation status
// DELETE /api/v2/generations/[id] - Cancel generation

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/middleware';
import type { UnifiedGenerationResponse } from '@/lib/providers';
import { activeGenerations } from '../generation-store';

// GET /api/v2/generations/[id] - Get generation status
export const GET = withAuth<{ id: string }>(async (
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
  { userId }
) => {
  try {
    const { id } = await context.params;

    const generation = activeGenerations.get(id);

    if (!generation) {
      return NextResponse.json(
        { error: 'Generation not found' },
        { status: 404 }
      );
    }

    const response: UnifiedGenerationResponse = {
      id,
      type: generation.type,
      provider: generation.provider,
      status: generation.status,
      createdAt: generation.createdAt.toISOString(),
      updatedAt: new Date().toISOString(),
      ...(generation.result && { result: generation.result }),
      ...(generation.error && { error: generation.error }),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching generation status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch generation status' },
      { status: 500 }
    );
  }
});

// DELETE /api/v2/generations/[id] - Cancel generation
export const DELETE = withAuth<{ id: string }>(async (
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
  { userId }
) => {
  try {
    const { id } = await context.params;

    const generation = activeGenerations.get(id);

    if (!generation) {
      return NextResponse.json(
        { error: 'Generation not found' },
        { status: 404 }
      );
    }

    if (generation.status === 'complete' || generation.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Cannot cancel completed or already cancelled generation' },
        { status: 400 }
      );
    }

    // Update status
    generation.status = 'cancelled';
    activeGenerations.set(id, generation);

    return NextResponse.json({
      id,
      status: 'cancelled',
      message: 'Generation cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling generation:', error);
    return NextResponse.json(
      { error: 'Failed to cancel generation' },
      { status: 500 }
    );
  }
});