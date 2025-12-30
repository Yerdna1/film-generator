'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Clock, Video, Mic, Image as ImageIcon, Play } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Project } from '@/types/project';
import type { ProjectStats } from '../types';

interface TimelineViewProps {
  project: Project;
  stats: ProjectStats;
}

export function TimelineView({ project, stats }: TimelineViewProps) {
  const t = useTranslations();

  return (
    <Card className="glass border-white/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-cyan-400" />
            {t('steps.export.timeline')}
          </CardTitle>
          <Badge variant="outline" className="border-cyan-500/30 text-cyan-400">
            {stats.totalMinutes}:{String(stats.totalSeconds).padStart(2, '0')} {t('steps.export.totalDuration')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Timeline visualization */}
        <div className="relative">
          {/* Timeline ruler */}
          <div className="flex justify-between text-xs text-muted-foreground mb-2 px-1">
            {Array.from({ length: Math.min(project.scenes.length + 1, 13) }, (_, i) => {
              const time = i * 6;
              return (
                <span key={i}>
                  {Math.floor(time / 60)}:{String(time % 60).padStart(2, '0')}
                </span>
              );
            })}
          </div>

          {/* Video track */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Video className="w-4 h-4 text-orange-400" />
              <span className="text-xs font-medium text-orange-400">{t('steps.export.videoTrack')}</span>
            </div>
            <div className="flex gap-1 h-16 overflow-x-auto pb-2">
              {project.scenes.map((scene, index) => (
                <motion.div
                  key={scene.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className={`flex-shrink-0 w-24 h-full rounded-lg overflow-hidden border-2 relative ${
                    scene.videoUrl
                      ? 'border-green-500/50'
                      : scene.imageUrl
                      ? 'border-amber-500/50'
                      : 'border-white/10'
                  }`}
                >
                  {scene.videoUrl ? (
                    <video src={scene.videoUrl} className="w-full h-full object-cover" muted />
                  ) : scene.imageUrl ? (
                    <img
                      src={scene.imageUrl}
                      alt={scene.title}
                      className="w-full h-full object-cover opacity-70"
                    />
                  ) : (
                    <div className="w-full h-full bg-white/5 flex items-center justify-center">
                      <ImageIcon className="w-6 h-6 text-muted-foreground/30" />
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5">
                    <p className="text-[10px] text-white truncate">
                      {scene.number || index + 1}. {scene.title}
                    </p>
                  </div>
                  {scene.videoUrl && (
                    <div className="absolute top-1 right-1">
                      <Play className="w-3 h-3 text-green-400" />
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>

          {/* Audio track */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Mic className="w-4 h-4 text-violet-400" />
              <span className="text-xs font-medium text-violet-400">{t('steps.export.audioTrack')}</span>
            </div>
            <div className="flex gap-1 h-8 overflow-x-auto pb-2">
              {project.scenes.map((scene) => (
                <div
                  key={scene.id}
                  className="flex-shrink-0 w-24 h-full rounded-lg overflow-hidden flex items-center justify-center gap-0.5"
                >
                  {scene.dialogue.length > 0 ? (
                    scene.dialogue.map((line, lineIdx) => (
                      <div
                        key={lineIdx}
                        className={`h-full flex-1 rounded ${
                          line.audioUrl
                            ? 'bg-violet-500/50'
                            : 'bg-violet-500/20 border border-dashed border-violet-500/30'
                        }`}
                        title={`${line.characterName}: ${line.text}`}
                      />
                    ))
                  ) : (
                    <div className="w-full h-full bg-white/5 rounded" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Timeline legend */}
        <div className="flex flex-wrap gap-4 mt-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-green-500/50 border border-green-500" />
            <span className="text-muted-foreground">{t('steps.export.hasVideo')}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-amber-500/50 border border-amber-500" />
            <span className="text-muted-foreground">{t('steps.export.hasImage')}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-violet-500/50" />
            <span className="text-muted-foreground">{t('steps.export.hasAudio')}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-white/10 border border-dashed border-white/20" />
            <span className="text-muted-foreground">{t('steps.export.missing')}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
