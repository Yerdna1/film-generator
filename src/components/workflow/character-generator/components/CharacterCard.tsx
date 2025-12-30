'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import {
  Trash2,
  Sparkles,
  RefreshCw,
  Edit3,
  User,
  CheckCircle2,
  Expand,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CopyButton } from '@/components/shared/CopyButton';
import { getImageCost, formatCostCompact } from '@/lib/services/real-costs';
import type { CharacterCardProps } from '../types';

export function CharacterCard({
  character,
  project,
  imageState,
  onEdit,
  onDelete,
  onGenerateImage,
  onRegeneratePrompt,
  onPreviewImage,
}: CharacterCardProps) {
  const t = useTranslations();

  const status = character.imageUrl ? 'complete' : (imageState?.status || 'idle');
  const progress = imageState?.progress || 0;
  const errorMsg = imageState?.error;

  const renderGenerateButton = () => {
    if (status === 'generating') {
      return (
        <Button
          size="sm"
          disabled
          className="flex-1 bg-gradient-to-r from-purple-600/50 to-cyan-600/50 text-white border-0"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
          </motion.div>
          {progress}%
        </Button>
      );
    }

    if (status === 'error') {
      return (
        <Button
          size="sm"
          variant="outline"
          className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10"
          onClick={() => onGenerateImage(character)}
          title={errorMsg}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      );
    }

    if (status === 'complete' || character.imageUrl) {
      return (
        <Button
          size="sm"
          variant="outline"
          className="flex-1 border-green-500/30 text-green-400 hover:bg-green-500/10"
          onClick={() => onGenerateImage(character)}
        >
          <CheckCircle2 className="w-4 h-4 mr-2" />
          {t('steps.characters.regenerate')}
        </Button>
      );
    }

    const imageCost = getImageCost(project.settings?.imageResolution || '2k');
    return (
      <Button
        size="sm"
        className="flex-1 bg-gradient-to-r from-purple-600/80 to-cyan-600/80 hover:from-purple-500 hover:to-cyan-500 text-white border-0"
        onClick={() => onGenerateImage(character)}
      >
        <Sparkles className="w-4 h-4 mr-2" />
        {t('steps.characters.generateImage')}
        <Badge variant="outline" className="ml-2 border-white/30 text-white text-[10px] px-1.5 py-0">
          {formatCostCompact(imageCost)}
        </Badge>
      </Button>
    );
  };

  return (
    <Card className="glass border-white/10 overflow-hidden card-hover">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg">{character.name}</CardTitle>
            <p className="text-xs text-muted-foreground">{character.personality || 'No personality set'}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(character.id)}
            className="text-muted-foreground hover:text-red-400"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
        {character.imageUrl ? (
          <button
            onClick={() => onPreviewImage(character.imageUrl!)}
            className="relative w-full aspect-square rounded-xl overflow-hidden group mt-3"
          >
            <img
              src={character.imageUrl}
              alt={character.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Expand className="w-8 h-8 text-white" />
            </div>
          </button>
        ) : (
          <div className="w-full aspect-square rounded-xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 flex flex-col items-center justify-center gap-2 mt-3">
            <User className="w-16 h-16 text-purple-400/50" />
            <span className="text-xs text-muted-foreground">No image generated</span>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {character.description || 'No description'}
        </p>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Master Prompt</Label>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => onRegeneratePrompt(character)}
              >
                <RefreshCw className="w-3 h-3" />
              </Button>
              <CopyButton text={character.masterPrompt} size="icon" className="h-6 w-6" />
            </div>
          </div>
          <div className="glass rounded-lg p-3 max-h-24 overflow-y-auto">
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
              {character.masterPrompt}
            </pre>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 border-white/10 hover:bg-white/5"
            onClick={() => onEdit(character)}
          >
            <Edit3 className="w-4 h-4 mr-2" />
            {t('common.edit')}
          </Button>
          {renderGenerateButton()}
        </div>
      </CardContent>
    </Card>
  );
}
