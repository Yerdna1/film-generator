// KIE.ai Model Configurations
// Credit System: 1 credit = $0.005 USD

export interface KieModelConfig {
  id: string;
  name: string;
  description?: string;
  credits: number;  // KIE credits required
  cost: number;     // USD cost ($0.005 × credits)
  recommended?: boolean;
  features?: string[];
  limitations?: string[];
}

// Image Generation Models
export const KIE_IMAGE_MODELS: KieModelConfig[] = [
  {
    id: 'seedream/3-text-to-image',
    name: 'Seedream v3.0',
    description: 'Fast generation, good quality',
    credits: 16,
    cost: 0.08, // 16 × $0.005
  },
  {
    id: 'seedream/4-text-to-image',
    name: 'Seedream v4.0',
    description: 'Balanced quality and speed',
    credits: 20,
    cost: 0.10, // 20 × $0.005
  },
  {
    id: 'seedream/4-5-text-to-image',
    name: 'Seedream v4.5',
    description: 'Best quality, recommended for scenes',
    credits: 24,
    cost: 0.12, // 24 × $0.005
    recommended: true,
  },
  {
    id: 'flux-2/dev',
    name: 'Flux 2 Dev',
    description: 'Artistic style, creative outputs',
    credits: 20,
    cost: 0.10,
  },
  {
    id: 'flux-2/pro',
    name: 'Flux 2 Pro',
    description: 'Professional quality, detailed',
    credits: 30,
    cost: 0.15,
  },
  {
    id: 'google-imagen/4-fast',
    name: 'Google Imagen4 Fast',
    description: 'Quick generation, decent quality',
    credits: 14,
    cost: 0.07,
  },
  {
    id: 'google-imagen/4-standard',
    name: 'Google Imagen4 Standard',
    description: 'Balanced performance',
    credits: 20,
    cost: 0.10,
  },
  {
    id: 'google-imagen/4-ultra',
    name: 'Google Imagen4 Ultra',
    description: 'Highest quality from Google',
    credits: 32,
    cost: 0.16,
  },
  {
    id: 'z-image/text-to-image',
    name: 'Z-Image',
    description: 'Alternative style, unique results',
    credits: 18,
    cost: 0.09,
  },
  {
    id: 'gpt-image/1-5',
    name: 'GPT Image 1.5',
    description: 'OpenAI-style generation',
    credits: 22,
    cost: 0.11,
  },
  {
    id: 'qwen/text-to-image',
    name: 'Qwen',
    description: 'Chinese model, good for Asian aesthetics',
    credits: 16,
    cost: 0.08,
  },
  {
    id: 'ideogram/text-to-image',
    name: 'Ideogram',
    description: 'Excellent text rendering in images',
    credits: 26,
    cost: 0.13,
    features: ['Text rendering', 'Typography'],
  },
  {
    id: 'recraft/text-to-image',
    name: 'Recraft',
    description: 'Vector-style illustrations',
    credits: 20,
    cost: 0.10,
    features: ['Vector art', 'Illustrations'],
  },
  {
    id: 'topaz/text-to-image',
    name: 'Topaz',
    description: 'High-resolution outputs',
    credits: 28,
    cost: 0.14,
    features: ['High resolution', '4K support'],
  },
];

