import type { VideoStatus } from '../../types';
import { CheckCircle2, AlertCircle, Video } from 'lucide-react';
import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

/**
 * Get the color styling for a video status badge
 */
export const getStatusColor = (status: VideoStatus): string => {
  switch (status) {
    case 'complete':
      return 'text-green-400 border-green-500/30';
    case 'generating':
      return 'text-amber-400 border-amber-500/30';
    case 'error':
      return 'text-red-400 border-red-500/30';
    default:
      return 'text-muted-foreground border-white/10';
  }
};

/**
 * Get the icon component for a video status
 */
export const getStatusIcon = (status: VideoStatus): React.ReactNode => {
  switch (status) {
    case 'complete':
      return <CheckCircle2 className="w-4 h-4" />;
    case 'generating':
      return (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <RefreshCw className="w-4 h-4" />
        </motion.div>
      );
    case 'error':
      return <AlertCircle className="w-4 h-4" />;
    default:
      return <Video className="w-4 h-4" />;
  }
};

/**
 * Check if a video is stale (generated from outdated image)
 */
export const isVideoStale = (scene: { videoUrl?: string; imageUpdatedAt?: Date | string | null; videoGeneratedFromImageAt?: Date | string | null }): boolean => !!(
  scene.videoUrl &&
  scene.imageUpdatedAt &&
  scene.videoGeneratedFromImageAt &&
  new Date(scene.imageUpdatedAt) > new Date(scene.videoGeneratedFromImageAt)
);

/**
 * Check if video is restricted (requires authentication for non-first videos)
 */
export const isVideoRestricted = (hasVideoUrl: boolean, isAuthenticated: boolean, isFirstVideo: boolean): boolean => {
  return !isAuthenticated && hasVideoUrl && !isFirstVideo;
};
