import { motion, AnimatePresence } from 'framer-motion';
import NextImage from 'next/image';
import { ChevronDown, ChevronUp, Terminal, Check, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { RegenerationRequest } from '@/types/collaboration';
import type { LogEntry } from '../types';
import { formatLogTime, getLogIcon } from '../utils';

interface FinalApprovalSectionProps {
  requests: (RegenerationRequest & { project?: { id: string; name: string } })[];
  processingIds: Set<string>;
  expandedLogs: Set<string>;
  setExpandedLogs: React.Dispatch<React.SetStateAction<Set<string>>>;
  onAction: (request: RegenerationRequest, action: 'final_approve' | 'final_reject') => void;
  t: (key: string, params?: Record<string, string | number | Date>) => string;
}

const LogIcon = ({ type }: { type: string }) => {
  const iconName = getLogIcon(type);
  switch (iconName) {
    case 'CheckCircle':
      return <Check className="w-3 h-3 text-green-400" />;
    case 'AlertCircle':
      return <X className="w-3 h-3 text-red-400" />;
    default:
      return <Terminal className="w-3 h-3 text-amber-400" />;
  }
};

export const FinalApprovalSection = ({
  requests,
  processingIds,
  expandedLogs,
  setExpandedLogs,
  onAction,
  t,
}: FinalApprovalSectionProps) => {
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

  if (requests.length === 0) return null;

  return (
    <div className="mt-4 pt-4 border-t border-green-500/20">
      <div className="flex items-center gap-2 mb-3">
        <Badge className="bg-green-500/20 text-green-400 border-0 text-xs">
          {t('finalReview')}: {requests.length}
        </Badge>
      </div>
      <AnimatePresence mode="popLayout">
        {requests.map(request => {
          const generatedUrls = (request.generatedUrls || []) as string[];
          const logs = (request as unknown as { logs?: LogEntry[] }).logs || [];

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
              {logs.length > 0 && (
                <div className="mt-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-full h-6 text-xs text-cyan-400 hover:bg-cyan-500/10 justify-between"
                    onClick={() => toggleLogs(request.id)}
                  >
                    <span className="flex items-center gap-1">
                      <Terminal className="w-3 h-3" />
                      Console Logs ({logs.length})
                    </span>
                    {expandedLogs.has(request.id) ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                  </Button>
                  {expandedLogs.has(request.id) && (
                    <div className="mt-2 p-2 bg-black/50 rounded border border-cyan-500/20 font-mono text-[10px] max-h-40 overflow-y-auto space-y-1">
                      {logs.map((log, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <span className="text-muted-foreground shrink-0">
                            {formatLogTime(log.timestamp)}
                          </span>
                          <LogIcon type={log.type} />
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
                      {logs
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
                  onClick={() => onAction(request, 'final_reject')}
                  disabled={processingIds.has(request.id)}
                >
                  <X className="w-3 h-3 mr-1" />
                  {t('rejectAll')}
                </Button>
                <Button
                  size="sm"
                  className="flex-1 h-7 text-xs bg-green-600 hover:bg-green-500"
                  onClick={() => onAction(request, 'final_approve')}
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
  );
};
