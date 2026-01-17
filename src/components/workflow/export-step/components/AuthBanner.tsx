import { Lock } from 'lucide-react';

export function AuthBanner() {
  return (
    <a
      href="/auth/register"
      className="flex items-center justify-center gap-3 p-4 rounded-xl bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/20 hover:border-orange-500/40 transition-all"
    >
      <Lock className="w-5 h-5 text-orange-400" />
      <div className="text-center">
        <p className="text-sm font-medium text-orange-400">Sign in to unlock full access</p>
        <p className="text-xs text-muted-foreground">Play movie, render videos, add music</p>
      </div>
      <span className="px-3 py-1 rounded-full bg-orange-500 text-white text-xs font-medium">
        Sign up free
      </span>
    </a>
  );
}