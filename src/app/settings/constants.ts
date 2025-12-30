import { Sparkles, Mic, Zap, Image as ImageIcon } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface ApiProvider {
  key: string;
  name: string;
  description: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  link: string;
}

export const apiProviders: ApiProvider[] = [
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
    key: 'sunoApiKey',
    name: 'Suno AI (via sunoapi.org)',
    description: 'AI music generation for background tracks',
    icon: Mic,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
    link: 'https://sunoapi.org/api-key',
  },
];
