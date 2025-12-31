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
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Video } from 'lucide-react';
import { DraggableSceneClip } from './DraggableSceneClip';
import type { Scene } from '@/types/project';

interface VideoTrackProps {
  scenes: Scene[];
  pixelsPerScene: number;
  scrollLeft: number;
  selectedSceneId: string | null;
  onSelectScene: (sceneId: string) => void;
  onReorderScenes: (activeId: string, overId: string) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}

export function VideoTrack({
  scenes,
  pixelsPerScene,
  scrollLeft,
  selectedSceneId,
  onSelectScene,
  onReorderScenes,
  onDragStart,
  onDragEnd,
}: VideoTrackProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Prevent accidental drags
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

    onDragEnd();
  };

  const clipWidth = pixelsPerScene - 4; // 4px gap

  return (
    <div className="flex border-b border-white/10 h-14">
      {/* Track label */}
      <div className="w-20 flex-shrink-0 px-2 py-1 border-r border-white/10 flex items-center gap-1.5 bg-orange-500/10">
        <Video className="w-3.5 h-3.5 text-orange-400" />
        <span className="text-[11px] font-medium text-orange-400">Video</span>
      </div>

      {/* Track content */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden h-full">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={onDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={scenes.map(s => s.id)}
            strategy={horizontalListSortingStrategy}
          >
            <div
              className="flex gap-1 h-full py-1 px-1"
              style={{ width: scenes.length * pixelsPerScene }}
            >
              {scenes.map((scene, index) => (
                <DraggableSceneClip
                  key={scene.id}
                  scene={scene}
                  index={index}
                  width={clipWidth}
                  isSelected={selectedSceneId === scene.id}
                  onSelect={onSelectScene}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}
