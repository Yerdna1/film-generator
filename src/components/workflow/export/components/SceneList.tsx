'use client';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Play, Image as ImageIcon, Video, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Scene } from '@/types/project';

interface SceneListProps {
  scenes: Scene[];
  selectedSceneId: string | null;
  onSelectScene: (sceneId: string) => void;
  onReorderScenes: (activeId: string, overId: string) => void;
  onDeleteScene?: (sceneId: string) => void;
}

interface SortableSceneItemProps {
  scene: Scene;
  index: number;
  isSelected: boolean;
  onSelect: (sceneId: string) => void;
  onDelete?: (sceneId: string) => void;
}

function SortableSceneItem({ scene, index, isSelected, onSelect, onDelete }: SortableSceneItemProps) {
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
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete && confirm(`Delete scene "${scene.title}"?`)) {
      onDelete(scene.id);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        group flex items-center gap-1.5 p-1.5 rounded-lg cursor-pointer
        transition-all border
        ${isDragging ? 'opacity-50 z-50 shadow-lg bg-white/10' : ''}
        ${isSelected
          ? 'border-cyan-500 bg-cyan-500/10'
          : 'border-white/10 hover:border-white/20 hover:bg-white/5'
        }
      `}
      onClick={() => onSelect(scene.id)}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="p-0.5 rounded hover:bg-white/10 cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
      </div>

      {/* Thumbnail */}
      <div className="w-12 h-8 rounded overflow-hidden flex-shrink-0 bg-black/30">
        {scene.videoUrl ? (
          <video
            src={scene.videoUrl}
            className="w-full h-full object-cover"
            muted
          />
        ) : scene.imageUrl ? (
          <img
            src={scene.imageUrl}
            alt={scene.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-3 h-3 text-muted-foreground/50" />
          </div>
        )}
      </div>

      {/* Scene info */}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-medium truncate">
          {index + 1}. {scene.title}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          {scene.videoUrl && (
            <span className="flex items-center gap-0.5 text-[9px] text-green-400">
              <Video className="w-2.5 h-2.5" />
            </span>
          )}
          {!scene.videoUrl && scene.imageUrl && (
            <span className="flex items-center gap-0.5 text-[9px] text-amber-400">
              <ImageIcon className="w-2.5 h-2.5" />
            </span>
          )}
          <span className="text-[9px] text-muted-foreground">6s</span>
        </div>
      </div>

      {/* Delete button */}
      {onDelete && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300 hover:bg-red-500/10"
          onClick={handleDelete}
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      )}
    </div>
  );
}

export function SceneList({
  scenes,
  selectedSceneId,
  onSelectScene,
  onReorderScenes,
  onDeleteScene,
}: SceneListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      onReorderScenes(String(active.id), String(over.id));
    }
  };

  if (scenes.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Video className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p className="text-xs">No scenes yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-medium text-muted-foreground">
          {scenes.length} Scenes
        </h4>
        <span className="text-[10px] text-muted-foreground">
          Drag to reorder
        </span>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={scenes.map(s => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-1">
            {scenes.map((scene, index) => (
              <SortableSceneItem
                key={scene.id}
                scene={scene}
                index={index}
                isSelected={selectedSceneId === scene.id}
                onSelect={onSelectScene}
                onDelete={onDeleteScene}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
