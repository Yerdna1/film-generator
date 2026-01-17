import { Card, CardContent } from '@/components/ui/card';
import { MoviePreview } from '../../export/components';
import { Lock } from 'lucide-react';
import type { Project } from '@/types/project';
import type { PreviewPlayerState } from '../../export/hooks/usePreviewPlayer';

interface PreviewSectionProps {
  project: Project;
  stats: {
    totalScenes: number;
  };
  isAuthenticated: boolean;
  previewPlayer: PreviewPlayerState;
}

export function PreviewSection({ project, stats, isAuthenticated, previewPlayer }: PreviewSectionProps) {
  if (stats.totalScenes === 0) return null;

  return (
    <Card className="glass border-white/10 overflow-hidden relative">
      {/* Lock overlay for unauthenticated users */}
      {!isAuthenticated && (
        <div className="absolute inset-0 z-10 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center">
          <Lock className="w-10 h-10 text-white/70 mb-3" />
          <p className="text-base text-white/80">Sign in to play movie</p>
          <a href="/auth/register" className="mt-3 px-5 py-2 rounded-full bg-orange-500 text-white text-sm font-medium hover:bg-orange-400 transition-colors">
            Sign up free
          </a>
        </div>
      )}
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