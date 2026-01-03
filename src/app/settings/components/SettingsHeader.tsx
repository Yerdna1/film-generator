'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function SettingsHeader() {
  const t = useTranslations('settings');
  const tPage = useTranslations('settingsPage');

  return (
    <div className="sticky top-0 z-40 glass-strong border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-4 h-16">
          <Link href="/">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="font-semibold">{t('title')}</h1>
            <p className="text-xs text-muted-foreground">{tPage('subtitle')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