// Video Generation Models
export const KIE_VIDEO_MODELS: KieModelConfig[] = [
  {
    id: 'grok-imagine/image-to-video',
    name: 'Grok Imagine',
    description: 'Default, 6-second clips',
    credits: 20,
    cost: 0.10, // 20 × $0.005
    recommended: true,
    features: ['6 seconds', 'Auto motion'],
    limitations: ['Fixed duration', 'No audio control'],
  },
  {
    id: 'kling/v2-1',
    name: 'Kling v2.1',
    description: 'Basic motion generation',
    credits: 30,
    cost: 0.15,
  },
  {
    id: 'kling/v2-3',
    name: 'Kling v2.3',
    description: 'Improved motion quality',
    credits: 36,
    cost: 0.18,
  },
  {
    id: 'kling/v2-6',
    name: 'Kling v2.6',
    description: 'Latest version, best quality',
    credits: 40,
    cost: 0.20,
    features: ['High quality', 'Smooth motion'],
  },
  {
    id: 'bytedance/seedance',
    name: 'Bytedance Seedance',
    description: 'Optimized for human motion',
    credits: 44,
    cost: 0.22,
    features: ['Human motion', 'Dance sequences'],
  },
  {
    id: 'hailuo/video',
    name: 'Hailuo',
    description: 'Cinematic quality',
    credits: 50,
    cost: 0.25,
    features: ['Cinematic', 'Professional'],
  },
  {
    id: 'sora/v2',
    name: 'Sora 2',
    description: 'OpenAI-style video generation',
    credits: 60,
    cost: 0.30,
    features: ['Long clips', 'Complex scenes'],
  },
  {
    id: 'wan/video',
    name: 'Wan',
    description: 'Fast video generation',
    credits: 24,
    cost: 0.12,
    features: ['Quick generation'],
  },
  {
    id: 'topaz/video',
    name: 'Topaz Video',
    description: 'High-resolution video',
    credits: 48,
    cost: 0.24,
    features: ['4K support'],
  },
  {
    id: 'infinitalk/video',
    name: 'Infinitalk',
    description: 'Talking head generation',
    credits: 36,
    cost: 0.18,
    features: ['Lip sync', 'Facial animation'],
  },
  {
    id: 'veo/3-1-fast',
    name: 'Veo 3.1 Fast',
    description: 'Quick video generation',
    credits: 80,
    cost: 0.40, // As per documentation
    features: ['Fast processing'],
  },
  {
    id: 'veo/3-1-quality',
    name: 'Veo 3.1 Quality',
    description: 'Premium quality video',
    credits: 400,
    cost: 2.00, // As per documentation
    features: ['Highest quality', 'Professional grade'],
  },
];

// Audio/TTS Models (via ElevenLabs)
export const KIE_TTS_MODELS: KieModelConfig[] = [
  {
    id: 'elevenlabs/text-to-dialogue-v3',
    name: 'ElevenLabs Dialogue v3',
    description: 'Natural multi-speaker conversations',
    credits: 3, // Per 100 characters
    cost: 0.015, // 3 × $0.005 per 100 chars
    recommended: true,
    features: ['Multiple voices', 'Natural dialogue'],
  },
  {
    id: 'elevenlabs/text-to-speech-turbo-2-5',
    name: 'ElevenLabs Turbo 2.5',
    description: 'Fast TTS generation',
    credits: 2, // Per 100 characters
    cost: 0.01,
    features: ['Fast generation', 'Good quality'],
  },
  {
    id: 'elevenlabs/text-to-speech-multilingual-v2',
    name: 'ElevenLabs Multilingual v2',
    description: 'Support for multiple languages',
    credits: 4, // Per 100 characters
    cost: 0.02,
    features: ['29+ languages', 'Accent preservation'],
  },
  {
    id: 'elevenlabs/sound-effect-v2',
    name: 'Sound Effects v2',
    description: 'Generate sound effects from text',
    credits: 10, // Per effect
    cost: 0.05,
    features: ['SFX generation', 'Ambient sounds'],
  },
];

// Helper function to format KIE pricing for display
export function formatKiePrice(credits: number): string {
  const usd = credits * 0.005;
  return `${credits} credits ($${usd.toFixed(2)})`;
}

// Helper function to get model by ID
export function getKieModelById(modelId: string, type: 'image' | 'video' | 'tts'): KieModelConfig | undefined {
  const models = type === 'image' ? KIE_IMAGE_MODELS :
                 type === 'video' ? KIE_VIDEO_MODELS :
                 KIE_TTS_MODELS;
  return models.find(m => m.id === modelId);
}

// Get default model for each type
export const DEFAULT_KIE_MODELS = {
  image: 'seedream/4-5-text-to-image',
  video: 'grok-imagine/image-to-video',
  tts: 'elevenlabs/text-to-dialogue-v3',
};