import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getProjectAdmins } from '@/lib/permissions';
import type { ActionContext } from '../lib';

/**
 * Handle selection of best regenerated option
 * Called when collaborator picks their preferred result
 */
export async function handleSelect(ctx: ActionContext, selectedUrl: string): Promise<NextResponse> {
  const { session, projectId, requestId, regenerationRequest, scene } = ctx;

  // Only requester can select
  if (regenerationRequest.requesterId !== session.user.id) {
    return NextResponse.json(
      { error: 'Only the requester can select the best option' },
      { status: 403 }
    );
  }

  // Must be in selecting status (or approved if they want to pick early)
  if (!['selecting', 'approved', 'generating'].includes(regenerationRequest.status)) {
    return NextResponse.json(
      { error: `Cannot select in ${regenerationRequest.status} status` },
      { status: 400 }
    );
  }

  // Validate selected URL is one of the generated ones
  const generatedUrls = (regenerationRequest.generatedUrls as string[]) || [];
  if (!selectedUrl || !generatedUrls.includes(selectedUrl)) {
    return NextResponse.json(
      { error: 'Invalid selection. Please select one of the generated options.' },
      { status: 400 }
    );
  }

  // Update request with selection and set to awaiting final approval
  await prisma.regenerationRequest.update({
    where: { id: requestId },
    data: {
      selectedUrl,
      status: 'awaiting_final',
    },
  });

  // Notify admins for final approval
  const adminIds = await getProjectAdmins(projectId);
  const requesterName = regenerationRequest.requester?.name ||
    regenerationRequest.requester?.email ||
    'A collaborator';

  for (const adminId of adminIds) {
    await prisma.notification.create({
      data: {
        userId: adminId,
        type: 'regeneration_request',
        title: 'Final Approval Required',
        message: `${requesterName} selected a regenerated ${regenerationRequest.targetType} for "${scene.title}". Please review and approve.`,
        metadata: {
          projectId,
          projectName: regenerationRequest.project?.name,
          requestId,
          sceneId: scene.id,
          selectedUrl,
          generatedUrls,
        },
        actionUrl: `/approvals`,
      },
    });
  }

  return NextResponse.json({
    success: true,
    status: 'awaiting_final',
    selectedUrl,
  });
}
