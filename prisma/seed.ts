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
    { actionType: 'image', provider: 'gemini', cost: 0.04, description: 'Gemini 3 Pro image generation' },
    { actionType: 'image', provider: 'nanoBanana', cost: 0.04, description: 'Nano Banana image generation' },

    // Video generation (6s clip)
    { actionType: 'video', provider: 'grok', cost: 0.10, description: 'Grok Imagine video generation (6s)' },
    { actionType: 'video', provider: 'kie', cost: 0.10, description: 'Kie.ai video generation (6s)' },

    // Voice generation (average per line ~100 chars)
    { actionType: 'voiceover', provider: 'elevenlabs', cost: 0.03, description: 'ElevenLabs TTS per line (~100 chars)' },
    { actionType: 'voiceover', provider: 'gemini', cost: 0.002, description: 'Gemini TTS per line (~100 chars)' },

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
  ];

  for (const cost of actionCosts) {
    await prisma.actionCost.upsert({
      where: {
        actionType_provider: {
          actionType: cost.actionType,
          provider: cost.provider,
        },
      },
      update: {
        cost: cost.cost,
        description: cost.description,
      },
      create: cost,
    });
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
