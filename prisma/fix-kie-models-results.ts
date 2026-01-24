import { prisma } from '../src/lib/db/prisma';

/**
 * Fix script to update KIE image models based on test results.
 *
 * Based on test results, this script will:
 * 1. Mark unsupported models as isActive: false
 * 2. Fix apiModelId for models with incorrect format
 */

async function fixKieModels() {
  console.log('========================================');
  console.log('Fixing KIE Image Models');
  console.log('========================================\n');

  // 1. Mark unsupported models as inactive
  const unsupportedModels = [
    'imagen-4-edit',
    'imagen-4-inpaint',
    'imagen-4-outpaint',
    'imagen-4/rapid',
    'imagen-4-standard',
  ];

  console.log('Step 1: Marking unsupported models as inactive...');
  for (const modelId of unsupportedModels) {
    const updated = await prisma.kieImageModel.updateMany({
      where: { modelId },
      data: { isActive: false },
    });
    if (updated.count > 0) {
      console.log(`  ✓ Deactivated: ${modelId}`);
    }
  }

  // 2. Fix apiModelId for models with incorrect format
  console.log('\nStep 2: Fixing apiModelId for models with incorrect format...');

  // Fix: nano-banana-pro/edit (was: nano-banana/pro/edit)
  const editResult = await prisma.kieImageModel.updateMany({
    where: { modelId: 'nano-banana-pro/edit' },
    data: { apiModelId: 'nano-banana-pro/edit' },
  });
  if (editResult.count > 0) {
    console.log(`  ✓ Fixed nano-banana-pro/edit: apiModelId → 'nano-banana-pro/edit'`);
  }

  // Deactivate Nano Banana Standard models (incorrect format, no valid alternative)
  const standardModels = [
    'nano-banana-standard/2k',
    'nano-banana-standard/4k',
  ];

  console.log('\nStep 3: Deactivating models with no valid fix...');
  for (const modelId of standardModels) {
    const updated = await prisma.kieImageModel.updateMany({
      where: { modelId },
      data: { isActive: false },
    });
    if (updated.count > 0) {
      console.log(`  ✓ Deactivated: ${modelId} (no valid apiModelId)`);
    }
  }

  // Summary
  console.log('\n========================================');
  console.log('SUMMARY');
  console.log('========================================');

  const activeModels = await prisma.kieImageModel.findMany({
    where: { isActive: true },
    select: { modelId: true, apiModelId: true, name: true },
    orderBy: { name: 'asc' }
  });

  console.log(`\n✓ Active models after fix: ${activeModels.length}`);
  for (const model of activeModels) {
    console.log(`  - ${model.name} (${model.apiModelId || model.modelId})`);
  }

  console.log('\n✓ Fix completed!');
  console.log('\nNote: The following working models remain active:');
  console.log('  - Google Nano Banana Pro (all variants use nano-banana-pro)');
  console.log('  - These are the only KIE image models currently supported by the API');
}

fixKieModels()
  .then(() => {
    console.log('\nScript finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nError during fix:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
