'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, TrendingDown, ChevronDown, Sparkles, Video, Mic, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { COSTS } from '@/lib/services/credits';

interface CreditsDisplayProps {
  className?: string;
}

interface CreditsData {
  credits: {
    balance: number;
    totalSpent: number;
    totalEarned: number;
  };
  costs: typeof COSTS;
  transactions?: Array<{
    id: string;
    amount: number;
    type: string;
    description: string | null;
    createdAt: string;
  }>;
}

export function CreditsDisplay({ className }: CreditsDisplayProps) {
  const t = useTranslations();
  const [data, setData] = useState<CreditsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const fetchCredits = async () => {
    try {
      const res = await fetch('/api/credits?history=true&limit=10');
      if (res.ok) {
        const data = await res.json();
        setData(data);
      }
    } catch (error) {
      console.error('Failed to fetch credits:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCredits();

    // Refresh every 30 seconds
    const interval = setInterval(fetchCredits, 30000);
    return () => clearInterval(interval);
  }, []);

  // Listen for credit updates
  useEffect(() => {
    const handleCreditUpdate = () => {
      fetchCredits();
    };

    window.addEventListener('credits-updated', handleCreditUpdate);
    return () => window.removeEventListener('credits-updated', handleCreditUpdate);
  }, []);

  if (loading || !data) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="w-20 h-8 bg-white/5 animate-pulse rounded-lg" />
      </div>
    );
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="w-3 h-3" />;
      case 'image':
        return <Image className="w-3 h-3" />;
      case 'voiceover':
        return <Mic className="w-3 h-3" />;
      default:
        return <Sparkles className="w-3 h-3" />;
    }
  };

  const getBalanceColor = () => {
    if (data.credits.balance > 300) return 'text-green-400';
    if (data.credits.balance > 100) return 'text-amber-400';
    return 'text-red-400';
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className={`flex items-center gap-2 px-3 py-2 h-auto hover:bg-white/5 ${className}`}
        >
          <Coins className="w-4 h-4 text-amber-400" />
          <span className={`font-semibold ${getBalanceColor()}`}>
            {data.credits.balance}
          </span>
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 bg-[#1a1a2e]/95 backdrop-blur-xl border-white/10" align="end">
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-400" />
              {t('credits.title')}
            </h4>
            <Badge variant="outline" className={`${getBalanceColor()} border-current`}>
              {data.credits.balance} {t('credits.points')}
            </Badge>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="glass rounded-lg p-2 text-center">
              <p className="text-xs text-muted-foreground">{t('credits.spent')}</p>
              <p className="font-medium text-red-400">-{data.credits.totalSpent}</p>
            </div>
            <div className="glass rounded-lg p-2 text-center">
              <p className="text-xs text-muted-foreground">{t('credits.earned')}</p>
              <p className="font-medium text-green-400">+{data.credits.totalEarned}</p>
            </div>
          </div>
        </div>

        {/* Cost Reference */}
        <div className="p-4 border-b border-white/10">
          <h5 className="text-xs font-medium text-muted-foreground mb-2">
            {t('credits.costs')}
          </h5>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Image className="w-3 h-3 text-purple-400" />
                {t('credits.image')}
              </span>
              <span className="text-muted-foreground">{COSTS.IMAGE_GENERATION}p</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Video className="w-3 h-3 text-orange-400" />
                {t('credits.video')}
              </span>
              <span className="text-muted-foreground">{COSTS.VIDEO_GENERATION}p</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Mic className="w-3 h-3 text-cyan-400" />
                {t('credits.voiceover')}
              </span>
              <span className="text-muted-foreground">{COSTS.VOICEOVER_LINE}p</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-green-400" />
                {t('credits.scene')}
              </span>
              <span className="text-muted-foreground">{COSTS.SCENE_GENERATION}p</span>
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        {data.transactions && data.transactions.length > 0 && (
          <div className="p-4 max-h-48 overflow-y-auto">
            <h5 className="text-xs font-medium text-muted-foreground mb-2">
              {t('credits.recentActivity')}
            </h5>
            <div className="space-y-2">
              {data.transactions.slice(0, 5).map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    {getTypeIcon(tx.type)}
                    <span className="text-muted-foreground truncate max-w-[150px]">
                      {tx.description || tx.type}
                    </span>
                  </div>
                  <span className={tx.amount < 0 ? 'text-red-400' : 'text-green-400'}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
