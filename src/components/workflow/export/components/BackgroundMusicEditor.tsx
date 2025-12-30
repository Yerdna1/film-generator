'use client';

import { useRef } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import {
  Music,
  Upload,
  Wand2,
  Play,
  Pause,
  Trash2,
  Check,
  X,
  Loader2,
  AlertCircle,
  Volume2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Project, BackgroundMusic, MusicProvider } from '@/types/project';
import type { SunoModel, GenerationState } from '../hooks/useBackgroundMusic';

interface BackgroundMusicEditorProps {
  project: Project;
  currentMusic: BackgroundMusic | null;
  hasMusic: boolean;
  generationState: GenerationState;
  previewUrl: string | null;
  isPreviewPlaying: boolean;
  previewRef: React.RefObject<HTMLAudioElement | null>;
  prompt: string;
  model: SunoModel;
  instrumental: boolean;
  provider: MusicProvider;
  onSetPrompt: (prompt: string) => void;
  onSetModel: (model: SunoModel) => void;
  onSetInstrumental: (instrumental: boolean) => void;
  onSetProvider: (provider: MusicProvider) => void;
  onGenerateMusic: () => Promise<void>;
  onCancelGeneration: () => void;
  onApplyPreviewToProject: () => void;
  onRemoveMusic: () => void;
  onUploadMusic: (file: File) => Promise<void>;
  onTogglePreview: () => void;
  onClearPreview: () => void;
}

const modelOptions: { value: SunoModel; label: string; description: string }[] = [
  { value: 'V4', label: 'V4', description: 'Up to 4 min, improved vocals' },
  { value: 'V4.5', label: 'V4.5', description: 'Up to 8 min, smart prompts' },
  { value: 'V4.5ALL', label: 'V4.5 ALL', description: 'Optimized song structure' },
  { value: 'V4.5PLUS', label: 'V4.5 Plus', description: 'Enhanced tonal variation' },
  { value: 'V5', label: 'V5', description: 'Latest cutting-edge model' },
];

const providerOptions: { value: MusicProvider; label: string; description: string }[] = [
  { value: 'piapi', label: 'PiAPI', description: 'Recommended - works everywhere' },
  { value: 'suno', label: 'Suno Direct', description: 'Via sunoapi.org' },
];

export function BackgroundMusicEditor({
  project,
  currentMusic,
  hasMusic,
  generationState,
  previewUrl,
  isPreviewPlaying,
  previewRef,
  prompt,
  model,
  instrumental,
  provider,
  onSetPrompt,
  onSetModel,
  onSetInstrumental,
  onSetProvider,
  onGenerateMusic,
  onCancelGeneration,
  onApplyPreviewToProject,
  onRemoveMusic,
  onUploadMusic,
  onTogglePreview,
  onClearPreview,
}: BackgroundMusicEditorProps) {
  const t = useTranslations();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await onUploadMusic(file);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="glass border-white/10 border-purple-500/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Music className="w-5 h-5 text-purple-400" />
            Background Music
          </CardTitle>
          {hasMusic && (
            <Badge variant="outline" className="border-purple-500/30 text-purple-400">
              {currentMusic?.source === 'suno' ? 'AI Generated' : 'Uploaded'}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Hidden audio elements */}
        {previewUrl && (
          <audio
            ref={previewRef}
            src={previewUrl}
            onEnded={() => onClearPreview()}
          />
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Current music display */}
        {hasMusic && currentMusic && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <Music className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="font-medium text-sm">{currentMusic.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {currentMusic.duration > 0 ? formatDuration(currentMusic.duration) : 'Duration unknown'}
                    {currentMusic.source === 'suno' && ' • AI Generated'}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onRemoveMusic}
                className="h-8 w-8 text-muted-foreground hover:text-red-400"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            {currentMusic.sunoPrompt && (
              <p className="text-xs text-muted-foreground mt-2 italic">
                Prompt: &quot;{currentMusic.sunoPrompt}&quot;
              </p>
            )}
          </motion.div>
        )}

        {/* Generation preview */}
        {previewUrl && generationState.status === 'complete' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 rounded-lg bg-green-500/10 border border-green-500/20"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-400" />
                <span className="text-sm font-medium text-green-400">Music Generated!</span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onTogglePreview}
                  className="h-8 w-8"
                >
                  {isPreviewPlaying ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClearPreview}
                  className="h-8 w-8 text-muted-foreground hover:text-red-400"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={onApplyPreviewToProject}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <Check className="w-4 h-4 mr-1" />
                Apply to Project
              </Button>
            </div>
          </motion.div>
        )}

        {/* Generation in progress */}
        {generationState.isGenerating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-4 rounded-lg bg-white/5 border border-white/10"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                <span className="text-sm">Generating music...</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancelGeneration}
                className="h-7 px-2 text-xs"
              >
                Cancel
              </Button>
            </div>
            <Progress value={generationState.progress} className="h-1" />
            <p className="text-xs text-muted-foreground mt-2">
              This may take 30-60 seconds
            </p>
          </motion.div>
        )}

        {/* Error state */}
        {generationState.status === 'error' && generationState.error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-red-400 font-medium">Generation Failed</p>
              <p className="text-xs text-muted-foreground">{generationState.error}</p>
            </div>
          </motion.div>
        )}

        {/* Generation form */}
        {!generationState.isGenerating && generationState.status !== 'complete' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1">
                <Wand2 className="w-3 h-3" />
                Music Prompt
              </Label>
              <Textarea
                value={prompt}
                onChange={(e) => onSetPrompt(e.target.value)}
                placeholder="Describe the music you want... e.g., 'Upbeat cinematic orchestral music with adventurous feel'"
                className="min-h-[80px] bg-white/5 border-white/10"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Provider</Label>
                <Select value={provider} onValueChange={(v) => onSetProvider(v as MusicProvider)}>
                  <SelectTrigger className="bg-white/5 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {providerOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div>
                          <span>{opt.label}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {opt.description}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Model</Label>
                <Select value={model} onValueChange={(v) => onSetModel(v as SunoModel)}>
                  <SelectTrigger className="bg-white/5 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {modelOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div>
                          <span>{opt.label}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {opt.description}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2 h-9 px-3 rounded-md bg-white/5 border border-white/10">
              <Switch
                checked={instrumental}
                onCheckedChange={onSetInstrumental}
                id="instrumental"
              />
              <Label htmlFor="instrumental" className="text-xs cursor-pointer">
                Instrumental (no vocals)
              </Label>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={onGenerateMusic}
                disabled={!prompt.trim()}
                className="flex-1 bg-purple-600 hover:bg-purple-700"
              >
                <Wand2 className="w-4 h-4 mr-2" />
                Generate Music
              </Button>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="border-white/10"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              10 credits per generation • Powered by{' '}
              {provider === 'piapi' ? (
                <a
                  href="https://piapi.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-pink-400 hover:underline"
                >
                  PiAPI
                </a>
              ) : (
                <a
                  href="https://sunoapi.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-400 hover:underline"
                >
                  sunoapi.org
                </a>
              )}
            </p>
          </div>
        )}

        {/* Empty state when no music and no generation */}
        {!hasMusic && !previewUrl && !generationState.isGenerating && (
          <div className="text-center py-4 text-muted-foreground border-t border-white/5 mt-4">
            <Volume2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-xs">
              Add background music to enhance your film
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
