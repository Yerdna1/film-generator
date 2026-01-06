'use client';

import { Clapperboard, Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { storyPresets } from './story-presets';

interface PresetStoriesProps {
  selectedPresetId: string | null;
  onApplyPreset: (preset: typeof storyPresets[0]) => void;
  isReadOnly: boolean;
}

export function PresetStories({ selectedPresetId, onApplyPreset, isReadOnly }: PresetStoriesProps) {
  const t = useTranslations();

  return (
    <div className="border-t border-border pt-4 mt-4">
      <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
        <Clapperboard className="w-4 h-4 text-purple-400" />
        Preset Stories
      </h3>
      <div className="flex flex-wrap gap-2">
        {storyPresets.map((preset) => (
          <button
            key={preset.id}
            onClick={() => !isReadOnly && onApplyPreset(preset)}
            disabled={isReadOnly}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border-2 ${
              selectedPresetId === preset.id
                ? 'border-purple-500 bg-purple-500/20 text-purple-600 dark:text-purple-300'
                : 'border-border bg-background hover:border-purple-500/50 hover:bg-purple-500/5 text-foreground'
            }`}
          >
            <preset.icon className="w-3 h-3" />
            <span>{preset.title}</span>
            {selectedPresetId === preset.id && (
              <Check className="w-3 h-3 ml-0.5" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
