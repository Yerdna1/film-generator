'use client';

import { useState, useEffect } from 'react';
import { X, Info, Check, Loader2, ExternalLink, Settings, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Combobox } from '@/components/ui/combobox';
import { toast } from 'sonner';
import { useApiKeys } from '@/contexts/ApiKeysContext';
import { formatApiKeyName, type OperationType } from '@/lib/services/user-permissions';

interface ApiKeyConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  operation?: OperationType;
  missingKeys?: string[];
  onSuccess?: () => void;
}

interface ApiKeyField {
  key: string;
  label: string;
  placeholder: string;
  helpText: string;
  helpLink?: string;
  validate?: (value: string) => { valid: boolean; error?: string };
  type?: 'text' | 'select';
  options?: { value: string; label: string; provider?: string }[];
}

interface ProviderConfig {
  id: string;
  name: string;
  icon: string;
  color: string;
  apiKeyField?: string;
  modelField?: string;
  modelOptions?: { value: string; label: string }[];
  description?: string;
}

// Provider configurations for each operation type
const PROVIDER_CONFIGS: Record<OperationType, ProviderConfig[]> = {
  llm: [
    {
      id: 'openrouter',
      name: 'OpenRouter',
      icon: '🌐',
      color: 'emerald',
      apiKeyField: 'openRouterApiKey',
      modelField: 'openRouterModel',
      modelOptions: [
        { value: 'anthropic/claude-4.5-sonnet', label: 'Claude Sonnet 4.5' },
        { value: 'anthropic/claude-3.5-sonnet', label: 'Claude Sonnet 3.5' },
        { value: 'anthropic/claude-3.7-sonnet', label: 'Claude Sonnet 3.7' },
        { value: 'openai/gpt-4o', label: 'GPT-4o' },
        { value: 'openai/gpt-4o-mini', label: 'GPT-4o Mini' },
        { value: 'google/gemini-pro-1.5', label: 'Gemini Pro 1.5' },
        { value: 'deepseek/deepseek-chat', label: 'DeepSeek V3' },
        { value: 'meta-llama/llama-3.1-70b-instruct', label: 'Llama 3.1 70B' },
      ],
      description: 'Multi-provider API for Claude, GPT-4, Gemini, and more',
    },
    {
      id: 'claude-sdk',
      name: 'Claude SDK',
      icon: '🧠',
      color: 'amber',
      apiKeyField: 'claudeApiKey',
      description: 'Local Claude CLI (does not work on Vercel)',
    },
    {
      id: 'modal',
      name: 'Modal (Self-Hosted)',
      icon: '⚡',
      color: 'cyan',
      apiKeyField: 'modalLlmEndpoint',
      description: 'Self-hosted LLM on Modal.com GPU infrastructure',
    },
  ],
  image: [
    {
      id: 'gemini',
      name: 'Gemini',
      icon: '✨',
      color: 'blue',
      apiKeyField: 'geminiApiKey',
      description: 'Google Gemini for image generation',
    },
    {
      id: 'kie',
      name: 'KIE.ai',
      icon: '🎨',
      color: 'orange',
      apiKeyField: 'kieApiKey',
      modelField: 'kieImageModel',
      description: 'Multiple models: Seedream, Flux-2, Imagen4, Ideogram, etc.',
    },
    {
      id: 'modal',
      name: 'Modal Qwen-Image',
      icon: '⚡',
      color: 'cyan',
      apiKeyField: 'modalImageEndpoint',
      description: 'Self-hosted Qwen-Image (20B) for fast generation',
    },
    {
      id: 'modal-edit',
      name: 'Modal Qwen-Image-Edit',
      icon: '🖼️',
      color: 'cyan',
      apiKeyField: 'modalImageEditEndpoint',
      description: 'Best character consistency with reference images',
    },
  ],
  video: [
    {
      id: 'kie',
      name: 'KIE.ai',
      icon: '🎬',
      color: 'orange',
      apiKeyField: 'kieApiKey',
      modelField: 'kieVideoModel',
      description: 'Multiple models: Grok Imagine, Kling, Sora2, Veo 3.1, etc.',
    },
    {
      id: 'modal',
      name: 'Modal (Self-Hosted)',
      icon: '⚡',
      color: 'cyan',
      apiKeyField: 'modalVideoEndpoint',
      description: 'Self-hosted video model on Modal.com',
    },
  ],
  tts: [
    {
      id: 'gemini-tts',
      name: 'Gemini TTS',
      icon: '🔊',
      color: 'blue',
      apiKeyField: 'geminiApiKey',
      description: 'Google Gemini TTS with excellent Slovak support',
    },
    {
      id: 'openai-tts',
      name: 'OpenAI TTS',
      icon: '🗣️',
      color: 'green',
      apiKeyField: 'openaiApiKey',
      description: 'OpenAI gpt-4o-mini-tts with voice instructions',
    },
    {
      id: 'elevenlabs',
      name: 'ElevenLabs',
      icon: '🎙️',
      color: 'violet',
      apiKeyField: 'elevenLabsApiKey',
      description: 'High-quality voices, best for English',
    },
    {
      id: 'kie',
      name: 'KIE.ai (ElevenLabs)',
      icon: '🎙️',
      color: 'orange',
      apiKeyField: 'kieApiKey',
      modelField: 'kieTtsModel',
      description: 'ElevenLabs voices via KIE.ai API',
    },
    {
      id: 'modal',
      name: 'Modal (Self-Hosted)',
      icon: '⚡',
      color: 'cyan',
      apiKeyField: 'modalTtsEndpoint',
      description: 'Self-hosted TTS model (Bark, XTTS, Coqui)',
    },
  ],
  music: [
    {
      id: 'piapi',
      name: 'PiAPI',
      icon: '🎵',
      color: 'pink',
      apiKeyField: 'piapiApiKey',
      description: 'Access Suno, Udio, and more via unified API',
    },
    {
      id: 'suno',
      name: 'Suno AI',
      icon: '🎶',
      color: 'purple',
      apiKeyField: 'sunoApiKey',
      description: 'Direct Suno API via sunoapi.org',
    },
    {
      id: 'kie',
      name: 'KIE.ai',
      icon: '🎵',
      color: 'orange',
      apiKeyField: 'kieApiKey',
      modelField: 'kieMusicModel',
      description: 'AI music generation via KIE.ai',
    },
    {
      id: 'modal',
      name: 'Modal ACE-Step',
      icon: '⚡',
      color: 'cyan',
      apiKeyField: 'modalMusicEndpoint',
      description: 'Self-hosted ACE-Step music generation',
    },
  ],
};

