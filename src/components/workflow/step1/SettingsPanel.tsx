'use client';

import type { Dispatch, SetStateAction } from 'react';
import { Monitor, Smartphone, Crown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check } from 'lucide-react';
import { styleOptions, imageProviders } from './constants';
import type { StylePreset } from '@/types/project';
import type { Project } from '@/types/project';
import { PremiumFeature, LockedBadge } from '@/components/shared/PremiumFeature';

interface SettingsPanelProps {
  project: Project;
  isReadOnly: boolean;
  isPremiumUser: boolean;
  aspectRatio: '16:9' | '21:9' | '4:3' | '1:1' | '9:16' | '3:4';
  setAspectRatio: (ratio: '16:9' | '21:9' | '4:3' | '1:1' | '9:16' | '3:4') => void;
  videoLanguage: string;
  setVideoLanguage: (lang: string | ((prev: string) => string)) => void;
  storyModel: 'gpt-4' | 'claude-sonnet-4.5' | 'gemini-3-pro';
  setStoryModel: Dispatch<SetStateAction<'gpt-4' | 'claude-sonnet-4.5' | 'gemini-3-pro'>>;
  styleModel: string;
  setStyleModel: (model: string) => void;
  imageProvider: 'gemini' | 'modal' | 'modal-edit' | 'kie';
  setImageProvider: Dispatch<SetStateAction<'gemini' | 'modal' | 'modal-edit' | 'kie'>>;
  voiceProvider: 'gemini-tts' | 'elevenlabs' | 'modal' | 'openai-tts' | 'kie';
  setVoiceProvider: (provider: 'gemini-tts' | 'elevenlabs' | 'modal' | 'openai-tts' | 'kie') => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  updateSettings: (id: string, settings: any) => void;
  updateUserConstants: (constants: any) => void;
  sceneOptions: readonly number[];
  storyModels: readonly string[];
  styleModels: readonly string[];
  videoLanguages: readonly string[];
  voiceProviders: Array<{ id: 'gemini-tts' | 'elevenlabs' | 'modal' | 'openai-tts' | 'kie'; label: string }>;
  genres: readonly string[];
  tones: readonly string[];
}

