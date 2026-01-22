import { Card, CardContent } from '@/components/ui/card';
import { MoviePreview } from '../../export/components';
import type { Project } from '@/types/project';
import type { usePreviewPlayer } from '../../export/hooks';

interface PreviewSectionProps {
  project: Project;
  stats: {
    totalScenes: number;
  };
  previewPlayer: ReturnType<typeof usePreviewPlayer>;
}

export function PreviewSection({ project, stats, previewPlayer }: PreviewSectionProps) {
  if (stats.totalScenes === 0) return null;

  return (
    <Card className="glass border-white/10 overflow-hidden relative">
      <CardContent className="p-3">
        <MoviePreview
          project={project}
          isPlaying={previewPlayer.isPlaying}
          currentIndex={previewPlayer.currentIndex}
          progress={previewPlayer.progress}
          volume={previewPlayer.volume}
          isMuted={previewPlayer.isMuted}
          musicVolumeDb={previewPlayer.musicVolumeDb}
          currentCaption={previewPlayer.currentCaption}
          currentMovieTime={previewPlayer.currentMovieTime}
          totalDuration={previewPlayer.totalDuration}
          videoRef={previewPlayer.videoRef}
          musicRef={previewPlayer.musicRef}
          onTogglePlayPause={previewPlayer.togglePlayPause}
          onGoToNext={previewPlayer.goToNext}
          onGoToPrevious={previewPlayer.goToPrevious}
          onJumpToFirst={previewPlayer.jumpToFirst}
          onJumpToLast={previewPlayer.jumpToLast}
          onJumpToScene={previewPlayer.jumpToScene}
          onSeek={previewPlayer.handleSeek}
          onVolumeChange={previewPlayer.handleVolumeChange}
          onToggleMute={previewPlayer.toggleMute}
          onMusicVolumeDbChange={previewPlayer.handleMusicVolumeDbChange}
          onVideoEnded={previewPlayer.handleVideoEnded}
          onVideoTimeUpdate={previewPlayer.handleVideoTimeUpdate}
          onVideoCanPlay={previewPlayer.handleVideoCanPlay}
          getVideoUrl={previewPlayer.getVideoUrl}
        />
      </CardContent>
    </Card>
  );
}