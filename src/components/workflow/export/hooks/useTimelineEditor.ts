'use client';

import { useState, useCallback, useMemo } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import { useProjectStore } from '@/lib/stores/project-store';
import type { Project, Scene, Caption, TransitionType } from '@/types/project';

export interface TimelineEditorState {
  zoom: number; // pixels per second (default 100)
  scrollLeft: number;
  selectedSceneId: string | null;
  selectedCaptionId: string | null;
  selectedTransitionSceneId: string | null;
  isDragging: boolean;
  dragType: 'scene' | 'caption' | 'music' | null;
}

export interface UseTimelineEditorReturn {
  // State
  state: TimelineEditorState;

  // Computed
  pixelsPerScene: number;
  totalTimelineWidth: number;

  // Zoom controls
  zoom: number;
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;

  // Scroll
  scrollLeft: number;
  setScrollLeft: (scrollLeft: number) => void;

  // Selection
  selectedSceneId: string | null;
  selectedCaptionId: string | null;
  selectedTransitionSceneId: string | null;
  selectScene: (sceneId: string | null) => void;
  selectCaption: (captionId: string | null) => void;
  selectTransition: (sceneId: string | null) => void;
  clearSelection: () => void;

  // Drag state
  isDragging: boolean;
  dragType: 'scene' | 'caption' | 'music' | null;
  setDragging: (isDragging: boolean, type: 'scene' | 'caption' | 'music' | null) => void;

  // Scene operations
  reorderScenes: (activeId: string, overId: string) => void;
  updateSceneTransition: (sceneId: string, transitionType: TransitionType) => void;

  // Caption operations
  resizeCaption: (captionId: string, sceneId: string, startTime: number, endTime: number) => void;

  // Music operations
  trimMusic: (startOffset: number, endOffset: number) => void;

  // Utility
  timeToPixels: (time: number) => number;
  pixelsToTime: (pixels: number) => number;
  getSceneAtTime: (time: number) => Scene | null;
}

const MIN_ZOOM = 20; // 20px per second
const MAX_ZOOM = 150; // 150px per second
const ZOOM_STEP = 10;
const SCENE_DURATION = 6; // seconds per scene

