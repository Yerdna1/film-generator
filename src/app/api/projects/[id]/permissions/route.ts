// Permissions API - Get user's permissions for a project
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserProjectRole, ROLE_PERMISSIONS } from '@/lib/permissions';

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

    // Get user's role and permissions for this project
    const role = await getUserProjectRole(session.user.id, projectId);

    if (!role) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      );
    }

    const permissions = ROLE_PERMISSIONS[role];

    return NextResponse.json({
      role,
      permissions,
    });
  } catch (error) {
    console.error('Get permissions error:', error);
    return NextResponse.json(
      { error: 'Failed to get permissions' },
      { status: 500 }
    );
  }
}
