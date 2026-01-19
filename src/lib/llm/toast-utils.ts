/**
 * Toast Utility Functions for LLM Wrapper
 *
 * Helper functions for formatting durations, provider names, and model names
 * for toast notifications.
 */

/**
 * Format a duration in milliseconds to a human-readable string
 *
 * @param ms - Duration in milliseconds
 * @returns Formatted duration string (e.g., "2.3s", "450ms")
 *
 * @example
 * ```typescript
 * formatDuration(2300); // "2.3s"
 * formatDuration(450);  // "450ms"
 * formatDuration(1500); // "1.5s"
 * ```
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${(ms / 1000).toFixed(1)}s`;
}

/**
 * Get the display name for an LLM provider
 *
 * Converts internal provider identifiers to human-readable names
 *
 * @param provider - Internal provider identifier
 * @returns Human-readable provider name
 *
 * @example
 * ```typescript
 * getProviderDisplayName('openrouter');  // "OpenRouter"
 * getProviderDisplayName('gemini');      // "Gemini"
 * getProviderDisplayName('claude-sdk');  // "Claude SDK"
 * ```
 */
export function getProviderDisplayName(provider: string): string {
  const providerNames: Record<string, string> = {
    // LLM Providers
    'openrouter': 'OpenRouter',
    'gemini': 'Gemini',
    'claude-sdk': 'Claude SDK',
    'modal': 'Modal',
    'openai': 'OpenAI',

    // Image Providers
    'kie': 'Kie.ai',
    'grok': 'Grok',

    // TTS Providers
    'elevenlabs': 'ElevenLabs',
    'gemini-tts': 'Gemini TTS',

    // Music Providers
    'suno': 'Suno',
    'piapi': 'PiAPI',

    // Video Providers
    'modal-video': 'Modal Video',
    'modal-video-endpoint': 'Modal',
  };

  return providerNames[provider] || provider.charAt(0).toUpperCase() + provider.slice(1);
}

/**
 * Get the display name for an LLM model
 *
 * Converts internal model identifiers to human-readable names
 *
 * @param model - Internal model identifier
 * @returns Human-readable model name
 *
 * @example
 * ```typescript
 * getModelDisplayName('anthropic/claude-4.5-sonnet');  // "Claude 4.5 Sonnet"
 * getModelDisplayName('gemini-2.0-flash-exp');         // "Gemini 2.0 Flash"
 * getModelDisplayName('gpt-4o');                       // "GPT-4o"
 * ```
 */
export function getModelDisplayName(model: string): string {
  // OpenRouter model mappings
  const openRouterModels: Record<string, string> = {
    'anthropic/claude-4.5-sonnet': 'Claude 4.5 Sonnet',
    'anthropic/claude-4.5-sonnet-20250514': 'Claude 4.5 Sonnet',
    'anthropic/claude-3.5-sonnet': 'Claude 3.5 Sonnet',
    'anthropic/claude-3-sonnet-20240229': 'Claude 3 Sonnet',
    'anthropic/claude-3-opus-20240229': 'Claude 3 Opus',
    'anthropic/claude-3-haiku-20240307': 'Claude 3 Haiku',
    'openai/gpt-4o': 'GPT-4o',
    'openai/gpt-4-turbo': 'GPT-4 Turbo',
    'openai/gpt-3.5-turbo': 'GPT-3.5 Turbo',
  };

  if (openRouterModels[model]) {
    return openRouterModels[model];
  }

  // Gemini models
  if (model.startsWith('gemini-')) {
    return model.replace('gemini-', 'Gemini ').replace('-', ' ');
  }

  // Kie.ai models
  if (model.includes('seedream')) {
    return model.replace('seedream/', 'Seedream ');
  }
  if (model.includes('grok-imagine')) {
    return model.replace('grok-imagine/', 'Grok Imagine ');
  }
  if (model.includes('elevenlabs')) {
    return model.replace('elevenlabs/', 'ElevenLabs ');
  }
  if (model.includes('suno/')) {
    return model.replace('suno/', 'Suno ');
  }

  // Claude SDK models
  const claudeModels: Record<string, string> = {
    'claude-sonnet-4.5': 'Claude Sonnet 4.5',
    'claude-sonnet-4': 'Claude Sonnet 4',
    'claude-opus-4': 'Claude Opus 4',
  };

  if (claudeModels[model]) {
    return claudeModels[model];
  }

  // Default: return model as-is, but capitalize first letter
  return model.charAt(0).toUpperCase() + model.slice(1);
}

/**
 * Extract provider and model information from various sources
 *
 * This is a helper function that can extract provider/model info
 * from different data structures used throughout the codebase.
 *
 * @param data - Data object that might contain provider/model info
 * @returns Object with provider and model, or null if not found
 */
export function extractProviderModel(data: any): { provider: string; model: string } | null {
  if (!data || typeof data !== 'object') {
    return null;
  }

  // Try different field names that might be used
  const provider =
    data.provider ??
    data.llmProvider ??
    data.videoProvider ??
    data.imageProvider ??
    data.audioProvider ??
    data.ttsProvider ??
    data.musicProvider ??
    null;

  const model =
    data.model ??
    data.llmModel ??
    data.videoModel ??
    data.imageModel ??
    data.audioModel ??
    data.ttsModel ??
    data.musicModel ??
    null;

  if (provider && model) {
    return { provider, model };
  }

  return null;
}

/**
 * Create a consistent toast description from provider and model
 *
 * @param provider - Provider identifier or display name
 * @param model - Model identifier or display name
 * @param duration - Optional duration in milliseconds
 * @returns Formatted toast description
 */
export function createToastDescription(
  provider: string,
  model: string,
  duration?: number
): string {
  const providerDisplay = getProviderDisplayName(provider);
  const modelDisplay = getModelDisplayName(model);
  let description = `${providerDisplay} ${modelDisplay}`;

  if (duration !== undefined) {
    description += ` • ${formatDuration(duration)}`;
  }

  return description;
}
