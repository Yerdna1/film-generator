import { prisma } from '../src/lib/db/prisma';

/**
 * Migration script to fix malformed KIE model names in the api_keys table.
 *
 * This script fixes known malformed model patterns:
 * - seedream-4.5/4k → seedream/4-5-text-to-image
 * - seedream-4.5 → seedream/4-5-text-to-image
 */

// Mapping of malformed model names to correct ones
const MODEL_FIXES: Record<string, string> = {
  'seedream-4.5/4k': 'seedream/4-5-text-to-image',
  'seedream-4.5': 'seedream/4-5-text-to-image',
};

async function fixMalformedKieModels() {
  console.log('Starting migration: Fix malformed KIE model names...');
  console.log('Model fixes:', MODEL_FIXES);

  let fixedCount = 0;
  let notFoundCount = 0;

  // Find all records with malformed model names
  const malformedApiKeys = await prisma.apiKeys.findMany({
    where: {
      kieImageModel: {
        in: Object.keys(MODEL_FIXES),
      },
    },
    select: {
      userId: true,
      kieImageModel: true,
    },
  });

  console.log(`Found ${malformedApiKeys.length} records with malformed models`);

  // Fix each malformed record
  for (const apiKey of malformedApiKeys) {
    const malformedModel = apiKey.kieImageModel;
    if (!malformedModel) continue;

    const correctModel = MODEL_FIXES[malformedModel];

    if (correctModel) {
      await prisma.apiKeys.update({
        where: { userId: apiKey.userId },
        data: { kieImageModel: correctModel },
      });
      console.log(`✓ Fixed user ${apiKey.userId}: "${malformedModel}" → "${correctModel}"`);
      fixedCount++;
    } else {
      console.log(`? No fix available for user ${apiKey.userId}: "${malformedModel}"`);
      notFoundCount++;
    }
  }

  console.log('\nMigration complete!');
  console.log(`Fixed: ${fixedCount} records`);
  console.log(`No fix available: ${notFoundCount} records`);
}

fixMalformedKieModels()
  .then(() => {
    console.log('Script finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
