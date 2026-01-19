import type { LLMConfig } from './types';

// Maximum scenes per LLM call to avoid token limits
export const SCENES_PER_BATCH = 30;

// Story model to LLM provider mapping
export function getStoryModelMapping(
  storyModel: string,
  hasOpenRouterKey: boolean
): Record<string, LLMConfig> {
  const baseMapping: Record<string, LLMConfig> = {
    'gpt-4': { provider: 'openrouter', model: 'openai/gpt-4o' },
    'claude-sonnet-4.5': { provider: 'openrouter', model: 'anthropic/claude-3.5-sonnet' },
    'gemini-3-pro': hasOpenRouterKey
      ? { provider: 'openrouter', model: 'google/gemma-3-27b-it:free' }
      : { provider: 'gemini', model: 'gemini-3-pro' },
  };

  return baseMapping;
}

// Supported free OpenRouter models
export const SUPPORTED_FREE_OPENROUTER_MODELS = [
  'google/gemma-3-27b-it:free',
  'meta-llama/llama-3.1-8b-instruct:free',
  'meta-llama/llama-3.2-3b-instruct:free',
  'mistralai/mistral-7b-instruct:free',
  'qwen/qwen-2-7b-instruct:free',
] as const;

// Style mapping for visual styles
export const STYLE_MAPPING: Record<string, string> = {
  'disney-pixar': 'high-quality Disney/Pixar 3D animation style',
  'realistic': 'photorealistic cinematic style with real people',
  'anime': 'high-quality Japanese anime style',
  'custom': 'custom artistic style',
};

// System prompt for LLM
export const SYSTEM_PROMPT = 'You are a professional film director and screenwriter specializing in animated short films. Generate detailed scene breakdowns in the exact JSON format requested. Return ONLY valid JSON, no markdown code blocks or explanations.';

// Default story model
export const DEFAULT_STORY_MODEL = 'claude-sonnet-4.5';
