'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Sparkles,
  ArrowRight,
  Check,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// Import extracted components
import {
  AnimatedCounter,
  VideoShowcase,
  SceneGallery,
  features,
  useCases,
  stats,
} from './landing';

export function LandingPage() {
  const tLanding = useTranslations('landing');
  const tAuth = useTranslations('auth');

  return (
    <div className="min-h-screen bg-[#030305] overflow-hidden">
      {/* Grid Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(139, 92, 246, 0.5) 1px, transparent 1px),
              linear-gradient(90deg, rgba(139, 92, 246, 0.5) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[800px] bg-gradient-radial from-violet-600/20 via-violet-600/5 to-transparent blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-radial from-orange-500/15 via-orange-500/5 to-transparent blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-gradient-radial from-cyan-500/10 via-cyan-500/5 to-transparent blur-3xl" />
      </div>

      <div className="relative">
        {/* Hero Section */}
        <section className="container mx-auto px-4 pt-20 pb-16">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-5xl mx-auto"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full px-5 py-2 mb-8"
            >
              <Sparkles className="w-4 h-4 text-violet-400" />
              <span className="text-sm text-white/80">{tLanding('badge')}</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="text-5xl md:text-7xl lg:text-8xl font-bold mb-8 leading-[0.95] tracking-tight"
            >
              <span className="text-white">Create </span>
              <span className="bg-gradient-to-r from-violet-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
                AI Stories
              </span>
              <br />
              <span className="text-white">in Minutes</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-lg md:text-xl text-white/60 mb-12 max-w-2xl mx-auto leading-relaxed"
            >
              {tLanding('subtitle')}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              <Link href="/auth/register">
                <Button
                  size="lg"
                  className="relative group bg-gradient-to-r from-violet-600 to-orange-500 hover:from-violet-500 hover:to-orange-400 text-white border-0 h-14 px-10 text-lg font-semibold rounded-full shadow-[0_0_40px_rgba(139,92,246,0.4)] hover:shadow-[0_0_60px_rgba(139,92,246,0.6)] transition-all duration-300"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    {tLanding('getStarted')}
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </Button>
              </Link>
              <Link href="/auth/login">
                <Button
                  size="lg"
                  variant="ghost"
                  className="text-white/80 hover:text-white hover:bg-white/5 h-14 px-8 text-lg rounded-full border border-white/10"
                >
                  {tAuth('signIn')}
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </section>

        {/* Video Showcase Section */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-10"
            >
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
                {tLanding('showcase.title')}
              </h2>
              <p className="text-white/50">
                {tLanding('showcase.subtitle')}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="max-w-4xl mx-auto"
            >
              <VideoShowcase />
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-center mt-8"
            >
              <a
                href="https://www.youtube.com/@yerdna1983/videos"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-white/50 hover:text-white transition-colors"
              >
                {tLanding('showcase.viewMore')}
                <ExternalLink className="w-4 h-4" />
              </a>
            </motion.div>
          </div>
        </section>

        {/* Scene Gallery Section */}
        <section className="py-12 border-t border-white/5">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <SceneGallery />
            </motion.div>
          </div>
        </section>

        {/* Use Cases Section */}
        <section className="py-20 border-t border-white/5">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                {tLanding('useCases.title')}
              </h2>
              <p className="text-white/50 text-lg">
                {tLanding('useCases.subtitle')}
              </p>
            </motion.div>

            <div className="flex flex-wrap justify-center gap-4 max-w-4xl mx-auto">
              {useCases.map((useCase, index) => (
                <motion.div
                  key={useCase.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.05 }}
                  className="flex items-center gap-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full px-6 py-3 cursor-pointer hover:bg-white/10 hover:border-white/20 transition-all duration-300"
                >
                  <useCase.icon className={`w-5 h-5 ${useCase.color}`} />
                  <span className="text-white/90 font-medium">
                    {tLanding(`useCases.${useCase.id}`)}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
                {tLanding('features.title')}
              </h2>
              <p className="text-white/50 text-lg max-w-2xl mx-auto">
                {tLanding('features.subtitle')}
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -8, transition: { duration: 0.3 } }}
                  className="group relative bg-white/[0.02] backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:bg-white/[0.05] hover:border-white/20 transition-all duration-500"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity duration-500`} />

                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-6 shadow-lg`}>
                    <feature.icon className="w-7 h-7 text-white" />
                  </div>

                  <h3 className="text-xl font-semibold text-white mb-3">
                    {tLanding(`features.${feature.id}.title`)}
                  </h3>
                  <p className="text-white/50 leading-relaxed">
                    {tLanding(`features.${feature.id}.description`)}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-24 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-violet-600/5 via-transparent to-transparent" />

          <div className="container mx-auto px-4 relative">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                {tLanding('stats.title')}
              </h2>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="text-center"
                >
                  <div className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-violet-400 to-orange-400 bg-clip-text text-transparent mb-2">
                    <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                  </div>
                  <p className="text-white/50 text-lg">
                    {tLanding(`stats.${stat.id}`)}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-32 relative">
          <div className="absolute inset-0 bg-gradient-to-t from-violet-600/10 via-transparent to-transparent" />

          <div className="container mx-auto px-4 relative">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="max-w-3xl mx-auto text-center"
            >
              <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
                {tLanding('cta.titlePre')}
                <span className="bg-gradient-to-r from-violet-400 to-orange-400 bg-clip-text text-transparent">
                  {tLanding('cta.titleAccent')}
                </span>
                {tLanding('cta.titlePost')}
              </h2>
              <p className="text-xl text-white/50 mb-10 whitespace-pre-line">
                {tLanding('cta.subtitle')}
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link href="/auth/register">
                  <Button
                    size="lg"
                    className="relative bg-gradient-to-r from-violet-600 to-orange-500 hover:from-violet-500 hover:to-orange-400 text-white border-0 h-14 px-12 text-lg font-semibold rounded-full shadow-[0_0_60px_rgba(139,92,246,0.5)] hover:shadow-[0_0_80px_rgba(139,92,246,0.7)] transition-all duration-300"
                  >
                    {tLanding('cta.button')}
                    <Sparkles className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
              </div>

              <div className="mt-10 flex flex-wrap justify-center gap-6 text-sm text-white/40">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-400" />
                  <span>{tLanding('cta.noCreditCard')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-400" />
                  <span>{tLanding('cta.freeTier')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-400" />
                  <span>{tLanding('cta.cancelAnytime')}</span>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <div className="h-20" />
      </div>
    </div>
  );
}
