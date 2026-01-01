const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const scenes = await prisma.scene.findMany({
    where: { projectId: 'cmjsem9l10033oyy72roh82eq' },
    select: { number: true, title: true, textToImagePrompt: true },
    orderBy: { number: 'asc' },
  });

  console.log('Total scenes:', scenes.length);
  console.log('\nSample prompts:');
  [11, 12, 20, 30, 59, 60].forEach(num => {
    const s = scenes.find(x => x.number === num);
    if (s) {
      const hasPrompt = s.textToImagePrompt && s.textToImagePrompt.trim().length > 0;
      console.log(`Scene ${s.number} (${s.title}): ${hasPrompt ? 'HAS PROMPT (' + s.textToImagePrompt.length + ' chars)' : 'EMPTY'}`);
    } else {
      console.log(`Scene ${num}: NOT FOUND`);
    }
  });

  const empty = scenes.filter(s => {
    return s.textToImagePrompt === null || s.textToImagePrompt === undefined || s.textToImagePrompt.trim() === '';
  });

  console.log(`\nScenes with empty prompts: ${empty.length}`);
  if (empty.length > 0) {
    console.log('Empty scene numbers:', empty.map(s => s.number).join(', '));
  }
}

main().finally(() => prisma.$disconnect());
