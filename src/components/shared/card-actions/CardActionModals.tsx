'use client';

import { ConfirmDeleteDialog } from '@/components/shared/ConfirmDeleteDialog';
import { LockedSceneModal } from '@/components/shared/LockedSceneModal';
import { DeletionRequestDialog } from '@/components/collaboration/DeletionRequestDialog';
import { RegenerationSelectionModal } from '@/components/collaboration/RegenerationSelectionModal';
import type { RegenerationRequest } from '@/types/collaboration';

export interface CardActionModalsProps {
  // Item info
  projectId: string;
  targetType: 'scene' | 'video' | 'audio' | 'character';
  targetId: string;
  targetName: string;

  // Modal states
  showDeleteConfirm: boolean;
  showDeletionRequest: boolean;
  showRegenerationModal: boolean;
  showLockedModal: boolean;

  // Setters
  setShowDeleteConfirm: (show: boolean) => void;
  setShowDeletionRequest: (show: boolean) => void;
  setShowRegenerationModal: (show: boolean) => void;
  setShowLockedModal: (show: boolean) => void;

  // Regeneration props
  approvedRegeneration?: RegenerationRequest | null;

  // Callbacks
  onDelete?: () => void;
  onDeletionRequested?: () => void;
  onRegenerationAttempt?: () => Promise<void>;
  onRegenerationSelect?: (selectedUrl: string) => Promise<void>;
}

export function CardActionModals({
  projectId,
  targetType,
  targetId,
  targetName,
  showDeleteConfirm,
  showDeletionRequest,
  showRegenerationModal,
  showLockedModal,
  setShowDeleteConfirm,
  setShowDeletionRequest,
  setShowRegenerationModal,
  setShowLockedModal,
  approvedRegeneration,
  onDelete,
  onDeletionRequested,
  onRegenerationAttempt,
  onRegenerationSelect,
}: CardActionModalsProps) {
  return (
    <>
      {/* Admin: Direct delete confirmation */}
      <ConfirmDeleteDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onConfirm={() => onDelete?.()}
        itemName={targetName}
      />

      {/* Collaborator: Request deletion dialog */}
      <DeletionRequestDialog
        projectId={projectId}
        targetType={targetType}
        targetId={targetId}
        targetName={targetName}
        open={showDeletionRequest}
        onOpenChange={setShowDeletionRequest}
        onRequestSent={onDeletionRequested}
      />

      {/* Regeneration Selection Modal for approved requests */}
      {approvedRegeneration && onRegenerationAttempt && onRegenerationSelect && (
        <RegenerationSelectionModal
          open={showRegenerationModal}
          onOpenChange={setShowRegenerationModal}
          request={approvedRegeneration}
          onRegenerate={onRegenerationAttempt}
          onSelect={async (selectedUrl) => {
            await onRegenerationSelect(selectedUrl);
            setShowRegenerationModal(false);
          }}
        />
      )}

      {/* Locked Scene Modal */}
      <LockedSceneModal
        isOpen={showLockedModal}
        onClose={() => setShowLockedModal(false)}
        sceneName={targetName}
      />
    </>
  );
}
