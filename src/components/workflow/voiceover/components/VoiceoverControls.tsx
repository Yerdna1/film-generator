'use client';

import { Mic, Volume2, VolumeX } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import type { VoiceProvider, VoiceLanguage, Character } from '@/types/project';
import { ProviderSelector, VoiceSettingsDialog, VoiceoverProgress } from '../../voiceover-generator/components';
import type { VoiceOption } from '../../voiceover-generator/types';

interface VoiceoverControlsProps {
  voiceSettings: {
    provider: VoiceProvider;
    language: VoiceLanguage;
  };
  voices: VoiceOption[];
  characters: Character[];
  volume: number[];
  showVoiceSettings: boolean;
  generatedCount: number;
  totalCount: number;
  remainingCount: number;
  totalCharacters: number;
  isGeneratingAll: boolean;
  isPlayingAll: boolean;
  availableVersions: Array<{ provider: VoiceProvider; language: VoiceLanguage; count: number }>;
  isReadOnly: boolean;
  t: any; // Translation function
  onProviderChange: (provider: VoiceProvider) => void;
  onLanguageChange: (language: VoiceLanguage) => void;
  onVoiceChange: (characterId: string, voiceId: string) => void;
  onVoiceSettingsChange: (characterId: string, settings: any) => void;
  onSetVolume: (volume: number[]) => void;
  onSetShowVoiceSettings: (show: boolean) => void;
  onGenerateAll: () => void;
  onDownloadAll: () => void;
  onDeleteAll: () => void;
  onPlayAll: () => void;
  onStopPlayback: () => void;
  onSwitchAllToProvider: (provider: VoiceProvider, language: VoiceLanguage) => void;
}

export function VoiceoverControls({
  voiceSettings,
  voices,
  characters,
  volume,
  showVoiceSettings,
  generatedCount,
  totalCount,
  remainingCount,
  totalCharacters,
  isGeneratingAll,
  isPlayingAll,
  availableVersions,
  isReadOnly,
  t,
  onProviderChange,
  onLanguageChange,
  onVoiceChange,
  onVoiceSettingsChange,
  onSetVolume,
  onSetShowVoiceSettings,
  onGenerateAll,
  onDownloadAll,
  onDeleteAll,
  onPlayAll,
  onStopPlayback,
  onSwitchAllToProvider,
}: VoiceoverControlsProps) {
  return (
    <div className="glass rounded-2xl p-4 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Mic className="w-5 h-5 text-violet-400 shrink-0" />
          {!isReadOnly ? (
            <ProviderSelector
              provider={voiceSettings.provider}
              language={voiceSettings.language}
              onProviderChange={onProviderChange}
              onLanguageChange={onLanguageChange}
            />
          ) : (
            <span className="text-sm font-medium">{voiceSettings.provider} ({voiceSettings.language})</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:gap-4 w-full sm:w-auto justify-start sm:justify-end">
          {!isReadOnly && (
            <VoiceSettingsDialog
              open={showVoiceSettings}
              onOpenChange={onSetShowVoiceSettings}
              characters={characters}
              voices={voices}
              provider={voiceSettings.provider}
              onVoiceChange={onVoiceChange}
              onVoiceSettingsChange={onVoiceSettingsChange}
            />
          )}

          {/* Volume Control */}
          <div className="flex items-center gap-2">
            {volume[0] === 0 ? (
              <VolumeX className="w-4 h-4 text-muted-foreground shrink-0" />
            ) : (
              <Volume2 className="w-4 h-4 text-muted-foreground shrink-0" />
            )}
            <Slider
              value={volume}
              onValueChange={onSetVolume}
              max={100}
              step={1}
              className="w-20 sm:w-24"
            />
          </div>
        </div>
      </div>

      {/* Progress & Actions - only for editors */}
      {!isReadOnly && (
        <VoiceoverProgress
          generatedCount={generatedCount}
          totalCount={totalCount}
          remainingCount={remainingCount}
          totalCharacters={totalCharacters}
          isGeneratingAll={isGeneratingAll}
          isPlayingAll={isPlayingAll}
          provider={voiceSettings.provider}
          language={voiceSettings.language}
          availableVersions={availableVersions}
          onGenerateAll={onGenerateAll}
          onDownloadAll={onDownloadAll}
          onDeleteAll={onDeleteAll}
          onPlayAll={onPlayAll}
          onStopPlayback={onStopPlayback}
          onSwitchAllToProvider={onSwitchAllToProvider}
        />
      )}
    </div>
  );
}