// Individual Invitation API
// DELETE - Revoke invitation

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { verifyPermission } from '@/lib/permissions';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; inviteId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId, inviteId } = await params;

    // Check manage members permission
    const permissionCheck = await verifyPermission(session.user.id, projectId, 'canManageMembers');
    if (!permissionCheck.allowed) {
      return NextResponse.json(
        { error: permissionCheck.error },
        { status: permissionCheck.status }
      );
    }

    // Get the invitation
    const invitation = await prisma.projectInvitation.findUnique({
      where: { id: inviteId },
    });

    if (!invitation || invitation.projectId !== projectId) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    if (invitation.status !== 'pending') {
      return NextResponse.json(
        { error: 'Invitation has already been processed' },
        { status: 400 }
      );
    }

    // Revoke the invitation
    await prisma.projectInvitation.update({
      where: { id: inviteId },
      data: { status: 'revoked' },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Revoke invitation error:', error);
    return NextResponse.json(
      { error: 'Failed to revoke invitation' },
      { status: 500 }
    );
  }
}
