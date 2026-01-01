/**
 * Pricing Service - Fetches action costs from database
 *
 * This service loads pricing from the ActionCost table in the database,
 * with fallback to hardcoded defaults if DB is unavailable.
 */

import { prisma } from '@/lib/db/prisma';

export type ActionType = 'image' | 'video' | 'voiceover' | 'scene' | 'character' | 'prompt' | 'music';
export type Provider =
  | 'gemini' | 'gemini-flash' | 'gemini-tts'
  | 'modal' | 'modal-edit'
  | 'elevenlabs'
  | 'grok' | 'kie'
  | 'claude' | 'claude-sdk'
  | 'openrouter'
  | 'suno' | 'piapi'
  | 'nanoBanana';

export interface ActionCostRecord {
  actionType: string;
  provider: string;
  cost: number;
  description: string | null;
  validFrom: Date;
  validTo: Date | null;
}

// Default costs (fallback if DB is unavailable)
// These should match the initial seed values
const DEFAULT_COSTS: Record<string, Record<string, number>> = {
  image: {
    gemini: 0.24,          // Gemini 3 Pro - $0.24 per image
    'gemini-flash': 0.039, // Gemini Flash - $0.039 per image
    modal: 0.09,           // Modal Qwen - $0.09 per image
    'modal-edit': 0.09,    // Modal Qwen-Edit - $0.09 per image
    nanoBanana: 0.24,      // Same as Gemini 3 Pro
  },
  video: {
    grok: 0.10,            // Grok video - $0.10 per clip
    kie: 0.10,             // Kie.ai - $0.10 per clip
    modal: 0.15,           // Modal Hallo3 - $0.15 per clip
  },
  voiceover: {
    elevenlabs: 0.03,      // ElevenLabs - $0.03 per line
    'gemini-tts': 0.002,   // Gemini TTS - $0.002 per line
    modal: 0.01,           // Modal Chatterbox - $0.01 per line
  },
  scene: {
    gemini: 0.001,         // Gemini scene gen - $0.001 per scene
    claude: 0.01,          // Claude - $0.01 per scene
    grok: 0.003,           // Grok - $0.003 per scene
    modal: 0.002,          // Modal LLM - $0.002 per scene
    openrouter: 0.01,      // OpenRouter - $0.01 per scene
  },
  character: {
    gemini: 0.0005,        // Gemini character - $0.0005 per char
    claude: 0.008,         // Claude - $0.008 per char
  },
  prompt: {
    gemini: 0.001,         // Gemini prompt - $0.001 per prompt
    claude: 0.012,         // Claude - $0.012 per prompt
  },
  music: {
    suno: 0.05,            // Suno - $0.05 per track
    piapi: 0.05,           // PiAPI - $0.05 per track
    modal: 0.03,           // Modal ACE-Step - $0.03 per track
  },
};

// In-memory cache for pricing (refreshed periodically)
let pricingCache: Map<string, number> | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Generate cache key for action+provider combo
 */
function getCacheKey(actionType: string, provider: string): string {
  return `${actionType}:${provider}`;
}

/**
 * Load all active pricing from database
 */
export async function loadPricingFromDB(): Promise<Map<string, number>> {
  const now = new Date();

  const costs = await prisma.actionCost.findMany({
    where: {
      isActive: true,
      validFrom: { lte: now },
      OR: [
        { validTo: null },
        { validTo: { gte: now } },
      ],
    },
  });

  const priceMap = new Map<string, number>();

  for (const cost of costs) {
    const key = getCacheKey(cost.actionType, cost.provider);
    priceMap.set(key, cost.cost);
  }

  return priceMap;
}

/**
 * Get pricing with caching
 */
async function getPricingCache(): Promise<Map<string, number>> {
  const now = Date.now();

  if (pricingCache && (now - cacheTimestamp) < CACHE_TTL_MS) {
    return pricingCache;
  }

  try {
    pricingCache = await loadPricingFromDB();
    cacheTimestamp = now;
    return pricingCache;
  } catch (error) {
    console.warn('Failed to load pricing from DB, using defaults:', error);
    // Return empty map to use defaults
    return new Map();
  }
}

/**
 * Get cost for a specific action and provider
 * Falls back to default if not in DB
 */
export async function getActionCostFromDB(
  actionType: ActionType,
  provider: Provider
): Promise<number> {
  const cache = await getPricingCache();
  const key = getCacheKey(actionType, provider);

  if (cache.has(key)) {
    return cache.get(key)!;
  }

  // Fallback to defaults
  return DEFAULT_COSTS[actionType]?.[provider] ?? 0;
}

/**
 * Get cost synchronously (uses cache or defaults)
 * Use this in contexts where async isn't possible
 */
export function getActionCostSync(
  actionType: ActionType,
  provider: Provider
): number {
  if (pricingCache) {
    const key = getCacheKey(actionType, provider);
    if (pricingCache.has(key)) {
      return pricingCache.get(key)!;
    }
  }

  // Fallback to defaults
  return DEFAULT_COSTS[actionType]?.[provider] ?? 0;
}

/**
 * Invalidate the pricing cache
 */
