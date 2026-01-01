// Accept Invitation API
// POST - Accept an invitation using token

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { cache, cacheKeys } from '@/lib/cache';
import { getProjectAdmins } from '@/lib/permissions';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { token } = await params;

    // Get the invitation
    const invitation = await prisma.projectInvitation.findUnique({
      where: { token },
      include: {
        project: {
          select: { id: true, name: true, userId: true },
        },
        inviter: {
          select: { name: true },
        },
      },
    });

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    // Check status
    if (invitation.status !== 'pending') {
      return NextResponse.json(
        { error: `Invitation has already been ${invitation.status}` },
        { status: 400 }
      );
    }

    // Check expiry
    if (invitation.expiresAt < new Date()) {
      await prisma.projectInvitation.update({
        where: { id: invitation.id },
        data: { status: 'expired' },
      });
      return NextResponse.json({ error: 'Invitation has expired' }, { status: 400 });
    }

    // Get user email
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, name: true },
    });

    // Check if invitation is for this user's email
    if (user?.email?.toLowerCase() !== invitation.email.toLowerCase()) {
      return NextResponse.json(
        { error: 'This invitation was sent to a different email address' },
        { status: 403 }
      );
    }

    // Check if already a member
    const existingMember = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId: invitation.projectId,
          userId: session.user.id,
        },
      },
    });

    if (existingMember) {
      // Mark invitation as accepted anyway
      await prisma.projectInvitation.update({
        where: { id: invitation.id },
        data: { status: 'accepted', acceptedAt: new Date() },
      });
      return NextResponse.json({
        success: true,
        message: 'You are already a member of this project',
        projectId: invitation.projectId,
      });
    }

    // Create membership and update invitation in transaction
    await prisma.$transaction([
      prisma.projectMember.create({
        data: {
          projectId: invitation.projectId,
          userId: session.user.id,
          role: invitation.role,
          invitedBy: invitation.invitedBy,
        },
      }),
      prisma.projectInvitation.update({
        where: { id: invitation.id },
        data: { status: 'accepted', acceptedAt: new Date() },
      }),
    ]);

    // Invalidate cache for the user who accepted (so they see the new project)
    cache.invalidate(cacheKeys.userProjects(session.user.id));

    // Notify project admins
    const adminIds = await getProjectAdmins(invitation.projectId);
    for (const adminId of adminIds) {
      await prisma.notification.create({
        data: {
          userId: adminId,
          type: 'member_joined',
          title: 'New Team Member',
          message: `${user?.name || user?.email || 'A user'} joined "${invitation.project.name}" as ${invitation.role}`,
          metadata: {
            projectId: invitation.projectId,
            projectName: invitation.project.name,
            memberId: session.user.id,
            memberName: user?.name,
            role: invitation.role,
          },
          actionUrl: `/project/${invitation.projectId}`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      projectId: invitation.projectId,
      projectName: invitation.project.name,
      role: invitation.role,
    });
  } catch (error) {
    console.error('Accept invitation error:', error);
    return NextResponse.json(
      { error: 'Failed to accept invitation' },
      { status: 500 }
    );
  }
}

// GET - Get invitation details (for preview before accepting)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const invitation = await prisma.projectInvitation.findUnique({
      where: { token },
      include: {
        project: {
          select: { id: true, name: true },
        },
        inviter: {
          select: { name: true, email: true },
        },
      },
    });

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    // Check if expired
    const isExpired = invitation.expiresAt < new Date();
    const status = isExpired ? 'expired' : invitation.status;

    return NextResponse.json({
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        status,
        expiresAt: invitation.expiresAt,
        project: invitation.project,
        inviter: invitation.inviter,
      },
    });
  } catch (error) {
    console.error('Get invitation error:', error);
    return NextResponse.json(
      { error: 'Failed to get invitation' },
      { status: 500 }
    );
  }
}
