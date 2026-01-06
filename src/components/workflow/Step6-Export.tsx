'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  Film,
  Music,
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
  Upload,
} from 'lucide-react';
import { useProjectStore } from '@/lib/stores/project-store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Project } from '@/types/project';
import type { ProjectPermissions, ProjectRole } from '@/types/collaboration';

// Hooks
import {
  useProjectStats,
  usePreviewPlayer,
  useBackgroundMusic,
  useVideoComposer,
} from './export/hooks';

// Components
import {
  ProjectSummaryCard,
  MoviePreview,
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
  const { projects } = useProjectStore();
  const [sidePanelOpen, setSidePanelOpen] = useState(true);

  // Get live project data from store, but prefer initialProject for full data (scenes array)
  // Store may contain summary data without scenes
  const storeProject = projects.find((p) => p.id === initialProject.id);
  const project = storeProject?.scenes ? storeProject : initialProject;

  // Safe accessor for scenes array
  const scenes = project.scenes || [];

  // Custom hooks
  const { stats } = useProjectStats(project);
  const previewPlayer = usePreviewPlayer(project);
  const backgroundMusic = useBackgroundMusic(project);
  const videoComposer = useVideoComposer(project);

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
            <p className="text-xs text-muted-foreground">Play movie, render videos, add music</p>
          </div>
          <span className="px-3 py-1 rounded-full bg-orange-500 text-white text-xs font-medium">
            Sign up free
          </span>
        </a>
      )}

      {/* Main Editor Layout */}
      <div className="flex flex-col lg:flex-row gap-3">
        {/* Preview Section - Large */}
        <div className="flex-1 min-w-0">
          {stats.totalScenes > 0 && (
            <Card className="glass border-white/10 overflow-hidden relative">
              {/* Lock overlay for unauthenticated users */}
              {!isAuthenticated && (
                <div className="absolute inset-0 z-10 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center">
                  <Lock className="w-10 h-10 text-white/70 mb-3" />
                  <p className="text-base text-white/80">Sign in to play movie</p>
                  <a href="/auth/register" className="mt-3 px-5 py-2 rounded-full bg-orange-500 text-white text-sm font-medium hover:bg-orange-400 transition-colors">
                    Sign up free
                  </a>
                </div>
              )}
              <CardContent className="p-3">
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
              </CardContent>
            </Card>
          )}
        </div>

        {/* Side Panel - Render Options */}
        <AnimatePresence mode="wait">
          {sidePanelOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 'auto', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-shrink-0 overflow-hidden w-full lg:w-auto"
            >
              <Card className="glass border-black/10 dark:border-white/10 h-full">
                <CardContent className="p-0">
                  {/* Header */}
                  <div className="px-3 sm:px-4 py-3 border-b border-black/5 dark:border-white/5 flex items-center gap-2">
                    <Clapperboard className="w-4 h-4 text-cyan-500 shrink-0" />
                    <span className="text-sm font-medium truncate">{t('steps.export.renderVideo')}</span>
                    <span className="ml-auto text-xs text-muted-foreground shrink-0 hidden sm:inline">{scenes.length} {t('steps.export.scenes').toLowerCase()}</span>
                    {/* Mobile close button */}
                    <button
                      onClick={() => setSidePanelOpen(false)}
                      className="lg:hidden ml-auto p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="max-h-[500px] sm:max-h-[650px] overflow-y-auto p-3 sm:p-4 space-y-4">
                    {/* Sign-in required message for unauthenticated users */}
                    {!isAuthenticated && (
                      <a
                        href="/auth/register"
                        className="flex items-center gap-2 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 hover:border-orange-500/40 transition-all"
                      >
                        <Lock className="w-4 h-4 text-orange-400" />
                        <span className="text-sm text-orange-400">{t('steps.export.signInToRender')}</span>
                      </a>
                    )}

                    {/* Endpoint not configured warning */}
                    {isAuthenticated && !videoComposer.hasEndpoint && (
                      <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <p className="text-sm text-amber-600 dark:text-amber-400">
                          {t('steps.export.vectcutNotConfigured')}
                        </p>
                      </div>
                    )}

                    {/* Composition Status */}
                    {videoComposer.compositionState.isComposing && (
                      <div className="p-3 rounded-lg border border-cyan-500/30 bg-cyan-500/5">
                        <div className="flex items-center gap-3">
                          <Loader2 className="w-5 h-5 text-cyan-500 animate-spin" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{videoComposer.compositionState.phase || t('steps.export.rendering')}</p>
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
                              disabled={videoComposer.isDownloading}
                              className="flex-1 py-2 rounded-md text-xs font-medium text-white bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 transition-all disabled:opacity-50 disabled:cursor-wait"
                            >
                              {videoComposer.isDownloading ? 'Downloading...' : 'Download MP4'}
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
                        {/* Background Music Section */}
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                            <Music className="w-3.5 h-3.5" />
                            Background Music
                          </p>

                          {/* Music preview audio element */}
                          {backgroundMusic.previewUrl && (
                            <audio ref={backgroundMusic.previewRef} src={backgroundMusic.previewUrl} onEnded={backgroundMusic.clearPreview} />
                          )}

                          {backgroundMusic.hasMusic && backgroundMusic.currentMusic ? (
                            // Has music - show player
                            <div className="p-2.5 rounded-lg border border-purple-500/30 bg-purple-500/5">
                              <div className="flex items-center gap-2.5">
                                <button
                                  onClick={backgroundMusic.togglePreview}
                                  className="w-9 h-9 rounded-full bg-purple-500/20 hover:bg-purple-500/30 flex items-center justify-center transition-all"
                                >
                                  {backgroundMusic.isPreviewPlaying ? (
                                    <Pause className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                  ) : (
                                    <Play className="w-4 h-4 text-purple-600 dark:text-purple-400 ml-0.5" />
                                  )}
                                </button>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{backgroundMusic.currentMusic.title || 'Background Music'}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {backgroundMusic.currentMusic.duration ? `${Math.floor(backgroundMusic.currentMusic.duration / 60)}:${String(Math.floor(backgroundMusic.currentMusic.duration % 60)).padStart(2, '0')}` : '—'}
                                  </p>
                                </div>
                                {!isReadOnly && (
                                  <button onClick={backgroundMusic.removeMusic} className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-all">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ) : backgroundMusic.generationState.status !== 'idle' ? (
                            // Generating music
                            <div className="p-2.5 rounded-lg border border-purple-500/30 bg-purple-500/5">
                              <div className="flex items-center gap-2.5">
                                <div className="w-4 h-4 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin" />
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
                                    <div className="mt-1.5 h-1 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                                      <div className="h-full bg-gradient-to-r from-purple-500 to-violet-500 transition-all" style={{ width: `${backgroundMusic.generationState.progress}%` }} />
                                    </div>
                                  )}
                                </div>
                                <button onClick={backgroundMusic.cancelGeneration} className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground transition-all">
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ) : backgroundMusic.previewUrl ? (
                            // Preview ready - apply or discard
                            <div className="p-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/5">
                              <div className="flex items-center gap-2">
                                <button onClick={backgroundMusic.togglePreview} className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                  {backgroundMusic.isPreviewPlaying ? <Pause className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Play className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 ml-0.5" />}
                                </button>
                                <span className="flex-1 text-sm">Preview ready</span>
                                <button onClick={backgroundMusic.applyPreviewToProject} className="px-2.5 py-1 rounded text-xs font-medium text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 transition-all">Apply</button>
                                <button onClick={backgroundMusic.clearPreview} className="p-1 hover:text-red-500 transition-colors"><X className="w-4 h-4" /></button>
                              </div>
                            </div>
                          ) : !isReadOnly ? (
                            // No music - show add options
                            <div className="flex gap-2">
                              <div className="flex-1 flex gap-1.5">
                                <input
                                  value={backgroundMusic.prompt}
                                  onChange={(e) => backgroundMusic.setPrompt(e.target.value)}
                                  placeholder="Music style..."
                                  className="flex-1 px-2.5 py-2 rounded-md bg-black/[0.03] dark:bg-white/[0.03] border border-black/10 dark:border-white/10 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-purple-500/40 transition-all"
                                />
                                <button
                                  onClick={backgroundMusic.generateMusic}
                                  disabled={!backgroundMusic.prompt.trim()}
                                  className="px-3 py-2 rounded-md text-sm font-medium text-white bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-400 hover:to-violet-400 disabled:opacity-40 transition-all"
                                >
                                  <Sparkles className="w-4 h-4" />
                                </button>
                              </div>
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
                                className="px-3 py-2 rounded-md border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] text-muted-foreground hover:border-purple-500/30 transition-all"
                                title="Upload audio"
                              >
                                <Upload className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">No music added</p>
                          )}
                        </div>

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
                            {(['sd', 'hd', '4k'] as const).map((res) => (
                              <button
                                key={res}
                                onClick={() => videoComposer.setResolution(res)}
                                className={`flex-1 py-2 rounded-md text-xs font-medium border transition-all ${
                                  videoComposer.options.resolution === res
                                    ? 'border-cyan-500 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400'
                                    : 'border-black/10 dark:border-white/10 hover:border-cyan-500/30'
                                }`}
                              >
                                {res === 'sd' ? 'SD (720p)' : res === 'hd' ? 'HD (1080p)' : '4K (2160p)'}
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
                                Include music {!project.backgroundMusic && '(add above)'}
                              </span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={videoComposer.options.includeVoiceovers}
                                onChange={(e) => videoComposer.setIncludeVoiceovers(e.target.checked)}
                                className="w-4 h-4 rounded border-black/20 dark:border-white/20 text-cyan-500 focus:ring-cyan-500"
                              />
                              <span className="text-sm">Include voiceovers</span>
                            </label>
                            {videoComposer.options.includeVoiceovers && (
                              <label className="flex items-center gap-2 cursor-pointer ml-6">
                                <input
                                  type="checkbox"
                                  checked={videoComposer.options.replaceVideoAudio}
                                  onChange={(e) => videoComposer.setReplaceVideoAudio(e.target.checked)}
                                  className="w-4 h-4 rounded border-black/20 dark:border-white/20 text-orange-500 focus:ring-orange-500"
                                />
                                <span className="text-sm text-orange-400">Replace video audio</span>
                              </label>
                            )}
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={videoComposer.options.kenBurnsEffect}
                                onChange={(e) => videoComposer.setKenBurnsEffect(e.target.checked)}
                                className="w-4 h-4 rounded border-black/20 dark:border-white/20 text-cyan-500 focus:ring-cyan-500"
                              />
                              <span className="text-sm">Ken Burns effect (images)</span>
                            </label>
                          </div>
                        </div>

                        {/* Transition Settings */}
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-muted-foreground">Transitions</p>
                          <div className="grid grid-cols-3 gap-1.5">
                            {(['fade', 'slideLeft', 'zoomIn', 'wipe', 'none'] as const).map((style) => (
                              <button
                                key={style}
                                onClick={() => videoComposer.setTransitionStyle(style)}
                                className={`py-1.5 rounded text-xs font-medium border transition-all ${
                                  videoComposer.options.transitionStyle === style
                                    ? 'border-purple-500 bg-purple-500/10 text-purple-600 dark:text-purple-400'
                                    : 'border-black/10 dark:border-white/10 hover:border-purple-500/30'
                                }`}
                              >
                                {style === 'slideLeft' ? 'Slide' : style === 'zoomIn' ? 'Zoom' : style.charAt(0).toUpperCase() + style.slice(1)}
                              </button>
                            ))}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground w-16">Duration</span>
                            <input
                              type="range"
                              min="0.3"
                              max="2"
                              step="0.1"
                              value={videoComposer.options.transitionDuration}
                              onChange={(e) => videoComposer.setTransitionDuration(parseFloat(e.target.value))}
                              className="flex-1 h-1.5 rounded-full bg-black/10 dark:bg-white/10 accent-purple-500"
                            />
                            <span className="text-xs w-8 text-right">{videoComposer.options.transitionDuration}s</span>
                          </div>
                        </div>

                        {/* Caption Styling (when captions enabled) */}
                        {videoComposer.options.includeCaptions && (
                          <div className="space-y-2 p-3 rounded-lg border border-yellow-500/20 bg-yellow-500/5">
                            <p className="text-xs font-medium text-yellow-600 dark:text-yellow-400">Caption Style</p>
                            <div className="grid grid-cols-3 gap-1.5">
                              {(['small', 'medium', 'large'] as const).map((size) => (
                                <button
                                  key={size}
                                  onClick={() => videoComposer.setCaptionStyle({ fontSize: size })}
                                  className={`py-1.5 rounded text-xs font-medium border transition-all ${
                                    videoComposer.options.captionStyle.fontSize === size
                                      ? 'border-yellow-500 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                                      : 'border-black/10 dark:border-white/10 hover:border-yellow-500/30'
                                  }`}
                                >
                                  {size.charAt(0).toUpperCase() + size.slice(1)}
                                </button>
                              ))}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">Text</span>
                              <input
                                type="color"
                                value={videoComposer.options.captionStyle.fontColor}
                                onChange={(e) => videoComposer.setCaptionStyle({ fontColor: e.target.value })}
                                className="w-6 h-6 rounded cursor-pointer"
                              />
                              <span className="text-xs text-muted-foreground ml-2">BG</span>
                              <input
                                type="color"
                                value={videoComposer.options.captionStyle.bgColor}
                                onChange={(e) => videoComposer.setCaptionStyle({ bgColor: e.target.value })}
                                className="w-6 h-6 rounded cursor-pointer"
                              />
                              <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.1"
                                value={videoComposer.options.captionStyle.bgAlpha}
                                onChange={(e) => videoComposer.setCaptionStyle({ bgAlpha: parseFloat(e.target.value) })}
                                className="w-16 h-1.5 accent-yellow-500"
                                title="Background opacity"
                              />
                            </div>
                            <div className="flex items-center gap-3">
                              <label className="flex items-center gap-1.5 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={videoComposer.options.captionStyle.shadow}
                                  onChange={(e) => videoComposer.setCaptionStyle({ shadow: e.target.checked })}
                                  className="w-3.5 h-3.5 rounded border-black/20 dark:border-white/20 text-yellow-500 focus:ring-yellow-500"
                                />
                                <span className="text-xs">Shadow</span>
                              </label>
                              <div className="flex gap-1">
                                {(['top', 'center', 'bottom'] as const).map((pos) => (
                                  <button
                                    key={pos}
                                    onClick={() => videoComposer.setCaptionStyle({ position: pos })}
                                    className={`px-2 py-1 rounded text-xs transition-all ${
                                      videoComposer.options.captionStyle.position === pos
                                        ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400'
                                        : 'hover:bg-black/5 dark:hover:bg-white/5'
                                    }`}
                                  >
                                    {pos === 'top' ? '↑' : pos === 'bottom' ? '↓' : '•'}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Audio Settings (when music enabled) */}
                        {videoComposer.options.includeMusic && project.backgroundMusic && (
                          <div className="space-y-2 p-3 rounded-lg border border-purple-500/20 bg-purple-500/5">
                            <p className="text-xs font-medium text-purple-600 dark:text-purple-400">Music Settings</p>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground w-14">Volume</span>
                                <input
                                  type="range"
                                  min="0"
                                  max="1"
                                  step="0.05"
                                  value={videoComposer.options.audioSettings.musicVolume}
                                  onChange={(e) => videoComposer.setAudioSettings({ musicVolume: parseFloat(e.target.value) })}
                                  className="flex-1 h-1.5 rounded-full bg-black/10 dark:bg-white/10 accent-purple-500"
                                />
                                <span className="text-xs w-8 text-right">{Math.round(videoComposer.options.audioSettings.musicVolume * 100)}%</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground w-14">Fade In</span>
                                <input
                                  type="range"
                                  min="0"
                                  max="5"
                                  step="0.5"
                                  value={videoComposer.options.audioSettings.fadeIn}
                                  onChange={(e) => videoComposer.setAudioSettings({ fadeIn: parseFloat(e.target.value) })}
                                  className="flex-1 h-1.5 rounded-full bg-black/10 dark:bg-white/10 accent-purple-500"
                                />
                                <span className="text-xs w-8 text-right">{videoComposer.options.audioSettings.fadeIn}s</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground w-14">Fade Out</span>
                                <input
                                  type="range"
                                  min="0"
                                  max="5"
                                  step="0.5"
                                  value={videoComposer.options.audioSettings.fadeOut}
                                  onChange={(e) => videoComposer.setAudioSettings({ fadeOut: parseFloat(e.target.value) })}
                                  className="flex-1 h-1.5 rounded-full bg-black/10 dark:bg-white/10 accent-purple-500"
                                />
                                <span className="text-xs w-8 text-right">{videoComposer.options.audioSettings.fadeOut}s</span>
                              </div>
                            </div>
                          </div>
                        )}

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
                          {t('steps.export.renderVideo')}
                        </button>
                      </>
                    )}

                    {/* No scenes message */}
                    {scenes.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Clapperboard className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">No scenes to render</p>
                      </div>
                    )}
                  </div>
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
            className="flex-shrink-0 h-8 w-8 border border-black/10 dark:border-white/10 mx-auto lg:mx-0"
            onClick={() => setSidePanelOpen(true)}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      {/* Mobile Side Panel Toggle Button */}
      {sidePanelOpen && (
        <Button
          variant="outline"
          size="sm"
          className="w-full lg:hidden flex items-center gap-2 border-white/10"
          onClick={() => setSidePanelOpen(false)}
        >
          <span>Hide Render Options</span>
          <ChevronLeft className="w-4 h-4 rotate-90" />
        </Button>
      )}

    </div>
  );
}
