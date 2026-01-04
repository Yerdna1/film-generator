import type { RegenerationRequest, DeletionRequest, PromptEditRequest } from '@/types/collaboration';
import { Film, Image as ImageIcon, User, Video, RefreshCw } from 'lucide-react';

// Extended type for RegenerationRequest with batchId
export interface RegenerationRequestWithBatch extends RegenerationRequest {
  batchId?: string | null;
}

// Grouped batch type
export interface BatchGroup {
  batchId: string;
  requests: RegenerationRequestWithBatch[];
  targetType: 'image' | 'video';
  requester: RegenerationRequest['requester'];
  reason?: string | null;
  createdAt: string;
}

// Shared props for approval sections
export interface ApprovalSectionProps {
  projectId: string;
  processingId: string | null;
  setProcessingId: (id: string | null) => void;
  reviewNotes: Record<string, string>;
  setReviewNotes: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  showNoteInput: string | null;
  setShowNoteInput: (id: string | null) => void;
  formatDate: (dateString: string) => string;
}

// Icon mappings
export const deletionTargetIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  project: Film,
  scene: ImageIcon,
  character: User,
  video: Video,
};

export const regenerationTargetIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  image: ImageIcon,
  video: Video,
};

// Field labels for prompt edits
export const fieldLabels: Record<string, string> = {
  textToImagePrompt: 'Text-to-Image Prompt',
  imageToVideoPrompt: 'Image-to-Video Prompt',
  description: 'Description',
};
