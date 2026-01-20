'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import type { ApiKeys } from '@prisma/client';
import type { OperationType } from '@/lib/services/user-permissions';
import { toast } from 'sonner';
import { ApiKeyConfigModal } from '@/components/workflow/ApiKeyConfigModal';

interface ApiKeyModalData {
  operation: OperationType;
  missingKeys: string[];
  onSuccess?: () => void;
}

interface ApiKeysContextType {
  apiKeys: ApiKeys | null;
  loading: boolean;
  error: string | null;

  // Modal management
  showApiKeyModal: (data: ApiKeyModalData) => void;
  hideApiKeyModal: () => void;
  apiKeyModalData: ApiKeyModalData | null;
  isApiKeyModalOpen: boolean;

  // API key management
  refreshApiKeys: () => Promise<void>;
  updateApiKey: (key: string, value: string) => Promise<boolean>;
  updateMultipleKeys: (keys: Record<string, string>) => Promise<boolean>;
  clearApiKey: (key: string) => Promise<boolean>;

  // Provider management
  updateProvider: (providerType: string, provider: string) => Promise<boolean>;

  // Payment preference
  updatePaymentPreference: (useOwnKeys: boolean) => Promise<boolean>;

  // Helpers
  hasApiKey: (key: string) => boolean;
  getApiKey: (key: string) => string | null;
}

const ApiKeysContext = createContext<ApiKeysContextType | null>(null);

export function ApiKeysProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const [apiKeys, setApiKeys] = useState<ApiKeys | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [apiKeyModalData, setApiKeyModalData] = useState<ApiKeyModalData | null>(null);

  // Fetch API keys from the server
  const fetchApiKeys = useCallback(async () => {
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/user/api-keys');
      if (!response.ok) {
        throw new Error('Failed to fetch API keys');
      }
      const data = await response.json();
      setApiKeys(data.apiKeys);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load API keys');
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  // Fetch API keys on mount and when session changes
  useEffect(() => {
    fetchApiKeys();
  }, [fetchApiKeys]);

  // Refresh API keys
  const refreshApiKeys = useCallback(async () => {
    await fetchApiKeys();
  }, [fetchApiKeys]);

  // Update a single API key
  const updateApiKey = useCallback(async (key: string, value: string): Promise<boolean> => {
    if (!session?.user?.id) return false;

    try {
      const response = await fetch('/api/user/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      });

      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || 'Failed to update API key');
        return false;
      }

      const data = await response.json();
      setApiKeys(data.apiKeys);
      toast.success('API key updated successfully');
      return true;
    } catch (err) {
      toast.error('Failed to update API key');
      return false;
    }
  }, [session?.user?.id]);

  // Update multiple API keys at once
  const updateMultipleKeys = useCallback(async (keys: Record<string, string>): Promise<boolean> => {
    if (!session?.user?.id) return false;

    try {
      console.log('[ApiKeysContext] Updating keys:', keys);
      const response = await fetch('/api/user/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(keys),
      });

      if (!response.ok) {
        const data = await response.json();
        console.error('[ApiKeysContext] API error:', data);
        toast.error(data.error || 'Failed to update API keys');
        return false;
      }

      const data = await response.json();
      console.log('[ApiKeysContext] API keys saved successfully:', data);
      setApiKeys(data.apiKeys);
      toast.success('API keys updated successfully');
      return true;
    } catch (err) {
      console.error('[ApiKeysContext] Exception while updating keys:', err);
      toast.error('Failed to update API keys');
      return false;
    }
  }, [session?.user?.id]);

  // Clear an API key
  const clearApiKey = useCallback(async (key: string): Promise<boolean> => {
    return updateApiKey(key, '');
  }, [updateApiKey]);

  // Update provider selection
  const updateProvider = useCallback(async (providerType: string, provider: string): Promise<boolean> => {
    if (!session?.user?.id) return false;

    const providerKey = `${providerType}Provider`;
    return updateApiKey(providerKey, provider);
  }, [session?.user?.id, updateApiKey]);

  // Update payment preference
  const updatePaymentPreference = useCallback(async (useOwnKeys: boolean): Promise<boolean> => {
    if (!session?.user?.id) return false;

    try {
      const response = await fetch('/api/user/payment-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ useOwnKeys }),
      });

      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || 'Failed to update payment preference');
        return false;
      }

      // Update local state
      if (apiKeys) {
        setApiKeys({ ...apiKeys, preferOwnKeys: useOwnKeys });
      }

      return true;
    } catch (err) {
      toast.error('Failed to update payment preference');
      return false;
    }
  }, [session?.user?.id, apiKeys]);

  // Show API key modal
  const showApiKeyModal = useCallback((data: ApiKeyModalData) => {
    setApiKeyModalData(data);
    setIsApiKeyModalOpen(true);
  }, []);

  // Hide API key modal
  const hideApiKeyModal = useCallback(() => {
    setIsApiKeyModalOpen(false);
    // Keep data for animation purposes, clear after modal closes
    setTimeout(() => setApiKeyModalData(null), 300);
  }, []);

  // Helper to check if API key exists
  const hasApiKey = useCallback((key: string): boolean => {
    if (!apiKeys) return false;
    const value = (apiKeys as any)[key];
    return typeof value === 'string' && value.length > 0;
  }, [apiKeys]);

  // Helper to get API key value
  const getApiKey = useCallback((key: string): string | null => {
    if (!apiKeys) return null;
    const value = (apiKeys as any)[key];
    return typeof value === 'string' && value.length > 0 ? value : null;
  }, [apiKeys]);

  // Broadcast API key changes to other components
  useEffect(() => {
    if (!apiKeys) return;

    // Create a custom event when API keys change
    const event = new CustomEvent('apiKeysUpdated', { detail: apiKeys });
    window.dispatchEvent(event);
  }, [apiKeys]);

  // Listen for API key changes from other sources (e.g., settings page)
  useEffect(() => {
    const handleApiKeysUpdate = (event: CustomEvent) => {
      const updatedKeys = event.detail;
      if (updatedKeys && updatedKeys.id !== apiKeys?.id) {
        setApiKeys(updatedKeys);
      }
    };

    window.addEventListener('apiKeysUpdated' as any, handleApiKeysUpdate);
    return () => {
      window.removeEventListener('apiKeysUpdated' as any, handleApiKeysUpdate);
    };
  }, [apiKeys?.id]);

  return (
    <ApiKeysContext.Provider
      value={{
        apiKeys,
        loading,
        error,
        showApiKeyModal,
        hideApiKeyModal,
        apiKeyModalData,
        isApiKeyModalOpen,
        refreshApiKeys,
        updateApiKey,
        updateMultipleKeys,
        clearApiKey,
        updateProvider,
        updatePaymentPreference,
        hasApiKey,
        getApiKey,
      }}
    >
      {children}
      <ApiKeyConfigModal
        isOpen={isApiKeyModalOpen}
        onClose={hideApiKeyModal}
        operation={apiKeyModalData?.operation}
        missingKeys={apiKeyModalData?.missingKeys}
        onSuccess={() => {
          apiKeyModalData?.onSuccess?.();
          hideApiKeyModal();
        }}
      />
    </ApiKeysContext.Provider>
  );
}

export function useApiKeys() {
  const context = useContext(ApiKeysContext);
  if (!context) {
    throw new Error('useApiKeys must be used within an ApiKeysProvider');
  }
  return context;
}