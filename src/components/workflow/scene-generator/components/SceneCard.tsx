'use client';

import { memo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { ConfirmDeleteDialog } from '@/components/shared/ConfirmDeleteDialog';
import { DeletionRequestDialog } from '@/components/collaboration/DeletionRequestDialog';
import { RegenerationSelectionModal } from '@/components/collaboration/RegenerationSelectionModal';
import { LockedSceneModal } from '@/components/shared/LockedSceneModal';
import type { RegenerationRequest } from '@/types/collaboration';
import {
  Image as ImageIcon,
  Trash2,
  Sparkles,
  RefreshCw,
  Edit3,
  Camera,
  Film,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Expand,
  Clock,
  Lock,
  Unlock,
  CheckCircle,
  Play,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { CopyButton } from '@/components/shared/CopyButton';
import type { ImageResolution } from '@/lib/services/real-costs';
import type { Scene, Character } from '@/types/project';

interface SceneCardProps {
  scene: Scene;
  index: number;
  projectId: string;
  isExpanded: boolean;
  isGeneratingImage: boolean;
  isGeneratingAllImages: boolean;
  imageResolution: ImageResolution;
  characters: Character[];
  isSelected?: boolean;
  hasPendingRegeneration?: boolean;
  hasPendingDeletion?: boolean;
  approvedRegeneration?: RegenerationRequest | null; // Approved request ready to use
  canDeleteDirectly?: boolean; // Admin can delete directly, collaborators must request
  isAdmin?: boolean; // Can lock/unlock scenes
  isReadOnly?: boolean;
  isAuthenticated?: boolean;
  isFirstImage?: boolean;
  onToggleSelect?: () => void;
  onToggleExpand: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onGenerateImage: () => void;
  onRegeneratePrompts: () => void;
  onPreviewImage: (imageUrl: string) => void;
  onDeletionRequested?: () => void; // Callback when deletion request is sent
  onUseRegenerationAttempt?: (requestId: string) => Promise<void>; // Use one of the approved regeneration attempts
  onSelectRegeneration?: (requestId: string, selectedUrl: string) => Promise<void>; // Submit selection for final approval
  onToggleLock?: () => void; // Toggle lock status (admin only)
}

function SceneCardComponent({
  scene,
  index,
  projectId,
  isExpanded,
  isGeneratingImage,
  isGeneratingAllImages,
  imageResolution,
  characters,
  isSelected = false,
  hasPendingRegeneration = false,
  hasPendingDeletion = false,
  approvedRegeneration = null,
  canDeleteDirectly = true,
  isAdmin = false,
  isReadOnly = false,
  isAuthenticated = true,
  isFirstImage = false,
  onToggleSelect,
  onToggleExpand,
  onDelete,
  onEdit,
  onGenerateImage,
  onRegeneratePrompts,
  onPreviewImage,
  onDeletionRequested,
  onUseRegenerationAttempt,
  onSelectRegeneration,
  onToggleLock,
}: SceneCardProps) {
  const t = useTranslations();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeletionRequest, setShowDeletionRequest] = useState(false);
  const [showRegenerationModal, setShowRegenerationModal] = useState(false);
  const [showLockedModal, setShowLockedModal] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isTogglingLock, setIsTogglingLock] = useState(false);

  // Determine if this image is restricted (non-first image for unauthenticated users)
  const isRestricted = !isAuthenticated && scene.imageUrl && !isFirstImage;

  // Handler for locked actions - shows modal instead of performing action
  const handleLockedAction = () => {
    if (scene.locked) {
      setShowLockedModal(true);
      return true;
    }
    return false;
  };

  // Handle lock toggle
  const handleToggleLock = async () => {
    if (!onToggleLock) return;
    setIsTogglingLock(true);
    try {
      await onToggleLock();
    } finally {
      setIsTogglingLock(false);
    }
  };

  return (
    <>
      {/* Admin: Direct delete confirmation */}
      <ConfirmDeleteDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onConfirm={onDelete}
        itemName={scene.title}
      />
      {/* Collaborator: Request deletion dialog */}
      <DeletionRequestDialog
        projectId={projectId}
        targetType="scene"
        targetId={scene.id}
        targetName={scene.title}
        open={showDeletionRequest}
        onOpenChange={setShowDeletionRequest}
        onRequestSent={onDeletionRequested}
      />
      {/* Regeneration Selection Modal for approved requests */}
      {approvedRegeneration && onUseRegenerationAttempt && onSelectRegeneration && (
        <RegenerationSelectionModal
          open={showRegenerationModal}
          onOpenChange={setShowRegenerationModal}
          request={approvedRegeneration}
          onRegenerate={async () => {
            setIsRegenerating(true);
            try {
              await onUseRegenerationAttempt(approvedRegeneration.id);
            } finally {
              setIsRegenerating(false);
            }
          }}
          onSelect={async (selectedUrl) => {
            await onSelectRegeneration(approvedRegeneration.id, selectedUrl);
            setShowRegenerationModal(false);
          }}
        />
      )}
      {/* Locked Scene Modal */}
      <LockedSceneModal
        isOpen={showLockedModal}
        onClose={() => setShowLockedModal(false)}
        sceneName={scene.title}
      />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: (index % 12) * 0.03 }}
      >
        <Card className={`overflow-hidden ${
          // Background colors based on regeneration status - use solid bg instead of glass for status cards
          scene.locked
            ? 'bg-amber-900/40 border-amber-500/50 ring-1 ring-amber-500/30'
            : approvedRegeneration?.status === 'approved'
            ? 'bg-emerald-900/60 border-emerald-400 ring-2 ring-emerald-400/50 shadow-lg shadow-emerald-500/20'
            : approvedRegeneration?.status === 'generating'
            ? 'bg-blue-900/60 border-blue-400 ring-2 ring-blue-400/50 shadow-lg shadow-blue-500/20'
            : approvedRegeneration?.status === 'selecting'
            ? 'bg-amber-900/60 border-amber-400 ring-2 ring-amber-400/50 shadow-lg shadow-amber-500/20'
            : approvedRegeneration?.status === 'awaiting_final'
            ? 'bg-purple-900/60 border-purple-400 ring-2 ring-purple-400/50 shadow-lg shadow-purple-500/20'
            : hasPendingRegeneration
            ? 'bg-cyan-900/50 border-cyan-400 ring-2 ring-cyan-400/40 shadow-lg shadow-cyan-500/20'
            : hasPendingDeletion
            ? 'bg-orange-900/50 border-orange-400 ring-2 ring-orange-400/40 shadow-lg shadow-orange-500/20'
            : 'glass border-white/10'
        }`}>
          <Collapsible open={isRestricted ? false : isExpanded} onOpenChange={isRestricted ? undefined : onToggleExpand}>
            {/* Image Preview - Vertical Layout */}
            <div className="relative aspect-video bg-black/30">
              {scene.imageUrl ? (
                isRestricted ? (
                  /* Restricted image - show blurred with lock overlay */
                  <div className="relative w-full h-full">
                    <Image
                      key={scene.imageUrl}
                      src={scene.imageUrl}
                      alt={scene.title}
                      fill
                      sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
                      className="object-cover blur-lg scale-110"
                      loading="lazy"
                      unoptimized={scene.imageUrl.startsWith('data:') || scene.imageUrl.includes('blob:')}
                    />
                    <a
                      href="/auth/register"
                      className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center hover:bg-black/60 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mb-1.5">
                        <Lock className="w-4 h-4 text-white/70" />
                      </div>
                      <p className="text-[10px] text-white/80 text-center px-2">
                        {t('steps.scenes.signInToView')}
                      </p>
                    </a>
                  </div>
                ) : (
                  <button
                    onClick={() => onPreviewImage(scene.imageUrl!)}
                    className="relative w-full h-full group"
                  >
                    <Image
                      key={scene.imageUrl}
                      src={scene.imageUrl}
                      alt={scene.title}
                      fill
                      sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
                      className="object-cover"
                      loading="lazy"
                      unoptimized={scene.imageUrl.startsWith('data:') || scene.imageUrl.includes('blob:')}
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Expand className="w-5 h-5 text-white" />
                    </div>
                  </button>
                )
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="w-10 h-10 text-muted-foreground/30" />
                </div>
              )}

              {/* Scene Number Badge */}
              <div className="absolute top-1.5 left-1.5 flex items-center gap-1">
                <Badge className="bg-black/60 text-emerald-400 border-0 text-xs px-1.5 py-0.5">
                  {index + 1}
                </Badge>
                {scene.locked && (
                  <Badge className="bg-amber-500/90 text-white border-0 text-[10px] px-1.5 py-0.5 flex items-center gap-0.5">
                    <Lock className="w-2.5 h-2.5" />
                    {t('steps.scenes.status.locked')}
                  </Badge>
                )}
                {hasPendingRegeneration && (
                  <Badge className="bg-cyan-500/80 text-white border-0 text-[10px] px-1.5 py-0.5 flex items-center gap-0.5">
                    <Clock className="w-2.5 h-2.5" />
                    {t('steps.scenes.status.pending')}
                  </Badge>
                )}
                {approvedRegeneration && approvedRegeneration.status === 'approved' && (
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <Badge
                      className="bg-emerald-500 text-white border-2 border-emerald-300 text-[10px] px-2 py-1 flex items-center gap-1 cursor-pointer hover:bg-emerald-400 hover:scale-110 transition-all shadow-lg shadow-emerald-500/50"
                      title={t('steps.scenes.status.clickToRegenerate')}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowRegenerationModal(true);
                      }}
                    >
                      <Sparkles className="w-3 h-3" />
                      <span className="font-bold">{t('steps.scenes.status.clickToRegenerate')}</span>
                      <span className="bg-white/20 px-1 rounded">{approvedRegeneration.maxAttempts - approvedRegeneration.attemptsUsed}x</span>
                    </Badge>
                  </motion.div>
                )}
                {approvedRegeneration && approvedRegeneration.status === 'generating' && (
                  <Badge className="bg-blue-500/90 text-white border-0 text-[10px] px-1.5 py-0.5 flex items-center gap-0.5">
                    <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                    {t('steps.scenes.status.generating')}
                  </Badge>
                )}
                {approvedRegeneration && approvedRegeneration.status === 'selecting' && (
                  <motion.div
                    animate={{ scale: [1, 1.08, 1] }}
                    transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <Badge
                      className="bg-amber-500 text-white border-2 border-amber-300 text-[10px] px-2 py-1 flex items-center gap-1 cursor-pointer hover:bg-amber-400 hover:scale-110 transition-all shadow-lg shadow-amber-500/50"
                      title={t('steps.scenes.status.clickToSelectBest')}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowRegenerationModal(true);
                      }}
                    >
                      <Play className="w-3 h-3" />
                      <span className="font-bold">{t('steps.scenes.status.clickToSelectBest')}</span>
                    </Badge>
                  </motion.div>
                )}
                {approvedRegeneration && approvedRegeneration.status === 'awaiting_final' && (
                  <Badge className="bg-purple-500/90 text-white border-0 text-[10px] px-1.5 py-0.5 flex items-center gap-0.5">
                    <Clock className="w-2.5 h-2.5" />
                    {t('steps.scenes.status.awaitingApproval')}
                  </Badge>
                )}
                {hasPendingDeletion && (
                  <Badge className="bg-orange-500/90 text-white border-0 text-[10px] px-1.5 py-0.5 flex items-center gap-0.5" title={t('steps.scenes.status.deletePending')}>
                    <Trash2 className="w-2.5 h-2.5" />
                    {t('steps.scenes.status.deletePending')}
                  </Badge>
                )}
              </div>

              {/* Selection Checkbox & Status */}
              <div className="absolute top-1.5 right-1.5 flex items-center gap-1.5">
                {onToggleSelect && (
                  <div onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={onToggleSelect}
                      className="h-5 w-5 border-2 border-white/50 bg-black/30 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                    />
                  </div>
                )}
                {scene.imageUrl && (
                  <Badge className="bg-emerald-500/80 text-white border-0 text-[10px] px-1.5 py-0.5">
                    ✓
                  </Badge>
                )}
              </div>

              {/* Generating Overlay */}
              {isGeneratingImage && (
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    className="w-8 h-8 mb-2"
                  >
                    <Sparkles className="w-full h-full text-emerald-400" />
                  </motion.div>
                  <p className="text-xs text-white">{t('steps.characters.generating')}</p>
                </div>
              )}
            </div>

            {/* Compact Content */}
            <CardContent className="p-2 space-y-1">
              {/* Title Row */}
              <div className="flex items-center justify-between gap-1">
                <h3 className="font-medium text-sm truncate flex-1">{scene.title}</h3>
                <div className="flex items-center gap-0.5 shrink-0">
                  {!isRestricted && (
                    <CopyButton text={scene.textToImagePrompt} size="icon" className="h-6 w-6" />
                  )}
                  {isRestricted ? (
                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-30 cursor-not-allowed" disabled>
                      <Lock className="w-3.5 h-3.5" />
                    </Button>
                  ) : (
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </Button>
                    </CollapsibleTrigger>
                  )}
                </div>
              </div>

              {/* Meta Info */}
              <div className="flex items-center gap-1.5 text-[10px]">
                <span className="text-emerald-400 flex items-center gap-0.5">
                  <Camera className="w-3 h-3" />
                  {scene.cameraShot}
                </span>
                {scene.dialogue.length > 0 && (
                  <span className="text-purple-400 flex items-center gap-0.5">
                    <MessageSquare className="w-3 h-3" />
                    {scene.dialogue.length}
                  </span>
                )}
              </div>

              {/* T2I Prompt Preview - hidden for restricted */}
              {!isRestricted && (
                <p className="text-[10px] text-muted-foreground/70 truncate" title={scene.textToImagePrompt}>
                  {scene.textToImagePrompt}
                </p>
              )}

              {/* Action Buttons - only for editors */}
              {!isReadOnly && (
                <div className="flex gap-1 pt-0.5">
                  <Button
                    size="sm"
                    className={`flex-1 h-7 text-white border-0 text-xs ${
                      scene.locked
                        ? 'bg-amber-600/50 hover:bg-amber-600/70 cursor-not-allowed'
                        : 'bg-gradient-to-r from-emerald-600/80 to-teal-600/80 hover:from-emerald-500 hover:to-teal-500'
                    }`}
                    onClick={() => {
                      if (handleLockedAction()) return;
                      onGenerateImage();
                    }}
                    disabled={isGeneratingImage || isGeneratingAllImages}
                  >
                    {isGeneratingImage ? (
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                        <Sparkles className="w-3.5 h-3.5" />
                      </motion.div>
                    ) : scene.locked ? (
                      <Lock className="w-3.5 h-3.5" />
                    ) : scene.imageUrl ? (
                      <RefreshCw className="w-3.5 h-3.5" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`h-7 ${scene.locked ? 'border-amber-500/30 text-amber-400' : 'border-white/10 hover:bg-white/5'}`}
                    onClick={() => {
                      if (handleLockedAction()) return;
                      onEdit();
                    }}
                  >
                    {scene.locked ? <Lock className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
                  </Button>
                  {/* Lock/Unlock button - admin only */}
                  {isAdmin && onToggleLock && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleToggleLock}
                      disabled={isTogglingLock}
                      className={`h-7 ${scene.locked ? 'text-amber-400 hover:text-amber-300' : 'text-muted-foreground hover:text-amber-400'}`}
                      title={scene.locked ? t('steps.scenes.unlock') : t('steps.scenes.lock')}
                    >
                      {isTogglingLock ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : scene.locked ? (
                        <Unlock className="w-3.5 h-3.5" />
                      ) : (
                        <Lock className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (handleLockedAction()) return;
                      canDeleteDirectly ? setShowDeleteConfirm(true) : setShowDeletionRequest(true);
                    }}
                    className={`h-7 ${scene.locked ? 'text-amber-400' : hasPendingDeletion ? 'text-orange-400' : 'text-muted-foreground hover:text-red-400'}`}
                    disabled={hasPendingDeletion}
                    title={scene.locked ? t('steps.scenes.status.locked') : hasPendingDeletion ? 'Deletion request pending' : canDeleteDirectly ? 'Delete scene' : 'Request deletion'}
                  >
                    {scene.locked ? <Lock className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              )}
            </CardContent>

            {/* Expanded Content */}
            <CollapsibleContent>
              <CardContent className="px-2 pb-2 pt-0 space-y-2">
                {/* Text-to-Image Prompt */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] text-emerald-400 flex items-center gap-1">
                      <ImageIcon className="w-3 h-3" />
                      {t('steps.scenes.prompts.t2iPrompt')}
                    </Label>
                    <div className="flex items-center gap-0.5">
                      {!isReadOnly && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-5 w-5 ${scene.locked ? 'text-amber-400' : ''}`}
                          onClick={() => {
                            if (handleLockedAction()) return;
                            onRegeneratePrompts();
                          }}
                        >
                          {scene.locked ? <Lock className="w-3 h-3" /> : <RefreshCw className="w-3 h-3" />}
                        </Button>
                      )}
                      <CopyButton text={scene.textToImagePrompt} size="icon" className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="glass rounded p-1.5 max-h-20 overflow-y-auto">
                    <pre className="text-[10px] text-muted-foreground whitespace-pre-wrap font-mono">
                      {scene.textToImagePrompt}
                    </pre>
                  </div>
                </div>

                {/* Image-to-Video Prompt */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] text-cyan-400 flex items-center gap-1">
                      <Film className="w-3 h-3" />
                      {t('steps.scenes.prompts.i2vPrompt')}
                    </Label>
                    <CopyButton text={scene.imageToVideoPrompt} size="icon" className="h-5 w-5" />
                  </div>
                  <div className="glass rounded p-1.5 max-h-16 overflow-y-auto">
                    <pre className="text-[10px] text-muted-foreground whitespace-pre-wrap font-mono">
                      {scene.imageToVideoPrompt}
                    </pre>
                  </div>
                </div>

                {/* Dialogue */}
                {scene.dialogue.length > 0 && (
                  <div className="space-y-1">
                    <Label className="text-[10px] text-purple-400 flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      {t('steps.scenes.dialogue')}
                    </Label>
                    <div className="glass rounded p-1.5 space-y-1">
                      {scene.dialogue.map((line, idx) => {
                        const character = characters.find((c) => c.id === line.characterId);
                        return (
                          <p key={idx} className="text-[10px]">
                            <span className="font-medium text-purple-400">{character?.name || t('steps.scenes.unknown')}:</span>{' '}
                            <span className="text-muted-foreground">"{line.text}"</span>
                          </p>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      </motion.div>
    </>
  );
}

// Memoize to prevent re-renders when parent updates unrelated state
export const SceneCard = memo(SceneCardComponent, (prevProps, nextProps) => {
  // Only re-render if these specific props change
  return (
    prevProps.scene.id === nextProps.scene.id &&
    prevProps.scene.imageUrl === nextProps.scene.imageUrl &&
    prevProps.scene.title === nextProps.scene.title &&
    prevProps.scene.textToImagePrompt === nextProps.scene.textToImagePrompt &&
    prevProps.scene.imageToVideoPrompt === nextProps.scene.imageToVideoPrompt &&
    prevProps.scene.dialogue.length === nextProps.scene.dialogue.length &&
    prevProps.scene.locked === nextProps.scene.locked &&
    prevProps.projectId === nextProps.projectId &&
    prevProps.isExpanded === nextProps.isExpanded &&
    prevProps.isGeneratingImage === nextProps.isGeneratingImage &&
    prevProps.isGeneratingAllImages === nextProps.isGeneratingAllImages &&
    prevProps.imageResolution === nextProps.imageResolution &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.hasPendingRegeneration === nextProps.hasPendingRegeneration &&
    prevProps.hasPendingDeletion === nextProps.hasPendingDeletion &&
    prevProps.approvedRegeneration?.id === nextProps.approvedRegeneration?.id &&
    prevProps.approvedRegeneration?.status === nextProps.approvedRegeneration?.status &&
    prevProps.approvedRegeneration?.attemptsUsed === nextProps.approvedRegeneration?.attemptsUsed &&
    prevProps.approvedRegeneration?.generatedUrls?.length === nextProps.approvedRegeneration?.generatedUrls?.length &&
    prevProps.canDeleteDirectly === nextProps.canDeleteDirectly &&
    prevProps.isAdmin === nextProps.isAdmin &&
    prevProps.isReadOnly === nextProps.isReadOnly &&
    prevProps.isAuthenticated === nextProps.isAuthenticated &&
    prevProps.isFirstImage === nextProps.isFirstImage
  );
});
