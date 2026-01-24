import { prisma } from '../src/lib/db/prisma';

async function main() {
  console.log('Updating Grok Video Models...\n');

  // First, let's see what we're working with
  const grokModels = await prisma.kieVideoModel.findMany({
    where: {
      apiModelId: {
        startsWith: 'grok-imagine/',
      },
    },
    orderBy: { modelId: 'asc' },
  });

  console.log('Current Grok models in database:');
  grokModels.forEach((model) => {
    console.log(`  ID: ${model.modelId}, API: ${model.apiModelId}, Active: ${model.isActive}`);
  });

  console.log('\n--- Performing updates ---\n');

  // Step 1: Set isActive to false for text-to-video model (keep in DB but inactive)
  const textToVideo = await prisma.kieVideoModel.findFirst({
    where: { apiModelId: 'grok-imagine/text-to-video' },
  });

  if (textToVideo) {
    await prisma.kieVideoModel.update({
      where: { modelId: textToVideo.modelId },
      data: { isActive: false },
    });
    console.log(`✓ Set isActive to FALSE for: ${textToVideo.apiModelId} (ID: ${textToVideo.modelId})`);
  }

  // Step 2: Set isActive to false for upscale model (keep in DB but inactive)
  const upscale = await prisma.kieVideoModel.findFirst({
    where: { apiModelId: 'grok-imagine/upscale' },
  });

  if (upscale) {
    await prisma.kieVideoModel.update({
      where: { modelId: upscale.modelId },
      data: { isActive: false },
    });
    console.log(`✓ Set isActive to FALSE for: ${upscale.apiModelId} (ID: ${upscale.modelId})`);
  }

  // Step 3: Delete duplicate models
  const toDelete = [
    'grok-imagine/image-to-video-6s',
    'grok-imagine/text-to-video-6s',
    'grok-imagine/upscale-360p-to-720p',
  ];

  for (const apiModelId of toDelete) {
    const model = await prisma.kieVideoModel.findFirst({
      where: { apiModelId },
    });

    if (model) {
      await prisma.kieVideoModel.delete({
        where: { modelId: model.modelId },
      });
      console.log(`✓ Deleted: ${model.apiModelId} (ID: ${model.modelId})`);
    }
  }

  // Verify final state
  const finalGrokModels = await prisma.kieVideoModel.findMany({
    where: {
      apiModelId: {
        startsWith: 'grok-imagine/',
      },
    },
    orderBy: { modelId: 'asc' },
  });

  const activeCount = finalGrokModels.filter(m => m.isActive).length;

  console.log('\n--- Final State ---\n');
  console.log('Grok models remaining in database:');
  finalGrokModels.forEach((model) => {
    const status = model.isActive ? 'ACTIVE' : 'inactive';
    console.log(`  [${status}] ${model.apiModelId} (ID: ${model.modelId})`);
  });

  console.log(`\nTotal: ${finalGrokModels.length} models, ${activeCount} active`);
  console.log('\n✓ Update complete! Only image-to-video model is now active.');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
