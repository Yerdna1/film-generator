'use client';

import { Clapperboard, Check, Lock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { storyPresets } from './story-presets';

interface PresetStoriesProps {
  selectedPresetId: string | null;
  onApplyPreset: (preset: typeof storyPresets[0]) => void;
  isReadOnly: boolean;
  isPremiumUser: boolean;
}

export function PresetStories({ selectedPresetId, onApplyPreset, isReadOnly, isPremiumUser }: PresetStoriesProps) {
  const t = useTranslations();

  const handleApply = (preset: typeof storyPresets[0]) => {
    if (isReadOnly) return;

    // Create a copy of the preset with translated story content
    const translatedPreset = {
      ...preset,
      story: {
        ...preset.story,
        title: t(preset.storyTitleKey),
        setting: t(preset.settingKey),
        concept: t(preset.conceptKey),
      },
    };

    onApplyPreset(translatedPreset);
  };

  return (
    <div className="border-t border-border pt-4 mt-4">
      <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
        <Clapperboard className="w-4 h-4 text-purple-400" />
        {t('presets.title')}
      </h3>
      <div className="flex flex-wrap gap-2">
        {storyPresets.map((preset) => {
          // Check if the preset's style is restricted for the user
          // Free users can only use 'disney-pixar' style
          const isLocked = !isPremiumUser && preset.style !== 'disney-pixar';

          return (
            <button
              key={preset.id}
              onClick={() => !isLocked && handleApply(preset)}
              disabled={isReadOnly || isLocked}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border-2 relative ${selectedPresetId === preset.id
                  ? 'border-purple-500 bg-purple-500/20 text-purple-600 dark:text-purple-300'
                  : 'border-border bg-background text-foreground'
                } ${!isLocked && !isReadOnly
                  ? 'hover:border-purple-500/50 hover:bg-purple-500/5 cursor-pointer'
                  : ''
                } ${isLocked
                  ? 'opacity-50 cursor-not-allowed border-dashed'
                  : ''
                }`}
            >
              <preset.icon className="w-3 h-3" />
              <span>{t(preset.labelKey)}</span>
              {isLocked && <Lock className="w-3 h-3 ml-1 text-muted-foreground" />}
              {selectedPresetId === preset.id && (
                <Check className="w-3 h-3 ml-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
