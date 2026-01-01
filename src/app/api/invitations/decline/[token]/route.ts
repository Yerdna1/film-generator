// Decline Invitation API
// POST - Decline an invitation using token

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Get the invitation
    const invitation = await prisma.projectInvitation.findUnique({
      where: { token },
    });

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    if (invitation.status !== 'pending') {
      return NextResponse.json(
        { error: `Invitation has already been ${invitation.status}` },
        { status: 400 }
      );
    }

    // Update invitation status (we don't have a "declined" status, so we'll revoke it)
    await prisma.projectInvitation.update({
      where: { id: invitation.id },
      data: { status: 'revoked' },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Decline invitation error:', error);
    return NextResponse.json(
      { error: 'Failed to decline invitation' },
      { status: 500 }
    );
  }
}
