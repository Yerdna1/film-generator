'use client';

import { Sparkles, Mic, Zap, Router, Music, Mail, ImageIcon, FileText, Video } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

// Provider icon mapping based on provider ID
const PROVIDER_ICONS: Record<string, LucideIcon> = {
  // LLM Providers
  'openrouter': Router,
  'openRouter': Router,
  'gemini': Sparkles,
  'openai': Sparkles,
  'claude': Sparkles,
  'claude-sdk': Sparkles,
  'anthropic': Sparkles,
  'grok': Zap,

  // Image Providers
  'kie': Zap,
  'modal': FileText,
  'modal-edit': FileText,

  // TTS Providers
  'elevenlabs': Mic,
  'openai-tts': Sparkles,
  'gemini-tts': Sparkles,
  'kie-tts': Zap,

  // Video Providers
  'kie-video': Zap,
  'modal-video': Video,

  // Music Providers
  'piapi': Music,
  'suno': Music,
  'kie-music': Zap,
  'modal-music': Music,

  // Email
  'resend': Mail,
};

// Provider colors based on provider ID
const PROVIDER_COLORS: Record<string, string> = {
  // LLM Providers
  'openrouter': 'text-emerald-400',
  'openRouter': 'text-emerald-400',
  'gemini': 'text-blue-400',
  'openai': 'text-green-400',
  'claude': 'text-amber-400',
  'claude-sdk': 'text-amber-400',
  'anthropic': 'text-amber-400',
  'grok': 'text-orange-300',

  // Image/Video/Audio Providers
  'kie': 'text-orange-400',
  'modal': 'text-purple-400',
  'modal-edit': 'text-purple-400',
  'elevenlabs': 'text-violet-400',
  'openai-tts': 'text-green-400',
  'gemini-tts': 'text-blue-400',
  'kie-tts': 'text-orange-400',
  'kie-video': 'text-orange-400',
  'modal-video': 'text-purple-400',
  'piapi': 'text-pink-400',
  'suno': 'text-purple-400',
  'kie-music': 'text-orange-400',
  'modal-music': 'text-purple-400',
  'resend': 'text-cyan-400',
};

// Provider background colors for badges
const PROVIDER_BG_COLORS: Record<string, string> = {
  // LLM Providers
  'openrouter': 'bg-emerald-500/20',
  'openRouter': 'bg-emerald-500/20',
  'gemini': 'bg-blue-500/20',
  'openai': 'bg-green-500/20',
  'claude': 'bg-amber-500/20',
  'claude-sdk': 'bg-amber-500/20',
  'anthropic': 'bg-amber-500/20',
  'grok': 'bg-orange-400/20',

  // Other Providers
  'kie': 'bg-orange-500/20',
  'modal': 'bg-purple-500/20',
  'modal-edit': 'bg-purple-500/20',
  'elevenlabs': 'bg-violet-500/20',
  'openai-tts': 'bg-green-500/20',
  'gemini-tts': 'bg-blue-500/20',
  'kie-tts': 'bg-orange-500/20',
  'kie-video': 'bg-orange-500/20',
  'modal-video': 'bg-purple-500/20',
  'piapi': 'bg-pink-500/20',
  'suno': 'bg-purple-500/20',
  'kie-music': 'bg-orange-500/20',
  'modal-music': 'bg-purple-500/20',
  'resend': 'bg-cyan-500/20',
};

// Provider display names
const PROVIDER_NAMES: Record<string, string> = {
  'openrouter': 'OpenRouter',
  'openRouter': 'OpenRouter',
  'gemini': 'Google Gemini',
  'openai': 'OpenAI',
  'openai-tts': 'OpenAI TTS',
  'gemini-tts': 'Gemini TTS',
  'claude': 'Claude',
  'claude-sdk': 'Claude SDK',
  'anthropic': 'Anthropic',
  'grok': 'Grok AI',
  'kie': 'KIE.ai',
  'kie-tts': 'KIE.ai TTS',
  'kie-video': 'KIE.ai Video',
  'kie-music': 'KIE.ai Music',
  'modal': 'Modal',
  'modal-edit': 'Modal Edit',
  'modal-video': 'Modal Video',
  'modal-music': 'Modal Music',
  'elevenlabs': 'ElevenLabs',
  'piapi': 'PiAPI',
  'suno': 'Suno AI',
  'resend': 'Resend',
};

export interface ProviderLogoProps {
  provider: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showName?: boolean;
  className?: string;
  iconClassName?: string;
  nameClassName?: string;
  variant?: 'icon' | 'badge' | 'full';
}

export function ProviderLogo({
  provider,
  size = 'md',
  showName = false,
  className,
  iconClassName,
  nameClassName,
  variant = 'icon',
}: ProviderLogoProps) {
  // Normalize provider ID (handle case variations)
  const normalizedProvider = provider.toLowerCase().replace(/[-_]/g, '');

  // Get icon, color, and name
  const Icon = PROVIDER_ICONS[provider] || PROVIDER_ICONS[normalizedProvider] || Sparkles;
  const color = PROVIDER_COLORS[provider] || PROVIDER_COLORS[normalizedProvider] || 'text-gray-400';
  const bgColor = PROVIDER_BG_COLORS[provider] || PROVIDER_BG_COLORS[normalizedProvider] || 'bg-gray-500/20';
  const displayName = PROVIDER_NAMES[provider] || provider;

  // Size classes
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8',
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg',
  };

  // Render based on variant
  if (variant === 'badge') {
    return (
      <div className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-full',
        bgColor,
        className
      )}>
        <Icon className={cn(sizeClasses[size], color, iconClassName)} />
        <span className={cn(textSizeClasses[size], 'font-medium', color, nameClassName)}>
          {displayName}
        </span>
      </div>
    );
  }

  if (variant === 'full' || showName) {
    return (
      <div className={cn('inline-flex items-center gap-2', className)}>
        <Icon className={cn(sizeClasses[size], color, iconClassName)} />
        <span className={cn(textSizeClasses[size], 'font-medium', nameClassName)}>
          {displayName}
        </span>
      </div>
    );
  }

  // Default: icon only
  return (
    <Icon className={cn(sizeClasses[size], color, className, iconClassName)} />
  );
}

// Export helper functions
export function getProviderName(provider: string): string {
  return PROVIDER_NAMES[provider] || provider;
}

export function getProviderColor(provider: string): string {
  const normalizedProvider = provider.toLowerCase().replace(/[-_]/g, '');
  return PROVIDER_COLORS[provider] || PROVIDER_COLORS[normalizedProvider] || 'text-gray-400';
}

export function getProviderBgColor(provider: string): string {
  const normalizedProvider = provider.toLowerCase().replace(/[-_]/g, '');
  return PROVIDER_BG_COLORS[provider] || PROVIDER_BG_COLORS[normalizedProvider] || 'bg-gray-500/20';
}