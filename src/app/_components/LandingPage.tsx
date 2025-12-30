'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Sparkles,
  ArrowRight,
  Wand2,
  Users,
  Image as ImageIcon,
  Clapperboard,
  Volume2,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const features = [
  { icon: Wand2, titleKey: 'features.prompt.title', descKey: 'features.prompt.description', color: 'purple' },
  { icon: Users, titleKey: 'features.characters.title', descKey: 'features.characters.description', color: 'cyan' },
  { icon: ImageIcon, titleKey: 'features.images.title', descKey: 'features.images.description', color: 'pink' },
  { icon: Clapperboard, titleKey: 'features.videos.title', descKey: 'features.videos.description', color: 'orange' },
  { icon: Volume2, titleKey: 'features.voiceover.title', descKey: 'features.voiceover.description', color: 'violet' },
  { icon: Download, titleKey: 'features.export.title', descKey: 'features.export.description', color: 'green' },
];

const getColorClasses = (color: string) => {
  const colorMap: Record<string, string> = {
    purple: 'bg-purple-500/20 text-purple-400',
    cyan: 'bg-cyan-500/20 text-cyan-400',
    pink: 'bg-pink-500/20 text-pink-400',
    orange: 'bg-orange-500/20 text-orange-400',
    violet: 'bg-violet-500/20 text-violet-400',
    green: 'bg-green-500/20 text-green-400',
  };
  return colorMap[color] || colorMap.purple;
};

export function LandingPage() {
  const tLanding = useTranslations('landing');
  const tAuth = useTranslations('auth');

  return (
    <div className="min-h-[calc(100vh-200px)]">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-4xl mx-auto"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 glass rounded-full px-4 py-2 mb-8"
          >
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-sm">{tLanding('badge')}</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-4xl md:text-6xl font-bold mb-6"
          >
            <span className="gradient-text">{tLanding('title')}</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto"
          >
            {tLanding('subtitle')}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link href="/auth/register">
              <Button
                size="lg"
                className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white border-0 shadow-lg shadow-purple-500/25 h-12 px-8"
              >
                {tLanding('getStarted')}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button size="lg" variant="outline" className="border-white/10 h-12 px-8">
                {tAuth('signIn')}
              </Button>
            </Link>
          </motion.div>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-20 max-w-5xl mx-auto"
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.titleKey}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 + index * 0.1 }}
              className="glass rounded-xl p-6 card-hover"
            >
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${getColorClasses(feature.color)}`}>
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="font-semibold mb-2">{tLanding(feature.titleKey)}</h3>
              <p className="text-sm text-muted-foreground">{tLanding(feature.descKey)}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="text-center mt-20"
        >
          <div className="glass rounded-2xl p-8 max-w-2xl mx-auto border border-purple-500/20">
            <h2 className="text-2xl font-bold mb-4">{tLanding('cta.title')}</h2>
            <p className="text-muted-foreground mb-6">{tLanding('cta.description')}</p>
            <Link href="/auth/register">
              <Button
                size="lg"
                className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white border-0"
              >
                {tLanding('cta.button')}
                <Sparkles className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
