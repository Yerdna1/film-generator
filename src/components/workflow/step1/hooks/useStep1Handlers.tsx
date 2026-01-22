import { useCallback, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import type { ApiKeys } from '@prisma/client';
import type { UnifiedModelConfig } from '@/types/project';
import { getUserPermissions, checkRequiredApiKeys, shouldUseOwnApiKeys } from '@/lib/client/user-permissions';
import { storyPresets } from '../story-presets';
import type { Step1State } from './types';
import { PROVIDER_DEFAULT_MODELS } from '@/lib/constants/provider-model-defaults';

interface UseStep1HandlersProps extends Step1State {
  apiKeys?: ApiKeys | null;
  apiKeysContext?: {
    showApiKeyModal: (data: { operation: 'llm' | 'image' | 'video' | 'tts' | 'music'; missingKeys: string[]; onSuccess?: () => void }) => void;
  };
}

export function useStep1Handlers(props: UseStep1HandlersProps) {
  const { toast } = useToast();

  // Confirmation dialog state
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [confirmDialogData, setConfirmDialogData] = useState<{
    provider: string;
    model: string;
    estimatedTokens?: number;
  }>({ provider: '', model: '' });
  const {
    project,
    store,
    isPremiumUser,
    effectiveIsPremium,
    isAdmin,
    isGenerating,
    setIsGenerating,
    storyModel,
    aspectRatio,
    videoLanguage,
    imageProvider,
    voiceProvider,
    styleModel,
    editedPrompt,
    setEditedPrompt,
    setIsEditing,
    setSelectedPresetId,
    setGeneratingModel,
    setGeneratingProvider,
  } = props;

  const doGeneratePrompt = useCallback(async () => {
    setIsGenerating(true);
    setIsConfirmDialogOpen(false);

    // Get current settings from project (they should already be synced via useEffect)
    // Define outside try block for fallback access in catch
    const currentSettings: import('@/types/project').ProjectSettings = {
      aspectRatio,
      resolution: (styleModel === 'flux' ? '4k' : 'hd') as 'hd' | '4k',
      voiceLanguage: videoLanguage as 'sk' | 'en',
      sceneCount: (project.settings?.sceneCount || 12) as 12 | 24 | 36 | 48 | 60 | 120 | 240 | 360,
      characterCount: project.settings?.characterCount || 3,
      imageResolution: (styleModel === 'flux' ? '4k' : '2k') as '1k' | '2k' | '4k',
      voiceProvider,
      storyModel,
    };

    try {
      // Small delay to ensure all settings are saved
      await new Promise(resolve => setTimeout(resolve, 100));

      // Use the model from the unified model configuration if available
      const modelConfig = project.modelConfig;

      // Get provider first to determine appropriate fallback
      let providerToUse = modelConfig?.llm?.provider;

      // Determine model to use with provider-aware fallback
      let modelToUse = modelConfig?.llm?.model;
      if (!modelToUse && effectiveIsPremium) {
        // Use provider-specific default instead of hardcoded OpenRouter model
        if (storyModel === 'gpt-4') {
          modelToUse = 'openai/gpt-4-turbo';
          providerToUse = providerToUse || 'openrouter';
        } else if (storyModel === 'claude-sonnet-4.5') {
          modelToUse = 'anthropic/claude-sonnet-4.5';
          providerToUse = providerToUse || 'openrouter';
        } else if (providerToUse && PROVIDER_DEFAULT_MODELS[providerToUse]) {
          // Use provider-specific default model
          modelToUse = PROVIDER_DEFAULT_MODELS[providerToUse];
        } else {
          // Final fallback to current OpenRouter default
          modelToUse = 'anthropic/claude-4.5-sonnet';
          providerToUse = 'openrouter';
        }
      }

      // Extract provider from model or use modelConfig provider
      if (modelToUse && modelToUse.includes('/')) {
        const [providerFromModel] = modelToUse.split('/');
        if (providerFromModel === 'anthropic' || providerFromModel === 'openai' || providerFromModel === 'google' || providerFromModel === 'meta' || providerFromModel === 'deepseek') {
          providerToUse = providerToUse || 'openrouter';
        }
      } else if (!providerToUse) {
        // Default to openrouter if no provider set and no model specific provider derivation
        providerToUse = 'openrouter';
      }

      // Check user permissions and API keys
      try {
        const permissions = await getUserPermissions();

        // Check if user should use own API keys
        const useOwnKeys = await shouldUseOwnApiKeys('llm');

        if (useOwnKeys || permissions.requiresApiKeys) {
          // Check if user has required API keys
          const keyCheck = await checkRequiredApiKeys('llm');

          if (!keyCheck.hasKeys) {
            // Show API key modal
            const { apiKeysContext } = props;
            if (apiKeysContext?.showApiKeyModal) {
              apiKeysContext.showApiKeyModal({
                operation: 'llm',
                missingKeys: keyCheck.missing,
                onSuccess: () => {
                  // Retry generation after keys are saved
                  handleGeneratePrompt();
                }
              });
            } else {
              // Fallback to toast if context not available
              toast({
                title: "API Key Required",
                description: "Please configure your API keys to continue.",
                variant: "destructive",
              });
            }

            setIsGenerating(false);
            setGeneratingModel(undefined);
            setGeneratingProvider(undefined);
            return;
          }
        }
      } catch (error) {
        console.error('Error checking user permissions:', error);
      }

      // Set the model and provider for display in loading modal
      setGeneratingModel(modelToUse);
      setGeneratingProvider(providerToUse);

      // Try to enhance with user's configured LLM provider
      const response = await fetch('/api/llm/prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(modelToUse && { model: modelToUse }), // Pass model for premium users
          prompt: `Generate a complete master prompt for a ${currentSettings.sceneCount}-scene animated short film based on the following details:

Story Title: ${project.story.title}
Genre: ${project.story.genre}
Tone: ${project.story.tone}
Setting: ${project.story.setting}
Concept: ${project.story.concept}
Visual Style: ${project.style}

Technical Settings:
- Aspect Ratio: ${modelConfig?.image?.sceneAspectRatio || aspectRatio}
- Video Language: ${modelConfig?.tts?.defaultLanguage || videoLanguage}
- LLM Model: ${modelConfig?.llm?.model || storyModel}
- Image Provider: ${modelConfig?.image?.provider || imageProvider}
- Voice Provider: ${modelConfig?.tts?.provider || voiceProvider}
- Characters: ${currentSettings.characterCount}
- Scenes: ${currentSettings.sceneCount}

Please generate a comprehensive master prompt that includes:
1. Detailed character descriptions with visual appearance, personality, and motivations
2. Scene breakdown with specific camera shots and compositions
3. Text-to-Image prompts for each character and scene
4. Image-to-Video prompts describing movements and actions
5. Sample dialogue for each scene

Format the output with clear CHARACTER: and SCENE: sections.`,
          systemPrompt: 'You are a professional film prompt engineer specializing in creating detailed prompts for animated films.',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.text) {
          store.setMasterPrompt(project.id, data.text);
          setEditedPrompt(data.text);
          // Dispatch credits update event
          window.dispatchEvent(new CustomEvent('credits-updated'));
          setIsGenerating(false);
          setGeneratingModel(undefined);
          setGeneratingProvider(undefined);

          // Show success toast and auto-advance to Step 2
          toast({
            title: "Step 1 Complete! 🎉",
            description: `Master prompt generated via ${data.provider}. ${data.creditsUsed} credits used. Moving to Step 2...`,
          });

          // Auto-advance to Step 2 after a short delay
          setTimeout(() => {
            store.nextStep(project.id);
          }, 1500);

          console.log(`Master prompt enhanced via ${data.provider}, ${data.creditsUsed} credits used`);
          return;
        } else {
          // Response was ok but no text returned
          setIsGenerating(false);
          setGeneratingModel(undefined);
          setGeneratingProvider(undefined);
          toast({
            title: "Generation Failed",
            description: "Server returned an empty response. Please try again.",
            variant: "destructive",
          });
          return;
        }
      }

      // Show insufficient credits error
      if (response.status === 402) {
        const errorData = await response.json();
        setIsGenerating(false);
        setGeneratingModel(undefined);
        setGeneratingProvider(undefined);

        toast({
          title: "Insufficient Credits",
          description: errorData.error || "You don't have enough credits to generate the master prompt. Please upgrade your plan.",
          variant: "destructive",
        });
        return;
      }

      // Show error for failed API calls with detailed error message
      if (!response.ok) {
        let errorMessage = "Failed to generate the master prompt. Please try again.";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If parsing fails, use default message
        }
        setIsGenerating(false);
        setGeneratingModel(undefined);
        setGeneratingProvider(undefined);

        toast({
          title: "Generation Failed",
          description: errorMessage,
          variant: "destructive",
        });
        return;
      }
    } catch (error) {
      console.error('Error generating prompt:', error);
      setIsGenerating(false);
      setGeneratingModel(undefined);
      setGeneratingProvider(undefined);

      // Show error toast
      toast({
        title: "Generation Error",
        description: error instanceof Error ? error.message : "An error occurred while generating the master prompt. Please try again.",
        variant: "destructive",
      });
    }

    setIsGenerating(false);
    setGeneratingModel(undefined);
    setGeneratingProvider(undefined);
  }, [
    isPremiumUser,
    aspectRatio,
    videoLanguage,
    storyModel,
    imageProvider,
    voiceProvider,
    styleModel,
    project,
    store,
    setEditedPrompt,
  ]);

  const handleGeneratePrompt = useCallback(async () => {
    console.log('[Step1] handleGeneratePrompt called');

    // Get current settings from project
    const currentSettings: import('@/types/project').ProjectSettings = {
      aspectRatio,
      resolution: (styleModel === 'flux' ? '4k' : 'hd') as 'hd' | '4k',
      voiceLanguage: videoLanguage as 'sk' | 'en',
      sceneCount: (project.settings?.sceneCount || 12) as 12 | 24 | 36 | 48 | 60 | 120 | 240 | 360,
      characterCount: project.settings?.characterCount || 3,
      imageResolution: (styleModel === 'flux' ? '4k' : '2k') as '1k' | '2k' | '4k',
      voiceProvider,
      storyModel,
    };

    try {
      // Use the model from the unified model configuration if available
      const modelConfig = project.modelConfig;

      // Get provider first to determine appropriate fallback
      let providerToUse = modelConfig?.llm?.provider;

      // Determine model to use with provider-aware fallback
      let modelToUse = modelConfig?.llm?.model;
      if (!modelToUse && effectiveIsPremium) {
        // Use provider-specific default instead of hardcoded OpenRouter model
        if (storyModel === 'gpt-4') {
          modelToUse = 'openai/gpt-4-turbo';
          providerToUse = providerToUse || 'openrouter';
        } else if (storyModel === 'claude-sonnet-4.5') {
          modelToUse = 'anthropic/claude-sonnet-4.5';
          providerToUse = providerToUse || 'openrouter';
        } else if (providerToUse && PROVIDER_DEFAULT_MODELS[providerToUse]) {
          // Use provider-specific default model
          modelToUse = PROVIDER_DEFAULT_MODELS[providerToUse];
        } else {
          // Final fallback to current OpenRouter default
          modelToUse = 'anthropic/claude-4.5-sonnet';
          providerToUse = 'openrouter';
        }
      }

      // Extract provider from model or use modelConfig provider
      if (modelToUse && modelToUse.includes('/')) {
        const [providerFromModel] = modelToUse.split('/');
        if (providerFromModel === 'anthropic' || providerFromModel === 'openai' || providerFromModel === 'google' || providerFromModel === 'meta' || providerFromModel === 'deepseek') {
          providerToUse = providerToUse || 'openrouter';
        }
      } else if (!providerToUse) {
        // Default to openrouter if no provider set and no model specific provider derivation
        providerToUse = 'openrouter';
      }

      // Check user permissions and API keys
      const permissions = await getUserPermissions();

      // Check if user should use own API keys
      const useOwnKeys = await shouldUseOwnApiKeys('llm');

      if (useOwnKeys || permissions.requiresApiKeys) {
        // Check if user has required API keys
        const keyCheck = await checkRequiredApiKeys('llm');

        if (!keyCheck.hasKeys) {
          // Show API key modal
          const { apiKeysContext } = props;
          if (apiKeysContext?.showApiKeyModal) {
            apiKeysContext.showApiKeyModal({
              operation: 'llm',
              missingKeys: keyCheck.missing,
              onSuccess: () => {
                // Retry generation after keys are saved
                handleGeneratePrompt();
              }
            });
          } else {
            // Fallback to toast if context not available
            toast({
              title: "API Key Required",
              description: "Please configure your API keys to continue.",
              variant: "destructive",
            });
          }
          return;
        }
      }

      // Show confirmation dialog
      setConfirmDialogData({
        provider: providerToUse || 'openrouter',
        model: modelToUse || 'anthropic/claude-4.5-sonnet',
        estimatedTokens: currentSettings.sceneCount * 100, // Rough estimate
      });
      setIsConfirmDialogOpen(true);
    } catch (error) {
      console.error('Error preparing prompt generation:', error);
      toast({
        title: "Error",
        description: "Failed to prepare prompt generation. Please try again.",
        variant: "destructive",
      });
    }
  }, [
    aspectRatio,
    videoLanguage,
    storyModel,
    styleModel,
    voiceProvider,
    project,
    effectiveIsPremium,
    props,
    toast,
  ]);

  const handleSaveEditedPrompt = useCallback(() => {
    store.setMasterPrompt(project.id, editedPrompt);
    setIsEditing(false);
  }, [store, project.id, editedPrompt, setIsEditing]);

  const handleApplyPreset = useCallback(async (preset: typeof storyPresets[0]) => {
    setSelectedPresetId(preset.id);
    store.updateStory(project.id, preset.story);

    // Sync project name with story title and style
    store.updateProject(project.id, {
      name: preset.story.title,
      style: preset.style
    });
  }, [store, project.id, setSelectedPresetId]);

  const handleModelConfigChange = useCallback((modelConfig: UnifiedModelConfig) => {
    store.updateModelConfig(project.id, modelConfig);
  }, [store, project.id]);

  // Modal-related functions removed - all configuration is now in the left panel

  return {
    handleGeneratePrompt,
    handleSaveEditedPrompt,
    handleApplyPreset,
    handleModelConfigChange,
    // Dialog state
    isConfirmDialogOpen,
    setIsConfirmDialogOpen,
    confirmDialogData,
    doGeneratePrompt,
  };
}
