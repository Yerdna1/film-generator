import { Sparkles, Mic, Zap, Image as ImageIcon, Router, Music } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

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
