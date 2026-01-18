import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

async function main() {
  console.log('📊 KIE.ai Model Counts in Database\n');
  console.log('━'.repeat(80));

  const [videoCount, imageCount, llmCount, musicCount, ttsCount] = await Promise.all([
    prisma.kieVideoModel.count(),
    prisma.kieImageModel.count(),
    prisma.kieLlmModel.count(),
    prisma.kieMusicModel.count(),
    prisma.kieTtsModel.count()
  ]);

  console.log(`🎬 Video Models: ${videoCount}/152`);
  console.log(`🖼️  Image Models: ${imageCount}/64`);
  console.log(`🤖 LLM Models: ${llmCount}/14`);
  console.log(`🎵 Music Models: ${musicCount}/18`);
  console.log(`🎙️  TTS Models: ${ttsCount}/5`);
  console.log('━'.repeat(80));

  const total = videoCount + imageCount + llmCount + musicCount + ttsCount;
  const targetTotal = 152 + 64 + 14 + 18 + 5;

  console.log(`\n📊 Total: ${total}/${targetTotal}`);
  console.log(`   Progress: ${((total / targetTotal) * 100).toFixed(1)}%`);

  // Show differences from target
  console.log('\n🔍 Differences from target:');
  console.log(`   Video: ${videoCount - 152 > 0 ? '+' : ''}${videoCount - 152}`);
  console.log(`   Image: ${imageCount - 64 > 0 ? '+' : ''}${imageCount - 64}`);
  console.log(`   LLM: ${llmCount - 14 > 0 ? '+' : ''}${llmCount - 14}`);
  console.log(`   Music: ${musicCount - 18 > 0 ? '+' : ''}${musicCount - 18}`);
  console.log(`   TTS: ${ttsCount - 5 > 0 ? '+' : ''}${ttsCount - 5}`);

  await prisma.$disconnect();
}

main();
