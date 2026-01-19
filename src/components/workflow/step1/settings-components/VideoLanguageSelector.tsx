'use client';

import { useTranslations } from 'next-intl';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface VideoLanguageSelectorProps {
  videoLanguage: string;
  setVideoLanguage: (lang: string | ((prev: string) => string)) => void;
  videoLanguages: readonly string[];
  isReadOnly: boolean;
}

export function VideoLanguageSelector({
  videoLanguage,
  setVideoLanguage,
  videoLanguages,
  isReadOnly
}: VideoLanguageSelectorProps) {
  const t = useTranslations();

  return (
    <div className="space-y-1">
      <Label className="text-xs flex items-center gap-1">
        {t('settings.videoLanguage')}
      </Label>
      <Select value={videoLanguage} onValueChange={setVideoLanguage} disabled={isReadOnly}>
        <SelectTrigger className="w-full h-9 glass border-white/10 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="glass-strong border-white/10">
          {videoLanguages.map((lang) => (
            <SelectItem key={lang} value={lang}>
              {t(`languages.${lang}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}