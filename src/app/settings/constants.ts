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
  // Claude Models (Latest)
  {
    id: 'anthropic/claude-4.5-sonnet',
    name: 'Claude 4.5 Sonnet',
    description: 'Latest Claude - best for creative writing and complex tasks',
    contextLength: 200000,
    pricing: '$3/$15 per 1M tokens',
    recommended: true,
  },
  {
    id: 'anthropic/claude-4.5-opus',
    name: 'Claude 4.5 Opus',
    description: 'Most capable Claude model - highest quality output',
    contextLength: 200000,
    pricing: '$15/$75 per 1M tokens',
  },
  {
    id: 'anthropic/claude-4.5-haiku',
    name: 'Claude 4.5 Haiku',
    description: 'Fastest Claude 4.5 - matches Sonnet 4 at lower cost',
    contextLength: 200000,
    pricing: '$0.80/$4 per 1M tokens',
  },
  {
    id: 'anthropic/claude-sonnet-4',
    name: 'Claude Sonnet 4',
    description: 'Previous gen flagship - still excellent quality',
    contextLength: 200000,
    pricing: '$3/$15 per 1M tokens',
  },
  // Gemini Models (Latest)
  {
    id: 'google/gemini-3-flash-preview',
    name: 'Gemini 3 Flash (Preview)',
    description: 'Latest Gemini 3 - cutting edge performance',
    contextLength: 1000000,
    pricing: '$0.10/$0.40 per 1M tokens',
  },
  {
    id: 'google/gemini-3-pro-preview',
    name: 'Gemini 3 Pro (Preview)',
    description: 'Gemini 3 Pro - advanced reasoning capabilities',
    contextLength: 1000000,
    pricing: '$1.25/$5 per 1M tokens',
  },
  {
    id: 'google/gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    description: 'Google flagship - 1M context, excellent quality',
    contextLength: 1000000,
    pricing: '$1.25/$5 per 1M tokens',
  },
  {
    id: 'google/gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    description: 'Fast and efficient with huge context window',
    contextLength: 1000000,
    pricing: '$0.075/$0.30 per 1M tokens',
  },
  // OpenAI Models
  {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    description: 'OpenAI flagship with vision capabilities',
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
  // Grok Models
  {
    id: 'x-ai/grok-4-fast',
    name: 'Grok 4 Fast',
    description: 'xAI latest model - excellent for coding',
    contextLength: 131072,
    pricing: '$2/$10 per 1M tokens',
  },
  // DeepSeek
  {
    id: 'deepseek/deepseek-chat',
    name: 'DeepSeek V3',
    description: 'Powerful and very affordable',
    contextLength: 64000,
    pricing: '$0.14/$0.28 per 1M tokens',
  },
  // Llama
  {
    id: 'meta-llama/llama-3.3-70b-instruct',
    name: 'Llama 3.3 70B',
    description: 'Meta open-source, great quality',
    contextLength: 131072,
    pricing: '$0.40/$0.40 per 1M tokens',
  },
];

export const DEFAULT_OPENROUTER_MODEL = 'anthropic/claude-4.5-sonnet';

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
