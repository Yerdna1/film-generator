'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { useMemo } from 'react';
import {
  Film,
  Users,
  Layers,
  MoreHorizontal,
  Trash2,
  Copy,
  Clock,
  CheckCircle2,
  Play,
  DollarSign,
  Coins,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useProjectStore } from '@/lib/stores/project-store';
import type { Project, StylePreset } from '@/types/project';
import { formatPriceWithSymbol, getCurrencySymbol } from '@/lib/utils/currency';

interface ProjectCost {
  credits: number;
  realCost: number;
}

interface ProjectCardProps {
  project: Project;
  variant?: 'default' | 'compact';
  cost?: ProjectCost;
}

const styleColors: Record<StylePreset, { bg: string; text: string; label: string }> = {
  'disney-pixar': { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'Disney/Pixar' },
  realistic: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', label: 'Realistic' },
  anime: { bg: 'bg-pink-500/20', text: 'text-pink-400', label: 'Anime' },
  custom: { bg: 'bg-orange-500/20', text: 'text-orange-400', label: 'Custom' },
};

export function ProjectCard({ project, variant = 'default', cost }: ProjectCardProps) {
  const t = useTranslations();
  const { deleteProject, duplicateProject } = useProjectStore();

  const styleConfig = styleColors[project.style];
  const progress = Math.round((project.currentStep / 6) * 100);

  // Format real cost using configured currency
  const formatRealCost = (amount: number) => {
    return formatPriceWithSymbol(amount);
  };

  const currencySymbol = getCurrencySymbol();

  // Get the first available thumbnail image from scenes or characters
  const thumbnailUrl = useMemo(() => {
    // First try to get an image from scenes
    const sceneWithImage = project.scenes.find(scene => scene.imageUrl);
    if (sceneWithImage?.imageUrl) return sceneWithImage.imageUrl;

    // Then try to get an image from characters
    const characterWithImage = project.characters.find(char => char.imageUrl);
    if (characterWithImage?.imageUrl) return characterWithImage.imageUrl;

    return null;
  }, [project.scenes, project.characters]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (variant === 'compact') {
    return (
      <Link href={`/project/${project.id}`}>
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="glass rounded-xl overflow-hidden card-hover cursor-pointer group"
        >
          {/* Compact thumbnail */}
          <div className="relative h-24 bg-gradient-to-br from-purple-900/30 to-cyan-900/30">
            {thumbnailUrl ? (
              <Image
                src={thumbnailUrl}
                alt={project.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, 25vw"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className={`w-10 h-10 rounded-lg ${styleConfig.bg} flex items-center justify-center`}>
                  <Film className={`w-5 h-5 ${styleConfig.text}`} />
                </div>
              </div>
            )}
            <div className="absolute top-2 right-2">
              <Badge variant="secondary" className={`${styleConfig.bg} ${styleConfig.text} border-0 text-[10px] px-1.5 py-0.5`}>
                {styleConfig.label}
              </Badge>
            </div>
          </div>
          <div className="p-3">
            <h3 className="font-semibold truncate mb-1 group-hover:text-purple-400 transition-colors text-sm">
              {project.name}
            </h3>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDate(project.updatedAt)}
              </p>
              {cost && cost.realCost > 0 && (
                <p className="text-xs text-green-400 font-medium">
                  {formatRealCost(cost.realCost)}
                </p>
              )}
            </div>
          </div>
        </motion.div>
      </Link>
    );
  }

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="glass rounded-xl overflow-hidden card-hover group"
    >
      {/* Preview Area */}
      <div className="relative h-40 bg-gradient-to-br from-purple-900/30 to-cyan-900/30 overflow-hidden">
        {/* Thumbnail image or fallback */}
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt={project.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <>
            {/* Film strip decoration */}
            <div className="absolute inset-0 film-strip opacity-30" />

            {/* Project style icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className={`w-16 h-16 rounded-2xl ${styleConfig.bg} flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300`}>
                <Film className={`w-8 h-8 ${styleConfig.text}`} />
              </div>
            </div>
          </>
        )}

        {/* Progress indicator */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-cyan-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Status badge */}
        <div className="absolute top-3 right-3">
          {project.isComplete ? (
            <Badge className="bg-green-500/20 text-green-400 border-0">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Complete
            </Badge>
          ) : (
            <Badge className="bg-yellow-500/20 text-yellow-400 border-0">
              <Clock className="w-3 h-3 mr-1" />
              Step {project.currentStep}/6
            </Badge>
          )}
        </div>

        {/* Play overlay on hover */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Link href={`/project/${project.id}`}>
            <Button
              size="lg"
              className="bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/20"
            >
              <Play className="w-5 h-5 mr-2" />
              {t('project.open')}
            </Button>
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <Link href={`/project/${project.id}`}>
              <h3 className="font-semibold truncate hover:text-purple-400 transition-colors">
                {project.name}
              </h3>
            </Link>
            <p className="text-sm text-muted-foreground truncate">
              {project.story.title || 'Untitled Story'}
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="glass-strong border-white/10">
              <DropdownMenuItem
                onClick={() => duplicateProject(project.id)}
                className="cursor-pointer hover:bg-white/5"
              >
                <Copy className="w-4 h-4 mr-2" />
                {t('project.duplicate')}
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem
                onClick={() => deleteProject(project.id)}
                className="cursor-pointer text-red-400 hover:bg-red-500/10 hover:text-red-400"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {t('common.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>{project.characters.length} {t('project.characters')}</span>
          </div>
          <div className="flex items-center gap-1">
            <Layers className="w-4 h-4" />
            <span>{project.scenes.length} {t('project.scenes')}</span>
          </div>
        </div>

        {/* Cost Display */}
        {cost && (cost.realCost > 0 || cost.credits > 0) && (
          <div className="flex items-center justify-between py-2 mb-2 border-t border-b border-white/5">
            <div className="flex items-center gap-3">
              {/* Real Cost (Primary) */}
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded bg-green-500/20 flex items-center justify-center">
                  <DollarSign className="w-3.5 h-3.5 text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-green-400">{formatRealCost(cost.realCost)}</p>
                  <p className="text-[10px] text-muted-foreground">Real Cost</p>
                </div>
              </div>
              {/* Credits */}
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded bg-amber-500/20 flex items-center justify-center">
                  <Coins className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-amber-400">{cost.credits}</p>
                  <p className="text-[10px] text-muted-foreground">Credits</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-white/5">
          <Badge variant="secondary" className={`${styleConfig.bg} ${styleConfig.text} border-0 text-xs`}>
            {styleConfig.label}
          </Badge>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDate(project.updatedAt)}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
