'use client';

import { motion } from 'framer-motion';
import { Film, Clock, Sparkles, Layers } from 'lucide-react';
import type { ProjectStats } from './types';

interface StatsGridProps {
  stats: ProjectStats;
}

const statItems = [
  { key: 'total', label: 'Total Projects', icon: Film, color: 'purple' },
  { key: 'inProgress', label: 'In Progress', icon: Clock, color: 'cyan' },
  { key: 'completed', label: 'Completed', icon: Sparkles, color: 'green' },
  { key: 'totalScenes', label: 'Total Scenes', icon: Layers, color: 'pink' },
] as const;

const getColorClasses = (color: string) => {
  const colorMap: Record<string, string> = {
    purple: 'bg-purple-500/20 text-purple-400',
    cyan: 'bg-cyan-500/20 text-cyan-400',
    green: 'bg-green-500/20 text-green-400',
    pink: 'bg-pink-500/20 text-pink-400',
  };
  return colorMap[color] || colorMap.purple;
};

export function StatsGrid({ stats }: StatsGridProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12"
    >
      {statItems.map((stat, index) => (
        <motion.div
          key={stat.key}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 + index * 0.1 }}
          className="glass rounded-xl p-4 card-hover"
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getColorClasses(stat.color)}`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats[stat.key]}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
