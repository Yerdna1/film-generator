'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Key } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ApiProviderCard } from './ApiProviderCard';
import { apiProviders } from '../constants';

interface ApiKeysTabProps {
  showKeys: Record<string, boolean>;
  savedKeys: Record<string, boolean>;
  localConfig: Record<string, string>;
  apiConfig: Record<string, string>;
  onToggleVisibility: (key: string) => void;
  onSaveKey: (key: string) => void;
  onUpdateConfig: (key: string, value: string) => void;
}

export function ApiKeysTab({
  showKeys,
  savedKeys,
  localConfig,
  apiConfig,
  onToggleVisibility,
  onSaveKey,
  onUpdateConfig,
}: ApiKeysTabProps) {
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
            <Key className="w-5 h-5 text-purple-400" />
            {t('apiKeys')}
          </CardTitle>
          <CardDescription>
            {tPage('apiKeysDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {apiProviders.map((provider, index) => (
            <ApiProviderCard
              key={provider.key}
              provider={provider}
              index={index}
              showKey={showKeys[provider.key] || false}
              isSaved={savedKeys[provider.key] || false}
              value={localConfig[provider.key] || ''}
              isConfigured={!!apiConfig[provider.key]}
              onToggleVisibility={() => onToggleVisibility(provider.key)}
              onSave={() => onSaveKey(provider.key)}
              onChange={(value) => onUpdateConfig(provider.key, value)}
            />
          ))}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="glass border-white/10 border-l-4 border-l-cyan-500">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            {tPage('apiKeysNote')}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
