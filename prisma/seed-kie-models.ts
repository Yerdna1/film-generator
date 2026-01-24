import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting KIE.ai models seed...');

  // Clear existing data
  await prisma.kieVideoModel.deleteMany();
  await prisma.kieImageModel.deleteMany();
  await prisma.kieTtsModel.deleteMany();
  await prisma.kieMusicModel.deleteMany();
  await prisma.kieLlmModel.deleteMany();

  console.log('Cleared existing KIE model data');

  // ============================================================
  // VIDEO MODELS (based on KIE.ai documentation research)
  // ============================================================

  // Grok Imagine - 20 credits per 6s video ($0.10)
  await prisma.kieVideoModel.create({
    data: {
      modelId: 'grok-imagine/image-to-video',
      name: 'Grok Imagine',
      provider: 'xAI',
      description: 'Fast, cost-effective video generation (20 credits per 6s video)',
      modality: ['image-to-video'],
      credits: 20,
      cost: 0.10,
      supportedResolutions: ['720p', '1080p'],
      supportedDurations: ['5s', '10s'],
      supportedAspectRatios: ['16:9', '9:16', '1:1', '4:3', '3:4'],
      defaultResolution: '720p',
      defaultDuration: '5s',
      defaultAspectRatio: '16:9',
      pricing: {
        '720p-5s': 17,
        '720p-10s': 33,
        '1080p-5s': 25,
      },
      resolutionDurationConstraints: {
        '720p': ['5s', '10s'],
        '1080p': ['5s'],
      },
      keyFeatures: [],
      inputParameters: {},
      outputParameters: {},
    },
  });

  // Kling v2.6 - 55 credits per 5s (no audio)
  await prisma.kieVideoModel.create({
    data: {
      modelId: 'kling/v2-6-image-to-video',
      name: 'Kling v2.6',
      provider: 'Kwai AI',
      description: 'Latest version, best quality with native audio support',
      modality: ['image-to-video'],
      credits: 55,
      cost: 0.28,
      supportedResolutions: ['720p', '1080p'],
      supportedDurations: ['5s', '10s'],
      supportedAspectRatios: ['16:9', '9:16', '1:1'],
      defaultResolution: '720p',
      defaultDuration: '5s',
      defaultAspectRatio: '16:9',
      pricing: {
        '720p-5s': 55,
        '720p-10s': 110,
        '1080p-5s': 70,
        '1080p-10s': 140,
      },
      keyFeatures: [],
      inputParameters: {},
      outputParameters: {},
    },
  });

  // Bytedance Seedance 1.0 Pro Fast
  await prisma.kieVideoModel.create({
    data: {
      modelId: 'bytedance/seedance-image-to-video',
      name: 'Bytedance Seedance',
      provider: 'ByteDance',
      description: 'TikTok technology, smooth motion generation',
      modality: ['image-to-video'],
      credits: 16,
      cost: 0.08,
      quality: 'fast',
      supportedResolutions: ['720p', '1080p'],
      supportedDurations: ['5s', '10s'],
      defaultResolution: '720p',
      defaultDuration: '5s',
      defaultAspectRatio: '16:9',
      pricing: {
        '720p-5s': 16,
        '720p-10s': 36,
        '1080p-5s': 36,
        '1080p-10s': 72,
      },
      keyFeatures: [],
      inputParameters: {},
      outputParameters: {},
    },
  });

  // Hailuo 02 Standard - 9.5 credits per second
  await prisma.kieVideoModel.create({
    data: {
      modelId: 'hailuo/02-image-to-video-standard',
      name: 'Hailuo 02 Standard',
      provider: 'MiniMax',
      description: '768P resolution, faster processing (9.5 credits/second)',
      modality: ['image-to-video'],
      credits: 48,
      cost: 0.24,
      quality: 'standard',
      supportedResolutions: ['768P'],
      supportedDurations: ['5s', '10s'],
      defaultResolution: '768P',
      defaultDuration: '5s',
      defaultAspectRatio: '16:9',
      pricing: {
        '768P-5s': 48,
        '768P-10s': 95,
      },
      keyFeatures: [],
      inputParameters: {},
      outputParameters: {},
    },
  });

  // Hailuo 02 Pro
  await prisma.kieVideoModel.create({
    data: {
      modelId: 'hailuo/02-image-to-video-pro',
      name: 'Hailuo 02 Pro',
      provider: 'MiniMax',
      description: '1080P resolution, cinematic quality (9.5 credits/second)',
      modality: ['image-to-video'],
      credits: 48,
      cost: 0.24,
      quality: 'pro',
      supportedResolutions: ['1080p'],
      supportedDurations: ['5s', '10s'],
      defaultResolution: '1080p',
      defaultDuration: '5s',
      defaultAspectRatio: '16:9',
      pricing: {
        '1080p-5s': 48,
        '1080p-10s': 95,
      },
      keyFeatures: [],
      inputParameters: {},
      outputParameters: {},
    },
  });

  // Sora2 5 seconds
  await prisma.kieVideoModel.create({
    data: {
      modelId: 'sora2/5s-image-to-video',
      name: 'Sora2 5 seconds',
      provider: 'OpenAI',
      description: 'OpenAI-style, 5 second videos (150 credits per 10s)',
      modality: ['image-to-video'],
      credits: 75,
      cost: 0.38,
      length: '5s',
      supportedResolutions: ['720p', '1080p'],
      supportedDurations: ['5s'],
      defaultResolution: '1080p',
      defaultDuration: '5s',
      defaultAspectRatio: '16:9',
      pricing: {
        '720p-5s': 75,
        '1080p-5s': 100,
      },
      keyFeatures: [],
      inputParameters: {},
      outputParameters: {},
    },
  });

  // Sora2 10 seconds
  await prisma.kieVideoModel.create({
    data: {
      modelId: 'sora2/10s-image-to-video',
      name: 'Sora2 10 seconds',
      provider: 'OpenAI',
      description: 'OpenAI-style, 10 second videos (150 credits per 10s)',
      modality: ['image-to-video'],
      credits: 150,
      cost: 0.75,
      length: '10s',
      supportedResolutions: ['720p', '1080p'],
      supportedDurations: ['10s'],
      defaultResolution: '720p',
      defaultDuration: '10s',
      defaultAspectRatio: '16:9',
      pricing: {
        '720p-10s': 150,
        '1080p-10s': 200,
      },
      keyFeatures: [],
      inputParameters: {},
      outputParameters: {},
    },
  });

  // Wan 2.6
  await prisma.kieVideoModel.create({
    data: {
      modelId: 'wan/2-6-image-to-video',
      name: 'Wan 2.6',
      provider: 'Alibaba',
      description: 'Multi-shot HD video with audio support',
      modality: ['image-to-video'],
      credits: 70,
      cost: 0.35,
      supportedResolutions: ['720p', '1080p'],
      supportedDurations: ['5s', '10s', '15s'],
      supportedAspectRatios: ['16:9', '9:16', '1:1'],
      defaultResolution: '1080p',
      defaultDuration: '5s',
      defaultAspectRatio: '16:9',
      pricing: {
        '720p-5s': 70,
        '720p-10s': 140,
        '720p-15s': 210,
        '1080p-5s': 105,
        '1080p-10s': 210,
        '1080p-15s': 315,
      },
      keyFeatures: [],
      inputParameters: {},
      outputParameters: {},
    },
  });

  // Topaz Video - 12 credits per second
  await prisma.kieVideoModel.create({
    data: {
      modelId: 'topaz/video-image-to-video',
      name: 'Topaz Video',
      provider: 'Topaz Labs',
      description: 'Premium quality video generation (12 credits/second)',
      modality: ['image-to-video'],
      credits: 60,
      cost: 0.30,
      supportedResolutions: ['720p', '1080p', '4K'],
      supportedDurations: ['5s', '10s'],
      defaultResolution: '1080p',
      defaultDuration: '5s',
      defaultAspectRatio: '16:9',
      pricing: {
        '720p-5s': 60,
        '720p-10s': 120,
        '1080p-5s': 80,
        '1080p-10s': 160,
        '4K-5s': 100,
        '4K-10s': 200,
      },
      keyFeatures: [],
      inputParameters: {},
      outputParameters: {},
    },
  });

  // Veo 3.1 Fast - 60 credits for 8s
  await prisma.kieVideoModel.create({
    data: {
      modelId: 'veo/3-1-fast-image-to-video',
      name: 'Veo 3.1 Fast',
      provider: 'Google DeepMind',
      description: 'Google DeepMind, fast generation (60 credits per 8s)',
      modality: ['image-to-video', 'text-to-video'],
      credits: 38,
      cost: 0.19,
      quality: 'fast',
      supportedResolutions: ['720p'],
      supportedDurations: ['5s', '10s'],
      defaultResolution: '720p',
      defaultDuration: '5s',
      defaultAspectRatio: '16:9',
      pricing: {
        '720p-5s': 38,
        '720p-10s': 75,
      },
      keyFeatures: [],
      inputParameters: {},
      outputParameters: {},
    },
  });

  // Veo 3.1 Quality - 250 credits for 8s
  await prisma.kieVideoModel.create({
    data: {
      modelId: 'veo/3-1-quality-image-to-video',
      name: 'Veo 3.1 Quality',
      provider: 'Google DeepMind',
      description: 'Google DeepMind, best quality (250 credits per 8s)',
      modality: ['image-to-video', 'text-to-video'],
      credits: 156,
      cost: 0.78,
      quality: 'quality',
      supportedResolutions: ['1080p'],
      supportedDurations: ['5s', '10s'],
      defaultResolution: '1080p',
      defaultDuration: '5s',
      defaultAspectRatio: '16:9',
      pricing: {
        '1080p-5s': 156,
        '1080p-10s': 313,
      },
      keyFeatures: [],
      inputParameters: {},
      outputParameters: {},
    },
  });

  console.log(`✅ Seeded ${await prisma.kieVideoModel.count()} video models`);

  // ============================================================
  // IMAGE MODELS (based on KIE.ai documentation)
  // ============================================================

  // Google Nano Banana Pro 1K/2K
  await prisma.kieImageModel.create({
    data: {
      modelId: 'google-nano-banana-pro',
      name: 'Google Nano Banana Pro 1K/2K',
      provider: 'Google',
      baseModel: 'Gemini 3 Pro Image',
      description: "Google's latest image model, 1K or 2K resolution (18 credits)",
      modality: ['text-to-image', 'image-to-image'],
      credits: 18,
      cost: 0.09,
      qualityOptions: ['1K', '2K'],
      supportedAspectRatios: ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9', 'auto'],
      maxPromptLength: 64000,
      maxImages: 8,
      keyFeatures: [],
      inputParameters: {},
      outputParameters: {},
    },
  });

  // Google Nano Banana Pro 4K
  await prisma.kieImageModel.create({
    data: {
      modelId: 'google-nano-banana-pro-4k',
      name: 'Google Nano Banana Pro 4K',
      provider: 'Google',
      baseModel: 'Gemini 3 Pro Image',
      description: "Google's latest image model, 4K resolution (24 credits)",
      modality: ['text-to-image', 'image-to-image'],
      credits: 24,
      cost: 0.12,
      qualityOptions: ['4K'],
      supportedAspectRatios: ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9', 'auto'],
      maxPromptLength: 64000,
      maxImages: 8,
      keyFeatures: [],
      inputParameters: {},
      outputParameters: {},
    },
  });

  // Seedream 4.5
  await prisma.kieImageModel.create({
    data: {
      modelId: 'seedream/4-5-text-to-image',
      apiModelId: 'seedream-4.5/2k',
      name: 'Seedream v4.5',
      provider: 'ByteDance',
      description: 'Best Seedream quality, recommended (20 credits)',
      modality: ['text-to-image'],
      credits: 20,
      cost: 0.10,
      qualityOptions: ['2K', '4K'],
      speedVariants: ['basic', 'high'],
      supportedAspectRatios: ['1:1', '4:3', '3:4', '16:9', '9:16', '2:3', '3:2', '21:9'],
      keyFeatures: [],
      inputParameters: {},
      outputParameters: {},
    },
  });

  // Grok Imagine Text to Image
  await prisma.kieImageModel.create({
    data: {
      modelId: 'grok-imagine/text-to-image',
      name: 'Grok Imagine Text to Image',
      provider: 'xAI',
      description: '4 credits per 6 images',
      modality: ['text-to-image'],
      credits: 4,
      cost: 0.02,
      supportedAspectRatios: ['1:1', '9:16', '16:9', '3:4', '4:3', '3:2', '2:3', '21:9', 'auto'],
      keyFeatures: [],
      inputParameters: {},
      outputParameters: {},
    },
  });

  // Google Imagen4 Fast
  await prisma.kieImageModel.create({
    data: {
      modelId: 'google-imagen4/fast-text-to-image',
      name: 'Google Imagen4 Fast',
      provider: 'Google',
      description: 'Fast generation with Google quality (40 credits)',
      modality: ['text-to-image'],
      credits: 40,
      cost: 0.20,
      speedVariants: ['fast'],
      keyFeatures: [],
      inputParameters: {},
      outputParameters: {},
    },
  });

  // Google Imagen4 Ultra
  await prisma.kieImageModel.create({
    data: {
      modelId: 'google-imagen4/ultra-text-to-image',
      name: 'Google Imagen4 Ultra',
      provider: 'Google',
      description: 'Ultra high quality, slower generation (50 credits)',
      modality: ['text-to-image'],
      credits: 50,
      cost: 0.25,
      speedVariants: ['ultra'],
      keyFeatures: [],
      inputParameters: {},
      outputParameters: {},
    },
  });

  // Google Imagen4 Standard
  await prisma.kieImageModel.create({
    data: {
      modelId: 'google-imagen4/standard-text-to-image',
      name: 'Google Imagen4 Standard',
      provider: 'Google',
      description: 'Standard quality, balanced performance (45 credits)',
      modality: ['text-to-image'],
      credits: 45,
      cost: 0.225,
      speedVariants: ['standard'],
      keyFeatures: [],
      inputParameters: {},
      outputParameters: {},
    },
  });

  console.log(`✅ Seeded ${await prisma.kieImageModel.count()} image models`);

  // ============================================================
  // TTS MODELS (ElevenLabs via KIE.ai)
  // ============================================================

  // ElevenLabs Text to Dialogue V3
  await prisma.kieTtsModel.create({
    data: {
      modelId: 'elevenlabs/text-to-dialogue-v3',
      name: 'ElevenLabs Dialogue v3',
      provider: 'ElevenLabs',
      description: 'Multi-speaker dialogue text-to-speech generation',
      credits: 14,
      cost: 0.07,
      costUnit: 'per_request',
      supportedLanguages: 29,
      languageList: [
        'Arabic', 'Bulgarian', 'Chinese (Mandarin)', 'Croatian', 'Czech', 'Danish', 'Dutch',
        'English (USA, UK, Australia, Canada)', 'Filipino', 'Finnish', 'French (France, Canada)',
        'German', 'Hindi', 'Italian', 'Japanese', 'Korean', 'Portuguese', 'Russian', 'Spanish', 'Swedish', 'Tamil',
      ],
      voiceOptions: ['Adam', 'Brian', 'Roger', 'multi-speaker support'],
      maxTextLength: 5000,
      specialFeatures: ['Multi-speaker dialogue generation', 'Expressive synthesis'],
      audioQualityOptions: {
        mp3_formats: ["mp3_44100_128", "mp3_44100_192"],
        pcm_formats: ["pcm_16000", "pcm_22050", "pcm_44100"],
      },
      inputParameters: {
        dialogue: 'array of text and voice assignments',
        stability: '0-1 range, default 0.5',
      },
    },
  });

  // ElevenLabs TTS Turbo 2.5
  await prisma.kieTtsModel.create({
    data: {
      modelId: 'elevenlabs/text-to-speech-turbo-2-5',
      name: 'ElevenLabs TTS Turbo 2.5',
      provider: 'ElevenLabs',
      description: 'High-speed text-to-speech optimized for low-latency real-time applications',
      credits: 12,
      cost: 0.03,
      costUnit: 'per_1000_chars',
      supportedLanguages: 32,
      voiceOptions: [
        'Rachel', 'Aria', 'Roger', 'Sarah', 'Laura', 'Charlie', 'George', 'Callum', 'River',
        'Liam', 'Charlotte', 'Alice', 'Matilda', 'Will', 'Jessica', 'Eric', 'Chris', 'Brian', 'Daniel', 'Lily', 'Bill',
      ],
      maxTextLength: 5000,
      specialFeatures: ['32 languages', '3× faster than Multilingual v2', 'Low latency', 'Real-time optimization'],
      audioQualityOptions: {
        mp3_formats: ['mp3_22050_32', 'mp3_44100_128', 'mp3_44100_192'],
        pcm_formats: ['pcm_8000', 'pcm_16000', 'pcm_22050', 'pcm_24000', 'pcm_44100'],
        sample_rates: '8kHz - 44.1kHz',
        bitrates: '32kbps - 192kbps',
      },
      inputParameters: {
        text: 'max 5000 characters',
        voice: 'voice_id',
        stability: '0-1 range',
        similarity_boost: '0-1 range',
        style: '0-1 range',
        speed: '0.7-1.2 range',
      },
    },
  });

  // ElevenLabs Multilingual V2
  await prisma.kieTtsModel.create({
    data: {
      modelId: 'elevenlabs/text-to-speech-multilingual-v2',
      name: 'ElevenLabs Multilingual v2',
      provider: 'ElevenLabs',
      description: 'State-of-the-art multilingual text-to-speech supporting 29 languages',
      credits: 14,
      cost: 0.07,
      costUnit: 'per_1000_chars',
      supportedLanguages: 29,
      languageList: [
        'Arabic', 'Bulgarian', 'Chinese (Mandarin)', 'Croatian', 'Czech', 'Danish', 'Dutch',
        'English (USA, UK, Australia, Canada)', 'Filipino', 'Finnish', 'French (France, Canada)',
        'German', 'Hindi', 'Italian', 'Japanese', 'Korean', 'Portuguese', 'Russian', 'Spanish', 'Swedish', 'Tamil',
      ],
      voiceOptions: [
        'Rachel', 'Aria', 'Roger', 'Sarah', 'Laura', 'Charlie', 'George', 'Callum', 'River',
        'Liam', 'Charlotte', 'Alice', 'Matilda', 'Will', 'Jessica', 'Eric', 'Chris', 'Brian', 'Daniel', 'Lily', 'Bill',
      ],
      maxTextLength: 5000,
      specialFeatures: ['29 languages', 'High quality synthesis', 'Expressive speech'],
      audioQualityOptions: {
        mp3_formats: ['mp3_22050_32', 'mp3_44100_128', 'mp3_44100_192'],
        pcm_formats: ['pcm_8000', 'pcm_16000', 'pcm_22050', 'pcm_24000', 'pcm_44100'],
      },
      inputParameters: {},
    },
  });

  console.log(`✅ Seeded ${await prisma.kieTtsModel.count()} TTS models`);

  // ============================================================
  // MUSIC MODELS (Suno/Udio via KIE.ai)
  // ============================================================

  // Suno v3.5
  await prisma.kieMusicModel.create({
    data: {
      modelId: 'suno/v3-5-music',
      name: 'Suno v3.5',
      provider: 'Suno',
      description: 'Latest Suno model, best quality',
      credits: 100,
      cost: 0.50,
      modality: ['text-to-music'],
      durationOptions: ['30s', '60s', '120s'],
      genreSupport: ['Pop', 'Rock', 'Classical', 'Jazz', 'Electronic', 'Hip-Hop', 'Country', 'R&B', 'Latin', 'Metal'],
    },
  });

  // Suno v3
  await prisma.kieMusicModel.create({
    data: {
      modelId: 'suno/v3-music',
      name: 'Suno v3',
      provider: 'Suno',
      description: 'Previous version, good quality',
      credits: 80,
      cost: 0.40,
      modality: ['text-to-music'],
      durationOptions: ['30s', '60s'],
      genreSupport: ['Pop', 'Rock', 'Classical', 'Jazz', 'Electronic', 'Hip-Hop'],
    },
  });

  // Udio v1.5
  await prisma.kieMusicModel.create({
    data: {
      modelId: 'udio/v1-5-music',
      name: 'Udio v1.5',
      provider: 'Udio',
      description: 'Alternative music model',
      credits: 90,
      cost: 0.45,
      modality: ['text-to-music'],
      durationOptions: ['30s', '60s', '120s'],
      genreSupport: ['Pop', 'Rock', 'Classical', 'Jazz', 'Electronic', 'Hip-Hop', 'Country'],
    },
  });

  console.log(`✅ Seeded ${await prisma.kieMusicModel.count()} music models`);

  // ============================================================
  // SUMMARY
  // ============================================================

  const videoCount = await prisma.kieVideoModel.count();
  const imageCount = await prisma.kieImageModel.count();
  const ttsCount = await prisma.kieTtsModel.count();
  const musicCount = await prisma.kieMusicModel.count();

  console.log('\n========================================');
  console.log('KIE.ai Models Seeding Complete!');
  console.log('========================================');
  console.log(`Video Models:  ${videoCount}`);
  console.log(`Image Models:  ${imageCount}`);
  console.log(`TTS Models:    ${ttsCount}`);
  console.log(`Music Models:  ${musicCount}`);
  console.log(`Total:         ${videoCount + imageCount + ttsCount + musicCount}`);
  console.log('========================================\n');
}

main()
  .catch((e) => {
    console.error('Error seeding KIE models:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
