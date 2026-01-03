'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession, signOut } from 'next-auth/react';
import {
  Film,
  Plus,
  Settings,
  HelpCircle,
  Menu,
  X,
  ChevronDown,
  LogOut,
  User,
  Sparkles,
  LogIn,
  BarChart3,
  Shield,
  Globe,
  CreditCard,
  Crown,
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
  const { data: session, status } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const user = session?.user;
  const isAdmin = user?.email === 'andrej.galad@gmail.com';

  // Use centralized subscription hook with SWR deduplication
  const { plan: subscriptionPlan } = useSubscription({ enabled: !!user });

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

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      className="sticky top-0 z-50 w-full"
    >
      {/* Glass background */}
      <div className="absolute inset-0 glass-strong" />

      {/* Gradient line at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />

      <div className="relative container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <motion.div
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
              className="relative"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 via-pink-500 to-cyan-500 p-[2px]">
                <div className="w-full h-full rounded-[10px] bg-background/90 flex items-center justify-center">
                  <Film className="w-5 h-5 text-purple-400" />
                </div>
              </div>
              {/* Glow effect */}
              <div className="absolute inset-0 rounded-xl bg-purple-500/20 blur-xl group-hover:bg-purple-500/30 transition-all duration-300" />
            </motion.div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold gradient-text">Film Generator</h1>
              <p className="text-[10px] text-muted-foreground -mt-1 tracking-wider uppercase">
                AI Studio
              </p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button
                  variant="ghost"
                  className={
                    'isAdmin' in item && item.isAdmin
                      ? "text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 transition-all duration-200"
                      : "text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-all duration-200"
                  }
                >
                  <item.icon className="w-4 h-4 mr-2" />
                  {item.label}
                </Button>
              </Link>
            ))}
            {/* Subscription Plan Badge */}
            {user && subscriptionPlan && (
              <Link href="/billing">
                <Badge
                  variant="outline"
                  className={`ml-2 cursor-pointer hover:opacity-80 transition-opacity ${getPlanBadge().className}`}
                >
                  <Crown className="w-3 h-3 mr-1" />
                  {getPlanBadge().label}
                </Badge>
              </Link>
            )}
          </nav>

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            {/* Credits Display (for logged-in users) */}
            {user && <CreditsDisplay className="hidden sm:flex" />}

            {/* Language Switcher */}
            <LanguageSwitcher />

            {/* Settings - only for paid subscribers or admin */}
            {user && (isAdmin || (subscriptionPlan && subscriptionPlan !== 'free')) && (
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
                asChild
              >
                <Link href="/settings">
                  <Settings className="w-5 h-5" />
                </Link>
              </Button>
            )}

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Help */}
            <Button
              variant="ghost"
              size="icon"
              className="hidden sm:flex text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
              asChild
            >
              <Link href="/help">
                <HelpCircle className="w-5 h-5" />
              </Link>
            </Button>

            {/* Notifications (for logged-in users) */}
            {user && <NotificationBell />}

            {/* User Menu or Login Button */}
            {status === 'loading' ? (
              <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center gap-2 px-2 hover:bg-black/5 dark:hover:bg-white/5"
                  >
                    <Avatar className="w-8 h-8 border border-purple-500/30">
                      <AvatarImage src={user.image || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-purple-600 to-cyan-600 text-white text-sm">
                        {user.name?.charAt(0) || user.email?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <ChevronDown className="w-4 h-4 text-muted-foreground hidden sm:block" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 glass-strong border-black/10 dark:border-white/10"
                >
                  <div className="px-3 py-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{user.name || 'User'}</p>
                      {subscriptionPlan && (
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 ${getPlanBadge().className}`}
                        >
                          {getPlanBadge().label}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator className="bg-black/10 dark:bg-white/10" />
                  <DropdownMenuItem className="cursor-pointer hover:bg-black/5 dark:hover:bg-white/5" asChild>
                    <Link href="/profile">
                      <User className="w-4 h-4 mr-2" />
                      {t('nav.profile')}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer hover:bg-black/5 dark:hover:bg-white/5" asChild>
                    <Link href="/statistics">
                      <BarChart3 className="w-4 h-4 mr-2" />
                      {t('nav.statistics')}
                    </Link>
                  </DropdownMenuItem>
                  {(isAdmin || (subscriptionPlan && subscriptionPlan !== 'free')) && (
                    <DropdownMenuItem className="cursor-pointer hover:bg-black/5 dark:hover:bg-white/5" asChild>
                      <Link href="/settings">
                        <Settings className="w-4 h-4 mr-2" />
                        {t('nav.settings')}
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem className="cursor-pointer hover:bg-black/5 dark:hover:bg-white/5" asChild>
                    <Link href="/billing">
                      <CreditCard className="w-4 h-4 mr-2" />
                      Billing & Plans
                    </Link>
                  </DropdownMenuItem>
                  {user.email === 'andrej.galad@gmail.com' && (
                    <>
                      <DropdownMenuSeparator className="bg-black/10 dark:bg-white/10" />
                      <DropdownMenuItem className="cursor-pointer hover:bg-amber-500/10 text-amber-600 dark:text-amber-400" asChild>
                        <Link href="/admin">
                          <Shield className="w-4 h-4 mr-2" />
                          {t('nav.admin')}
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator className="bg-black/10 dark:bg-white/10" />
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
              <Button
                asChild
                variant="outline"
                className="border-purple-500/30 hover:border-purple-500/50 hover:bg-purple-500/10"
              >
                <Link href="/auth/login">
                  <LogIn className="w-4 h-4 mr-2" />
                  {t('auth.signIn')}
                </Link>
              </Button>
            )}

            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden border-t border-black/5 dark:border-white/5 glass-strong"
          >
            <div className="container mx-auto px-4 py-4 space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
                  >
                    <item.icon className="w-4 h-4 mr-3" />
                    {item.label}
                  </Button>
                </Link>
              ))}
              <div className="pt-2">
                <Button
                  asChild
                  className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white border-0"
                >
                  <Link href="/project/new" onClick={() => setMobileMenuOpen(false)}>
                    <Plus className="w-4 h-4 mr-2" />
                    {t('nav.newProject')}
                  </Link>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
