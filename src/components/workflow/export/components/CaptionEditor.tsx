'use client';

import { useTranslations } from 'next-intl';
import { Subtitles, Plus, Trash2, Wand2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import type { Project, Caption, CaptionStyle } from '@/types/project';

// Sub-components
import { CaptionEditorCompact } from './caption-editor/CaptionEditorCompact';
import { SceneSelector } from './caption-editor/SceneSelector';
import { CaptionList } from './caption-editor/CaptionList';
import { CaptionForm } from './caption-editor/CaptionForm';
import { CaptionPreview } from './caption-editor/CaptionPreview';

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
  compact?: boolean;
}

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
  compact = false,
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

  // Compact version
  if (compact) {
    return (
      <CaptionEditorCompact
        project={project}
        selectedSceneIndex={selectedSceneIndex}
        editingCaption={editingCaption}
        isEditing={isEditing}
        sceneCaptions={sceneCaptions}
        totalCaptionsAllScenes={totalCaptionsAllScenes}
        anySceneHasDialogue={anySceneHasDialogue}
        onSetSelectedSceneIndex={onSetSelectedSceneIndex}
        onStartEditingCaption={onStartEditingCaption}
        onStartNewCaption={onStartNewCaption}
        onCancelEditing={onCancelEditing}
        onSaveCaption={onSaveCaption}
        onDeleteCaption={onDeleteCaption}
        onUpdateCaptionField={onUpdateCaptionField}
        onUpdateCaptionStyle={onUpdateCaptionStyle}
        onAutoGenerateAllCaptions={onAutoGenerateAllCaptions}
      />
    );
  }

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
          <SceneSelector
            project={project}
            selectedSceneIndex={selectedSceneIndex}
            onSelectScene={onSetSelectedSceneIndex}
          />
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
            <CaptionList
              captions={sceneCaptions}
              onEditCaption={onStartEditingCaption}
              onDeleteCaption={onDeleteCaption}
            />
          </div>
        )}

        {/* Caption editor form */}
        {isEditing && editingCaption && (
          <div className="space-y-4">
            <CaptionForm
              caption={editingCaption}
              onUpdateField={onUpdateCaptionField}
              onUpdateStyle={onUpdateCaptionStyle}
              onSave={() => onSaveCaption(editingCaption)}
              onCancel={onCancelEditing}
            />
            <CaptionPreview caption={editingCaption} />
          </div>
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
