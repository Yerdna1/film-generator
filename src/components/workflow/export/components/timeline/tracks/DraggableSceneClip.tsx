'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import { Play, Image as ImageIcon, GripVertical } from 'lucide-react';
import type { Scene } from '@/types/project';

interface DraggableSceneClipProps {
  scene: Scene;
  index: number;
  width: number;
  isSelected: boolean;
  onSelect: (sceneId: string) => void;
}

export function DraggableSceneClip({
  scene,
  index,
  width,
  isSelected,
  onSelect,
}: DraggableSceneClipProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: scene.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    width,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      className={`
        relative flex-shrink-0 h-full rounded-lg overflow-hidden cursor-pointer
        border-2 transition-all
        ${isDragging ? 'opacity-50 z-50 shadow-xl' : ''}
        ${isSelected
          ? 'border-cyan-500 ring-2 ring-cyan-500/30'
          : scene.videoUrl
            ? 'border-green-500/50 hover:border-green-500'
            : scene.imageUrl
              ? 'border-amber-500/50 hover:border-amber-500'
              : 'border-white/10 hover:border-white/30'
        }
      `}
      onClick={() => onSelect(scene.id)}
      whileHover={{ scale: isDragging ? 1 : 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-0.5 left-0.5 z-10 p-0.5 rounded bg-black/60 cursor-grab active:cursor-grabbing hover:bg-black/80"
      >
        <GripVertical className="w-2.5 h-2.5 text-white/80" />
      </div>

      {/* Media content - use imageUrl for thumbnail */}
      {scene.imageUrl ? (
        <img
          src={scene.imageUrl}
          alt={scene.title}
          className={`w-full h-full object-cover ${scene.videoUrl ? '' : 'opacity-80'}`}
        />
      ) : (
        <div className="w-full h-full bg-white/5 flex items-center justify-center">
          <ImageIcon className="w-8 h-8 text-muted-foreground/30" />
        </div>
      )}

      {/* Scene info overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-1 py-0.5">
        <p className="text-[9px] text-white font-medium truncate">
          {scene.number || index + 1}. {scene.title}
        </p>
      </div>

      {/* Video indicator */}
      {scene.videoUrl && (
        <div className="absolute top-0.5 right-0.5 p-0.5 rounded bg-green-500/80">
          <Play className="w-2 h-2 text-white fill-white" />
        </div>
      )}

      {/* Transition indicator (on right edge) */}
      {scene.transition && scene.transition.type !== 'none' && (
        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-20">
          <div className="w-3 h-3 rotate-45 bg-purple-500 border border-white/30 flex items-center justify-center">
            <span className="text-[6px] text-white -rotate-45 font-bold">
              {scene.transition.type.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );
}
