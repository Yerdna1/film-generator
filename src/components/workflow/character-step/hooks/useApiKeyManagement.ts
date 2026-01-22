import { useState } from 'react';
import { toast } from 'sonner';
import type { Character } from '@/types/project';
import type { ApiKeysData } from '@/hooks/use-api-keys';

interface UseApiKeyManagementProps {
  apiKeysData: ApiKeysData | null | undefined;
  isLoading: boolean;
  onApiKeysUpdated?: () => void;
}

export function useApiKeyManagement({ apiKeysData, isLoading, onApiKeysUpdated }: UseApiKeyManagementProps) {
  const [isKieModalOpen, setIsKieModalOpen] = useState(false);
  const [isSavingKieKey, setIsSavingKieKey] = useState(false);
  const [pendingCharacterGeneration, setPendingCharacterGeneration] = useState<Character | null>(null);
  const [modalReason, setModalReason] = useState<'no-key' | 'insufficient-credits'>('no-key');


  const handleSaveKieApiKey = async (apiKey: string, model: string): Promise<void> => {
    setIsSavingKieKey(true);

    try {
      const response = await fetch('/api/user/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kieApiKey: apiKey,
          kieImageModel: model,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save API key');
      }

      toast.success('KIE AI API Key saved', {
        description: 'Generating character image...',
      });

      setIsKieModalOpen(false);

      // Trigger parent to refresh API keys
      if (onApiKeysUpdated) {
        onApiKeysUpdated();
      }

      // Return the saved character for continuation
      if (pendingCharacterGeneration) {
        setPendingCharacterGeneration(null);
      }
    } catch (error) {
      toast.error('Failed to Save API Key', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    } finally {
      setIsSavingKieKey(false);
    }
  };

  return {
    userApiKeys: apiKeysData,
    isApiKeysLoading: isLoading,
    isKieModalOpen,
    setIsKieModalOpen,
    isSavingKieKey,
    pendingCharacterGeneration,
    setPendingCharacterGeneration,
    modalReason,
    setModalReason,
    handleSaveKieApiKey,
  };
}