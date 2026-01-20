'use client';

import { Clapperboard } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Project } from '@/types/project';

interface StoryFormProps {
  project: Project;
  isReadOnly: boolean;
  updateStory: (id: string, story: any) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  genres: readonly string[];
  tones: readonly string[];
  paymentToggle?: React.ReactNode;
}

export function StoryForm({
  project,
  isReadOnly,
  updateStory,
  updateProject,
  genres,
  tones,
  paymentToggle,
}: StoryFormProps) {
  const t = useTranslations();

  return (
    <div className="border-b border-border pb-4">
      <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
        <Clapperboard className="w-4 h-4 text-purple-400" />
        {t('steps.prompt.storyDetails')}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Story Title */}
        <div className="space-y-1">
          <Label htmlFor="story-title" className="text-xs">{t('steps.prompt.storyTitle')}</Label>
          <Input
            id="story-title"
            placeholder={t('steps.prompt.storyTitlePlaceholder')}
            value={project.story.title}
            onChange={(e) => {
              updateStory(project.id, { title: e.target.value });
              // Sync project name with story title
              updateProject(project.id, { name: e.target.value });
            }}
            disabled={isReadOnly}
            className="h-9 glass border-white/10 focus:border-purple-500/50 text-sm"
          />
        </div>

        {/* Setting */}
        <div className="space-y-1">
          <Label htmlFor="setting" className="text-xs">{t('steps.prompt.setting')}</Label>
          <Input
            id="setting"
            placeholder={t('steps.prompt.settingPlaceholder')}
            value={project.story.setting}
            onChange={(e) => updateStory(project.id, { setting: e.target.value })}
            disabled={isReadOnly}
            className="h-9 glass border-white/10 focus:border-purple-500/50 text-sm"
          />
        </div>

        {/* Genre */}
        <div className="space-y-1">
          <Label className="text-xs">{t('steps.prompt.genre')}</Label>
          <Select
            value={project.story.genre}
            onValueChange={(value) => updateStory(project.id, { genre: value })}
            disabled={isReadOnly}
          >
            <SelectTrigger className="h-9 glass border-white/10 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="glass-strong border-white/10">
              {genres.map((genre) => (
                <SelectItem key={genre} value={genre}>
                  {t(`genres.${genre}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tone */}
        <div className="space-y-1">
          <Label className="text-xs">{t('steps.prompt.tone')}</Label>
          <Select
            value={project.story.tone}
            onValueChange={(value) => updateStory(project.id, { tone: value })}
            disabled={isReadOnly}
          >
            <SelectTrigger className="h-9 glass border-white/10 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="glass-strong border-white/10">
              {tones.map((tone) => (
                <SelectItem key={tone} value={tone}>
                  {t(`tones.${tone}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Story Concept */}
      <div className="space-y-1 mt-3">
        <Label htmlFor="concept" className="text-xs">{t('steps.prompt.concept')}</Label>
        <Textarea
          id="concept"
          placeholder={t('steps.prompt.conceptPlaceholder')}
          value={project.story.concept}
          onChange={(e) => updateStory(project.id, { concept: e.target.value })}
          disabled={isReadOnly}
          className="min-h-[200px] glass border-white/10 focus:border-purple-500/50 resize-y text-sm"
        />
      </div>

      {/* Payment Toggle */}
      {!isReadOnly && paymentToggle}
    </div>
  );
}
