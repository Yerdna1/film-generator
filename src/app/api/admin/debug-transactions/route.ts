import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAdmin } from '@/lib/admin';

export async function GET() {
  try {
    // SECURITY: Verify admin access before exposing sensitive data
    const adminCheck = await verifyAdmin();
    if (!adminCheck.isAdmin) {
      return NextResponse.json(
        { error: adminCheck.error || 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    const transactions = await prisma.creditTransaction.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        credits: {
          include: {
            user: {
              select: { email: true, name: true }
            }
          }
        }
      }
    });

    return NextResponse.json({
      count: transactions.length,
      transactions: transactions.map(tx => ({
        id: tx.id,
        userEmail: tx.credits.user?.email,
        amount: tx.amount,
        realCost: tx.realCost,
        type: tx.type,
        provider: tx.provider,
        description: tx.description,
        createdAt: tx.createdAt,
      }))
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
