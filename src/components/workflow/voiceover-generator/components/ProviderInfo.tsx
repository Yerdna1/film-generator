'use client';

import { useTranslations } from 'next-intl';
import { Mic } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { ProviderInfoProps } from '../types';

export function ProviderInfo({ currentProvider }: ProviderInfoProps) {
  const t = useTranslations();

  return (
    <div className="glass rounded-xl p-6 space-y-4">
      <h3 className="font-semibold flex items-center gap-2">
        <Mic className="w-5 h-5 text-violet-400" />
        {t('steps.voiceover.providerInfo')}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={`glass rounded-lg p-4 border-2 ${currentProvider === 'elevenlabs' ? 'border-blue-500/30' : 'border-transparent'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">🇬🇧 ElevenLabs</span>
            {currentProvider === 'elevenlabs' && (
              <Badge className="bg-blue-500/20 text-blue-400 border-0">Active</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {t('steps.voiceover.elevenLabsDescription')}
          </p>
        </div>
        <div className={`glass rounded-lg p-4 border-2 ${currentProvider === 'gemini-tts' ? 'border-green-500/30' : 'border-transparent'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">🇸🇰 Gemini TTS</span>
            {currentProvider === 'gemini-tts' && (
              <Badge className="bg-green-500/20 text-green-400 border-0">Active</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {t('steps.voiceover.geminiDescription')}
          </p>
        </div>
      </div>
    </div>
  );
}