const API_KEY_FIELDS: Record<string, ApiKeyField> = {
  openRouterApiKey: {
    key: 'openRouterApiKey',
    label: 'OpenRouter API Key',
    placeholder: 'sk-or-v1-...',
    helpText: 'Get your API key from OpenRouter',
    helpLink: 'https://openrouter.ai/keys',
    validate: (value) => {
      if (!value || value.startsWith('sk-or-')) {
        return { valid: true };
      }
      return { valid: false, error: 'OpenRouter keys must start with sk-or-' };
    },
  },
  openRouterModel: {
    key: 'openRouterModel',
    label: 'OpenRouter Model',
    placeholder: 'Select a model',
    helpText: 'Select the model to use for LLM operations',
    type: 'select',
    options: PROVIDER_CONFIGS.llm.find(p => p.id === 'openrouter')?.modelOptions,
  },
  claudeApiKey: {
    key: 'claudeApiKey',
    label: 'Claude API Key',
    placeholder: 'sk-ant-...',
    helpText: 'Get your API key from Anthropic',
    helpLink: 'https://console.anthropic.com/account/keys',
  },
  geminiApiKey: {
    key: 'geminiApiKey',
    label: 'Gemini API Key',
    placeholder: 'AIza...',
    helpText: 'Get your API key from Google AI Studio',
    helpLink: 'https://makersuite.google.com/app/apikey',
  },
  kieApiKey: {
    key: 'kieApiKey',
    label: 'KIE.ai API Key',
    placeholder: 'Your KIE.ai API key',
    helpText: 'Get your API key from KIE.ai',
    helpLink: 'https://kie.ai/api-keys',
    validate: (value) => {
      if (value && value.length < 20) {
        return { valid: false, error: 'KIE.ai API key should be at least 20 characters' };
      }
      return { valid: true };
    },
  },
  elevenLabsApiKey: {
    key: 'elevenLabsApiKey',
    label: 'ElevenLabs API Key',
    placeholder: 'Your ElevenLabs API key',
    helpText: 'Get your API key from ElevenLabs',
    helpLink: 'https://elevenlabs.io/api',
  },
  openaiApiKey: {
    key: 'openaiApiKey',
    label: 'OpenAI API Key',
    placeholder: 'sk-...',
    helpText: 'Get your API key from OpenAI',
    helpLink: 'https://platform.openai.com/api-keys',
  },
  piapiApiKey: {
    key: 'piapiApiKey',
    label: 'PiAPI Key',
    placeholder: 'Your PiAPI key',
    helpText: 'Get your API key from PiAPI',
    helpLink: 'https://piapi.ai',
  },
  sunoApiKey: {
    key: 'sunoApiKey',
    label: 'Suno API Key',
    placeholder: 'Your Suno API key',
    helpText: 'Get your API key from Suno',
    helpLink: 'https://suno.ai/api',
  },
  modalLlmEndpoint: {
    key: 'modalLlmEndpoint',
    label: 'Modal LLM Endpoint',
    placeholder: 'https://your-app--llm.modal.run',
    helpText: 'Your Modal LLM endpoint URL',
    helpLink: 'https://modal.com/docs',
  },
  modalTtsEndpoint: {
    key: 'modalTtsEndpoint',
    label: 'Modal TTS Endpoint',
    placeholder: 'https://your-app--tts.modal.run',
    helpText: 'Your Modal TTS endpoint URL',
    helpLink: 'https://modal.com/docs',
  },
  modalImageEndpoint: {
    key: 'modalImageEndpoint',
    label: 'Modal Image Endpoint',
    placeholder: 'https://your-app--image.modal.run',
    helpText: 'Your Modal Image generation endpoint URL',
    helpLink: 'https://modal.com/docs',
  },
  modalImageEditEndpoint: {
    key: 'modalImageEditEndpoint',
    label: 'Modal Image Edit Endpoint',
    placeholder: 'https://your-app--image-edit.modal.run',
    helpText: 'Your Modal Image Edit endpoint URL (Qwen-Image-Edit)',
    helpLink: 'https://huggingface.co/Qwen/Qwen-Image-Edit-2511',
  },
  modalVideoEndpoint: {
    key: 'modalVideoEndpoint',
    label: 'Modal Video Endpoint',
    placeholder: 'https://your-app--video.modal.run',
    helpText: 'Your Modal Video generation endpoint URL',
    helpLink: 'https://modal.com/docs',
  },
  modalMusicEndpoint: {
    key: 'modalMusicEndpoint',
    label: 'Modal Music Endpoint',
    placeholder: 'https://your-app--ace-step.modal.run',
    helpText: 'Your Modal ACE-Step music endpoint URL',
    helpLink: 'https://modal.com/docs',
  },
  kieImageModel: {
    key: 'kieImageModel',
    label: 'KIE Image Model',
    placeholder: 'seedream/4-5-text-to-image',
    helpText: 'Default KIE image generation model',
    type: 'select',
    options: [], // Will be populated from API
  },
  kieVideoModel: {
    key: 'kieVideoModel',
    label: 'KIE Video Model',
    placeholder: 'grok-imagine/image-to-video',
    helpText: 'Default KIE video generation model',
    type: 'select',
    options: [], // Will be populated from API
  },
  kieTtsModel: {
    key: 'kieTtsModel',
    label: 'KIE TTS Model',
    placeholder: 'elevenlabs/text-to-dialogue-v3',
    helpText: 'Default KIE text-to-speech model',
    type: 'select',
    options: [], // Will be populated from API
  },
  kieMusicModel: {
    key: 'kieMusicModel',
    label: 'KIE Music Model',
    placeholder: 'suno/v3-5-music',
    helpText: 'Default KIE music generation model',
    type: 'select',
    options: [], // Will be populated from API
  },
};

