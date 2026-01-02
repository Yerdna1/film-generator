import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getStartingCredits } from '@/lib/services/app-config';
import { verifyAdmin } from '@/lib/admin';

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Only admins can create users directly
    const adminCheck = await verifyAdmin();
    if (!adminCheck.isAdmin) {
      return NextResponse.json(
        { error: adminCheck.error || 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    const { userId, email, name } = await request.json();

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (existingUser) {
      return NextResponse.json({
        success: true,
        message: 'User already exists',
        user: existingUser
      });
    }

    // Create the user
    const user = await prisma.user.create({
      data: {
        id: userId,
        email: email,
        name: name,
      }
    });

    // Get starting credits from admin config
    const startingCredits = await getStartingCredits();

    // Create credits for the user
    await prisma.credits.create({
      data: {
        userId: userId,
        balance: startingCredits,
        totalSpent: 0,
        totalEarned: startingCredits,
        totalRealCost: 0,
      }
    });

    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      user
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
