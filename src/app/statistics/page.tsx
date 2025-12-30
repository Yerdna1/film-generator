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
    byType: Record<string, { count: number; credits: number; realCost: number }>;
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
        throw new Error(data.details || data.error || 'Failed to fetch statistics');
      }

      if (data.error) {
        throw new Error(data.details || data.error);
      }

      setStats(data);
    } catch (err) {
      console.error('Statistics fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load statistics');
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
          <p className="text-muted-foreground mb-4">Please sign in to view statistics</p>
          <Link href="/auth/login">
            <Button>Sign In</Button>
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
            Retry
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
                Usage Statistics
              </h1>
              <p className="text-xs text-muted-foreground">Track your API costs and usage</p>
            </div>
            {stats.isAdmin && (
              <Badge className="bg-purple-500/20 text-purple-400 border-0">
                Admin View (Real Costs)
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
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
                    <p className="text-xs text-muted-foreground">Total API Cost</p>
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
                    <p className="text-xs text-muted-foreground">Total Operations</p>
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
                    <p className="text-xs text-muted-foreground">Credits Spent</p>
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
                    <p className="text-xs text-muted-foreground">Projects</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Cost by Type */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="glass border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-purple-400" />
                  Cost by Type
                </CardTitle>
                <CardDescription>Breakdown of API costs by generation type</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {sortedTypes.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No usage data yet</p>
                ) : (
                  sortedTypes.map(([type, data]) => {
                    const Icon = typeIcons[type] || FileText;
                    const colorClass = typeColors[type] || 'text-gray-400 bg-gray-500/20';
                    const percentage = totalRealCost > 0 ? (data.realCost / totalRealCost) * 100 : 0;

                    return (
                      <div key={type} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorClass.split(' ')[1]}`}>
                              <Icon className={`w-4 h-4 ${colorClass.split(' ')[0]}`} />
                            </div>
                            <div>
                              <p className="font-medium capitalize">{type}</p>
                              <p className="text-xs text-muted-foreground">
                                {data.count} operations
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-green-400">
                              {formatCost(data.realCost)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {data.credits} credits
                            </p>
                          </div>
                        </div>
                        <Progress value={percentage} className="h-1.5" />
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Cost by Provider */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="glass border-white/10 h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-purple-400" />
                    Cost by Provider
                  </CardTitle>
                  <CardDescription>Which APIs you're using the most</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {sortedProviders.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No provider data yet</p>
                  ) : (
                    sortedProviders.map(([provider, data]) => (
                      <div
                        key={provider}
                        className="flex items-center justify-between p-3 glass rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{providerLabels[provider] || provider}</p>
                          <p className="text-xs text-muted-foreground">{data.count} calls</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-green-400">
                            {formatCost(data.realCost)}
                          </p>
                          <p className="text-xs text-muted-foreground">{data.credits} credits</p>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Cost by Project */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="glass border-white/10 h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Folder className="w-5 h-5 text-purple-400" />
                    Cost by Project
                  </CardTitle>
                  <CardDescription>How much each project has cost</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {sortedProjects.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No project costs yet</p>
                  ) : (
                    sortedProjects.map(([projectId, data]) => (
                      <Link
                        key={projectId}
                        href={`/project/${projectId}`}
                        className="flex items-center justify-between p-3 glass rounded-lg hover:bg-white/5 transition-colors"
                      >
                        <div>
                          <p className="font-medium">{data.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-green-400">
                            {formatCost(data.realCost)}
                          </p>
                          <p className="text-xs text-muted-foreground">{data.credits} credits</p>
                        </div>
                      </Link>
                    ))
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Recent Transactions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="glass border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-purple-400" />
                  Recent Activity
                </CardTitle>
                <CardDescription>Your latest API operations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {stats.recentTransactions.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No activity yet</p>
                  ) : (
                    stats.recentTransactions.slice(0, 20).map((tx) => {
                      const Icon = typeIcons[tx.type] || FileText;
                      const colorClass = typeColors[tx.type] || 'text-gray-400 bg-gray-500/20';

                      return (
                        <div
                          key={tx.id}
                          className="flex items-center justify-between p-3 glass rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorClass.split(' ')[1]}`}>
                              <Icon className={`w-4 h-4 ${colorClass.split(' ')[0]}`} />
                            </div>
                            <div>
                              <p className="font-medium text-sm">
                                {tx.description || tx.type}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {tx.provider ? providerLabels[tx.provider] || tx.provider : 'Unknown'} •{' '}
                                {new Date(tx.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-green-400 text-sm">
                              {formatCostCompact(tx.realCost)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {Math.abs(tx.amount)} credits
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
