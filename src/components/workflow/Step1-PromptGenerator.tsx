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

      // Try to enhance with Gemini AI
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `You are a professional film prompt engineer. Based on the following story concept and settings, enhance and expand this prompt for generating a ${project.settings.sceneCount}-scene animated short film.

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
          model: 'gemini-1.5-pro',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.text) {
          setMasterPrompt(project.id, data.text);
          setEditedPrompt(data.text);
          setIsGenerating(false);
          return;
        }
      }

      // Fallback to local generation if API fails
      console.warn('Gemini API not available, using local generation');
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
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 mb-4"
        >
          <Wand2 className="w-8 h-8 text-purple-400" />
        </motion.div>
        <h2 className="text-2xl font-bold mb-2">{t('steps.prompt.title')}</h2>
        <p className="text-muted-foreground">{t('steps.prompt.description')}</p>
      </div>

      {/* Story Form */}
      <div className="glass rounded-2xl p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Story Title */}
          <div className="space-y-2">
            <Label htmlFor="story-title">{t('steps.prompt.storyTitle')}</Label>
            <Input
              id="story-title"
              placeholder={t('steps.prompt.storyTitlePlaceholder')}
              value={project.story.title}
              onChange={(e) => updateStory(project.id, { title: e.target.value })}
              className="h-11 glass border-white/10 focus:border-purple-500/50"
            />
          </div>

          {/* Setting */}
          <div className="space-y-2">
            <Label htmlFor="setting">{t('steps.prompt.setting')}</Label>
            <Input
              id="setting"
              placeholder={t('steps.prompt.settingPlaceholder')}
              value={project.story.setting}
              onChange={(e) => updateStory(project.id, { setting: e.target.value })}
              className="h-11 glass border-white/10 focus:border-purple-500/50"
            />
          </div>

          {/* Genre */}
          <div className="space-y-2">
            <Label>{t('steps.prompt.genre')}</Label>
            <Select
              value={project.story.genre}
              onValueChange={(value) => updateStory(project.id, { genre: value })}
            >
              <SelectTrigger className="h-11 glass border-white/10">
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
          <div className="space-y-2">
            <Label>{t('steps.prompt.tone')}</Label>
            <Select
              value={project.story.tone}
              onValueChange={(value) => updateStory(project.id, { tone: value })}
            >
              <SelectTrigger className="h-11 glass border-white/10">
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
        <div className="space-y-2">
          <Label htmlFor="concept">{t('steps.prompt.concept')}</Label>
          <Textarea
            id="concept"
            placeholder={t('steps.prompt.conceptPlaceholder')}
            value={project.story.concept}
            onChange={(e) => updateStory(project.id, { concept: e.target.value })}
            className="min-h-[120px] glass border-white/10 focus:border-purple-500/50 resize-none"
          />
        </div>

        {/* Generate Button */}
        <div className="flex justify-center pt-4">
          <Button
            onClick={handleGeneratePrompt}
            disabled={isGenerating || !project.story.title || !project.story.concept}
            className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white border-0 h-12 px-8"
          >
            {isGenerating ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <RefreshCw className="w-5 h-5 mr-2" />
                </motion.div>
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                {t('steps.prompt.generatePrompt')}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Generated Prompt */}
      {project.masterPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-purple-400" />
              {t('steps.prompt.masterPrompt')}
            </h3>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
                className="border-white/10 hover:bg-white/5"
              >
                <Edit3 className="w-4 h-4 mr-2" />
                {t('steps.prompt.editPrompt')}
              </Button>
              <CopyButton text={project.masterPrompt} />
            </div>
          </div>

          <div className="glass rounded-xl p-6">
            {isEditing ? (
              <div className="space-y-4">
                <Textarea
                  value={editedPrompt}
                  onChange={(e) => setEditedPrompt(e.target.value)}
                  className="min-h-[300px] glass border-white/10 focus:border-purple-500/50 font-mono text-sm"
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditedPrompt(project.masterPrompt || '');
                      setIsEditing(false);
                    }}
                    className="border-white/10"
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    onClick={handleSaveEditedPrompt}
                    className="bg-gradient-to-r from-purple-600 to-cyan-600 text-white border-0"
                  >
                    {t('common.save')}
                  </Button>
                </div>
              </div>
            ) : (
              <pre className="whitespace-pre-wrap text-sm text-muted-foreground font-mono leading-relaxed">
                {project.masterPrompt}
              </pre>
            )}
          </div>

          {/* Tip */}
          <div className="glass rounded-xl p-4 border-l-4 border-cyan-500">
            <p className="text-sm text-muted-foreground">
              <strong className="text-cyan-400">Tip:</strong> Copy this prompt and paste it into ChatGPT or Gemini to generate detailed character and scene breakdowns. Then continue to the next step.
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
