'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Image as ImageIcon,
  Plus,
  Trash2,
  Sparkles,
  RefreshCw,
  Edit3,
  Save,
  X,
  Camera,
  Film,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Eye,
  Expand,
  Zap,
  Wand2,
  User,
  FileText,
  Copy,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { useProjectStore } from '@/lib/stores/project-store';
import { generateScenePrompt } from '@/lib/prompts/master-prompt';
import { CopyButton } from '@/components/shared/CopyButton';
import { Progress } from '@/components/ui/progress';
import type { Project, Scene, CameraShot, DialogueLine } from '@/types/project';
import { CostBadge } from '@/components/shared/CostBadge';
import { ACTION_COSTS, getImageCost, formatCostCompact, IMAGE_RESOLUTIONS, ASPECT_RATIOS, type ImageResolution, type AspectRatio } from '@/lib/services/real-costs';

interface Step3Props {
  project: Project;
}

const cameraShots: { value: CameraShot; label: string }[] = [
  { value: 'wide', label: 'Wide Shot' },
  { value: 'medium', label: 'Medium Shot' },
  { value: 'close-up', label: 'Close-up' },
  { value: 'extreme-close-up', label: 'Extreme Close-up' },
  { value: 'over-shoulder', label: 'Over Shoulder' },
  { value: 'pov', label: 'POV' },
  { value: 'aerial', label: 'Aerial' },
  { value: 'low-angle', label: 'Low Angle' },
  { value: 'high-angle', label: 'High Angle' },
];

