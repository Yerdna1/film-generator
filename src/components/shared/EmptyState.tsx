'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Film, Plus, Sparkles, Clapperboard } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  onCreateProject: () => void;
}

export function EmptyState({ onCreateProject }: EmptyStateProps) {
  const t = useTranslations();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center py-20"
    >
      {/* Animated illustration */}
      <div className="relative mb-8">
        {/* Background glow */}
        <div className="absolute inset-0 bg-purple-500/20 blur-3xl rounded-full" />

        {/* Main icon container */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
          className="relative"
        >
          <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 flex items-center justify-center border border-white/10">
            <Film className="w-16 h-16 text-purple-400" />
          </div>

          {/* Floating elements */}
          <motion.div
            animate={{
              y: [0, -10, 0],
              rotate: [0, 5, 0],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute -top-4 -right-4 w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/30"
          >
            <Sparkles className="w-6 h-6 text-white" />
          </motion.div>

          <motion.div
            animate={{
              y: [0, 10, 0],
              rotate: [0, -5, 0],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 0.5,
            }}
            className="absolute -bottom-4 -left-4 w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-lg shadow-pink-500/30"
          >
            <Clapperboard className="w-5 h-5 text-white" />
          </motion.div>
        </motion.div>
      </div>

      {/* Text content */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-center max-w-md"
      >
        <h2 className="text-2xl font-bold mb-3">
          <span className="gradient-text">{t('dashboard.noProjects')}</span>
        </h2>
        <p className="text-muted-foreground mb-8">
          {t('dashboard.noProjectsDescription')}
        </p>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 }}
        >
          <Button
            size="lg"
            onClick={onCreateProject}
            className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white border-0 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all duration-300 h-14 px-8 text-lg"
          >
            <Plus className="w-5 h-5 mr-2" />
            {t('dashboard.createFirst')}
            <Sparkles className="w-4 h-4 ml-2 opacity-70" />
          </Button>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl"
      >
        {[
          {
            icon: '🎬',
            title: t('dashboard.features.aiScripts'),
            description: t('dashboard.features.aiScriptsDesc'),
          },
          {
            icon: '🎨',
            title: t('dashboard.features.multipleStyles'),
            description: t('dashboard.features.multipleStylesDesc'),
          },
          {
            icon: '🎙️',
            title: t('dashboard.features.voiceGeneration'),
            description: t('dashboard.features.voiceGenerationDesc'),
          },
        ].map((feature, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 + index * 0.1 }}
            className="glass rounded-xl p-5 text-center"
          >
            <div className="text-3xl mb-3">{feature.icon}</div>
            <h3 className="font-semibold mb-1">{feature.title}</h3>
            <p className="text-sm text-muted-foreground">{feature.description}</p>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}
