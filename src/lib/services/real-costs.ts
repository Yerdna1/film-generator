/**
 * Real API Costs Configuration
 *
 * These are the actual costs charged by API providers.
 * All costs are in USD.
 */

// Provider pricing (approximate, based on current pricing as of Dec 2024)
export const PROVIDER_COSTS = {
  // Google Gemini
  gemini: {
    // Text generation (per 1K tokens)
    textInputPer1K: 0.00025,
    textOutputPer1K: 0.0005,
    // Image generation (Imagen 3)
    imageGeneration: 0.02,
    // TTS (per 1K characters)
    ttsPer1K: 0.016,
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

  // Nano Banana (Image generation)
  nanoBanana: {
    // Per image
    imageGeneration: 0.025,
  },

  // Claude (Anthropic)
  claude: {
    // Per 1K tokens (Claude 3.5 Sonnet)
    textInputPer1K: 0.003,
    textOutputPer1K: 0.015,
  },
} as const;

// Simplified cost per action (average estimates)
export const ACTION_COSTS = {
  // Image generation
  image: {
    gemini: 0.04,
    nanoBanana: 0.04,
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

  // Scene generation (text)
  scene: {
    gemini: 0.001,
    claude: 0.005,
    grok: 0.003,
  },

  // Character description generation
  character: {
    gemini: 0.0005,
    claude: 0.002,
  },

  // Master prompt generation
  prompt: {
    gemini: 0.001,
    claude: 0.005,
  },
} as const;

// Type definitions
export type Provider = 'gemini' | 'elevenlabs' | 'grok' | 'kie' | 'nanoBanana' | 'claude';
export type ActionType = 'image' | 'video' | 'voiceover' | 'scene' | 'character' | 'prompt';

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
 */
export function formatCost(cost: number, currency: string = 'USD'): string {
  if (cost < 0.01) {
    return `<$0.01`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  }).format(cost);
}

/**
 * Format cost with compact notation for buttons
 */
export function formatCostCompact(cost: number): string {
  if (cost === 0) return 'Free';
  if (cost < 0.001) return '<$0.001';
  if (cost < 0.01) return `$${cost.toFixed(3)}`;
  if (cost < 1) return `$${cost.toFixed(2)}`;
  return `$${cost.toFixed(2)}`;
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
