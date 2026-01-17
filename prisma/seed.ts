import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Create or update the default user
  const email = 'andrej.galad@gmail.com';
  const password = 'Andrejko1';
  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      password: hashedPassword,
      name: 'Andrej Galad',
    },
    create: {
      email,
      password: hashedPassword,
      name: 'Andrej Galad',
      emailVerified: new Date(),
    },
  });

  console.log(`User created/updated: ${user.email}`);

  // Create or update API keys for the user
  // NOTE: Replace these placeholder values with your actual API keys
  const apiKeys = await prisma.apiKeys.upsert({
    where: { userId: user.id },
    update: {
      geminiApiKey: process.env.SEED_GEMINI_API_KEY || 'your-gemini-api-key-here',
      grokApiKey: process.env.SEED_GROK_API_KEY || 'your-grok-api-key-here',
      elevenLabsApiKey: process.env.SEED_ELEVENLABS_API_KEY || 'your-elevenlabs-api-key-here',
      claudeApiKey: process.env.SEED_CLAUDE_API_KEY || 'your-claude-api-key-here',
      openaiApiKey: process.env.SEED_OPENAI_API_KEY || 'your-openai-api-key-here',
      nanoBananaApiKey: process.env.SEED_NANOBANANA_API_KEY || 'your-nanobanana-api-key-here',
    },
    create: {
      userId: user.id,
      geminiApiKey: process.env.SEED_GEMINI_API_KEY || 'your-gemini-api-key-here',
      grokApiKey: process.env.SEED_GROK_API_KEY || 'your-grok-api-key-here',
      elevenLabsApiKey: process.env.SEED_ELEVENLABS_API_KEY || 'your-elevenlabs-api-key-here',
      claudeApiKey: process.env.SEED_CLAUDE_API_KEY || 'your-claude-api-key-here',
      openaiApiKey: process.env.SEED_OPENAI_API_KEY || 'your-openai-api-key-here',
      nanoBananaApiKey: process.env.SEED_NANOBANANA_API_KEY || 'your-nanobanana-api-key-here',
    },
  });

  console.log(`API keys created/updated for user: ${user.email}`);

  // Seed action costs
  const actionCosts = [
    // Image generation
    { actionType: 'image', provider: 'gemini', cost: 0.04, description: 'Gemini Imagen 3 Standard ($0.04/image)' },
    { actionType: 'image', provider: 'nanoBanana', cost: 0.04, description: 'Nano Banana image generation' },
    { actionType: 'image', provider: 'modal', cost: 0.01, description: 'Modal self-hosted (compute only)' },
    { actionType: 'image', provider: 'kie', cost: 0.04, description: 'KIE AI image generation' },

    // Video generation (6s clip)
    { actionType: 'video', provider: 'grok', cost: 0.10, description: 'Grok Imagine video generation (6s)' },
    { actionType: 'video', provider: 'kie', cost: 0.10, description: 'Kie.ai video generation (6s)' },
    { actionType: 'video', provider: 'modal', cost: 0.05, description: 'Modal Hallo3 (compute only)' },

    // Voice generation (average per line ~100 chars)
    { actionType: 'voiceover', provider: 'elevenlabs', cost: 0.03, description: 'ElevenLabs TTS per line (~100 chars)' },
    { actionType: 'voiceover', provider: 'gemini', cost: 0.002, description: 'Gemini TTS per line (~100 chars)' },
    { actionType: 'voiceover', provider: 'modal', cost: 0.001, description: 'Modal Chatterbox TTS (compute only)' },

    // Scene text generation
    { actionType: 'scene', provider: 'gemini', cost: 0.001, description: 'Gemini scene description' },
    { actionType: 'scene', provider: 'claude', cost: 0.005, description: 'Claude scene description' },
    { actionType: 'scene', provider: 'grok', cost: 0.003, description: 'Grok scene description' },

    // Character description generation
    { actionType: 'character', provider: 'gemini', cost: 0.0005, description: 'Gemini character description' },
    { actionType: 'character', provider: 'claude', cost: 0.002, description: 'Claude character description' },

    // Master prompt generation
    { actionType: 'prompt', provider: 'gemini', cost: 0.001, description: 'Gemini master prompt' },
    { actionType: 'prompt', provider: 'claude', cost: 0.005, description: 'Claude master prompt' },

    // Music generation
    { actionType: 'music', provider: 'suno', cost: 0.10, description: 'Suno AI music generation' },
    { actionType: 'music', provider: 'piapi', cost: 0.08, description: 'PiAPI music generation' },
    { actionType: 'music', provider: 'modal', cost: 0.02, description: 'Modal ACE-Step (self-hosted)' },

    // KIE model-specific costs for images
    { actionType: 'image', provider: 'kie', model: 'seedream/4-5-text-to-image', cost: 0.10, description: 'Seedream v4.5 (20 credits)' },
    { actionType: 'image', provider: 'kie', model: 'flux-2/pro-1.1-text-to-image', cost: 0.15, description: 'Flux 2 Pro (30 credits)' },
    { actionType: 'image', provider: 'kie', model: 'google-imagen4/fast-text-to-image', cost: 0.20, description: 'Google Imagen4 Fast (40 credits)' },
    { actionType: 'image', provider: 'kie', model: 'ideogram/v2-text-to-image', cost: 0.25, description: 'Ideogram v2 (50 credits)' },

    // KIE model-specific costs for videos
    { actionType: 'video', provider: 'kie', model: 'grok-imagine/image-to-video', cost: 0.10, description: 'Grok Imagine (20 credits)' },
    { actionType: 'video', provider: 'kie', model: 'kling/v2-6-image-to-video', cost: 0.20, description: 'Kling v2.6 (40 credits)' },
    { actionType: 'video', provider: 'kie', model: 'sora2/image-to-video', cost: 0.30, description: 'Sora2 (60 credits)' },
    { actionType: 'video', provider: 'kie', model: 'veo3/1-quality-hd-image-to-video', cost: 2.00, description: 'Veo 3.1 Quality HD (400 credits)' },

    // KIE model-specific costs for TTS
    { actionType: 'voiceover', provider: 'kie', model: 'elevenlabs/text-to-dialogue-v3', cost: 0.025, description: 'ElevenLabs v3 via KIE (~100 chars)' },
    { actionType: 'voiceover', provider: 'kie', model: 'elevenlabs/text-to-speech-turbo-2-5', cost: 0.020, description: 'ElevenLabs Turbo 2.5 via KIE (~100 chars)' },
    { actionType: 'voiceover', provider: 'kie', model: 'elevenlabs/text-to-speech-multilingual-v2', cost: 0.030, description: 'ElevenLabs Multilingual v2 via KIE (~100 chars)' },
  ];

  for (const cost of actionCosts) {
    if (cost.model) {
      // For model-specific costs, use the unique constraint with model
      await prisma.actionCost.upsert({
        where: {
          actionType_provider_model: {
            actionType: cost.actionType,
            provider: cost.provider,
            model: cost.model,
          },
        },
        update: {
          cost: cost.cost,
          description: cost.description,
        },
        create: cost,
      });
    } else {
      // For non-model-specific costs, use the original unique constraint
      await prisma.actionCost.upsert({
        where: {
          actionType_provider_model: {
            actionType: cost.actionType,
            provider: cost.provider,
            model: null,
          },
        },
        update: {
          cost: cost.cost,
          description: cost.description,
        },
        create: { ...cost, model: null },
      });
    }
  }

  console.log(`Action costs seeded: ${actionCosts.length} entries`);
  console.log('Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
