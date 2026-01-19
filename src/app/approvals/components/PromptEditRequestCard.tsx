import { motion } from 'framer-motion';
import { Clock, Check, Undo2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { PromptEditRequest } from '@/types/collaboration';
import { formatDate } from '../utils';

interface PromptEditRequestCardProps {
  request: PromptEditRequest & { project?: { id: string; name: string } };
  processingIds: Set<string>;
  expandedDiffs: Set<string>;
  setExpandedDiffs: React.Dispatch<React.SetStateAction<Set<string>>>;
  fieldLabels: Record<string, string>;
  onAction: (request: PromptEditRequest, action: 'approve' | 'revert') => void;
  t: (key: string, params?: Record<string, unknown>) => string;
}

export const PromptEditRequestCard = ({
  request,
  processingIds,
  expandedDiffs,
  setExpandedDiffs,
  fieldLabels,
  onAction,
  t,
}: PromptEditRequestCardProps) => {
  const toggleDiff = () => {
    setExpandedDiffs(prev => {
      const next = new Set(prev);
      if (next.has(request.id)) {
        next.delete(request.id);
      } else {
        next.add(request.id);
      }
      return next;
    });
  };

  return (
    <motion.div
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
          onClick={toggleDiff}
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
        <span>{formatDate(request.createdAt, t)}</span>
      </div>
      <div className="flex gap-1">
        <Button
          size="sm"
          variant="ghost"
          className="flex-1 h-7 text-xs text-red-400 hover:bg-red-500/10"
          onClick={() => onAction(request, 'revert')}
          disabled={processingIds.has(request.id)}
        >
          <Undo2 className="w-3 h-3 mr-1" />
          {t('revert')}
        </Button>
        <Button
          size="sm"
          className="flex-1 h-7 text-xs bg-green-600 hover:bg-green-500"
          onClick={() => onAction(request, 'approve')}
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
  );
};
