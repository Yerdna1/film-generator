'use client';

import type { Character } from '@/types/project';
import { ACTION_COSTS } from '@/lib/services/real-costs';
import { InsufficientCreditsModal } from '@/components/workflow/character-generator/components/InsufficientCreditsModal';
import { KieTtsModal } from '../../voiceover-generator/components';

interface VoiceoverModalsProps {
  isInsufficientCreditsModalOpen: boolean;
  setIsInsufficientCreditsModalOpen: (open: boolean) => void;
  isKieModalOpen: boolean;
  setIsKieModalOpen: (open: boolean) => void;
  isSavingKieKey: boolean;
  pendingVoiceoverGeneration: {
    type: 'single' | 'all';
    lineId?: string;
    sceneId?: string;
  } | null;
  dialogueCount: number;
  characters: Character[];
  voiceAssignments: Map<string, string>;
  onUseAppCredits: () => void;
  onSaveKieApiKey: (apiKey: string, model: string) => Promise<void>;
}

export function VoiceoverModals({
  isInsufficientCreditsModalOpen,
  setIsInsufficientCreditsModalOpen,
  isKieModalOpen,
  setIsKieModalOpen,
  isSavingKieKey,
  pendingVoiceoverGeneration,
  dialogueCount,
  characters,
  voiceAssignments,
  onUseAppCredits,
  onSaveKieApiKey,
}: VoiceoverModalsProps) {
  const creditsNeeded = ACTION_COSTS.voiceover.elevenlabs *
    (pendingVoiceoverGeneration?.type === 'all' ? (dialogueCount || 1) : 1);

  return (
    <>
      <InsufficientCreditsModal
        isOpen={isInsufficientCreditsModalOpen}
        onClose={() => setIsInsufficientCreditsModalOpen(false)}
        onOpenKieModal={() => {
          setIsInsufficientCreditsModalOpen(false);
          setIsKieModalOpen(true);
        }}
        onUseAppCredits={onUseAppCredits}
        creditsNeeded={creditsNeeded}
        currentCredits={undefined}
        generationType="audio"
      />

      <KieTtsModal
        isOpen={isKieModalOpen}
        onClose={() => setIsKieModalOpen(false)}
        onSave={onSaveKieApiKey}
        isLoading={isSavingKieKey}
        characters={characters}
        currentVoiceAssignments={voiceAssignments}
      />
    </>
  );
}