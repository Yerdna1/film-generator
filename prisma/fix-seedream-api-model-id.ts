import { prisma } from '../src/lib/db/prisma';

/**
 * Migration script to fix the apiModelId for seedream model.
 *
 * The seedream/4-5-text-to-image model has apiModelId set to the same value,
 * but KIE API expects the format 'seedream-4.5/2k' (with dot and resolution suffix).
 */

async function fixSeedreamApiModelId() {
  console.log('Starting migration: Fix seedream apiModelId...');

  const model = await prisma.kieImageModel.findUnique({
    where: { modelId: 'seedream/4-5-text-to-image' },
    select: { modelId: true, apiModelId: true, name: true }
  });

  if (!model) {
    console.error('Model seedream/4-5-text-to-image not found!');
    return;
  }

  console.log('Current state:', model);
  console.log(`Current apiModelId: "${model.apiModelId}"`);

  if (model.apiModelId === 'seedream/4-5-text-to-image') {
    console.log('apiModelId needs to be fixed...');

    const updated = await prisma.kieImageModel.update({
      where: { modelId: 'seedream/4-5-text-to-image' },
      data: { apiModelId: 'seedream-4.5/2k' }
    });

    console.log('✓ Fixed! New apiModelId:', updated.apiModelId);
  } else if (model.apiModelId === 'seedream-4.5/2k') {
    console.log('✓ apiModelId is already correct!');
  } else {
    console.log(`? apiModelId is "${model.apiModelId}" - not the expected value`);
  }
}

fixSeedreamApiModelId()
  .then(() => {
    console.log('Script finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
