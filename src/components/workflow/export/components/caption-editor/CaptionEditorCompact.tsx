import { Wand2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Project, Caption } from '@/types/project';
import { SceneSelector } from './SceneSelector';
import { CaptionList } from './CaptionList';
import { CaptionForm } from './CaptionForm';

interface CaptionEditorCompactProps {
  project: Project;
  selectedSceneIndex: number;
  editingCaption: Caption | null;
  isEditing: boolean;
  sceneCaptions: Caption[];
  totalCaptionsAllScenes: number;
  anySceneHasDialogue: boolean;
  onSetSelectedSceneIndex: (index: number) => void;
  onStartEditingCaption: (caption: Caption) => void;
  onStartNewCaption: () => void;
  onCancelEditing: () => void;
  onSaveCaption: (caption: Caption) => void;
  onDeleteCaption: (captionId: string) => void;
  onUpdateCaptionField: <K extends keyof Caption>(field: K, value: Caption[K]) => void;
  onUpdateCaptionStyle: <K extends keyof Caption['style']>(field: K, value: Caption['style'][K]) => void;
  onAutoGenerateAllCaptions: () => void;
}

export function CaptionEditorCompact({
  project,
  selectedSceneIndex,
  editingCaption,
  isEditing,
  sceneCaptions,
  totalCaptionsAllScenes,
  anySceneHasDialogue,
  onSetSelectedSceneIndex,
  onStartEditingCaption,
  onStartNewCaption,
  onCancelEditing,
  onSaveCaption,
  onDeleteCaption,
  onUpdateCaptionField,
  onUpdateCaptionStyle,
  onAutoGenerateAllCaptions,
}: CaptionEditorCompactProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Captions ({totalCaptionsAllScenes})
        </h4>
        {anySceneHasDialogue && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onAutoGenerateAllCaptions}
            className="h-6 px-2 text-[10px] text-yellow-400 hover:bg-yellow-500/10"
          >
            <Wand2 className="w-3 h-3 mr-1" />
            Auto Generate
          </Button>
        )}
      </div>

      {/* Scene thumbnails */}
      <SceneSelector
        project={project}
        selectedSceneIndex={selectedSceneIndex}
        onSelectScene={onSetSelectedSceneIndex}
        compact
      />

      {/* Current scene captions */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">
            Scene {selectedSceneIndex + 1}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onStartNewCaption}
            className="h-5 px-1.5 text-[10px]"
          >
            <Plus className="w-2.5 h-2.5 mr-0.5" />
            Add
          </Button>
        </div>
        <CaptionList
          captions={sceneCaptions}
          onEditCaption={onStartEditingCaption}
          onDeleteCaption={onDeleteCaption}
          compact
        />
      </div>

      {/* Editing form - simplified */}
      {isEditing && editingCaption && (
        <CaptionForm
          caption={editingCaption}
          onUpdateField={onUpdateCaptionField}
          onUpdateStyle={onUpdateCaptionStyle}
          onSave={() => onSaveCaption(editingCaption)}
          onCancel={onCancelEditing}
          compact
        />
      )}
    </div>
  );
}
