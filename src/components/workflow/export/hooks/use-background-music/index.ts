// Main background music hook that combines all sub-hooks

'use client';

import { useCallback } from 'react';
import { useProjectStore } from '@/lib/stores/project-store';
import type { BackgroundMusic } from '@/types/project';
import type { UseBackgroundMusicProps, UseBackgroundMusicReturn } from './types';
import { useMusicForm } from './use-music-form';
import { useMusicGeneration } from './use-music-generation';
import { useMusicPreview } from './use-music-preview';
import { useMusicUpload } from './use-music-upload';

export function useBackgroundMusic(props: UseBackgroundMusicProps): UseBackgroundMusicReturn {
  const { project } = props;
  const { updateProject } = useProjectStore();

  // Form state
  const form = useMusicForm(props);

  // Generation state
  const {
    generationState,
    generateMusic: generateMusicBase,
    cancelGeneration,
    clearGenerationState,
  } = useMusicGeneration();

  // Preview state
  const {
    previewUrl,
    isPreviewPlaying,
    previewRef,
    setPreviewUrl,
    togglePreview,
    clearPreview,
  } = useMusicPreview();

  // Upload handler
  const { uploadMusic: uploadMusicBase } = useMusicUpload();

  // Wrapper for generateMusic that uses form state
  const generateMusic = useCallback(async () => {
    await generateMusicBase(
      form.prompt,
      form.instrumental,
      form.provider,
      project.id,
      setPreviewUrl
    );
  }, [form.prompt, form.instrumental, form.provider, project.id, generateMusicBase, setPreviewUrl]);

  // Apply preview to project
  const applyPreviewToProject = useCallback(() => {
    if (!previewUrl) return;

    const newMusic: BackgroundMusic = {
      id: crypto.randomUUID(),
      title: `Generated: ${form.prompt.slice(0, 50)}...`,
      audioUrl: previewUrl,
      duration: 0, // Will be set when audio loads
      volume: 0.3,
      source: generationState.provider === 'piapi' ? 'suno' : 'suno',
      sunoPrompt: form.prompt,
    };

    updateProject(project.id, { backgroundMusic: newMusic });
    clearPreview();
    clearGenerationState();
    form.setPrompt('');
  }, [
    previewUrl,
    form.prompt,
    project.id,
    updateProject,
    generationState.provider,
    clearPreview,
    clearGenerationState,
    form,
  ]);

  // Remove music from project
  const removeMusic = useCallback(() => {
    updateProject(project.id, { backgroundMusic: undefined, musicVolume: undefined });
  }, [project.id, updateProject]);

  // Wrapper for upload music
  const uploadMusic = useCallback(async (file: File) => {
    await uploadMusicBase(file, project.id, updateProject);
  }, [project.id, updateProject, uploadMusicBase]);

  const currentMusic = project.backgroundMusic || null;
  const hasMusic = !!currentMusic;

  return {
    currentMusic,
    hasMusic,
    generationState,
    previewUrl,
    isPreviewPlaying,
    previewRef,
    prompt: form.prompt,
    setPrompt: form.setPrompt,
    model: form.model,
    setModel: form.setModel,
    instrumental: form.instrumental,
    setInstrumental: form.setInstrumental,
    provider: form.provider,
    setProvider: form.setProvider,
    generateMusic,
    cancelGeneration,
    applyPreviewToProject,
    removeMusic,
    uploadMusic,
    togglePreview,
    clearPreview,
  };
}

// Export types and sub-hooks for external use
export * from './types';
export { useMusicForm } from './use-music-form';
export { useMusicGeneration } from './use-music-generation';
export { useMusicPreview } from './use-music-preview';
export { useMusicUpload } from './use-music-upload';
