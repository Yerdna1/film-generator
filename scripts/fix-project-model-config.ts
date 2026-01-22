/**
 * One-time script to fix project modelConfig with incorrect image provider
 *
 * This script updates projects where modelConfig.image.provider is 'gemini'
 * to use 'kie' instead, aligning with the user's actual settings.
 *
 * Usage:
 *   npx tsx scripts/fix-project-model-config.ts
 *
 * Or specify a project ID:
 *   npx tsx scripts/fix-project-model-config.ts <projectId>
 */

import { prisma } from '../src/lib/db/prisma';
import { DEFAULT_MODEL_CONFIG } from '../src/lib/constants/model-config-defaults';

async function fixProjectModelConfig(projectId?: string) {
  console.log('🔧 Fixing project modelConfig...\n');

  try {
    // Find projects that need fixing
    const whereClause: any = {};

    if (projectId) {
      whereClause.id = projectId;
      console.log(`📋 Looking for specific project: ${projectId}`);
    } else {
      // Find all projects with 'gemini' as image provider
      whereClause.modelConfig = {
        path: ['image', 'provider'],
        equals: 'gemini',
      };
      console.log('📋 Looking for ALL projects with image provider set to "gemini"...');
    }

    const projects = await prisma.project.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        modelConfig: true,
      },
    });

    console.log(`\n✅ Found ${projects.length} project(s) to check:\n`);

    const fixed: Array<{ id: string; name: string; oldProvider: string; newProvider: string }> = [];

    for (const project of projects) {
      const currentProvider = project.modelConfig?.image?.provider;

      console.log(`Project: ${project.name} (${project.id})`);
      console.log(`  Current image provider: ${currentProvider || 'not set'}`);

      if (currentProvider === 'gemini') {
        // Update the project
        await prisma.project.update({
          where: { id: project.id },
          data: {
            modelConfig: {
              ...(project.modelConfig || {}),
              image: {
                ...(project.modelConfig?.image || {}),
                provider: 'kie',
                model: project.modelConfig?.image?.model || DEFAULT_MODEL_CONFIG.image.model,
                characterAspectRatio: project.modelConfig?.image?.characterAspectRatio || DEFAULT_MODEL_CONFIG.image.characterAspectRatio,
                sceneAspectRatio: project.modelConfig?.image?.sceneAspectRatio || DEFAULT_MODEL_CONFIG.image.sceneAspectRatio,
                sceneResolution: project.modelConfig?.image?.sceneResolution || DEFAULT_MODEL_CONFIG.image.sceneResolution,
              },
            },
          },
        });

        fixed.push({
          id: project.id,
          name: project.name,
          oldProvider: 'gemini',
          newProvider: 'kie',
        });

        console.log(`  ✅ Updated to: kie`);
        console.log(`  Model: ${project.modelConfig?.image?.model || DEFAULT_MODEL_CONFIG.image.model}\n`);
      } else {
        console.log(`  ⏭️  Skipping (already set to ${currentProvider || 'not set'})\n`);
      }
    }

    console.log(`\n${'='.repeat(50)}`);
    console.log(`📊 Summary:`);
    console.log(`  Projects checked: ${projects.length}`);
    console.log(`  Projects fixed: ${fixed.length}`);

    if (fixed.length > 0) {
      console.log(`\n✅ Fixed projects:`);
      fixed.forEach((p) => {
        console.log(`  - ${p.name}: ${p.oldProvider} → ${p.newProvider}`);
      });
    }

    console.log(`\n✅ Done! Please refresh your browser to see the changes.\n`);

    return fixed;
  } catch (error) {
    console.error('❌ Error fixing project modelConfig:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Get project ID from command line argument
const projectId = process.argv[2];

fixProjectModelConfig(projectId)
  .then((fixed) => {
    process.exit(fixed.length > 0 ? 0 : 1);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
