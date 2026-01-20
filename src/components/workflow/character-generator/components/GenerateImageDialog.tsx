import { Loader2, Image as ImageIcon } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { PROVIDER_CONFIGS } from '@/components/workflow/api-key-modal/constants';
import type { ImageProvider } from '@/types/project';

interface GenerateImageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  characterName: string;
  provider: ImageProvider;
  model?: string;
  isGenerating?: boolean;
  resolution?: string;
  aspectRatio?: string;
}

const PROVIDER_INFO: Record<ImageProvider, { name: string; icon: string; color: string }> = {
  gemini: { name: 'Gemini', icon: '✨', color: 'blue' },
  kie: { name: 'KIE.ai', icon: '🎨', color: 'orange' },
  modal: { name: 'Modal', icon: '⚡', color: 'cyan' },
  'modal-edit': { name: 'Modal Qwen-Edit', icon: '🖼️', color: 'cyan' },
};

export function GenerateImageDialog({
  isOpen,
  onClose,
  onConfirm,
  characterName,
  provider,
  model,
  isGenerating = false,
  resolution = '2k',
  aspectRatio = '1:1',
}: GenerateImageDialogProps) {
  const providerInfo = PROVIDER_INFO[provider] || { name: provider, icon: '🖼️', color: 'gray' };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            Generate Character Image
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left">
            {isGenerating ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating image for <strong>{characterName}</strong>...
              </span>
            ) : (
              <>Confirm image generation for <strong>{characterName}</strong></>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4 space-y-3">
          {/* Provider Info */}
          <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
            <div className="flex items-center gap-2">
              <span className="text-xl">{providerInfo.icon}</span>
              <div>
                <div className="text-sm text-muted-foreground">Provider</div>
                <div className="font-medium">{providerInfo.name}</div>
              </div>
            </div>
            <Badge className={`bg-${providerInfo.color}-500 text-white`}>
              {providerInfo.name}
            </Badge>
          </div>

                  {/* Model Info */}
          {model && (
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
              <div>
                <div className="text-sm text-muted-foreground">Model</div>
                <div className="font-medium text-sm" title={model}>
                  {model.includes('/') ? model.split('/').pop()?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || model : model}
                </div>
              </div>
            </div>
          )}

          {/* Settings Info */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 rounded-lg border bg-muted/30">
              <div className="text-xs text-muted-foreground">Resolution</div>
              <div className="font-medium text-sm">{resolution.toUpperCase()}</div>
            </div>
            <div className="p-2 rounded-lg border bg-muted/30">
              <div className="text-xs text-muted-foreground">Aspect Ratio</div>
              <div className="font-medium text-sm">{aspectRatio}</div>
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isGenerating}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isGenerating}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate Image'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
