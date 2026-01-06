'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { Film } from 'lucide-react';

// Custom link component that scrolls to top
function ScrollToTopLink({ href, children, className, onClick }: {
  href: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  const router = useRouter();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    router.push(href);
    onClick?.();
  };

  return (
    <Link href={href} className={className} onClick={handleClick}>
      {children}
    </Link>
  );
}

export function Footer() {
  const t = useTranslations();
  const pathname = usePathname();
  const { status } = useSession();

  // Check if we're on the landing page (unauthenticated home)
  const isLandingPage = pathname === '/' && status === 'unauthenticated';

  // Hide footer on project pages
  const isProjectPage = pathname?.startsWith('/project/');
  if (isProjectPage) {
    return null;
  }

  const footerLinks = {
    product: [
      { href: '/discover', label: t('nav.discover') },
      { href: '/billing', label: t('nav.pricing') },
      { href: '/help', label: t('nav.help') },
    ],
    company: [
      { href: '/privacy', label: t('footer.privacy') },
      { href: '/terms', label: t('footer.terms') },
    ],
  };

  // Minimal footer for authenticated pages
  if (!isLandingPage) {
    return (
      <footer className="border-t border-black/5 dark:border-white/5 py-6 mt-auto">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Film className="w-4 h-4 text-violet-400" />
              <span>AI Story</span>
              <span className="text-muted-foreground/50">© {new Date().getFullYear()}</span>
            </div>
            <div className="flex items-center gap-4">
              <ScrollToTopLink href="/help" className="hover:text-foreground transition-colors">{t('nav.help')}</ScrollToTopLink>
              <ScrollToTopLink href="/privacy" className="hover:text-foreground transition-colors">{t('footer.privacy')}</ScrollToTopLink>
              <ScrollToTopLink href="/terms" className="hover:text-foreground transition-colors">{t('footer.terms')}</ScrollToTopLink>
            </div>
          </div>
        </div>
      </footer>
    );
  }

  // Full footer for landing page
  return (
    <footer className="relative border-t border-white/5 bg-black/50 backdrop-blur-xl mt-auto">
      {/* Gradient glow at top */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />

      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-3 group mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 via-pink-500 to-orange-500 p-[2px]">
                <div className="w-full h-full rounded-[10px] bg-black/80 flex items-center justify-center">
                  <Film className="w-5 h-5 text-violet-400" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-bold bg-gradient-to-r from-violet-400 to-orange-400 bg-clip-text text-transparent">
                  AI Story
                </h3>
                <p className="text-[10px] text-white/40 -mt-1 tracking-wider uppercase">
                  Create with AI
                </p>
              </div>
            </Link>
            <p className="text-white/50 text-sm max-w-md leading-relaxed">
              Create stunning AI-powered stories in minutes. From story generation to final export,
              our platform handles everything with professional-grade quality.
            </p>
          </div>

          {/* Product & Legal Links - 2 columns on mobile */}
          <div className="col-span-1 md:col-span-2 grid grid-cols-2 gap-6 md:gap-12">
            {/* Product Links */}
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-3">
                {footerLinks.product.map((link) => (
                  <li key={link.href}>
                    <ScrollToTopLink
                      href={link.href}
                      className="text-white/50 hover:text-white transition-colors text-sm"
                    >
                      {link.label}
                    </ScrollToTopLink>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal Links */}
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-3">
                {footerLinks.company.map((link) => (
                  <li key={link.href}>
                    <ScrollToTopLink
                      href={link.href}
                      className="text-white/50 hover:text-white transition-colors text-sm"
                    >
                      {link.label}
                    </ScrollToTopLink>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/5 mt-12 pt-8">
          <div className="flex items-center justify-center">
            <p className="text-white/40 text-sm">
              © {new Date().getFullYear()} AI Story. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
