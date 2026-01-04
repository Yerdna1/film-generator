import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { getUserProjectRole } from '@/lib/permissions';

/**
 * DELETE handler - Cancel a pending regeneration request
 * Only requester or admin can cancel
 */
export async function handleDelete(
  projectId: string,
  requestId: string
): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the request
    const regenerationRequest = await prisma.regenerationRequest.findUnique({
      where: { id: requestId },
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

    // Only requester can cancel their own request, or admin can cancel any
    const isRequester = regenerationRequest.requesterId === session.user.id;
    const role = await getUserProjectRole(session.user.id, projectId);
    const isAdmin = role === 'admin';

    if (!isRequester && !isAdmin) {
      return NextResponse.json(
        { error: 'You can only cancel your own requests' },
        { status: 403 }
      );
    }

    if (regenerationRequest.status !== 'pending') {
      return NextResponse.json(
        { error: `Cannot cancel a ${regenerationRequest.status} request` },
        { status: 400 }
      );
    }

    // Delete the request
    await prisma.regenerationRequest.delete({
      where: { id: requestId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Cancel regeneration request error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel regeneration request' },
      { status: 500 }
    );
  }
}
