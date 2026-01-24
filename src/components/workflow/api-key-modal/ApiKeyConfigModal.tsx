'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { X, Info, Loader2, Settings } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SaveStatus, type SaveStatus as SaveStatusType } from '@/components/ui/SaveStatus';
import { toast } from '@/lib/toast';
import { useApiKeys } from '@/contexts/ApiKeysContext';
import { formatApiKeyName } from '@/lib/services/user-permissions';
import { debounce } from '@/lib/utils/debounce';
import { CurrentSelectionSummary } from './CurrentSelectionSummary';
import { OperationTabContent } from './OperationTabContent';
import { API_KEY_FIELDS, OPERATION_INFO } from './constants';
import type { ApiKeyConfigModalProps, OperationType } from './types';
import { useProvidersByOperation } from '@/hooks/use-providers';
import { useModels } from '@/hooks/use-models';

export function ApiKeyConfigModal({
  isOpen,
  onClose,
  operation,
  missingKeys = [],
  onSuccess,
}: ApiKeyConfigModalProps) {
  const { apiKeys, updateMultipleKeys, hasApiKey } = useApiKeys();
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatusType>('idle');
  const [activeTab, setActiveTab] = useState<OperationType | 'all'>(operation || 'all');
  const [kieModels, setKieModels] = useState<Record<string, any[]>>({
    llm: [],
    image: [],
    video: [],
    tts: [],
    music: [],
  });
  const [loadingKieModels, setLoadingKieModels] = useState(true);
  const pendingSaveRef = useRef<Record<string, string>>({});

  // Fetch providers from database
  const { providersByOperation, isLoading: loadingProviders } = useProvidersByOperation();

  // Fetch KIE models from database
  useEffect(() => {
    async function fetchKieModels() {
      try {
        const [llmRes, imageRes, videoRes, ttsRes, musicRes] = await Promise.all([
          fetch('/api/kie-models?type=llm'),
          fetch('/api/kie-models?type=image'),
          fetch('/api/kie-models?type=video'),
          fetch('/api/kie-models?type=tts'),
          fetch('/api/kie-models?type=music'),
        ]);

        const [llmData, imageData, videoData, ttsData, musicData] = await Promise.all([
          llmRes.json(),
          imageRes.json(),
          videoRes.json(),
          ttsRes.json(),
          musicRes.json(),
        ]);

        setKieModels({
          llm: llmData.models || [],
          image: imageData.models || [],
          video: videoData.models || [],
          tts: ttsData.models || [],
          music: musicData.models || [],
        });

        // Update API_KEY_FIELDS with fetched KIE models
        if (llmData.models?.length) {
          API_KEY_FIELDS.kieLlmModel.options = llmData.models.map((m: any) => ({
            value: m.modelId,
            label: m.name,
          }));
        }
        if (imageData.models?.length) {
          API_KEY_FIELDS.kieImageModel.options = imageData.models.map((m: any) => ({
            value: m.modelId,
            label: m.name,
          }));
        }
        if (videoData.models?.length) {
          API_KEY_FIELDS.kieVideoModel.options = videoData.models.map((m: any) => ({
            value: m.modelId,
            label: m.name,
          }));
        }
        if (ttsData.models?.length) {
          API_KEY_FIELDS.kieTtsModel.options = ttsData.models.map((m: any) => ({
            value: m.modelId,
            label: m.name,
          }));
        }
        if (musicData.models?.length) {
          API_KEY_FIELDS.kieMusicModel.options = musicData.models.map((m: any) => ({
            value: m.modelId,
            label: m.name,
          }));
        }
      } catch (error) {
        console.error('Failed to fetch KIE models:', error);
      } finally {
        setLoadingKieModels(false);
      }
    }

    if (isOpen) {
      fetchKieModels();
    }
  }, [isOpen]);

  // Initialize values from existing API keys
  useEffect(() => {
    if (!apiKeys) {
      return;
    }

    const initialValues: Record<string, string> = {};

    // Include all API_KEY_FIELDS
    Object.keys(API_KEY_FIELDS).forEach((key) => {
      const value = (apiKeys as any)[key];
      if (value) {
        initialValues[key] = value;
      }
    });

    // Include provider fields (these are NOT in API_KEY_FIELDS)
    const providerFields = ['llmProvider', 'imageProvider', 'videoProvider', 'ttsProvider', 'musicProvider'];
    providerFields.forEach((field) => {
      const value = (apiKeys as any)[field];
      if (value) {
        initialValues[field] = value;
      }
    });

    setValues(initialValues);
  }, [apiKeys]);

  // Reset save status when modal opens
  useEffect(() => {
    if (isOpen) {
      setSaveStatus('idle');
      pendingSaveRef.current = {};
    }
  }, [isOpen]);

  // Auto-save function (debounced)
  const performAutoSave = useCallback(async (changesToSave: Record<string, string>) => {
    // Validate the changes
    const newErrors: Record<string, string> = {};
    let hasErrors = false;

    for (const [key, value] of Object.entries(changesToSave)) {
      const field = API_KEY_FIELDS[key];
      if (field?.validate && value) {
        const validation = field.validate(value);
        if (!validation.valid) {
          newErrors[key] = validation.error || 'Invalid format';
          hasErrors = true;
        }
      }
    }

    if (hasErrors) {
      setErrors(newErrors);
      setSaveStatus('error');
      return;
    }

    // Clear errors for valid fields
    for (const key of Object.keys(changesToSave)) {
      if (errors[key]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[key];
          return newErrors;
        });
      }
    }

    setSaveStatus('saving');
    setSaving(true);

    try {
      const success = await updateMultipleKeys(changesToSave);

      if (success) {
        setSaveStatus('saved');
        // Reset to idle after a delay
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        setSaveStatus('error');
        // Reset to idle after a delay
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    } catch (error) {
      console.error('Auto-save failed:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setSaving(false);
    }
  }, [updateMultipleKeys, errors]);

  // Create debounced version of auto-save (500ms delay)
  const debouncedAutoSave = useMemo(
    () => debounce((changes: Record<string, string>) => {
      pendingSaveRef.current = {};
      performAutoSave(changes);
    }, 500),
    [performAutoSave]
  );

  // Cancel pending debounced saves when modal closes
  useEffect(() => {
    return () => {
      debouncedAutoSave.cancel();
    };
  }, [debouncedAutoSave]);

  const handleInputChange = (key: string, value: string) => {
    const newValues = { ...values, [key]: value };

    // Auto-set provider when a model is selected
    if (key === 'kieLlmModel' && value) {
      newValues.llmProvider = 'kie';
    } else if (key === 'kieTtsModel' && value) {
      newValues.ttsProvider = 'kie';
    } else if (key === 'kieImageModel' && value) {
      newValues.imageProvider = 'kie';
    } else if (key === 'kieVideoModel' && value) {
      newValues.videoProvider = 'kie';
    } else if (key === 'kieMusicModel' && value) {
      newValues.musicProvider = 'kie';
    } else if (key === 'openaiTtsModel' && value) {
      newValues.ttsProvider = 'openai-tts';
    } else if (key === 'elevenlabsModel' && value) {
      newValues.ttsProvider = 'elevenlabs';
    }

    setValues(newValues);

    // Determine what changed
    const changedFields: string[] = [];
    if (value !== ((apiKeys as any)?.[key] || '')) {
      changedFields.push(key);
    }
    // Check for auto-set provider changes
    if (key === 'kieLlmModel' && value && newValues.llmProvider !== ((apiKeys as any)?.llmProvider || '')) {
      changedFields.push('llmProvider');
    }
    if (key === 'kieTtsModel' && value && newValues.ttsProvider !== ((apiKeys as any)?.ttsProvider || '')) {
      changedFields.push('ttsProvider');
    }
    if (key === 'kieImageModel' && value && newValues.imageProvider !== ((apiKeys as any)?.imageProvider || '')) {
      changedFields.push('imageProvider');
    }
    if (key === 'kieVideoModel' && value && newValues.videoProvider !== ((apiKeys as any)?.videoProvider || '')) {
      changedFields.push('videoProvider');
    }
    if (key === 'kieMusicModel' && value && newValues.musicProvider !== ((apiKeys as any)?.musicProvider || '')) {
      changedFields.push('musicProvider');
    }

    // Queue the changes for auto-save
    if (changedFields.length > 0) {
      const changes: Record<string, string> = {};
      for (const field of changedFields) {
        changes[field] = newValues[field];
      }

      // Store pending changes
      pendingSaveRef.current = { ...pendingSaveRef.current, ...changes };

      // Trigger debounced auto-save
      debouncedAutoSave({ ...pendingSaveRef.current });
    }

    // Clear error when user starts typing
    if (errors[key]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }

    // Validate on change (but don't save yet - let auto-save handle it)
    const field = API_KEY_FIELDS[key];
    if (field.validate && value) {
      const validation = field.validate(value);
      if (!validation.valid) {
        setErrors((prev) => ({ ...prev, [key]: validation.error || 'Invalid format' }));
      }
    }
  };

  const handleSave = async () => {
    // Validate all fields
    const newErrors: Record<string, string> = {};
    let hasErrors = false;

    Object.entries(values).forEach(([key, value]) => {
      const field = API_KEY_FIELDS[key];
      if (field?.validate && value) {
        const validation = field.validate(value);
        if (!validation.valid) {
          newErrors[key] = validation.error || 'Invalid format';
          hasErrors = true;
        }
      }
    });

    if (hasErrors) {
      setErrors(newErrors);
      toast.error('Please fix the validation errors');
      return;
    }

    setSaving(true);
    try {
      // Only send changed values
      const changedValues: Record<string, string> = {};
      Object.entries(values).forEach(([key, value]) => {
        const currentValue = (apiKeys as any)?.[key] || '';
        if (value !== currentValue) {
          changedValues[key] = value;
        }
      });

      if (Object.keys(changedValues).length === 0) {
        toast.info('No changes to save');
        onClose();
        return;
      }

      const success = await updateMultipleKeys(changedValues);

      if (success) {
        onSuccess?.();
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  // Get current provider for an operation type (checks local values first, then apiKeys)
  const getCurrentProvider = (opType: OperationType) => {
    const providerField = `${opType}Provider` as string;
    // Check local values first (unsaved changes), then fall back to apiKeys
    return values[providerField] || (apiKeys as any)?.[providerField];
  };

  // Get current model for an operation type (checks local values first, then apiKeys)
  const getCurrentModel = (opType: OperationType) => {
    const provider = getCurrentProvider(opType);
    if (!provider) return null;

    const providerConfig = providersByOperation[opType]?.find((p) => p.id === provider);
    if (!providerConfig?.modelField) return null;

    // Check local values first (unsaved changes), then fall back to apiKeys
    return values[providerConfig.modelField] || (apiKeys as any)?.[providerConfig.modelField];
  };

  // Handler for selecting a provider
  const handleSelectProvider = async (opType: OperationType, providerId: string) => {
    const currentProvider = getCurrentProvider(opType);
    if (currentProvider === providerId) return;

    const providerField = `${opType}Provider` as string;

    try {
      // Update local state immediately for visual feedback
      setValues((prev) => ({ ...prev, [providerField]: providerId }));

      // Save to database immediately
      const success = await updateMultipleKeys({ [providerField]: providerId });

      if (!success) {
        toast.error('Failed to switch provider');
        // Revert local state if save failed
        setValues((prev) => ({ ...prev, [providerField]: currentProvider || '' }));
      }
    } catch (error) {
      console.error('Failed to switch provider:', error);
      toast.error('Failed to switch provider');
      // Revert local state on error
      setValues((prev) => ({ ...prev, [providerField]: currentProvider || '' }));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configure API Keys & Providers
          </DialogTitle>
          <p className="text-sm text-gray-500 mt-2">
            {missingKeys.length > 0
              ? missingKeys.length === 1
                ? 'You need to configure this API key to continue.'
                : 'You need to configure these API keys to continue.'
              : 'Configure your API keys and select providers for each operation type.'}
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as OperationType | 'all')}>
            <TabsList className="grid grid-cols-6 w-full h-auto">
              <TabsTrigger value="all" className="flex flex-col items-center gap-1 py-3">
                <Settings className="w-4 h-4" />
                <span className="text-xs">All</span>
              </TabsTrigger>
              {(Object.keys(OPERATION_INFO) as OperationType[]).map((opType) => {
                const info = OPERATION_INFO[opType];
                return (
                  <TabsTrigger key={opType} value={opType} className="flex flex-col items-center gap-1 py-3">
                    <span className="text-lg">{info.icon}</span>
                    <span className="text-xs">{info.label.split(' ')[0]}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            <TabsContent value="all" className="mt-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold mb-4">Current Configuration</h3>
                {(Object.keys(OPERATION_INFO) as OperationType[]).map((opType) => (
                  <CurrentSelectionSummary
                    key={opType}
                    opType={opType}
                    currentProvider={getCurrentProvider(opType)}
                    currentModel={getCurrentModel(opType)}
                    providers={providersByOperation[opType] || []}
                  />
                ))}
              </div>
            </TabsContent>

            {(Object.keys(OPERATION_INFO) as OperationType[]).map((opType) => {
              return (
                <TabsContent key={opType} value={opType} className="mt-6">
                  <OperationTabContent
                    opType={opType}
                    providers={providersByOperation[opType] || []}
                    loadingProviders={loadingProviders}
                    currentProvider={getCurrentProvider(opType)}
                    currentModel={getCurrentModel(opType)}
                    hasApiKey={hasApiKey}
                    values={values}
                    errors={errors}
                    kieModels={kieModels}
                    loadingKieModels={loadingKieModels}
                    onSelectProvider={(providerId) => handleSelectProvider(opType, providerId)}
                    onInputChange={handleInputChange}
                  />
                </TabsContent>
              );
            })}
          </Tabs>
        </div>

        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-700">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Info className="w-4 h-4" />
              <span>API keys are stored securely and never shared</span>
            </div>
            <SaveStatus status={saveStatus} />
          </div>
          <div className="flex gap-3">
            {Object.keys(errors).length > 0 && (
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Configuration
              </Button>
            )}
            <Button variant={Object.keys(errors).length > 0 ? 'outline' : 'default'} onClick={onClose} disabled={saving}>
              {Object.keys(errors).length > 0 ? 'Cancel' : 'Done'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
