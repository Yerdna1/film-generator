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
}

export function ProjectSummaryCard({ project, stats }: ProjectSummaryCardProps) {
  const t = useTranslations();

  return (
    <Card className="glass border-white/10 overflow-hidden">
      <CardHeader className="border-b border-white/5">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-green-400" />
            {t('steps.export.projectSummary')}
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
            {stats.overallProgress}% {t('steps.export.complete')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {/* Characters */}
          <div className="glass rounded-xl p-4 text-center">
            <Users className="w-6 h-6 text-purple-400 mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats.totalCharacters}</p>
            <p className="text-xs text-muted-foreground">{t('steps.export.characters')}</p>
            <Progress
              value={(stats.charactersWithImages / Math.max(stats.totalCharacters, 1)) * 100}
              className="h-1 mt-2"
            />
          </div>

          {/* Scenes */}
          <div className="glass rounded-xl p-4 text-center">
            <ImageIcon className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats.totalScenes}</p>
            <p className="text-xs text-muted-foreground">{t('steps.export.scenes')}</p>
            <Progress
              value={(stats.scenesWithImages / Math.max(stats.totalScenes, 1)) * 100}
              className="h-1 mt-2"
            />
          </div>

          {/* Videos */}
          <div className="glass rounded-xl p-4 text-center">
            <Video className="w-6 h-6 text-orange-400 mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats.scenesWithVideos}</p>
            <p className="text-xs text-muted-foreground">{t('steps.export.videos')}</p>
            <Progress
              value={(stats.scenesWithVideos / Math.max(stats.totalScenes, 1)) * 100}
              className="h-1 mt-2"
            />
          </div>

          {/* Voiceovers */}
          <div className="glass rounded-xl p-4 text-center">
            <Mic className="w-6 h-6 text-violet-400 mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats.dialogueLinesWithAudio}</p>
            <p className="text-xs text-muted-foreground">{t('steps.export.voiceovers')}</p>
            <Progress
              value={(stats.dialogueLinesWithAudio / Math.max(stats.totalDialogueLines, 1)) * 100}
              className="h-1 mt-2"
            />
          </div>
        </div>

        {/* Story Details */}
        <div className="glass rounded-xl p-4 space-y-2">
          <h3 className="font-semibold">{project.story.title || 'Untitled Story'}</h3>
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
