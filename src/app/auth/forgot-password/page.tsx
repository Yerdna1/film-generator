'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Mail, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/lib/toast';

export default function ForgotPasswordPage() {
  const t = useTranslations();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send reset email');
      }

      setIsSuccess(true);
      toast.success('Reset link sent to your email');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full filter blur-[100px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600/20 rounded-full filter blur-[100px] animate-pulse delay-1000" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Back Button */}
        <Link
          href="/auth/login"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm">{t('auth.backToLogin')}</span>
        </Link>

        {/* Card */}
        <div className="glass-strong rounded-2xl p-8 border border-white/10">
          {!isSuccess ? (
            <>
              {/* Header */}
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-600/20 to-cyan-600/20 flex items-center justify-center">
                  <Mail className="w-8 h-8 text-purple-400" />
                </div>
                <h1 className="text-2xl font-bold mb-2">{t('auth.forgotPassword')}</h1>
                <p className="text-muted-foreground text-sm">
                  {t('auth.forgotPasswordDescription')}
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass rounded-lg p-3 mb-4 border-l-4 border-red-500 text-sm text-red-400"
                >
                  {error}
                </motion.div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{t('auth.email')}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder={t('auth.emailPlaceholder')}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-11 glass border-white/10 focus:border-purple-500/50"
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t('auth.forgotPasswordHint')}
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white border-0"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      {t('common.loading')}
                    </>
                  ) : (
                    t('auth.sendResetLink')
                  )}
                </Button>
              </form>
            </>
          ) : (
            <>
              {/* Success State */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
              >
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-emerald-600/20 to-cyan-600/20 flex items-center justify-center">
                  <CheckCircle className="w-10 h-10 text-emerald-400" />
                </div>
                <h2 className="text-2xl font-bold mb-3">{t('auth.checkYourEmail')}</h2>
                <p className="text-muted-foreground text-sm mb-6">
                  {t('auth.resetEmailSent', { email })}
                </p>
                <div className="glass rounded-lg p-4 text-sm text-left space-y-2 mb-6">
                  <p className="font-medium text-foreground">{t('auth.whatsNext')}:</p>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-purple-400">1.</span>
                      <span>{t('auth.resetStep1')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-400">2.</span>
                      <span>{t('auth.resetStep2')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-400">3.</span>
                      <span>{t('auth.resetStep3')}</span>
                    </li>
                  </ul>
                </div>
                <Button
                  onClick={() => router.push('/auth/login')}
                  className="w-full h-11 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white border-0"
                >
                  {t('auth.backToLogin')}
                </Button>
              </motion.div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
