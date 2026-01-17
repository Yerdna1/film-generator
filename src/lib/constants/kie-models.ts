// KIE.ai Model Configurations
// Credit System: 1 credit = $0.005 USD

export interface KieModelConfig {
  id: string;
  name: string;
  description?: string;
  credits: number;  // KIE credits required
  cost: number;     // USD cost ($0.005 × credits)
  modality?: string; // e.g., 'text-to-image', 'image-to-image', 'image-to-video'
  quality?: string;  // e.g., '1k', '2k', '4k', 'standard', 'hd', 'fast', 'quality'
  length?: string;   // e.g., '5s', '10s', '30s' (for video models)
  recommended?: boolean;
  features?: string[];
  limitations?: string[];
}

// Image Generation Models - Complete List with all variants
export const KIE_IMAGE_MODELS: KieModelConfig[] = [
  // Google Nano Banana Pro - Different resolutions
  {
    id: 'google-nano-banana-pro',
    name: 'Google Nano Banana Pro 1K/2K',
    description: 'Google\'s latest image model, 1K or 2K resolution',
    credits: 18,
    cost: 0.09,
    modality: 'text-to-image',
    quality: '1k-2k',
    recommended: true,
  },
  {
    id: 'google-nano-banana-pro-4k',
    name: 'Google Nano Banana Pro 4K',
    description: 'Google\'s latest image model, 4K resolution',
    credits: 24,
    cost: 0.12,
    modality: 'text-to-image',
    quality: '4k',
  },

  // Grok Imagine - Different modalities
  {
    id: 'grok-imagine/text-to-image',
    name: 'Grok Imagine Text to Image',
    description: '4 credits per 6 images',
    credits: 4,
    cost: 0.02,
    modality: 'text-to-image',
  },
  {
    id: 'grok-imagine/image-to-image',
    name: 'Grok Imagine Image to Image',
    description: '4 credits per 2 images',
    credits: 4,
    cost: 0.02,
    modality: 'image-to-image',
  },

  // Google Imagen4 - Different speeds/quality
  {
    id: 'google-imagen4/fast-text-to-image',
    name: 'Google Imagen4 Fast',
    description: 'Fast generation with Google quality',
    credits: 40,
    cost: 0.20,
    modality: 'text-to-image',
    quality: 'fast',
  },
  {
    id: 'google-imagen4/ultra-text-to-image',
    name: 'Google Imagen4 Ultra',
    description: 'Ultra high quality, slower generation',
    credits: 50,
    cost: 0.25,
    modality: 'text-to-image',
    quality: 'ultra',
  },
  {
    id: 'google-imagen4/standard-text-to-image',
    name: 'Google Imagen4 Standard',
    description: 'Standard quality, balanced performance',
    credits: 45,
    cost: 0.225,
    modality: 'text-to-image',
    quality: 'standard',
  },

  // Seedream Models - Different versions
  {
    id: 'seedream/3-0-text-to-image',
    name: 'Seedream v3.0',
    description: 'Basic quality, fastest generation',
    credits: 15,
    cost: 0.075,
    modality: 'text-to-image',
  },
  {
    id: 'seedream/4-0-text-to-image',
    name: 'Seedream v4.0',
    description: 'Improved quality over v3',
    credits: 18,
    cost: 0.09,
    modality: 'text-to-image',
  },
  {
    id: 'seedream/4-5-text-to-image',
    name: 'Seedream v4.5',
    description: 'Best Seedream quality, recommended',
    credits: 20,
    cost: 0.10,
    modality: 'text-to-image',
    recommended: true,
  },

  // Flux-2 Models - Different tiers
  {
    id: 'flux-2/pro-1.1-text-to-image',
    name: 'Flux 2 Pro 1.1',
    description: 'Professional quality, photorealistic',
    credits: 30,
    cost: 0.15,
    modality: 'text-to-image',
    quality: 'pro',
  },
  {
    id: 'flux-2/flex-text-to-image',
    name: 'Flux 2 Flex',
    description: 'Flexible styles, creative outputs',
    credits: 25,
    cost: 0.125,
    modality: 'text-to-image',
    quality: 'flex',
  },
  {
    id: 'flux-2/dev-text-to-image',
    name: 'Flux 2 Dev',
    description: 'Development version, experimental',
    credits: 20,
    cost: 0.10,
    modality: 'text-to-image',
    quality: 'dev',
  },

  // Z-Image Models
  {
    id: 'z-image/3-0-text-to-image',
    name: 'Z-image v3.0',
    description: 'Alternative model, good quality',
    credits: 22,
    cost: 0.11,
    modality: 'text-to-image',
  },
  {
    id: 'z-image/2-0-text-to-image',
    name: 'Z-image v2.0',
    description: 'Legacy version',
    credits: 18,
    cost: 0.09,
    modality: 'text-to-image',
  },

  // GPT Image
  {
    id: 'gpt-image/1-5-text-to-image',
    name: 'GPT Image 1.5',
    description: 'OpenAI-style image generation',
    credits: 35,
    cost: 0.175,
    modality: 'text-to-image',
  },

  // Qwen Models
  {
    id: 'qwen/wanx-text-to-image',
    name: 'Qwen WanX',
    description: 'Chinese-optimized model',
    credits: 20,
    cost: 0.10,
    modality: 'text-to-image',
  },
  {
    id: 'qwen/qr-text-to-image',
    name: 'Qwen QR',
    description: 'QR code generation specialist',
    credits: 25,
    cost: 0.125,
    modality: 'text-to-image',
  },

  // Ideogram - Different speeds
  {
    id: 'ideogram/v2-text-to-image',
    name: 'Ideogram v2',
    description: 'Excellent text rendering in images',
    credits: 50,
    cost: 0.25,
    modality: 'text-to-image',
    quality: 'standard',
  },
  {
    id: 'ideogram/v2-turbo-text-to-image',
    name: 'Ideogram v2 Turbo',
    description: 'Faster text rendering',
    credits: 40,
    cost: 0.20,
    modality: 'text-to-image',
    quality: 'turbo',
  },

  // Recraft
  {
    id: 'recraft/v3-text-to-image',
    name: 'Recraft v3',
    description: 'Vector-style graphics specialist',
    credits: 40,
    cost: 0.20,
    modality: 'text-to-image',
  },

  // Topaz
  {
    id: 'topaz/v1-text-to-image',
    name: 'Topaz v1',
    description: 'Premium quality, highest detail',
    credits: 60,
    cost: 0.30,
    modality: 'text-to-image',
  },

  // Stable Diffusion variants
  {
    id: 'stable-diffusion/3-5-text-to-image',
    name: 'Stable Diffusion 3.5',
    description: 'Latest SD model',
    credits: 25,
    cost: 0.125,
    modality: 'text-to-image',
  },
  {
    id: 'stable-diffusion/xl-text-to-image',
    name: 'SDXL',
    description: 'Stable Diffusion XL',
    credits: 20,
    cost: 0.10,
    modality: 'text-to-image',
  },

  // MidJourney style
  {
    id: 'mj-style/v6-text-to-image',
    name: 'MJ Style v6',
    description: 'MidJourney-style artistic images',
    credits: 35,
    cost: 0.175,
    modality: 'text-to-image',
  },

  // Anime/Manga specialists
  {
    id: 'anime/niji-v6-text-to-image',
    name: 'Niji v6',
    description: 'Anime/manga style specialist',
    credits: 25,
    cost: 0.125,
    modality: 'text-to-image',
  },
];

