'use client';

import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Sparkles } from 'lucide-react';
import { ApiKeyInput } from './ApiKeyInput';

interface ApiKeysData {
  kieApiKey?: string;
  hasKieKey?: boolean;
}

interface KiaApiKeySectionProps {
  apiKeysData?: ApiKeysData;
  onSaveApiKey: (keyName: string, value: string) => Promise<void>;
}

export function KiaApiKeySection({ apiKeysData, onSaveApiKey }: KiaApiKeySectionProps) {
  return (
    <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-cyan-50 dark:from-purple-950/20 dark:to-cyan-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-600" />
          <Label className="text-sm font-semibold">Kie AI API Key</Label>
        </div>
        {apiKeysData?.kieApiKey ? (
          <Badge variant="outline" className="text-xs text-green-600 border-green-200 bg-green-50 dark:bg-green-950/20">
            ✓ Active
          </Badge>
        ) : (
          <Badge variant="outline" className="text-xs text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-950/20">
            Required
          </Badge>
        )}
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Your Kie AI API key will be used for all AI services (Image, Video, TTS, Music). Enter it once and it will be used across the entire application.
      </p>
      <ApiKeyInput
        provider="Kia AI"
        apiKeyName="kieApiKey"
        hasKey={!!apiKeysData?.kieApiKey}
        onSave={onSaveApiKey}
      />
    </div>
  );
}
