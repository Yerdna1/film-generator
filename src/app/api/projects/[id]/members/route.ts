// Project Members API
// GET - List project members
// POST - Add member (from accepted invitation)

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { verifyPermission } from '@/lib/permissions';

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

    // Check view permission
    const permissionCheck = await verifyPermission(session.user.id, projectId, 'canView');
    if (!permissionCheck.allowed) {
      return NextResponse.json(
        { error: permissionCheck.error },
        { status: permissionCheck.status }
      );
    }

    // Get project owner
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        userId: true,
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

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get all members
    const members = await prisma.projectMember.findMany({
      where: { projectId },
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
      orderBy: { joinedAt: 'asc' },
    });

    // Add owner as first member if not already in list
    const ownerInMembers = members.some((m) => m.userId === project.userId);
    const allMembers = ownerInMembers
      ? members
      : [
          {
            id: 'owner',
            projectId,
            userId: project.userId,
            role: 'admin',
            joinedAt: new Date(),
            invitedBy: null,
            user: project.user,
            isOwner: true,
          },
          ...members,
        ];

    // Add cache headers for SWR deduplication (private, short cache, stale-while-revalidate)
    return NextResponse.json(
      {
        members: allMembers.map((m) => ({
          id: m.id,
          projectId: m.projectId,
          userId: m.userId,
          role: m.role,
          joinedAt: m.joinedAt,
          invitedBy: m.invitedBy,
          isOwner: 'isOwner' in m ? m.isOwner : m.userId === project.userId,
          user: m.user,
        })),
      },
      {
        headers: {
          'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
        },
      }
    );
  } catch (error) {
    console.error('Get members error:', error);
    return NextResponse.json(
      { error: 'Failed to get members' },
      { status: 500 }
    );
  }
}
