// Check for remaining base64 data in database
const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '.env.local' });

const prisma = new PrismaClient();

function isBase64(str) {
  if (!str || typeof str !== 'string') return false;
  return str.startsWith('data:') || (str.length > 1000 && !str.startsWith('http'));
}

async function check() {
  // Check scenes
  const scenes = await prisma.scene.findMany({
    select: {
      id: true,
      number: true,
      imageUrl: true,
      videoUrl: true,
      project: { select: { name: true } }
    }
  });

  const base64Scenes = scenes.filter(s => isBase64(s.imageUrl) || isBase64(s.videoUrl));

  console.log('Total scenes:', scenes.length);
  console.log('Scenes with base64 data remaining:', base64Scenes.length);

  if (base64Scenes.length > 0) {
    console.log('\nScenes still with base64:');
    base64Scenes.forEach(s => {
      console.log(`  - Scene ${s.number} in "${s.project.name}"`);
      if (isBase64(s.imageUrl)) console.log(`    imageUrl: ${(s.imageUrl.length / 1024).toFixed(1)} KB`);
      if (isBase64(s.videoUrl)) console.log(`    videoUrl: ${(s.videoUrl.length / 1024).toFixed(1)} KB`);
    });
  }

  // Check characters
  const chars = await prisma.character.findMany({
    select: {
      id: true,
      name: true,
      imageUrl: true,
      project: { select: { name: true } }
    }
  });

  const base64Chars = chars.filter(c => isBase64(c.imageUrl));

  console.log('\nTotal characters:', chars.length);
  console.log('Characters with base64 data remaining:', base64Chars.length);

  // Show sample of current S3 URLs
  const sampleScene = scenes.find(s => s.imageUrl && s.imageUrl.startsWith('https://'));
  if (sampleScene) {
    console.log('\nSample S3 URL:', sampleScene.imageUrl.substring(0, 100) + '...');
  }

  await prisma.$disconnect();
}

check().catch(console.error);
