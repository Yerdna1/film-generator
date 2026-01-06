'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { useSession, signOut } from 'next-auth/react';
import {
  Film,
  Plus,
  Settings,
  ChevronDown,
  LogOut,
  User,
  BarChart3,
  Shield,
  Globe,
  CreditCard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeToggle } from './ThemeToggle';
import { CreditsDisplay } from './CreditsDisplay';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { useSubscription } from '@/hooks';

export function Header() {
  const t = useTranslations();
  const pathname = usePathname();
  const { data: session, status } = useSession();

  const user = session?.user;
  const isAdmin = user?.email === 'andrej.galad@gmail.com';

  // Use centralized subscription hook with SWR deduplication
  const { plan: subscriptionPlan } = useSubscription({ enabled: !!user });

  // Hide header on project pages
  const isProjectPage = pathname?.startsWith('/project/');
  if (isProjectPage) {
    return null;
  }

  // Check if we're on the landing page (unauthenticated home)
  const isLandingPage = pathname === '/' && status === 'unauthenticated';

  const navItems = [
    { href: '/projects', label: t('nav.projects'), icon: Film },
    { href: '/discover', label: t('nav.discover'), icon: Globe },
    { href: '/billing', label: t('nav.pricing'), icon: CreditCard },
    ...(isAdmin ? [{ href: '/approvals', label: t('nav.approvals'), icon: Shield, isAdmin: true }] : []),
  ];

  // Plan badge colors and labels
  const getPlanBadge = () => {
    if (!subscriptionPlan || subscriptionPlan === 'free') {
      return { label: t('billing.plans.free'), className: 'bg-amber-500/20 text-amber-500 border-amber-500/30' };
    }
    if (subscriptionPlan === 'starter') {
      return { label: t('billing.plans.starter'), className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
    }
    if (subscriptionPlan === 'pro') {
      return { label: t('billing.plans.pro'), className: 'bg-purple-500/20 text-purple-400 border-purple-500/30' };
    }
    if (subscriptionPlan === 'studio') {
      return { label: t('billing.plans.studio'), className: 'bg-gradient-to-r from-purple-500/20 to-cyan-500/20 text-cyan-400 border-cyan-500/30' };
    }
    return { label: subscriptionPlan, className: 'bg-muted text-muted-foreground' };
  };

  // Dynamic styles based on page
  const headerBg = isLandingPage
    ? 'bg-black/50 backdrop-blur-xl border-b border-white/5'
    : 'glass-strong';

  const textColor = isLandingPage ? 'text-white' : 'text-foreground';
  const mutedColor = isLandingPage ? 'text-white/60' : 'text-muted-foreground';

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      className="sticky top-0 z-50 w-full"
    >
      {/* Background */}
      <div className={`absolute inset-0 ${headerBg}`} />

      {/* Gradient line at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />

      <div className="relative container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <motion.div
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
              className="relative"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 via-pink-500 to-orange-500 p-[2px]">
                <div className={`w-full h-full rounded-[10px] ${isLandingPage ? 'bg-black/80' : 'bg-background/90'} flex items-center justify-center`}>
                  <Film className="w-5 h-5 text-violet-400" />
                </div>
              </div>
              {/* Glow effect */}
              <div className="absolute inset-0 rounded-xl bg-violet-500/20 blur-xl group-hover:bg-violet-500/40 transition-all duration-300" />
            </motion.div>
            <div className="hidden sm:block">
              <h1 className={`text-lg font-bold ${isLandingPage ? 'bg-gradient-to-r from-violet-400 to-orange-400 bg-clip-text text-transparent' : 'gradient-text'}`}>
                AI Story
              </h1>
              <p className={`text-[10px] ${mutedColor} -mt-1 tracking-wider uppercase`}>
                Create with AI
              </p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {!isLandingPage && navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button
                  variant="ghost"
                  className={
                    'isAdmin' in item && item.isAdmin
                      ? "text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 transition-all duration-200"
                      : `${mutedColor} hover:${textColor} hover:bg-white/5 transition-all duration-200`
                  }
                >
                  <item.icon className="w-4 h-4 mr-2" />
                  {item.label}
                </Button>
              </Link>
            ))}
          </nav>

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            {/* Credits Display (for logged-in users) */}
            {user && <CreditsDisplay className="hidden sm:flex" />}

            {/* Language Switcher */}
            <LanguageSwitcher />

            {/* Theme Toggle - hide on landing page */}
            {!isLandingPage && <ThemeToggle />}

            {/* Notifications (for logged-in users) */}
            {user && <NotificationBell />}

            {/* User Menu or Login Button */}
            {status === 'loading' ? (
              <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse" />
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className={`flex items-center gap-2 px-2 hover:bg-white/5`}
                  >
                    <Avatar className="w-8 h-8 border border-violet-500/30">
                      <AvatarImage src={user.image || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-violet-600 to-orange-600 text-white text-sm">
                        {user.name?.charAt(0) || user.email?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <ChevronDown className={`w-4 h-4 ${mutedColor} hidden sm:block`} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 bg-black/90 backdrop-blur-xl border-white/10"
                >
                  <div className="px-3 py-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-white">{user.name || 'User'}</p>
                      {subscriptionPlan && (
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 ${getPlanBadge().className}`}
                        >
                          {getPlanBadge().label}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-white/50">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem className="cursor-pointer text-white/80 hover:text-white hover:bg-white/5" asChild>
                    <Link href="/profile">
                      <User className="w-4 h-4 mr-2" />
                      {t('nav.profile')}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer text-white/80 hover:text-white hover:bg-white/5" asChild>
                    <Link href="/statistics">
                      <BarChart3 className="w-4 h-4 mr-2" />
                      {t('nav.statistics')}
                    </Link>
                  </DropdownMenuItem>
                  {(isAdmin || (subscriptionPlan && subscriptionPlan !== 'free')) && (
                    <DropdownMenuItem className="cursor-pointer text-white/80 hover:text-white hover:bg-white/5" asChild>
                      <Link href="/settings">
                        <Settings className="w-4 h-4 mr-2" />
                        {t('nav.settings')}
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem className="cursor-pointer text-white/80 hover:text-white hover:bg-white/5" asChild>
                    <Link href="/billing">
                      <CreditCard className="w-4 h-4 mr-2" />
                      {t('nav.billing')}
                    </Link>
                  </DropdownMenuItem>
                  {user.email === 'andrej.galad@gmail.com' && (
                    <>
                      <DropdownMenuSeparator className="bg-white/10" />
                      <DropdownMenuItem className="cursor-pointer hover:bg-amber-500/10 text-amber-400" asChild>
                        <Link href="/admin">
                          <Shield className="w-4 h-4 mr-2" />
                          {t('nav.admin')}
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem
                    className="cursor-pointer text-red-400 hover:bg-red-500/10 hover:text-red-400"
                    onClick={() => signOut({ callbackUrl: '/' })}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    {t('auth.signOut')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  asChild
                  variant="ghost"
                  className={`${mutedColor} hover:text-white hover:bg-white/5`}
                >
                  <Link href="/auth/login">
                    {t('auth.signIn')}
                  </Link>
                </Button>
                <Button
                  asChild
                  className="bg-gradient-to-r from-violet-600 to-orange-500 hover:from-violet-500 hover:to-orange-400 text-white border-0 shadow-lg shadow-violet-500/25"
                >
                  <Link href="/auth/register">
                    {t('landing.getStarted')}
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.header>
  );
}
