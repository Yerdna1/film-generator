'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Users } from 'lucide-react';
import { useProjectStore } from '@/lib/stores/project-store';
import { generateCharacterPrompt } from '@/lib/prompts/master-prompt';
import type { Character } from '@/types/project';
import type { AspectRatio } from '@/lib/services/real-costs';
import {
  Step2Props,
  MAX_CHARACTERS,
  CharacterFormData,
  EditCharacterData,
} from './character-generator/types';
import { useCharacterImage } from './character-generator/hooks';
import {
  CharacterCard,
  AddCharacterDialog,
  EditCharacterDialog,
  ImagePreviewModal,
  CopyPromptsDialog,
  ImageGenerationSettings,
  CharacterProgress,
} from './character-generator/components';

export function Step2CharacterGenerator({ project: initialProject }: Step2Props) {
  const t = useTranslations();
  const { addCharacter, updateCharacter, deleteCharacter, updateSettings, projects } = useProjectStore();

  // Get live project data from store
  const project = projects.find(p => p.id === initialProject.id) || initialProject;

  // State
  const [isAddingCharacter, setIsAddingCharacter] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [characterAspectRatio, setCharacterAspectRatio] = useState<AspectRatio>('1:1');
  const [showPromptsDialog, setShowPromptsDialog] = useState(false);
  const [editCharacterData, setEditCharacterData] = useState<EditCharacterData | null>(null);

  // Custom hook for image generation
  const {
    imageStates,
    isGeneratingAll,
    generateCharacterImage,
    handleGenerateAll,
  } = useCharacterImage(project, characterAspectRatio);

  // Handlers
  const handleAddCharacter = (data: CharacterFormData) => {
    if (!data.name.trim()) return;

    const masterPrompt = generateCharacterPrompt(
      {
        name: data.name,
        description: data.description,
        visualDescription: data.visualDescription,
      },
      project.style
    );

    addCharacter(project.id, {
      name: data.name,
      description: data.description,
      visualDescription: data.visualDescription,
      personality: data.personality,
      masterPrompt,
    });

    setIsAddingCharacter(false);
  };

  const regeneratePrompt = (character: Character) => {
    const masterPrompt = generateCharacterPrompt(character, project.style);
    updateCharacter(project.id, character.id, { masterPrompt });
  };

  const startEditCharacter = (character: Character) => {
    setEditCharacterData({
      name: character.name,
      description: character.description || '',
      visualDescription: character.visualDescription || '',
      personality: character.personality || '',
      masterPrompt: character.masterPrompt,
    });
    setEditingCharacter(character.id);
  };

  const saveEditCharacter = () => {
    if (!editingCharacter || !editCharacterData) return;

    const newMasterPrompt = generateCharacterPrompt(
      {
        name: editCharacterData.name,
        description: editCharacterData.description,
        visualDescription: editCharacterData.visualDescription,
      },
      project.style
    );

    updateCharacter(project.id, editingCharacter, {
      name: editCharacterData.name,
      description: editCharacterData.description,
      visualDescription: editCharacterData.visualDescription,
      personality: editCharacterData.personality,
      masterPrompt: editCharacterData.masterPrompt !== newMasterPrompt ? editCharacterData.masterPrompt : newMasterPrompt,
    });

    setEditingCharacter(null);
    setEditCharacterData(null);
  };

  const cancelEditCharacter = () => {
    setEditingCharacter(null);
    setEditCharacterData(null);
  };

  const charactersWithImages = project.characters.filter((c) => c.imageUrl).length;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 mb-4"
        >
          <Users className="w-8 h-8 text-cyan-400" />
        </motion.div>
        <h2 className="text-2xl font-bold mb-2">{t('steps.characters.title')}</h2>
        <p className="text-muted-foreground">{t('steps.characters.description')}</p>
      </div>

      {/* Image Generation Settings */}
      <ImageGenerationSettings
        imageResolution={project.settings?.imageResolution || '2k'}
        aspectRatio={characterAspectRatio}
        onResolutionChange={(resolution) => updateSettings(project.id, { imageResolution: resolution })}
        onAspectRatioChange={setCharacterAspectRatio}
      />

      {/* Characters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {project.characters.map((character, index) => (
          <motion.div
            key={character.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <CharacterCard
              character={character}
              project={project}
              imageState={imageStates[character.id]}
              onEdit={startEditCharacter}
              onDelete={(id) => deleteCharacter(project.id, id)}
              onGenerateImage={generateCharacterImage}
              onRegeneratePrompt={regeneratePrompt}
              onPreviewImage={setPreviewImage}
              characterAspectRatio={characterAspectRatio}
            />
          </motion.div>
        ))}

        {/* Add Character Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: project.characters.length * 0.1 }}
        >
          <AddCharacterDialog
            open={isAddingCharacter}
            onOpenChange={setIsAddingCharacter}
            onAddCharacter={handleAddCharacter}
            currentCount={project.characters.length}
            maxCount={MAX_CHARACTERS}
          />
        </motion.div>
      </div>

      {/* Progress & Quick Actions */}
      <CharacterProgress
        characters={project.characters}
        charactersWithImages={charactersWithImages}
        isGeneratingAll={isGeneratingAll}
        imageResolution={project.settings?.imageResolution || '2k'}
        onGenerateAll={handleGenerateAll}
        onShowPromptsDialog={() => setShowPromptsDialog(true)}
      />

      {/* Tip */}
      <div className="glass rounded-xl p-4 border-l-4 border-purple-500">
        <p className="text-sm text-muted-foreground">
          <strong className="text-purple-400">Tip:</strong> For consistent character appearance across scenes, copy each character's Master Prompt and use it when generating images in Nano Banana or Gemini AI Studio.
        </p>
      </div>

      {/* Edit Character Dialog */}
      <EditCharacterDialog
        open={editingCharacter !== null}
        onOpenChange={(open) => !open && cancelEditCharacter()}
        editData={editCharacterData}
        onEditDataChange={setEditCharacterData}
        onSave={saveEditCharacter}
        onCancel={cancelEditCharacter}
      />

      {/* Image Preview Modal */}
      <ImagePreviewModal
        imageUrl={previewImage}
        onClose={() => setPreviewImage(null)}
      />

      {/* Copy Prompts for Gemini Dialog */}
      <CopyPromptsDialog
        open={showPromptsDialog}
        onOpenChange={setShowPromptsDialog}
        characters={project.characters}
      />
    </div>
  );
}
