'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { StaleVideoWarningModal } from '@/components/shared/StaleVideoWarningModal';
import { useCardActions, CardActionModals, getCardStatusBackground } from '@/components/shared/card-actions';
import type { SceneVideoCardProps } from './types';
import { isVideoStale, isVideoRestricted } from './utils';
import { VideoPreview } from './VideoPreview';
import { CardHeader } from './CardHeader';
import { CardContent } from './CardContent';
import { CardActions } from './CardActions';

export function SceneVideoCard({
  scene,
  index,
  projectId,
  status,
  progress,
  isPlaying,
  cachedVideoUrl,
  isSelected,
  hasPendingRegeneration = false,
  hasPendingDeletion = false,
  approvedRegeneration = null,
  canDeleteDirectly = true,
  isAdmin = false,
  isReadOnly = false,
  isAuthenticated = true,
  isFirstVideo = false,
  onToggleSelect,
  onPlay,
  onPause,
  onGenerateVideo,
  buildFullI2VPrompt,
  onDeletionRequested,
  onUseRegenerationAttempt,
  onSelectRegeneration,
  onToggleLock,
}: SceneVideoCardProps) {
  const [showStaleWarning, setShowStaleWarning] = useState(false);

  // Use shared card actions hook
  const cardActions = useCardActions({
    isLocked: scene.locked,
    canDeleteDirectly,
    approvedRegeneration,
    onToggleLock,
    onUseRegenerationAttempt,
    onSelectRegeneration,
  });

  // Determine if this video is restricted
  const isRestricted = isVideoRestricted(!!scene.videoUrl, isAuthenticated, isFirstVideo);

  // Determine if video is stale
  const videoStale = isVideoStale(scene);

  // Handle generate video with stale check
  const handleGenerateVideo = useCallback(() => {
    if (cardActions.handleLockedAction()) return;
    if (videoStale) {
      setShowStaleWarning(true);
    } else {
      onGenerateVideo();
    }
  }, [cardActions, videoStale, onGenerateVideo]);

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
        targetType="video"
        targetId={scene.id}
        targetName={`${scene.title} video`}
        showDeleteConfirm={cardActions.showDeleteConfirm}
        showDeletionRequest={cardActions.showDeletionRequest}
        showRegenerationModal={cardActions.showRegenerationModal}
        showLockedModal={cardActions.showLockedModal}
        setShowDeleteConfirm={cardActions.setShowDeleteConfirm}
        setShowDeletionRequest={cardActions.setShowDeletionRequest}
        setShowRegenerationModal={cardActions.setShowRegenerationModal}
        setShowLockedModal={cardActions.setShowLockedModal}
        approvedRegeneration={approvedRegeneration}
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

      {/* Stale Video Warning Modal */}
      <StaleVideoWarningModal
        isOpen={showStaleWarning}
        onClose={() => setShowStaleWarning(false)}
        onConfirm={onGenerateVideo}
        sceneName={scene.title}
        imageUpdatedAt={scene.imageUpdatedAt}
        videoGeneratedAt={scene.videoGeneratedFromImageAt}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: (index % 12) * 0.05 }}
      >
        <Card className={`overflow-hidden ${cardBackground}`}>
          {/* Video/Image Preview */}
          <div className="relative aspect-video bg-black/30">
            <VideoPreview
              scene={scene}
              isPlaying={isPlaying}
              isRestricted={isRestricted}
              isFirstVideo={isFirstVideo}
              cachedVideoUrl={cachedVideoUrl}
              status={status}
              progress={progress}
              onPlay={onPlay}
              onPause={onPause}
            />

            {/* Card Header (Badges) */}
            <CardHeader
              scene={scene}
              index={index}
              isLocked={!!scene.locked}
              hasPendingRegeneration={hasPendingRegeneration}
              hasPendingDeletion={hasPendingDeletion}
              approvedRegeneration={approvedRegeneration}
              isVideoStale={videoStale}
              isSelected={isSelected}
              status={status}
              onToggleSelect={onToggleSelect}
            />
          </div>

          {/* Card Content (Title, Meta, Prompt, Dialogue) */}
          <CardContent
            scene={scene}
            isLocked={!!scene.locked}
            isVideoStale={videoStale}
            buildFullI2VPrompt={buildFullI2VPrompt}
          />

          {/* Card Actions (Buttons) */}
          <CardActions
            scene={scene}
            status={status}
            isLocked={!!scene.locked}
            isVideoStale={videoStale}
            isReadOnly={isReadOnly}
            isRestricted={isRestricted}
            hasPendingDeletion={hasPendingDeletion}
            canDeleteDirectly={canDeleteDirectly}
            onGenerateVideo={handleGenerateVideo}
            onToggleLock={isAdmin ? cardActions.handleToggleLock : undefined}
            onDeleteClick={cardActions.handleDeleteClick}
          />
        </Card>
      </motion.div>
    </>
  );
}
