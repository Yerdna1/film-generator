'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import {
  Settings,
  Key,
  Globe,
  Palette,
  User,
  Bell,
  Shield,
  ArrowLeft,
  Eye,
  EyeOff,
  Check,
  ExternalLink,
  Sparkles,
  Zap,
  Mic,
  Image as ImageIcon,
  Download,
  Trash2,
  AlertTriangle,
  Loader2,
  LogOut,
  DollarSign,
  Video,
  FileText,
  Users,
  Wand2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { useProjectStore } from '@/lib/stores/project-store';
import { toast } from 'sonner';

export default function SettingsPage() {
  const t = useTranslations('settings');
  const tPage = useTranslations('settingsPage');
  const tAuth = useTranslations('auth');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const { data: session } = useSession();
  const { apiConfig, setApiConfig, projects, clearProjects } = useProjectStore();

  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [savedKeys, setSavedKeys] = useState<Record<string, boolean>>({});
  const [localConfig, setLocalConfig] = useState(apiConfig);
  const [language, setLanguage] = useState('en');
  const [darkMode, setDarkMode] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [notifyOnComplete, setNotifyOnComplete] = useState(true);
  const [autoSave, setAutoSave] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [actionCosts, setActionCosts] = useState<{
    image: { provider: string; cost: number; description: string | null }[];
    video: { provider: string; cost: number; description: string | null }[];
    voiceover: { provider: string; cost: number; description: string | null }[];
    scene: { provider: string; cost: number; description: string | null }[];
    character: { provider: string; cost: number; description: string | null }[];
    prompt: { provider: string; cost: number; description: string | null }[];
  } | null>(null);
  const [costsLoading, setCostsLoading] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem('app-language') || 'en';
    const savedDarkMode = localStorage.getItem('app-dark-mode') !== 'false';
    const savedReducedMotion = localStorage.getItem('app-reduced-motion') === 'true';
    const savedNotify = localStorage.getItem('app-notify-complete') !== 'false';
    const savedAutoSave = localStorage.getItem('app-auto-save') !== 'false';

    setLanguage(savedLanguage);
    setDarkMode(savedDarkMode);
    setReducedMotion(savedReducedMotion);
    setNotifyOnComplete(savedNotify);
    setAutoSave(savedAutoSave);
  }, []);

  // Fetch action costs
  const fetchActionCosts = async () => {
    if (actionCosts) return; // Already fetched
    setCostsLoading(true);
    try {
      const response = await fetch('/api/costs');
      const data = await response.json();
      setActionCosts(data.costs);
    } catch (error) {
      console.error('Failed to fetch action costs:', error);
    } finally {
      setCostsLoading(false);
    }
  };

  const toggleKeyVisibility = (key: string) => {
    setShowKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSaveKey = (key: string) => {
    setApiConfig({ [key]: localConfig[key as keyof typeof localConfig] });
    setSavedKeys((prev) => ({ ...prev, [key]: true }));
    toast.success(tPage('toasts.apiKeySaved'), {
      description: tPage('toasts.apiKeySavedDesc'),
    });
    setTimeout(() => {
      setSavedKeys((prev) => ({ ...prev, [key]: false }));
    }, 2000);
  };

  const updateLocalConfig = (key: string, value: string) => {
    setLocalConfig((prev) => ({ ...prev, [key]: value }));
  };

  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang);
    localStorage.setItem('app-language', newLang);
    // Update the locale cookie for next-intl
    document.cookie = `NEXT_LOCALE=${newLang};path=/;max-age=31536000`;
    toast.success(tPage('toasts.languageUpdated'), {
      description: newLang === 'sk' ? tPage('toasts.languageChangedSk') : tPage('toasts.languageChangedEn'),
    });
    // Reload to apply language change
    window.location.reload();
  };

  const handleDarkModeChange = (enabled: boolean) => {
    setDarkMode(enabled);
    localStorage.setItem('app-dark-mode', String(enabled));
    // Toggle dark class on document
    if (enabled) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    toast.success(enabled ? tPage('toasts.darkModeEnabled') : tPage('toasts.lightModeEnabled'), {
      description: tPage('toasts.themePreferenceSaved'),
    });
  };

  const handleReducedMotionChange = (enabled: boolean) => {
    setReducedMotion(enabled);
    localStorage.setItem('app-reduced-motion', String(enabled));
    // Apply reduced motion preference
    if (enabled) {
      document.documentElement.classList.add('reduce-motion');
    } else {
      document.documentElement.classList.remove('reduce-motion');
    }
    toast.success(enabled ? tPage('toasts.reducedMotionEnabled') : tPage('toasts.animationsEnabled'), {
      description: tPage('toasts.motionPreferenceSaved'),
    });
  };

  const handleNotifyChange = (enabled: boolean) => {
    setNotifyOnComplete(enabled);
    localStorage.setItem('app-notify-complete', String(enabled));
  };

  const handleAutoSaveChange = (enabled: boolean) => {
    setAutoSave(enabled);
    localStorage.setItem('app-auto-save', String(enabled));
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const exportData = {
        exportedAt: new Date().toISOString(),
        version: '1.0',
        projects: projects,
        settings: {
          language,
          darkMode,
          reducedMotion,
          notifyOnComplete,
          autoSave,
        },
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `film-generator-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(tPage('toasts.dataExported'), {
        description: tPage('toasts.dataExportedDesc'),
      });
    } catch (error) {
      toast.error(tPage('toasts.exportFailed'), {
        description: tPage('toasts.exportFailedDesc'),
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAllData = () => {
    // Clear projects from store
    clearProjects();
    // Clear localStorage
    localStorage.removeItem('film-generator-projects');
    localStorage.removeItem('film-generator-api-config');
    localStorage.removeItem('app-language');
    localStorage.removeItem('app-dark-mode');
    localStorage.removeItem('app-reduced-motion');
    localStorage.removeItem('app-notify-complete');
    localStorage.removeItem('app-auto-save');

    toast.success(tPage('toasts.dataDeleted'), {
      description: tPage('toasts.dataDeletedDesc'),
    });

    // Redirect to home
    router.push('/');
  };

  const apiProviders = [
    {
      key: 'geminiApiKey',
      name: 'Google Gemini',
      description: 'Text generation, images, and Slovak TTS',
      icon: Sparkles,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20',
      link: 'https://makersuite.google.com/app/apikey',
    },
    {
      key: 'elevenLabsApiKey',
      name: 'ElevenLabs',
      description: 'High-quality English voiceover',
      icon: Mic,
      color: 'text-violet-400',
      bgColor: 'bg-violet-500/20',
      link: 'https://elevenlabs.io/api',
    },
    {
      key: 'kieApiKey',
      name: 'Kie.ai (Grok Imagine)',
      description: 'Image-to-video generation via Grok Imagine',
      icon: Zap,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/20',
      link: 'https://kie.ai/api-key',
    },
    {
      key: 'grokApiKey',
      name: 'Grok AI (Direct)',
      description: 'Direct xAI API (optional)',
      icon: Zap,
      color: 'text-orange-300',
      bgColor: 'bg-orange-400/20',
      link: 'https://console.x.ai',
    },
    {
      key: 'nanoBananaApiKey',
      name: 'Nano Banana',
      description: 'High-quality image generation',
      icon: ImageIcon,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/20',
      link: 'https://nano-banana.com',
    },
    {
      key: 'claudeApiKey',
      name: 'Claude (Anthropic)',
      description: 'Advanced text generation and editing',
      icon: Sparkles,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/20',
      link: 'https://console.anthropic.com',
    },
    {
      key: 'sunoApiKey',
      name: 'Suno AI (via sunoapi.org)',
      description: 'AI music generation for background tracks',
      icon: Mic,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20',
      link: 'https://sunoapi.org/api-key',
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-40 glass-strong border-b border-white/5">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4 h-16">
            <Link href="/">
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="font-semibold">{t('title')}</h1>
              <p className="text-xs text-muted-foreground">{tPage('subtitle')}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Tabs defaultValue="api" className="space-y-6">
            <TabsList className="glass w-full md:w-auto justify-start">
              <TabsTrigger value="api" className="gap-2">
                <Key className="w-4 h-4" />
                {t('apiKeys')}
              </TabsTrigger>
              <TabsTrigger value="general" className="gap-2">
                <Settings className="w-4 h-4" />
                {tPage('general')}
              </TabsTrigger>
              <TabsTrigger value="account" className="gap-2">
                <User className="w-4 h-4" />
                {tPage('account')}
              </TabsTrigger>
              <TabsTrigger value="pricing" className="gap-2" onClick={fetchActionCosts}>
                <DollarSign className="w-4 h-4" />
                Pricing
              </TabsTrigger>
            </TabsList>

            {/* API Keys Tab */}
            <TabsContent value="api" className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="glass border-white/10">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Key className="w-5 h-5 text-purple-400" />
                      {t('apiKeys')}
                    </CardTitle>
                    <CardDescription>
                      {tPage('apiKeysDescription')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {apiProviders.map((provider, index) => (
                      <motion.div
                        key={provider.key}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="glass rounded-xl p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg ${provider.bgColor} flex items-center justify-center`}>
                              <provider.icon className={`w-5 h-5 ${provider.color}`} />
                            </div>
                            <div>
                              <h3 className="font-medium">{provider.name}</h3>
                              <p className="text-xs text-muted-foreground">{provider.description}</p>
                            </div>
                          </div>
                          <a
                            href={provider.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
                          >
                            {tPage('getApiKey')}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Input
                              type={showKeys[provider.key] ? 'text' : 'password'}
                              placeholder={`Enter ${provider.name} API key...`}
                              value={localConfig[provider.key as keyof typeof localConfig] || ''}
                              onChange={(e) => updateLocalConfig(provider.key, e.target.value)}
                              className="pr-10 glass border-white/10 focus:border-purple-500/50"
                            />
                            <button
                              type="button"
                              onClick={() => toggleKeyVisibility(provider.key)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {showKeys[provider.key] ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                          <Button
                            onClick={() => handleSaveKey(provider.key)}
                            disabled={!localConfig[provider.key as keyof typeof localConfig]}
                            className={`${
                              savedKeys[provider.key]
                                ? 'bg-green-600 hover:bg-green-500'
                                : 'bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500'
                            } text-white border-0 min-w-[100px]`}
                          >
                            {savedKeys[provider.key] ? (
                              <>
                                <Check className="w-4 h-4 mr-1" />
                                {tCommon('save')}d
                              </>
                            ) : (
                              tCommon('save')
                            )}
                          </Button>
                        </div>
                        {apiConfig[provider.key as keyof typeof apiConfig] && (
                          <Badge variant="outline" className="border-green-500/30 text-green-400">
                            <Check className="w-3 h-3 mr-1" />
                            {tPage('configured')}
                          </Badge>
                        )}
                      </motion.div>
                    ))}
                  </CardContent>
                </Card>

                {/* Info Card */}
                <Card className="glass border-white/10 border-l-4 border-l-cyan-500">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">
                      {tPage('apiKeysNote')}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* General Settings Tab */}
            <TabsContent value="general" className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="glass border-white/10">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="w-5 h-5 text-purple-400" />
                      {t('language')}
                    </CardTitle>
                    <CardDescription>
                      {tPage('chooseLanguage')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Select value={language} onValueChange={handleLanguageChange}>
                      <SelectTrigger className="w-full md:w-64 glass border-white/10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="glass-strong border-white/10">
                        <SelectItem value="en">
                          <span className="flex items-center gap-2">
                            English
                          </span>
                        </SelectItem>
                        <SelectItem value="sk">
                          <span className="flex items-center gap-2">
                            Slovensky
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>

                <Card className="glass border-white/10">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Palette className="w-5 h-5 text-purple-400" />
                      {t('theme')}
                    </CardTitle>
                    <CardDescription>
                      {tPage('customizeAppearance')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>{tPage('darkMode')}</Label>
                        <p className="text-xs text-muted-foreground">{tPage('useDarkTheme')}</p>
                      </div>
                      <Switch
                        checked={darkMode}
                        onCheckedChange={handleDarkModeChange}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>{tPage('reducedMotion')}</Label>
                        <p className="text-xs text-muted-foreground">{tPage('minimizeAnimations')}</p>
                      </div>
                      <Switch
                        checked={reducedMotion}
                        onCheckedChange={handleReducedMotionChange}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass border-white/10">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bell className="w-5 h-5 text-purple-400" />
                      {tPage('notifications')}
                    </CardTitle>
                    <CardDescription>
                      {tPage('notificationPrefs')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>{tPage('generationComplete')}</Label>
                        <p className="text-xs text-muted-foreground">{tPage('notifyWhenReady')}</p>
                      </div>
                      <Switch
                        checked={notifyOnComplete}
                        onCheckedChange={handleNotifyChange}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>{tPage('autoSave')}</Label>
                        <p className="text-xs text-muted-foreground">{tPage('autoSaveChanges')}</p>
                      </div>
                      <Switch
                        checked={autoSave}
                        onCheckedChange={handleAutoSaveChange}
                      />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* Account Tab */}
            <TabsContent value="account" className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
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
                        <p className="text-xs text-muted-foreground">{tPage('downloadProjects')} ({projects.length})</p>
                      </div>
                      <Button
                        variant="outline"
                        className="border-white/10"
                        onClick={handleExportData}
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
                              onClick={handleDeleteAllData}
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
            </TabsContent>

            {/* Pricing Tab - Read-only display of action costs */}
            <TabsContent value="pricing" className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="glass border-white/10">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-green-400" />
                      Action Costs
                    </CardTitle>
                    <CardDescription>
                      Real API costs per action. These costs are set by the administrator and cannot be changed.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {costsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                      </div>
                    ) : actionCosts ? (
                      <div className="space-y-6">
                        {/* Image Generation */}
                        <div className="glass rounded-xl p-4">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                              <ImageIcon className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                              <h3 className="font-medium">Image Generation</h3>
                              <p className="text-xs text-muted-foreground">Cost per generated image</p>
                            </div>
                          </div>
                          <div className="grid gap-2">
                            {actionCosts.image.map((cost) => (
                              <div key={cost.provider} className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/5">
                                <div>
                                  <span className="font-medium capitalize">{cost.provider}</span>
                                  {cost.description && (
                                    <p className="text-xs text-muted-foreground">{cost.description}</p>
                                  )}
                                </div>
                                <Badge variant="outline" className="border-green-500/30 text-green-400 font-mono">
                                  ${cost.cost.toFixed(4)}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Video Generation */}
                        <div className="glass rounded-xl p-4">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                              <Video className="w-5 h-5 text-orange-400" />
                            </div>
                            <div>
                              <h3 className="font-medium">Video Generation</h3>
                              <p className="text-xs text-muted-foreground">Cost per 6-second video clip</p>
                            </div>
                          </div>
                          <div className="grid gap-2">
                            {actionCosts.video.map((cost) => (
                              <div key={cost.provider} className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/5">
                                <div>
                                  <span className="font-medium capitalize">{cost.provider}</span>
                                  {cost.description && (
                                    <p className="text-xs text-muted-foreground">{cost.description}</p>
                                  )}
                                </div>
                                <Badge variant="outline" className="border-green-500/30 text-green-400 font-mono">
                                  ${cost.cost.toFixed(4)}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Voiceover */}
                        <div className="glass rounded-xl p-4">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                              <Mic className="w-5 h-5 text-violet-400" />
                            </div>
                            <div>
                              <h3 className="font-medium">Voice Generation</h3>
                              <p className="text-xs text-muted-foreground">Cost per dialogue line (~100 chars)</p>
                            </div>
                          </div>
                          <div className="grid gap-2">
                            {actionCosts.voiceover.map((cost) => (
                              <div key={cost.provider} className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/5">
                                <div>
                                  <span className="font-medium capitalize">{cost.provider}</span>
                                  {cost.description && (
                                    <p className="text-xs text-muted-foreground">{cost.description}</p>
                                  )}
                                </div>
                                <Badge variant="outline" className="border-green-500/30 text-green-400 font-mono">
                                  ${cost.cost.toFixed(4)}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Scene Generation */}
                        <div className="glass rounded-xl p-4">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                              <FileText className="w-5 h-5 text-cyan-400" />
                            </div>
                            <div>
                              <h3 className="font-medium">Scene Generation</h3>
                              <p className="text-xs text-muted-foreground">Cost per scene description</p>
                            </div>
                          </div>
                          <div className="grid gap-2">
                            {actionCosts.scene.map((cost) => (
                              <div key={cost.provider} className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/5">
                                <div>
                                  <span className="font-medium capitalize">{cost.provider}</span>
                                  {cost.description && (
                                    <p className="text-xs text-muted-foreground">{cost.description}</p>
                                  )}
                                </div>
                                <Badge variant="outline" className="border-green-500/30 text-green-400 font-mono">
                                  ${cost.cost.toFixed(4)}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Character Generation */}
                        <div className="glass rounded-xl p-4">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-lg bg-pink-500/20 flex items-center justify-center">
                              <Users className="w-5 h-5 text-pink-400" />
                            </div>
                            <div>
                              <h3 className="font-medium">Character Generation</h3>
                              <p className="text-xs text-muted-foreground">Cost per character description</p>
                            </div>
                          </div>
                          <div className="grid gap-2">
                            {actionCosts.character.map((cost) => (
                              <div key={cost.provider} className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/5">
                                <div>
                                  <span className="font-medium capitalize">{cost.provider}</span>
                                  {cost.description && (
                                    <p className="text-xs text-muted-foreground">{cost.description}</p>
                                  )}
                                </div>
                                <Badge variant="outline" className="border-green-500/30 text-green-400 font-mono">
                                  ${cost.cost.toFixed(4)}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Master Prompt */}
                        <div className="glass rounded-xl p-4">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                              <Wand2 className="w-5 h-5 text-amber-400" />
                            </div>
                            <div>
                              <h3 className="font-medium">Master Prompt</h3>
                              <p className="text-xs text-muted-foreground">Cost per master prompt generation</p>
                            </div>
                          </div>
                          <div className="grid gap-2">
                            {actionCosts.prompt.map((cost) => (
                              <div key={cost.provider} className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/5">
                                <div>
                                  <span className="font-medium capitalize">{cost.provider}</span>
                                  {cost.description && (
                                    <p className="text-xs text-muted-foreground">{cost.description}</p>
                                  )}
                                </div>
                                <Badge variant="outline" className="border-green-500/30 text-green-400 font-mono">
                                  ${cost.cost.toFixed(4)}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>Click the Pricing tab to load costs</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Info Card */}
                <Card className="glass border-white/10 border-l-4 border-l-green-500">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">
                      These costs reflect the actual API pricing from providers. Costs are managed by the system administrator and stored in the database.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
