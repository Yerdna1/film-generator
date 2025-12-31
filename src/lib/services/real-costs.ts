/**
 * Real API Costs Configuration
 *
 * These are the actual costs charged by API providers.
 * All costs are in USD.
 *
 * Sources:
 * - Gemini API Pricing: https://ai.google.dev/gemini-api/docs/pricing
 * - Vertex AI Pricing: https://cloud.google.com/vertex-ai/generative-ai/pricing
 */

// Image resolution options
export type ImageResolution = '1k' | '2k' | '4k';
export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4';

export const IMAGE_RESOLUTIONS: Record<ImageResolution, { label: string; maxPixels: string; description: string }> = {
  '1k': { label: '1K', maxPixels: '1024x1024', description: 'Standard quality - fastest' },
  '2k': { label: '2K', maxPixels: '2048x2048', description: 'High quality - balanced' },
  '4k': { label: '4K', maxPixels: '4096x4096', description: 'Ultra quality - slowest' },
};

export const ASPECT_RATIOS: Record<AspectRatio, { label: string; description: string }> = {
  '1:1': { label: 'Square (1:1)', description: 'Best for characters and icons' },
  '16:9': { label: 'Landscape (16:9)', description: 'Best for scenes and videos' },
  '9:16': { label: 'Portrait (9:16)', description: 'Best for mobile and stories' },
  '4:3': { label: 'Classic (4:3)', description: 'Traditional film aspect' },
  '3:4': { label: 'Portrait Classic (3:4)', description: 'Portrait traditional' },
};

// Provider pricing (based on official documentation as of Dec 2024)
export const PROVIDER_COSTS = {
  // Google Gemini 3 Pro Image Preview (Nano Banana Pro)
  // Source: https://ai.google.dev/gemini-api/docs/pricing
  gemini: {
    // Text generation (per 1K tokens)
    textInputPer1K: 0.002,    // $2.00 per 1M tokens
    textOutputPer1K: 0.120,   // $120.00 per 1M tokens for images
    // Image generation by resolution
    image1k2k: 0.134,         // 1K/2K (1024-2048px): $0.134 per image (1120 tokens)
    image4k: 0.24,            // 4K (up to 4096px): $0.24 per image (2000 tokens)
    // TTS (per 1K characters)
    ttsPer1K: 0.016,
  },

  // Gemini 2.5 Flash Image (cheaper alternative)
  geminiFlash: {
    image1k: 0.039,           // Up to 1024x1024: $0.039 per image
  },

  // ElevenLabs Voice
  elevenlabs: {
    // Per 1K characters (Creator plan pricing)
    voicePer1K: 0.30,
    // Minimum charge per request
    minCharge: 0.01,
  },

  // Grok / Kie.ai (Video generation)
  grok: {
    // Per 6-second video clip
    videoGeneration: 0.08,
    // Text generation (per 1K tokens)
    textInputPer1K: 0.002,
    textOutputPer1K: 0.010,
  },

  // Imagen 3 (Vertex AI)
  imagen3: {
    imageGeneration: 0.04,    // Standard: $0.04 per image
    imageGenerationFast: 0.02, // Fast: $0.02 per image
  },

  // Claude (Anthropic) - Claude Sonnet 4 / Claude 3.5 Sonnet
  // Input: $3.00 per 1M tokens ($0.003 per 1K)
  // Output: $15.00 per 1M tokens ($0.015 per 1K)
  claude: {
    textInputPer1K: 0.003,
    textOutputPer1K: 0.015,
  },

  // Suno.ai (via sunoapi.org) - Music Generation
  suno: {
    musicGeneration: 0.05, // Estimated per music track
  },
} as const;

// Get image cost based on resolution
export function getImageCost(resolution: ImageResolution = '2k'): number {
  switch (resolution) {
    case '1k':
    case '2k':
      return PROVIDER_COSTS.gemini.image1k2k; // $0.134
    case '4k':
      return PROVIDER_COSTS.gemini.image4k;   // $0.24
    default:
      return PROVIDER_COSTS.gemini.image1k2k;
  }
}

// Default resolution for cost calculations
let defaultImageResolution: ImageResolution = '2k';

