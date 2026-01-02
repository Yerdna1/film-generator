import { Sparkles, Mic, Zap, Image as ImageIcon, Router, Music, Mail } from 'lucide-react';
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
  id: 'openrouter' | 'claude-sdk' | 'modal';
  name: string;
  description: string;
  requiresApiKey: boolean;
  apiKeyField?: string;
  requiresEndpoint?: boolean;
  endpointField?: string;
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
  {
    id: 'modal',
    name: 'Modal (Self-Hosted)',
    description: 'Self-hosted LLM (e.g., Llama 3, Mistral) on Modal.com GPU infrastructure.',
    requiresApiKey: false,
    requiresEndpoint: true,
    endpointField: 'modalLlmEndpoint',
  },
];

// Music Provider options for background music generation
export interface MusicProviderOption {
  id: 'piapi' | 'suno' | 'modal';
  name: string;
  description: string;
  requiresApiKey: boolean;
  apiKeyField?: string;
  requiresEndpoint?: boolean;
  endpointField?: string;
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
  {
    id: 'modal',
    name: 'Modal (ACE-Step)',
    description: 'Self-hosted ACE-Step music model on Modal.com. 4min music in 20s on A100.',
    requiresApiKey: false,
    requiresEndpoint: true,
    endpointField: 'modalMusicEndpoint',
  },
];

// TTS Provider options for voiceover generation
export interface TTSProviderOption {
  id: 'gemini-tts' | 'elevenlabs' | 'modal';
  name: string;
  description: string;
  requiresApiKey: boolean;
  apiKeyField?: string;
  requiresEndpoint?: boolean;
  endpointField?: string;
}

export const ttsProviderOptions: TTSProviderOption[] = [
  {
    id: 'gemini-tts',
    name: 'Gemini TTS (Recommended)',
    description: 'Google Gemini TTS with excellent Slovak language support.',
    requiresApiKey: true,
    apiKeyField: 'geminiApiKey',
  },
  {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    description: 'High-quality voices, best for English. Premium quality.',
    requiresApiKey: true,
    apiKeyField: 'elevenLabsApiKey',
  },
  {
    id: 'modal',
    name: 'Modal (Self-Hosted)',
    description: 'Self-hosted TTS model (e.g., Bark, XTTS, Coqui) on Modal.com.',
    requiresApiKey: false,
    requiresEndpoint: true,
    endpointField: 'modalTtsEndpoint',
  },
];

// Image Provider options for image generation
export interface ImageProviderOption {
  id: 'gemini' | 'modal' | 'modal-edit';
  name: string;
  description: string;
  requiresApiKey: boolean;
  apiKeyField?: string;
  requiresEndpoint?: boolean;
  endpointField?: string;
}

export const imageProviderOptions: ImageProviderOption[] = [
  {
    id: 'gemini',
    name: 'Gemini (Recommended)',
    description: 'Google Gemini for image generation. High quality, good pricing.',
    requiresApiKey: true,
    apiKeyField: 'geminiApiKey',
  },
  {
    id: 'modal',
    name: 'Modal Qwen-Image',
    description: 'Self-hosted Qwen-Image (20B) - fast general image generation.',
    requiresApiKey: false,
    requiresEndpoint: true,
    endpointField: 'modalImageEndpoint',
  },
  {
    id: 'modal-edit',
    name: 'Modal Qwen-Image-Edit (Best Consistency)',
    description: 'Qwen-Image-Edit-2511 - uses reference images for character consistency.',
    requiresApiKey: false,
    requiresEndpoint: true,
    endpointField: 'modalImageEditEndpoint',
  },
];

// Video Provider options for video generation
export interface VideoProviderOption {
  id: 'kie' | 'modal';
  name: string;
  description: string;
  requiresApiKey: boolean;
  apiKeyField?: string;
  requiresEndpoint?: boolean;
  endpointField?: string;
}

export const videoProviderOptions: VideoProviderOption[] = [
  {
    id: 'kie',
    name: 'Kie.ai (Grok Imagine)',
    description: 'Image-to-video generation via Grok Imagine. Default provider.',
    requiresApiKey: true,
    apiKeyField: 'kieApiKey',
  },
  {
    id: 'modal',
    name: 'Modal (Self-Hosted)',
    description: 'Self-hosted video model (e.g., Kling, SVD) on Modal.com.',
    requiresApiKey: false,
    requiresEndpoint: true,
    endpointField: 'modalVideoEndpoint',
  },
];

// Modal endpoint configuration
export interface ModalEndpointConfig {
  id: string;
  name: string;
  description: string;
  placeholder: string;
  docsUrl: string;
}

export const modalEndpoints: ModalEndpointConfig[] = [
  {
    id: 'modalLlmEndpoint',
    name: 'LLM Endpoint',
    description: 'Self-hosted LLM (e.g., Llama 3, Mistral) for scene generation',
    placeholder: 'https://your-app--llm.modal.run',
    docsUrl: 'https://modal.com/docs/examples/vllm_inference',
  },
  {
    id: 'modalTtsEndpoint',
    name: 'TTS Endpoint',
    description: 'Self-hosted TTS (e.g., Bark, XTTS, Coqui) for voiceovers',
    placeholder: 'https://your-app--tts.modal.run',
    docsUrl: 'https://modal.com/docs/examples/text_to_speech',
  },
  {
    id: 'modalImageEndpoint',
    name: 'Image Endpoint',
    description: 'Self-hosted image model (e.g., FLUX, Stable Diffusion)',
    placeholder: 'https://your-app--image.modal.run',
    docsUrl: 'https://modal.com/docs/examples/stable_diffusion',
  },
  {
    id: 'modalVideoEndpoint',
    name: 'Video Endpoint',
    description: 'Self-hosted video model (e.g., Kling, SVD) for animations',
    placeholder: 'https://your-app--video.modal.run',
    docsUrl: 'https://modal.com/docs/examples',
  },
  {
    id: 'modalMusicEndpoint',
    name: 'Music Endpoint (ACE-Step)',
    description: 'Self-hosted ACE-Step music generation - 4min music in 20s',
    placeholder: 'https://your-app--ace-step.modal.run',
    docsUrl: 'https://modal.com/docs/examples/generate_music',
  },
  {
    id: 'modalImageEditEndpoint',
    name: 'Image Edit Endpoint (Qwen-Edit)',
    description: 'Qwen-Image-Edit-2511 - uses reference images for character consistency',
    placeholder: 'https://your-app--image-edit.modal.run',
    docsUrl: 'https://huggingface.co/Qwen/Qwen-Image-Edit-2511',
  },
  {
    id: 'modalVectcutEndpoint',
    name: 'Video Composition (VectCut)',
    description: 'VectCutAPI for video rendering with transitions, captions, and CapCut draft export',
    placeholder: 'https://your-app--vectcut.modal.run',
    docsUrl: 'https://github.com/sun-guannan/VectCutAPI',
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
  {
    key: 'resendApiKey',
    name: 'Resend',
    description: 'Email service for collaboration invitations',
    icon: Mail,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/20',
    link: 'https://resend.com/api-keys',
  },
];
