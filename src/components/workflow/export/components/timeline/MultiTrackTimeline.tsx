'use client';

import { useRef, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { TimelineHeader } from './TimelineHeader';
import { Playhead } from './Playhead';
import { VideoTrack } from './tracks/VideoTrack';
import { AudioTrack } from './tracks/AudioTrack';
import { MusicTrack } from './tracks/MusicTrack';
import { CaptionTrack } from './tracks/CaptionTrack';
import type { Project, TransitionType } from '@/types/project';
import type { UseTimelineEditorReturn } from '../../hooks/useTimelineEditor';

interface MultiTrackTimelineProps {
  project: Project;
  currentTime: number;
  timelineEditor: UseTimelineEditorReturn;
  onSeek?: (time: number) => void;
}

const SCENE_DURATION = 6; // seconds

export function MultiTrackTimeline({
  project,
  currentTime,
  timelineEditor,
  onSeek,
}: MultiTrackTimelineProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const {
    zoom,
    setZoom,
    zoomIn,
    zoomOut,
    scrollLeft,
    setScrollLeft,
    pixelsPerScene,
    selectedSceneId,
    selectedCaptionId,
    selectScene,
    selectCaption,
    setDragging,
    reorderScenes,
    resizeCaption,
    trimMusic,
  } = timelineEditor;

  const totalDuration = project.scenes.length * SCENE_DURATION;
  const pixelsPerSecond = zoom;

  // Handle horizontal scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    setScrollLeft(target.scrollLeft);
  }, [setScrollLeft]);

  // Handle click on timeline to seek
  const handleTimelineClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!onSeek) return;
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    const x = e.clientX - rect.left + scrollLeft - 80; // 80px = track labels width (w-20)
    const time = Math.max(0, Math.min(x / pixelsPerSecond, totalDuration));
    onSeek(time);
  }, [onSeek, scrollLeft, pixelsPerSecond, totalDuration]);

  // Sync scroll position
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = scrollLeft;
    }
  }, [scrollLeft]);

  // Handle caption selection with scene context
  const handleSelectCaption = useCallback((captionId: string, sceneId: string) => {
    selectCaption(captionId);
    selectScene(sceneId);
  }, [selectCaption, selectScene]);

  // Handle caption resize
  const handleResizeCaption = useCallback((
    captionId: string,
    sceneId: string,
    startTime: number,
    endTime: number
  ) => {
    resizeCaption(captionId, sceneId, startTime, endTime);
  }, [resizeCaption]);

  const tracksHeight = 56 + 28 + 28 + 28; // video (h-14=56px) + audio + music + captions

  return (
    <Card className="glass border-white/10 overflow-hidden">
      <TimelineHeader
        totalDuration={totalDuration}
        zoom={zoom}
        scrollLeft={scrollLeft}
        onZoomChange={setZoom}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        compact
      />

      <div
        ref={scrollContainerRef}
        className="relative overflow-x-auto overflow-y-hidden"
        onScroll={handleScroll}
        onClick={handleTimelineClick}
      >
        {/* Playhead */}
        <Playhead
          currentTime={currentTime}
          zoom={zoom}
          height={tracksHeight}
          scrollLeft={scrollLeft}
        />

        {/* Tracks */}
        <div className="min-w-max">
          <VideoTrack
            scenes={project.scenes}
            pixelsPerScene={pixelsPerScene}
            scrollLeft={scrollLeft}
            selectedSceneId={selectedSceneId}
            onSelectScene={selectScene}
            onReorderScenes={reorderScenes}
            onDragStart={() => setDragging(true, 'scene')}
            onDragEnd={() => setDragging(false, null)}
          />

          <AudioTrack
            scenes={project.scenes}
            pixelsPerScene={pixelsPerScene}
            scrollLeft={scrollLeft}
          />

          <MusicTrack
            music={project.backgroundMusic}
            totalDuration={totalDuration}
            pixelsPerSecond={pixelsPerSecond}
            scrollLeft={scrollLeft}
            onTrimMusic={trimMusic}
          />

          <CaptionTrack
            scenes={project.scenes}
            pixelsPerScene={pixelsPerScene}
            pixelsPerSecond={pixelsPerSecond}
            scrollLeft={scrollLeft}
            selectedCaptionId={selectedCaptionId}
            onSelectCaption={handleSelectCaption}
            onResizeCaption={handleResizeCaption}
          />
        </div>
      </div>

      {/* Timeline legend - compact */}
      <div className="flex items-center gap-3 px-3 py-1.5 border-t border-white/10 bg-black/20">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded bg-green-500/50 border border-green-500" />
          <span className="text-[9px] text-muted-foreground">Video</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded bg-amber-500/50 border border-amber-500" />
          <span className="text-[9px] text-muted-foreground">Image</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded bg-violet-500/50" />
          <span className="text-[9px] text-muted-foreground">Audio</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded bg-purple-500/40 border border-purple-500/50" />
          <span className="text-[9px] text-muted-foreground">Music</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded bg-yellow-500/40 border border-yellow-500/50" />
          <span className="text-[9px] text-muted-foreground">Caption</span>
        </div>
        <div className="ml-auto text-[9px] text-muted-foreground">
          Drag scenes to reorder
        </div>
      </div>
    </Card>
  );
}
