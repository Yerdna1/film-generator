'use client';

import { Settings, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useApiKeys } from '@/contexts/ApiKeysContext';
import { useTranslations } from 'next-intl';
import { type OperationType } from '@/lib/services/user-permissions';

interface StepApiKeyButtonProps {
  operation: OperationType;
  stepName: string;
}

export function StepApiKeyButton({ operation, stepName }: StepApiKeyButtonProps) {
  const t = useTranslations('settings');
  const { showApiKeyModal } = useApiKeys();

  const handleClick = () => {
    showApiKeyModal({ operation, missingKeys: [] });
  };

  return (
    <div className="flex justify-center mb-6">
      <Button
        onClick={handleClick}
        variant="outline"
        className="glass border-border/50 hover:border-primary/50 transition-all duration-200"
        size="sm"
      >
        <Key className="w-4 h-4 mr-2" />
        {t('apiKeys')} - {stepName}
      </Button>
    </div>
  );
}
