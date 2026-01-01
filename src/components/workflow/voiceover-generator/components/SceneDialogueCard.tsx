'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DialogueLineCard } from './DialogueLineCard';
import type { SceneDialogueCardProps } from '../types';

export function SceneDialogueCard({
  scene,
  sceneIndex,
  characters,
  audioStates,
  playingAudio,
  provider,
  onTogglePlay,
  onGenerateAudio,
  onAudioRef,
  onAudioEnded,
}: SceneDialogueCardProps) {
  const t = useTranslations();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: sceneIndex * 0.1 }}
    >
      <Card className="glass border-white/10 overflow-hidden">
        <CardHeader className="pb-3 border-b border-white/5">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Badge className="bg-violet-500/20 text-violet-400 border-0">
                {t('steps.scenes.sceneLabel')} {scene.number || sceneIndex + 1}
              </Badge>
              {scene.title}
            </CardTitle>
            <Badge variant="outline" className="border-white/10">
              {scene.dialogue.length} {t('steps.voiceover.lines')}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          {scene.dialogue.map((line, lineIndex) => {
            const character = characters.find((c) => c.id === line.characterId);
            const status = line.audioUrl
              ? 'complete'
              : audioStates[line.id]?.status || 'idle';
            const progress = audioStates[line.id]?.progress || 0;

            return (
              <motion.div
                key={line.id || `line-${lineIndex}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: lineIndex * 0.05 }}
              >
                <DialogueLineCard
                  line={line}
                  character={character}
                  status={status}
                  progress={progress}
                  isPlaying={playingAudio === line.id}
                  provider={provider}
                  onTogglePlay={() => onTogglePlay(line.id)}
                  onGenerate={() => onGenerateAudio(line.id, scene.id)}
                  onAudioRef={(el) => onAudioRef(line.id, el)}
                  onAudioEnded={onAudioEnded}
                />
              </motion.div>
            );
          })}
        </CardContent>
      </Card>
    </motion.div>
  );
}
