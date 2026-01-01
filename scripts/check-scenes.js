const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const projectId = 'cmjsem9l10033oyy72roh82eq';

  // Get characters
  const characters = await prisma.character.findMany({
    where: { projectId },
    select: { id: true, name: true, description: true, masterPrompt: true },
  });
  console.log('Characters:');
  characters.forEach(c => console.log(`  - ${c.name}: ${c.masterPrompt?.substring(0, 150)}...`));

  // Get all scenes
  const scenes = await prisma.scene.findMany({
    where: { projectId },
    select: { id: true, number: true, title: true, description: true, cameraShot: true, textToImagePrompt: true },
    orderBy: { number: 'asc' },
  });

  const missing = scenes.filter(s => {
    const prompt = s.textToImagePrompt;
    return prompt === null || prompt === undefined || prompt.trim() === '';
  });

  console.log(`\nTotal scenes: ${scenes.length}`);
  console.log(`\nScenes missing prompts (${missing.length}):`);
  missing.forEach(s => console.log(`  ${s.number}. ${s.title} (${s.cameraShot})`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