export function Step3SceneGenerator({ project: initialProject }: Step3Props) {
  const t = useTranslations();
  const { addScene, updateScene, deleteScene, updateSettings, projects } = useProjectStore();

  // Get live project data from store
  const project = projects.find(p => p.id === initialProject.id) || initialProject;

  const [isAddingScene, setIsAddingScene] = useState(false);
  const [editingScene, setEditingScene] = useState<string | null>(null);
  const [expandedScenes, setExpandedScenes] = useState<string[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isGeneratingScenes, setIsGeneratingScenes] = useState(false);
  const [generatingImageForScene, setGeneratingImageForScene] = useState<string | null>(null);
  const [isGeneratingAllImages, setIsGeneratingAllImages] = useState(false);
  const [sceneAspectRatio, setSceneAspectRatio] = useState<AspectRatio>('16:9');
  const [showPromptsDialog, setShowPromptsDialog] = useState(false);

  const [newScene, setNewScene] = useState({
    title: '',
    description: '',
    cameraShot: 'medium' as CameraShot,
    dialogue: [] as { characterId: string; text: string; characterName: string }[],
  });

  const [newDialogueLine, setNewDialogueLine] = useState({
    characterId: '',
    text: '',
  });

  const [editSceneData, setEditSceneData] = useState<{
    title: string;
    description: string;
    cameraShot: CameraShot;
    textToImagePrompt: string;
    imageToVideoPrompt: string;
    dialogue: DialogueLine[];
  } | null>(null);

  const toggleExpanded = (sceneId: string) => {
    setExpandedScenes((prev) =>
      prev.includes(sceneId)
        ? prev.filter((id) => id !== sceneId)
        : [...prev, sceneId]
    );
  };

  const handleAddScene = () => {
    if (!newScene.title.trim()) return;

    const { textToImagePrompt, imageToVideoPrompt } = generateScenePrompt(
      {
        title: newScene.title,
        description: newScene.description,
        cameraShot: newScene.cameraShot,
      },
      project.style,
      project.characters
    );

    const sceneNumber = project.scenes.length + 1;

    addScene(project.id, {
      number: sceneNumber,
      title: newScene.title,
      description: newScene.description,
      textToImagePrompt,
      imageToVideoPrompt,
      dialogue: newScene.dialogue.map((d, idx) => ({
        id: `${Date.now()}-${idx}`,
        characterId: d.characterId,
        characterName: d.characterName,
        text: d.text,
      })),
      cameraShot: newScene.cameraShot,
      duration: 6,
    });

    setNewScene({
      title: '',
      description: '',
      cameraShot: 'medium',
      dialogue: [],
    });
    setIsAddingScene(false);
  };

  const regeneratePrompts = (scene: Scene) => {
    const { textToImagePrompt, imageToVideoPrompt } = generateScenePrompt(
      {
        title: scene.title,
        description: scene.textToImagePrompt,
        cameraShot: scene.cameraShot,
      },
      project.style,
      project.characters
    );
    updateScene(project.id, scene.id, { textToImagePrompt, imageToVideoPrompt });
  };

  const startEditScene = (scene: Scene) => {
    setEditSceneData({
      title: scene.title,
      description: scene.description || '',
      cameraShot: scene.cameraShot,
      textToImagePrompt: scene.textToImagePrompt,
      imageToVideoPrompt: scene.imageToVideoPrompt,
      dialogue: [...scene.dialogue],
    });
    setEditingScene(scene.id);
  };

  const saveEditScene = () => {
    if (!editingScene || !editSceneData) return;

    updateScene(project.id, editingScene, {
      title: editSceneData.title,
      description: editSceneData.description,
      cameraShot: editSceneData.cameraShot,
      textToImagePrompt: editSceneData.textToImagePrompt,
      imageToVideoPrompt: editSceneData.imageToVideoPrompt,
      dialogue: editSceneData.dialogue,
    });

    setEditingScene(null);
    setEditSceneData(null);
  };

  const cancelEditScene = () => {
    setEditingScene(null);
    setEditSceneData(null);
  };

  const handleSceneCountChange = (value: string) => {
    updateSettings(project.id, { sceneCount: parseInt(value) as 12 | 24 | 36 | 48 | 60 });
  };

  // Generate all scenes from story concept using Claude AI
  const handleGenerateAllScenes = async () => {
    if (project.characters.length === 0) {
      alert('Please add characters in Step 2 first');
      return;
    }

    setIsGeneratingScenes(true);

    try {
      const response = await fetch('/api/claude/scenes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          story: project.story,
          characters: project.characters.map((c) => ({
            id: c.id,
            name: c.name,
            description: c.description,
            masterPrompt: c.masterPrompt,
          })),
          style: project.style,
          sceneCount: project.settings.sceneCount,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate scenes');
      }

      const { scenes: generatedScenes } = await response.json();

      // Add each scene to the project
      for (const sceneData of generatedScenes) {
        await addScene(project.id, {
          number: sceneData.number,
          title: sceneData.title,
          description: sceneData.description || '',
          textToImagePrompt: sceneData.textToImagePrompt,
          imageToVideoPrompt: sceneData.imageToVideoPrompt,
          dialogue: sceneData.dialogue || [],
          cameraShot: sceneData.cameraShot === 'close-up' ? 'close-up' : 'medium',
          duration: 6,
        });
        await new Promise((resolve) => setTimeout(resolve, 100)); // Small delay between each scene
      }
    } catch (error) {
      console.error('Error generating scenes:', error);
      alert(`Failed to generate scenes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGeneratingScenes(false);
    }
  };

  // Add dialogue line to new scene
  const handleAddDialogue = () => {
    if (!newDialogueLine.characterId || !newDialogueLine.text.trim()) return;

    const character = project.characters.find((c) => c.id === newDialogueLine.characterId);
    if (!character) return;

    setNewScene({
      ...newScene,
      dialogue: [
        ...newScene.dialogue,
        {
          characterId: newDialogueLine.characterId,
          characterName: character.name,
          text: newDialogueLine.text.trim(),
        },
      ],
    });

    setNewDialogueLine({ characterId: '', text: '' });
  };

  // Remove dialogue line from new scene
  const handleRemoveDialogue = (index: number) => {
    setNewScene({
      ...newScene,
      dialogue: newScene.dialogue.filter((_, i) => i !== index),
    });
  };

  // Generate image for a single scene - includes character images as reference for consistency
  const handleGenerateSceneImage = async (scene: Scene) => {
    setGeneratingImageForScene(scene.id);

    try {
      // Build reference images from characters that have images
      const referenceImages = project.characters
        .filter((c) => c.imageUrl)
        .map((c) => ({
          name: c.name,
          imageUrl: c.imageUrl!,
        }));

      const imageResolution = project.settings?.imageResolution || '2k';
      const response = await fetch('/api/gemini/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: scene.textToImagePrompt,
          aspectRatio: sceneAspectRatio,
          resolution: imageResolution,
          referenceImages, // Pass character images for visual consistency
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
        throw new Error(errorData?.error || errorData?.message || 'Failed to generate image');
      }

      const { imageUrl } = await response.json();
      updateScene(project.id, scene.id, { imageUrl });

      // Refresh credits display
      window.dispatchEvent(new CustomEvent('credits-updated'));
    } catch (error) {
      console.error('Error generating scene image:', error);
      alert(`Failed to generate image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setGeneratingImageForScene(null);
    }
  };

  // Generate all scene images - includes character images as reference for consistency
  const handleGenerateAllSceneImages = async () => {
    const scenesWithoutImages = project.scenes.filter((s) => !s.imageUrl);
    if (scenesWithoutImages.length === 0) {
      alert('All scenes already have images');
      return;
    }

    // Build reference images from characters that have images
    const referenceImages = project.characters
      .filter((c) => c.imageUrl)
      .map((c) => ({
        name: c.name,
        imageUrl: c.imageUrl!,
      }));

    setIsGeneratingAllImages(true);

    try {
      const imageResolution = project.settings?.imageResolution || '2k';
      for (const scene of scenesWithoutImages) {
        setGeneratingImageForScene(scene.id);

        const response = await fetch('/api/gemini/image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: scene.textToImagePrompt,
            aspectRatio: sceneAspectRatio,
            resolution: imageResolution,
            referenceImages, // Pass character images for visual consistency
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
          const errorMessage = errorData?.error || errorData?.message || 'Unknown error';
          console.error(`Failed to generate image for scene ${scene.number}: ${errorMessage}`);
          // Show error to user but continue with remaining scenes
          alert(`Scene ${scene.number} failed: ${errorMessage}`);
          continue;
        }

        const { imageUrl } = await response.json();
        updateScene(project.id, scene.id, { imageUrl });

        // Refresh credits display after each image
        window.dispatchEvent(new CustomEvent('credits-updated'));

        // Small delay between generations to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error('Error generating scene images:', error);
      alert(`Error during batch generation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setGeneratingImageForScene(null);
      setIsGeneratingAllImages(false);
    }
  };

  const scenesWithImages = project.scenes.filter((s) => s.imageUrl).length;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 mb-4"
        >
          <ImageIcon className="w-8 h-8 text-emerald-400" />
        </motion.div>
        <h2 className="text-2xl font-bold mb-2">{t('steps.scenes.title')}</h2>
        <p className="text-muted-foreground">{t('steps.scenes.description')}</p>
      </div>

      {/* Progress & Scene Count */}
      <div className="glass rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Label className="text-sm text-muted-foreground">{t('steps.scenes.sceneCount')}:</Label>
            <Select
              value={project.settings.sceneCount.toString()}
              onValueChange={handleSceneCountChange}
              disabled={project.scenes.length > 0}
            >
              <SelectTrigger className="w-32 glass border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="glass-strong border-white/10">
                {[12, 24, 36, 48, 60].map((count) => (
                  <SelectItem key={count} value={count.toString()}>
                    {count} {t('steps.scenes.scenesLabel')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Image Quality Selector */}
          <div className="flex items-center gap-2">
            <Label className="text-sm text-muted-foreground whitespace-nowrap">Quality:</Label>
            <Select
              value={project.settings?.imageResolution || '2k'}
              onValueChange={(value) => updateSettings(project.id, { imageResolution: value as ImageResolution })}
            >
              <SelectTrigger className="w-40 glass border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="glass-strong border-white/10">
                {(Object.entries(IMAGE_RESOLUTIONS) as [ImageResolution, { label: string; maxPixels: string; description: string }][]).map(([key, data]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium">{data.label}</span>
                      <span className="text-xs text-muted-foreground">{formatCostCompact(getImageCost(key))}/img</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Aspect Ratio Selector */}
          <div className="flex items-center gap-2">
            <Label className="text-sm text-muted-foreground whitespace-nowrap">Aspect:</Label>
            <Select
              value={sceneAspectRatio}
              onValueChange={(value) => setSceneAspectRatio(value as AspectRatio)}
            >
              <SelectTrigger className="w-44 glass border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="glass-strong border-white/10">
                {(Object.entries(ASPECT_RATIOS) as [AspectRatio, { label: string; description: string }][]).map(([key, data]) => (
                  <SelectItem key={key} value={key}>
                    <span className="font-medium">{data.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-4">
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-400">
              {project.scenes.length} / {project.settings.sceneCount} {t('steps.scenes.scenesLabel')}
            </Badge>
            <Badge variant="outline" className="border-cyan-500/30 text-cyan-400">
              {scenesWithImages} {t('steps.scenes.imagesGenerated')}
            </Badge>
          </div>
        </div>

        <Progress
          value={(project.scenes.length / project.settings.sceneCount) * 100}
          className="h-2"
        />

        {/* Generate All Scenes Button */}
        {project.scenes.length === 0 && (
          <div className="flex justify-center pt-2">
            <Button
              className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white border-0 px-6"
              disabled={isGeneratingScenes || project.characters.length === 0}
              onClick={handleGenerateAllScenes}
            >
              {isGeneratingScenes ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                  </motion.div>
                  {t('steps.scenes.generatingScenes')}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  {t('steps.scenes.generateWithAI')}
                  <Badge variant="outline" className="ml-2 border-white/30 text-white text-[10px] px-1.5 py-0">
                    {formatCostCompact(ACTION_COSTS.scene.claude * project.settings.sceneCount)}
                  </Badge>
                </>
              )}
            </Button>
          </div>
        )}

        {project.characters.length === 0 && project.scenes.length === 0 && (
          <p className="text-sm text-amber-400 text-center">
            {t('steps.scenes.addCharactersFirst')}
          </p>
        )}
      </div>

      {/* Scenes List */}
      <div className="space-y-4">
        {project.scenes.map((scene, index) => (
          <motion.div
            key={scene.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="glass border-white/10 overflow-hidden">
              <Collapsible
                open={expandedScenes.includes(scene.id)}
                onOpenChange={() => toggleExpanded(scene.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Scene Number */}
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500/30 to-teal-500/30 flex items-center justify-center font-bold text-emerald-400">
                        {scene.number || index + 1}
                      </div>

                      {/* Scene Image or Placeholder */}
                      {scene.imageUrl ? (
                        <button
                          onClick={() => setPreviewImage(scene.imageUrl!)}
                          className="relative w-16 h-10 rounded-lg overflow-hidden group"
                        >
                          <img
                            src={scene.imageUrl}
                            alt={scene.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Expand className="w-4 h-4 text-white" />
                          </div>
                        </button>
                      ) : (
                        <div className="w-16 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                          <ImageIcon className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}

                      <div>
                        <CardTitle className="text-base">{scene.title}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-400">
                            <Camera className="w-3 h-3 mr-1" />
                            {scene.cameraShot}
                          </Badge>
                          {scene.dialogue.length > 0 && (
                            <Badge variant="outline" className="text-xs border-purple-500/30 text-purple-400">
                              <MessageSquare className="w-3 h-3 mr-1" />
                              {scene.dialogue.length}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteScene(project.id, scene.id)}
                        className="text-muted-foreground hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="icon">
                          {expandedScenes.includes(scene.id) ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                  </div>
                </CardHeader>

                <CollapsibleContent>
                  <CardContent className="space-y-4 pt-0">
                    {/* Text-to-Image Prompt */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-emerald-400 flex items-center gap-1">
                          <ImageIcon className="w-3 h-3" />
                          {t('steps.scenes.textToImagePrompt')}
                        </Label>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => regeneratePrompts(scene)}
                          >
                            <RefreshCw className="w-3 h-3" />
                          </Button>
                          <CopyButton text={scene.textToImagePrompt} size="icon" className="h-6 w-6" />
                        </div>
                      </div>
                      <div className="glass rounded-lg p-3 max-h-32 overflow-y-auto">
                        <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
                          {scene.textToImagePrompt}
                        </pre>
                      </div>
                    </div>

                    {/* Image-to-Video Prompt */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-cyan-400 flex items-center gap-1">
                          <Film className="w-3 h-3" />
                          {t('steps.scenes.imageToVideoPrompt')}
                        </Label>
                        <CopyButton text={scene.imageToVideoPrompt} size="icon" className="h-6 w-6" />
                      </div>
                      <div className="glass rounded-lg p-3 max-h-24 overflow-y-auto">
                        <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
                          {scene.imageToVideoPrompt}
                        </pre>
                      </div>
                    </div>

                    {/* Dialogue */}
                    {scene.dialogue.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-xs text-purple-400 flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          {t('steps.scenes.dialogue')}
                        </Label>
                        <div className="glass rounded-lg p-3 space-y-2">
                          {scene.dialogue.map((line, idx) => {
                            const character = project.characters.find(
                              (c) => c.id === line.characterId
                            );
                            return (
                              <div key={idx} className="text-sm">
                                <span className="font-semibold text-purple-400">
                                  {character?.name || 'Unknown'}:
                                </span>{' '}
                                <span className="text-muted-foreground">"{line.text}"</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 border-white/10 hover:bg-white/5"
                        onClick={() => startEditScene(scene)}
                      >
                        <Edit3 className="w-4 h-4 mr-2" />
                        {t('common.edit')}
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 bg-gradient-to-r from-emerald-600/80 to-teal-600/80 hover:from-emerald-500 hover:to-teal-500 text-white border-0"
                        onClick={() => handleGenerateSceneImage(scene)}
                        disabled={generatingImageForScene === scene.id || isGeneratingAllImages}
                      >
                        {generatingImageForScene === scene.id ? (
                          <>
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            >
                              <Sparkles className="w-4 h-4 mr-2" />
                            </motion.div>
                            {t('steps.characters.generating')}
                          </>
                        ) : scene.imageUrl ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            {t('common.regenerate')}
                            <span className="ml-1 text-[10px] opacity-80">{formatCostCompact(getImageCost(project.settings?.imageResolution || '2k'))}</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            {t('steps.scenes.generateImage')}
                            <span className="ml-1 text-[10px] opacity-80">{formatCostCompact(getImageCost(project.settings?.imageResolution || '2k'))}</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          </motion.div>
        ))}

        {/* Add Scene Button */}
        {project.scenes.length < project.settings.sceneCount && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: project.scenes.length * 0.05 }}
          >
            <Dialog open={isAddingScene} onOpenChange={setIsAddingScene}>
              <DialogTrigger asChild>
                <button className="w-full glass rounded-xl border-2 border-dashed border-white/10 hover:border-emerald-500/30 transition-colors p-6 flex items-center justify-center gap-4 group">
                  <div className="w-12 h-12 rounded-xl bg-white/5 group-hover:bg-emerald-500/20 transition-colors flex items-center justify-center">
                    <Plus className="w-6 h-6 text-muted-foreground group-hover:text-emerald-400 transition-colors" />
                  </div>
                  <span className="text-muted-foreground group-hover:text-foreground transition-colors">
                    {t('steps.scenes.addScene')}
                  </span>
                </button>
              </DialogTrigger>
              <DialogContent className="glass-strong border-white/10 max-w-lg">
                <DialogHeader>
                  <DialogTitle>{t('steps.scenes.addScene')}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>{t('steps.scenes.sceneTitle')}</Label>
                    <Input
                      placeholder="e.g., The Discovery"
                      value={newScene.title}
                      onChange={(e) => setNewScene({ ...newScene, title: e.target.value })}
                      className="glass border-white/10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('steps.scenes.cameraShot')}</Label>
                    <Select
                      value={newScene.cameraShot}
                      onValueChange={(value) =>
                        setNewScene({ ...newScene, cameraShot: value as CameraShot })
                      }
                    >
                      <SelectTrigger className="glass border-white/10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="glass-strong border-white/10">
                        {cameraShots.map((shot) => (
                          <SelectItem key={shot.value} value={shot.value}>
                            {shot.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('steps.scenes.sceneDescription')}</Label>
                    <Textarea
                      placeholder="Describe what happens in this scene..."
                      value={newScene.description}
                      onChange={(e) => setNewScene({ ...newScene, description: e.target.value })}
                      className="glass border-white/10 min-h-[100px]"
                    />
                  </div>

                  {/* Dialogue Editor */}
                  <div className="space-y-3">
                    <Label className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-purple-400" />
                      {t('steps.scenes.dialogue')}
                    </Label>

                    {/* Existing dialogue lines */}
                    {newScene.dialogue.length > 0 && (
                      <div className="glass rounded-lg p-3 space-y-2">
                        {newScene.dialogue.map((line, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-sm">
                            <div className="flex-1">
                              <span className="font-semibold text-purple-400">{line.characterName}:</span>{' '}
                              <span className="text-muted-foreground">"{line.text}"</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-red-400"
                              onClick={() => handleRemoveDialogue(idx)}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add new dialogue line */}
                    {project.characters.length > 0 ? (
                      <div className="flex gap-2">
                        <Select
                          value={newDialogueLine.characterId}
                          onValueChange={(val) => setNewDialogueLine({ ...newDialogueLine, characterId: val })}
                        >
                          <SelectTrigger className="w-32 glass border-white/10">
                            <SelectValue placeholder={t('steps.scenes.selectCharacter')} />
                          </SelectTrigger>
                          <SelectContent className="glass-strong border-white/10">
                            {project.characters.map((char) => (
                              <SelectItem key={char.id} value={char.id}>
                                <div className="flex items-center gap-2">
                                  {char.imageUrl ? (
                                    <img src={char.imageUrl} alt={char.name} className="w-4 h-4 rounded-full object-cover" />
                                  ) : (
                                    <User className="w-4 h-4" />
                                  )}
                                  {char.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          placeholder={t('steps.scenes.dialoguePlaceholder')}
                          value={newDialogueLine.text}
                          onChange={(e) => setNewDialogueLine({ ...newDialogueLine, text: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddDialogue();
                            }
                          }}
                          className="flex-1 glass border-white/10"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={handleAddDialogue}
                          disabled={!newDialogueLine.characterId || !newDialogueLine.text.trim()}
                          className="border-white/10"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        {t('steps.scenes.addCharactersForDialogue')}
                      </p>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setIsAddingScene(false)}
                      className="border-white/10"
                    >
                      {t('common.cancel')}
                    </Button>
                    <Button
                      onClick={handleAddScene}
                      disabled={!newScene.title.trim()}
                      className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-0"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {t('common.create')}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </motion.div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-4 justify-center">
        {/* Copy Prompts for Gemini Button */}
        <Button
          variant="outline"
          className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
          disabled={project.scenes.length === 0}
          onClick={() => setShowPromptsDialog(true)}
        >
          <Copy className="w-4 h-4 mr-2" />
          Copy Prompts for Gemini
          <Badge variant="outline" className="ml-2 border-purple-500/30 text-purple-400 text-[10px] px-1.5 py-0">
            FREE
          </Badge>
        </Button>
        <Button
          variant="outline"
          className="border-white/10 hover:bg-white/5"
          disabled={project.scenes.length === 0 || isGeneratingAllImages}
          onClick={async () => {
            // Actually regenerate ALL images by clearing them first
            if (confirm(`Are you sure you want to regenerate ALL ${project.scenes.length} scene images? This will cost approximately ${formatCostCompact(getImageCost(project.settings?.imageResolution || '2k') * project.scenes.length)}.`)) {
              // Clear all existing images first
              for (const scene of project.scenes) {
                if (scene.imageUrl) {
                  updateScene(project.id, scene.id, { imageUrl: undefined });
                }
              }
              // Small delay to ensure state updates
              await new Promise(resolve => setTimeout(resolve, 100));
              // Now generate all
              handleGenerateAllSceneImages();
            }
          }}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          {t('steps.scenes.regenerateAll')}
        </Button>
        <Button
          className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border-0"
          disabled={project.scenes.length === 0 || isGeneratingAllImages || scenesWithImages === project.scenes.length}
          onClick={handleGenerateAllSceneImages}
        >
          {isGeneratingAllImages ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <Sparkles className="w-4 h-4 mr-2" />
              </motion.div>
              {t('steps.characters.generating')} ({scenesWithImages}/{project.scenes.length})
            </>
          ) : scenesWithImages === project.scenes.length ? (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              All Images Generated
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              {t('steps.scenes.generateAllImages')} ({project.scenes.length - scenesWithImages} remaining)
              <Badge variant="outline" className="ml-2 border-white/30 text-white text-[10px] px-1.5 py-0">
                {formatCostCompact(getImageCost(project.settings?.imageResolution || '2k') * (project.scenes.length - scenesWithImages))}
              </Badge>
            </>
          )}
        </Button>
      </div>

      {/* Tip */}
      <div className="glass rounded-xl p-4 border-l-4 border-emerald-500">
        <p className="text-sm text-muted-foreground">
          <strong className="text-emerald-400">Tip:</strong> Copy the Text-to-Image prompt for each scene and use it in Nano Banana or Gemini AI Studio to generate high-quality images. Then use the Image-to-Video prompt with Grok AI.
        </p>
      </div>

      {/* Edit Scene Dialog */}
      <Dialog open={editingScene !== null} onOpenChange={(open) => !open && cancelEditScene()}>
        <DialogContent className="glass-strong border-white/10 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('steps.scenes.editScene')}</DialogTitle>
          </DialogHeader>
          {editSceneData && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('steps.scenes.sceneTitle')}</Label>
                  <Input
                    value={editSceneData.title}
                    onChange={(e) => setEditSceneData({ ...editSceneData, title: e.target.value })}
                    className="glass border-white/10"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('steps.scenes.cameraShot')}</Label>
                  <Select
                    value={editSceneData.cameraShot}
                    onValueChange={(value) =>
                      setEditSceneData({ ...editSceneData, cameraShot: value as CameraShot })
                    }
                  >
                    <SelectTrigger className="glass border-white/10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glass-strong border-white/10">
                      {cameraShots.map((shot) => (
                        <SelectItem key={shot.value} value={shot.value}>
                          {shot.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1 text-emerald-400">
                    <ImageIcon className="w-3 h-3" />
                    {t('steps.scenes.textToImagePrompt')}
                  </Label>
                  <CopyButton text={editSceneData.textToImagePrompt} size="icon" className="h-6 w-6" />
                </div>
                <Textarea
                  value={editSceneData.textToImagePrompt}
                  onChange={(e) => setEditSceneData({ ...editSceneData, textToImagePrompt: e.target.value })}
                  className="glass border-white/10 min-h-[100px] font-mono text-xs"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1 text-cyan-400">
                    <Film className="w-3 h-3" />
                    {t('steps.scenes.imageToVideoPrompt')}
                  </Label>
                  <CopyButton text={editSceneData.imageToVideoPrompt} size="icon" className="h-6 w-6" />
                </div>
                <Textarea
                  value={editSceneData.imageToVideoPrompt}
                  onChange={(e) => setEditSceneData({ ...editSceneData, imageToVideoPrompt: e.target.value })}
                  className="glass border-white/10 min-h-[80px] font-mono text-xs"
                />
              </div>

              {/* Dialogue Section */}
              {editSceneData.dialogue.length > 0 && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-1 text-purple-400">
                    <MessageSquare className="w-3 h-3" />
                    {t('steps.scenes.dialogue')}
                  </Label>
                  <div className="glass rounded-lg p-3 space-y-2">
                    {editSceneData.dialogue.map((line, idx) => {
                      const character = project.characters.find((c) => c.id === line.characterId);
                      return (
                        <div key={idx} className="flex items-start gap-2">
                          <div className="flex-1">
                            <Input
                              value={line.text}
                              onChange={(e) => {
                                const newDialogue = [...editSceneData.dialogue];
                                newDialogue[idx] = { ...newDialogue[idx], text: e.target.value };
                                setEditSceneData({ ...editSceneData, dialogue: newDialogue });
                              }}
                              className="glass border-white/10 text-sm"
                              placeholder={`${character?.name || 'Character'}: dialogue...`}
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-red-400"
                            onClick={() => {
                              const newDialogue = editSceneData.dialogue.filter((_, i) => i !== idx);
                              setEditSceneData({ ...editSceneData, dialogue: newDialogue });
                            }}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={cancelEditScene} className="border-white/10">
                  {t('common.cancel')}
                </Button>
                <Button
                  onClick={saveEditScene}
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-0"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {t('common.save')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Image Preview Modal */}
      <AnimatePresence>
        {previewImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={() => setPreviewImage(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative max-w-4xl max-h-[90vh]"
            >
              <img
                src={previewImage}
                alt="Preview"
                className="max-w-full max-h-[90vh] rounded-xl"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 bg-black/50 hover:bg-black/70"
                onClick={() => setPreviewImage(null)}
              >
                <X className="w-5 h-5" />
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Copy Prompts for Gemini Dialog */}
      <Dialog open={showPromptsDialog} onOpenChange={setShowPromptsDialog}>
        <DialogContent className="glass-strong border-white/10 max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="w-5 h-5 text-purple-400" />
              Copy Prompts for Gemini Web Interface
            </DialogTitle>
          </DialogHeader>

          <div className="flex items-center gap-2 p-3 glass rounded-lg border-l-4 border-purple-500 mb-4">
            <span className="text-sm text-muted-foreground">
              <strong className="text-purple-400">Tip:</strong> Copy each prompt and paste it into{' '}
              <a
                href="https://gemini.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-400 hover:underline inline-flex items-center gap-1"
              >
                gemini.google.com <ExternalLink className="w-3 h-3" />
              </a>
              {' '}to use your 100 free images/day from Google One AI Premium.
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {project.scenes.map((scene, index) => (
              <PromptCard
                key={scene.id}
                scene={scene}
                index={index}
                hasImage={!!scene.imageUrl}
              />
            ))}
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-white/10">
            <div className="text-sm text-muted-foreground">
              {project.scenes.length} prompts • {project.scenes.filter(s => s.imageUrl).length} already have images
            </div>
            <Button variant="outline" onClick={() => setShowPromptsDialog(false)} className="border-white/10">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Prompt Card Component with Copy functionality
function PromptCard({ scene, index, hasImage }: { scene: Scene; index: number; hasImage: boolean }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(scene.textToImagePrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`glass rounded-lg p-4 ${hasImage ? 'border-l-4 border-green-500/50' : 'border-l-4 border-orange-500/50'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-emerald-400">Scene {scene.number || index + 1}</span>
            <span className="text-sm text-muted-foreground">• {scene.title}</span>
            {hasImage && (
              <Badge variant="outline" className="border-green-500/30 text-green-400 text-[10px]">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Has Image
              </Badge>
            )}
          </div>
          <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono bg-black/20 rounded p-2 max-h-24 overflow-y-auto">
            {scene.textToImagePrompt}
          </pre>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className={copied ? 'border-green-500/50 text-green-400' : 'border-purple-500/30 text-purple-400 hover:bg-purple-500/10'}
        >
          {copied ? (
            <>
              <CheckCircle2 className="w-4 h-4 mr-1" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 mr-1" />
              Copy
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
