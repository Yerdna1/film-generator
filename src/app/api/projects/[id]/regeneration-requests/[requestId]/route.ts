// Regeneration Request Actions API
// PUT - Approve or reject a regeneration request (admin)
// PATCH - Use attempt, select best, or final approve/reject
// DELETE - Cancel a pending request (requester only)

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import type { ActionContext, SceneData, RegenerationRequestWithProject } from './lib';
import { handlePut, handleDelete } from './handlers';
import {
  handleRegenerate,
  handleSelect,
  handleFinalApprove,
  handleFinalReject,
} from './actions';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; requestId: string }> }
) {
  const { id: projectId, requestId } = await params;
  return handlePut(request, projectId, requestId);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; requestId: string }> }
) {
  const { id: projectId, requestId } = await params;
  return handleDelete(projectId, requestId);
}

// PATCH - Use attempt, select best, or final approve/reject
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; requestId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId, requestId } = await params;
    const body = await request.json();
    const { action, selectedUrl, note } = body;

    // Get the request with project info and characters for reference images
    const regenerationRequest = await prisma.regenerationRequest.findUnique({
      where: { id: requestId },
      include: {
        requester: {
          select: { id: true, name: true, email: true },
        },
        project: {
          select: {
            name: true,
            settings: true,
            userId: true,
            characters: {
              select: {
                name: true,
                imageUrl: true,
              },
            },
          },
        },
      },
    }) as RegenerationRequestWithProject | null;

    if (!regenerationRequest) {
      return NextResponse.json({ error: 'Regeneration request not found' }, { status: 404 });
    }

    if (regenerationRequest.projectId !== projectId) {
      return NextResponse.json({ error: 'Request does not belong to this project' }, { status: 400 });
    }

    const scene = await prisma.scene.findUnique({
      where: { id: regenerationRequest.targetId },
      select: {
        id: true,
        title: true,
        number: true,
        textToImagePrompt: true,
        imageToVideoPrompt: true,
        imageUrl: true,
        dialogue: true,
      },
    });

    if (!scene) {
      return NextResponse.json({ error: 'Scene not found' }, { status: 404 });
    }

    // Build action context
    const baseUrl = new URL(request.url).origin;
    const cookieHeader = request.headers.get('cookie');

    const ctx: ActionContext = {
      session: { user: { id: session.user.id } },
      projectId,
      requestId,
      regenerationRequest,
      scene: scene as SceneData,
      cookieHeader,
      baseUrl,
    };

    // Handle different actions
    switch (action) {
      case 'regenerate':
        return handleRegenerate(ctx);

      case 'select':
        return handleSelect(ctx, selectedUrl);

      case 'final_approve':
        return handleFinalApprove(ctx, note);

      case 'final_reject':
        return handleFinalReject(ctx, note);

      default:
        return NextResponse.json({
          error: 'Invalid action. Use: regenerate, select, final_approve, or final_reject'
        }, { status: 400 });
    }
  } catch (error) {
    console.error('PATCH regeneration request error:', error);
    return NextResponse.json(
      { error: 'Failed to process regeneration request' },
      { status: 500 }
    );
  }
}
