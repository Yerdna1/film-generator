'use client';

import { useTranslations } from 'next-intl';
import { Loader2, AlertCircle } from 'lucide-react';

interface VoiceoverHeaderProps {
  isLoadingDialogue: boolean;
  dialogueCount: number;
}

export function VoiceoverHeader({ isLoadingDialogue, dialogueCount }: VoiceoverHeaderProps) {
  const t = useTranslations();

  if (isLoadingDialogue) {
    return (
      <div className="glass rounded-xl p-6 text-center">
        <Loader2 className="w-8 h-8 text-violet-400 mx-auto mb-3 animate-spin" />
        <h3 className="font-semibold mb-2">{t('steps.voiceover.loadingDialogue')}</h3>
      </div>
    );
  }

  if (!isLoadingDialogue && dialogueCount === 0) {
    return (
      <div className="glass rounded-xl p-6 border-l-4 border-amber-500 text-center">
        <AlertCircle className="w-8 h-8 text-amber-400 mx-auto mb-3" />
        <h3 className="font-semibold mb-2">{t('steps.voiceover.noDialogue')}</h3>
        <p className="text-sm text-muted-foreground">
          {t('steps.voiceover.noDialogueDescription')}
        </p>
      </div>
    );
  }

  return null;
}