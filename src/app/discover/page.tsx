'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import {
  Globe,
  Film,
  Users,
  Image as ImageIcon,
  Play,
  Loader2,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

interface PublicProject {
  id: string;
  name: string;
  style: string;
  story: {
    title?: string;
    concept?: string;
    genre?: string;
  };
  visibility: string;
  createdAt: string;
  updatedAt: string;
  owner: {
    id: string;
    name: string | null;
    image: string | null;
  };
  thumbnailUrl: string | null;
  scenesCount: number;
  charactersCount: number;
}

export default function DiscoverPage() {
  const t = useTranslations();
  const [projects, setProjects] = useState<PublicProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchPublicProjects = async () => {
      try {
        const response = await fetch('/api/projects/public');
        if (response.ok) {
          const data = await response.json();
          setProjects(data.projects || []);
        }
      } catch (error) {
        console.error('Failed to fetch public projects:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPublicProjects();
  }, []);

  // Filter projects by search query
  const filteredProjects = projects.filter((project) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      project.name.toLowerCase().includes(query) ||
      project.story.title?.toLowerCase().includes(query) ||
      project.story.concept?.toLowerCase().includes(query) ||
      project.owner.name?.toLowerCase().includes(query)
    );
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays < 1) return t('discover.today');
    if (diffDays === 1) return t('discover.yesterday');
    if (diffDays < 7) return t('discover.daysAgo', { days: diffDays });
    if (diffDays < 30) return t('discover.weeksAgo', { weeks: Math.floor(diffDays / 7) });
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-white/5 bg-black/20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20">
                <Globe className="w-8 h-8 text-green-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{t('discover.title')}</h1>
                <p className="text-muted-foreground">
                  {t('discover.subtitle')}
                </p>
              </div>
            </div>

            {/* Search */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('discover.searchPlaceholder')}
                className="pl-10 bg-white/5 border-white/10"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[40vh]">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">{t('discover.loading')}</p>
            </div>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
            <div className="p-4 rounded-full bg-white/5 mb-4">
              <Film className="w-12 h-12 text-muted-foreground/50" />
            </div>
            <h2 className="text-xl font-semibold mb-2">
              {searchQuery ? t('discover.noProjectsFound') : t('discover.noPublicProjects')}
            </h2>
            <p className="text-muted-foreground max-w-md">
              {searchQuery
                ? t('discover.tryAdjusting')
                : t('discover.beFirst')}
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-6">
              {filteredProjects.length} {filteredProjects.length !== 1 ? t('discover.publicProjectsPlural') : t('discover.publicProjects')}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProjects.map((project, index) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link href={`/project/${project.id}`}>
                    <Card className="glass border-white/10 overflow-hidden hover:border-green-500/30 transition-colors group cursor-pointer">
                      {/* Thumbnail */}
                      <div className="relative aspect-video bg-black/30">
                        {project.thumbnailUrl ? (
                          <Image
                            src={project.thumbnailUrl}
                            alt={project.name}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Film className="w-12 h-12 text-muted-foreground/30" />
                          </div>
                        )}

                        {/* Overlay on hover */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="p-3 rounded-full bg-white/20 backdrop-blur-sm">
                            <Play className="w-6 h-6 text-white" />
                          </div>
                        </div>

                        {/* Public badge */}
                        <div className="absolute top-2 right-2">
                          <Badge className="bg-green-500/80 text-white border-0 text-xs">
                            <Globe className="w-3 h-3 mr-1" />
                            {t('discover.publicBadge')}
                          </Badge>
                        </div>

                        {/* Stats */}
                        <div className="absolute bottom-2 left-2 flex gap-2">
                          <Badge variant="outline" className="bg-black/60 border-0 text-xs">
                            <ImageIcon className="w-3 h-3 mr-1" />
                            {project.scenesCount}
                          </Badge>
                          <Badge variant="outline" className="bg-black/60 border-0 text-xs">
                            <Users className="w-3 h-3 mr-1" />
                            {project.charactersCount}
                          </Badge>
                        </div>
                      </div>

                      <CardContent className="p-4 space-y-3">
                        {/* Title */}
                        <div>
                          <h3 className="font-semibold truncate group-hover:text-green-400 transition-colors">
                            {project.name}
                          </h3>
                          {project.story.title && (
                            <p className="text-sm text-muted-foreground truncate">
                              {project.story.title}
                            </p>
                          )}
                        </div>

                        {/* Genre & Style */}
                        <div className="flex gap-2">
                          {project.story.genre && (
                            <Badge variant="outline" className="border-white/10 text-xs capitalize">
                              {project.story.genre}
                            </Badge>
                          )}
                          <Badge variant="outline" className="border-white/10 text-xs">
                            {project.style}
                          </Badge>
                        </div>

                        {/* Owner & Date */}
                        <div className="flex items-center justify-between pt-2 border-t border-white/5">
                          <div className="flex items-center gap-2">
                            <Avatar className="w-6 h-6">
                              <AvatarImage src={project.owner.image || undefined} />
                              <AvatarFallback className="text-xs">
                                {project.owner.name?.charAt(0) || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm text-muted-foreground truncate max-w-[100px]">
                              {project.owner.name || t('discover.anonymous')}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(project.updatedAt)}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