export function setDefaultImageResolution(resolution: ImageResolution) {
  defaultImageResolution = resolution;
}

export function getDefaultImageResolution(): ImageResolution {
  return defaultImageResolution;
}

// Simplified cost per action (using current default resolution)
export const ACTION_COSTS = {
  // Image generation - uses resolution-based pricing
  image: {
    gemini: PROVIDER_COSTS.gemini.image1k2k,      // Default 2K: $0.134
    gemini1k: PROVIDER_COSTS.gemini.image1k2k,    // 1K/2K: $0.134
    gemini2k: PROVIDER_COSTS.gemini.image1k2k,    // 1K/2K: $0.134
    gemini4k: PROVIDER_COSTS.gemini.image4k,      // 4K: $0.24
    geminiFlash: PROVIDER_COSTS.geminiFlash.image1k, // Flash: $0.039
    nanoBanana: PROVIDER_COSTS.gemini.image1k2k,  // Same as Gemini 3 Pro
  },

  // Video generation (6s clip)
  video: {
    grok: 0.10,
    kie: 0.10,
  },

  // Voice generation (average per line ~100 chars)
  voiceover: {
    elevenlabs: 0.03,
    geminiTts: 0.002,
  },

  // Scene generation (text) - per scene
  // Claude batch generation: ~5000 input + ~40000 output for 60 scenes
  // Input: 5000 × $0.003/1K = $0.015, Output: 40000 × $0.015/1K = $0.60
  // Total ~$0.615 for 60 scenes = $0.01 per scene
  scene: {
    gemini: 0.001,
    claude: 0.01,    // Updated: ~$0.60 for 60 scenes
    grok: 0.003,
  },

  // Character description generation - per character
  // Claude: ~500 input + ~400 output tokens = $0.0015 + $0.006 = $0.0075
  character: {
    gemini: 0.0005,
    claude: 0.008,   // Updated: realistic cost per character
  },

  // Master prompt generation - per prompt
  // Claude: ~500 input + ~600 output tokens = $0.0015 + $0.009 = $0.0105
  prompt: {
    gemini: 0.001,
    claude: 0.012,   // Updated: realistic cost per prompt
  },

  // Music generation - per track
  music: {
    suno: 0.05,      // ~$0.05 per music track
    piapi: 0.05,     // ~$0.05 per music track via PiAPI
  },
} as const;

// Type definitions
export type Provider = 'gemini' | 'gemini-tts' | 'elevenlabs' | 'grok' | 'kie' | 'claude' | 'suno' | 'piapi' | 'modal';
export type ActionType = 'image' | 'video' | 'voiceover' | 'scene' | 'character' | 'prompt' | 'music';

export interface CostEstimate {
  action: ActionType;
  provider: Provider;
  cost: number;
  quantity: number;
  totalCost: number;
}

export interface ProjectCosts {
  projectId: string;
  totalCost: number;
  breakdown: {
    images: number;
    videos: number;
    voiceovers: number;
    scenes: number;
    characters: number;
    prompts: number;
  };
  byProvider: Record<Provider, number>;
  transactions: CostTransaction[];
}

export interface CostTransaction {
  id: string;
  timestamp: string;
  action: ActionType;
  provider: Provider;
  cost: number;
  description: string;
  projectId?: string;
}

export interface UserCostStats {
  userId: string;
  totalSpent: number;
  breakdown: {
    images: { count: number; cost: number };
    videos: { count: number; cost: number };
    voiceovers: { count: number; cost: number };
    scenes: { count: number; cost: number };
    characters: { count: number; cost: number };
    prompts: { count: number; cost: number };
  };
  byProvider: Record<Provider, { count: number; cost: number }>;
  byProject: Record<string, number>;
}

/**
 * Get the cost for a specific action and provider
 */
export function getActionCost(action: ActionType, provider: Provider): number {
  const actionCosts = ACTION_COSTS[action];
  if (!actionCosts) return 0;

  return (actionCosts as Record<string, number>)[provider] || 0;
}

/**
 * Estimate cost for generating multiple items
 */
