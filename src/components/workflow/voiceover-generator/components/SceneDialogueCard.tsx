'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { PlayCircle, Square, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { DialogueLineCard } from './DialogueLineCard';
import type { SceneDialogueCardProps } from '../types';

export function SceneDialogueCard({
  scene,
  sceneIndex,
  projectId,
  characters,
  audioStates,
  playingAudio,
  playingSceneId,
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
  onDownloadLine,
  onDeleteAudio,
  onPlayAllScene,
  onStopScenePlayback,
  onToggleUseTts,
  onSelectVersion,
  onDeletionRequested,
  onUseRegenerationAttempt,
  onSelectRegeneration,
}: SceneDialogueCardProps) {
  const t = useTranslations();

  const isPlayingThisScene = playingSceneId === scene.id;
  const hasAnyAudio = scene.dialogue.some(l => l.audioUrl);
  const useTtsInVideo = scene.useTtsInVideo ?? true;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: sceneIndex * 0.1 }}
    >
      <div className="glass border border-white/10 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-1.5 py-0.5">
          <div className="flex items-center gap-1 min-w-0">
            <span className="text-violet-400 font-bold text-base shrink-0">#{scene.number || sceneIndex + 1}</span>
            <span className="truncate text-muted-foreground text-[11px]">{scene.title}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {/* Play All Scene Voices Button */}
            {hasAnyAudio && onPlayAllScene && (
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={() => isPlayingThisScene ? onStopScenePlayback?.() : onPlayAllScene(scene.id)}
                title={isPlayingThisScene ? t('steps.voiceover.stopPlayback') : t('steps.voiceover.playAll')}
              >
                {isPlayingThisScene ? (
                  <Square className="w-3 h-3 text-amber-400" />
                ) : (
                  <PlayCircle className="w-3 h-3 text-violet-400" />
                )}
              </Button>
            )}
            {/* TTS in Video Toggle */}
            {!isReadOnly && hasAnyAudio && onToggleUseTts && (
              <div className="flex items-center gap-0.5" title={useTtsInVideo ? t('steps.voiceover.usingTts') : t('steps.voiceover.usingOriginal')}>
                <Switch
                  checked={useTtsInVideo}
                  onCheckedChange={() => onToggleUseTts(scene.id)}
                  className="scale-50"
                />
                {useTtsInVideo ? (
                  <Volume2 className="w-3 h-3 text-emerald-400" />
                ) : (
                  <VolumeX className="w-3 h-3 text-muted-foreground" />
                )}
              </div>
            )}
            <span className="text-[10px] text-muted-foreground ml-1">{scene.dialogue.length}</span>
          </div>
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
                onDownload={onDownloadLine ? () => onDownloadLine(line.id) : undefined}
                onDeleteAudio={onDeleteAudio ? () => onDeleteAudio(line.id, scene.id) : undefined}
                onSelectVersion={onSelectVersion ? (audioUrl, provider) => onSelectVersion(line.id, scene.id, audioUrl, provider) : undefined}
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
