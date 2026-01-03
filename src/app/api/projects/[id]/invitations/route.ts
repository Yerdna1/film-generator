// Project Invitations API
// GET - List pending invitations
// POST - Create and send invitation

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { verifyPermission } from '@/lib/permissions';
import { sendInvitationEmail, isEmailConfigured } from '@/lib/services/email';
import type { ProjectRole } from '@/types/collaboration';

// Invitation expires in 30 days
const INVITATION_EXPIRY_DAYS = 30;

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

    // Check manage members permission
    const permissionCheck = await verifyPermission(session.user.id, projectId, 'canManageMembers');
    if (!permissionCheck.allowed) {
      return NextResponse.json(
        { error: permissionCheck.error },
        { status: permissionCheck.status }
      );
    }

    // Get pending invitations
    const invitations = await prisma.projectInvitation.findMany({
      where: {
        projectId,
        status: 'pending',
        expiresAt: { gt: new Date() },
      },
      include: {
        inviter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Add cache headers for SWR deduplication (private, short cache, stale-while-revalidate)
    return NextResponse.json(
      { invitations },
      {
        headers: {
          'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
        },
      }
    );
  } catch (error) {
    console.error('Get invitations error:', error);
    return NextResponse.json(
      { error: 'Failed to get invitations' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId } = await params;
    const { email, role, message } = await request.json();

    // Validate input
    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email address is required' },
        { status: 400 }
      );
    }

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

    // Get project
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { name: true, userId: true },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Check if user is already a member
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true },
    });

    if (existingUser) {
      // Check if already a member
      const existingMember = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId,
            userId: existingUser.id,
          },
        },
      });

      if (existingMember) {
        return NextResponse.json(
          { error: 'User is already a member of this project' },
          { status: 400 }
        );
      }

      // Check if owner
      if (existingUser.id === project.userId) {
        return NextResponse.json(
          { error: 'Cannot invite the project owner' },
          { status: 400 }
        );
      }
    }

    // Check for existing pending invitation
    const existingInvite = await prisma.projectInvitation.findFirst({
      where: {
        projectId,
        email: email.toLowerCase(),
        status: 'pending',
        expiresAt: { gt: new Date() },
      },
    });

    if (existingInvite) {
      return NextResponse.json(
        { error: 'An invitation has already been sent to this email' },
        { status: 400 }
      );
    }

    // Get inviter info
    const inviter = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true },
    });

    // Create invitation
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS);

    const invitation = await prisma.projectInvitation.create({
      data: {
        projectId,
        email: email.toLowerCase(),
        role,
        invitedBy: session.user.id,
        expiresAt,
      },
      include: {
        inviter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Send email if configured
    let emailSent = false;
    if (isEmailConfigured()) {
      const result = await sendInvitationEmail({
        to: email,
        inviterName: inviter?.name || 'A team member',
        inviterEmail: inviter?.email || '',
        projectName: project.name,
        role,
        inviteToken: invitation.token,
        expiresAt,
        personalMessage: message,
      });
      emailSent = result.success;
    }

    return NextResponse.json({
      invitation,
      emailSent,
      inviteLink: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${invitation.token}`,
    });
  } catch (error) {
    console.error('Create invitation error:', error);
    return NextResponse.json(
      { error: 'Failed to create invitation' },
      { status: 500 }
    );
  }
}
