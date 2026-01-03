'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import NextImage from 'next/image';
import {
  Shield,
  Check,
  X,
  Clock,
  Trash2,
  Film,
  Image as ImageIcon,
  Video,
  User,
  Loader2,
  FileText,
  Undo2,
  RefreshCw,
  CheckCheck,
  Filter,
  Terminal,
  ChevronDown,
  ChevronUp,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { DeletionRequest, RegenerationRequest, PromptEditRequest } from '@/types/collaboration';

// Field labels moved inside component to use translations

interface ProjectInfo {
  id: string;
  name: string;
}

// Log entry type for regeneration tracking
interface LogEntry {
  timestamp: string;
  type: 'info' | 'success' | 'error' | 'cost';
  message: string;
  details?: Record<string, unknown>;
}

export default function ApprovalsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const t = useTranslations('approvals');

  // Field labels for display (translated)
  const fieldLabels: Record<string, string> = {
    textToImagePrompt: t('t2iPrompt'),
    imageToVideoPrompt: t('i2vPrompt'),
    description: t('description'),
  };

  const [deletionRequests, setDeletionRequests] = useState<(DeletionRequest & { project?: ProjectInfo })[]>([]);
  const [regenerationRequests, setRegenerationRequests] = useState<(RegenerationRequest & { project?: ProjectInfo })[]>([]);
  const [promptEditRequests, setPromptEditRequests] = useState<(PromptEditRequest & { project?: ProjectInfo })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [expandedDiffs, setExpandedDiffs] = useState<Set<string>>(new Set());
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [filterProject, setFilterProject] = useState<string>('all');
  const [filterUser, setFilterUser] = useState<string>('all');

  // Check if admin
  const isAdmin = session?.user?.email === 'andrej.galad@gmail.com';

  // Redirect non-admins
  useEffect(() => {
    if (status === 'authenticated' && !isAdmin) {
      router.push('/');
    }
  }, [status, isAdmin, router]);

  // Fetch all pending requests across all projects
  const fetchAllRequests = useCallback(async () => {
    if (!isAdmin) return;

    try {
      const response = await fetch('/api/admin/approvals');
      if (response.ok) {
        const data = await response.json();
        setDeletionRequests(data.deletionRequests || []);
        setRegenerationRequests(data.regenerationRequests || []);
        setPromptEditRequests(data.promptEditRequests || []);
      }
    } catch (e) {
      console.error('Failed to fetch requests:', e);
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchAllRequests();
  }, [fetchAllRequests]);

  // Get unique projects and users for filters
  const projects = useMemo(() => {
    const projectMap = new Map<string, string>();
    [...deletionRequests, ...regenerationRequests, ...promptEditRequests].forEach(r => {
      if (r.project) {
        projectMap.set(r.project.id, r.project.name);
      }
    });
    return Array.from(projectMap.entries()).map(([id, name]) => ({ id, name }));
  }, [deletionRequests, regenerationRequests, promptEditRequests]);

  const users = useMemo(() => {
    const userMap = new Map<string, string>();
    [...deletionRequests, ...regenerationRequests, ...promptEditRequests].forEach(r => {
      if (r.requester) {
        userMap.set(r.requester.id, r.requester.name || r.requester.email || t('common.unknown'));
      }
    });
    return Array.from(userMap.entries()).map(([id, name]) => ({ id, name }));
  }, [deletionRequests, regenerationRequests, promptEditRequests, t]);

  // Filter requests
  const filteredDeletions = useMemo(() => {
    return deletionRequests.filter(r => {
      if (filterProject !== 'all' && r.projectId !== filterProject) return false;
      if (filterUser !== 'all' && r.requesterId !== filterUser) return false;
      return r.status === 'pending';
    });
  }, [deletionRequests, filterProject, filterUser]);

  // Split regenerations into initial pending and final approval
  const filteredRegenerations = useMemo(() => {
    return regenerationRequests.filter(r => {
      if (filterProject !== 'all' && r.projectId !== filterProject) return false;
      if (filterUser !== 'all' && r.requesterId !== filterUser) return false;
      return r.status === 'pending';
    });
  }, [regenerationRequests, filterProject, filterUser]);

  const awaitingFinalApproval = useMemo(() => {
    return regenerationRequests.filter(r => {
      if (filterProject !== 'all' && r.projectId !== filterProject) return false;
      if (filterUser !== 'all' && r.requesterId !== filterUser) return false;
      return r.status === 'awaiting_final';
    });
  }, [regenerationRequests, filterProject, filterUser]);

  const filteredPromptEdits = useMemo(() => {
    return promptEditRequests.filter(r => {
      if (filterProject !== 'all' && r.projectId !== filterProject) return false;
      if (filterUser !== 'all' && r.requesterId !== filterUser) return false;
      return r.status === 'pending';
    });
  }, [promptEditRequests, filterProject, filterUser]);

  // Action handlers
  const handleDeletionAction = async (request: DeletionRequest, action: 'approved' | 'rejected') => {
    setProcessingIds(prev => new Set(prev).add(request.id));
    try {
      const response = await fetch(`/api/projects/${request.projectId}/deletion-requests/${request.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved: action === 'approved' }),
      });
      if (response.ok) {
        setDeletionRequests(prev => prev.filter(r => r.id !== request.id));
      }
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(request.id);
        return next;
      });
    }
  };

  const handleRegenerationAction = async (request: RegenerationRequest, approved: boolean) => {
    setProcessingIds(prev => new Set(prev).add(request.id));
    try {
      const response = await fetch(`/api/projects/${request.projectId}/regeneration-requests/${request.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved }),
      });
      if (response.ok) {
        setRegenerationRequests(prev => prev.filter(r => r.id !== request.id));
      }
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(request.id);
        return next;
      });
    }
  };

  // Final approval for regeneration (after collaborator selected)
  const handleFinalApproval = async (request: RegenerationRequest, action: 'final_approve' | 'final_reject') => {
    setProcessingIds(prev => new Set(prev).add(request.id));
    try {
      const response = await fetch(`/api/projects/${request.projectId}/regeneration-requests/${request.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (response.ok) {
        setRegenerationRequests(prev => prev.filter(r => r.id !== request.id));
      }
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(request.id);
        return next;
      });
    }
  };

  const handlePromptEditAction = async (request: PromptEditRequest, action: 'approve' | 'revert') => {
    setProcessingIds(prev => new Set(prev).add(request.id));
    try {
      const response = await fetch(`/api/projects/${request.projectId}/prompt-edits/${request.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (response.ok) {
        setPromptEditRequests(prev => prev.filter(r => r.id !== request.id));
      }
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(request.id);
        return next;
      });
    }
  };

  // Bulk actions
  const handleBulkApproveByUser = async (type: 'deletion' | 'regeneration' | 'prompt', userId: string) => {
    const requests = type === 'deletion'
      ? filteredDeletions.filter(r => r.requesterId === userId)
      : type === 'regeneration'
      ? filteredRegenerations.filter(r => r.requesterId === userId)
      : filteredPromptEdits.filter(r => r.requesterId === userId);

    for (const request of requests) {
      if (type === 'deletion') {
        await handleDeletionAction(request as DeletionRequest, 'approved');
      } else if (type === 'regeneration') {
        await handleRegenerationAction(request as RegenerationRequest, true);
      } else {
        await handlePromptEditAction(request as PromptEditRequest, 'approve');
      }
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffHours < 1) return t('justNow');
    if (diffHours < 24) return t('hoursAgo', { hours: diffHours });
    if (diffDays < 7) return t('daysAgo', { days: diffDays });
    return date.toLocaleDateString();
  };

  const toggleDiff = (id: string) => {
    setExpandedDiffs(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleLogs = (id: string) => {
    setExpandedLogs(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Get icon for log type
  const getLogIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-3 h-3 text-green-400" />;
      case 'error': return <AlertCircle className="w-3 h-3 text-red-400" />;
      case 'cost': return <DollarSign className="w-3 h-3 text-amber-400" />;
      default: return <Info className="w-3 h-3 text-blue-400" />;
    }
  };

  const formatLogTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // Get users with pending requests for bulk actions
  const usersWithDeletions = useMemo(() => {
    const userCounts = new Map<string, { name: string; count: number }>();
    filteredDeletions.forEach(r => {
      const current = userCounts.get(r.requesterId) || { name: r.requester?.name || t('common.unknown'), count: 0 };
      userCounts.set(r.requesterId, { ...current, count: current.count + 1 });
    });
    return Array.from(userCounts.entries()).filter(([_, v]) => v.count > 1);
  }, [filteredDeletions, t]);

  const usersWithRegenerations = useMemo(() => {
    const userCounts = new Map<string, { name: string; count: number }>();
    filteredRegenerations.forEach(r => {
      const current = userCounts.get(r.requesterId) || { name: r.requester?.name || t('common.unknown'), count: 0 };
      userCounts.set(r.requesterId, { ...current, count: current.count + 1 });
    });
    return Array.from(userCounts.entries()).filter(([_, v]) => v.count > 1);
  }, [filteredRegenerations, t]);

  const usersWithPromptEdits = useMemo(() => {
    const userCounts = new Map<string, { name: string; count: number }>();
    filteredPromptEdits.forEach(r => {
      const current = userCounts.get(r.requesterId) || { name: r.requester?.name || t('common.unknown'), count: 0 };
      userCounts.set(r.requesterId, { ...current, count: current.count + 1 });
    });
    return Array.from(userCounts.entries()).filter(([_, v]) => v.count > 1);
  }, [filteredPromptEdits, t]);

  const totalPending = filteredDeletions.length + filteredRegenerations.length + filteredPromptEdits.length + awaitingFinalApproval.length;

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/50">
      {/* Header */}
      <div className="sticky top-16 z-30 glass-strong border-b border-amber-500/20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <Shield className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-amber-500">{t('pageTitle')}</h1>
                <p className="text-sm text-muted-foreground">
                  {totalPending} {t('pendingRequests')}
                </p>
              </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={filterProject} onValueChange={setFilterProject}>
                <SelectTrigger className="w-40 bg-white/5 border-white/10">
                  <SelectValue placeholder={t('allProjects')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allProjects')}</SelectItem>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterUser} onValueChange={setFilterUser}>
                <SelectTrigger className="w-40 bg-white/5 border-white/10">
                  <SelectValue placeholder={t('allUsers')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allUsers')}</SelectItem>
                  {users.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Content - 3 Column Layout */}
      <div className="container mx-auto px-4 py-6">
        {totalPending === 0 ? (
          <div className="text-center py-20">
            <Shield className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
            <h2 className="text-xl font-semibold mb-2">{t('allClear')}</h2>
            <p className="text-muted-foreground">{t('noRequestsToReview')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Regeneration Column */}
            <Card className="glass border-cyan-500/20">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-cyan-400">
                  <RefreshCw className="w-5 h-5" />
                  {t('regenerations')}
                  <Badge className="bg-cyan-500/20 text-cyan-400 border-0">
                    {filteredRegenerations.length}
                  </Badge>
                </CardTitle>
                {/* Bulk actions */}
                {usersWithRegenerations.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-2">
                    {usersWithRegenerations.map(([userId, { name, count }]) => (
                      <Button
                        key={userId}
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs border-cyan-500/30 hover:bg-cyan-500/20"
                        onClick={() => handleBulkApproveByUser('regeneration', userId)}
                      >
                        <CheckCheck className="w-3 h-3 mr-1" />
                        {name} ({count})
                      </Button>
                    ))}
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto">
                <AnimatePresence mode="popLayout">
                  {filteredRegenerations.map(request => (
                    <motion.div
                      key={request.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="p-3 bg-cyan-500/5 border border-cyan-500/20 rounded-lg space-y-2"
                    >
                      <div className="flex items-start gap-2">
                        <div className="relative w-12 h-8 rounded overflow-hidden bg-black/30 flex-shrink-0">
                          {request.scene?.imageUrl ? (
                            <NextImage
                              src={request.scene.imageUrl}
                              alt=""
                              fill
                              className="object-cover"
                              sizes="48px"
                            />
                          ) : (
                            <ImageIcon className="w-4 h-4 m-auto text-muted-foreground/50" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{request.targetName}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {request.project?.name}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Avatar className="w-4 h-4">
                          <AvatarImage src={request.requester?.image || undefined} />
                          <AvatarFallback className="text-[8px]">
                            {request.requester?.name?.charAt(0) || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate">{request.requester?.name}</span>
                        <span>·</span>
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(request.createdAt)}</span>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="flex-1 h-7 text-xs"
                          onClick={() => handleRegenerationAction(request, false)}
                          disabled={processingIds.has(request.id)}
                        >
                          <X className="w-3 h-3 mr-1" />
                          {t('reject')}
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1 h-7 text-xs bg-cyan-600 hover:bg-cyan-500"
                          onClick={() => handleRegenerationAction(request, true)}
                          disabled={processingIds.has(request.id)}
                        >
                          {processingIds.has(request.id) ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <>
                              <Check className="w-3 h-3 mr-1" />
                              {t('approve')}
                            </>
                          )}
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {filteredRegenerations.length === 0 && awaitingFinalApproval.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-4">{t('noPendingRegenerations')}</p>
                )}

                {/* Final Approval Section */}
                {awaitingFinalApproval.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-green-500/20">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge className="bg-green-500/20 text-green-400 border-0 text-xs">
                        {t('finalReview')}: {awaitingFinalApproval.length}
                      </Badge>
                    </div>
                    <AnimatePresence mode="popLayout">
                      {awaitingFinalApproval.map(request => {
                        const generatedUrls = (request.generatedUrls || []) as string[];
                        return (
                          <motion.div
                            key={request.id}
                            layout
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="p-3 bg-green-500/5 border border-green-500/20 rounded-lg space-y-2 mb-3"
                          >
                            <div className="flex items-start gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-green-400">
                                  {request.targetName} - {t('selectionReady')}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {request.project?.name}
                                </p>
                              </div>
                            </div>

                            {/* Show all generated options with selected highlighted */}
                            <div className="grid grid-cols-3 gap-2">
                              {generatedUrls.map((url, idx) => (
                                <div
                                  key={url}
                                  className={`relative aspect-video rounded overflow-hidden ${
                                    url === request.selectedUrl
                                      ? 'ring-2 ring-green-500'
                                      : 'opacity-50'
                                  }`}
                                >
                                  <NextImage
                                    src={url}
                                    alt={`Option ${idx + 1}`}
                                    fill
                                    className="object-cover"
                                    sizes="100px"
                                  />
                                  {url === request.selectedUrl && (
                                    <div className="absolute top-1 left-1">
                                      <Badge className="bg-green-500 text-white border-0 text-[8px] px-1">
                                        {t('selected')}
                                      </Badge>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>

                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Avatar className="w-4 h-4">
                                <AvatarImage src={request.requester?.image || undefined} />
                                <AvatarFallback className="text-[8px]">
                                  {request.requester?.name?.charAt(0) || '?'}
                                </AvatarFallback>
                              </Avatar>
                              <span className="truncate">{request.requester?.name}</span>
                            </div>

                            {/* Logs Console */}
                            {((request as unknown as { logs?: LogEntry[] }).logs?.length ?? 0) > 0 && (
                              <div className="mt-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="w-full h-6 text-xs text-cyan-400 hover:bg-cyan-500/10 justify-between"
                                  onClick={() => toggleLogs(request.id)}
                                >
                                  <span className="flex items-center gap-1">
                                    <Terminal className="w-3 h-3" />
                                    Console Logs ({((request as unknown as { logs?: LogEntry[] }).logs?.length ?? 0)})
                                  </span>
                                  {expandedLogs.has(request.id) ? (
                                    <ChevronUp className="w-3 h-3" />
                                  ) : (
                                    <ChevronDown className="w-3 h-3" />
                                  )}
                                </Button>
                                {expandedLogs.has(request.id) && (
                                  <div className="mt-2 p-2 bg-black/50 rounded border border-cyan-500/20 font-mono text-[10px] max-h-40 overflow-y-auto space-y-1">
                                    {((request as unknown as { logs?: LogEntry[] }).logs || []).map((log, idx) => (
                                      <div key={idx} className="flex items-start gap-2">
                                        <span className="text-muted-foreground shrink-0">
                                          {formatLogTime(log.timestamp)}
                                        </span>
                                        {getLogIcon(log.type)}
                                        <span className={
                                          log.type === 'error' ? 'text-red-400' :
                                          log.type === 'success' ? 'text-green-400' :
                                          log.type === 'cost' ? 'text-amber-400' :
                                          'text-blue-400'
                                        }>
                                          {log.message}
                                        </span>
                                      </div>
                                    ))}
                                    {/* Show details for cost logs */}
                                    {((request as unknown as { logs?: LogEntry[] }).logs || [])
                                      .filter(log => log.type === 'cost' && log.details)
                                      .map((log, idx) => (
                                        <div key={`detail-${idx}`} className="pl-16 text-muted-foreground">
                                          Provider: {String(log.details?.provider)} | Cost: ${Number(log.details?.realCost || 0).toFixed(2)}
                                        </div>
                                      ))
                                    }
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="flex-1 h-7 text-xs text-red-400 hover:bg-red-500/10"
                                onClick={() => handleFinalApproval(request, 'final_reject')}
                                disabled={processingIds.has(request.id)}
                              >
                                <X className="w-3 h-3 mr-1" />
                                {t('rejectAll')}
                              </Button>
                              <Button
                                size="sm"
                                className="flex-1 h-7 text-xs bg-green-600 hover:bg-green-500"
                                onClick={() => handleFinalApproval(request, 'final_approve')}
                                disabled={processingIds.has(request.id)}
                              >
                                {processingIds.has(request.id) ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <>
                                    <Check className="w-3 h-3 mr-1" />
                                    {t('applySelection')}
                                  </>
                                )}
                              </Button>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Prompt Edits Column */}
            <Card className="glass border-purple-500/20">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-purple-400">
                  <FileText className="w-5 h-5" />
                  {t('promptEdits')}
                  <Badge className="bg-purple-500/20 text-purple-400 border-0">
                    {filteredPromptEdits.length}
                  </Badge>
                </CardTitle>
                {usersWithPromptEdits.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-2">
                    {usersWithPromptEdits.map(([userId, { name, count }]) => (
                      <Button
                        key={userId}
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs border-purple-500/30 hover:bg-purple-500/20"
                        onClick={() => handleBulkApproveByUser('prompt', userId)}
                      >
                        <CheckCheck className="w-3 h-3 mr-1" />
                        {name} ({count})
                      </Button>
                    ))}
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto">
                <AnimatePresence mode="popLayout">
                  {filteredPromptEdits.map(request => (
                    <motion.div
                      key={request.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="p-3 bg-purple-500/5 border border-purple-500/20 rounded-lg space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{fieldLabels[request.fieldName]}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {t('scene')}: {request.sceneName} · {request.project?.name}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-xs text-purple-400"
                          onClick={() => toggleDiff(request.id)}
                        >
                          {expandedDiffs.has(request.id) ? t('hide') : t('show')}
                        </Button>
                      </div>

                      {expandedDiffs.has(request.id) && (
                        <div className="space-y-2 text-xs">
                          <div className="p-2 bg-red-500/10 border border-red-500/20 rounded">
                            <p className="text-red-400 font-medium mb-1">{t('before')}:</p>
                            <pre className="text-red-200 whitespace-pre-wrap break-words max-h-20 overflow-y-auto">
                              {request.oldValue || t('empty')}
                            </pre>
                          </div>
                          <div className="p-2 bg-green-500/10 border border-green-500/20 rounded">
                            <p className="text-green-400 font-medium mb-1">{t('after')}:</p>
                            <pre className="text-green-200 whitespace-pre-wrap break-words max-h-20 overflow-y-auto">
                              {request.newValue || t('empty')}
                            </pre>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Avatar className="w-4 h-4">
                          <AvatarImage src={request.requester?.image || undefined} />
                          <AvatarFallback className="text-[8px]">
                            {request.requester?.name?.charAt(0) || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate">{request.requester?.name}</span>
                        <span>·</span>
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(request.createdAt)}</span>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="flex-1 h-7 text-xs text-red-400 hover:bg-red-500/10"
                          onClick={() => handlePromptEditAction(request, 'revert')}
                          disabled={processingIds.has(request.id)}
                        >
                          <Undo2 className="w-3 h-3 mr-1" />
                          {t('revert')}
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1 h-7 text-xs bg-green-600 hover:bg-green-500"
                          onClick={() => handlePromptEditAction(request, 'approve')}
                          disabled={processingIds.has(request.id)}
                        >
                          {processingIds.has(request.id) ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <>
                              <Check className="w-3 h-3 mr-1" />
                              {t('accept')}
                            </>
                          )}
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {filteredPromptEdits.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-4">{t('noPendingEdits')}</p>
                )}
              </CardContent>
            </Card>

            {/* Deletions Column */}
            <Card className="glass border-orange-500/20">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-orange-400">
                  <Trash2 className="w-5 h-5" />
                  {t('deletions')}
                  <Badge className="bg-orange-500/20 text-orange-400 border-0">
                    {filteredDeletions.length}
                  </Badge>
                </CardTitle>
                {usersWithDeletions.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-2">
                    {usersWithDeletions.map(([userId, { name, count }]) => (
                      <Button
                        key={userId}
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs border-orange-500/30 hover:bg-orange-500/20"
                        onClick={() => handleBulkApproveByUser('deletion', userId)}
                      >
                        <CheckCheck className="w-3 h-3 mr-1" />
                        {name} ({count})
                      </Button>
                    ))}
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto">
                <AnimatePresence mode="popLayout">
                  {filteredDeletions.map(request => (
                    <motion.div
                      key={request.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="p-3 bg-orange-500/5 border border-orange-500/20 rounded-lg space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded bg-orange-500/20 flex items-center justify-center">
                          {request.targetType === 'scene' && <ImageIcon className="w-4 h-4 text-orange-400" />}
                          {request.targetType === 'character' && <User className="w-4 h-4 text-orange-400" />}
                          {request.targetType === 'video' && <Video className="w-4 h-4 text-orange-400" />}
                          {request.targetType === 'project' && <Film className="w-4 h-4 text-orange-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {t('delete')} {request.targetType}: {request.targetName}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {request.project?.name}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Avatar className="w-4 h-4">
                          <AvatarImage src={request.requester?.image || undefined} />
                          <AvatarFallback className="text-[8px]">
                            {request.requester?.name?.charAt(0) || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate">{request.requester?.name}</span>
                        <span>·</span>
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(request.createdAt)}</span>
                      </div>
                      {request.reason && (
                        <p className="text-xs text-muted-foreground bg-white/5 rounded p-2">
                          "{request.reason}"
                        </p>
                      )}
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="flex-1 h-7 text-xs"
                          onClick={() => handleDeletionAction(request, 'rejected')}
                          disabled={processingIds.has(request.id)}
                        >
                          <X className="w-3 h-3 mr-1" />
                          {t('reject')}
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1 h-7 text-xs bg-red-600 hover:bg-red-500"
                          onClick={() => handleDeletionAction(request, 'approved')}
                          disabled={processingIds.has(request.id)}
                        >
                          {processingIds.has(request.id) ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <>
                              <Check className="w-3 h-3 mr-1" />
                              {t('delete')}
                            </>
                          )}
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {filteredDeletions.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-4">{t('noPendingDeletions')}</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
