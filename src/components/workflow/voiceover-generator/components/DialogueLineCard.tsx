'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import {
  Play,
  Pause,
  RefreshCw,
  Download,
  User,
  Sparkles,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ACTION_COSTS, formatCostCompact } from '@/lib/services/real-costs';
import type { DialogueLineCardProps } from '../types';

export function DialogueLineCard({
  line,
  character,
  status,
  progress,
  isPlaying,
  provider,
  isReadOnly = false,
  isAuthenticated = true,
  isFirstDialogue = false,
  onTogglePlay,
  onGenerate,
  onAudioRef,
  onAudioEnded,
}: DialogueLineCardProps) {
  const t = useTranslations();

  // Determine if this dialogue is restricted (non-first dialogue for unauthenticated users)
  const isRestricted = !isAuthenticated && !isFirstDialogue;

  return (
    <div className={`glass rounded-lg p-3 flex items-start gap-3 relative overflow-hidden ${isRestricted ? 'select-none' : ''}`}>
      {/* Blur overlay for restricted content */}
      {isRestricted && (
        <a
          href="/auth/register"
          className="absolute inset-0 z-10 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center hover:bg-black/50 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center mb-1">
            <Lock className="w-4 h-4 text-white/70" />
          </div>
          <p className="text-[10px] text-white/80">Sign in to listen</p>
        </a>
      )}

      {/* Character Avatar */}
      <div className="flex-shrink-0">
        {character?.imageUrl ? (
          <img
            src={character.imageUrl}
            alt={character.name}
            className={`w-10 h-10 rounded-lg object-cover ${isRestricted ? 'blur-sm' : ''}`}
          />
        ) : (
          <div className={`w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center ${isRestricted ? 'blur-sm' : ''}`}>
            <User className="w-5 h-5 text-violet-400" />
          </div>
        )}
      </div>

      {/* Dialogue Content */}
      <div className={`flex-1 min-w-0 ${isRestricted ? 'blur-sm' : ''}`}>
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="font-semibold text-violet-400">
            {character?.name || line.characterName}
          </span>
          {character?.voiceName && (
            <Badge variant="outline" className="text-xs border-white/10">
              {character.voiceName}
            </Badge>
          )}
          {line.audioUrl && line.ttsProvider && (
            <Badge
              className={`text-xs border-0 ${
                line.ttsProvider === 'elevenlabs'
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'bg-green-500/20 text-green-400'
              }`}
            >
              {line.ttsProvider === 'elevenlabs' ? '🇬🇧 ElevenLabs' : '🇸🇰 Gemini TTS'}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">"{line.text}"</p>

        {/* Only load audio for non-restricted content */}
        {line.audioUrl && !isRestricted && (
          <audio
            ref={onAudioRef}
            src={line.audioUrl}
            onEnded={onAudioEnded}
          />
        )}
      </div>

      {/* Actions */}
      <div className={`flex items-center gap-2 flex-shrink-0 ${isRestricted ? 'blur-sm' : ''}`}>
        {status === 'generating' ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              <RefreshCw className="w-4 h-4" />
            </motion.div>
            <span className="text-xs">{progress}%</span>
          </div>
        ) : status === 'complete' || line.audioUrl ? (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onTogglePlay}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4 ml-0.5" />
              )}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Download className="w-4 h-4" />
            </Button>
            <CheckCircle2 className="w-5 h-5 text-green-400" />
          </>
        ) : !isReadOnly ? (
          <Button
            variant="outline"
            size="sm"
            className="border-white/10 hover:bg-white/5"
            onClick={onGenerate}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {t('steps.voiceover.generate')}
            <span className="ml-1 text-[10px] opacity-70">
              {formatCostCompact(
                provider === 'gemini-tts'
                  ? ACTION_COSTS.voiceover.geminiTts
                  : ACTION_COSTS.voiceover.elevenlabs
              )}
            </span>
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">No audio</span>
        )}
      </div>
    </div>
  );
}
