'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Globe, Palette, Bell, Coins } from 'lucide-react';
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
import { CURRENCIES, type Currency } from '@/lib/utils/currency';

interface GeneralSettingsTabProps {
  language: string;
  darkMode: boolean;
  reducedMotion: boolean;
  notifyOnComplete: boolean;
  autoSave: boolean;
  currency: Currency;
  onLanguageChange: (lang: string) => void;
  onDarkModeChange: (enabled: boolean) => void;
  onReducedMotionChange: (enabled: boolean) => void;
  onNotifyChange: (enabled: boolean) => void;
  onAutoSaveChange: (enabled: boolean) => void;
  onCurrencyChange: (currency: Currency) => void;
}

export function GeneralSettingsTab({
  language,
  darkMode,
  reducedMotion,
  notifyOnComplete,
  autoSave,
  currency,
  onLanguageChange,
  onDarkModeChange,
  onReducedMotionChange,
  onNotifyChange,
  onAutoSaveChange,
  onCurrencyChange,
}: GeneralSettingsTabProps) {
  const t = useTranslations('settings');
  const tPage = useTranslations('settingsPage');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
    >
      <Card className="glass border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="w-5 h-5 text-purple-400" />
            {t('language')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={language} onValueChange={onLanguageChange}>
            <SelectTrigger className="w-full glass border-white/10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="glass-strong border-white/10">
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="sk">Slovensky</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="glass border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Coins className="w-5 h-5 text-green-400" />
            {tPage('currency') || 'Currency'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={currency} onValueChange={(value) => onCurrencyChange(value as Currency)}>
            <SelectTrigger className="w-full glass border-white/10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="glass-strong border-white/10">
              {Object.entries(CURRENCIES).map(([code, config]) => (
                <SelectItem key={code} value={code}>
                  {config.symbol} {code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="glass border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Palette className="w-5 h-5 text-purple-400" />
            {t('theme')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm">{tPage('darkMode')}</Label>
            <Switch checked={darkMode} onCheckedChange={onDarkModeChange} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm">{tPage('reducedMotion')}</Label>
            <Switch checked={reducedMotion} onCheckedChange={onReducedMotionChange} />
          </div>
        </CardContent>
      </Card>

      <Card className="glass border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="w-5 h-5 text-purple-400" />
            {tPage('notifications')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm">{tPage('generationComplete')}</Label>
            <Switch checked={notifyOnComplete} onCheckedChange={onNotifyChange} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm">{tPage('autoSave')}</Label>
            <Switch checked={autoSave} onCheckedChange={onAutoSaveChange} />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
