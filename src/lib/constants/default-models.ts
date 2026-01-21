/**
 * Default AI Model Configurations
 *
 * This is the single source of truth for default model values across the application.
 * All other files should import from here to avoid inconsistencies.
 */

export const DEFAULT_MODELS: Record<string, string> = {
  // LLM / Scene Generation
  kieLlmModel: 'gemini-2.5-flash',

  // Image Generation (cheapest option)
  kieImageModel: 'grok-imagine/text-to-image',

  // Video Generation
  kieVideoModel: 'bytedance/seedance-image-to-video',

  // Text-to-Speech
  kieTtsModel: 'elevenlabs/text-to-speech-turbo-2-5',

  // Music Generation
  kieMusicModel: 'suno/v3-music',
} as const;
