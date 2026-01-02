'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

export function Footer() {
  const t = useTranslations();

  return (
    <footer className="border-t border-black/5 dark:border-white/5 py-6 mt-auto">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <Link href="/help" className="hover:text-foreground transition-colors">{t('nav.help')}</Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">{t('footer.privacy')}</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">{t('footer.terms')}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
