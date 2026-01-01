/**
 * Script to fix real costs in existing database records
 *
 * This updates transactions that were recorded with realCost=0 for self-hosted providers
 * (modal, modal-edit, claude-sdk) to use the actual GPU costs.
 *
 * Run with: DATABASE_URL="..." node scripts/fix-real-costs.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Real costs per provider and action type
const REAL_COSTS = {
  // Image generation
  'image:modal': 0.09,
  'image:modal-edit': 0.09,

  // Video generation
  'video:modal': 0.15,

  // TTS/Voiceover
  'voiceover:modal': 0.01,

  // Music generation
  'music:modal': 0.03,

  // Scene generation
  'scene:modal': 0.002,
  'scene:claude-sdk': 0.01,

  // Character generation
  'character:claude-sdk': 0.008,

  // Prompt generation
  'prompt:claude-sdk': 0.012,
};

async function fixRealCosts() {
  console.log('Starting to fix real costs in database...\n');

  // Get all transactions with realCost = 0 for the affected providers
  const affectedProviders = ['modal', 'modal-edit', 'claude-sdk'];

  const transactions = await prisma.creditTransaction.findMany({
    where: {
      realCost: 0,
      provider: { in: affectedProviders },
    },
  });

  console.log(`Found ${transactions.length} transactions with realCost=0 for providers: ${affectedProviders.join(', ')}\n`);

  let updated = 0;
  let skipped = 0;
  const updates = {};

  for (const tx of transactions) {
    const key = `${tx.type}:${tx.provider}`;
    const realCost = REAL_COSTS[key];

    if (realCost !== undefined) {
      // Track updates by type
      if (!updates[key]) {
        updates[key] = { count: 0, totalCost: 0 };
      }
      updates[key].count++;
      updates[key].totalCost += realCost;

      await prisma.creditTransaction.update({
        where: { id: tx.id },
        data: { realCost },
      });
      updated++;
    } else {
      skipped++;
      console.log(`  Skipped: ${tx.type}:${tx.provider} - no cost defined`);
    }
  }

  console.log('\n--- Summary ---');
  console.log(`Updated: ${updated} transactions`);
  console.log(`Skipped: ${skipped} transactions`);
  console.log('\nBreakdown by type:provider:');

  for (const [key, data] of Object.entries(updates)) {
    console.log(`  ${key}: ${data.count} transactions, total cost: $${data.totalCost.toFixed(4)}`);
  }

  // Also update the totalRealCost in the Credits table
  console.log('\nUpdating user credits totals...');

  const creditsRecords = await prisma.credits.findMany({
    include: {
      transactions: true,
    },
  });

  for (const credits of creditsRecords) {
    const totalRealCost = credits.transactions
      .filter(tx => tx.amount < 0)
      .reduce((sum, tx) => sum + tx.realCost, 0);

    await prisma.credits.update({
      where: { id: credits.id },
      data: { totalRealCost },
    });

    console.log(`  User ${credits.userId}: totalRealCost = $${totalRealCost.toFixed(4)}`);
  }

  console.log('\nDone!');
}

fixRealCosts()
  .catch((error) => {
    console.error('Error fixing real costs:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
