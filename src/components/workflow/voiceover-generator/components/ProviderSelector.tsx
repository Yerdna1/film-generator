'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { VoiceProvider, VoiceLanguage } from '@/types/project';

interface ProviderSelectorProps {
  provider: VoiceProvider;
  language: VoiceLanguage;
  onProviderChange: (provider: VoiceProvider) => void;
  onLanguageChange: (language: VoiceLanguage) => void;
}

const PROVIDERS: { id: VoiceProvider; name: string; shortName: string; color: string; activeColor: string }[] = [
  { id: 'gemini-tts', name: 'Gemini TTS', shortName: 'Gemini', color: 'border-white/10 hover:bg-white/5', activeColor: 'bg-green-600 hover:bg-green-500 text-white border-0' },
  { id: 'openai-tts', name: 'OpenAI TTS', shortName: 'OpenAI', color: 'border-white/10 hover:bg-white/5', activeColor: 'bg-emerald-600 hover:bg-emerald-500 text-white border-0' },
  { id: 'elevenlabs', name: 'ElevenLabs', shortName: '11Labs', color: 'border-white/10 hover:bg-white/5', activeColor: 'bg-blue-600 hover:bg-blue-500 text-white border-0' },
  { id: 'modal', name: 'Modal', shortName: 'Modal', color: 'border-white/10 hover:bg-white/5', activeColor: 'bg-violet-600 hover:bg-violet-500 text-white border-0' },
];

const LANGUAGES: { id: VoiceLanguage; flag: string; name: string }[] = [
  { id: 'sk', flag: '🇸🇰', name: 'Slovak' },
  { id: 'en', flag: '🇬🇧', name: 'English' },
];

export function ProviderSelector({ provider, language, onProviderChange, onLanguageChange }: ProviderSelectorProps) {
  const t = useTranslations();

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      {/* Provider Selection */}
      <div className="flex gap-1">
        {PROVIDERS.map((p) => (
          <Button
            key={p.id}
            variant={provider === p.id ? 'default' : 'outline'}
            size="sm"
            className={`${provider === p.id ? p.activeColor : p.color} h-7 px-2 sm:px-3 text-xs`}
            onClick={() => onProviderChange(p.id)}
          >
            <span className="max-sm:hidden">{p.name}</span>
            <span className="sm:hidden">{p.shortName}</span>
          </Button>
        ))}
      </div>

      {/* Language Selection */}
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground mr-1 hidden sm:inline">{t('steps.voiceover.language')}:</span>
        {LANGUAGES.map((lang) => (
          <Badge
            key={lang.id}
            variant={language === lang.id ? 'default' : 'outline'}
            className={`cursor-pointer transition-all h-7 px-2 sm:px-2.5 text-xs ${
              language === lang.id
                ? 'bg-violet-500 text-white hover:bg-violet-400'
                : 'hover:bg-white/10'
            }`}
            onClick={() => onLanguageChange(lang.id)}
          >
            {lang.flag}
            <span className="hidden sm:inline ml-1">{lang.name}</span>
          </Badge>
        ))}
      </div>
    </div>
  );
}
