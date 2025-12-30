'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Plus,
  Trash2,
  Image as ImageIcon,
  Sparkles,
  RefreshCw,
  Edit3,
  Save,
  X,
  User,
  Zap,
  CheckCircle2,
  Expand,
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
import { useProjectStore } from '@/lib/stores/project-store';
import { generateCharacterPrompt } from '@/lib/prompts/master-prompt';
import { CopyButton } from '@/components/shared/CopyButton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { Project, Character } from '@/types/project';
import { v4 as uuidv4 } from 'uuid';
import { CostBadge } from '@/components/shared/CostBadge';
import { ACTION_COSTS, formatCostCompact } from '@/lib/services/real-costs';

interface Step2Props {
  project: Project;
}

type ImageStatus = 'idle' | 'generating' | 'complete' | 'error';

interface CharacterImageState {
  [characterId: string]: {
    status: ImageStatus;
    progress: number;
    error?: string;
  };
}

export function Step2CharacterGenerator({ project: initialProject }: Step2Props) {
  const t = useTranslations();
  const { addCharacter, updateCharacter, deleteCharacter, projects } = useProjectStore();

  // Get live project data from store
  const project = projects.find(p => p.id === initialProject.id) || initialProject;

  const [isAddingCharacter, setIsAddingCharacter] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<string | null>(null);
  const [imageStates, setImageStates] = useState<CharacterImageState>({});
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [newCharacter, setNewCharacter] = useState({
    name: '',
    description: '',
    visualDescription: '',
    personality: '',
  });
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [editCharacterData, setEditCharacterData] = useState<{
    name: string;
    description: string;
    visualDescription: string;
    personality: string;
    masterPrompt: string;
  } | null>(null);

  const handleAddCharacter = () => {
    if (!newCharacter.name.trim()) return;

    const masterPrompt = generateCharacterPrompt(
      {
        name: newCharacter.name,
        description: newCharacter.description,
        visualDescription: newCharacter.visualDescription,
      },
      project.style
    );

    addCharacter(project.id, {
      name: newCharacter.name,
      description: newCharacter.description,
      visualDescription: newCharacter.visualDescription,
      personality: newCharacter.personality,
      masterPrompt,
    });

    setNewCharacter({ name: '', description: '', visualDescription: '', personality: '' });
    setIsAddingCharacter(false);
  };

  const handleUpdateCharacter = (characterId: string, updates: Partial<Character>) => {
    updateCharacter(project.id, characterId, updates);
  };

  const regeneratePrompt = (character: Character) => {
    const masterPrompt = generateCharacterPrompt(character, project.style);
    updateCharacter(project.id, character.id, { masterPrompt });
  };

  const startEditCharacter = (character: Character) => {
    setEditCharacterData({
      name: character.name,
      description: character.description || '',
      visualDescription: character.visualDescription || '',
      personality: character.personality || '',
      masterPrompt: character.masterPrompt,
    });
    setEditingCharacter(character.id);
  };

  const saveEditCharacter = () => {
    if (!editingCharacter || !editCharacterData) return;

    const newMasterPrompt = generateCharacterPrompt(
      {
        name: editCharacterData.name,
        description: editCharacterData.description,
        visualDescription: editCharacterData.visualDescription,
      },
      project.style
    );

    updateCharacter(project.id, editingCharacter, {
      name: editCharacterData.name,
      description: editCharacterData.description,
      visualDescription: editCharacterData.visualDescription,
      personality: editCharacterData.personality,
      masterPrompt: editCharacterData.masterPrompt !== newMasterPrompt ? editCharacterData.masterPrompt : newMasterPrompt,
    });

    setEditingCharacter(null);
    setEditCharacterData(null);
  };

  const cancelEditCharacter = () => {
    setEditingCharacter(null);
    setEditCharacterData(null);
  };

  const getCharacterStatus = (characterId: string): ImageStatus => {
    const character = project.characters.find((c) => c.id === characterId);
    if (character?.imageUrl) return 'complete';
    return imageStates[characterId]?.status || 'idle';
  };

  const generateCharacterImage = async (character: Character) => {
    setImageStates((prev) => ({
      ...prev,
      [character.id]: { status: 'generating', progress: 10 },
    }));

    try {
      // Update progress to show we're calling the API
      setImageStates((prev) => ({
        ...prev,
        [character.id]: { status: 'generating', progress: 30 },
      }));

      // Call the Gemini image generation API
      const response = await fetch('/api/gemini/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: character.masterPrompt,
          aspectRatio: '1:1', // Character portraits are square
          quality: 'hd',
        }),
      });

      setImageStates((prev) => ({
        ...prev,
        [character.id]: { status: 'generating', progress: 70 },
      }));

      if (response.ok) {
        const data = await response.json();
        if (data.imageUrl) {
          // Update character with generated image
          updateCharacter(project.id, character.id, { imageUrl: data.imageUrl });
          setImageStates((prev) => ({
            ...prev,
            [character.id]: { status: 'complete', progress: 100 },
          }));
          // Refresh credits display
          window.dispatchEvent(new CustomEvent('credits-updated'));
          return;
        }
      }

      // If API failed, show error but still mark as complete for demo purposes
      const errorData = await response.json().catch(() => ({}));
      console.warn('Image generation API failed:', errorData);
      setImageStates((prev) => ({
        ...prev,
        [character.id]: {
          status: 'error',
          progress: 0,
          error: errorData.error || 'API not configured - set GEMINI_API_KEY in .env.local'
        },
      }));
    } catch (error) {
      console.error('Error generating character image:', error);
      setImageStates((prev) => ({
        ...prev,
        [character.id]: {
          status: 'error',
          progress: 0,
          error: error instanceof Error ? error.message : 'Generation failed'
        },
      }));
    }
  };

  const handleGenerateImage = async (character: Character) => {
    await generateCharacterImage(character);
  };

  const handleGenerateAll = async () => {
    setIsGeneratingAll(true);
    for (const character of project.characters) {
      if (!character.imageUrl) {
        await generateCharacterImage(character);
      }
    }
    setIsGeneratingAll(false);
  };

  const charactersWithImages = project.characters.filter((c) => c.imageUrl).length;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 mb-4"
        >
          <Users className="w-8 h-8 text-cyan-400" />
        </motion.div>
        <h2 className="text-2xl font-bold mb-2">{t('steps.characters.title')}</h2>
        <p className="text-muted-foreground">{t('steps.characters.description')}</p>
      </div>

      {/* Characters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {project.characters.map((character, index) => (
          <motion.div
            key={character.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="glass border-white/10 overflow-hidden card-hover">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-lg">{character.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">{character.personality || 'No personality set'}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteCharacter(project.id, character.id)}
                    className="text-muted-foreground hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                {/* Character Image - Large Preview */}
                {character.imageUrl ? (
                  <button
                    onClick={() => setPreviewImage(character.imageUrl!)}
                    className="relative w-full aspect-square rounded-xl overflow-hidden group mt-3"
                  >
                    <img
                      src={character.imageUrl}
                      alt={character.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Expand className="w-8 h-8 text-white" />
                    </div>
                  </button>
                ) : (
                  <div className="w-full aspect-square rounded-xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 flex flex-col items-center justify-center gap-2 mt-3">
                    <User className="w-16 h-16 text-purple-400/50" />
                    <span className="text-xs text-muted-foreground">No image generated</span>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {character.description || 'No description'}
                </p>

                {/* Master Prompt Preview */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">Master Prompt</Label>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => regeneratePrompt(character)}
                      >
                        <RefreshCw className="w-3 h-3" />
                      </Button>
                      <CopyButton text={character.masterPrompt} size="icon" className="h-6 w-6" />
                    </div>
                  </div>
                  <div className="glass rounded-lg p-3 max-h-24 overflow-y-auto">
                    <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
                      {character.masterPrompt}
                    </pre>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 border-white/10 hover:bg-white/5"
                    onClick={() => startEditCharacter(character)}
                  >
                    <Edit3 className="w-4 h-4 mr-2" />
                    {t('common.edit')}
                  </Button>
                  {(() => {
                    const status = getCharacterStatus(character.id);
                    const progress = imageStates[character.id]?.progress || 0;
                    const errorMsg = imageStates[character.id]?.error;

                    if (status === 'generating') {
                      return (
                        <Button
                          size="sm"
                          disabled
                          className="flex-1 bg-gradient-to-r from-purple-600/50 to-cyan-600/50 text-white border-0"
                        >
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          >
                            <RefreshCw className="w-4 h-4 mr-2" />
                          </motion.div>
                          {progress}%
                        </Button>
                      );
                    }

                    if (status === 'error') {
                      return (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10"
                          onClick={() => handleGenerateImage(character)}
                          title={errorMsg}
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Retry
                        </Button>
                      );
                    }

                    if (status === 'complete' || character.imageUrl) {
                      return (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 border-green-500/30 text-green-400 hover:bg-green-500/10"
                          onClick={() => handleGenerateImage(character)}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          {t('steps.characters.regenerate')}
                        </Button>
                      );
                    }

                    return (
                      <Button
                        size="sm"
                        className="flex-1 bg-gradient-to-r from-purple-600/80 to-cyan-600/80 hover:from-purple-500 hover:to-cyan-500 text-white border-0"
                        onClick={() => handleGenerateImage(character)}
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        {t('steps.characters.generateImage')}
                        <Badge variant="outline" className="ml-2 border-white/30 text-white text-[10px] px-1.5 py-0">
                          {formatCostCompact(ACTION_COSTS.image.gemini)}
                        </Badge>
                      </Button>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}

        {/* Add Character Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: project.characters.length * 0.1 }}
        >
          <Dialog open={isAddingCharacter} onOpenChange={setIsAddingCharacter}>
            <DialogTrigger asChild>
              <button className="w-full h-full min-h-[300px] glass rounded-xl border-2 border-dashed border-white/10 hover:border-purple-500/30 transition-colors flex flex-col items-center justify-center gap-4 group">
                <div className="w-16 h-16 rounded-2xl bg-white/5 group-hover:bg-purple-500/20 transition-colors flex items-center justify-center">
                  <Plus className="w-8 h-8 text-muted-foreground group-hover:text-purple-400 transition-colors" />
                </div>
                <span className="text-muted-foreground group-hover:text-foreground transition-colors">
                  {t('steps.characters.addCharacter')}
                </span>
              </button>
            </DialogTrigger>
            <DialogContent className="glass-strong border-white/10 max-w-lg">
              <DialogHeader>
                <DialogTitle>{t('steps.characters.addCharacter')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>{t('steps.characters.characterName')}</Label>
                  <Input
                    placeholder="e.g., The Boy, Fuzzy"
                    value={newCharacter.name}
                    onChange={(e) => setNewCharacter({ ...newCharacter, name: e.target.value })}
                    className="glass border-white/10"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('steps.characters.personality')}</Label>
                  <Input
                    placeholder="e.g., Determined, brave, caring"
                    value={newCharacter.personality}
                    onChange={(e) => setNewCharacter({ ...newCharacter, personality: e.target.value })}
                    className="glass border-white/10"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('steps.characters.characterDescription')}</Label>
                  <Textarea
                    placeholder="Brief character description..."
                    value={newCharacter.description}
                    onChange={(e) => setNewCharacter({ ...newCharacter, description: e.target.value })}
                    className="glass border-white/10 min-h-[80px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('steps.characters.visualDescription')}</Label>
                  <Textarea
                    placeholder="Detailed visual appearance (clothing, features, etc.)..."
                    value={newCharacter.visualDescription}
                    onChange={(e) => setNewCharacter({ ...newCharacter, visualDescription: e.target.value })}
                    className="glass border-white/10 min-h-[100px]"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsAddingCharacter(false)} className="border-white/10">
                    {t('common.cancel')}
                  </Button>
                  <Button
                    onClick={handleAddCharacter}
                    disabled={!newCharacter.name.trim()}
                    className="bg-gradient-to-r from-purple-600 to-cyan-600 text-white border-0"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {t('common.create')}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </motion.div>
      </div>

      {/* Progress & Quick Actions */}
      {project.characters.length > 0 && (
        <div className="glass rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-purple-400" />
                <span className="font-medium">{t('steps.characters.progress')}</span>
              </div>
              <Badge variant="outline" className="border-purple-500/30 text-purple-400">
                {charactersWithImages} / {project.characters.length} {t('steps.characters.imagesGenerated')}
              </Badge>
            </div>
          </div>
          <Progress
            value={(charactersWithImages / project.characters.length) * 100}
            className="h-2"
          />

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-4 justify-center pt-2">
            <Button
              className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white border-0"
              disabled={project.characters.length === 0 || isGeneratingAll}
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
                  {t('steps.characters.generating')}
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  {t('steps.characters.generateAll')}
                  <Badge variant="outline" className="ml-2 border-white/30 text-white text-[10px] px-1.5 py-0">
                    {formatCostCompact(ACTION_COSTS.image.gemini * Math.max(project.characters.length - charactersWithImages, 1))}
                  </Badge>
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Tip */}
      <div className="glass rounded-xl p-4 border-l-4 border-purple-500">
        <p className="text-sm text-muted-foreground">
          <strong className="text-purple-400">Tip:</strong> For consistent character appearance across scenes, copy each character's Master Prompt and use it when generating images in Nano Banana or Gemini AI Studio.
        </p>
      </div>

      {/* Edit Character Dialog */}
      <Dialog open={editingCharacter !== null} onOpenChange={(open) => !open && cancelEditCharacter()}>
        <DialogContent className="glass-strong border-white/10 max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('steps.characters.editCharacter')}</DialogTitle>
          </DialogHeader>
          {editCharacterData && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{t('steps.characters.characterName')}</Label>
                <Input
                  value={editCharacterData.name}
                  onChange={(e) => setEditCharacterData({ ...editCharacterData, name: e.target.value })}
                  className="glass border-white/10"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('steps.characters.personality')}</Label>
                <Input
                  value={editCharacterData.personality}
                  onChange={(e) => setEditCharacterData({ ...editCharacterData, personality: e.target.value })}
                  className="glass border-white/10"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('steps.characters.characterDescription')}</Label>
                <Textarea
                  value={editCharacterData.description}
                  onChange={(e) => setEditCharacterData({ ...editCharacterData, description: e.target.value })}
                  className="glass border-white/10 min-h-[80px]"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('steps.characters.visualDescription')}</Label>
                <Textarea
                  value={editCharacterData.visualDescription}
                  onChange={(e) => setEditCharacterData({ ...editCharacterData, visualDescription: e.target.value })}
                  className="glass border-white/10 min-h-[100px]"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{t('steps.characters.masterPrompt')}</Label>
                  <CopyButton text={editCharacterData.masterPrompt} size="icon" className="h-6 w-6" />
                </div>
                <Textarea
                  value={editCharacterData.masterPrompt}
                  onChange={(e) => setEditCharacterData({ ...editCharacterData, masterPrompt: e.target.value })}
                  className="glass border-white/10 min-h-[120px] font-mono text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={cancelEditCharacter} className="border-white/10">
                  {t('common.cancel')}
                </Button>
                <Button
                  onClick={saveEditCharacter}
                  className="bg-gradient-to-r from-purple-600 to-cyan-600 text-white border-0"
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
    </div>
  );
}
