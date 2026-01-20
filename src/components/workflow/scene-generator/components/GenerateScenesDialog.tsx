import { useEffect } from 'react';
import { Loader2, FileText } from 'lucide-react';
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

interface GenerateScenesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  sceneCount: number;
  provider?: string;
  model?: string;
  isGenerating?: boolean;
  useOwnKey?: boolean;
}

const PROVIDER_INFO: Record<string, { name: string; icon: string; color: string }> = {
  claude: { name: 'Claude', icon: '🤖', color: 'purple' },
  'claude-sdk': { name: 'Claude SDK', icon: '🔑', color: 'purple' },
  openrouter: { name: 'OpenRouter', icon: '🌐', color: 'blue' },
  modal: { name: 'Modal', icon: '⚡', color: 'cyan' },
  grok: { name: 'Grok', icon: '𝕏', color: 'gray' },
  gemini: { name: 'Gemini', icon: '✨', color: 'blue' },
};

export function GenerateScenesDialog({
  isOpen,
  onClose,
  onConfirm,
  sceneCount,
  provider,
  model,
  isGenerating = false,
  useOwnKey = false,
}: GenerateScenesDialogProps) {
  // Debug logging
  useEffect(() => {
    console.log('[GenerateScenesDialog] Props:', {
      provider,
      model,
      isOpen,
      useOwnKey,
    });
  }, [provider, model, isOpen, useOwnKey]);

  const providerInfo = provider ? PROVIDER_INFO[provider] || { name: provider, icon: '🤖', color: 'gray' } : null;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Generate Scenes
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left">
            {isGenerating ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating <strong>{sceneCount}</strong> scenes...
              </span>
            ) : (
              <>Confirm generation of <strong>{sceneCount}</strong> scenes</>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4 space-y-3">
          {/* Provider Info */}
          {providerInfo ? (
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
          ) : (
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
              <div>
                <div className="text-sm text-muted-foreground">Provider</div>
                <div className="font-medium text-sm text-muted-foreground">Loading...</div>
              </div>
            </div>
          )}

          {/* Model Info */}
          {model ? (
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
              <div>
                <div className="text-sm text-muted-foreground">Model</div>
                <div className="font-medium text-sm" title={model}>
                  {model.includes('/') ? model.split('/').pop()?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || model : model}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
              <div>
                <div className="text-sm text-muted-foreground">Model</div>
                <div className="font-medium text-sm text-muted-foreground">Loading...</div>
              </div>
            </div>
          )}

          {/* Scene Count */}
          <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
            <div>
              <div className="text-sm text-muted-foreground">Scenes to Generate</div>
              <div className="font-medium text-lg">{sceneCount}</div>
            </div>
          </div>

          {/* Own Key Notice */}
          {useOwnKey && (
            <div className="flex items-center gap-2 p-3 rounded-lg border border-green-500/20 bg-green-500/5">
              <span className="text-green-400">✓</span>
              <span className="text-sm text-green-400">Using your own API key</span>
            </div>
          )}
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
              <>
                <FileText className="w-4 h-4 mr-2" />
                Generate Scenes
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
