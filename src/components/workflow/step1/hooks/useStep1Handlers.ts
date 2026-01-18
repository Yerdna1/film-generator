import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { generateMasterPrompt } from '@/lib/prompts/master-prompt';
import type { UnifiedModelConfig } from '@/types/project';
import { storyPresets } from '../story-presets';
import type { Step1State } from './types';

interface UseStep1HandlersProps extends Step1State {}

export function useStep1Handlers(props: UseStep1HandlersProps) {
  const { toast } = useToast();
  const {
    project,
    store,
    effectiveIsPremium,
    isModelConfigModalOpen,
    setIsModelConfigModalOpen,
    pendingGenerateAction,
    setPendingGenerateAction,
    hasShownModelConfig,
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
  } = props;

  const handleGeneratePrompt = useCallback(async (skipModelConfigCheck = false) => {
    // Show model config modal only for free users if not shown yet for this project (unless skipped)
    // Admins and premium users skip this modal
    const isFreeUser = !effectiveIsPremium;
    if (!skipModelConfigCheck && isFreeUser && !hasShownModelConfig) {
      setIsModelConfigModalOpen(true);
      // Store the actual generation action to be called after modal closes
      setPendingGenerateAction(() => () => handleGeneratePrompt(true));
      return;
    }

    setIsGenerating(true);

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

    // Generate the base master prompt template with current settings
    const projectWithCurrentSettings = {
      ...project,
      settings: currentSettings
    };

    // Generate base prompt outside try block so it's available in catch block for fallback
    const basePrompt = generateMasterPrompt(projectWithCurrentSettings.story, projectWithCurrentSettings.style, projectWithCurrentSettings.settings);

    try {
      // Small delay to ensure all settings are saved
      await new Promise(resolve => setTimeout(resolve, 100));

      // Use the model from the unified model configuration if available
      const modelConfig = project.modelConfig;
      const modelToUse = modelConfig?.llm?.model || (effectiveIsPremium ?
        storyModel === 'gpt-4' ? 'openai/gpt-4-turbo' :
        storyModel === 'claude-sonnet-4.5' ? 'anthropic/claude-sonnet-4.5' :
        'google/gemini-2.0-flash-exp:free' : undefined);

      // Try to enhance with user's configured LLM provider
      const response = await fetch('/api/llm/prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(modelToUse && { model: modelToUse }), // Pass model for premium users
          prompt: `Based on the following story concept and settings, enhance and expand this prompt for generating a ${currentSettings.sceneCount}-scene animated short film.

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

Base prompt template:
${basePrompt}

Please enhance this prompt with:
1. More detailed character descriptions (visual appearance, personality, motivations)
2. Scene breakdown with specific camera shots and compositions
3. Text-to-Image prompts for each character and scene
4. Image-to-Video prompts describing movements and actions
5. Sample dialogue for each scene

Format the output exactly like the base template but with richer, more detailed content. Keep the same structure with CHARACTER: and SCENE: sections.`,
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
        }
      }

      // Check for insufficient credits error
      if (response.status === 402) {
        const errorData = await response.json();
        console.warn('Insufficient credits for AI enhancement:', errorData);

        // Show warning toast
        toast({
          title: "Insufficient Credits",
          description: "Using local generation instead. Upgrade your plan for AI enhancement.",
          variant: "destructive",
        });

        // Fall back to local generation (free)
      }

      // Fallback to local generation if API fails or not enough credits
      console.warn('Using local generation (no credits deducted)');
      store.setMasterPrompt(project.id, basePrompt);
      setEditedPrompt(basePrompt);

      // Show fallback toast and auto-advance
      toast({
        title: "Step 1 Complete! 🎉",
        description: "Base prompt created. Moving to Step 2...",
      });

      // Auto-advance to Step 2 after a short delay
      setTimeout(() => {
        store.nextStep(project.id);
      }, 1500);
    } catch (error) {
      console.error('Error generating prompt:', error);
      // Fallback to local generation with current settings (reuse basePrompt)
      store.setMasterPrompt(project.id, basePrompt);
      setEditedPrompt(basePrompt);

      // Show error toast and still auto-advance
      toast({
        title: "Step 1 Complete (Fallback)",
        description: "Using local generation. Moving to Step 2...",
        variant: "destructive",
      });

      // Auto-advance to Step 2 after a short delay
      setTimeout(() => {
        store.nextStep(project.id);
      }, 1500);
    }

    setIsGenerating(false);
  }, [
    effectiveIsPremium,
    hasShownModelConfig,
    setIsModelConfigModalOpen,
    setPendingGenerateAction,
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

    // Auto-generate the master prompt
    await handleGeneratePrompt();
  }, [store, project.id, handleGeneratePrompt, setSelectedPresetId]);

  const handleModelConfigChange = useCallback((modelConfig: UnifiedModelConfig) => {
    store.updateModelConfig(project.id, modelConfig);
  }, [store, project.id]);

  const handleCloseModelConfigModal = useCallback(() => {
    setIsModelConfigModalOpen(false);
    // Mark as shown for this project
    localStorage.setItem(`model-config-shown-${project.id}`, 'true');
    // Execute the pending generation action if exists
    if (pendingGenerateAction) {
      pendingGenerateAction();
      setPendingGenerateAction(null);
    }
  }, [project.id, setIsModelConfigModalOpen, pendingGenerateAction, setPendingGenerateAction]);

  return {
    handleGeneratePrompt,
    handleSaveEditedPrompt,
    handleApplyPreset,
    handleModelConfigChange,
    handleCloseModelConfigModal,
  };
}
