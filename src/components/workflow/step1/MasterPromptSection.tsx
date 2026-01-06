'use client';

import { Wand2, Edit3 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CopyButton } from '@/components/shared/CopyButton';
import type { Project } from '@/types/project';

interface MasterPromptSectionProps {
  project: Project;
  isReadOnly: boolean;
  isEditing: boolean;
  editedPrompt: string;
  setIsEditing: (editing: boolean) => void;
  setEditedPrompt: (prompt: string) => void;
  onSaveEditedPrompt: () => void;
}

export function MasterPromptSection({
  project,
  isReadOnly,
  isEditing,
  editedPrompt,
  setIsEditing,
  setEditedPrompt,
  onSaveEditedPrompt,
}: MasterPromptSectionProps) {
  const t = useTranslations();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-purple-400" />
          {t('steps.prompt.masterPrompt')}
        </h3>
        {project.masterPrompt && (
          <div className="flex items-center gap-1">
            {!isReadOnly && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
                className="h-7 border-white/10 hover:bg-white/5 text-xs"
              >
                <Edit3 className="w-3 h-3 mr-1" />
                {isEditing ? 'Cancel' : 'Edit'}
              </Button>
            )}
            <CopyButton text={project.masterPrompt} size="icon" className="h-7 w-7" />
          </div>
        )}
      </div>

      {project.masterPrompt ? (
        isEditing ? (
          <div className="space-y-3">
            <Textarea
              value={editedPrompt}
              onChange={(e) => setEditedPrompt(e.target.value)}
              className="min-h-[200px] glass border-white/10 focus:border-purple-500/50 font-mono text-xs"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditedPrompt(project.masterPrompt || '');
                  setIsEditing(false);
                }}
                className="h-8 border-white/10"
              >
                {t('common.cancel')}
              </Button>
              <Button
                size="sm"
                onClick={onSaveEditedPrompt}
                className="h-8 bg-gradient-to-r from-purple-600 to-cyan-600 text-white border-0"
              >
                {t('common.save')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="glass rounded-lg p-3 max-h-[300px] overflow-y-auto">
            <pre className="whitespace-pre-wrap text-xs text-muted-foreground font-mono leading-relaxed">
              {project.masterPrompt}
            </pre>
          </div>
        )
      ) : (
        <div className="flex items-center justify-center h-[200px] text-muted-foreground/50">
          <div className="text-center">
            <Wand2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Fill in the story details and click Generate</p>
          </div>
        </div>
      )}
    </div>
  );
}
