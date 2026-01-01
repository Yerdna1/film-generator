'use client';

import { memo } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import Image from 'next/image';
import {
  Image as ImageIcon,
  Trash2,
  Sparkles,
  RefreshCw,
  Edit3,
  Camera,
  Film,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Expand,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { CopyButton } from '@/components/shared/CopyButton';
import { formatCostCompact, getImageCost, type ImageResolution } from '@/lib/services/real-costs';
import type { Scene, Character } from '@/types/project';

interface SceneCardProps {
  scene: Scene;
  index: number;
  isExpanded: boolean;
  isGeneratingImage: boolean;
  isGeneratingAllImages: boolean;
  imageResolution: ImageResolution;
  characters: Character[];
  onToggleExpand: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onGenerateImage: () => void;
  onRegeneratePrompts: () => void;
  onPreviewImage: (imageUrl: string) => void;
}

function SceneCardComponent({
  scene,
  index,
  isExpanded,
  isGeneratingImage,
  isGeneratingAllImages,
  imageResolution,
  characters,
  onToggleExpand,
  onDelete,
  onEdit,
  onGenerateImage,
  onRegeneratePrompts,
  onPreviewImage,
}: SceneCardProps) {
  const t = useTranslations();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="glass border-white/10 overflow-hidden">
        <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
          <CardHeader className="p-2">
            <div className="flex items-center gap-2">
              {/* Scene Image or Placeholder */}
              {scene.imageUrl ? (
                <button
                  onClick={() => onPreviewImage(scene.imageUrl!)}
                  className="relative w-48 h-32 rounded-lg overflow-hidden group flex-shrink-0"
                >
                  <Image
                    src={scene.imageUrl}
                    alt={scene.title}
                    fill
                    sizes="192px"
                    className="object-cover"
                    loading="lazy"
                    unoptimized={scene.imageUrl.startsWith('data:') || scene.imageUrl.includes('blob:')}
                  />
                  <div className="absolute top-1 left-1 w-7 h-7 rounded-md bg-black/60 flex items-center justify-center font-bold text-emerald-400 text-sm">
                    {scene.number || index + 1}
                  </div>
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Expand className="w-6 h-6 text-white" />
                  </div>
                </button>
              ) : (
                <div className="relative w-48 h-32 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                  <div className="absolute top-1 left-1 w-7 h-7 rounded-md bg-emerald-500/20 flex items-center justify-center font-bold text-emerald-400 text-sm">
                    {scene.number || index + 1}
                  </div>
                  <ImageIcon className="w-8 h-8 text-muted-foreground" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <CardTitle className="text-base truncate">{scene.title}</CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-400">
                    <Camera className="w-3 h-3 mr-1" />
                    {scene.cameraShot}
                  </Badge>
                  {scene.dialogue.length > 0 && (
                    <Badge variant="outline" className="text-xs border-purple-500/30 text-purple-400">
                      <MessageSquare className="w-3 h-3 mr-1" />
                      {scene.dialogue.length}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onDelete}
                  className="text-muted-foreground hover:text-red-400 h-8 w-8"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
              </div>
            </div>
          </CardHeader>

          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              {/* Text-to-Image Prompt */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-emerald-400 flex items-center gap-1">
                    <ImageIcon className="w-3 h-3" />
                    {t('steps.scenes.textToImagePrompt')}
                  </Label>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={onRegeneratePrompts}
                    >
                      <RefreshCw className="w-3 h-3" />
                    </Button>
                    <CopyButton text={scene.textToImagePrompt} size="icon" className="h-6 w-6" />
                  </div>
                </div>
                <div className="glass rounded-lg p-3 max-h-32 overflow-y-auto">
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
                    {scene.textToImagePrompt}
                  </pre>
                </div>
              </div>

              {/* Image-to-Video Prompt */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-cyan-400 flex items-center gap-1">
                    <Film className="w-3 h-3" />
                    {t('steps.scenes.imageToVideoPrompt')}
                  </Label>
                  <CopyButton text={scene.imageToVideoPrompt} size="icon" className="h-6 w-6" />
                </div>
                <div className="glass rounded-lg p-3 max-h-24 overflow-y-auto">
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
                    {scene.imageToVideoPrompt}
                  </pre>
                </div>
              </div>

              {/* Dialogue */}
              {scene.dialogue.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs text-purple-400 flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" />
                    {t('steps.scenes.dialogue')}
                  </Label>
                  <div className="glass rounded-lg p-3 space-y-2">
                    {scene.dialogue.map((line, idx) => {
                      const character = characters.find((c) => c.id === line.characterId);
                      return (
                        <div key={idx} className="text-sm">
                          <span className="font-semibold text-purple-400">
                            {character?.name || 'Unknown'}:
                          </span>{' '}
                          <span className="text-muted-foreground">"{line.text}"</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 border-white/10 hover:bg-white/5"
                  onClick={onEdit}
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  {t('common.edit')}
                </Button>
                <Button
                  size="sm"
                  className="flex-1 bg-gradient-to-r from-emerald-600/80 to-teal-600/80 hover:from-emerald-500 hover:to-teal-500 text-white border-0"
                  onClick={onGenerateImage}
                  disabled={isGeneratingImage || isGeneratingAllImages}
                >
                  {isGeneratingImage ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                      </motion.div>
                      {t('steps.characters.generating')}
                    </>
                  ) : scene.imageUrl ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      {t('common.regenerate')}
                      <span className="ml-1 text-[10px] opacity-80">{formatCostCompact(getImageCost(imageResolution))}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      {t('steps.scenes.generateImage')}
                      <span className="ml-1 text-[10px] opacity-80">{formatCostCompact(getImageCost(imageResolution))}</span>
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </motion.div>
  );
}

// Memoize to prevent re-renders when parent updates unrelated state
export const SceneCard = memo(SceneCardComponent, (prevProps, nextProps) => {
  // Only re-render if these specific props change
  return (
    prevProps.scene.id === nextProps.scene.id &&
    prevProps.scene.imageUrl === nextProps.scene.imageUrl &&
    prevProps.scene.title === nextProps.scene.title &&
    prevProps.scene.textToImagePrompt === nextProps.scene.textToImagePrompt &&
    prevProps.scene.imageToVideoPrompt === nextProps.scene.imageToVideoPrompt &&
    prevProps.scene.dialogue.length === nextProps.scene.dialogue.length &&
    prevProps.isExpanded === nextProps.isExpanded &&
    prevProps.isGeneratingImage === nextProps.isGeneratingImage &&
    prevProps.isGeneratingAllImages === nextProps.isGeneratingAllImages &&
    prevProps.imageResolution === nextProps.imageResolution
  );
});
