import type { UnifiedModelConfig } from '@/types/project';

// Default configurations
export const DEFAULT_CONFIG: UnifiedModelConfig = {
  llm: {
    provider: 'openrouter',
    model: 'google/gemini-2.0-flash-exp:free',
  },
  image: {
    provider: 'kie', // Changed to kie for free users
    characterAspectRatio: '1:1',
    sceneAspectRatio: '16:9',
    sceneResolution: '2k',
  },
  video: {
    provider: 'kie',
    resolution: 'hd',
  },
  tts: {
    provider: 'kie', // Changed to kie for free users
    defaultLanguage: 'en',
  },
  music: {
    provider: 'kie', // Changed to kie for free users
  },
};

// Available models
export const LLM_MODELS = {
  openrouter: [
    { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash (Free)', badge: 'FREE' },
    { id: 'openai/gpt-4-turbo', name: 'GPT-4 Turbo', badge: 'PREMIUM' },
    { id: 'anthropic/claude-sonnet-4.5', name: 'Claude Sonnet 4.5', badge: 'PREMIUM' },
    { id: 'google/gemini-3-pro', name: 'Gemini 3 Pro', badge: 'PREMIUM' },
  ],
  'claude-sdk': [
    { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', badge: 'LOCAL' },
  ],
  modal: [
    { id: 'custom', name: 'Custom Modal Endpoint', badge: 'SELF-HOSTED' },
  ],
  gemini: [
    { id: 'gemini-pro', name: 'Gemini Pro', badge: 'FREE' },
  ],
};

export const IMAGE_MODELS: Record<string, { id: string; name: string; badge: string }[]> = {
  gemini: [
    { id: 'imagen-3', name: 'Imagen 3', badge: 'FREE' },
  ],
  modal: [
    { id: 'qwen-vl', name: 'Qwen-VL', badge: 'SELF-HOSTED' },
  ],
  'modal-edit': [
    { id: 'custom-edit', name: 'Custom Modal Edit Endpoint', badge: 'SELF-HOSTED' },
  ],
  kie: [], // KIE models now loaded from database via useImageModels hook
};

export const VIDEO_MODELS = {
  kie: [
    { id: 'grok-imagine/image-to-video', name: 'Grok Imagine', badge: 'DEFAULT' },
    { id: 'hailuo/02-image-to-video-standard', name: 'Hailuo 02 Standard', badge: 'STANDARD' },
    { id: 'wan/2-6-image-to-video', name: 'Wan 2.6', badge: 'POPULAR' },
    { id: 'kling/v2-6-image-to-video', name: 'Kling v2.6', badge: 'RECOMMENDED' },
    { id: 'sora2/10s-image-to-video', name: 'Sora 2 (10s)', badge: 'PREMIUM' },
  ],
  modal: [
    { id: 'custom', name: 'Custom Modal Endpoint', badge: 'SELF-HOSTED' },
  ],
};

export const TTS_MODELS = {
  'gemini-tts': [
    { id: 'gemini-tts-default', name: 'Gemini TTS', badge: 'FREE' },
  ],
  elevenlabs: [
    { id: 'eleven_multilingual_v2', name: 'ElevenLabs Multilingual V2', badge: 'PREMIUM' },
  ],
  'openai-tts': [
    { id: 'tts-1', name: 'OpenAI TTS-1', badge: 'STANDARD' },
    { id: 'tts-1-hd', name: 'OpenAI TTS-1 HD', badge: 'HD' },
  ],
  kie: [
    { id: 'elevenlabs/text-to-dialogue-v3', name: 'Text to Dialogue V3', badge: 'PREMIUM' },
  ],
  modal: [
    { id: 'custom', name: 'Custom Modal Endpoint', badge: 'SELF-HOSTED' },
  ],
};

export const MUSIC_MODELS = {
  piapi: [
    { id: 'suno-v3.5', name: 'Suno V3.5', badge: 'DEFAULT' },
  ],
  suno: [
    { id: 'chirp-v3-5', name: 'Chirp V3.5', badge: 'DIRECT' },
  ],
  kie: [
    { id: 'suno/v3-5-music', name: 'Suno V3.5 Music', badge: 'KIE' },
  ],
  modal: [
    { id: 'custom', name: 'Custom Modal Endpoint', badge: 'SELF-HOSTED' },
  ],
};

export const VIDEO_RESOLUTIONS = [
  { value: 'hd', label: 'HD (720p)' },
  { value: '4k', label: '4K (2160p)' },
];

export const IMAGE_RESOLUTIONS = [
  { value: '1k', label: '1K' },
  { value: '2k', label: '2K' },
  { value: '4k', label: '4K' },
];

export const ASPECT_RATIOS = [
  { value: '1:1', label: '1:1 (Square)' },
  { value: '16:9', label: '16:9 (Landscape)' },
  { value: '9:16', label: '9:16 (Portrait)' },
  { value: '4:3', label: '4:3 (Standard)' },
  { value: '3:4', label: '3:4' },
  { value: '21:9', label: '21:9 (Ultrawide)' },
];

// Video-specific parameters for KIE models
export const VIDEO_DURATIONS = [
  { value: '5s', label: '5 seconds' },
  { value: '10s', label: '10 seconds' },
  { value: '15s', label: '15 seconds' },
  { value: '30s', label: '30 seconds' },
];

export const KIE_VIDEO_RESOLUTIONS = [
  { value: '720p', label: '720p (HD)' },
  { value: '768P', label: '768P (Hailuo Standard)' },
  { value: '1080p', label: '1080p (Full HD)' },
  { value: '4K', label: '4K (Ultra HD)' },
];

export const VIDEO_ASPECT_RATIOS = [
  { value: '16:9', label: '16:9 (Landscape)' },
  { value: '9:16', label: '9:16 (Portrait)' },
  { value: '1:1', label: '1:1 (Square)' },
  { value: '4:3', label: '4:3 (Standard)' },
  { value: '3:4', label: '3:4' },
];
