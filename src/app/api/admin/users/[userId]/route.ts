import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { sendNotificationEmail } from '@/lib/services/email';

const ADMIN_EMAIL = 'andrej.galad@gmail.com';

interface RouteParams {
  params: Promise<{ userId: string }>;
}

// GET - Get single user details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    const { userId } = await params;

    if (!session?.user?.email || session.user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isBlocked: true,
        costMultiplier: true,
        createdAt: true,
        credits: true,
        _count: {
          select: {
            projects: true,
            projectMemberships: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user: {
        ...user,
        credits: user.credits || { balance: 0, totalSpent: 0, totalEarned: 0, totalRealCost: 0 },
      },
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// PUT - Update user (block/unblock, adjust credits)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    const { userId } = await params;

    if (!session?.user?.email || session.user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
    }

    const body = await request.json();
    const { action, amount, reason, isBlocked, costMultiplier } = body;

    // Validate user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { credits: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Handle different actions
    if (action === 'add_credits' || action === 'deduct_credits') {
      if (typeof amount !== 'number' || amount <= 0) {
        return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 });
      }

      const isDeduction = action === 'deduct_credits';
      const creditChange = isDeduction ? -amount : amount;

      // Ensure credits record exists
      if (!user.credits) {
        await prisma.credits.create({
          data: {
            userId,
            balance: 0,
            totalSpent: 0,
            totalEarned: 0,
            totalRealCost: 0,
          },
        });
      }

      // Update credits
      const updatedCredits = await prisma.$transaction(async (tx) => {
        const credits = await tx.credits.update({
          where: { userId },
          data: {
            balance: { increment: creditChange },
            totalEarned: isDeduction ? undefined : { increment: amount },
            lastUpdated: new Date(),
          },
        });

        // Create transaction record
        await tx.creditTransaction.create({
          data: {
            creditsId: credits.id,
            amount: creditChange,
            type: isDeduction ? 'admin_deduction' : 'admin_bonus',
            description: reason || `Admin ${isDeduction ? 'deducted' : 'added'} ${amount} credits`,
          },
        });

        return credits;
      });

      return NextResponse.json({
        success: true,
        message: `${isDeduction ? 'Deducted' : 'Added'} ${amount} credits ${isDeduction ? 'from' : 'to'} ${user.name || user.email}`,
        newBalance: updatedCredits.balance,
      });
    }

    if (action === 'set_credits') {
      if (typeof amount !== 'number' || amount < 0) {
        return NextResponse.json({ error: 'Amount must be a non-negative number' }, { status: 400 });
      }

      // Ensure credits record exists
      if (!user.credits) {
        await prisma.credits.create({
          data: {
            userId,
            balance: amount,
            totalSpent: 0,
            totalEarned: amount,
            totalRealCost: 0,
          },
        });
      } else {
        const difference = amount - user.credits.balance;

        await prisma.$transaction(async (tx) => {
          await tx.credits.update({
            where: { userId },
            data: {
              balance: amount,
              totalEarned: difference > 0 ? { increment: difference } : undefined,
              lastUpdated: new Date(),
            },
          });

          await tx.creditTransaction.create({
            data: {
              creditsId: user.credits!.id,
              amount: difference,
              type: 'admin_set',
              description: reason || `Admin set credits to ${amount}`,
            },
          });
        });
      }

      return NextResponse.json({
        success: true,
        message: `Set ${user.name || user.email}'s credits to ${amount}`,
        newBalance: amount,
      });
    }

    if (action === 'toggle_block') {
      const newBlockedState = isBlocked !== undefined ? isBlocked : !user.isBlocked;

      await prisma.user.update({
        where: { id: userId },
        data: { isBlocked: newBlockedState },
      });

      return NextResponse.json({
        success: true,
        message: `User ${user.name || user.email} has been ${newBlockedState ? 'blocked' : 'unblocked'}`,
        isBlocked: newBlockedState,
      });
    }

    if (action === 'approve' || action === 'reject') {
      const isApproved = action === 'approve';

      await prisma.user.update({
        where: { id: userId },
        data: { isApproved },
      });

      // Send email to user about approval status
      if (user.email) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

        if (isApproved) {
          await sendNotificationEmail({
            to: user.email,
            subject: 'Your Account Has Been Approved!',
            title: 'Welcome to Film Generator!',
            message: 'Great news! Your account has been approved by the administrator. You can now start creating amazing AI-powered films.',
            actionUrl: appUrl,
            actionText: 'Start Creating',
          });
        } else {
          await sendNotificationEmail({
            to: user.email,
            subject: 'Account Registration Update',
            title: 'Account Not Approved',
            message: 'Unfortunately, your account registration was not approved at this time. If you believe this is a mistake, please contact the administrator.',
          });
        }
      }

      return NextResponse.json({
        success: true,
        message: `User ${user.name || user.email} has been ${isApproved ? 'approved' : 'rejected'}`,
        isApproved,
      });
    }

    if (action === 'update_multiplier') {
      if (typeof costMultiplier !== 'number' || costMultiplier < 0) {
        return NextResponse.json({ error: 'Cost multiplier must be a non-negative number' }, { status: 400 });
      }

      await prisma.user.update({
        where: { id: userId },
        data: { costMultiplier },
      });

      return NextResponse.json({
        success: true,
        message: `Updated cost multiplier for ${user.name || user.email} to ${costMultiplier}`,
        costMultiplier,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
