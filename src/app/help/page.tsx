'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowLeft,
  HelpCircle,
  Film,
  Sparkles,
  Image as ImageIcon,
  Video,
  Mic,
  Download,
  Zap,
  MessageCircle,
  BookOpen,
  Lightbulb,
  ChevronRight,
  Users,
  RefreshCw,
  Trash2,
  Clock,
  CheckCircle,
  Play,
  MousePointerClick,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';

export default function HelpPage() {
  const t = useTranslations('help');
  const tCommon = useTranslations('common');

  const workflowSteps = [
    {
      step: 1,
      titleKey: 'storyPrompt',
      descKey: 'storyPromptDesc',
      icon: Sparkles,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20',
    },
    {
      step: 2,
      titleKey: 'characters',
      descKey: 'charactersDesc',
      icon: Film,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/20',
    },
    {
      step: 3,
      titleKey: 'sceneImages',
      descKey: 'sceneImagesDesc',
      icon: ImageIcon,
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
    },
    {
      step: 4,
      titleKey: 'videos',
      descKey: 'videosDesc',
      icon: Video,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/20',
    },
    {
      step: 5,
      titleKey: 'voiceover',
      descKey: 'voiceoverDesc',
      icon: Mic,
      color: 'text-violet-400',
      bgColor: 'bg-violet-500/20',
    },
    {
      step: 6,
      titleKey: 'export',
      descKey: 'exportDesc',
      icon: Download,
      color: 'text-pink-400',
      bgColor: 'bg-pink-500/20',
    },
  ];

  const faqKeys = [
    'credits',
    'slowMotion',
    'noDialogue',
    'ownImages',
    'videoFormats',
    'capcut',
    'dataStorage',
    'languages',
    'moreCredits',
  ];

  const tipKeys = [
    'specific',
    'consistency',
    'startSmall',
    'review',
    'exportRegularly',
  ];

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
            <div>
              <h1 className="font-semibold flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-purple-400" />
                {t('title')}
              </h1>
              <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-12">
          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 flex items-center justify-center mx-auto mb-6">
              <BookOpen className="w-10 h-10 text-purple-400" />
            </div>
            <h2 className="text-3xl font-bold mb-4">
              <span className="gradient-text">{t('welcome')}</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              {t('welcomeDescription')}
            </p>
          </motion.div>

          {/* Workflow Steps */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <Zap className="w-5 h-5 text-cyan-400" />
              {t('workflow')}
            </h3>
            <div className="grid gap-4">
              {workflowSteps.map((step, index) => (
                <motion.div
                  key={step.step}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                >
                  <Card className="glass border-white/10">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-xl ${step.bgColor} flex items-center justify-center shrink-0`}>
                          <step.icon className={`w-6 h-6 ${step.color}`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-muted-foreground">{t('step')} {step.step}</span>
                            <ChevronRight className="w-3 h-3 text-muted-foreground" />
                            <h4 className="font-medium">{t(`steps.${step.titleKey}`)}</h4>
                          </div>
                          <p className="text-sm text-muted-foreground">{t(`steps.${step.descKey}`)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* Collaboration Guide - Status Colors */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-400" />
              {t('collaboration.title')}
            </h3>
            <Card className="glass border-white/10">
              <CardContent className="p-6 space-y-6">
                <p className="text-muted-foreground">
                  {t('collaboration.description')}
                </p>

                {/* Status Colors Grid */}
                <div className="grid gap-4">
                  {/* Approved - Ready to Regenerate */}
                  <div className="bg-emerald-900/60 border border-emerald-400 ring-2 ring-emerald-400/50 rounded-xl p-4 flex items-center gap-4">
                    <div className="shrink-0">
                      <motion.div
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <Badge className="bg-emerald-500 text-white border-2 border-emerald-300 text-xs px-3 py-1.5 flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/50">
                          <Sparkles className="w-4 h-4" />
                          <span className="font-bold">{t('collaboration.approved.badge')}</span>
                          <span className="bg-white/20 px-1.5 rounded">3x</span>
                        </Badge>
                      </motion.div>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-emerald-300 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        {t('collaboration.approved.title')}
                      </h4>
                      <p className="text-sm text-emerald-200/70 mt-1">
                        <MousePointerClick className="w-4 h-4 inline mr-1" />
                        {t('collaboration.approved.description')}
                      </p>
                    </div>
                  </div>

                  {/* Generating */}
                  <div className="bg-blue-900/60 border border-blue-400 ring-2 ring-blue-400/50 rounded-xl p-4 flex items-center gap-4">
                    <div className="shrink-0">
                      <Badge className="bg-blue-500/90 text-white border-0 text-xs px-3 py-1.5 flex items-center gap-1.5">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        {t('collaboration.generating.badge')}
                      </Badge>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-blue-300 flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        {t('collaboration.generating.title')}
                      </h4>
                      <p className="text-sm text-blue-200/70 mt-1">
                        {t('collaboration.generating.description')}
                      </p>
                    </div>
                  </div>

                  {/* Selecting - Pick Best */}
                  <div className="bg-amber-900/60 border border-amber-400 ring-2 ring-amber-400/50 rounded-xl p-4 flex items-center gap-4">
                    <div className="shrink-0">
                      <motion.div
                        animate={{ scale: [1, 1.08, 1] }}
                        transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <Badge className="bg-amber-500 text-white border-2 border-amber-300 text-xs px-3 py-1.5 flex items-center gap-1.5 cursor-pointer shadow-lg shadow-amber-500/50">
                          <Play className="w-4 h-4" />
                          <span className="font-bold">{t('collaboration.selecting.badge')}</span>
                        </Badge>
                      </motion.div>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-amber-300 flex items-center gap-2">
                        <Play className="w-4 h-4" />
                        {t('collaboration.selecting.title')}
                      </h4>
                      <p className="text-sm text-amber-200/70 mt-1">
                        <MousePointerClick className="w-4 h-4 inline mr-1" />
                        {t('collaboration.selecting.description')}
                      </p>
                    </div>
                  </div>

                  {/* Awaiting Final Approval */}
                  <div className="bg-purple-900/60 border border-purple-400 ring-2 ring-purple-400/50 rounded-xl p-4 flex items-center gap-4">
                    <div className="shrink-0">
                      <Badge className="bg-purple-500/90 text-white border-0 text-xs px-3 py-1.5 flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        {t('collaboration.flow.awaiting')}
                      </Badge>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-purple-300 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {t('collaboration.awaitingFinal.title')}
                      </h4>
                      <p className="text-sm text-purple-200/70 mt-1">
                        {t('collaboration.awaitingFinal.description')}
                      </p>
                    </div>
                  </div>

                  {/* Pending Regeneration Request */}
                  <div className="bg-cyan-900/50 border border-cyan-400 ring-2 ring-cyan-400/40 rounded-xl p-4 flex items-center gap-4">
                    <div className="shrink-0">
                      <Badge className="bg-cyan-500/80 text-white border-0 text-xs px-3 py-1.5 flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        {t('collaboration.flow.request')}
                      </Badge>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-cyan-300 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {t('collaboration.pendingRegeneration.title')}
                      </h4>
                      <p className="text-sm text-cyan-200/70 mt-1">
                        {t('collaboration.pendingRegeneration.description')}
                      </p>
                    </div>
                  </div>

                  {/* Pending Deletion Request */}
                  <div className="bg-orange-900/50 border border-orange-400 ring-2 ring-orange-400/40 rounded-xl p-4 flex items-center gap-4">
                    <div className="shrink-0">
                      <Badge className="bg-orange-500/90 text-white border-0 text-xs px-3 py-1.5 flex items-center gap-1.5">
                        <Trash2 className="w-4 h-4" />
                        {t('collaboration.flow.request')}
                      </Badge>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-orange-300 flex items-center gap-2">
                        <Trash2 className="w-4 h-4" />
                        {t('collaboration.pendingDeletion.title')}
                      </h4>
                      <p className="text-sm text-orange-200/70 mt-1">
                        {t('collaboration.pendingDeletion.description')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Flow Diagram */}
                <div className="glass rounded-xl p-4 border-l-4 border-l-emerald-500">
                  <h4 className="font-semibold text-emerald-300 mb-3 flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    {t('collaboration.flow.title')}
                  </h4>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Badge className="bg-cyan-500/80">{t('collaboration.flow.request')}</Badge>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    <Badge className="bg-emerald-500">{t('collaboration.flow.approved')}</Badge>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    <Badge className="bg-blue-500">{t('collaboration.flow.generating')}</Badge>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    <Badge className="bg-amber-500">{t('collaboration.flow.selecting')}</Badge>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    <Badge className="bg-purple-500">{t('collaboration.flow.awaiting')}</Badge>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    <Badge className="bg-green-600">✓ {t('collaboration.flow.done')}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    {t('collaboration.flow.description')}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.section>

          {/* Tips */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-400" />
              {t('proTips')}
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              {tipKeys.map((key, index) => (
                <Card key={key} className="glass border-white/10">
                  <CardContent className="p-4">
                    <h4 className="font-medium mb-2 text-yellow-400">{t(`tips.${key}`)}</h4>
                    <p className="text-sm text-muted-foreground">{t(`tips.${key}Desc`)}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.section>

          {/* FAQ */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-green-400" />
              {t('faq')}
            </h3>
            <Card className="glass border-white/10">
              <CardContent className="p-2">
                <Accordion type="single" collapsible className="w-full">
                  {faqKeys.map((key, index) => (
                    <AccordionItem key={key} value={`faq-${index}`} className="border-white/5">
                      <AccordionTrigger className="text-left px-4 hover:no-underline hover:bg-white/5 rounded-lg">
                        {t(`faqs.${key}`)}
                      </AccordionTrigger>
                      <AccordionContent className="px-4 text-muted-foreground">
                        {t(`faqs.${key}Answer`)}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </motion.section>

          {/* Contact */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-center"
          >
            <Card className="glass border-white/10">
              <CardContent className="p-8">
                <h3 className="text-xl font-semibold mb-4">{t('stillNeedHelp')}</h3>
                <p className="text-muted-foreground mb-6">
                  {t('contactDescription')}
                </p>
                <Button variant="outline" className="border-white/10">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  {t('contactSupport')}
                </Button>
              </CardContent>
            </Card>
          </motion.section>
        </div>
      </div>
    </div>
  );
}
