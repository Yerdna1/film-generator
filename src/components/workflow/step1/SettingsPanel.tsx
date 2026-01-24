'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Settings2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Project } from '@/types/project';
import {
  AspectRatioSelector,
  VideoLanguageSelector,
  SceneCountSelector,
  StyleExamplesGrid
} from './settings-components';

interface SettingsPanelProps {
  project: Project;
  isReadOnly: boolean;
  aspectRatio: '16:9' | '21:9' | '4:3' | '1:1' | '9:16' | '3:4';
  setAspectRatio: (ratio: '16:9' | '21:9' | '4:3' | '1:1' | '9:16' | '3:4') => void;
  videoLanguage: string;
  setVideoLanguage: (lang: string | ((prev: string) => string)) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  updateSettings: (id: string, settings: any) => void;
  sceneOptions: readonly number[];
  videoLanguages: readonly string[];
  isPremiumUser?: boolean;
}

export function SettingsPanel({
  project,
  isReadOnly,
  aspectRatio,
  setAspectRatio,
  videoLanguage,
  setVideoLanguage,
  updateProject,
  updateSettings,
  sceneOptions,
  videoLanguages,
  isPremiumUser = false,
}: SettingsPanelProps) {
  const t = useTranslations();

  return (
    <div className="glass rounded-xl p-4 space-y-4 lg:col-span-1">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-purple-400">{t('project.settings.title')}</h3>
      </div>

      {/* Aspect Ratio */}
      <AspectRatioSelector
        aspectRatio={aspectRatio}
        setAspectRatio={setAspectRatio}
        isReadOnly={isReadOnly}
      />

      {/* Video Language */}
      <VideoLanguageSelector
        videoLanguage={videoLanguage}
        setVideoLanguage={setVideoLanguage}
        videoLanguages={videoLanguages}
        isReadOnly={isReadOnly}
      />

      {/* Scene Count */}
      <SceneCountSelector
        project={project}
        sceneOptions={sceneOptions}
        updateSettings={updateSettings}
        isReadOnly={isReadOnly}
      />

      {/* Style Examples Grid */}
      <StyleExamplesGrid
        project={project}
        updateProject={updateProject}
        isReadOnly={isReadOnly}
      />

    </div>
  );
}
