'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowLeft,
  User,
  Film,
  Coins,
  Calendar,
  Settings,
  Shield,
  TrendingUp,
  Image as ImageIcon,
  Video,
  Mic,
  FileText,
  Award,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useProjectStore } from '@/lib/stores/project-store';

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

export default function ProfilePage() {
  const { data: session } = useSession();
  const t = useTranslations('profile');
  const tAuth = useTranslations('auth');
  const { projects } = useProjectStore();
  const [creditsData, setCreditsData] = useState<CreditsData | null>(null);

  useEffect(() => {
    const fetchCredits = async () => {
      try {
        const res = await fetch('/api/credits?history=true&limit=20');
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

  // Calculate stats
  const totalScenes = projects.reduce((acc, p) => acc + p.scenes.length, 0);
  const totalCharacters = projects.reduce((acc, p) => acc + p.characters.length, 0);
  const completedProjects = projects.filter((p) => p.isComplete).length;

  // Calculate usage breakdown from transactions
  const usageBreakdown = creditsData?.transactions?.reduce(
    (acc, tx) => {
      if (tx.amount < 0) {
        const absAmount = Math.abs(tx.amount);
        switch (tx.type) {
          case 'video':
            acc.videos += absAmount;
            acc.videoCount++;
            break;
          case 'image':
            acc.images += absAmount;
            acc.imageCount++;
            break;
          case 'voiceover':
            acc.voiceovers += absAmount;
            acc.voiceoverCount++;
            break;
          case 'scene':
            acc.scenes += absAmount;
            acc.sceneCount++;
            break;
        }
      }
      return acc;
    },
    { images: 0, videos: 0, voiceovers: 0, scenes: 0, imageCount: 0, videoCount: 0, voiceoverCount: 0, sceneCount: 0 }
  ) || { images: 0, videos: 0, voiceovers: 0, scenes: 0, imageCount: 0, videoCount: 0, voiceoverCount: 0, sceneCount: 0 };

  const userName = session?.user?.name || t('localUser');
  const userEmail = session?.user?.email || t('usingLocalStorage');
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-40 glass-strong border-b border-white/5">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="font-semibold">{t('title')}</h1>
                <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
              </div>
            </div>
            <Link href="/settings">
              <Button variant="ghost" size="icon">
                <Settings className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Profile Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="glass border-white/10 overflow-hidden">
              <div className="h-24 bg-gradient-to-r from-purple-600/30 via-cyan-600/30 to-pink-600/30" />
              <CardContent className="p-6 -mt-12">
                <div className="flex flex-col md:flex-row md:items-end gap-6">
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-4xl font-bold text-white shadow-xl border-4 border-background">
                    {userInitial}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h2 className="text-2xl font-bold">{userName}</h2>
                      <Badge variant="outline" className="border-cyan-500/30 text-cyan-400">
                        {session ? t('proPlan') : t('freePlan')}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground">{userEmail}</p>
                    <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {t('joined')} Dec 2024
                      </span>
                      <span className="flex items-center gap-1">
                        <Film className="w-4 h-4" />
                        {projects.length} {t('projects')}
                      </span>
                    </div>
                  </div>
                  {!session && (
                    <div className="flex gap-2">
                      <Link href="/auth/login">
                        <Button variant="outline" className="border-white/10">
                          {tAuth('signIn')}
                        </Button>
                      </Link>
                      <Link href="/auth/register">
                        <Button className="bg-gradient-to-r from-purple-600 to-cyan-600 text-white border-0">
                          {tAuth('createAccount')}
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Credits Overview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="glass border-white/10 border-l-4 border-l-amber-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Coins className="w-5 h-5 text-amber-400" />
                  {t('creditsOverview')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{t('availableBalance')}</p>
                    <p className="text-4xl font-bold text-amber-400">
                      {creditsData?.credits.balance || 0}
                      <span className="text-lg text-muted-foreground ml-1">pts</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{t('totalSpent')}</p>
                    <p className="text-2xl font-semibold text-red-400">
                      -{creditsData?.credits.totalSpent || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{t('totalEarned')}</p>
                    <p className="text-2xl font-semibold text-green-400">
                      +{creditsData?.credits.totalEarned || 0}
                    </p>
                  </div>
                </div>
                <div className="mt-6">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">{t('usage')}</span>
                    <span>
                      {creditsData?.credits.totalSpent || 0} / {creditsData?.credits.totalEarned || 0}
                    </span>
                  </div>
                  <Progress
                    value={creditsData ? (creditsData.credits.totalSpent / creditsData.credits.totalEarned) * 100 : 0}
                    className="h-2"
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Stats Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            <Card className="glass border-white/10">
              <CardContent className="p-4 text-center">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center mx-auto mb-2">
                  <Film className="w-5 h-5 text-purple-400" />
                </div>
                <p className="text-2xl font-bold">{projects.length}</p>
                <p className="text-xs text-muted-foreground">{t('stats.projects')}</p>
              </CardContent>
            </Card>
            <Card className="glass border-white/10">
              <CardContent className="p-4 text-center">
                <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center mx-auto mb-2">
                  <Award className="w-5 h-5 text-green-400" />
                </div>
                <p className="text-2xl font-bold">{completedProjects}</p>
                <p className="text-xs text-muted-foreground">{t('stats.completed')}</p>
              </CardContent>
            </Card>
            <Card className="glass border-white/10">
              <CardContent className="p-4 text-center">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center mx-auto mb-2">
                  <User className="w-5 h-5 text-cyan-400" />
                </div>
                <p className="text-2xl font-bold">{totalCharacters}</p>
                <p className="text-xs text-muted-foreground">{t('stats.characters')}</p>
              </CardContent>
            </Card>
            <Card className="glass border-white/10">
              <CardContent className="p-4 text-center">
                <div className="w-10 h-10 rounded-xl bg-pink-500/20 flex items-center justify-center mx-auto mb-2">
                  <FileText className="w-5 h-5 text-pink-400" />
                </div>
                <p className="text-2xl font-bold">{totalScenes}</p>
                <p className="text-xs text-muted-foreground">{t('stats.scenes')}</p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Generation Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="glass border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-cyan-400" />
                  {t('generationStats')}
                </CardTitle>
                <CardDescription>{t('generationStatsDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-4 gap-4">
                  <div className="glass rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                        <ImageIcon className="w-5 h-5 text-purple-400" />
                      </div>
                      <div>
                        <p className="font-semibold">{usageBreakdown.imageCount}</p>
                        <p className="text-xs text-muted-foreground">{t('images')}</p>
                      </div>
                    </div>
                    <p className="text-sm text-purple-400">{usageBreakdown.images} {t('credits')}</p>
                  </div>
                  <div className="glass rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                        <Video className="w-5 h-5 text-orange-400" />
                      </div>
                      <div>
                        <p className="font-semibold">{usageBreakdown.videoCount}</p>
                        <p className="text-xs text-muted-foreground">{t('videos')}</p>
                      </div>
                    </div>
                    <p className="text-sm text-orange-400">{usageBreakdown.videos} {t('credits')}</p>
                  </div>
                  <div className="glass rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                        <Mic className="w-5 h-5 text-violet-400" />
                      </div>
                      <div>
                        <p className="font-semibold">{usageBreakdown.voiceoverCount}</p>
                        <p className="text-xs text-muted-foreground">{t('voiceovers')}</p>
                      </div>
                    </div>
                    <p className="text-sm text-violet-400">{usageBreakdown.voiceovers} {t('credits')}</p>
                  </div>
                  <div className="glass rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-green-400" />
                      </div>
                      <div>
                        <p className="font-semibold">{usageBreakdown.sceneCount}</p>
                        <p className="text-xs text-muted-foreground">{t('stats.scenes')}</p>
                      </div>
                    </div>
                    <p className="text-sm text-green-400">{usageBreakdown.scenes} {t('credits')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="grid md:grid-cols-3 gap-4"
          >
            <Link href="/settings">
              <Card className="glass border-white/10 cursor-pointer hover:bg-white/5 transition-colors">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <Settings className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="font-medium">{t('quickActions.settings')}</p>
                    <p className="text-xs text-muted-foreground">{t('quickActions.settingsDesc')}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/help">
              <Card className="glass border-white/10 cursor-pointer hover:bg-white/5 transition-colors">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <p className="font-medium">{t('quickActions.help')}</p>
                    <p className="text-xs text-muted-foreground">{t('quickActions.helpDesc')}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/">
              <Card className="glass border-white/10 cursor-pointer hover:bg-white/5 transition-colors">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <p className="font-medium">{t('quickActions.dashboard')}</p>
                    <p className="text-xs text-muted-foreground">{t('quickActions.dashboardDesc')}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
