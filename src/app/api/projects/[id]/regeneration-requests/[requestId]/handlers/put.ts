import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { verifyPermission } from '@/lib/permissions';
import { checkBalance, getImageCreditCost, spendCredits, COSTS } from '@/lib/services/credits';

/**
 * PUT handler - Approve or reject a regeneration request
 * Only admins can approve/reject requests
 */
export async function handlePut(
  request: NextRequest,
  projectId: string,
  requestId: string
): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { approved, note } = await request.json();

    // Check approve permission (admin only)
    const permissionCheck = await verifyPermission(session.user.id, projectId, 'canApproveRequests');
    if (!permissionCheck.allowed) {
      return NextResponse.json(
        { error: permissionCheck.error },
        { status: permissionCheck.status }
      );
    }

    // Get the request
    const regenerationRequest = await prisma.regenerationRequest.findUnique({
      where: { id: requestId },
      include: {
        requester: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!regenerationRequest) {
      return NextResponse.json(
        { error: 'Regeneration request not found' },
        { status: 404 }
      );
    }

    if (regenerationRequest.projectId !== projectId) {
      return NextResponse.json(
        { error: 'Request does not belong to this project' },
        { status: 400 }
      );
    }

    if (regenerationRequest.status !== 'pending') {
      return NextResponse.json(
        { error: `Request is already ${regenerationRequest.status}` },
        { status: 400 }
      );
    }

    // Get project and scene info
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { name: true, settings: true },
    });

    const scene = await prisma.scene.findUnique({
      where: { id: regenerationRequest.targetId },
      select: {
        id: true,
        title: true,
        number: true,
        textToImagePrompt: true,
        imageToVideoPrompt: true,
        imageUrl: true,
      },
    });

    if (!scene) {
      return NextResponse.json(
        { error: 'Scene not found' },
        { status: 404 }
      );
    }

    if (approved) {
      return handleApproval({
        sessionUserId: session.user.id,
        projectId,
        requestId,
        regenerationRequest,
        project,
        scene,
        note,
      });
    } else {
      return handleRejection({
        requestId,
        regenerationRequest,
        project,
        scene,
        projectId,
        sessionUserId: session.user.id,
        note,
      });
    }
  } catch (error) {
    console.error('Process regeneration request error:', error);
    return NextResponse.json(
      { error: 'Failed to process regeneration request' },
      { status: 500 }
    );
  }
}

async function handleApproval(params: {
  sessionUserId: string;
  projectId: string;
  requestId: string;
  regenerationRequest: {
    id: string;
    requesterId: string;
    targetType: string;
    requester: { id: string; name: string | null; email: string | null } | null;
  };
  project: { name: string; settings: unknown } | null;
  scene: { id: string; title: string };
  note?: string;
}): Promise<NextResponse> {
  const { sessionUserId, projectId, requestId, regenerationRequest, project, scene, note } = params;

  // Calculate total cost for all attempts (3x)
  const settings = project?.settings as { resolution?: string } | null;
  const resolution = settings?.resolution || '2k';
  const costPerAttempt = regenerationRequest.targetType === 'image'
    ? getImageCreditCost(resolution as '1k' | '2k' | '4k')
    : COSTS.VIDEO_GENERATION;

  const maxAttempts = 3;
  const totalCost = costPerAttempt * maxAttempts;

  // Check if admin has enough credits for all 3 attempts
  const balanceCheck = await checkBalance(sessionUserId, totalCost);
  if (!balanceCheck.hasEnough) {
    return NextResponse.json({
      error: `Insufficient credits. Need ${totalCost} credits for ${maxAttempts} regeneration attempts (${costPerAttempt} each).`,
      required: totalCost,
      balance: balanceCheck.balance,
    }, { status: 402 });
  }

  // Deduct credits upfront for all 3 attempts
  const creditType = regenerationRequest.targetType === 'image' ? 'image' : 'video';
  const spendResult = await spendCredits(
    sessionUserId,
    totalCost,
    creditType,
    `Regeneration approval: ${maxAttempts}x ${regenerationRequest.targetType} for "${scene.title}"`,
    projectId
  );

  if (!spendResult.success) {
    return NextResponse.json({
      error: spendResult.error || 'Failed to deduct credits',
    }, { status: 402 });
  }

  // Update request status to approved with prepaid credits
  await prisma.regenerationRequest.update({
    where: { id: requestId },
    data: {
      status: 'approved',
      maxAttempts,
      creditsPaid: totalCost,
      reviewedBy: sessionUserId,
      reviewedAt: new Date(),
      reviewNote: note,
    },
  });

  // Notify requester that their request was approved
  await prisma.notification.create({
    data: {
      userId: regenerationRequest.requesterId,
      type: 'request_approved',
      title: 'Regeneration Request Approved',
      message: `Your ${regenerationRequest.targetType} regeneration request for "${scene.title}" was approved! You can now regenerate it up to ${maxAttempts} times.`,
      metadata: {
        projectId,
        projectName: project?.name,
        requestId,
        targetType: regenerationRequest.targetType,
        sceneId: scene.id,
        sceneName: scene.title,
        maxAttempts,
        creditsPaid: totalCost,
      },
      actionUrl: `/project/${projectId}`,
    },
  });

  return NextResponse.json({
    success: true,
    status: 'approved',
    maxAttempts,
    creditsPaid: totalCost,
    creditsRemaining: spendResult.balance,
  });
}

async function handleRejection(params: {
  requestId: string;
  regenerationRequest: {
    requesterId: string;
    targetType: string;
  };
  project: { name: string } | null;
  scene: { id: string; title: string };
  projectId: string;
  sessionUserId: string;
  note?: string;
}): Promise<NextResponse> {
  const { requestId, regenerationRequest, project, scene, projectId, sessionUserId, note } = params;

  await prisma.regenerationRequest.update({
    where: { id: requestId },
    data: {
      status: 'rejected',
      reviewedBy: sessionUserId,
      reviewedAt: new Date(),
      reviewNote: note,
    },
  });

  // Notify requester
  await prisma.notification.create({
    data: {
      userId: regenerationRequest.requesterId,
      type: 'request_rejected',
      title: 'Regeneration Request Rejected',
      message: `Your ${regenerationRequest.targetType} regeneration request for "${scene.title}" was rejected.${note ? ` Reason: ${note}` : ''}`,
      metadata: {
        projectId,
        projectName: project?.name,
        requestId,
        targetType: regenerationRequest.targetType,
        sceneId: scene.id,
        rejectionNote: note,
      },
      actionUrl: `/project/${projectId}`,
    },
  });

  return NextResponse.json({ success: true, status: 'rejected' });
}
