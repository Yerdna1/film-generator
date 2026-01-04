import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyPermission } from '@/lib/permissions';
import { deleteFromS3 } from '@/lib/services/s3-upload';
import type { ActionContext } from '../lib';

/**
 * Handle final rejection of selected regeneration
 * Called when admin rejects the collaborator's selection
 */
export async function handleFinalReject(
  ctx: ActionContext,
  note?: string
): Promise<NextResponse> {
  const { session, projectId, requestId, regenerationRequest, scene } = ctx;

  // Only admin can final reject
  const permissionCheck = await verifyPermission(session.user.id, projectId, 'canApproveRequests');
  if (!permissionCheck.allowed) {
    return NextResponse.json(
      { error: permissionCheck.error },
      { status: permissionCheck.status }
    );
  }

  if (regenerationRequest.status !== 'awaiting_final') {
    return NextResponse.json(
      { error: `Cannot final reject in ${regenerationRequest.status} status` },
      { status: 400 }
    );
  }

  // Delete ALL generated images from S3
  const generatedUrls = (regenerationRequest.generatedUrls as string[]) || [];
  for (const url of generatedUrls) {
    try {
      await deleteFromS3(url);
    } catch (err) {
      console.error('Failed to delete image from S3:', err);
    }
  }

  // Update request as rejected
  await prisma.regenerationRequest.update({
    where: { id: requestId },
    data: {
      status: 'rejected',
      finalReviewBy: session.user.id,
      finalReviewAt: new Date(),
      finalReviewNote: note,
    },
  });

  // Notify requester
  await prisma.notification.create({
    data: {
      userId: regenerationRequest.requesterId,
      type: 'request_rejected',
      title: 'Regeneration Rejected',
      message: `Your regenerated ${regenerationRequest.targetType} for "${scene.title}" was rejected.${note ? ` Reason: ${note}` : ''}`,
      metadata: {
        projectId,
        projectName: regenerationRequest.project?.name,
        requestId,
        sceneId: scene.id,
        rejectionNote: note,
      },
      actionUrl: `/project/${projectId}`,
    },
  });

  return NextResponse.json({
    success: true,
    status: 'rejected',
  });
}
