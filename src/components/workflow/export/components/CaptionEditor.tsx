'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import {
  Subtitles,
  Plus,
  Trash2,
  Save,
  X,
  Wand2,
  Clock,
  Palette,
  Type,
  AlignVerticalJustifyCenter,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { captionAnimations, captionFontSizes } from '@/lib/constants/video-editor';
import type { Project, Caption, CaptionStyle } from '@/types/project';

const SCENE_DURATION = 6;

interface CaptionEditorProps {
  project: Project;
  selectedSceneIndex: number;
  editingCaption: Caption | null;
  isEditing: boolean;
  sceneCaptions: Caption[];
  hasUnsavedChanges: boolean;
  onSetSelectedSceneIndex: (index: number) => void;
  onStartEditingCaption: (caption: Caption) => void;
  onStartNewCaption: () => void;
  onCancelEditing: () => void;
  onSaveCaption: (caption: Caption) => void;
  onDeleteCaption: (captionId: string) => void;
  onUpdateCaptionField: <K extends keyof Caption>(field: K, value: Caption[K]) => void;
  onUpdateCaptionStyle: <K extends keyof CaptionStyle>(field: K, value: CaptionStyle[K]) => void;
  onAutoGenerateCaptions: () => void;
  onAutoGenerateAllCaptions: () => void;
  onClearAllCaptions: () => void;
  onClearAllScenesCaptions: () => void;
}

const animationOptions = [
  { value: 'none', label: 'None' },
  { value: 'fadeIn', label: 'Fade In' },
  { value: 'slideUp', label: 'Slide Up' },
  { value: 'typewriter', label: 'Typewriter' },
  { value: 'popIn', label: 'Pop In' },
] as const;

const fontSizeOptions = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
] as const;

const positionOptions = [
  { value: 'top', label: 'Top' },
  { value: 'center', label: 'Center' },
  { value: 'bottom', label: 'Bottom' },
] as const;

const fontFamilyOptions = [
  { value: 'default', label: 'Sans Serif' },
  { value: 'serif', label: 'Serif' },
  { value: 'mono', label: 'Monospace' },
] as const;

