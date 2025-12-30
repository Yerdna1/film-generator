'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import {
  Download,
  FileJson,
  FileText,
  Package,
  Copy,
  CheckCircle2,
  Users,
  Film,
  Video,
  Mic,
  Image as ImageIcon,
  ExternalLink,
  Sparkles,
  FolderArchive,
  ClipboardList,
  Clock,
  Play,
  Scissors,
  Coins,
} from 'lucide-react';
import { COSTS } from '@/lib/services/credits';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useProjectStore } from '@/lib/stores/project-store';
import { exportProjectAsMarkdown, formatCharacterForExport, formatSceneForExport } from '@/lib/prompts/master-prompt';
import { CopyButton } from '@/components/shared/CopyButton';
import type { Project, ExportFormat } from '@/types/project';

interface Step6Props {
  project: Project;
}

export function Step6Export({ project: initialProject }: Step6Props) {
  const t = useTranslations();
  const { exportProject, projects } = useProjectStore();

  // Get live project data from store
  const project = projects.find(p => p.id === initialProject.id) || initialProject;

  const [exportFormat, setExportFormat] = useState<ExportFormat>('json');
  const [isExporting, setIsExporting] = useState(false);

  // Calculate completion stats
  const totalCharacters = project.characters.length;
  const charactersWithImages = project.characters.filter((c) => c.imageUrl).length;
  const totalScenes = project.scenes.length;
  const scenesWithImages = project.scenes.filter((s) => s.imageUrl).length;
  const scenesWithVideos = project.scenes.filter((s) => s.videoUrl).length;
  const totalDialogueLines = project.scenes.reduce((acc, s) => acc + s.dialogue.length, 0);
  const dialogueLinesWithAudio = project.scenes.reduce(
    (acc, s) => acc + s.dialogue.filter((d) => d.audioUrl).length,
    0
  );

  const overallProgress = Math.round(
    ((charactersWithImages + scenesWithImages + scenesWithVideos + dialogueLinesWithAudio) /
      (Math.max(totalCharacters, 1) +
        Math.max(totalScenes, 1) +
        Math.max(totalScenes, 1) +
        Math.max(totalDialogueLines, 1))) *
      100
  );

  const handleExportJSON = () => {
    const json = exportProject(project.id);
    if (json) {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name.replace(/\s+/g, '_')}_project.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleExportMarkdown = () => {
    const markdown = exportProjectAsMarkdown(
      project.story,
      project.characters,
      project.scenes,
      project.style
    );
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.replace(/\s+/g, '_')}_prompts.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportText = () => {
    let text = `# ${project.story.title}\n\n`;
    text += `## Characters\n\n`;
    project.characters.forEach((c) => {
      text += formatCharacterForExport(c) + '\n\n';
    });
    text += `## Scenes\n\n`;
    project.scenes.forEach((s) => {
      text += formatSceneForExport(s) + '\n\n';
    });

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.replace(/\s+/g, '_')}_prompts.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Generate CapCut-compatible project structure (simplified XML/JSON)
  const handleExportCapCut = () => {
    const fps = 30;
    const sceneDuration = 6; // seconds per scene
    const framesPerScene = fps * sceneDuration;

    // Calculate total duration
    const totalDuration = project.scenes.length * sceneDuration;
    const totalFrames = project.scenes.length * framesPerScene;

    // Create a structured project file for CapCut import
    const capcutProject = {
      meta: {
        name: project.story.title || project.name,
        duration: totalDuration,
        fps: fps,
        width: 1920,
        height: 1080,
        createdAt: new Date().toISOString(),
        generator: 'Film Generator AI Studio'
      },
      tracks: {
        video: project.scenes.map((scene, index) => ({
          id: scene.id,
          name: `Scene ${scene.number || index + 1}: ${scene.title}`,
          start: index * sceneDuration,
          duration: sceneDuration,
          startFrame: index * framesPerScene,
          endFrame: (index + 1) * framesPerScene,
          source: scene.videoUrl ? 'video' : scene.imageUrl ? 'image' : 'placeholder',
          hasVideo: !!scene.videoUrl,
          hasImage: !!scene.imageUrl,
          prompt: scene.imageToVideoPrompt,
        })),
        audio: project.scenes.flatMap((scene, sceneIndex) =>
          scene.dialogue.map((line, lineIndex) => ({
            id: `audio_${scene.id}_${lineIndex}`,
            sceneId: scene.id,
            character: line.characterName,
            text: line.text,
            start: sceneIndex * sceneDuration + (lineIndex * 2), // Stagger dialogue
            hasAudio: !!line.audioUrl,
          }))
        ),
      },
      assets: {
        videos: project.scenes.filter(s => s.videoUrl).map(s => ({
          id: s.id,
          title: s.title,
          duration: s.duration || 6,
        })),
        images: project.scenes.filter(s => s.imageUrl && !s.videoUrl).map(s => ({
          id: s.id,
          title: s.title,
        })),
        audio: project.scenes.flatMap(s =>
          s.dialogue.filter(d => d.audioUrl).map(d => ({
            character: d.characterName,
            text: d.text,
          }))
        ),
      },
      timeline: {
        totalDuration,
        totalFrames,
        scenes: project.scenes.map((scene, index) => ({
          number: scene.number || index + 1,
          title: scene.title,
          timeStart: `${Math.floor(index * sceneDuration / 60)}:${String((index * sceneDuration) % 60).padStart(2, '0')}`,
          timeEnd: `${Math.floor((index + 1) * sceneDuration / 60)}:${String(((index + 1) * sceneDuration) % 60).padStart(2, '0')}`,
          dialogueLines: scene.dialogue.length,
        })),
      },
    };

    const blob = new Blob([JSON.stringify(capcutProject, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.replace(/\s+/g, '_')}_capcut_project.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Calculate total project duration
  const totalDuration = project.scenes.length * 6; // 6 seconds per scene
  const totalMinutes = Math.floor(totalDuration / 60);
  const totalSeconds = totalDuration % 60;

  // Calculate total credits spent
  const creditsSpent = {
    images: scenesWithImages * COSTS.IMAGE_GENERATION + charactersWithImages * COSTS.IMAGE_GENERATION,
    videos: scenesWithVideos * COSTS.VIDEO_GENERATION,
    voiceovers: dialogueLinesWithAudio * COSTS.VOICEOVER_LINE,
    scenes: totalScenes * COSTS.SCENE_GENERATION,
  };
  const totalCreditsSpent = creditsSpent.images + creditsSpent.videos + creditsSpent.voiceovers + creditsSpent.scenes;

  const getFullMarkdown = () => {
    return exportProjectAsMarkdown(project.story, project.characters, project.scenes, project.style);
  };

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
      <Card className="glass border-white/10 overflow-hidden">
        <CardHeader className="border-b border-white/5">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-green-400" />
              {t('steps.export.projectSummary')}
            </CardTitle>
            <Badge
              className={`${
                overallProgress >= 80
                  ? 'bg-green-500/20 text-green-400'
                  : overallProgress >= 50
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-red-500/20 text-red-400'
              } border-0`}
            >
              {overallProgress}% {t('steps.export.complete')}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {/* Characters */}
            <div className="glass rounded-xl p-4 text-center">
              <Users className="w-6 h-6 text-purple-400 mx-auto mb-2" />
              <p className="text-2xl font-bold">{totalCharacters}</p>
              <p className="text-xs text-muted-foreground">{t('steps.export.characters')}</p>
              <Progress
                value={(charactersWithImages / Math.max(totalCharacters, 1)) * 100}
                className="h-1 mt-2"
              />
            </div>

            {/* Scenes */}
            <div className="glass rounded-xl p-4 text-center">
              <ImageIcon className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
              <p className="text-2xl font-bold">{totalScenes}</p>
              <p className="text-xs text-muted-foreground">{t('steps.export.scenes')}</p>
              <Progress
                value={(scenesWithImages / Math.max(totalScenes, 1)) * 100}
                className="h-1 mt-2"
              />
            </div>

            {/* Videos */}
            <div className="glass rounded-xl p-4 text-center">
              <Video className="w-6 h-6 text-orange-400 mx-auto mb-2" />
              <p className="text-2xl font-bold">{scenesWithVideos}</p>
              <p className="text-xs text-muted-foreground">{t('steps.export.videos')}</p>
              <Progress
                value={(scenesWithVideos / Math.max(totalScenes, 1)) * 100}
                className="h-1 mt-2"
              />
            </div>

            {/* Voiceovers */}
            <div className="glass rounded-xl p-4 text-center">
              <Mic className="w-6 h-6 text-violet-400 mx-auto mb-2" />
              <p className="text-2xl font-bold">{dialogueLinesWithAudio}</p>
              <p className="text-xs text-muted-foreground">{t('steps.export.voiceovers')}</p>
              <Progress
                value={(dialogueLinesWithAudio / Math.max(totalDialogueLines, 1)) * 100}
                className="h-1 mt-2"
              />
            </div>
          </div>

          {/* Story Details */}
          <div className="glass rounded-xl p-4 space-y-2">
            <h3 className="font-semibold">{project.story.title || 'Untitled Story'}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2">{project.story.concept}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge variant="outline" className="border-white/10">
                {project.story.genre}
              </Badge>
              <Badge variant="outline" className="border-white/10">
                {project.story.tone}
              </Badge>
              <Badge variant="outline" className="border-white/10">
                {project.style}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline View */}
      <Card className="glass border-white/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-cyan-400" />
              {t('steps.export.timeline')}
            </CardTitle>
            <Badge variant="outline" className="border-cyan-500/30 text-cyan-400">
              {totalMinutes}:{String(totalSeconds).padStart(2, '0')} {t('steps.export.totalDuration')}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {/* Timeline visualization */}
          <div className="relative">
            {/* Timeline ruler */}
            <div className="flex justify-between text-xs text-muted-foreground mb-2 px-1">
              {Array.from({ length: Math.min(project.scenes.length + 1, 13) }, (_, i) => {
                const time = i * 6;
                return (
                  <span key={i}>
                    {Math.floor(time / 60)}:{String(time % 60).padStart(2, '0')}
                  </span>
                );
              })}
            </div>

            {/* Video track */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Video className="w-4 h-4 text-orange-400" />
                <span className="text-xs font-medium text-orange-400">{t('steps.export.videoTrack')}</span>
              </div>
              <div className="flex gap-1 h-16 overflow-x-auto pb-2">
                {project.scenes.map((scene, index) => (
                  <motion.div
                    key={scene.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className={`flex-shrink-0 w-24 h-full rounded-lg overflow-hidden border-2 relative ${
                      scene.videoUrl
                        ? 'border-green-500/50'
                        : scene.imageUrl
                        ? 'border-amber-500/50'
                        : 'border-white/10'
                    }`}
                  >
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
                        className="w-full h-full object-cover opacity-70"
                      />
                    ) : (
                      <div className="w-full h-full bg-white/5 flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-muted-foreground/30" />
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5">
                      <p className="text-[10px] text-white truncate">{scene.number || index + 1}. {scene.title}</p>
                    </div>
                    {scene.videoUrl && (
                      <div className="absolute top-1 right-1">
                        <Play className="w-3 h-3 text-green-400" />
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Audio track */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Mic className="w-4 h-4 text-violet-400" />
                <span className="text-xs font-medium text-violet-400">{t('steps.export.audioTrack')}</span>
              </div>
              <div className="flex gap-1 h-8 overflow-x-auto pb-2">
                {project.scenes.map((scene, index) => (
                  <div
                    key={scene.id}
                    className="flex-shrink-0 w-24 h-full rounded-lg overflow-hidden flex items-center justify-center gap-0.5"
                  >
                    {scene.dialogue.length > 0 ? (
                      scene.dialogue.map((line, lineIdx) => (
                        <div
                          key={lineIdx}
                          className={`h-full flex-1 rounded ${
                            line.audioUrl
                              ? 'bg-violet-500/50'
                              : 'bg-violet-500/20 border border-dashed border-violet-500/30'
                          }`}
                          title={`${line.characterName}: ${line.text}`}
                        />
                      ))
                    ) : (
                      <div className="w-full h-full bg-white/5 rounded" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Timeline legend */}
          <div className="flex flex-wrap gap-4 mt-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-green-500/50 border border-green-500" />
              <span className="text-muted-foreground">{t('steps.export.hasVideo')}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-amber-500/50 border border-amber-500" />
              <span className="text-muted-foreground">{t('steps.export.hasImage')}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-violet-500/50" />
              <span className="text-muted-foreground">{t('steps.export.hasAudio')}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-white/10 border border-dashed border-white/20" />
              <span className="text-muted-foreground">{t('steps.export.missing')}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Credits Summary */}
      <Card className="glass border-white/10 border-amber-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-400" />
            {t('steps.export.creditsUsed')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="glass rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">{t('credits.image')}</p>
              <p className="font-semibold text-purple-400">{creditsSpent.images} pts</p>
            </div>
            <div className="glass rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">{t('credits.video')}</p>
              <p className="font-semibold text-orange-400">{creditsSpent.videos} pts</p>
            </div>
            <div className="glass rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">{t('credits.voiceover')}</p>
              <p className="font-semibold text-violet-400">{creditsSpent.voiceovers} pts</p>
            </div>
            <div className="glass rounded-lg p-3 text-center border border-amber-500/30">
              <p className="text-xs text-muted-foreground">{t('credits.title')}</p>
              <p className="font-bold text-lg text-amber-400">{totalCreditsSpent} pts</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export Options */}
      <Card className="glass border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-green-400" />
            {t('steps.export.exportOptions')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* JSON Export */}
            <button
              onClick={handleExportJSON}
              className="glass rounded-xl p-4 text-left hover:bg-white/5 transition-colors border border-transparent hover:border-green-500/30 group"
            >
              <FileJson className="w-8 h-8 text-blue-400 mb-3 group-hover:scale-110 transition-transform" />
              <h4 className="font-semibold mb-1">JSON</h4>
              <p className="text-xs text-muted-foreground">
                {t('steps.export.jsonDescription')}
              </p>
            </button>

            {/* Markdown Export */}
            <button
              onClick={handleExportMarkdown}
              className="glass rounded-xl p-4 text-left hover:bg-white/5 transition-colors border border-transparent hover:border-green-500/30 group"
            >
              <FileText className="w-8 h-8 text-green-400 mb-3 group-hover:scale-110 transition-transform" />
              <h4 className="font-semibold mb-1">Markdown</h4>
              <p className="text-xs text-muted-foreground">
                {t('steps.export.markdownDescription')}
              </p>
            </button>

            {/* Text Export */}
            <button
              onClick={handleExportText}
              className="glass rounded-xl p-4 text-left hover:bg-white/5 transition-colors border border-transparent hover:border-green-500/30 group"
            >
              <ClipboardList className="w-8 h-8 text-amber-400 mb-3 group-hover:scale-110 transition-transform" />
              <h4 className="font-semibold mb-1">Text</h4>
              <p className="text-xs text-muted-foreground">
                {t('steps.export.textDescription')}
              </p>
            </button>

            {/* CapCut Export */}
            <button
              onClick={handleExportCapCut}
              className="glass rounded-xl p-4 text-left hover:bg-white/5 transition-colors border border-transparent hover:border-cyan-500/30 group"
            >
              <Scissors className="w-8 h-8 text-cyan-400 mb-3 group-hover:scale-110 transition-transform" />
              <h4 className="font-semibold mb-1">CapCut</h4>
              <p className="text-xs text-muted-foreground">
                {t('steps.export.capcutDescription')}
              </p>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Prompts Preview */}
      <Card className="glass border-white/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-green-400" />
              {t('steps.export.promptsPreview')}
            </CardTitle>
            <CopyButton text={getFullMarkdown()} />
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="characters" className="w-full">
            <TabsList className="glass w-full justify-start mb-4">
              <TabsTrigger value="characters">
                <Users className="w-4 h-4 mr-2" />
                {t('steps.export.characters')}
              </TabsTrigger>
              <TabsTrigger value="scenes">
                <Film className="w-4 h-4 mr-2" />
                {t('steps.export.scenes')}
              </TabsTrigger>
              <TabsTrigger value="full">
                <FileText className="w-4 h-4 mr-2" />
                {t('steps.export.fullDocument')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="characters" className="space-y-4">
              {project.characters.map((character) => (
                <div key={character.id} className="glass rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      {character.imageUrl ? (
                        <img
                          src={character.imageUrl}
                          alt={character.name}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                          <Users className="w-5 h-5 text-purple-400" />
                        </div>
                      )}
                      <h4 className="font-semibold">{character.name}</h4>
                    </div>
                    <CopyButton text={character.masterPrompt} size="icon" className="h-8 w-8" />
                  </div>
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono bg-black/20 rounded p-3 max-h-32 overflow-y-auto">
                    {character.masterPrompt}
                  </pre>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="scenes">
              <Accordion type="multiple" className="space-y-2">
                {project.scenes.map((scene, index) => (
                  <AccordionItem
                    key={scene.id}
                    value={scene.id}
                    className="glass rounded-lg border-white/5"
                  >
                    <AccordionTrigger className="px-4 hover:no-underline">
                      <div className="flex items-center gap-3">
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-0">
                          {scene.number || index + 1}
                        </Badge>
                        <span>{scene.title}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4 space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-emerald-400">{t('steps.scenes.textToImagePrompt')}</span>
                          <CopyButton text={scene.textToImagePrompt} size="icon" className="h-6 w-6" />
                        </div>
                        <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono bg-black/20 rounded p-2">
                          {scene.textToImagePrompt}
                        </pre>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-orange-400">{t('steps.scenes.imageToVideoPrompt')}</span>
                          <CopyButton text={scene.imageToVideoPrompt} size="icon" className="h-6 w-6" />
                        </div>
                        <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono bg-black/20 rounded p-2">
                          {scene.imageToVideoPrompt}
                        </pre>
                      </div>
                      {scene.dialogue.length > 0 && (
                        <div>
                          <span className="text-xs text-violet-400">{t('steps.scenes.dialogue')}</span>
                          <div className="bg-black/20 rounded p-2 mt-1">
                            {scene.dialogue.map((line, idx) => (
                              <p key={idx} className="text-xs text-muted-foreground">
                                <span className="text-violet-400">{line.characterName}:</span> "{line.text}"
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </TabsContent>

            <TabsContent value="full">
              <div className="glass rounded-lg p-4 max-h-96 overflow-y-auto">
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
                  {getFullMarkdown()}
                </pre>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Next Steps */}
      <div className="glass rounded-xl p-6 space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <ExternalLink className="w-5 h-5 text-green-400" />
          {t('steps.export.nextSteps')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="glass rounded-lg p-4">
            <h4 className="font-medium mb-2 text-cyan-400">CapCut</h4>
            <p className="text-muted-foreground">
              {t('steps.export.capcutInstructions')}
            </p>
          </div>
          <div className="glass rounded-lg p-4">
            <h4 className="font-medium mb-2 text-purple-400">DaVinci Resolve</h4>
            <p className="text-muted-foreground">
              {t('steps.export.davinciInstructions')}
            </p>
          </div>
        </div>
      </div>

      {/* Completion Banner */}
      {overallProgress >= 80 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-xl p-6 border-2 border-green-500/30 text-center"
        >
          <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
          <h3 className="text-xl font-bold mb-2">{t('steps.export.congratulations')}</h3>
          <p className="text-muted-foreground mb-4">
            {t('steps.export.congratulationsDescription')}
          </p>
          <Button
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white border-0"
            onClick={handleExportMarkdown}
          >
            <Download className="w-4 h-4 mr-2" />
            {t('steps.export.downloadAllPrompts')}
          </Button>
        </motion.div>
      )}

      {/* Tip */}
      <div className="glass rounded-xl p-4 border-l-4 border-green-500">
        <p className="text-sm text-muted-foreground">
          <strong className="text-green-400">Tip:</strong> {t('steps.export.tip')}
        </p>
      </div>
    </div>
  );
}
