'use client';

import {
  X,
  Loader2,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import type { useVideoComposer } from '../../export/hooks';

interface CompositionStatusProps {
  videoComposer: ReturnType<typeof useVideoComposer>;
}

export function CompositionStatus({ videoComposer }: CompositionStatusProps) {
  const t = useTranslations();

  return (
    <>
      {/* Composition Status */}
      {videoComposer.compositionState.isComposing && (
        <div className="p-3 rounded-lg border border-cyan-500/30 bg-cyan-500/5">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-cyan-500 animate-spin" />
            <div className="flex-1">
              <p className="text-sm font-medium">{videoComposer.compositionState.phase || t('steps.export.rendering')}</p>
              <div className="mt-2 h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-teal-500 transition-all"
                  style={{ width: `${videoComposer.compositionState.progress}%` }}
                />
              </div>
            </div>
            <button
              onClick={videoComposer.cancelComposition}
              className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Composition Error */}
      {videoComposer.compositionState.status === 'error' && (
        <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/5">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <p className="text-sm text-red-600 dark:text-red-400">{videoComposer.compositionState.error}</p>
          </div>
        </div>
      )}

      {/* Composition Result */}
      {videoComposer.result && (
        <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
              Render complete! {Math.round(videoComposer.result.duration)}s
            </p>
          </div>
          <div className="flex gap-2">
            {(videoComposer.result.videoUrl || videoComposer.result.videoBase64) && (
              <button
                onClick={() => videoComposer.downloadResult('video')}
                disabled={videoComposer.isDownloading}
                className="flex-1 py-2 rounded-md text-xs font-medium text-white bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 transition-all disabled:opacity-50 disabled:cursor-wait"
              >
                {videoComposer.isDownloading ? 'Downloading...' : 'Download MP4'}
              </button>
            )}
            {(videoComposer.result.draftUrl || videoComposer.result.draftBase64) && (
              <button
                onClick={() => videoComposer.downloadResult('draft')}
                className="flex-1 py-2 rounded-md text-xs font-medium border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/10 transition-all"
              >
                CapCut Draft
              </button>
            )}
            {videoComposer.result.srtContent && (
              <button
                onClick={() => videoComposer.downloadResult('srt')}
                className="py-2 px-3 rounded-md text-xs font-medium border border-yellow-500/30 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500/10 transition-all"
              >
                SRT
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