export function invalidatePricingCache(): void {
  pricingCache = null;
  cacheTimestamp = 0;
}

/**
 * Get all pricing as a structured object (for API responses)
 */
export async function getAllPricing(): Promise<Record<string, Record<string, number>>> {
  const cache = await getPricingCache();
  const result: Record<string, Record<string, number>> = {};

  // Start with defaults
  for (const [actionType, providers] of Object.entries(DEFAULT_COSTS)) {
    result[actionType] = { ...providers };
  }

  // Override with DB values
  for (const [key, cost] of cache.entries()) {
    const [actionType, provider] = key.split(':');
    if (!result[actionType]) {
      result[actionType] = {};
    }
    result[actionType][provider] = cost;
  }

  return result;
}

/**
 * Update or create a pricing entry in the database
 */
export async function upsertActionCost(
  actionType: string,
  provider: string,
  cost: number,
  description?: string,
  validFrom?: Date,
  validTo?: Date | null
): Promise<ActionCostRecord> {
  const record = await prisma.actionCost.upsert({
    where: {
      actionType_provider: { actionType, provider },
    },
    update: {
      cost,
      description,
      validFrom: validFrom ?? new Date(),
      validTo,
      updatedAt: new Date(),
    },
    create: {
      actionType,
      provider,
      cost,
      description,
      validFrom: validFrom ?? new Date(),
      validTo,
    },
  });

  // Invalidate cache after update
  invalidatePricingCache();

  return record;
}

/**
 * Seed initial pricing data
 */
export async function seedPricingData(): Promise<void> {
  const now = new Date();

  const pricingData: Array<{
    actionType: string;
    provider: string;
    cost: number;
    description: string;
  }> = [
    // Image providers
    { actionType: 'image', provider: 'gemini', cost: 0.24, description: 'Gemini 3 Pro Image Generation' },
    { actionType: 'image', provider: 'gemini-flash', cost: 0.039, description: 'Gemini Flash Image (up to 1024px)' },
    { actionType: 'image', provider: 'modal', cost: 0.09, description: 'Modal Qwen-VL Image Generation (H100)' },
    { actionType: 'image', provider: 'modal-edit', cost: 0.09, description: 'Modal Qwen-Image-Edit-2511 (H100)' },
    { actionType: 'image', provider: 'nanoBanana', cost: 0.24, description: 'Nano Banana Pro (Gemini 3 Pro)' },

    // Video providers
    { actionType: 'video', provider: 'grok', cost: 0.10, description: 'Grok Video Generation (6s clip)' },
    { actionType: 'video', provider: 'kie', cost: 0.10, description: 'Kie.ai Video Generation (6s clip)' },
    { actionType: 'video', provider: 'modal', cost: 0.15, description: 'Modal Hallo3 Portrait Video (H100)' },

    // Voiceover providers
    { actionType: 'voiceover', provider: 'elevenlabs', cost: 0.03, description: 'ElevenLabs TTS (per line ~100 chars)' },
    { actionType: 'voiceover', provider: 'gemini-tts', cost: 0.002, description: 'Gemini TTS (per line)' },
    { actionType: 'voiceover', provider: 'modal', cost: 0.01, description: 'Modal Chatterbox TTS (per line)' },

    // Scene generation
    { actionType: 'scene', provider: 'gemini', cost: 0.001, description: 'Gemini Scene Generation' },
    { actionType: 'scene', provider: 'claude', cost: 0.01, description: 'Claude Scene Generation' },
    { actionType: 'scene', provider: 'grok', cost: 0.003, description: 'Grok Scene Generation' },
    { actionType: 'scene', provider: 'modal', cost: 0.002, description: 'Modal LLM Scene Generation' },
    { actionType: 'scene', provider: 'openrouter', cost: 0.01, description: 'OpenRouter LLM Scene Generation' },

    // Character generation
    { actionType: 'character', provider: 'gemini', cost: 0.0005, description: 'Gemini Character Description' },
    { actionType: 'character', provider: 'claude', cost: 0.008, description: 'Claude Character Description' },

    // Prompt generation
    { actionType: 'prompt', provider: 'gemini', cost: 0.001, description: 'Gemini Master Prompt' },
    { actionType: 'prompt', provider: 'claude', cost: 0.012, description: 'Claude Master Prompt' },

    // Music generation
    { actionType: 'music', provider: 'suno', cost: 0.05, description: 'Suno AI Music Track' },
    { actionType: 'music', provider: 'piapi', cost: 0.05, description: 'PiAPI Music Track (Suno/Udio)' },
    { actionType: 'music', provider: 'modal', cost: 0.03, description: 'Modal ACE-Step Music' },
  ];

  for (const item of pricingData) {
    await prisma.actionCost.upsert({
      where: {
        actionType_provider: {
          actionType: item.actionType,
          provider: item.provider
        },
      },
      update: {
        cost: item.cost,
        description: item.description,
        updatedAt: new Date(),
      },
      create: {
        ...item,
        validFrom: now,
        validTo: null,
        isActive: true,
      },
    });
  }

  // Invalidate cache after seeding
  invalidatePricingCache();
}