const OPERATION_INFO: Record<OperationType, { label: string; icon: string; description: string }> = {
  llm: { label: 'LLM / Scene Generation', icon: '🧠', description: 'For story and scene generation' },
  image: { label: 'Image Generation', icon: '🖼️', description: 'For character and scene images' },
  video: { label: 'Video Generation', icon: '🎬', description: 'For scene animation' },
  tts: { label: 'Voice Generation', icon: '🎙️', description: 'For voiceovers' },
  music: { label: 'Music Generation', icon: '🎵', description: 'For background music' },
};

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
  const [activeTab, setActiveTab] = useState<OperationType | 'all'>(operation || 'all');
  const [kieModels, setKieModels] = useState<Record<string, any[]>>({
    image: [],
    video: [],
    tts: [],
    music: [],
  });
  const [loadingKieModels, setLoadingKieModels] = useState(true);

  // Fetch KIE models from database
  useEffect(() => {
    async function fetchKieModels() {
      try {
        const [imageRes, videoRes, ttsRes, musicRes] = await Promise.all([
          fetch('/api/kie-models?type=image'),
          fetch('/api/kie-models?type=video'),
          fetch('/api/kie-models?type=tts'),
          fetch('/api/kie-models?type=music'),
        ]);

        const [imageData, videoData, ttsData, musicData] = await Promise.all([
          imageRes.json(),
          videoRes.json(),
          ttsRes.json(),
          musicRes.json(),
        ]);

        setKieModels({
          image: imageData.models || [],
          video: videoData.models || [],
          tts: ttsData.models || [],
          music: musicData.models || [],
        });

        // Update API_KEY_FIELDS with fetched KIE models
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
    if (!apiKeys) return;

    const initialValues: Record<string, string> = {};
    Object.keys(API_KEY_FIELDS).forEach((key) => {
      const value = (apiKeys as any)[key];
      if (value) {
        initialValues[key] = value;
      }
    });
    setValues(initialValues);
  }, [apiKeys]);

  const handleInputChange = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));

    // Clear error when user starts typing
    if (errors[key]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }

    // Validate on change
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

    const providerConfig = PROVIDER_CONFIGS[opType].find(p => p.id === provider);
    if (!providerConfig?.modelField) return null;

    // Check local values first (unsaved changes), then fall back to apiKeys
    return values[providerConfig.modelField] || (apiKeys as any)?.[providerConfig.modelField];
  };

  // Render current selection summary
  const renderCurrentSelection = (opType: OperationType) => {
    const info = OPERATION_INFO[opType];
    const currentProvider = getCurrentProvider(opType);
    const currentModel = getCurrentModel(opType);

    const providerConfig = currentProvider
      ? PROVIDER_CONFIGS[opType].find(p => p.id === currentProvider)
      : null;

    return (
      <div className={`p-4 rounded-lg border-2 ${
        currentProvider
          ? `border-${providerConfig?.color || 'gray'}-500 bg-${providerConfig?.color || 'gray'}-500/10`
          : 'border-gray-700 bg-gray-800/50'
      } transition-all`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{info.icon}</span>
            <div>
              <h4 className="font-semibold">{info.label}</h4>
              <p className="text-xs text-muted-foreground">{info.description}</p>
            </div>
          </div>
          {currentProvider ? (
            <Badge className={`bg-${providerConfig?.color || 'gray'}-500 text-white`}>
              {providerConfig?.icon} {providerConfig?.name}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-gray-500">Not configured</Badge>
          )}
        </div>

        {currentProvider && providerConfig?.modelField && (
          <div className="mt-3 pt-3 border-t border-gray-700">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Current Model:</span>
              <span className="font-mono text-xs bg-black/30 px-2 py-1 rounded">
                {currentModel || 'Default'}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render provider selection card
  const renderProviderCard = (opType: OperationType, provider: ProviderConfig) => {
    const currentProvider = getCurrentProvider(opType);
    const isSelected = currentProvider === provider.id;
    const hasKeyConfigured = provider.apiKeyField && hasApiKey(provider.apiKeyField);
    const [isSwitching, setIsSwitching] = useState(false);

    // Get KIE model options if this is a KIE provider
    let modelOptions = provider.modelOptions;
    if (provider.id === 'kie' && provider.modelField) {
      const modelType = provider.modelField.replace('kie', '').toLowerCase().replace('model', '') as keyof typeof kieModels;
      if (modelType && kieModels[modelType]) {
        modelOptions = kieModels[modelType].map((m: any) => ({
          value: m.modelId,
          label: m.name,
        }));
      }
    }

    const handleSelectProvider = async () => {
      if (isSwitching || isSelected) return;

      setIsSwitching(true);
      const providerField = `${opType}Provider` as string;

      try {
        // Update local state immediately for visual feedback
        setValues((prev) => ({ ...prev, [providerField]: provider.id }));

        // Save to database immediately
        const success = await updateMultipleKeys({ [providerField]: provider.id });

        if (!success) {
          toast.error('Failed to switch provider');
          // Revert local state if save failed
          setValues((prev) => ({ ...prev, [providerField]: currentProvider || '' }));
        } else {
          toast.success(`Switched to ${provider.name}`);
        }
      } catch (error) {
        console.error('Failed to switch provider:', error);
        toast.error('Failed to switch provider');
        // Revert local state on error
        setValues((prev) => ({ ...prev, [providerField]: currentProvider || '' }));
      } finally {
        setIsSwitching(false);
      }
    };

    return (
      <div
        key={provider.id}
        onClick={handleSelectProvider}
        className={`p-4 rounded-lg border-2 transition-all ${
          isSwitching ? 'opacity-50 pointer-events-none' : 'cursor-pointer'
        } ${
          isSelected
            ? `border-${provider.color}-500 bg-${provider.color}-500/10 shadow-lg shadow-${provider.color}-500/20`
            : 'border-gray-700 hover:border-gray-600 bg-gray-800/30 hover:bg-gray-800/50'
        }`}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{provider.icon}</span>
            <div>
              <h4 className="font-semibold flex items-center gap-2">
                {provider.name}
                {isSwitching && <Loader2 className="w-4 h-4 animate-spin" />}
              </h4>
              {isSelected && (
                <Badge className={`bg-${provider.color}-500 text-white mt-1`}>
                  <Check className="w-3 h-3 mr-1" />
                  Active
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isSwitching ? (
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            ) : isSelected ? (
              <Check className="w-5 h-5 text-green-500" />
            ) : (
              <>
                {hasKeyConfigured && <Check className="w-5 h-5 text-green-500" />}
                <div className={`w-5 h-5 rounded-full border-2 border-${provider.color}-500 flex items-center justify-center`}>
                  <div className="w-2 h-2 rounded-full bg-transparent" />
                </div>
              </>
            )}
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-3">{provider.description}</p>

        {provider.apiKeyField && (
          <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <Label className="text-xs">{API_KEY_FIELDS[provider.apiKeyField]?.label}</Label>
              {API_KEY_FIELDS[provider.apiKeyField]?.helpLink && (
                <a
                  href={API_KEY_FIELDS[provider.apiKeyField].helpLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:underline flex items-center gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  Get Key <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            <Input
              type="password"
              placeholder={API_KEY_FIELDS[provider.apiKeyField]?.placeholder}
              value={values[provider.apiKeyField] || ''}
              onChange={(e) => handleInputChange(provider.apiKeyField, e.target.value)}
              className={`bg-gray-900/50 ${
                errors[provider.apiKeyField] ? 'border-red-500' : `border-${isSelected ? provider.color : 'gray'}-700`
              }`}
            />
          </div>
        )}

        {provider.modelField && API_KEY_FIELDS[provider.modelField] && (
          <div className="space-y-2 mt-3" onClick={(e) => e.stopPropagation()}>
            <Label className="text-xs">{API_KEY_FIELDS[provider.modelField]?.label}</Label>
            {modelOptions && modelOptions.length > 0 ? (
              <Combobox
                options={modelOptions}
                value={values[provider.modelField] || ''}
                onChange={(value) => handleInputChange(provider.modelField, value)}
                placeholder={API_KEY_FIELDS[provider.modelField]?.placeholder}
                loading={loadingKieModels && provider.id === 'kie'}
                className={errors[provider.modelField] ? 'border-red-500' : ''}
              />
            ) : (
              <Input
                placeholder={API_KEY_FIELDS[provider.modelField]?.placeholder}
                value={values[provider.modelField] || ''}
                onChange={(e) => handleInputChange(provider.modelField, e.target.value)}
                className={`bg-gray-900/50 ${
                  errors[provider.modelField] ? 'border-red-500' : `border-${isSelected ? provider.color : 'gray'}-700`
                }`}
              />
            )}
          </div>
        )}
      </div>
    );
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
              ? `You need to configure ${missingKeys.length === 1 ? 'this API key' : 'these API keys'} to continue.`
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
                  <div key={opType}>{renderCurrentSelection(opType)}</div>
                ))}
              </div>
            </TabsContent>

            {(Object.keys(OPERATION_INFO) as OperationType[]).map((opType) => {
              const info = OPERATION_INFO[opType];
              const providers = PROVIDER_CONFIGS[opType];

              return (
                <TabsContent key={opType} value={opType} className="mt-6">
                  <div className="space-y-4">
                    {/* Current Selection */}
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                        <span>{info.icon}</span>
                        Current Selection: {info.label}
                      </h3>
                      {renderCurrentSelection(opType)}
                    </div>

                    {/* Provider Selection */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Available Providers</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {providers.map((provider) => renderProviderCard(opType, provider))}
                      </div>
                    </div>
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        </div>

        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-700">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Info className="w-4 h-4" />
            <span>API keys are stored securely and never shared</span>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Configuration
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
