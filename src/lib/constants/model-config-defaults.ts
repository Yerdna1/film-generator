import type { UnifiedModelConfig } from '@/types/project';
import { DEFAULT_MODELS } from './default-models';

/**
 * Default model configuration for new projects
 * This is the SINGLE SOURCE OF TRUTH for defaults
 *
 * All new projects will be initialized with these values.
 * Project-specific configurations are stored in project.modelConfig.
 */
export const DEFAULT_MODEL_CONFIG: UnifiedModelConfig = {
  llm: {
    provider: 'kie',
    model: DEFAULT_MODELS.kieLlmModel, // 'gemini-2.5-flash'
  },
  image: {
    provider: 'kie',
    model: DEFAULT_MODELS.kieImageModel, // 'seedream/4-5-text-to-image'
    characterAspectRatio: '1:1',
    sceneAspectRatio: '16:9',
    sceneResolution: '2k',
  },
  video: {
    provider: 'kie',
    model: DEFAULT_MODELS.kieVideoModel, // 'grok-imagine/image-to-video'
    resolution: 'hd',
  },
  tts: {
    provider: 'kie',
    model: DEFAULT_MODELS.kieTtsModel, // 'elevenlabs/text-to-dialogue-v3'
    defaultLanguage: 'en',
  },
  music: {
    provider: 'kie',
    model: DEFAULT_MODELS.kieMusicModel, // 'suno/v3-5-music'
  },
};

/**
 * Helper function to get default config with optional overrides
 * Useful for creating custom configurations while keeping defaults as fallback
 *
 * @param overrides - Partial config to override defaults
 * @returns Complete UnifiedModelConfig with defaults applied
 */
export function getDefaultModelConfig(overrides?: Partial<UnifiedModelConfig>): UnifiedModelConfig {
  if (!overrides) {
    return DEFAULT_MODEL_CONFIG;
  }

  return {
    ...DEFAULT_MODEL_CONFIG,
    ...overrides,
    llm: { ...DEFAULT_MODEL_CONFIG.llm, ...overrides.llm, model: overrides.llm?.model || DEFAULT_MODEL_CONFIG.llm.model },
    image: { ...DEFAULT_MODEL_CONFIG.image, ...overrides.image },
    video: { ...DEFAULT_MODEL_CONFIG.video, ...overrides.video },
    tts: { ...DEFAULT_MODEL_CONFIG.tts, ...overrides.tts },
    music: { ...DEFAULT_MODEL_CONFIG.music, ...overrides.music },
  };
}
