'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Copy, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { CopyPromptsDialogProps, CharacterPromptCardProps } from '../types';

function CharacterPromptCard({ character, hasImage }: CharacterPromptCardProps) {
  const t = useTranslations('copy');
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(character.masterPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`glass rounded-lg p-4 ${hasImage ? 'border-l-4 border-green-500/50' : 'border-l-4 border-orange-500/50'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-cyan-400">{character.name}</span>
            {hasImage && (
              <Badge variant="outline" className="border-green-500/30 text-green-400 text-[10px]">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                {t('hasImage')}
              </Badge>
            )}
          </div>
          <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono bg-black/20 rounded p-2 max-h-24 overflow-y-auto">
            {character.masterPrompt}
          </pre>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className={copied ? 'border-green-500/50 text-green-400' : 'border-purple-500/30 text-purple-400 hover:bg-purple-500/10'}
        >
          {copied ? (
            <>
              <CheckCircle2 className="w-4 h-4 mr-1" />
              {t('copied')}
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 mr-1" />
              {t('copy')}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export function CopyPromptsDialog({ open, onOpenChange, characters }: CopyPromptsDialogProps) {
  const t = useTranslations('copy');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong border-white/10 max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="w-5 h-5 text-purple-400" />
            {t('characterPromptsTitle')}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
          {characters.map((character, index) => (
            <CharacterPromptCard
              key={character.id}
              character={character}
              index={index}
              hasImage={!!character.imageUrl}
            />
          ))}
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-white/10">
          <div className="text-sm text-muted-foreground">
            {t('promptsCount', {
              count: characters.length,
              images: characters.filter(c => c.imageUrl).length
            })}
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-white/10">
            {t('close')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
