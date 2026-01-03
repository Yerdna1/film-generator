'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { DialogueLineCard } from './DialogueLineCard';
import type { SceneDialogueCardProps } from '../types';

export function SceneDialogueCard({
  scene,
  sceneIndex,
  projectId,
  characters,
  audioStates,
  playingAudio,
  provider,
  isReadOnly = false,
  isAuthenticated = true,
  firstDialogueLineId = null,
  canDeleteDirectly = true,
  pendingRegenLineIds,
  pendingDeletionLineIds,
  approvedRegenByLineId,
  onTogglePlay,
  onGenerateAudio,
  onAudioRef,
  onAudioEnded,
  onDeletionRequested,
  onUseRegenerationAttempt,
  onSelectRegeneration,
}: SceneDialogueCardProps) {
  const t = useTranslations();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: sceneIndex * 0.1 }}
    >
      <div className="glass border border-white/10 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-1.5 py-px">
          <div className="flex items-center gap-1 min-w-0">
            <span className="text-violet-400 font-bold text-base shrink-0">#{scene.number || sceneIndex + 1}</span>
            <span className="truncate text-muted-foreground text-[11px]">{scene.title}</span>
          </div>
          <span className="text-[10px] text-muted-foreground shrink-0">{scene.dialogue.length}</span>
        </div>
        <div className="px-1 pb-1 space-y-0.5">
          {scene.dialogue.map((line, lineIndex) => {
            const character = characters.find((c) => c.id === line.characterId);
            const status = line.audioUrl
              ? 'complete'
              : audioStates[line.id]?.status || 'idle';
            const progress = audioStates[line.id]?.progress || 0;

            return (
              <DialogueLineCard
                key={line.id || `line-${lineIndex}`}
                line={line}
                character={character}
                status={status}
                progress={progress}
                isPlaying={playingAudio === line.id}
                provider={provider}
                projectId={projectId}
                sceneId={scene.id}
                isReadOnly={isReadOnly}
                isAuthenticated={isAuthenticated}
                isFirstDialogue={line.id === firstDialogueLineId}
                canDeleteDirectly={canDeleteDirectly}
                hasPendingRegeneration={pendingRegenLineIds?.has(line.id) || false}
                hasPendingDeletion={pendingDeletionLineIds?.has(line.id) || false}
                approvedRegeneration={approvedRegenByLineId?.get(line.id) || null}
                onTogglePlay={() => onTogglePlay(line.id)}
                onGenerate={() => onGenerateAudio(line.id, scene.id)}
                onAudioRef={(el) => onAudioRef(line.id, el)}
                onAudioEnded={onAudioEnded}
                onDeletionRequested={onDeletionRequested}
                onUseRegenerationAttempt={onUseRegenerationAttempt}
                onSelectRegeneration={onSelectRegeneration}
              />
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