export function estimateCost(
  action: ActionType,
  provider: Provider,
  quantity: number = 1
): CostEstimate {
  const unitCost = getActionCost(action, provider);
  return {
    action,
    provider,
    cost: unitCost,
    quantity,
    totalCost: unitCost * quantity,
  };
}

/**
 * Format cost as currency string
 * @deprecated Use formatPrice from '@/lib/utils/currency' instead
 */
export function formatCost(cost: number, currency: string = 'EUR'): string {
  // Import dynamically to avoid circular dependencies
  const { formatPrice } = require('@/lib/utils/currency');
  return formatPrice(cost);
}

/**
 * Format cost with compact notation for buttons
 * Uses the configured currency from settings
 */
export function formatCostCompact(cost: number): string {
  // Import dynamically to avoid circular dependencies
  const { formatPriceWithSymbol } = require('@/lib/utils/currency');
  return formatPriceWithSymbol(cost);
}

/**
 * Calculate voice cost based on character count
 */
export function calculateVoiceCost(
  characterCount: number,
  provider: 'elevenlabs' | 'geminiTts'
): number {
  if (provider === 'elevenlabs') {
    const cost = (characterCount / 1000) * PROVIDER_COSTS.elevenlabs.voicePer1K;
    return Math.max(cost, PROVIDER_COSTS.elevenlabs.minCharge);
  }

  if (provider === 'geminiTts') {
    return (characterCount / 1000) * PROVIDER_COSTS.gemini.ttsPer1K;
  }

  return 0;
}

/**
 * Get estimated cost for generating all scenes
 */
export function estimateScenesCost(
  sceneCount: number,
  provider: Provider = 'claude'
): CostEstimate {
  return estimateCost('scene', provider, sceneCount);
}

/**
 * Get estimated cost for generating all images
 */
export function estimateImagesCost(
  imageCount: number,
  provider: Provider = 'gemini'
): CostEstimate {
  return estimateCost('image', provider, imageCount);
}

/**
 * Get estimated cost for generating all videos
 */
export function estimateVideosCost(
  videoCount: number,
  provider: Provider = 'grok'
): CostEstimate {
  return estimateCost('video', provider, videoCount);
}

/**
 * Get estimated cost for generating all voiceovers
 */
export function estimateVoiceoversCost(
  lineCount: number,
  provider: 'elevenlabs' | 'geminiTts' = 'elevenlabs',
  avgCharsPerLine: number = 100
): CostEstimate {
  const totalChars = lineCount * avgCharsPerLine;
  const totalCost = calculateVoiceCost(totalChars, provider);

  return {
    action: 'voiceover',
    provider: provider === 'geminiTts' ? 'gemini' : 'elevenlabs',
    cost: totalCost / lineCount,
    quantity: lineCount,
    totalCost,
  };
}

/**
 * Get complete project cost estimate
 */
export function estimateProjectCost(params: {
  sceneCount: number;
  characterCount: number;
  dialogueLineCount: number;
  imageProvider?: Provider;
  videoProvider?: Provider;
  voiceProvider?: 'elevenlabs' | 'geminiTts';
  sceneProvider?: Provider;
}): {
  total: number;
  breakdown: {
    prompt: CostEstimate;
    characters: CostEstimate;
    scenes: CostEstimate;
    images: CostEstimate;
    videos: CostEstimate;
    voiceovers: CostEstimate;
  };
} {
  const prompt = estimateCost('prompt', params.sceneProvider || 'claude', 1);
  const characters = estimateCost('character', 'gemini', params.characterCount);
  const scenes = estimateCost('scene', params.sceneProvider || 'claude', params.sceneCount);
  const images = estimateCost('image', params.imageProvider || 'gemini', params.sceneCount + params.characterCount);
  const videos = estimateCost('video', params.videoProvider || 'grok', params.sceneCount);
  const voiceovers = estimateVoiceoversCost(params.dialogueLineCount, params.voiceProvider || 'elevenlabs');

  const total =
    prompt.totalCost +
    characters.totalCost +
    scenes.totalCost +
    images.totalCost +
    videos.totalCost +
    voiceovers.totalCost;

  return {
    total,
    breakdown: {
      prompt,
      characters,
      scenes,
      images,
      videos,
      voiceovers,
    },
  };
}
