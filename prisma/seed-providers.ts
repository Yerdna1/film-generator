import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedProviders() {
  console.log('🚀 Starting provider seed...');

  // Seed all providers based on current hardcoded constants
  const providers = [
    // LLM Providers
    {
      providerId: 'kie',
      name: 'kie',
      displayName: 'Kie.ai',
      icon: '🤖',
      color: 'orange',
      description: 'Multiple LLM models: Claude, GPT-4, Gemini, DeepSeek, etc.',
      apiKeyField: 'kieApiKey',
      modelField: 'kieLlmModel',
      supportedModalities: ['llm', 'image', 'video', 'tts', 'music'],
      isDefault: true,
      requiresEndpoint: false,
    },
    {
      providerId: 'openrouter',
      name: 'openrouter',
      displayName: 'OpenRouter',
      icon: '🌐',
      color: 'emerald',
      description: 'Multi-provider API for Claude, GPT-4, Gemini, and more',
      apiKeyField: 'openRouterApiKey',
      modelField: 'openRouterModel',
      supportedModalities: ['llm'],
      requiresEndpoint: false,
    },
    {
      providerId: 'claude-sdk',
      name: 'claude-sdk',
      displayName: 'Claude SDK',
      icon: '🧠',
      color: 'amber',
      description: 'Local Claude CLI (does not work on Vercel)',
      apiKeyField: 'claudeApiKey',
      supportedModalities: ['llm'],
      requiresEndpoint: false,
    },
    {
      providerId: 'modal',
      name: 'modal',
      displayName: 'Modal (Self-Hosted)',
      icon: '⚡',
      color: 'cyan',
      description: 'Self-hosted models on Modal.com GPU infrastructure',
      apiKeyField: 'modalLlmEndpoint',
      supportedModalities: ['llm', 'image', 'video', 'tts', 'music'],
      requiresEndpoint: true,
      setupGuide: JSON.stringify({
        steps: [
          'Deploy Modal endpoints',
          'Copy endpoint URLs',
          'Paste URLs in settings',
        ],
      }),
    },

    // Image Providers
    {
      providerId: 'gemini',
      name: 'gemini',
      displayName: 'Gemini',
      icon: '✨',
      color: 'blue',
      description: 'Google Gemini for image generation',
      apiKeyField: 'geminiApiKey',
      supportedModalities: ['image'],
      requiresEndpoint: false,
      helpLink: 'https://makersuite.google.com/app/apikey',
    },
    {
      providerId: 'modal-edit',
      name: 'modal-edit',
      displayName: 'Modal Qwen-Image-Edit',
      icon: '🖼️',
      color: 'cyan',
      description: 'Best character consistency with reference images',
      apiKeyField: 'modalImageEditEndpoint',
      supportedModalities: ['image'],
      requiresEndpoint: true,
    },

    // TTS Providers
    {
      providerId: 'gemini-tts',
      name: 'gemini-tts',
      displayName: 'Gemini TTS',
      icon: '🔊',
      color: 'blue',
      description: 'Google Gemini TTS with excellent Slovak support',
      apiKeyField: 'geminiApiKey',
      supportedModalities: ['tts'],
      requiresEndpoint: false,
    },
    {
      providerId: 'openai-tts',
      name: 'openai-tts',
      displayName: 'OpenAI TTS',
      icon: '🗣️',
      color: 'green',
      description: 'OpenAI gpt-4o-mini-tts with voice instructions',
      apiKeyField: 'openaiApiKey',
      supportedModalities: ['tts'],
      requiresEndpoint: false,
      helpLink: 'https://platform.openai.com/api-keys',
    },
    {
      providerId: 'elevenlabs',
      name: 'elevenlabs',
      displayName: 'ElevenLabs',
      icon: '🎙️',
      color: 'violet',
      description: 'High-quality voices, best for English',
      apiKeyField: 'elevenLabsApiKey',
      supportedModalities: ['tts'],
      requiresEndpoint: false,
      helpLink: 'https://elevenlabs.io/api',
    },

    // Music Providers
    {
      providerId: 'piapi',
      name: 'piapi',
      displayName: 'PiAPI',
      icon: '🎵',
      color: 'pink',
      description: 'Access Suno, Udio, and more via unified API',
      apiKeyField: 'piapiApiKey',
      supportedModalities: ['music'],
      requiresEndpoint: false,
      helpLink: 'https://piapi.ai',
    },
    {
      providerId: 'suno',
      name: 'suno',
      displayName: 'Suno AI',
      icon: '🎶',
      color: 'purple',
      description: 'Direct Suno API via sunoapi.org',
      apiKeyField: 'sunoApiKey',
      supportedModalities: ['music'],
      requiresEndpoint: false,
      helpLink: 'https://suno.ai/api',
    },
  ];

  // Upsert providers
  for (const provider of providers) {
    const result = await prisma.provider.upsert({
      where: { providerId: provider.providerId },
      update: {
        name: provider.name,
        displayName: provider.displayName,
        icon: provider.icon,
        color: provider.color,
        description: provider.description,
        apiKeyField: provider.apiKeyField,
        modelField: provider.modelField,
        supportedModalities: provider.supportedModalities,
        isActive: true,
        isDefault: provider.isDefault || false,
        requiresEndpoint: provider.requiresEndpoint || false,
        helpLink: provider.helpLink,
        setupGuide: provider.setupGuide,
      },
      create: provider,
    });
    console.log(`✅ Seeded provider: ${result.displayName}`);
  }

  console.log('✅ Provider seeding completed!');
}

