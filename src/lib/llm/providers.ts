/**
 * LLM Provider Metadata Registry
 *
 * Central registry of all LLM providers and their metadata.
 * Used by the toast wrapper to display consistent provider information.
 */

/**
 * Provider metadata interface
 */
export interface ProviderMetadata {
  id: string;
  displayName: string;
  category: 'llm' | 'image' | 'video' | 'audio' | 'music' | 'tts';
  website?: string;
  defaultModel?: string;
}

/**
 * All LLM providers used in the application
 */
export const LLM_PROVIDERS: Record<string, ProviderMetadata> = {
  // LLM Providers
  openrouter: {
    id: 'openrouter',
    displayName: 'OpenRouter',
    category: 'llm',
    website: 'https://openrouter.ai',
    defaultModel: 'anthropic/claude-4.5-sonnet',
  },
  'claude-sdk': {
    id: 'claude-sdk',
    displayName: 'Claude SDK',
    category: 'llm',
    website: 'https://anthropic.com',
    defaultModel: 'claude-sonnet-4.5',
  },
  gemini: {
    id: 'gemini',
    displayName: 'Gemini',
    category: 'llm',
    website: 'https://ai.google.dev',
    defaultModel: 'gemini-2.0-flash',
  },
  modal: {
    id: 'modal',
    displayName: 'Modal',
    category: 'llm',
    defaultModel: 'llm',
  },

  // Image Providers
  'gemini-image': {
    id: 'gemini-image',
    displayName: 'Gemini',
    category: 'image',
    website: 'https://ai.google.dev',
    defaultModel: 'gemini-3-pro-image-preview',
  },
  'modal-image': {
    id: 'modal-image',
    displayName: 'Modal',
    category: 'image',
    defaultModel: 'image',
  },
  kie: {
    id: 'kie',
    displayName: 'Kie.ai',
    category: 'image',
    website: 'https://kie.ai',
    defaultModel: 'seedream/4-5-text-to-image',
  },
  grok: {
    id: 'grok',
    displayName: 'Grok',
    category: 'image',
    website: 'https://x.ai',
    defaultModel: 'grok-imagine',
  },

  // Video Providers
  'kie-video': {
    id: 'kie-video',
    displayName: 'Kie.ai',
    category: 'video',
    website: 'https://kie.ai',
    defaultModel: 'grok-imagine/image-to-video',
  },
  'modal-video': {
    id: 'modal-video',
    displayName: 'Modal',
    category: 'video',
    defaultModel: 'video',
  },

  // TTS Providers
  'gemini-tts': {
    id: 'gemini-tts',
    displayName: 'Gemini TTS',
    category: 'tts',
    website: 'https://ai.google.dev',
    defaultModel: 'gemini-2.0-flash',
  },
  elevenlabs: {
    id: 'elevenlabs',
    displayName: 'ElevenLabs',
    category: 'tts',
    website: 'https://elevenlabs.io',
    defaultModel: 'eleven_multilingual_v2',
  },
  'openai-tts': {
    id: 'openai-tts',
    displayName: 'OpenAI TTS',
    category: 'tts',
    website: 'https://openai.com',
    defaultModel: 'tts-1',
  },

  // Music Providers
  suno: {
    id: 'suno',
    displayName: 'Suno',
    category: 'music',
    website: 'https://suno.ai',
    defaultModel: 'v3.5',
  },
  piapi: {
    id: 'piapi',
    displayName: 'PiAPI',
    category: 'music',
    website: 'https://piapi.co',
    defaultModel: 'suno-v3.5',
  },
};

/**
 * Model metadata for specific models
 */
export interface ModelMetadata {
  id: string;
  displayName: string;
  provider: string;
  category: 'llm' | 'image' | 'video' | 'audio' | 'music' | 'tts';
  context?: number; // Context window for LLMs
}

/**
 * Common model metadata
 */
export const MODEL_METADATA: Record<string, ModelMetadata> = {
  // Claude Models
  'anthropic/claude-4.5-sonnet': {
    id: 'anthropic/claude-4.5-sonnet',
    displayName: 'Claude 4.5 Sonnet',
    provider: 'openrouter',
    category: 'llm',
    context: 200000,
  },
  'claude-sonnet-4.5': {
    id: 'claude-sonnet-4.5',
    displayName: 'Claude Sonnet 4.5',
    provider: 'claude-sdk',
    category: 'llm',
    context: 200000,
  },

  // Gemini Models
  'gemini-2.0-flash': {
    id: 'gemini-2.0-flash',
    displayName: 'Gemini 2.0 Flash',
    provider: 'gemini',
    category: 'llm',
    context: 1000000,
  },
  'gemini-3-pro-image-preview': {
    id: 'gemini-3-pro-image-preview',
    displayName: 'Gemini 3 Pro Image',
    provider: 'gemini-image',
    category: 'image',
  },

  // GPT Models
  'openai/gpt-4o': {
    id: 'openai/gpt-4o',
    displayName: 'GPT-4o',
    provider: 'openrouter',
    category: 'llm',
    context: 128000,
  },

  // Kie.ai Models
  'seedream/4-5-text-to-image': {
    id: 'seedream/4-5-text-to-image',
    displayName: 'Seedream 4.5',
    provider: 'kie',
    category: 'image',
  },
  'grok-imagine/image-to-video': {
    id: 'grok-imagine/image-to-video',
    displayName: 'Grok Imagine Video',
    provider: 'kie-video',
    category: 'video',
  },

  // ElevenLabs Models
  'eleven_multilingual_v2': {
    id: 'eleven_multilingual_v2',
    displayName: 'EleLabs Multilingual v2',
    provider: 'elevenlabs',
    category: 'tts',
  },
};

/**
 * Get provider metadata by ID
 */
export function getProviderMetadata(providerId: string): ProviderMetadata | undefined {
  return LLM_PROVIDERS[providerId];
}

/**
 * Get model metadata by ID
 */
export function getModelMetadata(modelId: string): ModelMetadata | undefined {
  return MODEL_METADATA[modelId];
}

/**
 * Get all providers for a specific category
 */
export function getProvidersByCategory(category: ProviderMetadata['category']): ProviderMetadata[] {
  return Object.values(LLM_PROVIDERS).filter(p => p.category === category);
}

/**
 * Validate if a provider ID exists
 */
export function isValidProvider(providerId: string): boolean {
  return providerId in LLM_PROVIDERS;
}

/**
 * Get the default model for a provider
 */
export function getDefaultModel(providerId: string): string | undefined {
  return LLM_PROVIDERS[providerId]?.defaultModel;
}
