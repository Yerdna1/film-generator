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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {storyPresets.map((preset) => {
          // Check if the preset's style is restricted for the user
          // Free users can only use 'disney-pixar' style
          const isLocked = !isPremiumUser && preset.style !== 'disney-pixar';
          const isSelected = selectedPresetId === preset.id;

          return (
            <button
              key={preset.id}
              onClick={() => !isLocked && handleApply(preset)}
              disabled={isReadOnly || isLocked}
              className={`relative group overflow-hidden rounded-lg border-2 transition-all ${
                isSelected
                  ? 'border-purple-500 ring-2 ring-purple-500/50 shadow-lg shadow-purple-500/20'
                  : 'border-border hover:border-purple-500/50'
              } ${!isLocked && !isReadOnly ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'} ${
                isLocked ? 'border-dashed' : ''
              }`}
            >
              {/* Image Background */}
              <div className={`relative h-24 bg-gradient-to-br ${preset.gradient} ${
                isLocked ? 'opacity-50' : ''
              }`}>
                {/* Preset Image */}
                <img
                  src={preset.imageUrl}
                  alt={t(preset.labelKey)}
                  className="absolute inset-0 w-full h-full object-cover"
                  loading="lazy"
                />

                {/* Gradient Overlay for text readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

                {/* Icon Overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className={`p-3 rounded-full ${preset.iconBg} backdrop-blur-sm`}>
                    <preset.icon className={`w-6 h-6 ${preset.iconColor}`} />
                  </div>
                </div>

                {/* Lock Overlay */}
                {isLocked && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
                    <Lock className="w-5 h-5 text-white/80" />
                  </div>
                )}

                {/* Selected Badge */}
                {isSelected && (
                  <div className="absolute top-2 right-2 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center z-10">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>

              {/* Title */}
              <div className="p-2 bg-background/95 backdrop-blur-sm">
                <p className="text-xs font-medium text-center truncate">
                  {t(preset.labelKey)}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
