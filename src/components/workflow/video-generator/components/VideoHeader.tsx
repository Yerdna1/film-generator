'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Video, Film, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface VideoHeaderProps {
  totalScenes: number;
  scenesWithVideos: number;
}

export function VideoHeader({ totalScenes, scenesWithVideos }: VideoHeaderProps) {
  const t = useTranslations();

  return (
    <>
      {/* Header */}
      <div className="text-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500/20 to-red-500/20 mb-4"
        >
          <Video className="w-8 h-8 text-orange-400" />
        </motion.div>
        <h2 className="text-2xl font-bold mb-2">{t('steps.videos.title')}</h2>
        <p className="text-muted-foreground">{t('steps.videos.description')}</p>
      </div>

      {/* Progress Overview */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Film className="w-5 h-5 text-orange-400" />
              <span className="font-medium">{t('steps.videos.progress')}</span>
            </div>
            <Badge variant="outline" className="border-orange-500/30 text-orange-400">
              {scenesWithVideos} / {totalScenes} {t('steps.videos.videosGenerated')}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>~{Math.ceil((totalScenes - scenesWithVideos) * 0.5)} min</span>
          </div>
        </div>
        <Progress
          value={(scenesWithVideos / totalScenes) * 100}
          className="h-2"
        />
      </div>
    </>
  );
}
