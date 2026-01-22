import { AnimatePresence, motion } from 'framer-motion';
import {
  X,
  Clapperboard,
  Loader2,
  AlertCircle,
  CheckCircle,
  Music,
  Pause,
  Play,
  Trash2,
  Sparkles,
  Upload,
  Download,
  FileJson,
  FileText,
  Scissors,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import type { useBackgroundMusic, useVideoComposer, Resolution } from '../../export/hooks';
import type { ExportHandlers } from '../../export/types';
import type { Scene, Project } from '@/types/project';

interface RenderOptionsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  scenes: Scene[];
  isReadOnly: boolean;
  backgroundMusic: ReturnType<typeof useBackgroundMusic>;
  videoComposer: ReturnType<typeof useVideoComposer>;
  stats: {
    totalDuration: number;
  };
  project: Project;
  exportHandlers: ExportHandlers;
}

export function RenderOptionsPanel({
  isOpen,
  onClose,
  scenes,
  isReadOnly,
  backgroundMusic,
  videoComposer,
  stats,
  project,
  exportHandlers,
}: RenderOptionsPanelProps) {
  const t = useTranslations();

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
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
                <span className="ml-auto text-xs text-muted-foreground shrink-0 hidden sm:inline">
                  {scenes.length} {t('steps.export.scenes').toLowerCase()}
                </span>
                {/* Mobile close button */}
                <button
                  onClick={onClose}
                  className="lg:hidden ml-auto p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="max-h-[500px] sm:max-h-[650px] overflow-y-auto p-3 sm:p-4 space-y-4">
                {/* Endpoint not configured warning - shows download options when no endpoint */}
                {!videoComposer.hasEndpoint && (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 space-y-3">
                    <p className="text-sm text-amber-600 dark:text-amber-400">
                      {t('steps.export.vectcutNotConfigured')}
                    </p>
                    {/* Download Options */}
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Stiahnite si projektové súbory:</p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={exportHandlers.handleExportJSON}
                          className="flex items-center gap-2 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 transition-all"
                        >
                          <FileJson className="w-4 h-4 text-blue-400" />
                          <span className="text-xs text-blue-600 dark:text-blue-400">JSON</span>
                        </button>
                        <button
                          onClick={exportHandlers.handleExportMarkdown}
                          className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 transition-all"
                        >
                          <FileText className="w-4 h-4 text-green-400" />
                          <span className="text-xs text-green-600 dark:text-green-400">Markdown</span>
                        </button>
                        <button
                          onClick={exportHandlers.handleExportText}
                          className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-all"
                        >
                          <Download className="w-4 h-4 text-amber-400" />
                          <span className="text-xs text-amber-600 dark:text-amber-400">Text</span>
                        </button>
                        <button
                          onClick={exportHandlers.handleExportCapCut}
                          className="flex items-center gap-2 p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 transition-all"
                        >
                          <Scissors className="w-4 h-4 text-cyan-400" />
                          <span className="text-xs text-cyan-600 dark:text-cyan-400">CapCut</span>
                        </button>
                      </div>
                    </div>
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

                {/* Render Options - Always show Background Music, Video Composition only if endpoint configured */}
                {!videoComposer.compositionState.isComposing && !videoComposer.result && (
                  <>
                    {/* Background Music Section - always available */}
                    <BackgroundMusicSection
                      backgroundMusic={backgroundMusic}
                      isReadOnly={isReadOnly}
                      stats={stats}
                    />

                    {/* Video Composition Options - only if endpoint configured */}
                    {videoComposer.hasEndpoint && (
                      <VideoCompositionOptions
                        videoComposer={videoComposer}
                        stats={stats}
                      />
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Background Music Section Component
function BackgroundMusicSection({
  backgroundMusic,
  isReadOnly,
  stats,
}: {
  backgroundMusic: ReturnType<typeof useBackgroundMusic>;
  isReadOnly: boolean;
  stats: { totalDuration: number };
}) {
  const t = useTranslations();

  return (
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
                {backgroundMusic.currentMusic.duration
                  ? `${Math.floor(backgroundMusic.currentMusic.duration / 60)}:${String(
                    Math.floor(backgroundMusic.currentMusic.duration % 60)
                  ).padStart(2, '0')}`
                  : '—'}
              </p>
            </div>
            {!isReadOnly && (
              <button
                onClick={backgroundMusic.removeMusic}
                className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {backgroundMusic.currentMusic.duration && stats.totalDuration && (
            <p className="text-xs text-muted-foreground mt-2">
              Loop: {Math.ceil(stats.totalDuration / backgroundMusic.currentMusic.duration)}x
            </p>
          )}
        </div>
      ) : (
        // No music - show generate or upload buttons
        !isReadOnly && (
          <div className="flex flex-col gap-3">
            <Textarea
              value={backgroundMusic.prompt}
              onChange={(e) => backgroundMusic.setPrompt(e.target.value)}
              placeholder={t('steps.export.musicPromptPlaceholder')}
              className="min-h-[80px] resize-none"
            />
            <div className="flex gap-2">
              <Button
                onClick={backgroundMusic.generateMusic}
                disabled={backgroundMusic.generationState.isGenerating || !backgroundMusic.prompt.trim()}
                size="sm"
                className="flex-1 bg-purple-500 hover:bg-purple-600"
              >
                {backgroundMusic.generationState.isGenerating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    {t('steps.export.generatingMusic')}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                    {t('steps.export.generateMusic')}
                  </>
                )}
              </Button>
              <div>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) backgroundMusic.uploadMusic(file);
                  }}
                  className="hidden"
                  id="music-upload"
                />
                <label htmlFor="music-upload">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex items-center gap-1.5"
                    asChild
                  >
                    <span>
                      <Upload className="w-3.5 h-3.5" />
                      {t('steps.export.uploadMusic')}
                    </span>
                  </Button>
                </label>
              </div>
            </div>
          </div>
        )
      )}

      {/* Preview audio element */}
      {backgroundMusic.previewUrl && (
        <audio
          ref={backgroundMusic.previewRef}
          src={backgroundMusic.previewUrl}
          onEnded={() => backgroundMusic.togglePreview()}
          className="hidden"
        />
      )}
    </div>
  );
}

// Video Composition Options Component
function VideoCompositionOptions({
  videoComposer,
  stats,
}: {
  videoComposer: ReturnType<typeof useVideoComposer>;
  stats: { totalDuration: number };
}) {
  const t = useTranslations();

  return (
    <>
      {/* Output Format */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">{t('steps.export.outputFormat')}</label>
        <Select value={videoComposer.options.outputFormat} onValueChange={videoComposer.setOutputFormat}>
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mp4">MP4 (H.264)</SelectItem>
            <SelectItem value="mov">MOV (ProRes)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Resolution */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">{t('steps.export.resolution')}</label>
        <Select value={videoComposer.options.resolution} onValueChange={(value) => videoComposer.setResolution(value as Resolution)}>
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hd">HD (1280×720)</SelectItem>
            <SelectItem value="4k">4K (3840×2160)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Options */}
      <div className="space-y-3">
        <label className="text-xs font-medium text-muted-foreground">{t('steps.export.options')}</label>

        <label className="flex items-center gap-3 cursor-pointer group">
          <Switch
            checked={videoComposer.options.includeVoiceovers}
            onCheckedChange={videoComposer.setIncludeVoiceovers}
            className="data-[state=checked]:bg-cyan-500"
          />
          <span className="text-sm group-hover:text-foreground transition-colors">
            {t('steps.export.includeVoiceovers')}
          </span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer group">
          <Switch
            checked={videoComposer.options.includeCaptions}
            onCheckedChange={videoComposer.setIncludeCaptions}
            className="data-[state=checked]:bg-yellow-500"
          />
          <span className="text-sm group-hover:text-foreground transition-colors">
            {t('steps.export.includeCaptions')}
          </span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer group">
          <Switch
            checked={videoComposer.options.includeMusic}
            onCheckedChange={videoComposer.setIncludeMusic}
            className="data-[state=checked]:bg-purple-500"
          />
          <span className="text-sm group-hover:text-foreground transition-colors">
            {t('steps.export.includeBackgroundMusic')}
          </span>
        </label>
      </div>

      {/* Additional Options based on selections */}
      <TransitionSettings videoComposer={videoComposer} />
      {videoComposer.options.includeCaptions && <CaptionSettings videoComposer={videoComposer} />}
      {videoComposer.options.includeMusic && <AudioSettings videoComposer={videoComposer} />}

      {/* Cost Estimate */}
      <div className="p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/20">
        <p className="text-xs font-medium text-cyan-600 dark:text-cyan-400">
          {t('steps.export.estimatedCost')}: ${videoComposer.estimatedCost.realCost.toFixed(2)} • {Math.ceil(stats.totalDuration)}s
        </p>
      </div>

      {/* Render Button */}
      <Button
        onClick={videoComposer.startComposition}
        size="sm"
        className="w-full bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-white"
        disabled={videoComposer.compositionState.isComposing}
      >
        <Clapperboard className="w-4 h-4 mr-2" />
        {t('steps.export.renderVideo')}
      </Button>
    </>
  );
}

// Helper components for additional settings
function TransitionSettings({ videoComposer }: { videoComposer: ReturnType<typeof useVideoComposer> }) {
  const t = useTranslations();

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-muted-foreground">{t('steps.export.transitionSettings')}</p>

      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">{t('steps.export.transitionType')}</label>
        <Select value={videoComposer.options.transitionStyle} onValueChange={(value) => videoComposer.setTransitionStyle(value as any)}>
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fade">Fade</SelectItem>
            <SelectItem value="cut">Cut</SelectItem>
            <SelectItem value="dissolve">Dissolve</SelectItem>
            <SelectItem value="wipe">Wipe</SelectItem>
            <SelectItem value="slideLeft">Slide Left</SelectItem>
            <SelectItem value="slideRight">Slide Right</SelectItem>
            <SelectItem value="zoomIn">Zoom In</SelectItem>
            <SelectItem value="zoomOut">Zoom Out</SelectItem>
            <SelectItem value="none">None</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">
          {t('steps.export.transitionDuration')}: {videoComposer.options.transitionDuration}s
        </label>
        <Slider
          value={[videoComposer.options.transitionDuration]}
          onValueChange={([value]) => videoComposer.setTransitionDuration(value)}
          min={0.1}
          max={2}
          step={0.1}
          className="py-3"
        />
      </div>
    </div>
  );
}

function CaptionSettings({ videoComposer }: { videoComposer: ReturnType<typeof useVideoComposer> }) {
  const t = useTranslations();

  return (
    <div className="space-y-3 border-t border-black/5 dark:border-white/5 pt-3">
      <p className="text-xs font-medium text-muted-foreground">{t('steps.export.captionStyling')}</p>

      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">{t('steps.export.captionPosition')}</label>
        <Select
          value={videoComposer.options.captionStyle.position}
          onValueChange={(value) => videoComposer.setCaptionStyle({ position: value as any })}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="bottom">Bottom</SelectItem>
            <SelectItem value="center">Center</SelectItem>
            <SelectItem value="top">Top</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">{t('steps.export.fontSize')}</label>
        <Select
          value={videoComposer.options.captionStyle.fontSize}
          onValueChange={(value) => videoComposer.setCaptionStyle({ fontSize: value as any })}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="small">Small</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="large">Large</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function AudioSettings({ videoComposer }: { videoComposer: ReturnType<typeof useVideoComposer> }) {
  const t = useTranslations();

  return (
    <div className="space-y-3 border-t border-black/5 dark:border-white/5 pt-3">
      <p className="text-xs font-medium text-muted-foreground">{t('steps.export.audioSettings')}</p>

      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">
          {t('steps.export.musicVolume')}: {Math.round(videoComposer.options.audioSettings.musicVolume * 100)}%
        </label>
        <Slider
          value={[videoComposer.options.audioSettings.musicVolume]}
          onValueChange={([value]) => videoComposer.setAudioSettings({ musicVolume: value })}
          min={0}
          max={1}
          step={0.05}
          className="py-3"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">
          {t('steps.export.fadeIn')}: {videoComposer.options.audioSettings.fadeIn}s
        </label>
        <Slider
          value={[videoComposer.options.audioSettings.fadeIn]}
          onValueChange={([value]) => videoComposer.setAudioSettings({ fadeIn: value })}
          min={0}
          max={5}
          step={0.5}
          className="py-3"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">
          {t('steps.export.fadeOut')}: {videoComposer.options.audioSettings.fadeOut}s
        </label>
        <Slider
          value={[videoComposer.options.audioSettings.fadeOut]}
          onValueChange={([value]) => videoComposer.setAudioSettings({ fadeOut: value })}
          min={0}
          max={5}
          step={0.5}
          className="py-3"
        />
      </div>
    </div>
  );
}