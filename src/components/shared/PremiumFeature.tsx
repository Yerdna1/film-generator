'use client';

import { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Lock, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface PremiumFeatureProps {
    isPremium: boolean;
    children: ReactNode;
    featureName?: string;
    compact?: boolean;
}

/**
 * Wrapper component that shows a blur overlay with upgrade prompt
 * for free users, and renders children normally for paid users.
 */
export function PremiumFeature({
    isPremium,
    children,
    featureName,
    compact = false
}: PremiumFeatureProps) {
    const t = useTranslations('premium');

    // Paid users see the feature normally
    if (isPremium) {
        return <>{children}</>;
    }

    // Free users see blurred content with upgrade overlay
    return (
        <div className="relative">
            {/* Blurred content */}
            <div className="blur-[2px] opacity-60 pointer-events-none select-none">
                {children}
            </div>

            {/* Overlay with upgrade prompt */}
            <div className="absolute inset-0 flex items-center justify-center bg-background/30 backdrop-blur-[1px] rounded-lg">
                <Link href="/billing" className="w-full flex justify-center">
                    <Button
                        variant="outline"
                        size={compact ? "sm" : "default"}
                        className="border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 gap-2"
                    >
                        <Crown className="w-4 h-4" />
                        {compact ? t('upgrade') : t('upgradeToUnlock')}
                    </Button>
                </Link>
            </div>
        </div>
    );
}

/**
 * Simple locked indicator for inline use
 */
export function LockedBadge() {
    const t = useTranslations('premium');

    return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] bg-amber-500/20 text-amber-400 rounded">
            <Lock className="w-2.5 h-2.5" />
            {t('locked')}
        </span>
    );
}
