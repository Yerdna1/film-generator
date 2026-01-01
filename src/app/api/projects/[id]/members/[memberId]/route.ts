// Individual Member API
// PUT - Update member role
// DELETE - Remove member

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { verifyPermission } from '@/lib/permissions';
import type { ProjectRole } from '@/types/collaboration';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId, memberId } = await params;
    const { role } = await request.json();

    // Validate role
    const validRoles: ProjectRole[] = ['admin', 'collaborator', 'reader'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be admin, collaborator, or reader' },
        { status: 400 }
      );
    }

    // Check manage members permission
    const permissionCheck = await verifyPermission(session.user.id, projectId, 'canManageMembers');
    if (!permissionCheck.allowed) {
      return NextResponse.json(
        { error: permissionCheck.error },
        { status: permissionCheck.status }
      );
    }

    // Get the member
    const member = await prisma.projectMember.findUnique({
      where: { id: memberId },
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
    });

    if (!member || member.projectId !== projectId) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Check if trying to change owner's role
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { userId: true },
    });

    if (member.userId === project?.userId) {
      return NextResponse.json(
        { error: 'Cannot change the project owner\'s role' },
        { status: 400 }
      );
    }

    // Update role
    const updatedMember = await prisma.projectMember.update({
      where: { id: memberId },
      data: { role },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    // Create notification for the member
    await prisma.notification.create({
      data: {
        userId: member.userId,
        type: 'role_change',
        title: 'Role Updated',
        message: `Your role has been changed to ${role} on project "${project?.userId}"`,
        metadata: {
          projectId,
          newRole: role,
          oldRole: member.role,
        },
        actionUrl: `/project/${projectId}`,
      },
    });

    return NextResponse.json({ member: updatedMember });
  } catch (error) {
    console.error('Update member error:', error);
    return NextResponse.json(
      { error: 'Failed to update member' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId, memberId } = await params;

    // Get the member first
    const member = await prisma.projectMember.findUnique({
      where: { id: memberId },
    });

    if (!member || member.projectId !== projectId) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Allow users to remove themselves OR admins can remove anyone
    const isSelfRemoval = member.userId === session.user.id;

    if (!isSelfRemoval) {
      const permissionCheck = await verifyPermission(session.user.id, projectId, 'canManageMembers');
      if (!permissionCheck.allowed) {
        return NextResponse.json(
          { error: permissionCheck.error },
          { status: permissionCheck.status }
        );
      }
    }

    // Check if trying to remove owner
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { userId: true, name: true },
    });

    if (member.userId === project?.userId) {
      return NextResponse.json(
        { error: 'Cannot remove the project owner' },
        { status: 400 }
      );
    }

    // Delete the member
    await prisma.projectMember.delete({
      where: { id: memberId },
    });

    // Create notification for removed member (if not self-removal)
    if (!isSelfRemoval) {
      await prisma.notification.create({
        data: {
          userId: member.userId,
          type: 'member_removed',
          title: 'Removed from Project',
          message: `You have been removed from project "${project?.name}"`,
          metadata: {
            projectId,
            projectName: project?.name,
          },
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Remove member error:', error);
    return NextResponse.json(
      { error: 'Failed to remove member' },
      { status: 500 }
    );
  }
}
