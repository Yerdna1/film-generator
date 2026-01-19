'use client';

import { useTranslations } from 'next-intl';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Project } from '@/types/project';

interface SceneCountSelectorProps {
  project: Project;
  sceneOptions: readonly number[];
  updateSettings: (id: string, settings: any) => void;
  isReadOnly: boolean;
}

export function SceneCountSelector({ project, sceneOptions, updateSettings, isReadOnly }: SceneCountSelectorProps) {
  const t = useTranslations();

  return (
    <div className="space-y-1">
      <Label className="text-xs flex items-center gap-1">
        {t('steps.scenes.sceneCount')}
      </Label>
      <Select
        value={(project.settings?.sceneCount || 12).toString()}
        onValueChange={(value) => updateSettings(project.id, { sceneCount: parseInt(value) })}
        disabled={isReadOnly}
      >
        <SelectTrigger className="w-full h-9 glass border-white/10 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="glass-strong border-white/10">
          {/* All users see all scene options */}
          {sceneOptions.map((count) => (
            <SelectItem key={count} value={count.toString()}>
              {count} {t('project.scenes')}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}