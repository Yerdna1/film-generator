// Bulk Regeneration Request Actions API
// PUT - Approve or reject all requests in a batch

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { verifyPermission } from '@/lib/permissions';
import { checkBalance, getImageCreditCost, spendCredits, COSTS } from '@/lib/services/credits';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const { id: projectId } = await params;
    const { batchId, approved, note } = await request.json();

    if (!batchId) {
      return NextResponse.json(
        { error: 'batchId is required for bulk operations' },
        { status: 400 }
      );
    }

    // Check approve permission (admin only)
    const permissionCheck = await verifyPermission(session.user.id, projectId, 'canApproveRequests');
    if (!permissionCheck.allowed) {
      return NextResponse.json(
        { error: permissionCheck.error },
        { status: permissionCheck.status }
      );
    }

    // Get all pending requests with this batchId
    const requests = await prisma.regenerationRequest.findMany({
      where: {
        projectId,
        batchId,
        status: 'pending',
      },
      include: {
        requester: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (requests.length === 0) {
      return NextResponse.json(
        { error: 'No pending requests found for this batch' },
        { status: 404 }
      );
    }

    // Get project info for resolution
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { name: true, settings: true },
    });

    // Get scene info for all requests
    const sceneIds = requests.map(r => r.targetId);
    const scenes = await prisma.scene.findMany({
      where: { id: { in: sceneIds } },
      select: { id: true, title: true, number: true },
    });
    const sceneMap = new Map(scenes.map(s => [s.id, s]));

    // Get requester info (all requests in a batch should have the same requester)
    const requesterId = requests[0].requesterId;
    const requesterName = requests[0].requester?.name || requests[0].requester?.email || 'Unknown';

    if (approved) {
      // Calculate total cost for ALL requests (each with 3 attempts)
      const settings = project?.settings as { resolution?: string } | null;
      const resolution = settings?.resolution || '2k';
      const maxAttempts = 3;

      let totalCreditsNeeded = 0;
      const requestCosts: Map<string, { costPerAttempt: number; totalCost: number }> = new Map();

      for (const req of requests) {
        const costPerAttempt = req.targetType === 'image'
          ? getImageCreditCost(resolution as '1k' | '2k' | '4k')
          : COSTS.VIDEO_GENERATION;
        const requestTotalCost = costPerAttempt * maxAttempts;
        totalCreditsNeeded += requestTotalCost;
        requestCosts.set(req.id, { costPerAttempt, totalCost: requestTotalCost });
      }

      // Check if admin has enough credits for ALL requests
      const balanceCheck = await checkBalance(session.user.id, totalCreditsNeeded);
      if (!balanceCheck.hasEnough) {
        return NextResponse.json({
          error: `Insufficient credits. Need ${totalCreditsNeeded} credits for ${requests.length} requests (${maxAttempts} attempts each).`,
          required: totalCreditsNeeded,
          balance: balanceCheck.balance,
          requestCount: requests.length,
        }, { status: 402 });
      }

      // Build scene names for description
      const sceneNames = requests
        .slice(0, 3)
        .map(r => sceneMap.get(r.targetId)?.title || `Scene ${sceneMap.get(r.targetId)?.number}`)
        .join(', ');
      const moreScenes = requests.length > 3 ? ` +${requests.length - 3} more` : '';
      const targetType = requests[0].targetType;

      // Deduct credits upfront for all requests
      const creditType = targetType === 'image' ? 'image' : 'video';
      const spendResult = await spendCredits(
        session.user.id,
        totalCreditsNeeded,
        creditType,
        `Bulk approval: ${requests.length}x ${targetType} regeneration (${maxAttempts} attempts each) for: ${sceneNames}${moreScenes}`,
        projectId
      );

      if (!spendResult.success) {
        return NextResponse.json({
          error: spendResult.error || 'Failed to deduct credits',
        }, { status: 402 });
      }

      // Update all requests in a transaction
      await prisma.$transaction(
        requests.map(req => {
          const costs = requestCosts.get(req.id)!;
          return prisma.regenerationRequest.update({
            where: { id: req.id },
            data: {
              status: 'approved',
              maxAttempts,
              creditsPaid: costs.totalCost,
              reviewedBy: userId,
              reviewedAt: new Date(),
              reviewNote: note,
            },
          });
        })
      );

      // Send a single notification to the requester about all approved requests
      await prisma.notification.create({
        data: {
          userId: requesterId,
          type: 'request_approved',
          title: 'Batch Regeneration Approved',
          message: `Your batch request for ${requests.length} ${targetType}${requests.length > 1 ? 's' : ''} was approved! Scenes: ${sceneNames}${moreScenes}. You can now regenerate each up to ${maxAttempts} times.`,
          metadata: {
            projectId,
            projectName: project?.name,
            batchId,
            requestIds: requests.map(r => r.id),
            targetType,
            count: requests.length,
            totalCredits: totalCreditsNeeded,
            maxAttempts,
          },
          actionUrl: `/project/${projectId}`,
        },
      });

      return NextResponse.json({
        success: true,
        status: 'approved',
        count: requests.length,
        totalCreditsPaid: totalCreditsNeeded,
        creditsRemaining: spendResult.balance,
        maxAttempts,
      });
    } else {
      // Rejected - bulk reject all requests
      await prisma.$transaction(
        requests.map(req =>
          prisma.regenerationRequest.update({
            where: { id: req.id },
            data: {
              status: 'rejected',
              reviewedBy: userId,
              reviewedAt: new Date(),
              reviewNote: note,
            },
          })
        )
      );

      const targetType = requests[0].targetType;
      const sceneNames = requests
        .slice(0, 3)
        .map(r => sceneMap.get(r.targetId)?.title || `Scene ${sceneMap.get(r.targetId)?.number}`)
        .join(', ');
      const moreScenes = requests.length > 3 ? ` +${requests.length - 3} more` : '';

      // Send a single notification to the requester about all rejected requests
      await prisma.notification.create({
        data: {
          userId: requesterId,
          type: 'request_rejected',
          title: 'Batch Regeneration Rejected',
          message: `Your batch request for ${requests.length} ${targetType}${requests.length > 1 ? 's' : ''} was rejected. Scenes: ${sceneNames}${moreScenes}.${note ? ` Reason: ${note}` : ''}`,
          metadata: {
            projectId,
            projectName: project?.name,
            batchId,
            requestIds: requests.map(r => r.id),
            targetType,
            count: requests.length,
            rejectionNote: note,
          },
          actionUrl: `/project/${projectId}`,
        },
      });

      return NextResponse.json({
        success: true,
        status: 'rejected',
        count: requests.length,
      });
    }
  } catch (error) {
    console.error('Bulk regeneration request error:', error);
    return NextResponse.json(
      { error: 'Failed to process bulk regeneration request' },
      { status: 500 }
    );
  }
}