async function seedNonKieModels() {
  console.log('🚀 Starting non-KIE model seed...');

  // Seed OpenRouter LLM models
  const openrouterModels = [
    {
      providerId: 'openrouter',
      modelId: 'anthropic/claude-4.5-sonnet',
      name: 'claude-4.5-sonnet',
      displayName: 'Claude Sonnet 4.5',
      apiModelId: 'anthropic/claude-4.5-sonnet',
      description: 'Latest Claude Sonnet model with enhanced capabilities',
      contextWindow: 200000,
      maxOutputTokens: 8192,
      cost: 0.003,
      costUnit: 'per_1k_tokens',
      supportedLanguages: ['en', 'sk', 'cs', 'pl', 'de', 'fr', 'es'],
      capabilities: ['chat', 'completion', 'function_calling'],
      inputParameters: { temperature: { min: 0, max: 1, default: 0.7 } },
      outputParameters: {},
    },
    {
      providerId: 'openrouter',
      modelId: 'anthropic/claude-3.5-sonnet',
      name: 'claude-3.5-sonnet',
      displayName: 'Claude Sonnet 3.5',
      apiModelId: 'anthropic/claude-3.5-sonnet',
      description: 'Previous generation Claude Sonnet',
      contextWindow: 200000,
      maxOutputTokens: 8192,
      cost: 0.003,
      costUnit: 'per_1k_tokens',
      supportedLanguages: ['en', 'sk', 'cs', 'pl', 'de', 'fr', 'es'],
      capabilities: ['chat', 'completion', 'function_calling'],
      inputParameters: { temperature: { min: 0, max: 1, default: 0.7 } },
      outputParameters: {},
    },
    {
      providerId: 'openrouter',
      modelId: 'openai/gpt-4o',
      name: 'gpt-4o',
      displayName: 'GPT-4o',
      apiModelId: 'openai/gpt-4o',
      description: 'OpenAI GPT-4 Optimized',
      contextWindow: 128000,
      maxOutputTokens: 16384,
      cost: 0.005,
      costUnit: 'per_1k_tokens',
      supportedLanguages: ['en', 'sk', 'cs', 'pl', 'de', 'fr', 'es'],
      capabilities: ['chat', 'completion', 'function_calling', 'vision'],
      inputParameters: { temperature: { min: 0, max: 2, default: 1 } },
      outputParameters: {},
    },
    {
      providerId: 'openrouter',
      modelId: 'openai/gpt-4o-mini',
      name: 'gpt-4o-mini',
      displayName: 'GPT-4o Mini',
      apiModelId: 'openai/gpt-4o-mini',
      description: 'Smaller, faster GPT-4 variant',
      contextWindow: 128000,
      maxOutputTokens: 16384,
      cost: 0.00015,
      costUnit: 'per_1k_tokens',
      supportedLanguages: ['en', 'sk', 'cs', 'pl', 'de', 'fr', 'es'],
      capabilities: ['chat', 'completion', 'function_calling'],
      inputParameters: { temperature: { min: 0, max: 2, default: 1 } },
      outputParameters: {},
    },
    {
      providerId: 'openrouter',
      modelId: 'google/gemini-pro-1.5',
      name: 'gemini-pro-1.5',
      displayName: 'Gemini Pro 1.5',
      apiModelId: 'google/gemini-pro-1.5',
      description: 'Google Gemini Pro with extended context',
      contextWindow: 2097152,
      maxOutputTokens: 8192,
      cost: 0.00025,
      costUnit: 'per_1k_tokens',
      supportedLanguages: ['en', 'sk', 'cs', 'pl', 'de', 'fr', 'es'],
      capabilities: ['chat', 'completion', 'function_calling', 'vision'],
      inputParameters: { temperature: { min: 0, max: 2, default: 0.7 } },
      outputParameters: {},
    },
    {
      providerId: 'openrouter',
      modelId: 'deepseek/deepseek-chat',
      name: 'deepseek-chat',
      displayName: 'DeepSeek V3',
      apiModelId: 'deepseek/deepseek-chat',
      description: 'DeepSeek V3 - efficient large model',
      contextWindow: 128000,
      maxOutputTokens: 8192,
      cost: 0.00014,
      costUnit: 'per_1k_tokens',
      supportedLanguages: ['en', 'zh', 'sk', 'cs'],
      capabilities: ['chat', 'completion'],
      inputParameters: { temperature: { min: 0, max: 2, default: 1 } },
      outputParameters: {},
    },
    {
      providerId: 'openrouter',
      modelId: 'meta-llama/llama-3.1-70b-instruct',
      name: 'llama-3.1-70b',
      displayName: 'Llama 3.1 70B',
      apiModelId: 'meta-llama/llama-3.1-70b-instruct',
      description: 'Meta Llama 3.1 70B parameter model',
      contextWindow: 131072,
      maxOutputTokens: 4096,
      cost: 0.00059,
      costUnit: 'per_1k_tokens',
      supportedLanguages: ['en', 'es', 'fr', 'de', 'it'],
      capabilities: ['chat', 'completion'],
      inputParameters: { temperature: { min: 0, max: 2, default: 0.7 } },
      outputParameters: {},
    },
  ];

  // Seed LLM models
  for (const model of openrouterModels) {
    const result = await prisma.llmModel.upsert({
      where: { modelId: model.modelId },
      update: model,
      create: model,
    });
    console.log(`✅ Seeded LLM model: ${result.displayName}`);
  }

  // Seed Gemini Image model
  const geminiImageModel = {
    providerId: 'gemini',
    modelId: 'gemini-3-pro-image',
    name: 'gemini-3-pro-image',
    displayName: 'Gemini 3 Pro Image',
    apiModelId: 'gemini-3-pro-image',
    description: 'Google Gemini for high-quality image generation',
    qualityOptions: ['standard', 'hd'],
    supportedAspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4'],
    supportedResolutions: ['1024x1024', '1920x1080', '1080x1920'],
    maxPromptLength: 2000,
    maxImages: 4,
    credits: 27,
    cost: 0.134,
    costUnit: 'per_image',
    keyFeatures: ['High quality', 'Fast generation', 'Multiple aspect ratios'],
    useCases: ['Characters', 'Scenes', 'Concepts'],
    inputParameters: {
      quality: { type: 'select', options: ['standard', 'hd'], default: 'hd' },
      aspectRatio: { type: 'select', options: ['1:1', '16:9', '9:16'], default: '16:9' },
    },
    outputParameters: { format: 'url', mimeType: 'image/png' },
  };

  await prisma.imageModel.upsert({
    where: { modelId: geminiImageModel.modelId },
    update: geminiImageModel,
    create: geminiImageModel,
  });
  console.log(`✅ Seeded Image model: ${geminiImageModel.displayName}`);

  // Seed ElevenLabs TTS models
  const elevenLabsTtsModel = {
    providerId: 'elevenlabs',
    modelId: 'elevenlabs-multilingual-v2',
    name: 'eleven-multilingual-v2',
    displayName: 'ElevenLabs Multilingual v2',
    apiModelId: 'eleven_multilingual_v2',
    description: 'High-quality multilingual TTS',
    supportedLanguages: ['en', 'de', 'pl', 'es', 'fr', 'it', 'pt', 'hi', 'ar'],
    voiceOptions: {
      voices: [
        { id: 'rachel', name: 'Rachel', gender: 'female' },
        { id: 'josh', name: 'Josh', gender: 'male' },
        { id: 'bella', name: 'Bella', gender: 'female' },
        { id: 'antoni', name: 'Antoni', gender: 'male' },
      ],
    },
    audioQualityOptions: ['mp3_44100_128', 'mp3_44100_192', 'pcm_44100'],
    maxTextLength: 5000,
    credits: 6,
    cost: 0.00015,
    costUnit: 'per_character',
    specialFeatures: ['Voice cloning', 'Emotion control', 'Speaking rate'],
    inputParameters: {
      voice: { type: 'select', required: true },
      model: { type: 'string', default: 'eleven_multilingual_v2' },
      stability: { type: 'number', min: 0, max: 1, default: 0.5 },
      similarity_boost: { type: 'number', min: 0, max: 1, default: 0.5 },
    },
    outputParameters: { format: 'audio/mpeg' },
  };

  await prisma.ttsModel.upsert({
    where: { modelId: elevenLabsTtsModel.modelId },
    update: elevenLabsTtsModel,
    create: elevenLabsTtsModel,
  });
  console.log(`✅ Seeded TTS model: ${elevenLabsTtsModel.displayName}`);

  // Seed Suno Music model
  const sunoMusicModel = {
    providerId: 'suno',
    modelId: 'suno-v3.5',
    name: 'suno-v3.5',
    displayName: 'Suno v3.5',
    apiModelId: 'chirp-v3-5',
    description: 'Latest Suno AI music generation',
    durationOptions: ['30s', '60s', '120s'],
    genreSupport: ['pop', 'rock', 'classical', 'jazz', 'electronic', 'folk', 'hip-hop'],
    instrumentSupport: ['piano', 'guitar', 'drums', 'strings', 'synth'],
    maxDuration: 120,
    credits: 10,
    cost: 0.05,
    costUnit: 'per_generation',
    inputParameters: {
      prompt: { type: 'string', required: true, maxLength: 500 },
      duration: { type: 'select', options: ['30s', '60s', '120s'], default: '30s' },
      instrumental: { type: 'boolean', default: false },
    },
    outputParameters: { format: 'audio/mpeg' },
  };

  await prisma.musicModel.upsert({
    where: { modelId: sunoMusicModel.modelId },
    update: sunoMusicModel,
    create: sunoMusicModel,
  });
  console.log(`✅ Seeded Music model: ${sunoMusicModel.displayName}`);

  console.log('✅ Non-KIE model seeding completed!');
}

async function main() {
  try {
    // Seed providers first
    await seedProviders();

    // Then seed non-KIE models (KIE models are already in DB)
    await seedNonKieModels();

    console.log('✨ All seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });