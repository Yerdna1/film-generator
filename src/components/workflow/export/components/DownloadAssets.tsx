'use client';

import { useTranslations } from 'next-intl';
import {
  Archive,
  ImageDown,
  VideoIcon,
  Music,
  MessageSquareText,
  FileDown,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ProjectStats } from '../types';

interface DownloadAssetsProps {
  stats: ProjectStats;
  downloadingImages: boolean;
  downloadingVideos: boolean;
  downloadingAudio: boolean;
  downloadingAll: boolean;
  onDownloadImages: () => Promise<void>;
  onDownloadVideos: () => Promise<void>;
  onDownloadAudio: () => Promise<void>;
  onDownloadDialogues: () => void;
  onDownloadAll: () => Promise<void>;
  compact?: boolean;
}

export function DownloadAssets({
  stats,
  downloadingImages,
  downloadingVideos,
  downloadingAudio,
  downloadingAll,
  onDownloadImages,
  onDownloadVideos,
  onDownloadAudio,
  onDownloadDialogues,
  onDownloadAll,
  compact = false,
}: DownloadAssetsProps) {
  const t = useTranslations();

  if (compact) {
    return (
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Download</h4>
        <div className="grid grid-cols-3 gap-1.5">
          <Button
            onClick={onDownloadVideos}
            disabled={downloadingVideos || stats.scenesWithVideos === 0}
            variant="outline"
            className="h-auto py-2 px-2 flex-col gap-1 border-white/10 hover:bg-orange-500/10 hover:border-orange-500/30"
          >
            {downloadingVideos ? (
              <Loader2 className="w-4 h-4 text-orange-400 animate-spin" />
            ) : (
              <VideoIcon className="w-4 h-4 text-orange-400" />
            )}
            <span className="text-[10px]">Videos</span>
            <span className="text-[9px] text-muted-foreground">{stats.scenesWithVideos}</span>
          </Button>
          <Button
            onClick={onDownloadAudio}
            disabled={downloadingAudio || stats.dialogueLinesWithAudio === 0}
            variant="outline"
            className="h-auto py-2 px-2 flex-col gap-1 border-white/10 hover:bg-violet-500/10 hover:border-violet-500/30"
          >
            {downloadingAudio ? (
              <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
            ) : (
              <Music className="w-4 h-4 text-violet-400" />
            )}
            <span className="text-[10px]">Audio</span>
            <span className="text-[9px] text-muted-foreground">{stats.dialogueLinesWithAudio}</span>
          </Button>
          <Button
            onClick={onDownloadAll}
            disabled={downloadingAll}
            className="h-auto py-2 px-2 flex-col gap-1 bg-gradient-to-br from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white border-0"
          >
            {downloadingAll ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileDown className="w-4 h-4" />
            )}
            <span className="text-[10px]">All</span>
            <span className="text-[9px] text-white/70">ZIP</span>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card className="glass border-white/10 border-purple-500/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Archive className="w-5 h-5 text-purple-400" />
          {t('steps.export.downloadAssets')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground mb-4">
          {t('steps.export.downloadAssetsDescription')}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <Button
            onClick={onDownloadImages}
            disabled={downloadingImages || (stats.scenesWithImages === 0 && stats.charactersWithImages === 0)}
            variant="outline"
            className="h-auto py-4 flex flex-col items-center gap-2 border-purple-500/30 hover:bg-purple-500/10 hover:border-purple-500/50 disabled:opacity-50"
          >
            {downloadingImages ? (
              <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
            ) : (
              <ImageDown className="w-6 h-6 text-purple-400" />
            )}
            <span className="font-medium">Images</span>
            <span className="text-xs text-muted-foreground">
              {stats.scenesWithImages + stats.charactersWithImages} files
            </span>
          </Button>
          <Button
            onClick={onDownloadVideos}
            disabled={downloadingVideos || stats.scenesWithVideos === 0}
            variant="outline"
            className="h-auto py-4 flex flex-col items-center gap-2 border-orange-500/30 hover:bg-orange-500/10 hover:border-orange-500/50 disabled:opacity-50"
          >
            {downloadingVideos ? (
              <Loader2 className="w-6 h-6 text-orange-400 animate-spin" />
            ) : (
              <VideoIcon className="w-6 h-6 text-orange-400" />
            )}
            <span className="font-medium">Videos</span>
            <span className="text-xs text-muted-foreground">{stats.scenesWithVideos} files</span>
          </Button>
          <Button
            onClick={onDownloadAudio}
            disabled={downloadingAudio || stats.dialogueLinesWithAudio === 0}
            variant="outline"
            className="h-auto py-4 flex flex-col items-center gap-2 border-violet-500/30 hover:bg-violet-500/10 hover:border-violet-500/50 disabled:opacity-50"
          >
            {downloadingAudio ? (
              <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
            ) : (
              <Music className="w-6 h-6 text-violet-400" />
            )}
            <span className="font-medium">Audio</span>
            <span className="text-xs text-muted-foreground">{stats.dialogueLinesWithAudio} files</span>
          </Button>
          <Button
            onClick={onDownloadDialogues}
            disabled={stats.totalDialogueLines === 0}
            variant="outline"
            className="h-auto py-4 flex flex-col items-center gap-2 border-cyan-500/30 hover:bg-cyan-500/10 hover:border-cyan-500/50 disabled:opacity-50"
          >
            <MessageSquareText className="w-6 h-6 text-cyan-400" />
            <span className="font-medium">Dialogues</span>
            <span className="text-xs text-muted-foreground">{stats.totalDialogueLines} lines</span>
          </Button>
          <Button
            onClick={onDownloadAll}
            disabled={downloadingAll}
            className="h-auto py-4 flex flex-col items-center gap-2 bg-gradient-to-br from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white border-0"
          >
            {downloadingAll ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <FileDown className="w-6 h-6" />
            )}
            <span className="font-medium">All Assets</span>
            <span className="text-xs text-white/70">Complete ZIP</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
