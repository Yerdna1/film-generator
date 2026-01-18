import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 All models in database:\n');

  const [images, llms, music] = await Promise.all([
    prisma.kieImageModel.findMany({ orderBy: { modelId: 'asc' } }),
    prisma.kieLlmModel.findMany({ orderBy: { modelId: 'asc' } }),
    prisma.kieMusicModel.findMany({ orderBy: { modelId: 'asc' } })
  ]);

  console.log('🖼️  IMAGE MODELS (' + images.length + ' total):');
  console.log('━'.repeat(80));
  images.forEach((img, i) => {
    console.log(`${i + 1}. ${img.modelId}`);
  });

  console.log('\n🤖 LLM MODELS (' + llms.length + ' total):');
  console.log('━'.repeat(80));
  llms.forEach((llm, i) => {
    console.log(`${i + 1}. ${llm.modelId}`);
  });

  console.log('\n🎵 MUSIC MODELS (' + music.length + ' total):');
  console.log('━'.repeat(80));
  music.forEach((m, i) => {
    console.log(`${i + 1}. ${m.modelId}`);
  });

  await prisma.$disconnect();
}

main();