export function SettingsPanel({
  project,
  isReadOnly,
  isPremiumUser,
  aspectRatio,
  setAspectRatio,
  videoLanguage,
  setVideoLanguage,
  storyModel,
  setStoryModel,
  styleModel,
  setStyleModel,
  imageProvider,
  setImageProvider,
  voiceProvider,
  setVoiceProvider,
  updateProject,
  updateSettings,
  updateUserConstants,
  sceneOptions,
  storyModels,
  styleModels,
  videoLanguages,
  voiceProviders,
  genres,
  tones,
}: SettingsPanelProps) {
  const t = useTranslations();

  return (
    <div className="glass rounded-xl p-4 space-y-4 lg:col-span-1">
      <h3 className="text-sm font-semibold text-purple-400">{t('project.settings.title')}</h3>

      {/* Aspect Ratio */}
      <div className="space-y-2">
        <Label className="text-xs">{t('settings.aspectRatio')}</Label>

        {/* All ratios in one row */}
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => !isReadOnly && setAspectRatio('16:9')}
            disabled={isReadOnly}
            className={`rounded-lg p-3 border-2 transition-all flex flex-col items-center justify-center gap-2 ${aspectRatio === '16:9'
              ? 'border-purple-500 shadow-lg shadow-purple-500/20'
              : 'border-border hover:border-purple-300 dark:hover:border-purple-600'
              }`}
          >
            <Monitor className="w-5 h-5 text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">16:9</span>
          </button>

          <button
            onClick={() => !isReadOnly && setAspectRatio('9:16')}
            disabled={isReadOnly}
            className={`rounded-lg p-3 border-2 transition-all flex flex-col items-center justify-center gap-2 ${aspectRatio === '9:16'
              ? 'border-purple-500 shadow-lg shadow-purple-500/20'
              : 'border-border hover:border-purple-300 dark:hover:border-purple-600'
              }`}
          >
            <Smartphone className="w-5 h-5 text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">9:16</span>
          </button>

          <button
            onClick={() => !isReadOnly && setAspectRatio('21:9')}
            disabled={isReadOnly}
            className={`rounded-lg p-3 border-2 transition-all flex flex-col items-center justify-center gap-2 ${aspectRatio === '21:9'
              ? 'border-purple-500 shadow-lg shadow-purple-500/20'
              : 'border-border hover:border-purple-300 dark:hover:border-purple-600'
              }`}
          >
            <Monitor className="w-5 h-5 text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">21:9</span>
          </button>

          <button
            onClick={() => !isReadOnly && setAspectRatio('1:1')}
            disabled={isReadOnly}
            className={`rounded-lg p-3 border-2 transition-all flex flex-col items-center justify-center gap-2 ${aspectRatio === '1:1'
              ? 'border-purple-500 shadow-lg shadow-purple-500/20'
              : 'border-border hover:border-purple-300 dark:hover:border-purple-600'
              }`}
          >
            <Monitor className="w-5 h-5 text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">1:1</span>
          </button>
        </div>
      </div>

      {/* Video Language - Restricted for free users */}
      <div className="space-y-1">
        <Label className="text-xs flex items-center gap-1">
          {t('settings.videoLanguage')}
          {!isPremiumUser && <LockedBadge />}
        </Label>
        <PremiumFeature isPremium={isPremiumUser} compact>
          <Select value={videoLanguage} onValueChange={setVideoLanguage} disabled={isReadOnly}>
            <SelectTrigger className="w-full h-9 glass border-white/10 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="glass-strong border-white/10">
              {videoLanguages.map((lang) => (
                <SelectItem key={lang} value={lang}>
                  {t(`languages.${lang}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </PremiumFeature>
      </div>

      {/* Story Model - Restricted for free users */}
      <div className="space-y-1">
        <Label className="text-xs flex items-center gap-1">
          {t('settings.storyModel')}
          {isPremiumUser && <span className="px-1.5 py-0.5 text-[10px] bg-green-500/20 text-green-400 rounded">New</span>}
          {!isPremiumUser && <LockedBadge />}
        </Label>
        <PremiumFeature isPremium={isPremiumUser} compact>
          <Select value={storyModel} onValueChange={(value) => setStoryModel(value as 'gpt-4' | 'claude-sonnet-4.5' | 'gemini-3-pro')} disabled={isReadOnly}>
            <SelectTrigger className="w-full h-9 glass border-white/10 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="glass-strong border-white/10">
              {storyModels.map((model) => (
                <SelectItem key={model} value={model}>
                  {model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </PremiumFeature>
      </div>

      {/* Style Model - Restricted for free users */}
      <div className="space-y-1">
        <Label className="text-xs flex items-center gap-1">
          {t('settings.styleModel')}
          {!isPremiumUser && <LockedBadge />}
        </Label>
        <PremiumFeature isPremium={isPremiumUser} compact>
          <Select value={styleModel} onValueChange={setStyleModel} disabled={isReadOnly}>
            <SelectTrigger className="w-full h-9 glass border-white/10 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="glass-strong border-white/10">
              {styleModels.map((model) => (
                <SelectItem key={model} value={model}>
                  {model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </PremiumFeature>
      </div>

      {/* Image Provider - Restricted for free users */}
      <div className="space-y-1">
        <Label className="text-xs flex items-center gap-1">
          {t('settings.imageProvider')}
          {!isPremiumUser && <LockedBadge />}
        </Label>
        <PremiumFeature isPremium={isPremiumUser} compact>
          <Select
            value={imageProvider}
            onValueChange={(value) => {
              setImageProvider(value as 'gemini' | 'modal' | 'modal-edit');
              updateUserConstants({ sceneImageProvider: value, characterImageProvider: value });
            }}
            disabled={isReadOnly}
          >
            <SelectTrigger className="w-full h-9 glass border-white/10 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="glass-strong border-white/10">
              {imageProviders.map((provider) => (
                <SelectItem key={provider.id} value={provider.id}>
                  {provider.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </PremiumFeature>
      </div>

      {/* Scene Count - Limited to 12 for free users */}
      <div className="space-y-1">
        <Label className="text-xs flex items-center gap-1">
          {t('steps.scenes.sceneCount')}
          {!isPremiumUser && <LockedBadge />}
        </Label>
        <PremiumFeature isPremium={isPremiumUser} compact>
          <Select
            value={(project.settings?.sceneCount || 12).toString()}
            onValueChange={(value) => updateSettings(project.id, { sceneCount: parseInt(value) })}
            disabled={isReadOnly}
          >
            <SelectTrigger className="w-full h-9 glass border-white/10 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="glass-strong border-white/10">
              {/* Free users only see 12 scenes option */}
              {(isPremiumUser ? sceneOptions : [12]).map((count) => (
                <SelectItem key={count} value={count.toString()}>
                  {count} {t('project.scenes')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </PremiumFeature>
      </div>

      {/* Voice Provider - Restricted for free users */}
      <div className="space-y-1">
        <Label className="text-xs flex items-center gap-1">
          {t('settings.voiceProvider')}
          {!isPremiumUser && <LockedBadge />}
        </Label>
        <PremiumFeature isPremium={isPremiumUser} compact>
          <Select value={voiceProvider} onValueChange={(v) => setVoiceProvider(v as 'gemini-tts' | 'elevenlabs' | 'modal' | 'openai-tts')} disabled={isReadOnly}>
            <SelectTrigger className="w-full h-9 glass border-white/10 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="glass-strong border-white/10">
              {voiceProviders.map((provider) => (
                <SelectItem key={provider.id} value={provider.id}>
                  {provider.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </PremiumFeature>
      </div>

      {/* Style Images Grid - Only Disney/Pixar for free users */}
      <div className="space-y-2">
        <Label className="text-xs flex items-center gap-1">
          {t('settings.styleExamples')}
          {!isPremiumUser && <LockedBadge />}
        </Label>
        <div className="grid grid-cols-3 gap-2">
          {styleOptions.map((style) => {
            const imagePath = `/style-examples/${style.id}.jpg`;
            const isDisneyPixar = style.id === 'disney-pixar';
            const isLocked = !isPremiumUser && !isDisneyPixar;

            return (
              <motion.button
                key={style.id}
                whileHover={!isLocked ? { scale: 1.05 } : undefined}
                whileTap={!isLocked ? { scale: 0.95 } : undefined}
                onClick={() => !isReadOnly && !isLocked && updateProject(project.id, { style: style.id as StylePreset })}
                disabled={isReadOnly || isLocked}
                className={`relative rounded-lg overflow-hidden aspect-[3/4] border-2 transition-all ${isLocked
                  ? 'border-border opacity-40 cursor-not-allowed blur-[1px]'
                  : project.style === style.id
                    ? 'border-purple-500 shadow-lg shadow-purple-500/20'
                    : 'border-border hover:border-purple-300 dark:hover:border-purple-600'
                  }`}
              >
                <img
                  src={imagePath}
                  alt={t(style.labelKey)}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.querySelector('.fallback-gradient')?.classList.remove('hidden');
                  }}
                />
                <div className={`absolute inset-0 bg-gradient-to-br ${style.gradient} opacity-80 fallback-gradient hidden`} />
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1">
                  <p className="text-[10px] text-white/90 truncate">{t(style.labelKey)}</p>
                </div>
                {project.style === style.id && !isLocked && (
                  <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-purple-500 flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-white" />
                  </div>
                )}
                {isLocked && (
                  <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-amber-500/80 flex items-center justify-center">
                    <Crown className="w-2.5 h-2.5 text-white" />
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
