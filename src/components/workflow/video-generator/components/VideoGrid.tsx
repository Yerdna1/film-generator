import { SceneVideoCard } from '../components';
import type { Project, Scene } from '@/types/project';

interface VideoGridProps {
  project: Project;
  scenes: Scene[];
  paginatedScenes: Scene[];
  startIndex: number;
  selectedScenes: Set<string>;
  playingVideo: string | null;
  pendingVideoRegenSceneIds: Set<string>;
  pendingDeletionSceneIds: Set<string>;
  approvedRegenBySceneId: Map<string, any>;
  canDeleteDirectly: boolean;
  isReadOnly: boolean;
  isAuthenticated: boolean;
  videoStates: Record<string, any>;
  videoBlobCache: React.RefObject<Map<string, string>>;

  // Callbacks
  getSceneStatus: (sceneId: string) => any;
  getCachedVideoUrl: (url: string) => string | undefined;
  buildFullI2VPrompt: (scene: Scene) => string;
  onToggleSelect: (sceneId: string) => void;
  onPlay: (sceneId: string) => void;
  onPause: () => void;
  onGenerateVideo: (scene: Scene) => void;
  onDeletionRequested: () => void;
  onUseRegenerationAttempt: (requestId: string) => Promise<void>;
  onSelectRegeneration: (requestId: string, selectedUrl: string) => Promise<void>;
}

export function VideoGrid({
  project,
  scenes,
  paginatedScenes,
  startIndex,
  selectedScenes,
  playingVideo,
  pendingVideoRegenSceneIds,
  pendingDeletionSceneIds,
  approvedRegenBySceneId,
  canDeleteDirectly,
  isReadOnly,
  isAuthenticated,
  videoStates,
  videoBlobCache,
  getSceneStatus,
  getCachedVideoUrl,
  buildFullI2VPrompt,
  onToggleSelect,
  onPlay,
  onPause,
  onGenerateVideo,
  onDeletionRequested,
  onUseRegenerationAttempt,
  onSelectRegeneration,
}: VideoGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
      {paginatedScenes.map((scene, index) => {
        const status = getSceneStatus(scene.id);
        const progress = 0; // Progress is now tracked by Inngest jobs
        const actualIndex = startIndex + index;
        const cachedVideoUrl = scene.videoUrl
          ? getCachedVideoUrl(scene.videoUrl)
          : undefined;

        // Find the index of this scene among scenes that have videos (for auth restriction)
        const scenesWithVideosSorted = scenes
          .filter(s => s.videoUrl)
          .sort((a, b) => (a.number || 0) - (b.number || 0));
        const videoIndex = scenesWithVideosSorted.findIndex(s => s.id === scene.id);
        const isFirstVideo = videoIndex === 0;

        return (
          <SceneVideoCard
            key={scene.id}
            scene={scene}
            index={actualIndex}
            projectId={project.id}
            status={status}
            progress={progress}
            isPlaying={playingVideo === scene.id}
            cachedVideoUrl={cachedVideoUrl}
            isSelected={selectedScenes.has(scene.id)}
            hasPendingRegeneration={pendingVideoRegenSceneIds.has(scene.id)}
            hasPendingDeletion={pendingDeletionSceneIds.has(scene.id)}
            approvedRegeneration={approvedRegenBySceneId.get(scene.id) || null}
            canDeleteDirectly={canDeleteDirectly}
            isReadOnly={isReadOnly}
            isAuthenticated={isAuthenticated}
            isFirstVideo={isFirstVideo}
            onToggleSelect={() => onToggleSelect(scene.id)}
            onPlay={() => onPlay(scene.id)}
            onPause={onPause}
            onGenerateVideo={() => onGenerateVideo(scene)}
            buildFullI2VPrompt={buildFullI2VPrompt}
            onDeletionRequested={onDeletionRequested}
            onUseRegenerationAttempt={onUseRegenerationAttempt}
            onSelectRegeneration={onSelectRegeneration}
          />
        );
      })}
    </div>
  );
}
