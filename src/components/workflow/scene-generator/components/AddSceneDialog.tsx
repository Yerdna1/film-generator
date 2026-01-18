'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, X, MessageSquare, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
import { cameraShots } from '@/lib/constants/scene';
import type { CameraShot, Character } from '@/types/project';

interface NewDialogueLine {
  characterId: string;
  characterName: string;
  text: string;
}

interface NewSceneData {
  title: string;
  description: string;
  cameraShot: CameraShot;
  dialogue: NewDialogueLine[];
}

interface AddSceneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  characters: Character[];
  onAddScene: (scene: NewSceneData) => void;
}

export function AddSceneDialog({
  open,
  onOpenChange,
  characters,
  onAddScene,
}: AddSceneDialogProps) {
  const t = useTranslations();

  const [newScene, setNewScene] = useState<NewSceneData>({
    title: '',
    description: '',
    cameraShot: 'medium',
    dialogue: [],
  });

  const [newDialogueLine, setNewDialogueLine] = useState({
    characterId: '',
    text: '',
  });

  const handleAddDialogue = () => {
    if (!newDialogueLine.characterId || !newDialogueLine.text.trim()) return;

    const character = characters.find((c) => c.id === newDialogueLine.characterId);
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

  const handleRemoveDialogue = (index: number) => {
    setNewScene({
      ...newScene,
      dialogue: newScene.dialogue.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = () => {
    if (!newScene.title.trim()) return;
    onAddScene(newScene);
    setNewScene({
      title: '',
      description: '',
      cameraShot: 'medium',
      dialogue: [],
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
              placeholder={t('common.examples.sceneTitle')}
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
              placeholder={t('steps.scenes.descriptionPlaceholder')}
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
            {characters.length > 0 ? (
              <div className="flex gap-2">
                <Select
                  value={newDialogueLine.characterId}
                  onValueChange={(val) => setNewDialogueLine({ ...newDialogueLine, characterId: val })}
                >
                  <SelectTrigger className="w-32 glass border-white/10">
                    <SelectValue placeholder={t('steps.scenes.selectCharacter')} />
                  </SelectTrigger>
                  <SelectContent className="glass-strong border-white/10">
                    {characters.map((char) => (
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
              onClick={() => onOpenChange(false)}
              className="border-white/10"
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleSubmit}
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
  );
}
