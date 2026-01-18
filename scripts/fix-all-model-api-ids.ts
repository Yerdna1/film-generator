import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Complete mapping of all incorrect model IDs to correct API IDs
const MODEL_FIXES = {
  // Qwen
  'qwen-image/text-to-image': 'qwen/text-to-image',
  'qwen-image/image-to-image': 'qwen/image-to-image',
  'qwen-image/edit': 'qwen/edit',

  // Ideogram
  'ideogram-v3/text-to-image': 'ideogram/v3-text-to-image',
  'ideogram-v3/image-edit': 'ideogram/v3-edit',
  'ideogram-v3/describe': 'ideogram/v3-describe',
  'ideogram-v3/reframe': 'ideogram/v3-reframe',
  'ideogram-v3/remix': 'ideogram/v3-remix',
  'ideogram-v3/palette': 'ideogram/v3-palette',
  'ideogram-v3/expand': 'ideogram/v3-expand',
  'ideogram-v3/inpaint': 'ideogram/v3-inpaint',
  'ideogram-v3/replace-background': 'ideogram/v3-replace-background',
  'ideogram-v3/rapid': 'ideogram/v3-rapid',
  'ideogram-character/turbo': 'ideogram/character-turbo',
  'ideogram-v3/upscale': 'ideogram/v3-upscale',

  // Grok
  'grok-imagine/text-to-image': 'grok-imagine/text-to-image',
  'grok-imagine/image-to-image': 'grok-imagine/image-to-image',

  // Seedream variants (check if they need fixing)
  'seedream-4.5/text-to-image': 'seedream/4.5-text-to-image',
  'seedream-4.5/edit': 'seedream/4.5-edit',
  'seedream-4.5-text-to-image': 'seedream/4.5-text-to-image',
  'seedream-4.5-edit': 'seedream/4.5-edit',

  // Imagen
  'google-imagen-4': 'google/imagen4',
  'google-imagen-4-fast': 'google/imagen4-fast',
  'google-imagen-4-ultra': 'google/imagen4-ultra',
};

async function main() {
  console.log('🔧 Fixing all model API IDs...\n');

  let fixedCount = 0;
  let skippedCount = 0;

  for (const [modelId, correctApiModelId] of Object.entries(MODEL_FIXES)) {
    const model = await prisma.kieImageModel.findUnique({
      where: { modelId }
    });

    if (model) {
      if (model.apiModelId !== correctApiModelId) {
        await prisma.kieImageModel.update({
          where: { modelId },
          data: { apiModelId: correctApiModelId }
        });
        console.log(`✅ Fixed: ${modelId} -> ${correctApiModelId}`);
        fixedCount++;
      } else {
        console.log(`⏭️  Already correct: ${modelId}`);
        skippedCount++;
      }
    } else {
      console.log(`⚠️  Not found: ${modelId}`);
      skippedCount++;
    }
  }

  console.log(`\n📊 Summary: ${fixedCount} fixed, ${skippedCount} skipped/not found`);

  // Now check all models to see if any still have incorrect patterns
  console.log('\n🔍 Checking for models with potential issues...');

  const allModels = await prisma.kieImageModel.findMany({
    where: { isActive: true }
  });

  const potentialIssues = allModels.filter(m => {
    const apiId = m.apiModelId || m.modelId;
    // Check for common incorrect patterns
    return apiId.includes('-image/') ||
           apiId.includes('-v3/') ||
           (apiId.startsWith('google-') && !apiId.startsWith('google/')) ||
           (apiId.startsWith('grok-') && !apiId.includes('/'));
  });

  if (potentialIssues.length > 0) {
    console.log(`\n⚠️  Found ${potentialIssues.length} models with potentially incorrect API IDs:`);
    potentialIssues.forEach(m => {
      console.log(`  - ${m.modelId} (API: ${m.apiModelId || m.modelId})`);
    });
  } else {
    console.log('\n✅ No obvious issues found!');
  }

  await prisma.$disconnect();
}

main();