// Video Generation Models - Complete List with all variants
export const KIE_VIDEO_MODELS: KieModelConfig[] = [
  // Grok Imagine
  {
    id: 'grok-imagine/image-to-video',
    name: 'Grok Imagine',
    description: 'Fast, cost-effective video generation',
    credits: 40,
    cost: 0.20,
    modality: 'image-to-video',
    recommended: true,
  },

  // Kling Models - Different versions and quality
  {
    id: 'kling/v2-1-image-to-video',
    name: 'Kling v2.1',
    description: 'Early version, basic quality',
    credits: 50,
    cost: 0.25,
    modality: 'image-to-video',
  },
  {
    id: 'kling/v2-2-image-to-video',
    name: 'Kling v2.2',
    description: 'Improved motion',
    credits: 55,
    cost: 0.275,
    modality: 'image-to-video',
  },
  {
    id: 'kling/v2-3-image-to-video',
    name: 'Kling v2.3',
    description: 'Better stability',
    credits: 60,
    cost: 0.30,
    modality: 'image-to-video',
  },
  {
    id: 'kling/v2-4-image-to-video',
    name: 'Kling v2.4',
    description: 'Enhanced quality',
    credits: 65,
    cost: 0.325,
    modality: 'image-to-video',
  },
  {
    id: 'kling/v2-5-image-to-video',
    name: 'Kling v2.5',
    description: 'Professional quality',
    credits: 70,
    cost: 0.35,
    modality: 'image-to-video',
  },
  {
    id: 'kling/v2-6-image-to-video',
    name: 'Kling v2.6',
    description: 'Latest version, best quality',
    credits: 75,
    cost: 0.375,
    modality: 'image-to-video',
    recommended: true,
  },

  // Bytedance Seedance
  {
    id: 'bytedance/seedance-image-to-video',
    name: 'Bytedance Seedance',
    description: 'TikTok technology, smooth motion',
    credits: 80,
    cost: 0.40,
    modality: 'image-to-video',
  },

  // Hailuo
  {
    id: 'hailuo/ai-image-to-video',
    name: 'Hailuo AI',
    description: 'Advanced motion synthesis',
    credits: 60,
    cost: 0.30,
    modality: 'image-to-video',
  },

  // Sora2 - Different lengths
  {
    id: 'sora2/5s-image-to-video',
    name: 'Sora2 5 seconds',
    description: 'OpenAI-style, 5 second videos',
    credits: 100,
    cost: 0.50,
    modality: 'image-to-video',
    length: '5s',
  },
  {
    id: 'sora2/10s-image-to-video',
    name: 'Sora2 10 seconds',
    description: 'OpenAI-style, 10 second videos',
    credits: 180,
    cost: 0.90,
    modality: 'image-to-video',
    length: '10s',
  },

  // Wan
  {
    id: 'wan/ai-image-to-video',
    name: 'Wan AI',
    description: 'Alternative video model',
    credits: 50,
    cost: 0.25,
    modality: 'image-to-video',
  },

  // Topaz Video
  {
    id: 'topaz/video-image-to-video',
    name: 'Topaz Video',
    description: 'Premium quality video generation',
    credits: 120,
    cost: 0.60,
    modality: 'image-to-video',
  },

  // Infinitalk
  {
    id: 'infinitalk/ai-image-to-video',
    name: 'Infinitalk AI',
    description: 'Talking head specialist',
    credits: 90,
    cost: 0.45,
    modality: 'image-to-video',
  },

  // Veo 3.1 - Different quality levels
  {
    id: 'veo/3-1-fast-image-to-video',
    name: 'Veo 3.1 Fast',
    description: 'Google DeepMind, fast generation',
    credits: 80,
    cost: 0.40,
    modality: 'image-to-video',
    quality: 'fast',
  },
  {
    id: 'veo/3-1-quality-image-to-video',
    name: 'Veo 3.1 Quality',
    description: 'Google DeepMind, best quality',
    credits: 400,
    cost: 2.00,
    modality: 'image-to-video',
    quality: 'quality',
  },
];

