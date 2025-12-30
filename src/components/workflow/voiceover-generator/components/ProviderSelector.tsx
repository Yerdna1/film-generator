'use client';

import { Button } from '@/components/ui/button';
import type { ProviderSelectorProps } from '../types';

export function ProviderSelector({ provider, onProviderChange }: ProviderSelectorProps) {
  return (
    <div className="flex gap-2">
      <Button
        variant={provider === 'elevenlabs' ? 'default' : 'outline'}
        size="sm"
        className={`${
          provider === 'elevenlabs'
            ? 'bg-blue-600 hover:bg-blue-500 text-white border-0'
            : 'border-white/10 hover:bg-white/5'
        }`}
        onClick={() => onProviderChange('elevenlabs', 'en')}
      >
        🇬🇧 ElevenLabs
      </Button>
      <Button
        variant={provider === 'gemini-tts' ? 'default' : 'outline'}
        size="sm"
        className={`${
          provider === 'gemini-tts'
            ? 'bg-green-600 hover:bg-green-500 text-white border-0'
            : 'border-white/10 hover:bg-white/5'
        }`}
        onClick={() => onProviderChange('gemini-tts', 'sk')}
      >
        🇸🇰 Gemini TTS
      </Button>
    </div>
  );
}
