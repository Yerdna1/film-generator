'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Loader2 } from 'lucide-react';

interface ApiKeyInputProps {
  provider: string;
  apiKeyName: string;
  hasKey: boolean;
  onSave: (keyName: string, value: string) => Promise<void>;
}

export function ApiKeyInput({ provider, apiKeyName, hasKey, onSave }: ApiKeyInputProps) {
  const [value, setValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const t = useTranslations();

  const handleSave = async () => {
    if (!value.trim()) return;
    setIsSaving(true);
    await onSave(apiKeyName, value);
    setValue('');
    setIsSaving(false);
  };

  return (
    <div className="mt-2 p-3 bg-muted/30 rounded-md border border-border/50">
      <div className="flex items-center justify-between mb-2">
        <Label className="text-xs font-medium text-muted-foreground">
          {hasKey ? t('step1.modelConfiguration.apiKeySet') : t('step1.modelConfiguration.apiKeyRequired')}
        </Label>
        {hasKey && (
          <Badge variant="outline" className="text-[10px] text-green-600 border-green-200 bg-green-50">
            Active
          </Badge>
        )}
      </div>
      <div className="flex gap-2">
        <Input
          type="password"
          placeholder={hasKey ? '••••••••••••••••' : `Enter ${provider} API Key`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-8 text-sm"
        />
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!value.trim() || isSaving}
          className="h-8 px-3"
        >
          {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
        </Button>
      </div>
    </div>
  );
}
