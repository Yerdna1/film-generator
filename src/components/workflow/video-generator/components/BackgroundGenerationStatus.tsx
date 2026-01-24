import { Cloud, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface BackgroundJobStatus {
  completedVideos: number;
  totalVideos: number;
  progress: number;
  status: string;
  failedVideos: number;
}

interface BackgroundGenerationStatusProps {
  backgroundJobId: string | null;
  backgroundJobStatus: BackgroundJobStatus | null;
  onCancelJob: () => void;
}

export function BackgroundGenerationStatus({
  backgroundJobId,
  backgroundJobStatus,
  onCancelJob,
}: BackgroundGenerationStatusProps) {
  if (!backgroundJobId || !backgroundJobStatus) {
    return null;
  }

  return (
    <div className="glass rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cloud className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-medium">
            Background Generation: {backgroundJobStatus.completedVideos}/{backgroundJobStatus.totalVideos} videos
          </span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={onCancelJob}
          className="h-8 w-8 p-0"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 transition-all duration-300"
          style={{ width: `${backgroundJobStatus.progress}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Status: {backgroundJobStatus.status}</span>
        {backgroundJobStatus.failedVideos > 0 && (
          <span className="text-red-400">{backgroundJobStatus.failedVideos} failed</span>
        )}
      </div>
    </div>
  );
}
