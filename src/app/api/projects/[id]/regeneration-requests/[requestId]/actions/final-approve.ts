import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyPermission } from '@/lib/permissions';
import { deleteFromS3 } from '@/lib/services/s3-upload';
import type { ActionContext } from '../lib';

/**
 * Handle final approval of selected regeneration
 * Called when admin approves the collaborator's selection
 */
export async function handleFinalApprove(
  ctx: ActionContext,
  note?: string
): Promise<NextResponse> {
  const { session, projectId, requestId, regenerationRequest, scene } = ctx;

  // Only admin can final approve
  const permissionCheck = await verifyPermission(session.user.id, projectId, 'canApproveRequests');
  if (!permissionCheck.allowed) {
    return NextResponse.json(
      { error: permissionCheck.error },
      { status: permissionCheck.status }
    );
  }

  if (regenerationRequest.status !== 'awaiting_final') {
    return NextResponse.json(
      { error: `Cannot final approve in ${regenerationRequest.status} status` },
      { status: 400 }
    );
  }

  if (!regenerationRequest.selectedUrl) {
    return NextResponse.json(
      { error: 'No selection has been made' },
      { status: 400 }
    );
  }

  // Update the scene with the selected image/video
  const updateData = regenerationRequest.targetType === 'image'
    ? { imageUrl: regenerationRequest.selectedUrl }
    : { videoUrl: regenerationRequest.selectedUrl };

  await prisma.scene.update({
    where: { id: scene.id },
    data: updateData,
  });

  // Delete unused images from S3
  const generatedUrls = (regenerationRequest.generatedUrls as string[]) || [];
  const urlsToDelete = generatedUrls.filter(url => url !== regenerationRequest.selectedUrl);

  for (const url of urlsToDelete) {
    try {
      await deleteFromS3(url);
    } catch (err) {
      console.error('Failed to delete unused image from S3:', err);
    }
  }

  // Update request as completed
  await prisma.regenerationRequest.update({
    where: { id: requestId },
    data: {
      status: 'completed',
      finalReviewBy: session.user.id,
      finalReviewAt: new Date(),
      finalReviewNote: note,
      completedAt: new Date(),
    },
  });

  // Notify requester
  await prisma.notification.create({
    data: {
      userId: regenerationRequest.requesterId,
      type: 'request_approved',
      title: 'Regeneration Approved',
      message: `Your selected ${regenerationRequest.targetType} for "${scene.title}" has been approved and applied!`,
      metadata: {
        projectId,
        projectName: regenerationRequest.project?.name,
        requestId,
        sceneId: scene.id,
      },
      actionUrl: `/project/${projectId}`,
    },
  });

  return NextResponse.json({
    success: true,
    status: 'completed',
    appliedUrl: regenerationRequest.selectedUrl,
  });
}
