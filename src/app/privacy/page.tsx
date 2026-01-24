'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, Shield, Lock, Eye, Database, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function PrivacyPage() {
  const t = useTranslations('privacy');

  const highlights = [
    {
      icon: Lock,
      titleKey: 'localFirst',
      descKey: 'localFirstDesc',
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
    },
    {
      icon: Eye,
      titleKey: 'noTracking',
      descKey: 'noTrackingDesc',
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/20',
    },
    {
      icon: Database,
      titleKey: 'yourData',
      descKey: 'yourDataDesc',
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20',
    },
    {
      icon: Trash2,
      titleKey: 'easyDeletion',
      descKey: 'easyDeletionDesc',
      color: 'text-red-400',
      bgColor: 'bg-red-500/20',
    },
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
                <Shield className="w-5 h-5 text-purple-400" />
                {t('title')}
              </h1>
              <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Privacy Highlights */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
          >
            {highlights.map((item, index) => (
              <Card key={index} className="glass border-white/10">
                <CardContent className="p-4 text-center">
                  <div className={`w-10 h-10 rounded-xl ${item.bgColor} flex items-center justify-center mx-auto mb-2`}>
                    <item.icon className={`w-5 h-5 ${item.color}`} />
                  </div>
                  <h3 className="font-medium text-sm">{t(`highlights.${item.titleKey}`)}</h3>
                  <p className="text-xs text-muted-foreground">{t(`highlights.${item.descKey}`)}</p>
                </CardContent>
              </Card>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="glass border-white/10">
              <CardContent className="p-8 prose prose-invert prose-sm max-w-none">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                    <Shield className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold m-0">{t('title')}</h2>
                    <p className="text-muted-foreground m-0">ArtFlowly</p>
                  </div>
                </div>

                <section className="mb-8">
                  <h3 className="text-lg font-semibold text-purple-400 mb-4">1. {t('introduction')}</h3>
                  <p className="text-muted-foreground">
                    {t('introductionText')}
                  </p>
                </section>

                <section className="mb-8">
                  <h3 className="text-lg font-semibold text-purple-400 mb-4">2. {t('infoCollected')}</h3>

                  <h4 className="text-md font-medium text-cyan-400 mb-2">2.1 {t('localStorageTitle')}</h4>
                  <p className="text-muted-foreground mb-4">
                    {t('localStorageText')}
                  </p>
                  <ul className="text-muted-foreground space-y-2 mb-4">
                    {(t.raw('localStorageItems') as string[]).map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>

                  <h4 className="text-md font-medium text-cyan-400 mb-2">2.2 {t('thirdPartyTitle')}</h4>
                  <p className="text-muted-foreground">
                    {t('thirdPartyText')}
                  </p>
                </section>

                <section className="mb-8">
                  <h3 className="text-lg font-semibold text-purple-400 mb-4">3. {t('howWeUse')}</h3>
                  <ul className="text-muted-foreground space-y-2">
                    {(t.raw('howWeUseItems') as string[]).map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </section>

                <section className="mb-8">
                  <h3 className="text-lg font-semibold text-purple-400 mb-4">4. {t('dataSecurity')}</h3>

                  <h4 className="text-md font-medium text-cyan-400 mb-2">4.1 {t('localStorageSecurityTitle')}</h4>
                  <p className="text-muted-foreground mb-4">
                    {t('localStorageSecurityText')}
                  </p>
                  <ul className="text-muted-foreground space-y-2 mb-4">
                    {(t.raw('localStorageSecurityItems') as string[]).map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>

                  <h4 className="text-md font-medium text-cyan-400 mb-2">4.2 {t('apiKeySecurityTitle')}</h4>
                  <p className="text-muted-foreground">
                    {t('apiKeySecurityText')}
                  </p>
                </section>

                <section className="mb-8">
                  <h3 className="text-lg font-semibold text-purple-400 mb-4">5. {t('thirdPartyServices')}</h3>
                  <p className="text-muted-foreground mb-4">
                    {t('thirdPartyServicesText')}
                  </p>
                  <ul className="text-muted-foreground space-y-2">
                    {(t.raw('thirdPartyServicesList') as string[]).map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                  <p className="text-muted-foreground mt-4">
                    {t('thirdPartyServicesNote')}
                  </p>
                </section>

                <section className="mb-8">
                  <h3 className="text-lg font-semibold text-purple-400 mb-4">6. {t('cookies')}</h3>
                  <p className="text-muted-foreground">
                    {t('cookiesText')}
                  </p>
                  <ul className="text-muted-foreground space-y-2 mt-2">
                    {(t.raw('cookiesItems') as string[]).map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                  <p className="text-muted-foreground mt-4">
                    {t('cookiesNote')}
                  </p>
                </section>

                <section className="mb-8">
                  <h3 className="text-lg font-semibold text-purple-400 mb-4">7. {t('yourRights')}</h3>
                  <p className="text-muted-foreground mb-4">{t('yourRightsText')}</p>
                  <ul className="text-muted-foreground space-y-2">
                    {(t.raw('yourRightsItems') as string[]).map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </section>

                <section className="mb-8">
                  <h3 className="text-lg font-semibold text-purple-400 mb-4">8. {t('children')}</h3>
                  <p className="text-muted-foreground">
                    {t('childrenText')}
                  </p>
                </section>

                <section className="mb-8">
                  <h3 className="text-lg font-semibold text-purple-400 mb-4">9. {t('changes')}</h3>
                  <p className="text-muted-foreground">
                    {t('changesText')}
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-purple-400 mb-4">10. {t('contact')}</h3>
                  <p className="text-muted-foreground">
                    {t('contactText')}
                  </p>
                </section>

                <div className="mt-8 pt-8 border-t border-white/10">
                  <div className="glass rounded-lg p-4 border-l-4 border-l-green-500">
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Lock className="w-4 h-4 text-green-400" />
                      <span><strong className="text-green-400">{t('privacyByDesign')}:</strong> {t('privacyByDesignText')}</span>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
