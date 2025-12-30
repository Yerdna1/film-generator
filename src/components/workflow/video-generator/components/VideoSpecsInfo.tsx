'use client';

import { useTranslations } from 'next-intl';
import { Info, Clock, Image as ImageIcon, Volume2, Settings2, AlertCircle } from 'lucide-react';
import type { VideoMode } from '../types';

interface VideoSpecsInfoProps {
  videoMode: VideoMode;
}

export function VideoSpecsInfo({ videoMode }: VideoSpecsInfoProps) {
  const t = useTranslations();

  return (
    <div className="glass rounded-xl p-4 border border-blue-500/20">
      <div className="flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
        <div className="space-y-2 flex-1">
          <h4 className="font-medium text-blue-400">{t('steps.videos.videoSpecs')}</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="glass rounded-lg p-2 text-center">
              <Clock className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">{t('steps.videos.duration')}</p>
              <p className="font-medium">6 {t('steps.videos.seconds')}</p>
            </div>
            <div className="glass rounded-lg p-2 text-center">
              <ImageIcon className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">{t('steps.videos.resolution')}</p>
              <p className="font-medium">{t('steps.videos.matchesImage')}</p>
            </div>
            <div className="glass rounded-lg p-2 text-center">
              <Volume2 className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">{t('steps.videos.audio')}</p>
              <p className="font-medium">{t('steps.videos.ambientAudio')}</p>
            </div>
            <div className="glass rounded-lg p-2 text-center">
              <Settings2 className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">{t('steps.videos.mode')}</p>
              <p className="font-medium capitalize">{videoMode}</p>
            </div>
          </div>
          <p className="text-xs text-amber-400 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {t('steps.videos.voiceoverNote')}
          </p>
        </div>
      </div>
    </div>
  );
}
