'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Image as ImageIcon,
  Video,
  RefreshCw,
  Plus,
  DollarSign,
  Coins,
  TrendingUp,
  Loader2
} from 'lucide-react';

interface ProjectStatistics {
  projectId: string;
  projectName: string;
  totalCredits: number;
  totalRealCost: number;
  multiplier: number;
  isAdmin: boolean;
  summary: {
    totalGenerations: number;
    totalRegenerations: number;
    imageGenerations: number;
    imageRegenerations: number;
    videoGenerations: number;
    videoRegenerations: number;
  };
  byType: Record<string, {
    count: number;
    credits: number;
    realCost: number;
    generations: number;
    regenerations: number;
  }>;
  byProvider: Record<string, {
    count: number;
    credits: number;
    realCost: number;
  }>;
  recentTransactions: Array<{
    id: string;
    amount: number;
    realCost: number;
    type: string;
    provider: string | null;
    description: string | null;
    createdAt: string;
  }>;
}

export default function ProjectStatisticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const router = useRouter();
  const [stats, setStats] = useState<ProjectStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        setLoading(true);
        const response = await fetch(`/api/statistics/project/${projectId}`);
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to fetch project statistics');
        }
        const data = await response.json();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [projectId]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-background/95 p-6">
        <div className="max-w-6xl mx-auto flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading project statistics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-background/95 p-6">
        <div className="max-w-6xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Card className="border-red-500/20">
            <CardContent className="p-6">
              <p className="text-red-400">{error}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const { summary } = stats;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/95 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/statistics')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{stats.projectName}</h1>
            <p className="text-sm text-muted-foreground">Project Statistics</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Total Cost */}
          <Card className="bg-gradient-to-br from-green-950/30 to-green-900/10 border-green-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-400" />
                Total Cost
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">
                {formatCurrency(stats.totalRealCost)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.totalCredits} credits used
              </p>
            </CardContent>
          </Card>

          {/* Total Operations */}
          <Card className="bg-gradient-to-br from-blue-950/30 to-blue-900/10 border-blue-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                Total Operations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-400">
                {summary.totalGenerations + summary.totalRegenerations}
              </div>
              <div className="flex gap-2 mt-1">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-500/30 text-emerald-400">
                  <Plus className="w-2.5 h-2.5 mr-1" />
                  {summary.totalGenerations} new
                </Badge>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-orange-500/30 text-orange-400">
                  <RefreshCw className="w-2.5 h-2.5 mr-1" />
                  {summary.totalRegenerations} regen
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Image Stats */}
          <Card className="bg-gradient-to-br from-purple-950/30 to-purple-900/10 border-purple-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-purple-400" />
                Images
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-400">
                {summary.imageGenerations + summary.imageRegenerations}
              </div>
              <div className="flex gap-2 mt-1">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-500/30 text-emerald-400">
                  <Plus className="w-2.5 h-2.5 mr-1" />
                  {summary.imageGenerations}
                </Badge>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-orange-500/30 text-orange-400">
                  <RefreshCw className="w-2.5 h-2.5 mr-1" />
                  {summary.imageRegenerations}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Video Stats */}
          <Card className="bg-gradient-to-br from-cyan-950/30 to-cyan-900/10 border-cyan-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Video className="w-4 h-4 text-cyan-400" />
                Videos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-cyan-400">
                {summary.videoGenerations + summary.videoRegenerations}
              </div>
              <div className="flex gap-2 mt-1">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-500/30 text-emerald-400">
                  <Plus className="w-2.5 h-2.5 mr-1" />
                  {summary.videoGenerations}
                </Badge>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-orange-500/30 text-orange-400">
                  <RefreshCw className="w-2.5 h-2.5 mr-1" />
                  {summary.videoRegenerations}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Breakdown by Type */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* By Type */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Breakdown by Type</CardTitle>
              <CardDescription>Cost and generation counts per operation type</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(stats.byType).length === 0 ? (
                <p className="text-sm text-muted-foreground">No operations yet</p>
              ) : (
                Object.entries(stats.byType).map(([type, data]) => (
                  <div
                    key={type}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-md bg-primary/10">
                        {type === 'image' ? (
                          <ImageIcon className="w-4 h-4 text-purple-400" />
                        ) : type === 'video' ? (
                          <Video className="w-4 h-4 text-cyan-400" />
                        ) : (
                          <Coins className="w-4 h-4 text-yellow-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium capitalize">{type}</p>
                        <div className="flex gap-2 mt-0.5">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-500/30 text-emerald-400">
                            <Plus className="w-2.5 h-2.5 mr-1" />
                            {data.generations}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-orange-500/30 text-orange-400">
                            <RefreshCw className="w-2.5 h-2.5 mr-1" />
                            {data.regenerations}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-green-400">{formatCurrency(data.realCost)}</p>
                      <p className="text-xs text-muted-foreground">{data.credits} credits</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* By Provider */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Breakdown by Provider</CardTitle>
              <CardDescription>Cost distribution across API providers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(stats.byProvider).length === 0 ? (
                <p className="text-sm text-muted-foreground">No operations yet</p>
              ) : (
                Object.entries(stats.byProvider).map(([provider, data]) => (
                  <div
                    key={provider}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                  >
                    <div>
                      <p className="font-medium capitalize">{provider}</p>
                      <p className="text-xs text-muted-foreground">{data.count} operations</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-green-400">{formatCurrency(data.realCost)}</p>
                      <p className="text-xs text-muted-foreground">{data.credits} credits</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Activity</CardTitle>
            <CardDescription>Last 20 transactions for this project</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.recentTransactions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No transactions yet</p>
            ) : (
              <div className="space-y-2">
                {stats.recentTransactions.map((tx) => {
                  const isRegeneration = tx.description?.toLowerCase().includes('regeneration');
                  return (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-md ${isRegeneration ? 'bg-orange-500/10' : 'bg-emerald-500/10'}`}>
                          {isRegeneration ? (
                            <RefreshCw className={`w-4 h-4 ${isRegeneration ? 'text-orange-400' : 'text-emerald-400'}`} />
                          ) : (
                            <Plus className="w-4 h-4 text-emerald-400" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium capitalize">{tx.type}</p>
                            {isRegeneration && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-orange-500/30 text-orange-400">
                                Regen
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {tx.provider && <span className="capitalize">{tx.provider} • </span>}
                            {formatDate(tx.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-red-400">{tx.amount} credits</p>
                        <p className="text-xs text-green-400">{formatCurrency(tx.realCost)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
