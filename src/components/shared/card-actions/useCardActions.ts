'use client';

import { useState, useCallback } from 'react';
import type { RegenerationRequest } from '@/types/collaboration';

export interface CardActionsState {
  showDeleteConfirm: boolean;
  showDeletionRequest: boolean;
  showRegenerationModal: boolean;
  showLockedModal: boolean;
  isRegenerating: boolean;
  isTogglingLock: boolean;
}

export interface CardActionsHandlers {
  setShowDeleteConfirm: (show: boolean) => void;
  setShowDeletionRequest: (show: boolean) => void;
  setShowRegenerationModal: (show: boolean) => void;
  setShowLockedModal: (show: boolean) => void;
  handleLockedAction: () => boolean;
  handleToggleLock: () => Promise<void>;
  handleDeleteClick: () => void;
  handleRegenerationAttempt: (requestId: string) => Promise<void>;
  handleRegenerationSelect: (requestId: string, selectedUrl: string) => Promise<void>;
}

export interface UseCardActionsProps {
  isLocked?: boolean;
  canDeleteDirectly?: boolean;
  approvedRegeneration?: RegenerationRequest | null;
  onToggleLock?: () => Promise<void> | void;
  onUseRegenerationAttempt?: (requestId: string) => Promise<void>;
  onSelectRegeneration?: (requestId: string, selectedUrl: string) => Promise<void>;
}

export function useCardActions({
  isLocked = false,
  canDeleteDirectly = true,
  approvedRegeneration,
  onToggleLock,
  onUseRegenerationAttempt,
  onSelectRegeneration,
}: UseCardActionsProps): CardActionsState & CardActionsHandlers {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeletionRequest, setShowDeletionRequest] = useState(false);
  const [showRegenerationModal, setShowRegenerationModal] = useState(false);
  const [showLockedModal, setShowLockedModal] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isTogglingLock, setIsTogglingLock] = useState(false);

  // Handler for locked actions - shows modal instead of performing action
  const handleLockedAction = useCallback(() => {
    if (isLocked) {
      setShowLockedModal(true);
      return true;
    }
    return false;
  }, [isLocked]);

  // Handle lock toggle
  const handleToggleLock = useCallback(async () => {
    if (!onToggleLock) return;
    setIsTogglingLock(true);
    try {
      await onToggleLock();
    } finally {
      setIsTogglingLock(false);
    }
  }, [onToggleLock]);

  // Handle delete click - shows appropriate dialog
  const handleDeleteClick = useCallback(() => {
    if (canDeleteDirectly) {
      setShowDeleteConfirm(true);
    } else {
      setShowDeletionRequest(true);
    }
  }, [canDeleteDirectly]);

  // Handle regeneration attempt
  const handleRegenerationAttempt = useCallback(async (requestId: string) => {
    if (!onUseRegenerationAttempt) return;
    setIsRegenerating(true);
    try {
      await onUseRegenerationAttempt(requestId);
    } finally {
      setIsRegenerating(false);
    }
  }, [onUseRegenerationAttempt]);

  // Handle regeneration selection
  const handleRegenerationSelect = useCallback(async (requestId: string, selectedUrl: string) => {
    if (!onSelectRegeneration) return;
    await onSelectRegeneration(requestId, selectedUrl);
    setShowRegenerationModal(false);
  }, [onSelectRegeneration]);

  return {
    // State
    showDeleteConfirm,
    showDeletionRequest,
    showRegenerationModal,
    showLockedModal,
    isRegenerating,
    isTogglingLock,
    // Setters
    setShowDeleteConfirm,
    setShowDeletionRequest,
    setShowRegenerationModal,
    setShowLockedModal,
    // Handlers
    handleLockedAction,
    handleToggleLock,
    handleDeleteClick,
    handleRegenerationAttempt,
    handleRegenerationSelect,
  };
}
