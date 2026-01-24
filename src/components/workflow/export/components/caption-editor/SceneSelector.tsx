import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { Project } from '@/types/project';

interface SceneSelectorProps {
  project: Project;
  selectedSceneIndex: number;
  onSelectScene: (index: number) => void;
  compact?: boolean;
}

export function SceneSelector({
  project,
  selectedSceneIndex,
  onSelectScene,
  compact = false,
}: SceneSelectorProps) {
  const displayScenes = compact ? project.scenes.slice(0, 10) : project.scenes;

  return (
    <div className={cn('flex gap-1 overflow-x-auto', compact ? 'pb-1' : 'pb-2')}>
      {displayScenes.map((scene, index) => {
        const captionCount = scene.captions?.length || 0;
        const thumbnailSize = compact ? 'w-10 h-7' : 'w-16 h-12';
        const borderStyle = compact
          ? index === selectedSceneIndex
            ? 'border-yellow-500'
            : 'border-white/10 hover:border-white/30'
          : index === selectedSceneIndex
            ? 'border-yellow-500 ring-2 ring-yellow-500/30'
            : 'border-white/10 hover:border-white/30';

        return (
          <button
            key={scene.id}
            onClick={() => onSelectScene(index)}
            className={cn(
              'flex-shrink-0 rounded overflow-hidden border-2 transition-all relative',
              thumbnailSize,
              borderStyle
            )}
          >
            {scene.imageUrl ? (
              <img
                src={scene.imageUrl}
                alt={scene.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-white/5 flex items-center justify-center">
                <span
                  className={cn(
                    'text-muted-foreground',
                    compact ? 'text-[8px]' : 'text-[10px]'
                  )}
                >
                  {index + 1}
                </span>
              </div>
            )}
            {captionCount > 0 && (
              <span
                className={cn(
                  'absolute flex items-center justify-center text-black font-bold bg-yellow-500',
                  compact
                    ? '-top-0.5 -right-0.5 h-3 w-3 rounded-full text-[8px]'
                    : '-top-1 -right-1 h-4 w-4 p-0 rounded text-[9px]'
                )}
              >
                {captionCount}
              </span>
            )}
          </button>
        );
      })}
      {compact && project.scenes.length > 10 && (
        <span className="text-[10px] text-muted-foreground self-center px-1">
          +{project.scenes.length - 10}
        </span>
      )}
    </div>
  );
}
