import { Loader2, Mic as MicIcon } from 'lucide-react';
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
import type { TTSProvider } from '@/types/project';

interface GenerateAudioDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  dialogueCount: number;
  provider: TTSProvider;
  model?: string;
  language?: string;
  isGenerating?: boolean;
}

const PROVIDER_INFO: Record<TTSProvider, { name: string; icon: string; color: string }> = {
  'gemini-tts': { name: 'Gemini TTS', icon: '🔊', color: 'blue' },
  'openai-tts': { name: 'OpenAI TTS', icon: '🗣️', color: 'green' },
  'elevenlabs': { name: 'ElevenLabs', icon: '🎙️', color: 'violet' },
  'kie': { name: 'KIE.ai (ElevenLabs)', icon: '🎙️', color: 'orange' },
  'modal': { name: 'Modal (Self-Hosted)', icon: '⚡', color: 'cyan' },
};

export function GenerateAudioDialog({
  isOpen,
  onClose,
  onConfirm,
  dialogueCount,
  provider,
  model,
  language = 'sk',
  isGenerating = false,
}: GenerateAudioDialogProps) {
  const providerInfo = PROVIDER_INFO[provider] || { name: provider, icon: '🎙️', color: 'gray' };
  const languageDisplay = language === 'sk' ? 'Slovenčina' : language === 'en' ? 'English' : language;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <MicIcon className="w-5 h-5" />
            Generovať Hlasové Prejavy
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left">
            {isGenerating ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Generujem <strong>{dialogueCount}</strong> {dialogueCount === 1 ? 'hlasový prejav' : dialogueCount < 4 ? 'hlasové prejavy' : 'hlasových prejavov'}...
              </span>
            ) : (
              <>Potvrdiť generovanie <strong>{dialogueCount}</strong> {dialogueCount === 1 ? 'hlasového prejavu' : dialogueCount < 4 ? 'hlasových prejavov' : 'hlasových prejavov'}</>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4 space-y-3">
          {/* Provider Info */}
          <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
            <div className="flex items-center gap-2">
              <span className="text-xl">{providerInfo.icon}</span>
              <div>
                <div className="text-sm text-muted-foreground">Poskytovateľ</div>
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

          {/* Language Info */}
          <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
            <div>
              <div className="text-sm text-muted-foreground">Jazyk</div>
              <div className="font-medium">{languageDisplay}</div>
            </div>
          </div>

          {/* Count Info */}
          <div className="p-3 rounded-lg border bg-muted/30">
            <div className="text-xs text-muted-foreground">Počet replík</div>
            <div className="font-medium text-lg">{dialogueCount}</div>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isGenerating}>Zrušiť</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isGenerating}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generujem...
              </>
            ) : (
              'Generovať Všetky Hlasy'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
