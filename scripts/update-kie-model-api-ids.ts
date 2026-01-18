import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Mapping of internal modelId patterns to correct KIE.ai API model IDs
// Based on research from KIE.ai documentation
const MODEL_ID_MAPPINGS = {
  // ==================== IMAGE MODELS ====================
  // Seedream models
  'seedream-4.5-text-to-image': 'seedream/4.5-text-to-image',
  'seedream-4.5-edit': 'seedream/4.5-edit',
  'seedream-3.0': 'seedream/4.5-text-to-image', // Map old version to current

  // Flux models
  'flux-2-pro-text-to-image': 'flux-2/pro-text-to-image',
  'flux-2-pro-image-to-image': 'flux-2/pro-image-to-image',
  'flux-2-flex-text-to-image': 'flux-2/flex-text-to-image',
  'flux-2-flex-image-to-image': 'flux-2/flex-image-to-image',
  'flux-2-dev': 'flux-2/dev-text-to-image',
  'flux-2-kontext': 'flux-2/kontext-text-to-image',

  // Ideogram models
  'ideogram-v3-text-to-image': 'ideogram/v3-text-to-image',
  'ideogram-v3-edit': 'ideogram/v3-edit',
  'ideogram-v3-reframe': 'ideogram/v3-reframe',
  'ideogram-v3-remix': 'ideogram/v3-remix',

  // Nano Banana models
  'nano-banana-pro': 'nano-banana-pro',
  'google-nano-banana': 'google/nano-banana',
  'nano-banana-standard': 'google/nano-banana',

  // Qwen models
  'qwen-text-to-image': 'qwen/text-to-image',
  'qwen-image-to-image': 'qwen/image-to-image',

  // Z-Image
  'z-image': 'z-image',
  'z-image-turbo': 'z-image',

  // Grok Imagine models
  'grok-imagine-text-to-image': 'grok-imagine/text-to-image',
  'grok-imagine-image-to-image': 'grok-imagine/image-to-image',

  // Imagen models
  'google-imagen-4': 'google/imagen4',
  'google-imagen-4-fast': 'google/imagen4-fast',
  'google-imagen-4-ultra': 'google/imagen4-ultra',
  'imagen-4-fast': 'google/imagen4-fast',
  'imagen-4-ultra': 'google/imagen4-ultra',

  // GPT Image models
  'gpt-image-1.5-text-to-image': 'gpt-image/1.5-text-to-image',
  'gpt-image-1.5-image-to-image': 'gpt-image/1.5-image-to-image',

  // ==================== VIDEO MODELS ====================
  // Grok Imagine video
  'grok-imagine-image-to-video': 'grok-imagine/image-to-video',
  'grok-imagine-text-to-video': 'grok-imagine/text-to-video',
  'grok-imagine-upscaled': 'grok-imagine/upscale',

  // Kling models
  'kling-v2.1': 'kling/v2.1-text-to-video',
  'kling-v2.6': 'kling/v2.6-text-to-video',
  'kling-1.5': 'kling/1.5-text-to-video',
  'kling-1.6': 'kling/1.6-text-to-video',

  // Seedance models
  'seedance-1.5-pro': 'seedance/1.5-pro-text-to-video',
  'seedance-1.5-standard': 'seedance/1.5-standard-text-to-video',

  // Wan models
  'wan-2.6': 'wan/2.6-text-to-video',
  'wan-2.1': 'wan/2.1-text-to-video',

  // Hailuo models
  'hailuo-02-standard': 'hailuo/02-standard-text-to-video',
  'hailuo-02-pro': 'hailuo/02-pro-text-to-video',

  // Sora models
  'sora-2': 'sora/2-text-to-video',

  // Veo models
  'google-veo-3.1': 'google/veo/3.1-text-to-video',
  'google-veo-3': 'google/veo/3-text-to-video',

  // Topaz models
  'topaz-video-ai': 'topaz/video-ai',

  // ==================== TTS MODELS ====================
  'elevenlabs-text-to-dialogue-v3': 'elevenlabs/text-to-dialogue-v3',
  'elevenlabs-tts-turbo-2.5': 'elevenlabs/tts-turbo-2.5',
  'elevenlabs-tts-multilingual-v2': 'elevenlabs/tts-multilingual-v2',
  'elevenlabs-sound-effect-v2': 'elevenlabs/sound-effect-v2',
  'elevenlabs-speech-to-text': 'elevenlabs/speech-to-text',
  'elevenlabs-audio-isolation': 'elevenlabs/audio-isolation',

  // ==================== MUSIC MODELS ====================
  'suno-v3.5-music': 'suno/v3.5-music',
  'udio-v1.5-music': 'udio/v1.5-music',

  // ==================== LLM MODELS ====================
  'google-gemini-3-pro': 'google/gemini-3-pro',
  'google-gemini-3-flash': 'google/gemini-3-flash',
  'anthropic-claude-4.5-sonnet': 'anthropic/claude-4.5-sonnet',
  'anthropic-claude-4.5-haiku': 'anthropic/claude-4.5-haiku',
  'openai-gpt-4o': 'openai/gpt-4o',
  'meta-llama-3.1-405b': 'meta/llama-3.1-405b',
  'xai-grok-2': 'xai/grok-2',
};

