'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowLeft,
  BarChart3,
  DollarSign,
  Image as ImageIcon,
  Video,
  Mic,
  FileText,
  Sparkles,
  TrendingUp,
  Folder,
  Zap,
  Loader2,
  RefreshCw,
  Plus,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatCost, formatCostCompact } from '@/lib/services/real-costs';

interface Statistics {
  credits: {
    balance: number;
    totalSpent: number;
    totalEarned: number;
    totalRealCost: number;
  };
  stats: {
    totalTransactions: number;
    totalGenerations: number;
    totalRegenerations: number;
    byType: Record<string, { count: number; credits: number; realCost: number; generations: number; regenerations: number }>;
    byProvider: Record<string, { count: number; credits: number; realCost: number }>;
    byProject: Record<string, { name: string; credits: number; realCost: number }>;
  };
  recentTransactions: Array<{
    id: string;
    amount: number;
    realCost: number;
    type: string;
    provider: string | null;
    description: string | null;
    projectId: string | null;
    createdAt: string;
  }>;
  multiplier: number;
  isAdmin: boolean;
}

const typeIcons: Record<string, React.ElementType> = {
  image: ImageIcon,
  video: Video,
  voiceover: Mic,
  scene: FileText,
  character: Sparkles,
  prompt: FileText,
};

const typeColors: Record<string, string> = {
  image: 'text-purple-400 bg-purple-500/20',
  video: 'text-orange-400 bg-orange-500/20',
  voiceover: 'text-violet-400 bg-violet-500/20',
  scene: 'text-green-400 bg-green-500/20',
  character: 'text-cyan-400 bg-cyan-500/20',
  prompt: 'text-yellow-400 bg-yellow-500/20',
};

const providerLabels: Record<string, string> = {
  gemini: 'Google Gemini',
  'gemini-tts': 'Gemini TTS',
  elevenlabs: 'ElevenLabs',
  grok: 'Grok AI',
  kie: 'Kie.ai',
  nanoBanana: 'Nano Banana',
  claude: 'Claude',
  unknown: 'Other',
};

