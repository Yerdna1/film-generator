import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

async function main() {
  console.log('🗑️  Deleting extra models from database...\n');

  // Delete 12 extra image models
  const extraImageModels = [
    'ideogram-v3/edit',
    'ideogram-v3/character',
    'seedream-4.5/inpaint',
    'seedream-4.5/outpaint',
    'ideogram-v3/render',
    'google-imagen4/fast-text-to-image',
    'google-imagen4/standard-text-to-image',
    'google-imagen4/ultra-text-to-image',
    'imagen-4-fast/landscape',
    'imagen-4-fast/portrait',
    'imagen-4-ultra/landscape',
    'imagen-4-ultra/portrait'
  ];

  console.log(`🖼️  Deleting ${extraImageModels.length} extra image models...`);
  const imageDeleteResult = await prisma.kieImageModel.deleteMany({
    where: {
      modelId: { in: extraImageModels }
    }
  });
  console.log(`   ✓ Deleted ${imageDeleteResult.count} image models`);

  // Delete 7 extra LLM models (input/output variants)
  const extraLlmModels = [
    'claude-opus-4-5-thinking/input',
    'claude-opus-4-5-thinking/output',
    'claude-sonnet-4-5-thinking/input',
    'claude-sonnet-4-5-thinking/output',
    'gemini-2.5-flash/input',
    'gemini-2.5-flash/output',
    'gemini-3-flash/input'
  ];

  console.log(`\n🤖 Deleting ${extraLlmModels.length} extra LLM models...`);
  const llmDeleteResult = await prisma.kieLlmModel.deleteMany({
    where: {
      modelId: { in: extraLlmModels }
    }
  });
  console.log(`   ✓ Deleted ${llmDeleteResult.count} LLM models`);

  // Delete 5 extra music models (elevenlabs sound-effect variants and suno-api variants)
  const extraMusicModels = [
    'elevenlabs-sound-effect-v2/extended',
    'elevenlabs-sound-effect-v2/long',
    'elevenlabs-sound-effect-v2/medium',
    'elevenlabs-sound-effect-v2/short',
    'elevenlabs-text-to-dialogue-v3/expressive'
  ];

  console.log(`\n🎵 Deleting ${extraMusicModels.length} extra music models...`);
  const musicDeleteResult = await prisma.kieMusicModel.deleteMany({
    where: {
      modelId: { in: extraMusicModels }
    }
  });
  console.log(`   ✓ Deleted ${musicDeleteResult.count} music models`);

  console.log('\n✅ Extra models deleted successfully!');
  console.log('━'.repeat(80));

  // Show updated counts
  const [videoCount, imageCount, llmCount, musicCount, ttsCount] = await Promise.all([
    prisma.kieVideoModel.count(),
    prisma.kieImageModel.count(),
    prisma.kieLlmModel.count(),
    prisma.kieMusicModel.count(),
    prisma.kieTtsModel.count()
  ]);

  console.log('\n📊 Updated counts:');
  console.log(`   🎬 Video: ${videoCount}/152`);
  console.log(`   🖼️  Image: ${imageCount}/64`);
  console.log(`   🤖 LLM: ${llmCount}/14`);
  console.log(`   🎵 Music: ${musicCount}/18`);
  console.log(`   🎙️  TTS: ${ttsCount}/5`);

  await prisma.$disconnect();
}

main();
