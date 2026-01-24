import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { sendNotificationEmail } from '@/lib/services/email';
import crypto from 'crypto';

// POST - Request password reset
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Always return success to prevent email enumeration
    // But only send email if user exists
    if (user && user.email) {
      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour from now

      // Save token to database
      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetToken,
          resetTokenExpires,
        },
      });

      // Send reset email
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const resetUrl = `${appUrl}/auth/reset-password?token=${resetToken}`;

      await sendNotificationEmail({
        to: user.email,
        subject: 'Reset Your Password',
        title: 'Password Reset Request',
        message: `You requested to reset your password. Click the link below to create a new password:\n\n${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this, please ignore this email.`,
        actionUrl: resetUrl,
        actionText: 'Reset Password',
      });
    }

    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.',
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