export default function StatisticsPage() {
  const t = useTranslations();
  const { data: session, status } = useSession();
  const [stats, setStats] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchStatistics();
    }
  }, [status]);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/statistics');
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.details || data.error || t('failedToFetch'));
      }

      if (data.error) {
        throw new Error(data.details || data.error);
      }

      setStats(data);
    } catch (err) {
      console.error('Statistics fetch error:', err);
      setError(err instanceof Error ? err.message : t('failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="glass border-white/10 p-8">
          <p className="text-muted-foreground mb-4">{t('statistics.signInRequired')}</p>
          <Link href="/auth/login">
            <Button>{t('auth.signIn')}</Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="glass border-white/10 p-8">
          <p className="text-red-400">{error}</p>
          <Button onClick={fetchStatistics} className="mt-4">
            {t('statistics.retry')}
          </Button>
        </Card>
      </div>
    );
  }

  if (!stats) return null;

  const totalRealCost = stats.credits.totalRealCost;
  const sortedTypes = Object.entries(stats.stats.byType).sort(
    (a, b) => b[1].realCost - a[1].realCost
  );
  const sortedProviders = Object.entries(stats.stats.byProvider).sort(
    (a, b) => b[1].realCost - a[1].realCost
  );
  const sortedProjects = Object.entries(stats.stats.byProject).sort(
    (a, b) => b[1].realCost - a[1].realCost
  );

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-40 glass-strong border-b border-white/5">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4 h-16">
            <Link href="/">
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex-1">
              <h1 className="font-semibold flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-400" />
                {t('statistics.title')}
              </h1>
              <p className="text-xs text-muted-foreground">{t('statistics.subtitle')}</p>
            </div>
            {stats.isAdmin && (
              <Badge className="bg-purple-500/20 text-purple-400 border-0">
                {t('statistics.adminView')}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 py-8">
        <div className="max-w-[1600px] mx-auto space-y-8">
          {/* Overview Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-4 gap-4"
          >
            <Card className="glass border-white/10">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-400">
                      {formatCost(totalRealCost)}
                    </p>
                    <p className="text-xs text-muted-foreground">{t('statistics.totalApiCost')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass border-white/10">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.stats.totalTransactions}</p>
                    <p className="text-xs text-muted-foreground">{t('statistics.totalOperations')}</p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-500/30 text-emerald-400">
                        <Plus className="w-2.5 h-2.5 mr-1" />
                        {stats.stats.totalGenerations || 0}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-orange-500/30 text-orange-400">
                        <RefreshCw className="w-2.5 h-2.5 mr-1" />
                        {stats.stats.totalRegenerations || 0}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass border-white/10">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.credits.totalSpent}</p>
                    <p className="text-xs text-muted-foreground">{t('statistics.creditsSpent')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass border-white/10">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                    <Folder className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {Object.keys(stats.stats.byProject).length}
                    </p>
                    <p className="text-xs text-muted-foreground">{t('statistics.projects')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* 3-Column Layout: Type | Provider | Project */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Cost by Type */}
            <Card className="glass border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="w-4 h-4 text-purple-400" />
                  {t('statistics.costByType')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {sortedTypes.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4 text-sm">{t('statistics.noUsageData')}</p>
                ) : (
                  sortedTypes.map(([type, data]) => {
                    const Icon = typeIcons[type] || FileText;
                    const colorClass = typeColors[type] || 'text-gray-400 bg-gray-500/20';

                    return (
                      <div key={type} className="flex items-center justify-between p-2 glass rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-md flex items-center justify-center ${colorClass.split(' ')[1]}`}>
                            <Icon className={`w-3.5 h-3.5 ${colorClass.split(' ')[0]}`} />
                          </div>
                          <div>
                            <p className="font-medium text-sm capitalize">{type}</p>
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-muted-foreground">{data.count}</span>
                              {(data.generations > 0 || data.regenerations > 0) && (
                                <>
                                  <span className="text-[10px] text-emerald-400">+{data.generations || 0}</span>
                                  <span className="text-[10px] text-orange-400">↻{data.regenerations || 0}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-green-400 text-sm">
                            {formatCost(data.realCost)}
                          </p>
                          <p className="text-[10px] text-muted-foreground">{data.credits} cr</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            {/* Cost by Provider */}
            <Card className="glass border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Zap className="w-4 h-4 text-amber-400" />
                  {t('statistics.costByProvider')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {sortedProviders.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4 text-sm">{t('statistics.noProviderData')}</p>
                ) : (
                  sortedProviders.map(([provider, data]) => (
                    <div
                      key={provider}
                      className="flex items-center justify-between p-2 glass rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-sm">{providerLabels[provider] || provider}</p>
                        <p className="text-[10px] text-muted-foreground">{data.count} {t('statistics.calls')}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-400 text-sm">
                          {formatCost(data.realCost)}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{data.credits} cr</p>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Cost by Project */}
            <Card className="glass border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Folder className="w-4 h-4 text-cyan-400" />
                  {t('statistics.costByProject')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {sortedProjects.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4 text-sm">{t('statistics.noProjectCosts')}</p>
                ) : (
                  sortedProjects.map(([projectId, data]) => (
                    <Link
                      key={projectId}
                      href={`/statistics/project/${projectId}`}
                      className="flex items-center justify-between p-2 glass rounded-lg hover:bg-white/5 transition-colors group"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{data.name}</p>
                        <p className="text-[10px] text-muted-foreground">{t('statistics.viewDetails')}</p>
                      </div>
                      <div className="text-right ml-2">
                        <p className="font-semibold text-green-400 text-sm">
                          {formatCost(data.realCost)}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{data.credits} cr</p>
                      </div>
                    </Link>
                  ))
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent Transactions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="glass border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="w-4 h-4 text-purple-400" />
                  {t('statistics.recentActivity')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-80 overflow-y-auto">
                  {stats.recentTransactions.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4 text-sm col-span-full">{t('statistics.noActivity')}</p>
                  ) : (
                    stats.recentTransactions.slice(0, 21).map((tx) => {
                      const Icon = typeIcons[tx.type] || FileText;
                      const colorClass = typeColors[tx.type] || 'text-gray-400 bg-gray-500/20';
                      const isRegeneration = tx.description?.toLowerCase().includes('regeneration');

                      return (
                        <div
                          key={tx.id}
                          className="flex items-center justify-between p-2 glass rounded-lg"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div className={`w-7 h-7 rounded-md flex-shrink-0 flex items-center justify-center ${colorClass.split(' ')[1]}`}>
                              <Icon className={`w-3.5 h-3.5 ${colorClass.split(' ')[0]}`} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1">
                                <p className="font-medium text-xs truncate">
                                  {t(`statistics.transactionTypes.${tx.type}`, { defaultValue: tx.type })}
                                </p>
                                {isRegeneration && (
                                  <span className="text-[9px] text-orange-400">↻</span>
                                )}
                              </div>
                              <p className="text-[10px] text-muted-foreground truncate">
                                {tx.provider ? t(`statistics.providers.${tx.provider}`, { defaultValue: tx.provider }) : t('common.unknown')}
                              </p>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0 ml-2">
                            <p className="font-semibold text-green-400 text-xs">
                              {formatCostCompact(tx.realCost)}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {Math.abs(tx.amount)} cr
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
