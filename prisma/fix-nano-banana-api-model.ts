import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Fix nano-banana model apiModelId values
 *
 * KIE API expects model name "nano-banana-pro" with resolution as separate parameter.
 * This script updates the apiModelId for all 3 nano-banana models.
 */
async function fixNanoBananaApiModel() {
  console.log('Fixing nano-banana apiModelId values...\n');

  const models = [
    { modelId: 'nano-banana-pro-1k', apiModelId: 'nano-banana-pro', defaultResolution: '1k' },
    { modelId: 'nano-banana-pro-2k', apiModelId: 'nano-banana-pro', defaultResolution: '2k' },
    { modelId: 'nano-banana-pro-4k', apiModelId: 'nano-banana-pro', defaultResolution: '4k' },
  ];

  for (const model of models) {
    console.log(`Updating ${model.modelId}:`);
    console.log(`  apiModelId: ${model.apiModelId}`);
    console.log(`  defaultResolution: ${model.defaultResolution}`);

    const result = await prisma.kieImageModel.update({
      where: { modelId: model.modelId },
      data: {
        apiModelId: model.apiModelId,
        defaultResolution: model.defaultResolution,
      },
    });

    console.log(`  ✓ Updated: ${result.modelId} -> apiModelId=${result.apiModelId}, resolution=${result.defaultResolution}\n`);
  }

  // Verify the updates
  console.log('Verification:');
  const updatedModels = await prisma.kieImageModel.findMany({
    where: {
      modelId: { in: models.map(m => m.modelId) },
    },
    select: {
      modelId: true,
      apiModelId: true,
      defaultResolution: true,
    },
  });

  for (const model of updatedModels) {
    console.log(`  ${model.modelId}: apiModelId="${model.apiModelId}", defaultResolution="${model.defaultResolution}"`);
  }

  console.log('\n✓ All nano-banana models updated successfully!');
}

fixNanoBananaApiModel()
  .catch((e) => {
    console.error('Error updating models:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
