'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, FileText, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function TermsPage() {
  const t = useTranslations('terms');

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
                <Scale className="w-5 h-5 text-purple-400" />
                {t('title')}
              </h1>
              <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="glass border-white/10">
              <CardContent className="p-8 prose prose-invert prose-sm max-w-none">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold m-0">{t('title')}</h2>
                    <p className="text-muted-foreground m-0">ArtFlowly</p>
                  </div>
                </div>

                <section className="mb-8">
                  <h3 className="text-lg font-semibold text-purple-400 mb-4">1. {t('acceptance')}</h3>
                  <p className="text-muted-foreground">
                    {t('acceptanceText')}
                  </p>
                </section>

                <section className="mb-8">
                  <h3 className="text-lg font-semibold text-purple-400 mb-4">2. {t('description')}</h3>
                  <p className="text-muted-foreground">
                    {t('descriptionText')}
                  </p>
                </section>

                <section className="mb-8">
                  <h3 className="text-lg font-semibold text-purple-400 mb-4">3. {t('userResponsibilities')}</h3>
                  <ul className="text-muted-foreground space-y-2">
                    {(t.raw('userResponsibilitiesItems') as string[]).map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </section>

                <section className="mb-8">
                  <h3 className="text-lg font-semibold text-purple-400 mb-4">4. {t('thirdParty')}</h3>
                  <p className="text-muted-foreground">
                    {t('thirdPartyText')}
                  </p>
                </section>

                <section className="mb-8">
                  <h3 className="text-lg font-semibold text-purple-400 mb-4">5. {t('intellectualProperty')}</h3>
                  <p className="text-muted-foreground">
                    {t('intellectualPropertyText')}
                  </p>
                </section>

                <section className="mb-8">
                  <h3 className="text-lg font-semibold text-purple-400 mb-4">6. {t('creditsSystem')}</h3>
                  <p className="text-muted-foreground">
                    {t('creditsSystemText')}
                  </p>
                </section>

                <section className="mb-8">
                  <h3 className="text-lg font-semibold text-purple-400 mb-4">7. {t('dataStorage')}</h3>
                  <p className="text-muted-foreground">
                    {t('dataStorageText')}
                  </p>
                </section>

                <section className="mb-8">
                  <h3 className="text-lg font-semibold text-purple-400 mb-4">8. {t('disclaimer')}</h3>
                  <p className="text-muted-foreground">
                    {t('disclaimerText')}
                  </p>
                </section>

                <section className="mb-8">
                  <h3 className="text-lg font-semibold text-purple-400 mb-4">9. {t('liability')}</h3>
                  <p className="text-muted-foreground">
                    {t('liabilityText')}
                  </p>
                </section>

                <section className="mb-8">
                  <h3 className="text-lg font-semibold text-purple-400 mb-4">10. {t('modifications')}</h3>
                  <p className="text-muted-foreground">
                    {t('modificationsText')}
                  </p>
                </section>

                <section className="mb-8">
                  <h3 className="text-lg font-semibold text-purple-400 mb-4">11. {t('termination')}</h3>
                  <p className="text-muted-foreground">
                    {t('terminationText')}
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-purple-400 mb-4">12. {t('contact')}</h3>
                  <p className="text-muted-foreground">
                    {t('contactText')}
                  </p>
                </section>

                <div className="mt-8 pt-8 border-t border-white/10">
                  <p className="text-xs text-muted-foreground text-center">
                    {t('agreement')}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
