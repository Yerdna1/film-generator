'use client';

import {
  Music,
  Pause,
  Play,
  Trash2,
  Sparkles,
  Upload,
  Loader2,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useTranslations } from 'next-intl';
import type { useBackgroundMusic } from '../../export/hooks';

interface BackgroundMusicSectionProps {
  backgroundMusic: ReturnType<typeof useBackgroundMusic>;
  isReadOnly: boolean;
  stats: {
    totalDuration: number;
  };
}

export function BackgroundMusicSection({
  backgroundMusic,
  isReadOnly,
  stats,
}: BackgroundMusicSectionProps) {
  const t = useTranslations();

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
        <Music className="w-3.5 h-3.5" />
        Background Music
      </p>

      {/* Music preview audio element */}
      {backgroundMusic.previewUrl && (
        <audio ref={backgroundMusic.previewRef} src={backgroundMusic.previewUrl} onEnded={backgroundMusic.clearPreview} />
      )}

      {backgroundMusic.hasMusic && backgroundMusic.currentMusic ? (
        // Has music - show player
        <div className="p-2.5 rounded-lg border border-purple-500/30 bg-purple-500/5">
          <div className="flex items-center gap-2.5">
            <button
              onClick={backgroundMusic.togglePreview}
              className="w-9 h-9 rounded-full bg-purple-500/20 hover:bg-purple-500/30 flex items-center justify-center transition-all"
            >
              {backgroundMusic.isPreviewPlaying ? (
                <Pause className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              ) : (
                <Play className="w-4 h-4 text-purple-600 dark:text-purple-400 ml-0.5" />
              )}
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{backgroundMusic.currentMusic.title || 'Background Music'}</p>
              <p className="text-xs text-muted-foreground">
                {backgroundMusic.currentMusic.duration
                  ? `${Math.floor(backgroundMusic.currentMusic.duration / 60)}:${String(
                    Math.floor(backgroundMusic.currentMusic.duration % 60)
                  ).padStart(2, '0')}`
                  : '—'}
              </p>
            </div>
            <button
              onClick={() => {
                if (backgroundMusic.currentMusic?.audioUrl) {
                  const a = document.createElement('a');
                  a.href = backgroundMusic.currentMusic.audioUrl;
                  a.download = `background-music.${backgroundMusic.currentMusic.audioUrl.startsWith('data:audio/mpeg') ? 'mp3' : 'wav'}`;
                  a.click();
                }
              }}
              className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground transition-all"
              title="Download music"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            {!isReadOnly && (
              <button
                onClick={backgroundMusic.removeMusic}
                className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground transition-all"
                title="Remove music"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {backgroundMusic.currentMusic.duration && stats.totalDuration && (
            <p className="text-xs text-muted-foreground mt-2">
              Loop: {Math.ceil(stats.totalDuration / backgroundMusic.currentMusic.duration)}x
            </p>
          )}
        </div>
      ) : (
        // No music - show generate or upload buttons
        !isReadOnly && (
          <div className="flex flex-col gap-3">
            <Textarea
              value={backgroundMusic.prompt}
              onChange={(e) => backgroundMusic.setPrompt(e.target.value)}
              placeholder={t('steps.export.musicPromptPlaceholder')}
              className="min-h-[80px] resize-none"
            />
            <div className="flex gap-2">
              <Button
                onClick={backgroundMusic.generateMusic}
                disabled={backgroundMusic.generationState.isGenerating || !backgroundMusic.prompt.trim()}
                size="sm"
                className="flex-1 bg-purple-500 hover:bg-purple-600"
              >
                {backgroundMusic.generationState.isGenerating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    {t('steps.export.generatingMusic')}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                    {t('steps.export.generateMusic')}
                  </>
                )}
              </Button>
              <div>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) backgroundMusic.uploadMusic(file);
                  }}
                  className="hidden"
                  id="music-upload"
                />
                <label htmlFor="music-upload">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex items-center gap-1.5"
                    asChild
                  >
                    <span>
                      <Upload className="w-3.5 h-3.5" />
                      {t('steps.export.uploadMusic')}
                    </span>
                  </Button>
                </label>
              </div>
            </div>
            {backgroundMusic.generationState.error && (
              <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded p-2">
                {backgroundMusic.generationState.error}
              </div>
            )}
          </div>
        )
      )}

      {/* Preview audio element */}
      {backgroundMusic.previewUrl && (
        <audio
          ref={backgroundMusic.previewRef}
          src={backgroundMusic.previewUrl}
          onEnded={() => backgroundMusic.togglePreview()}
          className="hidden"
        />
      )}
    </div>
  );
}
