import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { ACTION_COSTS } from '@/lib/services/real-costs';

// Fix old transaction costs to use correct ACTION_COSTS values
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Define the correct costs based on type and provider
    const costMap: Record<string, Record<string, number>> = {
      image: {
        gemini: ACTION_COSTS.image.gemini,      // 0.04
        nanoBanana: ACTION_COSTS.image.nanoBanana, // 0.04
      },
      video: {
        grok: ACTION_COSTS.video.grok,          // 0.10
        kie: ACTION_COSTS.video.kie,            // 0.10
      },
      voiceover: {
        elevenlabs: ACTION_COSTS.voiceover.elevenlabs, // 0.03
        gemini: ACTION_COSTS.voiceover.geminiTts,      // 0.002
      },
      scene: {
        gemini: ACTION_COSTS.scene.gemini,      // 0.001
        claude: ACTION_COSTS.scene.claude,      // 0.005
        grok: ACTION_COSTS.scene.grok,          // 0.003
      },
      character: {
        gemini: ACTION_COSTS.character.gemini,  // 0.0005
        claude: ACTION_COSTS.character.claude,  // 0.002
      },
      prompt: {
        gemini: ACTION_COSTS.prompt.gemini,     // 0.001
        claude: ACTION_COSTS.prompt.claude,     // 0.005
      },
    };

    // Get all transactions
    const transactions = await prisma.creditTransaction.findMany({
      where: {
        amount: { lt: 0 }, // Only spending transactions
      },
    });

    let updated = 0;
    let skipped = 0;
    const updates: { id: string; oldCost: number; newCost: number; type: string; provider: string | null }[] = [];

    for (const tx of transactions) {
      const typeCosts = costMap[tx.type];
      if (!typeCosts) {
        skipped++;
        continue;
      }

      const provider = tx.provider || 'gemini'; // Default to gemini if no provider
      const correctCost = typeCosts[provider];

      if (correctCost === undefined) {
        skipped++;
        continue;
      }

      // Only update if the cost is different
      if (Math.abs(tx.realCost - correctCost) > 0.0001) {
        updates.push({
          id: tx.id,
          oldCost: tx.realCost,
          newCost: correctCost,
          type: tx.type,
          provider: tx.provider,
        });

        await prisma.creditTransaction.update({
          where: { id: tx.id },
          data: { realCost: correctCost },
        });

        updated++;
      } else {
        skipped++;
      }
    }

    // Update all users to have costMultiplier = 1.0
    const usersUpdated = await prisma.user.updateMany({
      where: {
        costMultiplier: { not: 1.0 }
      },
      data: {
        costMultiplier: 1.0
      }
    });

    // Also update the totalRealCost in Credits table
    const credits = await prisma.credits.findMany({
      include: {
        transactions: {
          where: { amount: { lt: 0 } },
        },
      },
    });

    for (const credit of credits) {
      const totalRealCost = credit.transactions.reduce((sum, tx) => {
        const typeCosts = costMap[tx.type];
        const provider = tx.provider || 'gemini';
        const correctCost = typeCosts?.[provider] || tx.realCost;
        return sum + correctCost;
      }, 0);

      await prisma.credits.update({
        where: { id: credit.id },
        data: { totalRealCost },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${updated} transactions, skipped ${skipped}. Updated ${usersUpdated.count} users to costMultiplier=1.0`,
      updates: updates.slice(0, 20), // Show first 20 updates
      usersUpdated: usersUpdated.count,
      costMap,
    });
  } catch (error) {
    console.error('Error fixing costs:', error);
    return NextResponse.json(
      { error: 'Failed to fix costs', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
