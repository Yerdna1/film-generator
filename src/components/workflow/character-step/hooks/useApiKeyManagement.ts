import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import type { Character } from '@/types/project';

interface ApiKeyState {
  hasKieKey: boolean;
  kieApiKey?: string;
}

export function useApiKeyManagement() {
  const { data: session } = useSession();

  const [isKieModalOpen, setIsKieModalOpen] = useState(false);
  const [isSavingKieKey, setIsSavingKieKey] = useState(false);
  const [userApiKeys, setUserApiKeys] = useState<ApiKeyState | null>(null);
  const [pendingCharacterGeneration, setPendingCharacterGeneration] = useState<Character | null>(null);
  const [modalReason, setModalReason] = useState<'no-key' | 'insufficient-credits'>('no-key');

  // Fetch user's API keys
  useEffect(() => {
    const fetchApiKeys = async () => {
      if (!session) return;
      try {
        const res = await fetch('/api/user/api-keys');
        if (res.ok) {
          const data = await res.json();
          setUserApiKeys({
            hasKieKey: data.apiKeys?.kieApiKey ? true : false,
            kieApiKey: data.apiKeys?.kieApiKey,
          });
        }
      } catch (error) {
        console.error('Failed to fetch API keys:', error);
      }
    };
    fetchApiKeys();

    // Listen for API key updates from settings page
    const handleApiKeysUpdate = () => {
      fetchApiKeys();
    };

    window.addEventListener('apiKeysUpdated' as any, handleApiKeysUpdate);
    return () => {
      window.removeEventListener('apiKeysUpdated' as any, handleApiKeysUpdate);
    };
  }, [session]);

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

      // Update local state
      setUserApiKeys(prev => ({
        ...prev,
        hasKieKey: true,
        kieApiKey: apiKey,
      }));

      toast.success('KIE AI API Key saved', {
        description: 'Generating character image...',
      });

      setIsKieModalOpen(false);

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
    userApiKeys,
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