export function CaptionEditor({
  project,
  selectedSceneIndex,
  editingCaption,
  isEditing,
  sceneCaptions,
  hasUnsavedChanges,
  onSetSelectedSceneIndex,
  onStartEditingCaption,
  onStartNewCaption,
  onCancelEditing,
  onSaveCaption,
  onDeleteCaption,
  onUpdateCaptionField,
  onUpdateCaptionStyle,
  onAutoGenerateCaptions,
  onAutoGenerateAllCaptions,
  onClearAllCaptions,
  onClearAllScenesCaptions,
}: CaptionEditorProps) {
  const t = useTranslations();
  const currentScene = project.scenes[selectedSceneIndex];
  const hasDialogue = currentScene?.dialogue && currentScene.dialogue.length > 0;

  // Check if any scene has dialogue for the "all scenes" button
  const anySceneHasDialogue = project.scenes.some(
    (scene) => scene.dialogue && scene.dialogue.length > 0
  );

  // Count total captions across all scenes
  const totalCaptionsAllScenes = project.scenes.reduce(
    (sum, scene) => sum + (scene.captions?.length || 0),
    0
  );

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toFixed(1).padStart(4, '0')}`;
  };

  return (
    <Card className="glass border-white/10 border-yellow-500/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Subtitles className="w-5 h-5 text-yellow-400" />
            Caption Editor
            {totalCaptionsAllScenes > 0 && (
              <Badge variant="outline" className="border-yellow-500/30 text-yellow-400 ml-2">
                {totalCaptionsAllScenes} total
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {anySceneHasDialogue && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onAutoGenerateAllCaptions}
                className="h-7 px-2 text-xs text-green-400 hover:text-green-300 hover:bg-green-500/10"
              >
                <Wand2 className="w-3 h-3 mr-1" />
                Auto All Scenes
              </Button>
            )}
            {hasDialogue && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onAutoGenerateCaptions}
                className="h-7 px-2 text-xs text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10"
              >
                <Wand2 className="w-3 h-3 mr-1" />
                Auto This Scene
              </Button>
            )}
            {totalCaptionsAllScenes > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearAllScenesCaptions}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Clear All Scenes
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Scene selector thumbnails */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Select Scene</Label>
          <div className="flex gap-1 overflow-x-auto pb-2">
            {project.scenes.map((scene, index) => {
              const captionCount = scene.captions?.length || 0;
              return (
                <button
                  key={scene.id}
                  onClick={() => onSetSelectedSceneIndex(index)}
                  className={cn(
                    'flex-shrink-0 w-16 h-12 rounded overflow-hidden border-2 transition-all relative',
                    index === selectedSceneIndex
                      ? 'border-yellow-500 ring-2 ring-yellow-500/30'
                      : 'border-white/10 hover:border-white/30'
                  )}
                >
                  {scene.imageUrl ? (
                    <img src={scene.imageUrl} alt={scene.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-white/5 flex items-center justify-center">
                      <span className="text-[10px] text-muted-foreground">{index + 1}</span>
                    </div>
                  )}
                  {captionCount > 0 && (
                    <Badge
                      className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[9px] bg-yellow-500"
                    >
                      {captionCount}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Current scene info */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-white/5">
          <div>
            <p className="text-sm font-medium">
              Scene {selectedSceneIndex + 1}: {currentScene?.title || 'Untitled'}
            </p>
            <p className="text-xs text-muted-foreground">
              {sceneCaptions.length} caption{sceneCaptions.length !== 1 ? 's' : ''}
            </p>
          </div>
          {!isEditing && (
            <Button size="sm" onClick={onStartNewCaption} className="bg-yellow-600 hover:bg-yellow-700">
              <Plus className="w-4 h-4 mr-1" />
              Add Caption
            </Button>
          )}
        </div>

        {/* Captions list */}
        {sceneCaptions.length > 0 && !isEditing && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Captions</Label>
            <div className="space-y-1">
              {sceneCaptions.map((caption) => (
                <motion.div
                  key={caption.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{caption.text || '(empty)'}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatTime(caption.startTime)} - {formatTime(caption.endTime)}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] border-yellow-500/30 text-yellow-400">
                    {caption.animation}
                  </Badge>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onStartEditingCaption(caption)}
                    >
                      <Type className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 hover:text-red-400"
                      onClick={() => onDeleteCaption(caption.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Caption editor form */}
        {isEditing && editingCaption && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 p-4 rounded-lg bg-yellow-500/5 border border-yellow-500/20"
          >
            {/* Caption text */}
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1">
                <Type className="w-3 h-3" />
                Caption Text
              </Label>
              <Textarea
                value={editingCaption.text}
                onChange={(e) => onUpdateCaptionField('text', e.target.value)}
                placeholder="Enter caption text..."
                className="min-h-[60px] bg-white/5 border-white/10"
              />
            </div>

            {/* Timing */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Start Time ({formatTime(editingCaption.startTime)})
                </Label>
                <Slider
                  value={[editingCaption.startTime]}
                  min={0}
                  max={SCENE_DURATION}
                  step={0.1}
                  onValueChange={([value]) => onUpdateCaptionField('startTime', value)}
                  className="cursor-pointer"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  End Time ({formatTime(editingCaption.endTime)})
                </Label>
                <Slider
                  value={[editingCaption.endTime]}
                  min={0}
                  max={SCENE_DURATION}
                  step={0.1}
                  onValueChange={([value]) => onUpdateCaptionField('endTime', value)}
                  className="cursor-pointer"
                />
              </div>
            </div>

            {/* Style options */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Animation
                </Label>
                <Select
                  value={editingCaption.animation}
                  onValueChange={(value) => onUpdateCaptionField('animation', value as Caption['animation'])}
                >
                  <SelectTrigger className="bg-white/5 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {animationOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <AlignVerticalJustifyCenter className="w-3 h-3" />
                  Position
                </Label>
                <Select
                  value={editingCaption.style.position}
                  onValueChange={(value) => onUpdateCaptionStyle('position', value as CaptionStyle['position'])}
                >
                  <SelectTrigger className="bg-white/5 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {positionOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <Type className="w-3 h-3" />
                  Font Size
                </Label>
                <Select
                  value={editingCaption.style.fontSize}
                  onValueChange={(value) => onUpdateCaptionStyle('fontSize', value as CaptionStyle['fontSize'])}
                >
                  <SelectTrigger className="bg-white/5 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fontSizeOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <Type className="w-3 h-3" />
                  Font Family
                </Label>
                <Select
                  value={editingCaption.style.fontFamily}
                  onValueChange={(value) => onUpdateCaptionStyle('fontFamily', value as CaptionStyle['fontFamily'])}
                >
                  <SelectTrigger className="bg-white/5 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fontFamilyOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Colors */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <Palette className="w-3 h-3" />
                  Text Color
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={editingCaption.style.color}
                    onChange={(e) => onUpdateCaptionStyle('color', e.target.value)}
                    className="w-10 h-9 p-1 bg-white/5 border-white/10 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={editingCaption.style.color}
                    onChange={(e) => onUpdateCaptionStyle('color', e.target.value)}
                    className="flex-1 bg-white/5 border-white/10 font-mono text-xs"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <Palette className="w-3 h-3" />
                  Background
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={editingCaption.style.backgroundColor.replace(/rgba?\([^)]+\)/, '#000000')}
                    onChange={(e) => {
                      const hex = e.target.value;
                      const r = parseInt(hex.slice(1, 3), 16);
                      const g = parseInt(hex.slice(3, 5), 16);
                      const b = parseInt(hex.slice(5, 7), 16);
                      onUpdateCaptionStyle('backgroundColor', `rgba(${r},${g},${b},0.7)`);
                    }}
                    className="w-10 h-9 p-1 bg-white/5 border-white/10 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={editingCaption.style.backgroundColor}
                    onChange={(e) => onUpdateCaptionStyle('backgroundColor', e.target.value)}
                    className="flex-1 bg-white/5 border-white/10 font-mono text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="space-y-2">
              <Label className="text-xs">Preview</Label>
              <div className="relative h-24 rounded-lg bg-black/50 flex items-end justify-center overflow-hidden">
                <div
                  className={cn(
                    'absolute left-0 right-0 px-4 text-center',
                    editingCaption.style.position === 'top' && 'top-2',
                    editingCaption.style.position === 'center' && 'top-1/2 -translate-y-1/2',
                    editingCaption.style.position === 'bottom' && 'bottom-2'
                  )}
                >
                  <span
                    className={cn(
                      'px-3 py-1 rounded inline-block',
                      editingCaption.style.textShadow && 'drop-shadow-lg'
                    )}
                    style={{
                      fontSize: captionFontSizes[editingCaption.style.fontSize],
                      color: editingCaption.style.color,
                      backgroundColor: editingCaption.style.backgroundColor,
                      fontFamily:
                        editingCaption.style.fontFamily === 'serif'
                          ? 'Georgia, serif'
                          : editingCaption.style.fontFamily === 'mono'
                          ? 'monospace'
                          : 'inherit',
                    }}
                  >
                    {editingCaption.text || 'Caption preview'}
                  </span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={onCancelEditing}>
                <X className="w-4 h-4 mr-1" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => onSaveCaption(editingCaption)}
                disabled={!editingCaption.text.trim()}
                className="bg-yellow-600 hover:bg-yellow-700"
              >
                <Save className="w-4 h-4 mr-1" />
                Save Caption
              </Button>
            </div>
          </motion.div>
        )}

        {/* Empty state */}
        {sceneCaptions.length === 0 && !isEditing && (
          <div className="text-center py-8 text-muted-foreground">
            <Subtitles className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No captions for this scene</p>
            <p className="text-xs mt-1">
              {hasDialogue
                ? 'Click "Auto from Dialogue" to generate captions automatically'
                : 'Click "Add Caption" to create one'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
