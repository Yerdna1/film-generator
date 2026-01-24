'use client';

import {
  FileJson,
  FileText,
  Scissors,
  Download,
  Archive,
  ImageDown,
  VideoIcon,
  Music,
  MessageSquareText,
  FileDown,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import type { ExportHandlers, ProjectStats } from '../../export/types';

interface DownloadTabProps {
  exportHandlers: ExportHandlers;
  stats: ProjectStats;
  downloadingImages?: boolean;
  downloadingVideos?: boolean;
  downloadingAudio?: boolean;
  downloadingAll?: boolean;
  onDownloadImages?: () => Promise<void>;
  onDownloadVideos?: () => Promise<void>;
  onDownloadAudio?: () => Promise<void>;
  onDownloadDialogues?: () => void;
  onDownloadAll?: () => Promise<void>;
}

export function DownloadTab({
  exportHandlers,
  stats,
  downloadingImages = false,
  downloadingVideos = false,
  downloadingAudio = false,
  downloadingAll = false,
  onDownloadImages,
  onDownloadVideos,
  onDownloadAudio,
  onDownloadDialogues,
  onDownloadAll,
}: DownloadTabProps) {
  const t = useTranslations();

  return (
    <div className="space-y-4">
      {/* Export Formats Section */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Export Formats
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={exportHandlers.handleExportJSON}
            className="flex items-center gap-2 p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 transition-all"
          >
            <FileJson className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-blue-600 dark:text-blue-400">JSON</span>
          </button>
          <button
            onClick={exportHandlers.handleExportMarkdown}
            className="flex items-center gap-2 p-2.5 rounded-lg bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 transition-all"
          >
            <FileText className="w-4 h-4 text-green-400" />
            <span className="text-xs text-green-600 dark:text-green-400">Markdown</span>
          </button>
          <button
            onClick={exportHandlers.handleExportText}
            className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-all"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-amber-600 dark:text-amber-400">Text</span>
          </button>
          <button
            onClick={exportHandlers.handleExportCapCut}
            className="flex items-center gap-2 p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 transition-all"
          >
            <Scissors className="w-4 h-4 text-cyan-400" />
            <span className="text-xs text-cyan-600 dark:text-cyan-400">CapCut</span>
          </button>
        </div>
      </div>

      {/* Download Assets Section */}
      {(onDownloadImages || onDownloadVideos || onDownloadAudio || onDownloadDialogues || onDownloadAll) && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Download Assets
          </p>
          <div className="grid grid-cols-2 gap-2">
            {onDownloadImages && (
              <Button
                onClick={onDownloadImages}
                disabled={downloadingImages || (stats.scenesWithImages === 0 && stats.charactersWithImages === 0)}
                variant="outline"
                className="h-auto py-2.5 flex flex-col items-center gap-1.5 border-purple-500/30 hover:bg-purple-500/10 hover:border-purple-500/50"
              >
                {downloadingImages ? (
                  <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                ) : (
                  <ImageDown className="w-4 h-4 text-purple-400" />
                )}
                <span className="text-[10px]">Images</span>
                <span className="text-[9px] text-muted-foreground">
                  {stats.scenesWithImages + stats.charactersWithImages}
                </span>
              </Button>
            )}
            {onDownloadVideos && (
              <Button
                onClick={onDownloadVideos}
                disabled={downloadingVideos || stats.scenesWithVideos === 0}
                variant="outline"
                className="h-auto py-2.5 flex flex-col items-center gap-1.5 border-orange-500/30 hover:bg-orange-500/10 hover:border-orange-500/50"
              >
                {downloadingVideos ? (
                  <Loader2 className="w-4 h-4 text-orange-400 animate-spin" />
                ) : (
                  <VideoIcon className="w-4 h-4 text-orange-400" />
                )}
                <span className="text-[10px]">Videos</span>
                <span className="text-[9px] text-muted-foreground">{stats.scenesWithVideos}</span>
              </Button>
            )}
            {onDownloadAudio && (
              <Button
                onClick={onDownloadAudio}
                disabled={downloadingAudio || stats.dialogueLinesWithAudio === 0}
                variant="outline"
                className="h-auto py-2.5 flex flex-col items-center gap-1.5 border-violet-500/30 hover:bg-violet-500/10 hover:border-violet-500/50"
              >
                {downloadingAudio ? (
                  <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
                ) : (
                  <Music className="w-4 h-4 text-violet-400" />
                )}
                <span className="text-[10px]">Audio</span>
                <span className="text-[9px] text-muted-foreground">{stats.dialogueLinesWithAudio}</span>
              </Button>
            )}
            {onDownloadDialogues && (
              <Button
                onClick={onDownloadDialogues}
                disabled={stats.totalDialogueLines === 0}
                variant="outline"
                className="h-auto py-2.5 flex flex-col items-center gap-1.5 border-cyan-500/30 hover:bg-cyan-500/10 hover:border-cyan-500/50"
              >
                <MessageSquareText className="w-4 h-4 text-cyan-400" />
                <span className="text-[10px]">Dialogues</span>
                <span className="text-[9px] text-muted-foreground">{stats.totalDialogueLines}</span>
              </Button>
            )}
            {onDownloadAll && (
              <Button
                onClick={onDownloadAll}
                disabled={downloadingAll}
                className="h-auto py-2.5 flex flex-col items-center gap-1.5 col-span-2 bg-gradient-to-br from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white border-0"
              >
                {downloadingAll ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileDown className="w-4 h-4" />
                )}
                <span className="text-[10px]">All Assets</span>
                <span className="text-[9px] text-white/70">Complete ZIP</span>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
