'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Lock, Loader2, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/lib/toast';

export default function ResetPasswordPage() {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  // If no token, show error
  if (!token && !isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full filter blur-[100px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600/20 rounded-full filter blur-[100px] animate-pulse delay-1000" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="glass-strong rounded-2xl p-8 border border-white/10 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-600/20 flex items-center justify-center">
              <Lock className="w-8 h-8 text-red-400" />
            </div>
            <h1 className="text-2xl font-bold mb-2">{t('auth.invalidResetLink')}</h1>
            <p className="text-muted-foreground text-sm mb-6">
              {t('auth.invalidResetLinkDescription')}
            </p>
            <Link href="/auth/forgot-password">
              <Button className="w-full h-11 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white border-0">
                {t('auth.requestNewLink')}
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (password !== confirmPassword) {
      const errorMsg = t('auth.passwordsDoNotMatch');
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    // Validate password length
    if (password.length < 8) {
      const errorMsg = t('auth.passwordTooShort');
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }

      setIsSuccess(true);
      toast.success('Password reset successfully');

      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/auth/login');
      }, 2000);
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
                  <Lock className="w-8 h-8 text-purple-400" />
                </div>
                <h1 className="text-2xl font-bold mb-2">{t('auth.resetPassword')}</h1>
                <p className="text-muted-foreground text-sm">
                  {t('auth.resetPasswordDescription')}
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
                  <Label htmlFor="password">{t('auth.newPassword')}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder={t('auth.newPasswordPlaceholder')}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 h-11 glass border-white/10 focus:border-purple-500/50"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t('auth.passwordRequirement')}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{t('auth.confirmPassword')}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder={t('auth.confirmPasswordPlaceholder')}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 pr-10 h-11 glass border-white/10 focus:border-purple-500/50"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
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
                    t('auth.resetPasswordButton')
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
                <h2 className="text-2xl font-bold mb-3">{t('auth.passwordResetSuccess')}</h2>
                <p className="text-muted-foreground text-sm mb-6">
                  {t('auth.passwordResetSuccessDescription')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('auth.redirectingToLogin')}...
                </p>
              </motion.div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
