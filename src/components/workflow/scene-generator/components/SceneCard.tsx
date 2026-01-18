'use client';

import { memo } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import Image from 'next/image';
import {
  useCardActions,
  CardActionModals,
  StatusBadges,
  getCardStatusBackground,
} from '@/components/shared/card-actions';
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
  Lock,
  Unlock,
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
  approvedRegeneration?: RegenerationRequest | null;
  canDeleteDirectly?: boolean;
  isAdmin?: boolean;
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
  onDeletionRequested?: () => void;
  onUseRegenerationAttempt?: (requestId: string) => Promise<void>;
  onSelectRegeneration?: (requestId: string, selectedUrl: string) => Promise<void>;
  onToggleLock?: () => void;
}

function SceneCardComponent({
  scene,
  index,
  projectId,
  isExpanded,
  isGeneratingImage,
  isGeneratingAllImages,
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
  const t = useTranslations('steps');

  // Use shared card actions hook
  const cardActions = useCardActions({
    isLocked: scene.locked,
    canDeleteDirectly,
    approvedRegeneration,
    onToggleLock,
    onUseRegenerationAttempt,
    onSelectRegeneration,
  });

  // Determine if this image is restricted (non-first image for unauthenticated users)
  const isRestricted = !isAuthenticated && scene.imageUrl && !isFirstImage;

  // Get card background based on status
  const cardBackground = getCardStatusBackground({
    isLocked: scene.locked,
    approvedRegeneration,
    hasPendingRegeneration,
    hasPendingDeletion,
  });

  return (
    <>
      {/* Shared modals */}
      <CardActionModals
        projectId={projectId}
        targetType="scene"
        targetId={scene.id}
        targetName={scene.title}
        showDeleteConfirm={cardActions.showDeleteConfirm}
        showDeletionRequest={cardActions.showDeletionRequest}
        showRegenerationModal={cardActions.showRegenerationModal}
        showLockedModal={cardActions.showLockedModal}
        setShowDeleteConfirm={cardActions.setShowDeleteConfirm}
        setShowDeletionRequest={cardActions.setShowDeletionRequest}
        setShowRegenerationModal={cardActions.setShowRegenerationModal}
        setShowLockedModal={cardActions.setShowLockedModal}
        approvedRegeneration={approvedRegeneration}
        onDelete={onDelete}
        onDeletionRequested={onDeletionRequested}
        onRegenerationAttempt={async () => {
          if (approvedRegeneration) {
            await cardActions.handleRegenerationAttempt(approvedRegeneration.id);
          }
        }}
        onRegenerationSelect={async (selectedUrl) => {
          if (approvedRegeneration) {
            await cardActions.handleRegenerationSelect(approvedRegeneration.id, selectedUrl);
          }
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: (index % 12) * 0.03 }}
      >
        <Card className={`overflow-hidden ${cardBackground}`}>
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
                        {t('scenes.signInToView')}
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

              {/* Scene Number Badge + Status Badges */}
              <div className="absolute top-1.5 left-1.5 flex items-center gap-1">
                <Badge className="bg-black/60 text-emerald-400 border-0 text-xs px-1.5 py-0.5">
                  {index + 1}
                </Badge>
                <StatusBadges
                  isLocked={scene.locked}
                  hasPendingRegeneration={hasPendingRegeneration}
                  hasPendingDeletion={hasPendingDeletion}
                  approvedRegeneration={approvedRegeneration}
                  onRegenerationClick={() => cardActions.setShowRegenerationModal(true)}
                  lockedLabel={t('scenes.status.locked')}
                  pendingLabel={t('scenes.status.pending')}
                  deletePendingLabel={t('scenes.status.deletePending')}
                  clickToRegenerateLabel={t('scenes.status.clickToRegenerate')}
                  clickToSelectLabel={t('scenes.status.clickToSelectBest')}
                  awaitingApprovalLabel={t('scenes.status.awaitingApproval')}
                />
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
                  <p className="text-xs text-white">{t('characters.generating')}</p>
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
                      if (cardActions.handleLockedAction()) return;
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
                      if (cardActions.handleLockedAction()) return;
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
                      onClick={cardActions.handleToggleLock}
                      disabled={cardActions.isTogglingLock}
                      className={`h-7 ${scene.locked ? 'text-amber-400 hover:text-amber-300' : 'text-muted-foreground hover:text-amber-400'}`}
                      title={scene.locked ? t('scenes.unlock') : t('scenes.lock')}
                    >
                      {cardActions.isTogglingLock ? (
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
                      if (cardActions.handleLockedAction()) return;
                      cardActions.handleDeleteClick();
                    }}
                    className={`h-7 ${scene.locked ? 'text-amber-400' : hasPendingDeletion ? 'text-orange-400' : 'text-muted-foreground hover:text-red-400'}`}
                    disabled={hasPendingDeletion}
                    title={scene.locked ? t('scenes.status.locked') : hasPendingDeletion ? t('scenes.deletePending') : canDeleteDirectly ? t('scenes.deleteScene') : t('scenes.requestDeletion')}
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
                      {t('scenes.prompts.t2iPrompt')}
                    </Label>
                    <div className="flex items-center gap-0.5">
                      {!isReadOnly && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-5 w-5 ${scene.locked ? 'text-amber-400' : ''}`}
                          onClick={() => {
                            if (cardActions.handleLockedAction()) return;
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
                      {t('scenes.prompts.i2vPrompt')}
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
                      {t('scenes.dialogue')}
                    </Label>
                    <div className="glass rounded p-1.5 space-y-1">
                      {scene.dialogue.map((line, idx) => {
                        const character = characters.find((c) => c.id === line.characterId);
                        return (
                          <p key={idx} className="text-[10px]">
                            <span className="font-medium text-purple-400">{character?.name || t('scenes.unknown')}:</span>{' '}
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