// TTS/Audio Models - Complete List
export const KIE_TTS_MODELS: KieModelConfig[] = [
  // ElevenLabs models
  {
    id: 'elevenlabs/text-to-dialogue-v3',
    name: 'ElevenLabs Dialogue v3',
    description: 'Natural dialogue generation',
    credits: 10,
    cost: 0.05,
    recommended: true,
  },
  {
    id: 'elevenlabs/text-to-speech-turbo-2-5',
    name: 'ElevenLabs TTS Turbo 2.5',
    description: 'Fast, high-quality speech',
    credits: 8,
    cost: 0.04,
  },
  {
    id: 'elevenlabs/text-to-speech-multilingual-v2',
    name: 'ElevenLabs Multilingual v2',
    description: 'Multi-language support',
    credits: 12,
    cost: 0.06,
  },
  {
    id: 'elevenlabs/sound-effect-v2',
    name: 'ElevenLabs Sound Effects v2',
    description: 'Generate sound effects from text',
    credits: 15,
    cost: 0.075,
  },
  {
    id: 'elevenlabs/speech-to-text',
    name: 'ElevenLabs Speech to Text',
    description: 'Transcribe audio to text',
    credits: 5,
    cost: 0.025,
  },
  {
    id: 'elevenlabs/audio-isolation',
    name: 'ElevenLabs Audio Isolation',
    description: 'Remove background noise',
    credits: 10,
    cost: 0.05,
  },
];

// Music Generation Models - Complete List
export const KIE_MUSIC_MODELS: KieModelConfig[] = [
  // Suno models - Different versions and quality
  {
    id: 'suno/v3-5-music',
    name: 'Suno v3.5',
    description: 'Latest Suno model, best quality',
    credits: 100,
    cost: 0.50,
    recommended: true,
  },
  {
    id: 'suno/v3-music',
    name: 'Suno v3',
    description: 'Previous version, good quality',
    credits: 80,
    cost: 0.40,
  },
  {
    id: 'suno/v2-music',
    name: 'Suno v2',
    description: 'Legacy version, basic quality',
    credits: 60,
    cost: 0.30,
  },

  // Udio models
  {
    id: 'udio/v1-5-music',
    name: 'Udio v1.5',
    description: 'Alternative music model',
    credits: 90,
    cost: 0.45,
  },
  {
    id: 'udio/v1-music',
    name: 'Udio v1',
    description: 'Basic Udio model',
    credits: 70,
    cost: 0.35,
  },
];

// Helper functions
export function getKieModelById(modelId: string, type: 'image' | 'video' | 'tts' | 'music'): KieModelConfig | undefined {
  const models = type === 'image' ? KIE_IMAGE_MODELS :
                 type === 'video' ? KIE_VIDEO_MODELS :
                 type === 'tts' ? KIE_TTS_MODELS :
                 KIE_MUSIC_MODELS;

  return models.find(m => m.id === modelId);
}

export function formatKiePrice(credits: number): string {
  const usd = credits * 0.005;
  return `${credits} credits ($${usd.toFixed(2)})`;
}

export function getKieModelCost(modelId: string, type: 'image' | 'video' | 'tts' | 'music'): number {
  const model = getKieModelById(modelId, type);
  return model?.cost || 0;
}

// Get models by quality or modality
export function getKieModelsByQuality(type: 'image' | 'video', quality: string): KieModelConfig[] {
  const models = type === 'image' ? KIE_IMAGE_MODELS : KIE_VIDEO_MODELS;
  return models.filter(m => m.quality === quality);
}

export function getKieModelsByModality(type: 'image' | 'video', modality: string): KieModelConfig[] {
  const models = type === 'image' ? KIE_IMAGE_MODELS : KIE_VIDEO_MODELS;
  return models.filter(m => m.modality === modality);
}