// Helper function to find matching API model ID
function findApiModelId(internalModelId: string): string | undefined {
  // Direct match from mappings
  if (MODEL_ID_MAPPINGS[internalModelId]) {
    return MODEL_ID_MAPPINGS[internalModelId];
  }

  // Check if the modelId is already in correct API format (contains /)
  // If it has a slash, it's likely already the correct API ID
  if (internalModelId.includes('/') && !internalModelId.includes('-pro/') && !internalModelId.includes('-standard/')) {
    return internalModelId;
  }

  // Normalize model IDs: replace common patterns
  let normalizedId = internalModelId
    // Replace v3 with /v3
    .replace(/-v3\//g, '/v3-')
    .replace(/v3\//g, '/v3-')
    // Replace -pro/ with /pro/
    .replace(/-pro\//g, '/pro/')
    // Replace -standard/ with /standard/
    .replace(/-standard\//g, '/standard/');

  // Pattern matching for resolution/quality variants
  const patterns = [
    // Image models with resolution
    { pattern: /flux-2-pro\/(\d+)k/, apiId: 'flux-2/pro-text-to-image' },
    { pattern: /seedream-3\.0\/(\d+)k/, apiId: 'seedream/4.5-text-to-image' },
    { pattern: /seedream-4\.5\/(\d+)k/, apiId: 'seedream/4.5-text-to-image' },
    { pattern: /nano-banana-pro\/(\d+)k/, apiId: 'nano-banana-pro' },
    { pattern: /imagen-4-(fast|ultra)\/(\d+)k/, apiId: 'google/imagen4-$1' },

    // Video models with resolution and duration
    { pattern: /grok-imagine\/image-to-video-(\d+)s-(\d+)p/, apiId: 'grok-imagine/image-to-video' },
    { pattern: /veo\/3.1-text-to-video-(fast|quality)-(\d+)s-(\d+)p/, apiId: 'google/veo/3.1-text-to-video' },
    { pattern: /kling\/v2.6-(\d+)p-(\d+)s/, apiId: 'kling/v2.6-text-to-video' },
    { pattern: /sora-2-text-to-video-(\d+)s-(\d+)p/, apiId: 'sora/2-text-to-video' },
    { pattern: /hailuo\/02-(standard|pro)-(\d+)p-(\d+)s/, apiId: 'hailuo/02-$1-text-to-video' },
    { pattern: /wan\/2.6-text-to-video-(\d+)p-(\d+)s/, apiId: 'wan/2.6-text-to-video' },
  ];

  for (const { pattern, apiId } of patterns) {
    if (pattern.test(internalModelId)) {
      return apiId;
    }
  }

  // If no match found, return the normalized version or undefined
  if (normalizedId !== internalModelId) {
    return normalizedId;
  }

  return undefined;
}

async function updateImageModels() {
  console.log('🖼️  Updating KieImageModel...');

  const models = await prisma.kieImageModel.findMany({
    where: { isActive: true }
  });

  let updated = 0;
  let skipped = 0;
  let noMatch: string[] = [];

  for (const model of models) {
    const apiModelId = findApiModelId(model.modelId);

    if (apiModelId) {
      await prisma.kieImageModel.update({
        where: { id: model.id },
        data: { apiModelId }
      });
      console.log(`   ✅ ${model.modelId} -> ${apiModelId}`);
      updated++;
    } else {
      console.log(`   ⚠️  No API ID found for: ${model.modelId}`);
      noMatch.push(model.modelId);
      skipped++;
    }
  }

  console.log(`   Updated: ${updated}, Skipped: ${skipped}`);

  if (noMatch.length > 0) {
    console.log(`   ⚠️  Models without API ID mapping:`);
    noMatch.forEach(id => console.log(`      - ${id}`));
  }

  return { updated, skipped, noMatch };
}

async function updateVideoModels() {
  console.log('🎥 Updating KieVideoModel...');

  const models = await prisma.kieVideoModel.findMany({
    where: { isActive: true }
  });

  let updated = 0;
  let skipped = 0;
  let noMatch: string[] = [];

  for (const model of models) {
    const apiModelId = findApiModelId(model.modelId);

    if (apiModelId) {
      await prisma.kieVideoModel.update({
        where: { id: model.id },
        data: { apiModelId }
      });
      console.log(`   ✅ ${model.modelId} -> ${apiModelId}`);
      updated++;
    } else {
      console.log(`   ⚠️  No API ID found for: ${model.modelId}`);
      noMatch.push(model.modelId);
      skipped++;
    }
  }

  console.log(`   Updated: ${updated}, Skipped: ${skipped}`);

  if (noMatch.length > 0) {
    console.log(`   ⚠️  Models without API ID mapping:`);
    noMatch.forEach(id => console.log(`      - ${id}`));
  }

  return { updated, skipped, noMatch };
}

async function updateTtsModels() {
  console.log('🔊 Updating KieTtsModel...');

  const models = await prisma.kieTtsModel.findMany({
    where: { isActive: true }
  });

  let updated = 0;
  let skipped = 0;
  let noMatch: string[] = [];

  for (const model of models) {
    const apiModelId = findApiModelId(model.modelId);

    if (apiModelId) {
      await prisma.kieTtsModel.update({
        where: { id: model.id },
        data: { apiModelId }
      });
      console.log(`   ✅ ${model.modelId} -> ${apiModelId}`);
      updated++;
    } else {
      console.log(`   ⚠️  No API ID found for: ${model.modelId}`);
      noMatch.push(model.modelId);
      skipped++;
    }
  }

  console.log(`   Updated: ${updated}, Skipped: ${skipped}`);

  if (noMatch.length > 0) {
    console.log(`   ⚠️  Models without API ID mapping:`);
    noMatch.forEach(id => console.log(`      - ${id}`));
  }

  return { updated, skipped, noMatch };
}

async function updateMusicModels() {
  console.log('🎵 Updating KieMusicModel...');

  const models = await prisma.kieMusicModel.findMany({
    where: { isActive: true }
  });

  let updated = 0;
  let skipped = 0;
  let noMatch: string[] = [];

  for (const model of models) {
    const apiModelId = findApiModelId(model.modelId);

    if (apiModelId) {
      await prisma.kieMusicModel.update({
        where: { id: model.id },
        data: { apiModelId }
      });
      console.log(`   ✅ ${model.modelId} -> ${apiModelId}`);
      updated++;
    } else {
      console.log(`   ⚠️  No API ID found for: ${model.modelId}`);
      noMatch.push(model.modelId);
      skipped++;
    }
  }

  console.log(`   Updated: ${updated}, Skipped: ${skipped}`);

  if (noMatch.length > 0) {
    console.log(`   ⚠️  Models without API ID mapping:`);
    noMatch.forEach(id => console.log(`      - ${id}`));
  }

  return { updated, skipped, noMatch };
}

async function updateLlmModels() {
  console.log('🤖 Updating KieLlmModel...');

  const models = await prisma.kieLlmModel.findMany({
    where: { isActive: true }
  });

  let updated = 0;
  let skipped = 0;
  let noMatch: string[] = [];

  for (const model of models) {
    const apiModelId = findApiModelId(model.modelId);

    if (apiModelId) {
      await prisma.kieLlmModel.update({
        where: { id: model.id },
        data: { apiModelId }
      });
      console.log(`   ✅ ${model.modelId} -> ${apiModelId}`);
      updated++;
    } else {
      console.log(`   ⚠️  No API ID found for: ${model.modelId}`);
      noMatch.push(model.modelId);
      skipped++;
    }
  }

  console.log(`   Updated: ${updated}, Skipped: ${skipped}`);

  if (noMatch.length > 0) {
    console.log(`   ⚠️  Models without API ID mapping:`);
    noMatch.forEach(id => console.log(`      - ${id}`));
  }

  return { updated, skipped, noMatch };
}

async function main() {
  console.log('🚀 Starting KIE.ai Model API ID Updates...\n');

  try {
    const imageResults = await updateImageModels();
    console.log();

    const videoResults = await updateVideoModels();
    console.log();

    const ttsResults = await updateTtsModels();
    console.log();

    const musicResults = await updateMusicModels();
    console.log();

    const llmResults = await updateLlmModels();
    console.log();

    // Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Image Models:   ${imageResults.updated} updated, ${imageResults.skipped} skipped`);
    console.log(`Video Models:   ${videoResults.updated} updated, ${videoResults.skipped} skipped`);
    console.log(`TTS Models:     ${ttsResults.updated} updated, ${ttsResults.skipped} skipped`);
    console.log(`Music Models:   ${musicResults.updated} updated, ${musicResults.skipped} skipped`);
    console.log(`LLM Models:     ${llmResults.updated} updated, ${llmResults.skipped} skipped`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const totalUpdated = imageResults.updated + videoResults.updated + ttsResults.updated + musicResults.updated + llmResults.updated;
    const totalSkipped = imageResults.skipped + videoResults.skipped + ttsResults.skipped + musicResults.skipped + llmResults.skipped;

    console.log(`\n✅ Total: ${totalUpdated} models updated`);
    console.log(`⚠️  Total: ${totalSkipped} models skipped`);

    if (totalSkipped > 0) {
      console.log('\n⚠️  Some models could not be mapped to API IDs.');
      console.log('   You may need to manually update these models or add them to the mapping.');
    }
  } catch (error) {
    console.error('❌ Error updating models:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
