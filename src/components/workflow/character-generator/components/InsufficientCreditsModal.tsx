'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Key, Coins } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

interface InsufficientCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenKieModal: () => void;
  onOpenRouterModal?: () => void; // New: for scene text generation
  onUseAppCredits?: () => void; // New: callback when user wants to use app credits
  creditsNeeded?: number;
  currentCredits?: number;
  generationType?: 'image' | 'text'; // New: distinguish between image and text generation
}

export function InsufficientCreditsModal({
  isOpen,
  onClose,
  onOpenKieModal,
  onOpenRouterModal,
  onUseAppCredits,
  creditsNeeded,
  currentCredits,
  generationType = 'image',
}: InsufficientCreditsModalProps) {
  const t = useTranslations();
  const hasEnoughCredits = currentCredits !== undefined && creditsNeeded !== undefined && currentCredits >= creditsNeeded;
  const isForText = generationType === 'text';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-strong rounded-2xl p-8 max-w-md mx-4 border border-white/10 w-full"
      >
        <div className="space-y-6">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-orange-500 rounded-full blur-xl opacity-50"></div>
              <Coins className="w-16 h-16 text-red-400 relative z-10" />
            </div>
          </div>

          {/* Title */}
          <div className="text-center space-y-2">
            <h3 className="text-xl font-semibold text-foreground">
              Nedostatok kreditov
            </h3>
            <p className="text-sm text-muted-foreground">
              Pre pokračovanie v tejto operácii potrebujete viac kreditov.
            </p>
          </div>

          {/* Credits Info */}
          {(creditsNeeded !== undefined || currentCredits !== undefined) && (
            <div className="glass rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Aktuálny zostatok:</span>
                <span className="font-semibold text-amber-400">
                  {currentCredits ?? 0} kreditov
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Potrebných:</span>
                <span className="font-semibold text-red-400">
                  {creditsNeeded ?? 10} kreditov
                </span>
              </div>
            </div>
          )}

          {/* Choice Section */}
          <div className="space-y-3">
            {/* Use App Credits - only shown if user has enough */}
            {hasEnoughCredits && onUseAppCredits && (
              <Button
                onClick={() => {
                  onClose();
                  onUseAppCredits();
                }}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white border-0"
              >
                <Coins className="w-4 h-4 mr-2" />
                Použiť aplikačné kredity ({currentCredits} k dispozícii)
              </Button>
            )}

            {/* Divider or "or" text */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-transparent px-2 text-muted-foreground">alebo</span>
              </div>
            </div>

            {/* Use API Key - shows different option based on generation type */}
            {isForText && onOpenRouterModal ? (
              <>
                <Button
                  onClick={() => {
                    onClose();
                    onOpenRouterModal();
                  }}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white border-0"
                >
                  <Key className="w-4 h-4 mr-2" />
                  Použiť vlastný OpenRouter kľúč
                </Button>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Generujte scény pomocou vášho OpenRouter kreditu
                </p>
              </>
            ) : (
              <>
                <Button
                  onClick={() => {
                    onClose();
                    onOpenKieModal();
                  }}
                  className="w-full bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white border-0"
                >
                  <Key className="w-4 h-4 mr-2" />
                  Použiť vlastný KIE AI kľúč
                </Button>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Generujte obrázky pomocou svojich KIE AI kreditov
                </p>
              </>
            )}
          </div>

          {/* Close Button */}
          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-white/10"
            >
              Zavrieť
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
