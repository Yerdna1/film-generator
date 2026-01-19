'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Shield,
  Loader2,
  RefreshCw,
  FileText,
  CheckCheck,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  useApprovalData,
  useApprovalActions,
} from './hooks';
import {
  Filters,
  DeletionRequestCard,
  RegenerationRequestCard,
  FinalApprovalSection,
  PromptEditRequestCard,
} from './components';
import type { DeletionRequest, RegenerationRequest, PromptEditRequest } from '@/types/collaboration';

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

  // Check if admin
  const isAdmin = session?.user?.email === 'andrej.galad@gmail.com';

  // State
  const [filterProject, setFilterProject] = useState<string>('all');
  const [filterUser, setFilterUser] = useState<string>('all');
  const [expandedDiffs, setExpandedDiffs] = useState<Set<string>>(new Set());
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

  // Data fetching
  const {
    deletionRequests,
    regenerationRequests,
    promptEditRequests,
    isLoading,
    processingIds,
    setDeletionRequests,
    setRegenerationRequests,
    setPromptEditRequests,
    setProcessingIds,
    fetchAllRequests,
  } = useApprovalData({ isAdmin });

  // Actions
  const filteredDeletions = useMemo(() => {
    return deletionRequests.filter(r => {
      if (filterProject !== 'all' && r.projectId !== filterProject) return false;
      if (filterUser !== 'all' && r.requesterId !== filterUser) return false;
      return r.status === 'pending';
    });
  }, [deletionRequests, filterProject, filterUser]);

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

  const {
    handleDeletionAction,
    handleRegenerationAction,
    handleFinalApproval,
    handlePromptEditAction,
    handleBulkApproveByUser,
  } = useApprovalActions({
    setDeletionRequests,
    setRegenerationRequests,
    setPromptEditRequests,
    setProcessingIds,
    filteredDeletions,
    filteredRegenerations,
    filteredPromptEdits,
  });

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

  // Redirect non-admins
  useEffect(() => {
    if (status === 'authenticated' && !isAdmin) {
      router.push('/');
    }
  }, [status, isAdmin, router]);

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

            <Filters
              filterProject={filterProject}
              setFilterProject={setFilterProject}
              filterUser={filterUser}
              setFilterUser={setFilterUser}
              projects={projects}
              users={users}
              t={t}
            />
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
                    <RegenerationRequestCard
                      key={request.id}
                      request={request}
                      processingIds={processingIds}
                      onAction={handleRegenerationAction}
                      t={t}
                    />
                  ))}
                </AnimatePresence>
                {filteredRegenerations.length === 0 && awaitingFinalApproval.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-4">{t('noPendingRegenerations')}</p>
                )}

                {/* Final Approval Section */}
                <FinalApprovalSection
                  requests={awaitingFinalApproval}
                  processingIds={processingIds}
                  expandedLogs={expandedLogs}
                  setExpandedLogs={setExpandedLogs}
                  onAction={handleFinalApproval}
                  t={t}
                />
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
                    <PromptEditRequestCard
                      key={request.id}
                      request={request}
                      processingIds={processingIds}
                      expandedDiffs={expandedDiffs}
                      setExpandedDiffs={setExpandedDiffs}
                      fieldLabels={fieldLabels}
                      onAction={handlePromptEditAction}
                      t={t}
                    />
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
                    <DeletionRequestCard
                      key={request.id}
                      request={request}
                      processingIds={processingIds}
                      onAction={handleDeletionAction}
                      t={t}
                    />
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
