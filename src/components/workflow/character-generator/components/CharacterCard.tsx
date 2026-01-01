'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { ConfirmDeleteDialog } from '@/components/shared/ConfirmDeleteDialog';
import {
  Trash2,
  Sparkles,
  RefreshCw,
  Edit3,
  User,
  CheckCircle2,
  Expand,
  Upload,
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
  isReadOnly = false,
  onEdit,
  onDelete,
  onGenerateImage,
  onRegeneratePrompt,
  onPreviewImage,
  onUploadImage,
}: CharacterCardProps) {
  const t = useTranslations();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadImage(character, file);
      // Reset input so the same file can be selected again
      e.target.value = '';
    }
  };

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
    <>
      <ConfirmDeleteDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onConfirm={() => onDelete(character.id)}
        itemName={character.name}
      />
      <Card className="glass border-white/10 overflow-hidden card-hover">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="text-lg">{character.name}</CardTitle>
              <p className="text-xs text-muted-foreground">{character.personality || 'No personality set'}</p>
            </div>
            {!isReadOnly && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-muted-foreground hover:text-red-400"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        {/* Hidden file input for upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {character.imageUrl ? (
          <div className="relative w-full aspect-square rounded-xl overflow-hidden group mt-3">
            <button
              onClick={() => onPreviewImage(character.imageUrl!)}
              className="w-full h-full"
            >
              <img
                key={character.imageUrl}
                src={character.imageUrl}
                alt={character.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Expand className="w-8 h-8 text-white" />
              </div>
            </button>
            {/* Upload overlay button - only for editors */}
            {!isReadOnly && (
              <Button
                size="icon"
                variant="secondary"
                className="absolute bottom-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 hover:bg-black/90 border-0"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                title="Upload custom image"
              >
                <Upload className="w-4 h-4 text-white" />
              </Button>
            )}
          </div>
        ) : (
          <div
            className={`w-full aspect-square rounded-xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 flex flex-col items-center justify-center gap-3 mt-3 ${
              isReadOnly ? '' : 'cursor-pointer hover:from-purple-500/30 hover:to-cyan-500/30 transition-colors group'
            }`}
            onClick={isReadOnly ? undefined : () => fileInputRef.current?.click()}
          >
            <User className={`w-16 h-16 text-purple-400/50 ${!isReadOnly ? 'group-hover:text-purple-400/70' : ''} transition-colors`} />
            <span className="text-xs text-muted-foreground">No image generated</span>
            {!isReadOnly && (
              <div className="flex items-center gap-1 text-xs text-purple-400">
                <Upload className="w-3 h-3" />
                <span>Click to upload</span>
              </div>
            )}
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
              {!isReadOnly && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onRegeneratePrompt(character)}
                >
                  <RefreshCw className="w-3 h-3" />
                </Button>
              )}
              <CopyButton text={character.masterPrompt} size="icon" className="h-6 w-6" />
            </div>
          </div>
          <div className="glass rounded-lg p-3 max-h-24 overflow-y-auto">
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
              {character.masterPrompt}
            </pre>
          </div>
        </div>

        {/* Action buttons - only for editors */}
        {!isReadOnly && (
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
        )}
      </CardContent>
    </Card>
    </>
  );
}
