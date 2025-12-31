import { Sparkles, Mic, Zap, Image as ImageIcon, Router, Music } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// OpenRouter model options
export interface OpenRouterModelOption {
  id: string;
  name: string;
  description: string;
  contextLength: number;
  pricing: string;
  recommended?: boolean;
}

export const openRouterModels: OpenRouterModelOption[] = [
  {
    id: 'anthropic/claude-sonnet-4',
    name: 'Claude Sonnet 4',
    description: 'Latest Claude model - excellent for creative writing and complex tasks',
    contextLength: 200000,
    pricing: '$3/$15 per 1M tokens',
    recommended: true,
  },
  {
    id: 'anthropic/claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet',
    description: 'Fast and capable, great balance of speed and quality',
    contextLength: 200000,
    pricing: '$3/$15 per 1M tokens',
  },
  {
    id: 'anthropic/claude-3.5-haiku',
    name: 'Claude 3.5 Haiku',
    description: 'Fastest Claude model - good for quick tasks',
    contextLength: 200000,
    pricing: '$0.25/$1.25 per 1M tokens',
  },
  {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    description: 'OpenAI flagship model with vision capabilities',
    contextLength: 128000,
    pricing: '$2.50/$10 per 1M tokens',
  },
  {
    id: 'openai/gpt-4o-mini',
    name: 'GPT-4o Mini',
    description: 'Fast and affordable GPT-4 variant',
    contextLength: 128000,
    pricing: '$0.15/$0.60 per 1M tokens',
  },
  {
    id: 'google/gemini-2.0-flash-001',
    name: 'Gemini 2.0 Flash',
    description: 'Google latest fast model with excellent capabilities',
    contextLength: 1000000,
    pricing: '$0.10/$0.40 per 1M tokens',
  },
  {
    id: 'google/gemini-pro-1.5',
    name: 'Gemini Pro 1.5',
    description: 'Google advanced model with 1M context window',
    contextLength: 1000000,
    pricing: '$1.25/$5 per 1M tokens',
  },
  {
    id: 'meta-llama/llama-3.3-70b-instruct',
    name: 'Llama 3.3 70B',
    description: 'Meta open-source model, great quality and free tier available',
    contextLength: 131072,
    pricing: '$0.40/$0.40 per 1M tokens',
  },
  {
    id: 'deepseek/deepseek-chat',
    name: 'DeepSeek Chat',
    description: 'Powerful and very affordable Chinese model',
    contextLength: 64000,
    pricing: '$0.14/$0.28 per 1M tokens',
  },
  {
    id: 'mistralai/mistral-large-2411',
    name: 'Mistral Large',
    description: 'Mistral flagship model with strong reasoning',
    contextLength: 128000,
    pricing: '$2/$6 per 1M tokens',
  },
];

export const DEFAULT_OPENROUTER_MODEL = 'anthropic/claude-sonnet-4';

export interface ApiProvider {
  key: string;
  name: string;
  description: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  link: string;
  isLLMProvider?: boolean;  // Marks providers that can be used for scene generation
  isMusicProvider?: boolean;  // Marks providers that can be used for music generation
}

// LLM Provider options for scene generation
export interface LLMProviderOption {
  id: 'openrouter' | 'claude-sdk';
  name: string;
  description: string;
  requiresApiKey: boolean;
  apiKeyField?: string;
}

export const llmProviderOptions: LLMProviderOption[] = [
  {
    id: 'openrouter',
    name: 'OpenRouter (Recommended)',
    description: 'Works everywhere - Vercel, local dev, any hosting. Uses Claude models via API.',
    requiresApiKey: true,
    apiKeyField: 'openRouterApiKey',
  },
  {
    id: 'claude-sdk',
    name: 'Claude SDK/CLI',
    description: 'Requires Claude CLI installed locally. Does not work on Vercel or cloud deployments.',
    requiresApiKey: false,
  },
];

// Music Provider options for background music generation
export interface MusicProviderOption {
  id: 'piapi' | 'suno';
  name: string;
  description: string;
  requiresApiKey: boolean;
  apiKeyField: string;
}

export const musicProviderOptions: MusicProviderOption[] = [
  {
    id: 'piapi',
    name: 'PiAPI (Recommended)',
    description: 'Access Suno, Udio, and other music models via unified API. Works everywhere.',
    requiresApiKey: true,
    apiKeyField: 'piapiApiKey',
  },
  {
    id: 'suno',
    name: 'Suno AI (Direct)',
    description: 'Direct Suno API via sunoapi.org. Alternative if you already have a Suno API key.',
    requiresApiKey: true,
    apiKeyField: 'sunoApiKey',
  },
];

export const apiProviders: ApiProvider[] = [
  {
    key: 'openRouterApiKey',
    name: 'OpenRouter',
    description: 'LLM access for scene generation (recommended - works on Vercel)',
    icon: Router,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/20',
    link: 'https://openrouter.ai/keys',
    isLLMProvider: true,
  },
  {
    key: 'geminiApiKey',
    name: 'Google Gemini',
    description: 'Text generation, images, and Slovak TTS',
    icon: Sparkles,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    link: 'https://makersuite.google.com/app/apikey',
  },
  {
    key: 'elevenLabsApiKey',
    name: 'ElevenLabs',
    description: 'High-quality English voiceover',
    icon: Mic,
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/20',
    link: 'https://elevenlabs.io/api',
  },
  {
    key: 'kieApiKey',
    name: 'Kie.ai (Grok Imagine)',
    description: 'Image-to-video generation via Grok Imagine',
    icon: Zap,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20',
    link: 'https://kie.ai/api-key',
  },
  {
    key: 'grokApiKey',
    name: 'Grok AI (Direct)',
    description: 'Direct xAI API (optional)',
    icon: Zap,
    color: 'text-orange-300',
    bgColor: 'bg-orange-400/20',
    link: 'https://console.x.ai',
  },
  {
    key: 'nanoBananaApiKey',
    name: 'Nano Banana',
    description: 'High-quality image generation',
    icon: ImageIcon,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    link: 'https://nano-banana.com',
  },
  {
    key: 'claudeApiKey',
    name: 'Claude (Anthropic)',
    description: 'Advanced text generation and editing',
    icon: Sparkles,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/20',
    link: 'https://console.anthropic.com',
  },
  {
    key: 'piapiApiKey',
    name: 'PiAPI',
    description: 'Music generation via Suno/Udio (recommended - unified API)',
    icon: Music,
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/20',
    link: 'https://piapi.ai/workspace',
    isMusicProvider: true,
  },
  {
    key: 'sunoApiKey',
    name: 'Suno AI (via sunoapi.org)',
    description: 'AI music generation for background tracks (alternative)',
    icon: Mic,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
    link: 'https://sunoapi.org/api-key',
    isMusicProvider: true,
  },
];
