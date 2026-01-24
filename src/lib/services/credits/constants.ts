/**
 * Cost constants and helpers for the credits service
 */

import { getActionCost, type Provider, type ActionType } from '../real-costs';

// Cost configuration (in credits)
// Based on real API costs: 1 credit ≈ $0.005 (video baseline: 20 credits = $0.10)
export const COSTS = {
  // Image generation by resolution
  IMAGE_GENERATION: 27,      // Default (2K) - for backward compatibility
  IMAGE_GENERATION_1K: 27,   // 1K image ($0.134) - same as 2K
  IMAGE_GENERATION_2K: 27,   // 2K image ($0.134)
  IMAGE_GENERATION_4K: 48,   // 4K image ($0.24)
  // Other operations
  VIDEO_GENERATION: 20,      // Per 6s video ($0.10)
  VOICEOVER_LINE: 6,         // Per dialogue line - ElevenLabs ($0.03)
  SCENE_GENERATION: 2,       // Per scene - Claude ($0.01)
  CHARACTER_GENERATION: 2,   // Per character - Claude ($0.008)
  MUSIC_GENERATION: 10,      // Per music track - Suno ($0.05)
  // Video composition (VectCutAPI)
  VIDEO_COMPOSITION_BASE: 5,    // Per scene for composition ($0.03)
  VIDEO_COMPOSITION_MUSIC: 2,   // Music overlay ($0.02)
  VIDEO_COMPOSITION_CAPTION: 1, // Per 10 captions ($0.01)
  TRANSITION_SUGGESTION: 1,     // AI transition suggestions ($0.01)
} as const;

// Map credit types to action types for real cost calculation
export const TYPE_TO_ACTION: Record<string, ActionType> = {
  image: 'image',
  video: 'video',
  voiceover: 'voiceover',
  scene: 'scene',
  character: 'character',
  prompt: 'prompt',
} as const;

/**
 * Helper to get image credit cost by resolution and provider
 * Uses getActionCost for provider-specific pricing from DB or fallback
 */
export function getImageCreditCost(
  aspectRatio: string = '16:9',
  resolution: '1k' | '2k' | '4k' = '2k',
  provider: string = 'gemini'
): number {
  // Map provider to real-costs Provider type
  const providerMap: Record<string, Provider> = {
    'gemini': 'gemini',
    'nanoBanana': 'gemini',
    'modal': 'modal',
    'modal-edit': 'modal-edit',
    'kie': 'kie',
  };

  const mappedProvider = providerMap[provider] || 'gemini';
  const cost = getActionCost('image', mappedProvider);

  // Apply resolution multiplier if applicable
  // Some providers charge more for higher resolutions
  if (resolution === '4k' && (provider === 'gemini' || provider === 'nanoBanana')) {
    return Math.ceil(cost * 1.5); // 4K is 1.5x the base cost for Gemini
  }

  return Math.ceil(cost); // Round up to nearest credit
}

/**
 * Get cost for an operation type
 */
export function getCost(
  costType: keyof typeof COSTS,
  quantity: number = 1
): number {
  return COSTS[costType] * quantity;
}
