'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useSession, signOut } from 'next-auth/react';
import { motion } from 'framer-motion';
import {
  User,
  Shield,
  ExternalLink,
  Download,
  Trash2,
  AlertTriangle,
  Loader2,
  LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface AccountTabProps {
  projectsCount: number;
  isExporting: boolean;
  onExportData: () => void;
  onDeleteAllData: () => void;
}

export function AccountTab({
  projectsCount,
  isExporting,
  onExportData,
  onDeleteAllData,
}: AccountTabProps) {
  const tPage = useTranslations('settingsPage');
  const tAuth = useTranslations('auth');
  const tCommon = useTranslations('common');
  const { data: session } = useSession();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <Card className="glass border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-purple-400" />
            {tPage('profileSection')}
          </CardTitle>
          <CardDescription>
            {tPage('manageAccount')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {session?.user ? (
            <>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-2xl font-bold text-white">
                  {session.user.name?.[0]?.toUpperCase() || session.user.email?.[0]?.toUpperCase() || 'U'}
                </div>
                <div>
                  <p className="font-medium">{session.user.name || tPage('user')}</p>
                  <p className="text-sm text-muted-foreground">{session.user.email}</p>
                  <Badge variant="outline" className="mt-1 border-green-500/30 text-green-400">
                    {tPage('authenticated')}
                  </Badge>
                </div>
              </div>
              <div className="pt-4">
                <Button
                  variant="outline"
                  className="border-white/10"
                  onClick={() => signOut({ callbackUrl: '/' })}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  {tAuth('signOut')}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-2xl font-bold text-white">
                  U
                </div>
                <div>
                  <p className="font-medium">{tPage('guestUser')}</p>
                  <p className="text-sm text-muted-foreground">{tPage('usingLocalStorage')}</p>
                  <Badge variant="outline" className="mt-1 border-cyan-500/30 text-cyan-400">
                    {tPage('guestMode')}
                  </Badge>
                </div>
              </div>
              <div className="pt-4 space-y-3">
                <p className="text-sm text-muted-foreground">
                  {tPage('cloudSyncNote')}
                </p>
                <div className="flex gap-2">
                  <Link href="/auth/login">
                    <Button variant="outline" className="border-white/10">
                      {tAuth('signIn')}
                    </Button>
                  </Link>
                  <Link href="/auth/register">
                    <Button className="bg-gradient-to-r from-purple-600 to-cyan-600 text-white border-0">
                      {tAuth('createAccount')}
                    </Button>
                  </Link>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="glass border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-400" />
            {tPage('dataPrivacy')}
          </CardTitle>
          <CardDescription>
            {tPage('controlData')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>{tPage('exportAllData')}</Label>
              <p className="text-xs text-muted-foreground">{tPage('downloadProjects')} ({projectsCount})</p>
            </div>
            <Button
              variant="outline"
              className="border-white/10"
              onClick={onExportData}
              disabled={isExporting}
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              {tCommon('export')}
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-red-400">{tPage('deleteAllData')}</Label>
              <p className="text-xs text-muted-foreground">{tPage('permanentlyRemove')}</p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10">
                  <Trash2 className="w-4 h-4 mr-2" />
                  {tCommon('delete')}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="glass-strong border-white/10">
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-red-400">
                    <AlertTriangle className="w-5 h-5" />
                    {tPage('deleteConfirmTitle')}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {tPage('deleteConfirmDescription')}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="border-white/10">{tCommon('cancel')}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={onDeleteAllData}
                    className="bg-red-600 hover:bg-red-500 text-white"
                  >
                    {tPage('deleteEverything')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      {/* Links to legal pages */}
      <Card className="glass border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="w-5 h-5 text-purple-400" />
            {tPage('legal')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Link href="/help" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
            {tPage('helpDocs')} →
          </Link>
          <Link href="/terms" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
            {tPage('termsOfService')} →
          </Link>
          <Link href="/privacy" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
            {tPage('privacyPolicy')} →
          </Link>
        </CardContent>
      </Card>
    </motion.div>
  );
}
