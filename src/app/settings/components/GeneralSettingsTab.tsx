'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Globe, Palette, Bell } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface GeneralSettingsTabProps {
  language: string;
  darkMode: boolean;
  reducedMotion: boolean;
  notifyOnComplete: boolean;
  autoSave: boolean;
  onLanguageChange: (lang: string) => void;
  onDarkModeChange: (enabled: boolean) => void;
  onReducedMotionChange: (enabled: boolean) => void;
  onNotifyChange: (enabled: boolean) => void;
  onAutoSaveChange: (enabled: boolean) => void;
}

export function GeneralSettingsTab({
  language,
  darkMode,
  reducedMotion,
  notifyOnComplete,
  autoSave,
  onLanguageChange,
  onDarkModeChange,
  onReducedMotionChange,
  onNotifyChange,
  onAutoSaveChange,
}: GeneralSettingsTabProps) {
  const t = useTranslations('settings');
  const tPage = useTranslations('settingsPage');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <Card className="glass border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-purple-400" />
            {t('language')}
          </CardTitle>
          <CardDescription>
            {tPage('chooseLanguage')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={language} onValueChange={onLanguageChange}>
            <SelectTrigger className="w-full md:w-64 glass border-white/10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="glass-strong border-white/10">
              <SelectItem value="en">
                <span className="flex items-center gap-2">
                  English
                </span>
              </SelectItem>
              <SelectItem value="sk">
                <span className="flex items-center gap-2">
                  Slovensky
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="glass border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-purple-400" />
            {t('theme')}
          </CardTitle>
          <CardDescription>
            {tPage('customizeAppearance')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>{tPage('darkMode')}</Label>
              <p className="text-xs text-muted-foreground">{tPage('useDarkTheme')}</p>
            </div>
            <Switch
              checked={darkMode}
              onCheckedChange={onDarkModeChange}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>{tPage('reducedMotion')}</Label>
              <p className="text-xs text-muted-foreground">{tPage('minimizeAnimations')}</p>
            </div>
            <Switch
              checked={reducedMotion}
              onCheckedChange={onReducedMotionChange}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="glass border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-purple-400" />
            {tPage('notifications')}
          </CardTitle>
          <CardDescription>
            {tPage('notificationPrefs')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>{tPage('generationComplete')}</Label>
              <p className="text-xs text-muted-foreground">{tPage('notifyWhenReady')}</p>
            </div>
            <Switch
              checked={notifyOnComplete}
              onCheckedChange={onNotifyChange}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>{tPage('autoSave')}</Label>
              <p className="text-xs text-muted-foreground">{tPage('autoSaveChanges')}</p>
            </div>
            <Switch
              checked={autoSave}
              onCheckedChange={onAutoSaveChange}
            />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
