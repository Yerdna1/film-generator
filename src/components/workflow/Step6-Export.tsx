'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Download } from 'lucide-react';
import { useProjectStore } from '@/lib/stores/project-store';
import type { Project } from '@/types/project';

// Hooks
import {
  useProjectStats,
  usePreviewPlayer,
  useExportHandlers,
  useDownloadHandlers,
  useCaptionEditor,
  useBackgroundMusic,
} from './export/hooks';

// Components
import {
  ProjectSummaryCard,
  MoviePreview,
  TimelineView,
  CreditsSummary,
  ExportOptions,
  DownloadAssets,
  PromptsPreview,
  NextSteps,
  CaptionEditor,
  BackgroundMusicEditor,
} from './export/components';

interface Step6Props {
  project: Project;
}

export function Step6Export({ project: initialProject }: Step6Props) {
  const t = useTranslations();
  const { projects } = useProjectStore();

  // Get live project data from store
  const project = projects.find((p) => p.id === initialProject.id) || initialProject;

  // Custom hooks
  const { stats, credits } = useProjectStats(project);
  const previewPlayer = usePreviewPlayer(project);
  const exportHandlers = useExportHandlers(project);
  const downloadHandlers = useDownloadHandlers(project);
  const captionEditor = useCaptionEditor(project);
  const backgroundMusic = useBackgroundMusic(project);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 mb-4"
        >
          <Download className="w-8 h-8 text-green-400" />
        </motion.div>
        <h2 className="text-2xl font-bold mb-2">{t('steps.export.title')}</h2>
        <p className="text-muted-foreground">{t('steps.export.description')}</p>
      </div>

      {/* Project Summary Card */}
      <ProjectSummaryCard project={project} stats={stats} />

      {/* Movie Preview */}
      {stats.totalScenes > 0 && (
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
      )}

      {/* Timeline View */}
      <TimelineView project={project} stats={stats} />

      {/* Caption Editor */}
      {stats.totalScenes > 0 && (
        <CaptionEditor
          project={project}
          selectedSceneIndex={captionEditor.selectedSceneIndex}
          editingCaption={captionEditor.editingCaption}
          isEditing={captionEditor.isEditing}
          sceneCaptions={captionEditor.sceneCaptions}
          hasUnsavedChanges={captionEditor.hasUnsavedChanges}
          onSetSelectedSceneIndex={captionEditor.setSelectedSceneIndex}
          onStartEditingCaption={captionEditor.startEditingCaption}
          onStartNewCaption={captionEditor.startNewCaption}
          onCancelEditing={captionEditor.cancelEditing}
          onSaveCaption={captionEditor.saveCaption}
          onDeleteCaption={captionEditor.deleteCaption}
          onUpdateCaptionField={captionEditor.updateCaptionField}
          onUpdateCaptionStyle={captionEditor.updateCaptionStyle}
          onAutoGenerateCaptions={captionEditor.autoGenerateCaptions}
          onAutoGenerateAllCaptions={captionEditor.autoGenerateAllCaptions}
          onClearAllCaptions={captionEditor.clearAllCaptions}
          onClearAllScenesCaptions={captionEditor.clearAllScenesCaptions}
        />
      )}

      {/* Background Music Editor */}
      <BackgroundMusicEditor
        project={project}
        currentMusic={backgroundMusic.currentMusic}
        hasMusic={backgroundMusic.hasMusic}
        generationState={backgroundMusic.generationState}
        previewUrl={backgroundMusic.previewUrl}
        isPreviewPlaying={backgroundMusic.isPreviewPlaying}
        previewRef={backgroundMusic.previewRef}
        prompt={backgroundMusic.prompt}
        model={backgroundMusic.model}
        instrumental={backgroundMusic.instrumental}
        onSetPrompt={backgroundMusic.setPrompt}
        onSetModel={backgroundMusic.setModel}
        onSetInstrumental={backgroundMusic.setInstrumental}
        onGenerateMusic={backgroundMusic.generateMusic}
        onCancelGeneration={backgroundMusic.cancelGeneration}
        onApplyPreviewToProject={backgroundMusic.applyPreviewToProject}
        onRemoveMusic={backgroundMusic.removeMusic}
        onUploadMusic={backgroundMusic.uploadMusic}
        onTogglePreview={backgroundMusic.togglePreview}
        onClearPreview={backgroundMusic.clearPreview}
      />

      {/* Credits Summary */}
      <CreditsSummary credits={credits} />

      {/* Export Options */}
      <ExportOptions
        onExportJSON={exportHandlers.handleExportJSON}
        onExportMarkdown={exportHandlers.handleExportMarkdown}
        onExportText={exportHandlers.handleExportText}
        onExportCapCut={exportHandlers.handleExportCapCut}
      />

      {/* Download Assets */}
      <DownloadAssets
        stats={stats}
        downloadingImages={downloadHandlers.downloadingImages}
        downloadingVideos={downloadHandlers.downloadingVideos}
        downloadingAudio={downloadHandlers.downloadingAudio}
        downloadingAll={downloadHandlers.downloadingAll}
        onDownloadImages={downloadHandlers.handleDownloadImages}
        onDownloadVideos={downloadHandlers.handleDownloadVideos}
        onDownloadAudio={downloadHandlers.handleDownloadAudio}
        onDownloadDialogues={downloadHandlers.handleDownloadDialogues}
        onDownloadAll={downloadHandlers.handleDownloadAll}
      />

      {/* Prompts Preview */}
      <PromptsPreview project={project} getFullMarkdown={exportHandlers.getFullMarkdown} />

      {/* Next Steps */}
      <NextSteps
        overallProgress={stats.overallProgress}
        onExportMarkdown={exportHandlers.handleExportMarkdown}
      />
    </div>
  );
}
