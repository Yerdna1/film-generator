'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Video,
  Play,
  Pause,
  RefreshCw,
  Download,
  ExternalLink,
  Sparkles,
  Film,
  Clock,
  Zap,
  CheckCircle2,
  AlertCircle,
  Upload,
  Image as ImageIcon,
  MessageSquare,
  Info,
  Volume2,
  Settings2,
  Coins,
} from 'lucide-react';
import { COSTS } from '@/lib/services/credits';
import { ACTION_COSTS, formatCostCompact } from '@/lib/services/real-costs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useProjectStore } from '@/lib/stores/project-store';
import { CopyButton } from '@/components/shared/CopyButton';
import type { Project, Scene } from '@/types/project';

interface Step4Props {
  project: Project;
}

type VideoStatus = 'idle' | 'generating' | 'complete' | 'error';

interface SceneVideoState {
  [sceneId: string]: {
    status: VideoStatus;
    progress: number;
    error?: string;
  };
}

export function Step4VideoGenerator({ project: initialProject }: Step4Props) {
  const t = useTranslations();
  const { updateScene, projects } = useProjectStore();

  // Get live project data from store
  const project = projects.find(p => p.id === initialProject.id) || initialProject;

  const [videoStates, setVideoStates] = useState<SceneVideoState>({});
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [videoMode, setVideoMode] = useState<'fun' | 'normal'>('normal');

  const scenesWithImages = project.scenes.filter((s) => s.imageUrl);
  const scenesWithVideos = project.scenes.filter((s) => s.videoUrl);

  const getSceneStatus = (sceneId: string): VideoStatus => {
    const scene = project.scenes.find((s) => s.id === sceneId);
    if (scene?.videoUrl) return 'complete';
    return videoStates[sceneId]?.status || 'idle';
  };

  const generateSceneVideo = async (scene: Scene) => {
    if (!scene.imageUrl) return;

    setVideoStates((prev) => ({
      ...prev,
      [scene.id]: { status: 'generating', progress: 10 },
    }));

    try {
      // Update progress
      setVideoStates((prev) => ({
        ...prev,
        [scene.id]: { status: 'generating', progress: 30 },
      }));

      // Call the Grok video generation API with full prompt including dialogue
      const fullPrompt = buildFullI2VPrompt(scene);
      const response = await fetch('/api/grok', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: scene.imageUrl,
          prompt: fullPrompt,
          mode: videoMode, // fun or normal mode
        }),
      });

      setVideoStates((prev) => ({
        ...prev,
        [scene.id]: { status: 'generating', progress: 50 },
      }));

      if (response.ok) {
        const data = await response.json();

        // If async task, poll for completion
        if (data.taskId && data.status === 'processing') {
          const videoUrl = await pollForVideoCompletion(data.taskId, scene.id);
          if (videoUrl) {
            updateScene(project.id, scene.id, { videoUrl });
            setVideoStates((prev) => ({
              ...prev,
              [scene.id]: { status: 'complete', progress: 100 },
            }));
            // Refresh credits display
            window.dispatchEvent(new CustomEvent('credits-updated'));
            return;
          }
        }

        // If immediate result
        if (data.videoUrl) {
          updateScene(project.id, scene.id, { videoUrl: data.videoUrl });
          setVideoStates((prev) => ({
            ...prev,
            [scene.id]: { status: 'complete', progress: 100 },
          }));
          // Refresh credits display
          window.dispatchEvent(new CustomEvent('credits-updated'));
          return;
        }
      }

      // If API failed, show error
      const errorData = await response.json().catch(() => ({}));
      console.warn('Video generation API failed:', errorData);
      setVideoStates((prev) => ({
        ...prev,
        [scene.id]: {
          status: 'error',
          progress: 0,
          error: errorData.error || 'API not configured - set GROK_API_KEY in .env.local'
        },
      }));
    } catch (error) {
      console.error('Error generating video:', error);
      setVideoStates((prev) => ({
        ...prev,
        [scene.id]: {
          status: 'error',
          progress: 0,
          error: error instanceof Error ? error.message : 'Generation failed'
        },
      }));
    }
  };

  // Poll for video completion
  const pollForVideoCompletion = async (taskId: string, sceneId: string): Promise<string | null> => {
    const maxAttempts = 60; // 5 minutes max
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds between polls

      const progress = 50 + (i / maxAttempts) * 50;
      setVideoStates((prev) => ({
        ...prev,
        [sceneId]: { status: 'generating', progress: Math.min(progress, 95) },
      }));

      try {
        const response = await fetch(`/api/grok?taskId=${taskId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.status === 'complete' && data.videoUrl) {
            return data.videoUrl;
          }
          if (data.status === 'error') {
            throw new Error('Video generation failed');
          }
        }
      } catch (error) {
        console.error('Error polling video status:', error);
        return null;
      }
    }
    return null;
  };

  const handleGenerateVideo = async (scene: Scene) => {
    if (!scene.imageUrl) return;
    await generateSceneVideo(scene);
  };

  const handleGenerateAll = async () => {
    setIsGeneratingAll(true);
    for (const scene of scenesWithImages) {
      if (!scene.videoUrl) {
        await generateSceneVideo(scene);
      }
    }
    setIsGeneratingAll(false);
  };

  // Build full I2V prompt with dialogue (matching navod.txt format)
  const buildFullI2VPrompt = (scene: Scene): string => {
    let prompt = scene.imageToVideoPrompt || '';

    // Add dialogue if present
    if (scene.dialogue && scene.dialogue.length > 0) {
      const dialogueText = scene.dialogue
        .map((d) => `${d.characterName}: "${d.text}"`)
        .join('\n');
      prompt += `\n\nDialogue:\n${dialogueText}`;
    }

    return prompt;
  };

  const getStatusColor = (status: VideoStatus) => {
    switch (status) {
      case 'complete':
        return 'text-green-400 border-green-500/30';
      case 'generating':
        return 'text-amber-400 border-amber-500/30';
      case 'error':
        return 'text-red-400 border-red-500/30';
      default:
        return 'text-muted-foreground border-white/10';
    }
  };

  const getStatusIcon = (status: VideoStatus) => {
    switch (status) {
      case 'complete':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'generating':
        return (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <RefreshCw className="w-4 h-4" />
          </motion.div>
        );
      case 'error':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Video className="w-4 h-4" />;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500/20 to-red-500/20 mb-4"
        >
          <Video className="w-8 h-8 text-orange-400" />
        </motion.div>
        <h2 className="text-2xl font-bold mb-2">{t('steps.videos.title')}</h2>
        <p className="text-muted-foreground">{t('steps.videos.description')}</p>
      </div>

      {/* Progress Overview */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Film className="w-5 h-5 text-orange-400" />
              <span className="font-medium">{t('steps.videos.progress')}</span>
            </div>
            <Badge variant="outline" className="border-orange-500/30 text-orange-400">
              {scenesWithVideos.length} / {project.scenes.length} {t('steps.videos.videosGenerated')}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>~{Math.ceil((project.scenes.length - scenesWithVideos.length) * 0.5)} min</span>
          </div>
        </div>
        <Progress
          value={(scenesWithVideos.length / project.scenes.length) * 100}
          className="h-2"
        />
      </div>

      {/* Video Specifications Info */}
      <div className="glass rounded-xl p-4 border border-blue-500/20">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="space-y-2 flex-1">
            <h4 className="font-medium text-blue-400">{t('steps.videos.videoSpecs')}</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="glass rounded-lg p-2 text-center">
                <Clock className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">{t('steps.videos.duration')}</p>
                <p className="font-medium">6 {t('steps.videos.seconds')}</p>
              </div>
              <div className="glass rounded-lg p-2 text-center">
                <ImageIcon className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">{t('steps.videos.resolution')}</p>
                <p className="font-medium">{t('steps.videos.matchesImage')}</p>
              </div>
              <div className="glass rounded-lg p-2 text-center">
                <Volume2 className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">{t('steps.videos.audio')}</p>
                <p className="font-medium">{t('steps.videos.ambientAudio')}</p>
              </div>
              <div className="glass rounded-lg p-2 text-center">
                <Settings2 className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">{t('steps.videos.mode')}</p>
                <p className="font-medium capitalize">{videoMode}</p>
              </div>
            </div>
            <p className="text-xs text-amber-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {t('steps.videos.voiceoverNote')}
            </p>
          </div>
        </div>
      </div>

      {/* Cost Summary */}
      {scenesWithImages.length > 0 && (
        <div className="glass rounded-xl p-4 border border-green-500/20">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <Coins className="w-5 h-5 text-green-400" />
              <div>
                <p className="font-medium text-green-400">{t('steps.videos.costEstimate')}</p>
                <p className="text-xs text-muted-foreground">
                  {formatCostCompact(ACTION_COSTS.video.grok)} / video
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">{t('steps.videos.remaining')}</p>
                <p className="font-semibold text-lg">
                  {scenesWithImages.length - scenesWithVideos.length}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">{t('steps.videos.totalCost')}</p>
                <p className="font-semibold text-lg text-green-400">
                  {(scenesWithImages.length - scenesWithVideos.length) > 0
                    ? formatCostCompact((scenesWithImages.length - scenesWithVideos.length) * ACTION_COSTS.video.grok)
                    : `${formatCostCompact(ACTION_COSTS.video.grok)}/ea`}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-4 justify-center items-center">
        {/* Mode Selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{t('steps.videos.mode')}:</span>
          <Select value={videoMode} onValueChange={(v) => setVideoMode(v as 'fun' | 'normal')}>
            <SelectTrigger className="w-32 border-white/10 bg-white/5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="normal">{t('steps.videos.modeNormal')}</SelectItem>
              <SelectItem value="fun">{t('steps.videos.modeFun')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          variant="outline"
          className="border-white/10 hover:bg-white/5"
          disabled={scenesWithImages.length === 0}
          onClick={() => window.open('https://grok.x.ai', '_blank')}
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          {t('steps.videos.openGrok')}
        </Button>
        <Button
          className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white border-0"
          disabled={scenesWithImages.length === 0 || isGeneratingAll}
          onClick={handleGenerateAll}
        >
          {isGeneratingAll ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
              </motion.div>
              {t('steps.videos.generating')}
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 mr-2" />
              {t('steps.videos.generateAll')}
              <Badge variant="outline" className="ml-2 border-white/30 text-white text-[10px] px-1.5 py-0">
                {(scenesWithImages.length - scenesWithVideos.length) > 0
                  ? formatCostCompact((scenesWithImages.length - scenesWithVideos.length) * ACTION_COSTS.video.grok)
                  : `${formatCostCompact(ACTION_COSTS.video.grok)}/ea`}
              </Badge>
            </>
          )}
        </Button>
      </div>

      {/* Warning if no images */}
      {scenesWithImages.length === 0 && (
        <div className="glass rounded-xl p-6 border-l-4 border-amber-500 text-center">
          <AlertCircle className="w-8 h-8 text-amber-400 mx-auto mb-3" />
          <h3 className="font-semibold mb-2">{t('steps.videos.noImages')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('steps.videos.noImagesDescription')}
          </p>
        </div>
      )}

      {/* Scenes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {project.scenes.map((scene, index) => {
          const status = getSceneStatus(scene.id);
          const progress = videoStates[scene.id]?.progress || 0;

          return (
            <motion.div
              key={scene.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="glass border-white/10 overflow-hidden">
                {/* Video/Image Preview */}
                <div className="relative aspect-video bg-black/30">
                  {scene.videoUrl ? (
                    <video
                      src={scene.videoUrl}
                      className="w-full h-full object-cover"
                      poster={scene.imageUrl}
                      controls={playingVideo === scene.id}
                      onPlay={() => setPlayingVideo(scene.id)}
                      onPause={() => setPlayingVideo(null)}
                    />
                  ) : scene.imageUrl ? (
                    <img
                      src={scene.imageUrl}
                      alt={scene.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-12 h-12 text-muted-foreground/30" />
                    </div>
                  )}

                  {/* Status Overlay */}
                  {status === 'generating' && (
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                        className="w-12 h-12 mb-3"
                      >
                        <Sparkles className="w-full h-full text-orange-400" />
                      </motion.div>
                      <p className="text-sm text-white mb-2">{t('steps.videos.generatingVideo')}</p>
                      <div className="w-32">
                        <Progress value={progress} className="h-1" />
                      </div>
                      <span className="text-xs text-white/60 mt-1">{progress}%</span>
                    </div>
                  )}

                  {/* Play Button Overlay (for completed videos) */}
                  {scene.videoUrl && playingVideo !== scene.id && (
                    <button
                      onClick={() => setPlayingVideo(scene.id)}
                      className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors group"
                    >
                      <div className="w-14 h-14 rounded-full bg-white/20 group-hover:bg-white/30 flex items-center justify-center transition-colors backdrop-blur-sm">
                        <Play className="w-6 h-6 text-white ml-1" />
                      </div>
                    </button>
                  )}

                  {/* Scene Number Badge */}
                  <div className="absolute top-2 left-2">
                    <Badge className="bg-black/60 text-white border-0">
                      {t('steps.scenes.sceneLabel')} {scene.number || index + 1}
                    </Badge>
                  </div>

                  {/* Status Badge */}
                  <div className="absolute top-2 right-2">
                    <Badge variant="outline" className={`${getStatusColor(status)} bg-black/60`}>
                      {getStatusIcon(status)}
                      <span className="ml-1 capitalize">{status}</span>
                    </Badge>
                  </div>
                </div>

                <CardContent className="p-4 space-y-3">
                  <div>
                    <h3 className="font-semibold truncate">{scene.title}</h3>
                    <p className="text-xs text-muted-foreground">
                      {scene.duration || 6}s • {scene.cameraShot}
                    </p>
                  </div>

                  {/* Image-to-Video Prompt */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-orange-400">{t('steps.videos.i2vPrompt')}</span>
                      <CopyButton text={buildFullI2VPrompt(scene)} size="icon" className="h-5 w-5" />
                    </div>
                    <div className="glass rounded-lg p-2 max-h-16 overflow-y-auto">
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {scene.imageToVideoPrompt}
                      </p>
                    </div>
                  </div>

                  {/* Dialogue Section */}
                  {scene.dialogue && scene.dialogue.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3 text-purple-400" />
                        <span className="text-xs text-purple-400">{t('steps.videos.dialogue')}</span>
                      </div>
                      <div className="glass rounded-lg p-2 max-h-20 overflow-y-auto space-y-1">
                        {scene.dialogue.map((line, idx) => (
                          <p key={line.id || idx} className="text-xs">
                            <span className="text-purple-300 font-medium">{line.characterName}:</span>{' '}
                            <span className="text-muted-foreground">"{line.text}"</span>
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    {scene.imageUrl ? (
                      <>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 border-white/10 hover:bg-white/5"
                                onClick={() => handleGenerateVideo(scene)}
                                disabled={status === 'generating'}
                              >
                                {status === 'generating' ? (
                                  <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                  >
                                    <RefreshCw className="w-4 h-4" />
                                  </motion.div>
                                ) : (
                                  <Sparkles className="w-4 h-4" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{t('steps.videos.generateVideo')}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        {scene.videoUrl && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="border-white/10 hover:bg-white/5"
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{t('common.download')}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 border-amber-500/30 text-amber-400"
                        disabled
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {t('steps.videos.needsImage')}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Grok Instructions */}
      <div className="glass rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-orange-400" />
          <h3 className="font-semibold">{t('steps.videos.grokInstructions')}</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="glass rounded-lg p-4 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-400 font-bold">
              1
            </div>
            <p className="text-muted-foreground">{t('steps.videos.grokStep1')}</p>
          </div>
          <div className="glass rounded-lg p-4 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-400 font-bold">
              2
            </div>
            <p className="text-muted-foreground">{t('steps.videos.grokStep2')}</p>
          </div>
          <div className="glass rounded-lg p-4 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-400 font-bold">
              3
            </div>
            <p className="text-muted-foreground">{t('steps.videos.grokStep3')}</p>
          </div>
        </div>
      </div>

      {/* Tip */}
      <div className="glass rounded-xl p-4 border-l-4 border-orange-500">
        <p className="text-sm text-muted-foreground">
          <strong className="text-orange-400">Tip:</strong> {t('steps.videos.tip')}
        </p>
      </div>
    </div>
  );
}
