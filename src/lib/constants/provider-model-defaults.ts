import type { LLMProvider } from '@/types/project';

/**
 * Provider-specific default model IDs
 * Used as fallback when no model is explicitly configured
 */
export const PROVIDER_DEFAULT_MODELS = {
  kie: 'gemini-2.5-flash',
  openrouter: 'anthropic/claude-4.5-sonnet',
  gemini: 'gemini-pro',
  'claude-sdk': 'claude-3-sonnet',
  modal: 'custom',
} as const;

/**
 * Get the default model for a given provider
 * @param provider - The LLM provider
 * @returns The default model ID for the provider, or OpenRouter default as fallback
 */
export function getDefaultModelForProvider(provider: LLMProvider): string {
  return PROVIDER_DEFAULT_MODELS[provider] || PROVIDER_DEFAULT_MODELS.openrouter;
}
