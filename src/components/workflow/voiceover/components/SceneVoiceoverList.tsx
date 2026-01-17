'use client';

import type { Scene, Character, VoiceProvider } from '@/types/project';
import type { RegenerationRequest } from '@/types/collaboration';
import { SceneDialogueCard } from '../../voiceover-generator/components';
import type { ItemGenerationState } from '@/lib/constants/workflow';

interface SceneVoiceoverListProps {
  scenes: Scene[];
  startIndex: number;
  projectId: string;
  characters: Character[];
  audioStates: Record<string, ItemGenerationState>;
  playingAudio: string | null;
  playingSceneId: string | null;
  provider: VoiceProvider;
  isReadOnly: boolean;
  isAuthenticated: boolean;
  firstDialogueLineId: string | null;
  canDeleteDirectly: boolean;
  pendingRegenLineIds: Set<string>;
  pendingDeletionLineIds: Set<string>;
  approvedRegenByLineId: Map<string, RegenerationRequest>;
  onTogglePlay: (lineId: string) => void;
  onGenerateAudio: (lineId: string, sceneId: string) => void;
  onAudioRef: (lineId: string, audio: HTMLAudioElement | null) => void;
  onAudioEnded: () => void;
  onDownloadLine: (lineId: string) => void;
  onPlayAllScene: (sceneId: string) => void;
  onStopScenePlayback: () => void;
  onDeleteAudio: (lineId: string, sceneId: string) => void;
  onSelectVersion: (lineId: string, sceneId: string, audioUrl: string, provider: string) => void;
  onToggleUseTts: (sceneId: string) => void;
  onDeletionRequested: () => void;
  onUseRegenerationAttempt: (requestId: string) => Promise<void>;
  onSelectRegeneration: (requestId: string, selectedUrl: string) => Promise<void>;
}

export function SceneVoiceoverList({
  scenes,
  startIndex,
  projectId,
  characters,
  audioStates,
  playingAudio,
  playingSceneId,
  provider,
  isReadOnly,
  isAuthenticated,
  firstDialogueLineId,
  canDeleteDirectly,
  pendingRegenLineIds,
  pendingDeletionLineIds,
  approvedRegenByLineId,
  onTogglePlay,
  onGenerateAudio,
  onAudioRef,
  onAudioEnded,
  onDownloadLine,
  onPlayAllScene,
  onStopScenePlayback,
  onDeleteAudio,
  onSelectVersion,
  onToggleUseTts,
  onDeletionRequested,
  onUseRegenerationAttempt,
  onSelectRegeneration,
}: SceneVoiceoverListProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {scenes.map((scene, idx) => {
        const actualIndex = startIndex + idx;
        return (
          <SceneDialogueCard
            key={scene.id}
            scene={scene}
            sceneIndex={actualIndex}
            projectId={projectId}
            characters={characters}
            audioStates={audioStates}
            playingAudio={playingAudio}
            playingSceneId={playingSceneId}
            provider={provider}
            isReadOnly={isReadOnly}
            isAuthenticated={isAuthenticated}
            firstDialogueLineId={firstDialogueLineId}
            canDeleteDirectly={canDeleteDirectly}
            pendingRegenLineIds={pendingRegenLineIds}
            pendingDeletionLineIds={pendingDeletionLineIds}
            approvedRegenByLineId={approvedRegenByLineId}
            onTogglePlay={onTogglePlay}
            onGenerateAudio={onGenerateAudio}
            onAudioRef={onAudioRef}
            onAudioEnded={onAudioEnded}
            onDownloadLine={onDownloadLine}
            onPlayAllScene={onPlayAllScene}
            onStopScenePlayback={onStopScenePlayback}
            onDeleteAudio={onDeleteAudio}
            onSelectVersion={onSelectVersion}
            onToggleUseTts={onToggleUseTts}
            onDeletionRequested={onDeletionRequested}
            onUseRegenerationAttempt={onUseRegenerationAttempt}
            onSelectRegeneration={onSelectRegeneration}
          />
        );
      })}
    </div>
  );
}