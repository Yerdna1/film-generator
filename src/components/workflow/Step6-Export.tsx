'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  ChevronRight,
  ChevronLeft,
  Film,
  Subtitles,
  Music,
  Video,
  Trash2,
  Sparkles,
  Pause,
  Play,
  X,
  Lock,
  Clapperboard,
  Loader2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { useProjectStore } from '@/lib/stores/project-store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Project } from '@/types/project';
import type { ProjectPermissions, ProjectRole } from '@/types/collaboration';

// Hooks
import {
  useProjectStats,
  usePreviewPlayer,
  useExportHandlers,
  useDownloadHandlers,
  useCaptionEditor,
  useBackgroundMusic,
  useTimelineEditor,
  useVideoComposer,
} from './export/hooks';

// Components
import {
  ProjectSummaryCard,
  MoviePreview,
  CaptionEditor,
  BackgroundMusicEditor,
  MultiTrackTimeline,
  SceneList,
} from './export/components';

interface Step6Props {
  project: Project;
  permissions?: ProjectPermissions | null;
  userRole?: ProjectRole | null;
  isReadOnly?: boolean;
  isAuthenticated?: boolean;
}

export function Step6Export({ project: initialProject, isReadOnly = false, isAuthenticated = false }: Step6Props) {
  const t = useTranslations();
  const { projects, deleteScene } = useProjectStore();
  const [sidePanelOpen, setSidePanelOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'scenes' | 'captions' | 'music' | 'render' | 'export'>('scenes');

  // Get live project data from store
  const project = projects.find((p) => p.id === initialProject.id) || initialProject;

  // Custom hooks
  const { stats } = useProjectStats(project);
  const previewPlayer = usePreviewPlayer(project);
  const exportHandlers = useExportHandlers(project);
  const downloadHandlers = useDownloadHandlers(project);
  const captionEditor = useCaptionEditor(project);
  const backgroundMusic = useBackgroundMusic(project);
  const timelineEditor = useTimelineEditor(project);
  const videoComposer = useVideoComposer(project);

  // Handle seek from timeline
  const handleTimelineSeek = (time: number) => {
    const sceneIndex = Math.floor(time / 6); // 6 seconds per scene
    if (sceneIndex !== previewPlayer.currentIndex) {
      previewPlayer.jumpToScene(sceneIndex);
    }
  };

  return (
    <div className="w-full max-w-[1920px] mx-auto space-y-2 px-1">
      {/* Header - Minimal */}
      <div className="flex items-center justify-between py-1">
        <div className="flex items-center gap-2">
          <Film className="w-5 h-5 text-green-500" />
          <h2 className="text-lg font-semibold">{t('steps.export.title')}</h2>
        </div>
        <ProjectSummaryCard project={project} stats={stats} compact />
      </div>

      {/* Sign-in required banner for unauthenticated users */}
      {!isAuthenticated && (
        <a
          href="/auth/register"
          className="flex items-center justify-center gap-3 p-4 rounded-xl bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/20 hover:border-orange-500/40 transition-all"
        >
          <Lock className="w-5 h-5 text-orange-400" />
          <div className="text-center">
            <p className="text-sm font-medium text-orange-400">Sign in to unlock full access</p>
            <p className="text-xs text-muted-foreground">Play movie, modify scenes order, edit captions, download assets</p>
          </div>
          <span className="px-3 py-1 rounded-full bg-orange-500 text-white text-xs font-medium">
            Sign up free
          </span>
        </a>
      )}

      {/* Main Editor Layout */}
      <div className="flex gap-2">
        {/* Preview + Timeline Section */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Movie Preview - Very Compact */}
          {stats.totalScenes > 0 && (
            <Card className="glass border-white/10 overflow-hidden relative">
              {/* Lock overlay for unauthenticated users */}
              {!isAuthenticated && (
                <div className="absolute inset-0 z-10 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center">
                  <Lock className="w-8 h-8 text-white/70 mb-2" />
                  <p className="text-sm text-white/80">Sign in to play movie</p>
                  <a href="/auth/register" className="mt-2 px-4 py-1.5 rounded-full bg-orange-500 text-white text-xs font-medium hover:bg-orange-400 transition-colors">
                    Sign up free
                  </a>
                </div>
              )}
              <CardContent className="p-1.5">
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
                  compact
                />
              </CardContent>
            </Card>
          )}

          {/* Multi-Track Timeline - Always visible */}
          {stats.totalScenes > 0 && (
            <MultiTrackTimeline
              project={project}
              currentTime={previewPlayer.currentMovieTime}
              timelineEditor={timelineEditor}
              onSeek={handleTimelineSeek}
            />
          )}
        </div>

        {/* Side Panel */}
        <AnimatePresence mode="wait">
          {sidePanelOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 340, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-shrink-0 overflow-hidden"
            >
              <Card className="glass border-black/10 dark:border-white/10 h-full">
                <CardContent className="p-0">
                  <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
                    <TabsList className="w-full grid grid-cols-5 rounded-none bg-black/[0.02] dark:bg-white/[0.02] h-11">
                      <TabsTrigger
                        value="scenes"
                        className="rounded-none gap-1 text-xs font-medium data-[state=active]:bg-orange-500/15 data-[state=active]:text-orange-600 dark:data-[state=active]:text-orange-400 data-[state=active]:shadow-none"
                      >
                        <Video className="w-4 h-4" />
                        Scenes
                      </TabsTrigger>
                      <TabsTrigger
                        value="captions"
                        className="rounded-none gap-1 text-xs font-medium data-[state=active]:bg-yellow-500/15 data-[state=active]:text-yellow-600 dark:data-[state=active]:text-yellow-400 data-[state=active]:shadow-none"
                      >
                        <Subtitles className="w-4 h-4" />
                        Subs
                      </TabsTrigger>
                      <TabsTrigger
                        value="music"
                        className="rounded-none gap-1 text-xs font-medium data-[state=active]:bg-purple-500/15 data-[state=active]:text-purple-600 dark:data-[state=active]:text-purple-400 data-[state=active]:shadow-none"
                      >
                        <Music className="w-4 h-4" />
                        Music
                      </TabsTrigger>
                      <TabsTrigger
                        value="render"
                        className="rounded-none gap-1 text-xs font-medium data-[state=active]:bg-cyan-500/15 data-[state=active]:text-cyan-600 dark:data-[state=active]:text-cyan-400 data-[state=active]:shadow-none"
                      >
                        <Clapperboard className="w-4 h-4" />
                        Render
                      </TabsTrigger>
                      <TabsTrigger
                        value="export"
                        className="rounded-none gap-1 text-xs font-medium data-[state=active]:bg-emerald-500/15 data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 data-[state=active]:shadow-none"
                      >
                        <Download className="w-4 h-4" />
                        Export
                      </TabsTrigger>
                    </TabsList>

                    <div className="max-h-[600px] overflow-y-auto">
                      {/* SCENES TAB */}
                      <TabsContent value="scenes" className="m-0 p-4">
                        <div className="space-y-3">
                          <p className="text-xs text-muted-foreground">
                            {project.scenes.length} scenes · {Math.round(project.scenes.length * 6 / 60)} min
                          </p>

                          {/* Sign-in required message for unauthenticated users */}
                          {!isAuthenticated && (
                            <a
                              href="/auth/register"
                              className="flex items-center gap-2 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 hover:border-orange-500/40 transition-all"
                            >
                              <Lock className="w-4 h-4 text-orange-400" />
                              <span className="text-sm text-orange-400">Sign in to modify scenes</span>
                            </a>
                          )}

                          <div className="space-y-1.5 max-h-[450px] overflow-y-auto">
                            {project.scenes.map((scene, index) => (
                              <div
                                key={scene.id}
                                onClick={isAuthenticated ? () => {
                                  timelineEditor.selectScene(scene.id);
                                  previewPlayer.jumpToScene(index);
                                } : undefined}
                                className={`group flex items-center gap-2.5 p-2 rounded-md border transition-all ${
                                  isAuthenticated ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'
                                } ${
                                  timelineEditor.selectedSceneId === scene.id
                                    ? 'border-orange-500/50 bg-orange-500/10'
                                    : 'border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] hover:border-orange-500/30 hover:bg-orange-500/5'
                                }`}
                              >
                                <div className="relative w-14 h-9 rounded overflow-hidden bg-black/20 dark:bg-black/50 flex-shrink-0">
                                  {scene.imageUrl ? (
                                    <img src={scene.imageUrl} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">{index + 1}</div>
                                  )}
                                  {scene.videoUrl && (
                                    <div className="absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full bg-green-500" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{index + 1}. {scene.title || 'Untitled'}</p>
                                </div>
                                {!isReadOnly && isAuthenticated && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (confirm('Delete this scene?')) {
                                        deleteScene(project.id, scene.id);
                                      }
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-all"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>

                          {project.scenes.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground">
                              <Film className="w-8 h-8 mx-auto mb-2 opacity-40" />
                              <p className="text-sm">No scenes</p>
                            </div>
                          )}
                        </div>
                      </TabsContent>

                      {/* CAPTIONS TAB */}
                      <TabsContent value="captions" className="m-0 p-4">
                        <div className="space-y-4">
                          {/* Sign-in required message for unauthenticated users */}
                          {!isAuthenticated && (
                            <a
                              href="/auth/register"
                              className="flex items-center gap-2 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 hover:border-orange-500/40 transition-all"
                            >
                              <Lock className="w-4 h-4 text-orange-400" />
                              <span className="text-sm text-orange-400">Sign in to edit captions</span>
                            </a>
                          )}

                          {/* Auto-generate button - only for editors */}
                          {!isReadOnly && isAuthenticated && project.scenes.some(s => s.dialogue?.length > 0) && (
                            <button
                              onClick={captionEditor.autoGenerateAllCaptions}
                              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium text-white bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 transition-all"
                            >
                              <Sparkles className="w-4 h-4" />
                              Auto-generate All
                            </button>
                          )}

                          {/* Scene selector - vertical list with big thumbnails */}
                          <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                            {project.scenes.map((scene, index) => {
                              const count = scene.captions?.length || 0;
                              const isSelected = captionEditor.selectedSceneIndex === index;
                              return (
                                <button
                                  key={scene.id}
                                  onClick={() => captionEditor.setSelectedSceneIndex(index)}
                                  className={`w-full flex items-center gap-3 p-2 rounded-md border-2 transition-all text-left ${
                                    isSelected ? 'border-yellow-500 bg-yellow-500/10' : 'border-transparent hover:border-yellow-500/30 hover:bg-yellow-500/5'
                                  }`}
                                >
                                  <div className="relative w-16 h-10 rounded overflow-hidden bg-black/20 dark:bg-black/50 flex-shrink-0">
                                    {scene.imageUrl ? (
                                      <img src={scene.imageUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">{index + 1}</div>
                                    )}
                                    {scene.videoUrl && (
                                      <div className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-green-500" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{index + 1}. {scene.title || 'Untitled'}</p>
                                  </div>
                                  {count > 0 && (
                                    <span className="px-2 py-0.5 rounded-full bg-yellow-500 text-xs font-bold text-black">{count}</span>
                                  )}
                                </button>
                              );
                            })}
                          </div>

                          {/* Current scene captions */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">Scene {captionEditor.selectedSceneIndex + 1}</span>
                              {!isReadOnly && isAuthenticated && (
                                <button onClick={captionEditor.startNewCaption} className="text-sm text-yellow-600 dark:text-yellow-400 hover:underline">+ Add</button>
                              )}
                            </div>

                            {captionEditor.sceneCaptions.length > 0 ? (
                              <div className="space-y-1.5">
                                {captionEditor.sceneCaptions.map((caption) => (
                                  <div key={caption.id} className="group flex items-start gap-2 p-2 rounded-md border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] hover:border-yellow-500/30 transition-all">
                                    <p className="flex-1 text-sm leading-relaxed">{caption.text}</p>
                                    {!isReadOnly && isAuthenticated && (
                                      <button onClick={() => captionEditor.deleteCaption(caption.id)} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all shrink-0">
                                        <X className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground text-center py-6">No captions for this scene</p>
                            )}
                          </div>

                          {/* Editing form - only for editors */}
                          {!isReadOnly && isAuthenticated && captionEditor.isEditing && captionEditor.editingCaption && (
                            <div className="space-y-3 p-3 rounded-lg border border-yellow-500/30 bg-yellow-500/5">
                              <textarea
                                value={captionEditor.editingCaption.text}
                                onChange={(e) => captionEditor.updateCaptionField('text', e.target.value)}
                                placeholder="Enter caption text..."
                                className="w-full h-20 px-3 py-2 rounded-md bg-white dark:bg-black/30 border border-black/10 dark:border-white/10 text-sm placeholder:text-muted-foreground resize-none focus:outline-none focus:border-yellow-500/50"
                              />
                              <div className="flex gap-2">
                                <button onClick={captionEditor.cancelEditing} className="flex-1 py-2 rounded-md text-sm border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition-all">Cancel</button>
                                <button onClick={() => captionEditor.saveCaption(captionEditor.editingCaption!)} className="flex-1 py-2 rounded-md text-sm font-medium text-white bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 transition-all">Save</button>
                              </div>
                            </div>
                          )}
                        </div>
                      </TabsContent>

                      {/* MUSIC TAB */}
                      <TabsContent value="music" className="m-0 p-4">
                        <div className="space-y-4">
                          {/* Sign-in required message for unauthenticated users */}
                          {!isAuthenticated && (
                            <a
                              href="/auth/register"
                              className="flex items-center gap-2 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 hover:border-orange-500/40 transition-all"
                            >
                              <Lock className="w-4 h-4 text-orange-400" />
                              <span className="text-sm text-orange-400">Sign in to manage music</span>
                            </a>
                          )}

                          {backgroundMusic.previewUrl && isAuthenticated && (
                            <audio ref={backgroundMusic.previewRef} src={backgroundMusic.previewUrl} onEnded={backgroundMusic.clearPreview} />
                          )}

                          {backgroundMusic.hasMusic && backgroundMusic.currentMusic ? (
                            <div className="p-3 rounded-lg border border-purple-500/30 bg-purple-500/5">
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={isAuthenticated ? backgroundMusic.togglePreview : undefined}
                                  disabled={!isAuthenticated}
                                  className="w-11 h-11 rounded-full bg-purple-500/20 hover:bg-purple-500/30 flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {!isAuthenticated ? (
                                    <Lock className="w-5 h-5 text-purple-600/50 dark:text-purple-400/50" />
                                  ) : backgroundMusic.isPreviewPlaying ? (
                                    <Pause className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                  ) : (
                                    <Play className="w-5 h-5 text-purple-600 dark:text-purple-400 ml-0.5" />
                                  )}
                                </button>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{backgroundMusic.currentMusic.title || 'Background Music'}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {backgroundMusic.currentMusic.duration ? `${Math.floor(backgroundMusic.currentMusic.duration / 60)}:${String(Math.floor(backgroundMusic.currentMusic.duration % 60)).padStart(2, '0')}` : '—'}
                                  </p>
                                </div>
                                {!isReadOnly && isAuthenticated && (
                                  <button onClick={backgroundMusic.removeMusic} className="p-2 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-all">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ) : backgroundMusic.generationState.status !== 'idle' ? (
                            <div className="p-3 rounded-lg border border-purple-500/30 bg-purple-500/5">
                              <div className="flex items-center gap-3">
                                <div className="w-5 h-5 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin" />
                                <div className="flex-1">
                                  <p className="text-sm">
                                    {backgroundMusic.generationState.status === 'processing' && (
                                      backgroundMusic.generationState.progress > 0
                                        ? `Generating ${backgroundMusic.generationState.progress}%`
                                        : 'Starting...'
                                    )}
                                    {backgroundMusic.generationState.status === 'error' && backgroundMusic.generationState.error}
                                  </p>
                                  {backgroundMusic.generationState.status === 'processing' && backgroundMusic.generationState.progress > 0 && (
                                    <div className="mt-2 h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                                      <div className="h-full bg-gradient-to-r from-purple-500 to-violet-500 transition-all" style={{ width: `${backgroundMusic.generationState.progress}%` }} />
                                    </div>
                                  )}
                                </div>
                                <button onClick={backgroundMusic.cancelGeneration} className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground transition-all">
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ) : backgroundMusic.previewUrl ? (
                            <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5">
                              <div className="flex items-center gap-3">
                                <button onClick={backgroundMusic.togglePreview} className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                  {backgroundMusic.isPreviewPlaying ? <Pause className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <Play className="w-4 h-4 text-emerald-600 dark:text-emerald-400 ml-0.5" />}
                                </button>
                                <span className="flex-1 text-sm">Preview ready</span>
                                <button onClick={backgroundMusic.applyPreviewToProject} className="px-3 py-1.5 rounded text-sm font-medium text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 transition-all">Apply</button>
                                <button onClick={backgroundMusic.clearPreview} className="p-1.5 hover:text-red-500 transition-colors"><X className="w-4 h-4" /></button>
                              </div>
                            </div>
                          ) : (isReadOnly || !isAuthenticated) ? (
                            <div className="text-center py-6 text-muted-foreground">
                              <Music className="w-8 h-8 mx-auto mb-2 opacity-40" />
                              <p className="text-sm">No background music</p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <input
                                value={backgroundMusic.prompt}
                                onChange={(e) => backgroundMusic.setPrompt(e.target.value)}
                                placeholder="Describe music style..."
                                className="w-full px-3 py-2.5 rounded-md bg-black/[0.03] dark:bg-white/[0.03] border border-black/10 dark:border-white/10 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-purple-500/40 transition-all"
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={backgroundMusic.generateMusic}
                                  disabled={!backgroundMusic.prompt.trim()}
                                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium text-white bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-400 hover:to-violet-400 disabled:opacity-40 transition-all"
                                >
                                  <Sparkles className="w-4 h-4" />
                                  Generate
                                </button>
                                <button
                                  onClick={() => {
                                    const input = document.createElement('input');
                                    input.type = 'file';
                                    input.accept = 'audio/*';
                                    input.onchange = (e) => {
                                      const file = (e.target as HTMLInputElement).files?.[0];
                                      if (file) backgroundMusic.uploadMusic(file);
                                    };
                                    input.click();
                                  }}
                                  className="px-4 py-2.5 rounded-md border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] text-sm text-muted-foreground hover:border-purple-500/30 transition-all"
                                >
                                  Upload
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </TabsContent>

                      {/* RENDER TAB */}
                      <TabsContent value="render" className="m-0 p-4">
                        <div className="space-y-4">
                          {/* Sign-in required message for unauthenticated users */}
                          {!isAuthenticated && (
                            <a
                              href="/auth/register"
                              className="flex items-center gap-2 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 hover:border-orange-500/40 transition-all"
                            >
                              <Lock className="w-4 h-4 text-orange-400" />
                              <span className="text-sm text-orange-400">Sign in to render videos</span>
                            </a>
                          )}

                          {/* Endpoint not configured warning */}
                          {isAuthenticated && !videoComposer.hasEndpoint && (
                            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                              <p className="text-sm text-amber-600 dark:text-amber-400">
                                VectCut endpoint not configured. Add your Modal endpoint URL in Settings.
                              </p>
                            </div>
                          )}

                          {/* Composition Status */}
                          {videoComposer.compositionState.isComposing && (
                            <div className="p-3 rounded-lg border border-cyan-500/30 bg-cyan-500/5">
                              <div className="flex items-center gap-3">
                                <Loader2 className="w-5 h-5 text-cyan-500 animate-spin" />
                                <div className="flex-1">
                                  <p className="text-sm font-medium">{videoComposer.compositionState.phase || 'Rendering...'}</p>
                                  <div className="mt-2 h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                                    <div
                                      className="h-full bg-gradient-to-r from-cyan-500 to-teal-500 transition-all"
                                      style={{ width: `${videoComposer.compositionState.progress}%` }}
                                    />
                                  </div>
                                </div>
                                <button
                                  onClick={videoComposer.cancelComposition}
                                  className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground transition-all"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Composition Error */}
                          {videoComposer.compositionState.status === 'error' && (
                            <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/5">
                              <div className="flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-red-500" />
                                <p className="text-sm text-red-600 dark:text-red-400">{videoComposer.compositionState.error}</p>
                              </div>
                            </div>
                          )}

                          {/* Composition Result */}
                          {videoComposer.result && (
                            <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5">
                              <div className="flex items-center gap-2 mb-3">
                                <CheckCircle className="w-4 h-4 text-emerald-500" />
                                <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                                  Render complete! {Math.round(videoComposer.result.duration)}s
                                </p>
                              </div>
                              <div className="flex gap-2">
                                {(videoComposer.result.videoUrl || videoComposer.result.videoBase64) && (
                                  <button
                                    onClick={() => videoComposer.downloadResult('video')}
                                    className="flex-1 py-2 rounded-md text-xs font-medium text-white bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 transition-all"
                                  >
                                    Download MP4
                                  </button>
                                )}
                                {(videoComposer.result.draftUrl || videoComposer.result.draftBase64) && (
                                  <button
                                    onClick={() => videoComposer.downloadResult('draft')}
                                    className="flex-1 py-2 rounded-md text-xs font-medium border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/10 transition-all"
                                  >
                                    CapCut Draft
                                  </button>
                                )}
                                {videoComposer.result.srtContent && (
                                  <button
                                    onClick={() => videoComposer.downloadResult('srt')}
                                    className="py-2 px-3 rounded-md text-xs font-medium border border-yellow-500/30 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500/10 transition-all"
                                  >
                                    SRT
                                  </button>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Options (only show when not composing and no result) */}
                          {!videoComposer.compositionState.isComposing && !videoComposer.result && isAuthenticated && videoComposer.hasEndpoint && (
                            <>
                              {/* Output Format */}
                              <div className="space-y-2">
                                <p className="text-xs font-medium text-muted-foreground">Output Format</p>
                                <div className="flex gap-2">
                                  {(['mp4', 'draft', 'both'] as const).map((format) => (
                                    <button
                                      key={format}
                                      onClick={() => videoComposer.setOutputFormat(format)}
                                      className={`flex-1 py-2 rounded-md text-xs font-medium border transition-all ${
                                        videoComposer.options.outputFormat === format
                                          ? 'border-cyan-500 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400'
                                          : 'border-black/10 dark:border-white/10 hover:border-cyan-500/30'
                                      }`}
                                    >
                                      {format === 'mp4' ? 'MP4 Only' : format === 'draft' ? 'CapCut Draft' : 'Both'}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Resolution */}
                              <div className="space-y-2">
                                <p className="text-xs font-medium text-muted-foreground">Resolution</p>
                                <div className="flex gap-2">
                                  {(['hd', '4k'] as const).map((res) => (
                                    <button
                                      key={res}
                                      onClick={() => videoComposer.setResolution(res)}
                                      className={`flex-1 py-2 rounded-md text-xs font-medium border transition-all ${
                                        videoComposer.options.resolution === res
                                          ? 'border-cyan-500 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400'
                                          : 'border-black/10 dark:border-white/10 hover:border-cyan-500/30'
                                      }`}
                                    >
                                      {res === 'hd' ? 'HD (1080p)' : '4K (2160p)'}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Options */}
                              <div className="space-y-2">
                                <p className="text-xs font-medium text-muted-foreground">Include</p>
                                <div className="space-y-2">
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={videoComposer.options.includeCaptions}
                                      onChange={(e) => videoComposer.setIncludeCaptions(e.target.checked)}
                                      className="w-4 h-4 rounded border-black/20 dark:border-white/20 text-cyan-500 focus:ring-cyan-500"
                                    />
                                    <span className="text-sm">Burn in captions</span>
                                  </label>
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={videoComposer.options.includeMusic}
                                      onChange={(e) => videoComposer.setIncludeMusic(e.target.checked)}
                                      disabled={!project.backgroundMusic}
                                      className="w-4 h-4 rounded border-black/20 dark:border-white/20 text-cyan-500 focus:ring-cyan-500 disabled:opacity-50"
                                    />
                                    <span className={`text-sm ${!project.backgroundMusic ? 'text-muted-foreground' : ''}`}>
                                      Include music {!project.backgroundMusic && '(none added)'}
                                    </span>
                                  </label>
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={videoComposer.options.aiTransitions}
                                      onChange={(e) => videoComposer.setAiTransitions(e.target.checked)}
                                      className="w-4 h-4 rounded border-black/20 dark:border-white/20 text-cyan-500 focus:ring-cyan-500"
                                    />
                                    <span className="text-sm">AI-suggest transitions</span>
                                  </label>
                                </div>
                              </div>

                              {/* Cost Estimate */}
                              <div className="p-3 rounded-lg bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-muted-foreground">Estimated cost</span>
                                  <span className="text-sm font-medium">{videoComposer.estimatedCost.credits} credits</span>
                                </div>
                              </div>

                              {/* Render Button */}
                              <button
                                onClick={videoComposer.startComposition}
                                disabled={!videoComposer.canCompose}
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-md text-sm font-medium text-white bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                              >
                                <Clapperboard className="w-4 h-4" />
                                Render Video
                              </button>
                            </>
                          )}

                          {/* No scenes message */}
                          {project.scenes.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground">
                              <Clapperboard className="w-8 h-8 mx-auto mb-2 opacity-40" />
                              <p className="text-sm">No scenes to render</p>
                            </div>
                          )}
                        </div>
                      </TabsContent>

                      {/* EXPORT TAB */}
                      <TabsContent value="export" className="m-0 p-4">
                        <div className="space-y-4">
                          <p className="text-xs text-muted-foreground">
                            {stats.scenesWithVideos} videos · {stats.scenesWithImages} images · {stats.dialogueLinesWithAudio} audio
                          </p>

                          {/* Sign-in required message for unauthenticated users */}
                          {!isAuthenticated && (
                            <a
                              href="/auth/register"
                              className="flex items-center gap-2 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 hover:border-orange-500/40 transition-all"
                            >
                              <Lock className="w-4 h-4 text-orange-400" />
                              <span className="text-sm text-orange-400">Sign in to download assets</span>
                            </a>
                          )}

                          <div className="space-y-2">
                            <button
                              onClick={isAuthenticated ? downloadHandlers.handleDownloadAll : undefined}
                              disabled={!isAuthenticated || downloadHandlers.downloadingAll}
                              className="w-full flex items-center justify-center gap-2 py-3 rounded-md text-sm font-medium text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                              {downloadHandlers.downloadingAll ? (
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                              ) : !isAuthenticated ? (
                                <Lock className="h-4 w-4" />
                              ) : (
                                <Download className="h-4 w-4" />
                              )}
                              Download All
                            </button>

                            <button
                              onClick={isAuthenticated ? exportHandlers.handleExportCapCut : undefined}
                              disabled={!isAuthenticated}
                              className="w-full flex items-center justify-center gap-2 py-3 rounded-md border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] text-sm font-medium hover:border-cyan-500/40 hover:bg-cyan-500/5 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                              {!isAuthenticated ? (
                                <Lock className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <svg className="h-4 w-4 text-cyan-600 dark:text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                                  <circle cx="12" cy="13" r="3" />
                                </svg>
                              )}
                              Export for CapCut
                            </button>
                          </div>

                          <div className="flex items-center gap-2 pt-1">
                            <div className="h-px flex-1 bg-black/5 dark:bg-white/10" />
                            <span className="text-xs text-muted-foreground">or</span>
                            <div className="h-px flex-1 bg-black/5 dark:bg-white/10" />
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={isAuthenticated ? downloadHandlers.handleDownloadVideos : undefined}
                              disabled={!isAuthenticated || downloadHandlers.downloadingVideos || stats.scenesWithVideos === 0}
                              className="flex-1 rounded-md border border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] px-3 py-2 text-xs text-muted-foreground transition-all hover:border-orange-500/30 hover:text-orange-600 dark:hover:text-orange-400 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              Videos
                            </button>
                            <button
                              onClick={isAuthenticated ? downloadHandlers.handleDownloadAudio : undefined}
                              disabled={!isAuthenticated || downloadHandlers.downloadingAudio || stats.dialogueLinesWithAudio === 0}
                              className="flex-1 rounded-md border border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] px-3 py-2 text-xs text-muted-foreground transition-all hover:border-violet-500/30 hover:text-violet-600 dark:hover:text-violet-400 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              Audio
                            </button>
                            <button
                              onClick={isAuthenticated ? exportHandlers.handleExportJSON : undefined}
                              disabled={!isAuthenticated}
                              className="flex-1 rounded-md border border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] px-3 py-2 text-xs text-muted-foreground transition-all hover:border-blue-500/30 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              JSON
                            </button>
                          </div>
                        </div>
                      </TabsContent>
                    </div>
                  </Tabs>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Side Panel Toggle (when closed) */}
        {!sidePanelOpen && (
          <Button
            variant="ghost"
            size="icon"
            className="flex-shrink-0 h-8 w-8 border border-black/10 dark:border-white/10"
            onClick={() => setSidePanelOpen(true)}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

    </div>
  );
}
