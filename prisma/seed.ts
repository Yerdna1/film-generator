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
    { actionType: 'music', provider: 'kie', cost: 0.50, description: 'KIE AI music generation (fallback)' },

    // KIE model-specific costs for images with variants
    { actionType: 'image', provider: 'kie', model: 'google-nano-banana-pro', modality: 'text-to-image', quality: '1k-2k', cost: 0.09, description: 'Google Nano Banana Pro 1K/2K (18 credits)' },
    { actionType: 'image', provider: 'kie', model: 'google-nano-banana-pro-4k', modality: 'text-to-image', quality: '4k', cost: 0.12, description: 'Google Nano Banana Pro 4K (24 credits)' },
    { actionType: 'image', provider: 'kie', model: 'grok-imagine/text-to-image', modality: 'text-to-image', cost: 0.02, description: 'Grok Imagine Text to Image (4 credits per 6 images)' },
    { actionType: 'image', provider: 'kie', model: 'grok-imagine/image-to-image', modality: 'image-to-image', cost: 0.02, description: 'Grok Imagine Image to Image (4 credits per 2 images)' },
    { actionType: 'image', provider: 'kie', model: 'seedream/4-5-text-to-image', modality: 'text-to-image', cost: 0.10, description: 'Seedream v4.5 (20 credits)' },
    { actionType: 'image', provider: 'kie', model: 'flux-2/pro-1.1-text-to-image', modality: 'text-to-image', quality: 'pro', cost: 0.15, description: 'Flux 2 Pro 1.1 (30 credits)' },
    { actionType: 'image', provider: 'kie', model: 'google-imagen4/fast-text-to-image', modality: 'text-to-image', quality: 'fast', cost: 0.20, description: 'Google Imagen4 Fast (40 credits)' },
    { actionType: 'image', provider: 'kie', model: 'google-imagen4/ultra-text-to-image', modality: 'text-to-image', quality: 'ultra', cost: 0.25, description: 'Google Imagen4 Ultra (50 credits)' },
    { actionType: 'image', provider: 'kie', model: 'ideogram/v2-text-to-image', modality: 'text-to-image', quality: 'standard', cost: 0.25, description: 'Ideogram v2 (50 credits)' },
    { actionType: 'image', provider: 'kie', model: 'ideogram/v2-turbo-text-to-image', modality: 'text-to-image', quality: 'turbo', cost: 0.20, description: 'Ideogram v2 Turbo (40 credits)' },

    // KIE model-specific costs for videos with variants
    { actionType: 'video', provider: 'kie', model: 'grok-imagine/image-to-video', modality: 'image-to-video', cost: 0.20, description: 'Grok Imagine (40 credits)' },
    { actionType: 'video', provider: 'kie', model: 'kling/v2-6-image-to-video', modality: 'image-to-video', cost: 0.375, description: 'Kling v2.6 (75 credits)' },
    { actionType: 'video', provider: 'kie', model: 'sora2/5s-image-to-video', modality: 'image-to-video', length: '5s', cost: 0.50, description: 'Sora2 5 seconds (100 credits)' },
    { actionType: 'video', provider: 'kie', model: 'sora2/10s-image-to-video', modality: 'image-to-video', length: '10s', cost: 0.90, description: 'Sora2 10 seconds (180 credits)' },
    { actionType: 'video', provider: 'kie', model: 'veo/3-1-fast-image-to-video', modality: 'image-to-video', quality: 'fast', cost: 0.40, description: 'Veo 3.1 Fast (80 credits)' },
    { actionType: 'video', provider: 'kie', model: 'veo/3-1-quality-image-to-video', modality: 'image-to-video', quality: 'quality', cost: 2.00, description: 'Veo 3.1 Quality (400 credits)' },

    // KIE model-specific costs for TTS
    { actionType: 'voiceover', provider: 'kie', model: 'elevenlabs/text-to-dialogue-v3', cost: 0.025, description: 'ElevenLabs v3 via KIE (~100 chars)' },
    { actionType: 'voiceover', provider: 'kie', model: 'elevenlabs/text-to-speech-turbo-2-5', cost: 0.020, description: 'ElevenLabs Turbo 2.5 via KIE (~100 chars)' },
    { actionType: 'voiceover', provider: 'kie', model: 'elevenlabs/text-to-speech-multilingual-v2', cost: 0.030, description: 'ElevenLabs Multilingual v2 via KIE (~100 chars)' },

    // KIE model-specific costs for music
    { actionType: 'music', provider: 'kie', model: 'suno/v3-5-music', cost: 0.50, description: 'Suno v3.5 via KIE (100 credits)' },
    { actionType: 'music', provider: 'kie', model: 'suno/v3-music', cost: 0.40, description: 'Suno v3 via KIE (80 credits)' },
    { actionType: 'music', provider: 'kie', model: 'udio/v1-5-music', cost: 0.45, description: 'Udio v1.5 via KIE (90 credits)' },
  ];

  for (const cost of actionCosts) {
    // First, try to find existing record
    const existing = await prisma.actionCost.findFirst({
      where: {
        actionType: cost.actionType,
        provider: cost.provider,
        model: cost.model || null,
        modality: (cost as any).modality || null,
        quality: (cost as any).quality || null,
        length: (cost as any).length || null,
      },
    });

    if (existing) {
      // Update existing record
      await prisma.actionCost.update({
        where: { id: existing.id },
        data: {
          cost: cost.cost,
          description: cost.description,
        },
      });
    } else {
      // Create new record
      await prisma.actionCost.create({
        data: {
          ...cost,
          model: cost.model || null,
          modality: (cost as any).modality || null,
          quality: (cost as any).quality || null,
          length: (cost as any).length || null,
        },
      });
    }
  }

  console.log(`Action costs seeded: ${actionCosts.length} entries`);

  // Seed page visibility rules
  const pageVisibilities = [
    {
      path: '/settings',
      name: 'Settings',
      description: 'API keys and provider configuration',
      allowedRoles: JSON.stringify(['admin']), // Admins can always access
      allowedSubscriptionStatus: JSON.stringify(['premium', 'trial']), // Premium and trial users
      hideIfUserOwnsApiKey: false, // Keep false - we're using subscription status instead
      isEnabled: true,
      priority: 100,
    },
    {
      path: '/projects',
      name: 'Projects',
      description: 'User projects',
      allowedRoles: JSON.stringify('*'),
      hideIfUserOwnsApiKey: false,
      isEnabled: true,
      priority: 0,
    },
    {
      path: '/statistics',
      name: 'Statistics',
      description: 'User statistics and analytics',
      allowedRoles: JSON.stringify('*'),
      hideIfUserOwnsApiKey: false,
      isEnabled: true,
      priority: 0,
    },
    {
      path: '/profile',
      name: 'Profile',
      description: 'User profile',
      allowedRoles: JSON.stringify('*'),
      hideIfUserOwnsApiKey: false,
      isEnabled: true,
      priority: 0,
    },
    {
      path: '/billing',
      name: 'Billing',
      description: 'Billing and subscription management',
      allowedRoles: JSON.stringify('*'),
      hideIfUserOwnsApiKey: false,
      isEnabled: true,
      priority: 0,
    },
    {
      path: '/admin',
      name: 'Admin',
      description: 'Admin dashboard',
      allowedRoles: JSON.stringify(['admin']), // Only admins
      hideIfUserOwnsApiKey: false,
      isEnabled: true,
      priority: 100,
    },
  ];

  for (const pageVisibility of pageVisibilities) {
    await prisma.pageVisibility.upsert({
      where: { path: pageVisibility.path },
      update: pageVisibility,
      create: pageVisibility,
    });
  }

  console.log(`Page visibility rules seeded: ${pageVisibilities.length} entries`);
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
