// KIE Music model mapping: UI names to API model names
export const KIE_MUSIC_MODEL_MAPPING: Record<string, string> = {
  'suno/v3-5-music': 'V3_5',
  'suno/v3-music': 'V3_5',
  'udio/v1-5-music': 'V4_5',
  'suno-api': 'V3_5',
  'V3_5': 'V3_5',
  'V4': 'V4',
  'V4_5': 'V4_5',
  'V4_5PLUS': 'V4_5PLUS',
  'V5': 'V5',
};

// Polling configuration
export const KIE_POLL_CONFIG = {
  INTERVAL_MS: 3000, // 3 seconds
  MAX_ATTEMPTS: 60,
};

// Provider costs (real costs in USD)
export const PROVIDER_COSTS = {
  modal: 0.03,
  kie: 0.50,
  suno: 0.40,
} as const;