// GET - Get batch info (summary of requests in a batch)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId } = await params;
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');

    if (!batchId) {
      return NextResponse.json(
        { error: 'batchId query parameter is required' },
        { status: 400 }
      );
    }

    // Check view permission
    const permissionCheck = await verifyPermission(session.user.id, projectId, 'canView');
    if (!permissionCheck.allowed) {
      return NextResponse.json(
        { error: permissionCheck.error },
        { status: permissionCheck.status }
      );
    }

    // Get all requests in the batch
    const requests = await prisma.regenerationRequest.findMany({
      where: {
        projectId,
        batchId,
      },
      include: {
        requester: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (requests.length === 0) {
      return NextResponse.json(
        { error: 'No requests found for this batch' },
        { status: 404 }
      );
    }

    // Get scene info
    const sceneIds = requests.map(r => r.targetId);
    const scenes = await prisma.scene.findMany({
      where: { id: { in: sceneIds } },
      select: { id: true, title: true, number: true, imageUrl: true },
    });
    const sceneMap = new Map(scenes.map(s => [s.id, s]));

    // Calculate summary
    const summary = {
      batchId,
      count: requests.length,
      targetType: requests[0].targetType,
      status: requests[0].status, // All should have same status
      requester: requests[0].requester,
      reason: requests[0].reason,
      createdAt: requests[0].createdAt,
      scenes: requests.map(r => ({
        id: r.targetId,
        title: sceneMap.get(r.targetId)?.title || `Scene ${sceneMap.get(r.targetId)?.number}`,
        number: sceneMap.get(r.targetId)?.number,
        imageUrl: sceneMap.get(r.targetId)?.imageUrl,
      })),
      requests: requests.map(r => ({
        ...r,
        scene: sceneMap.get(r.targetId),
      })),
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error('Get batch info error:', error);
    return NextResponse.json(
      { error: 'Failed to get batch info' },
      { status: 500 }
    );
  }
}
