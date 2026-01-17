import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useProjectStore } from '@/lib/stores/project-store';
import { generateMasterPrompt } from '@/lib/prompts/master-prompt';
import type { Project } from '@/types/project';

interface UsePromptGenerationOptions {
  project: Project;
  isPremiumUser: boolean;
  onApiKeyRequired?: () => void;
  userApiKeys?: {
    hasOpenRouterKey: boolean;
    openRouterModel: string;
    llmProvider: string;
  } | null;
}

export function usePromptGeneration({
  project,
  isPremiumUser,
  onApiKeyRequired,
  userApiKeys,
}: UsePromptGenerationOptions) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState(project.masterPrompt || '');
  const { setMasterPrompt, nextStep } = useProjectStore();
  const { toast } = useToast();

  const handleGeneratePrompt = useCallback(
    async (skipApiKeyCheck = false) => {
      // Check if user has OpenRouter API key configured (unless skipped)
      if (!skipApiKeyCheck) {
        const needsApiKey = !userApiKeys?.hasOpenRouterKey && userApiKeys?.llmProvider === 'openrouter';

        if (needsApiKey) {
          onApiKeyRequired?.();
          return;
        }
      }

      setIsGenerating(true);

      // Generate base prompt
      const basePrompt = generateMasterPrompt(project.story, project.style, project.settings);

      try {
        // Small delay to ensure all settings are saved
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Use the model from the unified model configuration if available
        const modelConfig = project.modelConfig;
        const modelToUse = modelConfig?.llm?.model ||
          (isPremiumUser ? getDefaultModelForStory(project.settings.storyModel) : undefined);

        // Try to enhance with user's configured LLM provider
        const response = await fetch('/api/llm/prompt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...(modelToUse && { model: modelToUse }),
            prompt: buildPromptEnhancementRequest(project, modelConfig, basePrompt),
            systemPrompt: 'You are a professional film prompt engineer specializing in creating detailed prompts for animated films.',
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.text) {
            setMasterPrompt(project.id, data.text);
            setEditedPrompt(data.text);

            // Dispatch credits update event
            window.dispatchEvent(new CustomEvent('credits-updated'));

            // Show success toast and auto-advance to Step 2
            toast({
              title: "Step 1 Complete! 🎉",
              description: `Master prompt generated via ${data.provider}. ${data.creditsUsed} credits used. Moving to Step 2...`,
            });

            // Auto-advance to Step 2 after a short delay
            setTimeout(() => {
              nextStep(project.id);
            }, 1500);

            console.log(`Master prompt enhanced via ${data.provider}, ${data.creditsUsed} credits used`);
          } else {
            throw new Error('No text in response');
          }
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errorData.error || `API error: ${response.status}`);
        }
      } catch (error) {
        console.error('Error generating prompt:', error);

        // Fallback to base prompt
        setMasterPrompt(project.id, basePrompt);
        setEditedPrompt(basePrompt);

        toast({
          title: "Using base prompt",
          description: "Could not enhance prompt with AI. Using template-based prompt instead.",
          variant: "default",
        });

        setIsGenerating(false);

        // Still advance to next step with base prompt
        setTimeout(() => {
          nextStep(project.id);
        }, 1500);
      }

      setIsGenerating(false);
    },
    [project, isPremiumUser, userApiKeys, onApiKeyRequired, setMasterPrompt, nextStep, toast]
  );

  const handleSaveEditedPrompt = useCallback(() => {
    setMasterPrompt(project.id, editedPrompt);
  }, [project.id, editedPrompt, setMasterPrompt]);

  return {
    isGenerating,
    editedPrompt,
    setEditedPrompt,
    handleGeneratePrompt,
    handleSaveEditedPrompt,
  };
}

// Helper functions
function getDefaultModelForStory(storyModel?: string): string {
  const mapping: Record<string, string> = {
    'gpt-4': 'openai/gpt-4-turbo',
    'claude-sonnet-4.5': 'anthropic/claude-sonnet-4.5',
    'gemini-3-pro': 'google/gemini-2.0-flash-exp:free',
  };
  return mapping[storyModel || 'gemini-3-pro'] || 'google/gemini-2.0-flash-exp:free';
}

function buildPromptEnhancementRequest(project: Project, modelConfig: any, basePrompt: string): string {
  const settings = project.settings;

  return `Based on the following story concept and settings, enhance and expand this prompt for generating a ${settings.sceneCount}-scene animated short film.

Story Title: ${project.story.title}
Genre: ${project.story.genre}
Tone: ${project.story.tone}
Setting: ${project.story.setting}
Concept: ${project.story.concept}
Visual Style: ${project.style}

Technical Settings:
- Aspect Ratio: ${modelConfig?.image?.sceneAspectRatio || settings.aspectRatio}
- Video Language: ${modelConfig?.tts?.defaultLanguage || settings.voiceLanguage}
- LLM Model: ${modelConfig?.llm?.model || settings.storyModel}
- Image Provider: ${modelConfig?.image?.provider || 'gemini'}
- Voice Provider: ${modelConfig?.tts?.provider || settings.voiceProvider}
- Characters: ${settings.characterCount}
- Scenes: ${settings.sceneCount}

Base prompt template:
${basePrompt}

Please enhance this prompt with:
1. More detailed character descriptions (visual appearance, personality, motivations)
2. Scene breakdown with specific camera shots and compositions
3. Text-to-Image prompts for each character and scene
4. Image-to-Video prompts describing movements and actions
5. Sample dialogue for each scene

Format the output exactly like the base template but with richer, more detailed content. Keep the same structure with CHARACTER: and SCENE: sections.`;
}