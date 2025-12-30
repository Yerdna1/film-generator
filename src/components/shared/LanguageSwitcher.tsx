'use client';

import { useTransition } from 'react';
import { useLocale } from 'next-intl';
import { motion } from 'framer-motion';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const languages = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'sk', label: 'Slovenčina', flag: '🇸🇰' },
];

export function LanguageSwitcher() {
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();

  const currentLanguage = languages.find((l) => l.code === locale) || languages[0];

  const switchLocale = (newLocale: string) => {
    startTransition(() => {
      // Set cookie for locale
      document.cookie = `locale=${newLocale};path=/;max-age=31536000`;
      // Reload to apply new locale
      window.location.reload();
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 px-3"
          disabled={isPending}
        >
          <Globe className="w-4 h-4" />
          <span className="hidden sm:inline text-sm">{currentLanguage.flag}</span>
          <span className="hidden lg:inline text-sm">{currentLanguage.code.toUpperCase()}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="glass-strong border-black/10 dark:border-white/10 min-w-[160px]"
      >
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => switchLocale(lang.code)}
            className={`cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 ${
              locale === lang.code ? 'bg-purple-500/10 text-purple-400' : ''
            }`}
          >
            <motion.div
              className="flex items-center gap-3 w-full"
              whileHover={{ x: 4 }}
              transition={{ duration: 0.2 }}
            >
              <span className="text-lg">{lang.flag}</span>
              <span className="flex-1">{lang.label}</span>
              {locale === lang.code && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-2 h-2 rounded-full bg-purple-500"
                />
              )}
            </motion.div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
