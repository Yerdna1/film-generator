'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import {
  Wand2,
  Sparkles,
  Copy,
  Check,
  RefreshCw,
  ChevronDown,
  Edit3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useProjectStore } from '@/lib/stores/project-store';
import { generateMasterPrompt } from '@/lib/prompts/master-prompt';
import { CopyButton } from '@/components/shared/CopyButton';
import type { Project } from '@/types/project';

interface Step1Props {
  project: Project;
}

const genres = [
  'adventure', 'comedy', 'drama', 'fantasy', 'scifi',
  'horror', 'romance', 'action', 'mystery', 'family',
];

const tones = [
  'heartfelt', 'comedic', 'dramatic', 'suspenseful',
  'inspiring', 'dark', 'lighthearted', 'emotional',
];

export function Step1PromptGenerator({ project: initialProject }: Step1Props) {
  const t = useTranslations();
  const { updateStory, setMasterPrompt, projects } = useProjectStore();

  // Get live project data from store
  const project = projects.find(p => p.id === initialProject.id) || initialProject;

  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState(project.masterPrompt || '');

  // Sync editedPrompt when masterPrompt changes
  useEffect(() => {
    if (project.masterPrompt) {
      setEditedPrompt(project.masterPrompt);
    }
  }, [project.masterPrompt]);

  const handleGeneratePrompt = async () => {
    setIsGenerating(true);

    try {
      // Generate the base master prompt template
      const basePrompt = generateMasterPrompt(project.story, project.style, project.settings);

      // Try to enhance with user's configured LLM provider
      const response = await fetch('/api/llm/prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Based on the following story concept and settings, enhance and expand this prompt for generating a ${project.settings.sceneCount}-scene animated short film.

Story Title: ${project.story.title}
Genre: ${project.story.genre}
Tone: ${project.story.tone}
Setting: ${project.story.setting}
Concept: ${project.story.concept}
Visual Style: ${project.style}
Characters: ${project.settings.characterCount}
Scenes: ${project.settings.sceneCount}

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
          setMasterPrompt(project.id, data.text);
          setEditedPrompt(data.text);
          // Dispatch credits update event
          window.dispatchEvent(new CustomEvent('credits-updated'));
          setIsGenerating(false);
          console.log(`Master prompt enhanced via ${data.provider}, ${data.creditsUsed} credits used`);
          return;
        }
      }

      // Check for insufficient credits error
      if (response.status === 402) {
        const errorData = await response.json();
        console.warn('Insufficient credits for AI enhancement:', errorData);
        // Fall back to local generation (free)
      }

      // Fallback to local generation if API fails or not enough credits
      console.warn('Using local generation (no credits deducted)');
      setMasterPrompt(project.id, basePrompt);
      setEditedPrompt(basePrompt);
    } catch (error) {
      console.error('Error generating prompt:', error);
      // Fallback to local generation
      const basePrompt = generateMasterPrompt(project.story, project.style, project.settings);
      setMasterPrompt(project.id, basePrompt);
      setEditedPrompt(basePrompt);
    }

    setIsGenerating(false);
  };

  const handleSaveEditedPrompt = () => {
    setMasterPrompt(project.id, editedPrompt);
    setIsEditing(false);
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 px-4">
      {/* Header */}
      <div className="text-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 mb-2"
        >
          <Wand2 className="w-6 h-6 text-purple-400" />
        </motion.div>
        <h2 className="text-xl font-bold mb-1">{t('steps.prompt.title')}</h2>
        <p className="text-sm text-muted-foreground">{t('steps.prompt.description')}</p>
      </div>

      {/* 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Column - Story Form */}
        <div className="glass rounded-xl p-4 space-y-4">
          <h3 className="text-sm font-semibold text-purple-400">Story Details</h3>

          <div className="grid grid-cols-2 gap-3">
            {/* Story Title */}
            <div className="space-y-1">
              <Label htmlFor="story-title" className="text-xs">{t('steps.prompt.storyTitle')}</Label>
              <Input
                id="story-title"
                placeholder={t('steps.prompt.storyTitlePlaceholder')}
                value={project.story.title}
                onChange={(e) => updateStory(project.id, { title: e.target.value })}
                className="h-9 glass border-white/10 focus:border-purple-500/50 text-sm"
              />
            </div>

            {/* Setting */}
            <div className="space-y-1">
              <Label htmlFor="setting" className="text-xs">{t('steps.prompt.setting')}</Label>
              <Input
                id="setting"
                placeholder={t('steps.prompt.settingPlaceholder')}
                value={project.story.setting}
                onChange={(e) => updateStory(project.id, { setting: e.target.value })}
                className="h-9 glass border-white/10 focus:border-purple-500/50 text-sm"
              />
            </div>

            {/* Genre */}
            <div className="space-y-1">
              <Label className="text-xs">{t('steps.prompt.genre')}</Label>
              <Select
                value={project.story.genre}
                onValueChange={(value) => updateStory(project.id, { genre: value })}
              >
                <SelectTrigger className="h-9 glass border-white/10 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass-strong border-white/10">
                  {genres.map((genre) => (
                    <SelectItem key={genre} value={genre}>
                      {t(`genres.${genre}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tone */}
            <div className="space-y-1">
              <Label className="text-xs">{t('steps.prompt.tone')}</Label>
              <Select
                value={project.story.tone}
                onValueChange={(value) => updateStory(project.id, { tone: value })}
              >
                <SelectTrigger className="h-9 glass border-white/10 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass-strong border-white/10">
                  {tones.map((tone) => (
                    <SelectItem key={tone} value={tone}>
                      {t(`tones.${tone}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Story Concept */}
          <div className="space-y-1">
            <Label htmlFor="concept" className="text-xs">{t('steps.prompt.concept')}</Label>
            <Textarea
              id="concept"
              placeholder={t('steps.prompt.conceptPlaceholder')}
              value={project.story.concept}
              onChange={(e) => updateStory(project.id, { concept: e.target.value })}
              className="min-h-[100px] glass border-white/10 focus:border-purple-500/50 resize-none text-sm"
            />
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGeneratePrompt}
            disabled={isGenerating || !project.story.title || !project.story.concept}
            className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white border-0 h-10"
          >
            {isGenerating ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                </motion.div>
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                {t('steps.prompt.generatePrompt')}
              </>
            )}
          </Button>

          {/* Tip */}
          <div className="glass rounded-lg p-3 border-l-4 border-cyan-500">
            <p className="text-xs text-muted-foreground">
              <strong className="text-cyan-400">Tip:</strong> Copy the generated prompt and paste it into ChatGPT or Gemini for detailed breakdowns.
            </p>
          </div>
        </div>

        {/* Right Column - Generated Prompt */}
        <div className="glass rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-purple-400" />
              {t('steps.prompt.masterPrompt')}
            </h3>
            {project.masterPrompt && (
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                  className="h-7 border-white/10 hover:bg-white/5 text-xs"
                >
                  <Edit3 className="w-3 h-3 mr-1" />
                  {isEditing ? 'Cancel' : 'Edit'}
                </Button>
                <CopyButton text={project.masterPrompt} size="icon" className="h-7 w-7" />
              </div>
            )}
          </div>

          {project.masterPrompt ? (
            isEditing ? (
              <div className="space-y-3">
                <Textarea
                  value={editedPrompt}
                  onChange={(e) => setEditedPrompt(e.target.value)}
                  className="min-h-[400px] glass border-white/10 focus:border-purple-500/50 font-mono text-xs"
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditedPrompt(project.masterPrompt || '');
                      setIsEditing(false);
                    }}
                    className="h-8 border-white/10"
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveEditedPrompt}
                    className="h-8 bg-gradient-to-r from-purple-600 to-cyan-600 text-white border-0"
                  >
                    {t('common.save')}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="glass rounded-lg p-3 max-h-[500px] overflow-y-auto">
                <pre className="whitespace-pre-wrap text-xs text-muted-foreground font-mono leading-relaxed">
                  {project.masterPrompt}
                </pre>
              </div>
            )
          ) : (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground/50">
              <div className="text-center">
                <Wand2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Fill in the story details and click Generate</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
