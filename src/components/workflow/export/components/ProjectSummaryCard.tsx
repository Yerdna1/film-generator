'use client';

import { useTranslations } from 'next-intl';
import { Users, Image as ImageIcon, Video, Mic, ClipboardList } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { Project } from '@/types/project';
import type { ProjectStats } from '../types';

interface ProjectSummaryCardProps {
  project: Project;
  stats: ProjectStats;
  compact?: boolean;
}

export function ProjectSummaryCard({ project, stats, compact = false }: ProjectSummaryCardProps) {
  const t = useTranslations('common');

  // Compact version - just a small badge-like display
  if (compact) {
    return (
      <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
        <div className="flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-xs font-medium">{stats.totalScenes}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Video className="w-3.5 h-3.5 text-orange-400" />
          <span className="text-xs font-medium">{stats.scenesWithVideos}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Mic className="w-3.5 h-3.5 text-violet-400" />
          <span className="text-xs font-medium">{stats.dialogueLinesWithAudio}</span>
        </div>
        <Badge
          className={`text-[10px] px-1.5 py-0 ${
            stats.overallProgress >= 80
              ? 'bg-green-500/20 text-green-400'
              : stats.overallProgress >= 50
              ? 'bg-amber-500/20 text-amber-400'
              : 'bg-red-500/20 text-red-400'
          } border-0`}
        >
          {stats.overallProgress}%
        </Badge>
      </div>
    );
  }

  return (
    <Card className="glass border-white/10 overflow-hidden">
      <CardHeader className="border-b border-white/5">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-green-400" />
            {t('projectSummary')}
          </CardTitle>
          <Badge
            className={`${
              stats.overallProgress >= 80
                ? 'bg-green-500/20 text-green-400'
                : stats.overallProgress >= 50
                ? 'bg-amber-500/20 text-amber-400'
                : 'bg-red-500/20 text-red-400'
            } border-0`}
          >
            {stats.overallProgress}% {t('complete')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {/* Characters */}
          <div className="glass rounded-xl p-4 text-center">
            <Users className="w-6 h-6 text-purple-400 mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats.totalCharacters}</p>
            <p className="text-xs text-muted-foreground">{t('characters')}</p>
            <Progress
              value={(stats.charactersWithImages / Math.max(stats.totalCharacters, 1)) * 100}
              className="h-1 mt-2"
            />
          </div>

          {/* Scenes */}
          <div className="glass rounded-xl p-4 text-center">
            <ImageIcon className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats.totalScenes}</p>
            <p className="text-xs text-muted-foreground">{t('scenes')}</p>
            <Progress
              value={(stats.scenesWithImages / Math.max(stats.totalScenes, 1)) * 100}
              className="h-1 mt-2"
            />
          </div>

          {/* Videos */}
          <div className="glass rounded-xl p-4 text-center">
            <Video className="w-6 h-6 text-orange-400 mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats.scenesWithVideos}</p>
            <p className="text-xs text-muted-foreground">{t('videos')}</p>
            <Progress
              value={(stats.scenesWithVideos / Math.max(stats.totalScenes, 1)) * 100}
              className="h-1 mt-2"
            />
          </div>

          {/* Voiceovers */}
          <div className="glass rounded-xl p-4 text-center">
            <Mic className="w-6 h-6 text-violet-400 mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats.dialogueLinesWithAudio}</p>
            <p className="text-xs text-muted-foreground">{t('voiceovers')}</p>
            <Progress
              value={(stats.dialogueLinesWithAudio / Math.max(stats.totalDialogueLines, 1)) * 100}
              className="h-1 mt-2"
            />
          </div>
        </div>

        {/* Story Details */}
        <div className="glass rounded-xl p-4 space-y-2">
          <h3 className="font-semibold">{project.story.title || t('untitledStory')}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2">{project.story.concept}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge variant="outline" className="border-white/10">
              {project.story.genre}
            </Badge>
            <Badge variant="outline" className="border-white/10">
              {project.story.tone}
            </Badge>
            <Badge variant="outline" className="border-white/10">
              {project.style}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
