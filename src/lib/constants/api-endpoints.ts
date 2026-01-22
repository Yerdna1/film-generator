/**
 * Centralized API Endpoint Configuration
 *
 * This file contains all external API endpoints used by the application.
 * NO hardcoded URLs should exist outside this file.
 * All endpoints should be configured here as the single source of truth.
 */

export const API_BASE_URLS = {
  // LLM Providers
  openrouter: 'https://openrouter.ai',
  openai: 'https://api.openai.com',
  claude: 'https://api.anthropic.com', // For future use
  gemini: 'https://generativelanguage.googleapis.com',
  kie: 'https://api.kie.ai',
  grok: 'https://api.x.ai',

  // TTS Providers
  elevenlabs: 'https://api.elevenlabs.io',

  // Music Providers
  suno: 'https://api.suno.ai', // Direct Suno API
  piapi: 'https://api.piapi.ai', // Unified API for Suno/Udio

  // Other Services
  resend: 'https://api.resend.com',
} as const;

export const API_PATHS = {
  // OpenRouter
  openrouter: {
    chat: '/api/v1/chat/completions',
    auth: '/api/v1/auth/key',
    models: '/api/v1/models',
  },

  // OpenAI
  openai: {
    chat: '/v1/chat/completions',
    tts: '/v1/audio/speech',
    models: '/v1/models',
  },

  // Gemini
  gemini: {
    generateContent: (model: string) => `/v1beta/models/${model}:generateContent`,
    models: '/v1beta/models',
  },

  // KIE.ai
  kie: {
    // KIE uses model-specific endpoints for LLM
    llm: (model: string) => `/${model}/v1/chat/completions`,
    // Task-based endpoints for other services
    createTask: '/api/v1/jobs/createTask',
    taskStatus: '/api/v1/jobs/recordInfo',
    models: '/api/v1/models',
    // Direct generation endpoints (these don't actually exist - KIE uses createTask for everything)
    generateImage: '/api/v1/jobs/createTask', // Changed to use createTask
    generateVideo: '/api/v1/jobs/createTask', // These all use createTask
    generateTts: '/api/v1/jobs/createTask',
    generateMusic: '/api/v1/jobs/createTask',
  },

  // Grok
  grok: {
    images: '/v1/images/generations',
    tasks: (taskId: string) => `/v1/tasks/${taskId}`,
  },

  // ElevenLabs
  elevenlabs: {
    tts: (voiceId: string) => `/v1/text-to-speech/${voiceId}`,
    voices: '/v1/voices',
    models: '/v1/models',
  },

  // Suno
  suno: {
    generate: '/v1/generate',
    status: '/v1/status',
  },

  // PiAPI
  piapi: {
    suno: '/v1/suno/generate',
    udio: '/v1/udio/generate',
    status: '/v1/status',
  },
} as const;

/**
 * Build a complete API URL
 */
export function buildApiUrl(
  provider: keyof typeof API_BASE_URLS,
  path: string
): string {
  const baseUrl = API_BASE_URLS[provider];
  if (!baseUrl) {
    throw new Error(`Unknown API provider: ${provider}`);
  }

  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  return `${baseUrl}${normalizedPath}`;
}

/**
 * Get the complete endpoint URL for a specific service
 */
export function getEndpointUrl(
  provider: string,
  service: string,
  ...params: string[]
): string {
  const providerPaths = API_PATHS[provider as keyof typeof API_PATHS];
  if (!providerPaths) {
    throw new Error(`No paths configured for provider: ${provider}`);
  }

  const pathConfig = providerPaths[service as keyof typeof providerPaths];
  if (!pathConfig) {
    throw new Error(`No path configured for ${provider}.${service}`);
  }

  // Handle function paths (e.g., for parameterized endpoints)
  const path = typeof pathConfig === 'function'
    ? (pathConfig as (...args: string[]) => string)(...params)
    : pathConfig;

  return buildApiUrl(provider as keyof typeof API_BASE_URLS, path);
}

/**
 * Default request headers for each provider
 */
export const DEFAULT_HEADERS = {
  common: {
    'Content-Type': 'application/json',
  },
  openrouter: {
    'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://film-generator.vercel.app',
    'X-Title': 'Film Generator',
  },
  kie: {
    'Accept': 'application/json',
  },
} as const;

/**
 * Get headers for a specific provider
 */
export function getProviderHeaders(
  provider: string,
  apiKey?: string,
  additionalHeaders?: Record<string, string>
): Record<string, string> {
  const headers: Record<string, string> = {
    ...DEFAULT_HEADERS.common,
  };

  // Add provider-specific headers
  const providerHeaders = DEFAULT_HEADERS[provider as keyof typeof DEFAULT_HEADERS];
  if (providerHeaders) {
    Object.assign(headers, providerHeaders);
  }

  // Add authentication
  if (apiKey) {
    if (provider === 'gemini') {
      // Gemini uses API key in URL, not header
    } else {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }
  }

  // Add any additional headers
  if (additionalHeaders) {
    Object.assign(headers, additionalHeaders);
  }

  return headers;
}