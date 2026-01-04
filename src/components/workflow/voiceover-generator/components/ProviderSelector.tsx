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

const PROVIDERS: { id: VoiceProvider; name: string; color: string; activeColor: string }[] = [
  { id: 'gemini-tts', name: 'Gemini TTS', color: 'border-white/10 hover:bg-white/5', activeColor: 'bg-green-600 hover:bg-green-500 text-white border-0' },
  { id: 'openai-tts', name: 'OpenAI TTS', color: 'border-white/10 hover:bg-white/5', activeColor: 'bg-emerald-600 hover:bg-emerald-500 text-white border-0' },
  { id: 'elevenlabs', name: 'ElevenLabs', color: 'border-white/10 hover:bg-white/5', activeColor: 'bg-blue-600 hover:bg-blue-500 text-white border-0' },
  { id: 'modal', name: 'Modal', color: 'border-white/10 hover:bg-white/5', activeColor: 'bg-violet-600 hover:bg-violet-500 text-white border-0' },
];

const LANGUAGES: { id: VoiceLanguage; flag: string; name: string }[] = [
  { id: 'sk', flag: '🇸🇰', name: 'Slovak' },
  { id: 'en', flag: '🇬🇧', name: 'English' },
];

export function ProviderSelector({ provider, language, onProviderChange, onLanguageChange }: ProviderSelectorProps) {
  const t = useTranslations();

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Provider Selection */}
      <div className="flex gap-1">
        {PROVIDERS.map((p) => (
          <Button
            key={p.id}
            variant={provider === p.id ? 'default' : 'outline'}
            size="sm"
            className={provider === p.id ? p.activeColor : p.color}
            onClick={() => onProviderChange(p.id)}
          >
            {p.name}
          </Button>
        ))}
      </div>

      {/* Language Selection */}
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground mr-1">{t('steps.voiceover.language')}:</span>
        {LANGUAGES.map((lang) => (
          <Badge
            key={lang.id}
            variant={language === lang.id ? 'default' : 'outline'}
            className={`cursor-pointer transition-all ${
              language === lang.id
                ? 'bg-violet-500 text-white hover:bg-violet-400'
                : 'hover:bg-white/10'
            }`}
            onClick={() => onLanguageChange(lang.id)}
          >
            {lang.flag} {lang.name}
          </Badge>
        ))}
      </div>
    </div>
  );
}
