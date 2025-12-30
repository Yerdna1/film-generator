'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import {
  Plus,
  Search,
  Film,
  Clock,
  Layers,
  FolderOpen,
  Sparkles,
  Coins,
  TrendingDown,
  Video,
  Image as ImageIcon,
  Mic,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useProjectStore } from '@/lib/stores/project-store';
import { ProjectCard } from '@/components/project/ProjectCard';
import { NewProjectDialog } from '@/components/project/NewProjectDialog';
import { EmptyState } from '@/components/shared/EmptyState';
import { COSTS } from '@/lib/services/credits';

interface CreditsData {
  credits: {
    balance: number;
    totalSpent: number;
    totalEarned: number;
  };
  transactions?: Array<{
    id: string;
    amount: number;
    type: string;
    description: string | null;
    createdAt: string;
  }>;
}

export default function DashboardPage() {
  const t = useTranslations();
  const { projects } = useProjectStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [creditsData, setCreditsData] = useState<CreditsData | null>(null);

  // Fetch credits data
  useEffect(() => {
    const fetchCredits = async () => {
      try {
        const res = await fetch('/api/credits?history=true&limit=10');
        if (res.ok) {
          const data = await res.json();
          setCreditsData(data);
        }
      } catch (error) {
        console.error('Failed to fetch credits:', error);
      }
    };
    fetchCredits();
  }, []);

  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const recentProjects = [...filteredProjects]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 4);

  const stats = {
    total: projects.length,
    inProgress: projects.filter((p) => !p.isComplete).length,
    completed: projects.filter((p) => p.isComplete).length,
    totalScenes: projects.reduce((acc, p) => acc + p.scenes.length, 0),
  };

  // Calculate credits breakdown from transactions
  const creditsBreakdown = creditsData?.transactions?.reduce(
    (acc, tx) => {
      if (tx.amount < 0) {
        const absAmount = Math.abs(tx.amount);
        switch (tx.type) {
          case 'video':
            acc.videos += absAmount;
            break;
          case 'image':
            acc.images += absAmount;
            break;
          case 'voiceover':
            acc.voiceovers += absAmount;
            break;
          case 'scene':
            acc.scenes += absAmount;
            break;
          default:
            acc.other += absAmount;
        }
      }
      return acc;
    },
    { images: 0, videos: 0, voiceovers: 0, scenes: 0, other: 0 }
  ) || { images: 0, videos: 0, voiceovers: 0, scenes: 0, other: 0 };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-12"
      >
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-5xl font-bold mb-3"
            >
              <span className="gradient-text">{t('dashboard.title')}</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg text-muted-foreground max-w-xl"
            >
              {t('dashboard.subtitle')}
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Button
              size="lg"
              onClick={() => setNewProjectOpen(true)}
              className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white border-0 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all duration-300 h-12 px-6"
            >
              <Plus className="w-5 h-5 mr-2" />
              {t('nav.newProject')}
              <Sparkles className="w-4 h-4 ml-2 opacity-70" />
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      {projects.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12"
        >
          {[
            { label: 'Total Projects', value: stats.total, icon: Film, color: 'purple' },
            { label: 'In Progress', value: stats.inProgress, icon: Clock, color: 'cyan' },
            { label: 'Completed', value: stats.completed, icon: Sparkles, color: 'green' },
            { label: 'Total Scenes', value: stats.totalScenes, icon: Layers, color: 'pink' },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + index * 0.1 }}
              className="glass rounded-xl p-4 card-hover"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    stat.color === 'purple'
                      ? 'bg-purple-500/20 text-purple-400'
                      : stat.color === 'cyan'
                      ? 'bg-cyan-500/20 text-cyan-400'
                      : stat.color === 'green'
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-pink-500/20 text-pink-400'
                  }`}
                >
                  <stat.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Credits Usage Card */}
      {creditsData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-12"
        >
          <div className="glass rounded-2xl p-6 border border-amber-500/20">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              {/* Credits Balance */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
                  <Coins className="w-7 h-7 text-amber-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('dashboard.creditsBalance')}</p>
                  <p className="text-3xl font-bold text-amber-400">
                    {creditsData.credits.balance}
                    <span className="text-lg text-muted-foreground ml-1">{t('credits.points')}</span>
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="flex-1 max-w-md">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">{t('dashboard.creditsUsed')}</span>
                  <span className="text-amber-400">
                    {creditsData.credits.totalSpent} / {creditsData.credits.totalEarned}
                  </span>
                </div>
                <Progress
                  value={(creditsData.credits.totalSpent / creditsData.credits.totalEarned) * 100}
                  className="h-2"
                />
              </div>

              {/* Usage Breakdown */}
              <div className="grid grid-cols-4 gap-3">
                <div className="text-center">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center mx-auto mb-1">
                    <ImageIcon className="w-4 h-4 text-purple-400" />
                  </div>
                  <p className="text-lg font-semibold">{creditsBreakdown.images}</p>
                  <p className="text-[10px] text-muted-foreground">{t('credits.image')}</p>
                </div>
                <div className="text-center">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center mx-auto mb-1">
                    <Video className="w-4 h-4 text-orange-400" />
                  </div>
                  <p className="text-lg font-semibold">{creditsBreakdown.videos}</p>
                  <p className="text-[10px] text-muted-foreground">{t('credits.video')}</p>
                </div>
                <div className="text-center">
                  <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center mx-auto mb-1">
                    <Mic className="w-4 h-4 text-violet-400" />
                  </div>
                  <p className="text-lg font-semibold">{creditsBreakdown.voiceovers}</p>
                  <p className="text-[10px] text-muted-foreground">{t('credits.voiceover')}</p>
                </div>
                <div className="text-center">
                  <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center mx-auto mb-1">
                    <FileText className="w-4 h-4 text-green-400" />
                  </div>
                  <p className="text-lg font-semibold">{creditsBreakdown.scenes}</p>
                  <p className="text-[10px] text-muted-foreground">{t('credits.scene')}</p>
                </div>
              </div>
            </div>

            {/* Recent Transactions */}
            {creditsData.transactions && creditsData.transactions.length > 0 && (
              <div className="mt-6 pt-4 border-t border-white/5">
                <p className="text-xs text-muted-foreground mb-3">{t('credits.recentActivity')}</p>
                <div className="flex flex-wrap gap-2">
                  {creditsData.transactions.slice(0, 5).map((tx) => (
                    <div
                      key={tx.id}
                      className="glass rounded-lg px-3 py-1.5 text-xs flex items-center gap-2"
                    >
                      {tx.type === 'video' && <Video className="w-3 h-3 text-orange-400" />}
                      {tx.type === 'image' && <ImageIcon className="w-3 h-3 text-purple-400" />}
                      {tx.type === 'voiceover' && <Mic className="w-3 h-3 text-violet-400" />}
                      {tx.type === 'scene' && <FileText className="w-3 h-3 text-green-400" />}
                      <span className="text-muted-foreground truncate max-w-[100px]">
                        {tx.description || tx.type}
                      </span>
                      <span className={tx.amount < 0 ? 'text-red-400' : 'text-green-400'}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Search Bar */}
      {projects.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-8"
        >
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder={t('dashboard.searchProjects')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 glass border-white/10 focus:border-purple-500/50 transition-colors"
            />
          </div>
        </motion.div>
      )}

      {/* Projects Content */}
      {projects.length === 0 ? (
        <EmptyState onCreateProject={() => setNewProjectOpen(true)} />
      ) : (
        <div className="space-y-12">
          {/* Recent Projects */}
          {recentProjects.length > 0 && !searchQuery && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-400" />
                {t('dashboard.recentProjects')}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {recentProjects.map((project, index) => (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 + index * 0.1 }}
                  >
                    <ProjectCard project={project} variant="compact" />
                  </motion.div>
                ))}
              </div>
            </motion.section>
          )}

          {/* All Projects */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-cyan-400" />
              {searchQuery ? `Search Results (${filteredProjects.length})` : t('dashboard.allProjects')}
            </h2>
            {filteredProjects.length === 0 ? (
              <div className="glass rounded-xl p-12 text-center">
                <Search className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No projects found matching &quot;{searchQuery}&quot;</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProjects.map((project, index) => (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 + index * 0.05 }}
                  >
                    <ProjectCard project={project} />
                  </motion.div>
                ))}
              </div>
            )}
          </motion.section>
        </div>
      )}

      {/* New Project Dialog */}
      <NewProjectDialog open={newProjectOpen} onOpenChange={setNewProjectOpen} />
    </div>
  );
}