export function useTimelineEditor(project: Project): UseTimelineEditorReturn {
  const { updateScene, updateProject } = useProjectStore();

  // Safe accessor for scenes array
  const scenes = project.scenes || [];

  const [state, setState] = useState<TimelineEditorState>({
    zoom: 40,
    scrollLeft: 0,
    selectedSceneId: null,
    selectedCaptionId: null,
    selectedTransitionSceneId: null,
    isDragging: false,
    dragType: null,
  });

  // Computed values
  const pixelsPerScene = useMemo(() => state.zoom * SCENE_DURATION, [state.zoom]);
  const totalTimelineWidth = useMemo(
    () => scenes.length * pixelsPerScene,
    [scenes.length, pixelsPerScene]
  );

  // Zoom controls
  const setZoom = useCallback((zoom: number) => {
    setState(prev => ({
      ...prev,
      zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom)),
    }));
  }, []);

  const zoomIn = useCallback(() => {
    setZoom(state.zoom + ZOOM_STEP);
  }, [state.zoom, setZoom]);

  const zoomOut = useCallback(() => {
    setZoom(state.zoom - ZOOM_STEP);
  }, [state.zoom, setZoom]);

  // Scroll
  const setScrollLeft = useCallback((scrollLeft: number) => {
    setState(prev => ({ ...prev, scrollLeft: Math.max(0, scrollLeft) }));
  }, []);

  // Selection
  const selectScene = useCallback((sceneId: string | null) => {
    setState(prev => ({
      ...prev,
      selectedSceneId: sceneId,
      selectedCaptionId: null,
      selectedTransitionSceneId: null,
    }));
  }, []);

  const selectCaption = useCallback((captionId: string | null) => {
    setState(prev => ({
      ...prev,
      selectedCaptionId: captionId,
      selectedSceneId: null,
      selectedTransitionSceneId: null,
    }));
  }, []);

  const selectTransition = useCallback((sceneId: string | null) => {
    setState(prev => ({
      ...prev,
      selectedTransitionSceneId: sceneId,
      selectedSceneId: null,
      selectedCaptionId: null,
    }));
  }, []);

  const clearSelection = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedSceneId: null,
      selectedCaptionId: null,
      selectedTransitionSceneId: null,
    }));
  }, []);

  // Drag state
  const setDragging = useCallback((isDragging: boolean, type: 'scene' | 'caption' | 'music' | null) => {
    setState(prev => ({ ...prev, isDragging, dragType: type }));
  }, []);

  // Scene operations
  const reorderScenes = useCallback((activeId: string, overId: string) => {
    if (activeId === overId) return;

    const oldIndex = scenes.findIndex(s => s.id === activeId);
    const newIndex = scenes.findIndex(s => s.id === overId);

    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedScenes = arrayMove(scenes, oldIndex, newIndex);

    // Update scene numbers
    const updatedScenes = reorderedScenes.map((scene, index) => ({
      ...scene,
      number: index + 1,
    }));

    // Update project with reordered scenes
    updateProject(project.id, { scenes: updatedScenes });
  }, [scenes, project.id, updateProject]);

  const updateSceneTransition = useCallback((sceneId: string, transitionType: TransitionType) => {
    updateScene(project.id, sceneId, {
      transition: {
        type: transitionType,
        duration: 400,
      },
    });
  }, [project.id, updateScene]);

  // Caption operations
  const resizeCaption = useCallback((
    captionId: string,
    sceneId: string,
    startTime: number,
    endTime: number
  ) => {
    const scene = scenes.find(s => s.id === sceneId);
    if (!scene?.captions) return;

    const updatedCaptions = scene.captions.map(caption =>
      caption.id === captionId
        ? {
            ...caption,
            startTime: Math.max(0, Math.min(startTime, SCENE_DURATION)),
            endTime: Math.max(0, Math.min(endTime, SCENE_DURATION)),
          }
        : caption
    );

    updateScene(project.id, sceneId, { captions: updatedCaptions });
  }, [scenes, project.id, updateScene]);

  // Music operations
  const trimMusic = useCallback((startOffset: number, endOffset: number) => {
    if (!project.backgroundMusic) return;

    updateProject(project.id, {
      backgroundMusic: {
        ...project.backgroundMusic,
        startOffset: Math.max(0, startOffset),
        endOffset: Math.max(0, endOffset),
      },
    });
  }, [project.backgroundMusic, project.id, updateProject]);

  // Utility functions
  const timeToPixels = useCallback((time: number) => {
    return time * state.zoom;
  }, [state.zoom]);

  const pixelsToTime = useCallback((pixels: number) => {
    return pixels / state.zoom;
  }, [state.zoom]);

  const getSceneAtTime = useCallback((time: number): Scene | null => {
    const sceneIndex = Math.floor(time / SCENE_DURATION);
    return scenes[sceneIndex] || null;
  }, [scenes]);

  return {
    state,
    pixelsPerScene,
    totalTimelineWidth,
    zoom: state.zoom,
    setZoom,
    zoomIn,
    zoomOut,
    scrollLeft: state.scrollLeft,
    setScrollLeft,
    selectedSceneId: state.selectedSceneId,
    selectedCaptionId: state.selectedCaptionId,
    selectedTransitionSceneId: state.selectedTransitionSceneId,
    selectScene,
    selectCaption,
    selectTransition,
    clearSelection,
    isDragging: state.isDragging,
    dragType: state.dragType,
    setDragging,
    reorderScenes,
    updateSceneTransition,
    resizeCaption,
    trimMusic,
    timeToPixels,
    pixelsToTime,
    getSceneAtTime,
  };
}
